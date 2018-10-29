// glasgow.js
// (c) Frank van Viegen
// MIT license

const NON_TOP_EMPTY_CHILDREN = [];
const NON_TOP_EMPTY_NODE = {_c: NON_TOP_EMPTY_CHILDREN};
for(let obj of [NON_TOP_EMPTY_CHILDREN, NON_TOP_EMPTY_NODE])
	Object.freeze(obj);

const NOT_HANDLED = {}; // constant that can be returned by event handlers

let instances = [];

let fetch = window.fetch ? window.fetch.bind(window) : null;

let debug = 1;
	// 0. production build
	// 1. extra checking, a lot slower!
	// 2. reserved
	// 3. same as 1 + glasgow.log every DOM update


export default function glasgow(tag, props) {
	props = props || {};
	props._t = tag;

	if (arguments.length > 2) {
		var children = props._c = [];
		for(let i=2; i<arguments.length; i++) {
			addChild(children, arguments[i]);
		}
	} else {
		props._c = [];
	}
	
	return props;
};

function addChild(children, child) {
	if (child == null) return; // null or undefined
	let type = typeof child;
	if (type === 'object') {
		if (child instanceof Array) {
			for(let j=0; j<child.length; j++) addChild(children, child[j]);
			return;
		}
		let tagType = typeof child._t;
		if (tagType === 'string' || tagType === 'function') return children.push(child);
	}
	else if (type === 'number') return children.push(''+child);
	else if (type === 'string') return children.push(child);

	throw new Error("invalid VDOM node: "+JSON.stringify(child));
}


function propsEqual(p1,p2) {
	for(let k in p1) {
		if (k[0]!=='_' && k[0]!=='$' && p1[k]!==p2[k]) return false;
	}
	for(let k in p2) {
		if (k[0]!=='_' && k[0]!=='$' && !p1.hasOwnProperty(k)) return false;
	}
	return true;
}


function resolveBinding(binding, props) {
	if (typeof binding === 'string') return [props,binding];
	for(let i=0; i<binding.length-1; i++) {
		let term = binding[i];
		props = typeof term === 'object' ? term : (props[term] = props[term] || {});
	}
	return [props, binding[binding.length-1]];
}

function writeBinding(binding, props, value) {
	let [obj,key] = resolveBinding(binding, props);
	obj[key] = value;
}

function readBinding(binding, props) {
	let [obj,key] = resolveBinding(binding, props);
	return obj[key];
}

function refreshify(func) {
	let refreshNow = this.refreshNow;
	
	function refreshEventResult (result) {
		refreshNow();
		if (result && typeof result.then === 'function') {
			result.then(refreshEventResult);
		}
		return result;
	}

	return function() {
		return refreshEventResult(func.apply(this, arguments));
	}
}



function mount(domParent, rootFunc, rootProps = {}) {

	let domRoot;
	let treeRoot;
	let domReads, domWrites; // DOM operations counters
	let delegatedTypes; // eg {'onclick' => true}
	let afterRefreshArray = [];

	let scheduled = 0;
	let instance = {refresh, refreshNow, unmount, refreshify, getTree};
	if (fetch) instance.fetch = instance.refreshify(fetch);

	instances.push(instance);

	refreshNow();

	return instance;


	function create(newNode, props, parentStable) {
		if (typeof newNode === 'string') {
			domWrites++;
			if (debug>=3) glasgow.log('glasgow update create TextNode', newNode);
			let el = document.createTextNode(newNode);
			if (!domRoot) domRoot = el;
			return el;
		}

		let tag = newNode._t;
		if (typeof tag === 'function') { // create a component
			newNode._a = tag(newNode, newNode._c);
			return create(newNode._a, newNode, parentStable);
		}
		
		let el = document.createElement(tag);
		if (!domRoot) domRoot = el; // this can't wait; needed for event delegation
		domWrites++;
		if (debug>=3) glasgow.log('glasgow update create', tag);
		let func = newNode.oncreate || newNode.create;
		if (typeof func==='function') afterRefresh(func, el, [{type:'create', parentStable}, props, newNode]);
		patch(newNode, NON_TOP_EMPTY_NODE, [el], props);
		return el;
	}
	
	function canPatch(newNode, oldNode) {
		let type = typeof newNode;
		return type === typeof oldNode && (
						 type==='string' || (
							 newNode.key === oldNode.key &&
							 newNode._t === oldNode._t
						 )
					 );
	}
	
	function patch(newNode, oldNode, domPath, context) {
		if (debug) {
			if (newNode._e) console.error('double patch', newNode, resolveDomPath(domPath));
			if (oldNode._e && oldNode._e !== resolveDomPath(domPath)) console.error('dom element not properly matched with old node', oldNode, resolveDomPath(domPath));
		}
		
		if (typeof newNode === 'string') {
			if (newNode !== oldNode) {
				resolveDomPath(domPath).textContent = newNode;
				domWrites++;
				if (debug>=3) glasgow.log('glasgow update set TextNode', newNode);
			}
			return newNode;
		}

		let domPathPos = domPath.length;

		let tag = newNode._t;
		if (typeof tag === 'function') { // a component
			// When the properties match, we will transfer state from the old component.
			if (oldNode._t && propsEqual(newNode,oldNode)) {
				oldNode._c = newNode._c;
				newNode = oldNode;
			}

			let materialized = tag(newNode, newNode._c);
			delete newNode._c;
			if (canPatch(materialized, oldNode._a)) {
				newNode._a = patch(materialized, oldNode._a, domPath, newNode);
			} else {
				// the top-level tag or key for this component changed
				destroy(oldNode._a, oldNode);
				newNode._a = materialized;
				if (domPathPos===1) {
					glasgow.log('glasgow swap root element');
					domRoot = null;
					delegatedTypes = {};
				}
				resolveDomPath(domPath,domPathPos-1).replaceChild(create(materialized, newNode, true), resolveDomPath(domPath));
				domWrites++;
				if (debug>=3) glasgow.log('glasgow update replace child', resolveDomPath(domPath));
			}
			return newNode;
		}
		
		if (debug) newNode._e = resolveDomPath(domPath);
		
		let dom;
		
		// Now let's sync some children
		let newChildren = newNode._c;
		let oldChildren = oldNode._c; // === NON_TOP_EMPTY_CHILDREN when parent is newly create

		// First, we'll try to match the head and tail
		let start, end, count = Math.min(newChildren.length, oldChildren.length);

		for(start = 0; start < count && canPatch(newChildren[start], oldChildren[start]); start++) {
			domPath[domPathPos] = start;
			newChildren[start] = patch(newChildren[start], oldChildren[start], domPath, context);
		}
		count -= start;

		let newLast = newChildren.length - 1;
		let oldLast = oldChildren.length - 1;
		for(end = 0; end < count && canPatch(newChildren[newLast-end], oldChildren[oldLast-end]); end++) {
			domPath[domPathPos] = oldLast-end;
			newChildren[newLast-end] = patch(newChildren[newLast-end], oldChildren[oldLast-end], domPath, context);
		}
		
		if (end+start !== newChildren.length || newChildren.length !== oldChildren.length) {
			// We need to do some extra work to sort out the middle part.

			dom = dom || resolveDomPath(domPath, domPathPos);

			// For the middle range (that wasn't synced yet) in the old child list,
			// create an oldKeys index and an oldElements list of elements.
			let oldKeys = {};
			let oldElements = [];
			let insertBeforeE = null;
			if (oldChildren.length > start) {
				domPath[domPathPos] = start;
				insertBeforeE = resolveDomPath(domPath);
				for(let i=start; i<oldChildren.length-end; i++) {
					let child = oldChildren[i];
					if (typeof child === 'object' && child.key) oldKeys[child.key] = i;
					if (debug && !insertBeforeE) throw new Error("element missing");
					oldElements.push(insertBeforeE); // at i-start
					insertBeforeE = insertBeforeE.nextSibling;
					domReads++;
				}
			}


			let newKeys = {};
			for(let i=start; i<newChildren.length-end; i++) {
				let child = newChildren[i];
				if (typeof child === 'object' && child.key) newKeys[child.key] = i;
			}

			// Now for each item in the (yet unsynced) middle range of the new child
			// list, recycle (based on key) or create an element and insert/move it.
			let keepAfterall = 0;
			remainingChildLoop:
			for(let i=start; i<newChildren.length-end; i++) {
				let childDom = undefined;
				let newChild = newChildren[i];
				if (typeof newChild === 'object') {
					let idx, newKey = newChild.key;
					if (newKey && (idx = oldKeys[newKey]) && canPatch(newChild, oldChildren[idx])) {
						// Okay, we can recycle a keyed object
						childDom = oldElements[idx-start];
						oldElements[idx-start] = undefined;
						newChildren[i] = patch(newChild, oldChildren[idx], [childDom], context);
					}
					else if (!newKey || newKey[0]==='~') {
						// Scan for usable elements around this element
						let endJ = Math.min(i+5, oldChildren.length)
						for(let j=Math.max(i-5,0); j<endJ; j++) {
							let oldChild = oldChildren[j];
							if (typeof oldChild === 'object' && oldChild._t === newChild._t && oldElements[j-start]) {
								let oldKey = oldChild.key;
								if (!oldKey || (oldKey[0]==='~' && newKeys[oldKey]==null)) {
									childDom = oldElements[j-start];
									oldElements[j-start] = undefined;
									newChildren[i] = patch(newChild, oldChild, [childDom], context);
									if (j===start+keepAfterall) {
										keepAfterall++;
										continue remainingChildLoop;
									}
									break;
								}
							}
						}
					}
				}
				if (!childDom) childDom = create(newChild, context, oldChildren!==NON_TOP_EMPTY_CHILDREN);
				dom.insertBefore(childDom, insertBeforeE);
				domWrites++;
				if (debug>=3) glasgow.log('glasgow update insert node', childDom);
			}

			// Remove spurious elements from the DOM
			let insertKept = start;
			for(let i=0; i<oldElements.length; i++) {
				let element = oldElements[i];
				if (element) {
					let child = oldChildren[start+i];
					if (typeof child !== 'string') {
						if (child._t === 'kept') {
							newChildren.splice(insertKept++, 0, child);
							continue;
						}
						let res = destroy(child, context, element);
						if (res && typeof res.then === 'function') {
							let kept = {_t: 'kept', _c: []};
							newChildren.splice(insertKept++, 0, kept);
							(function(kept) {
								res.then(function() {
									kept._t = 'discard';
									instance.refreshNow();
								});
							})(kept);
							continue;
						}
					}
					dom.removeChild(element);
					domWrites++;
					if (debug>=3) glasgow.log('glasgow update remove element', element);
				}
			}
		}
		domPath.length = domPathPos;
		
		
		// That's it for the children. And now for the properties!
		if (newNode.binding) bind(newNode, context);
		
		for(let prop in newNode) {
			if (prop==='key' || prop==='binding' || prop[0]==='_') continue;
			
			let newVal = newNode[prop];
			if (typeof newVal === 'function') {
				if (prop.substr(0,2)==='on') prop = prop.substr(2);
				if (!delegatedTypes[prop]) {
					delegatedTypes[prop] = true;
					glasgow.log('glasgow delegating event type', prop);
					domRoot.addEventListener(prop, delegator);
					domWrites++;
					if (debug>=3) glasgow.log('glasgow update add event listener', prop);
				}
				continue;
			}
			
			let oldVal = oldNode[prop];
			if (newVal === oldVal) continue;
			if (newVal == null) {
				if (oldVal == null) continue;
				newVal = '';
			}

			dom = dom || resolveDomPath(domPath);
			if (prop === 'checked' || prop === 'value' || prop === 'className' || prop === 'selectedIndex') {
				dom[prop] = newVal;
			} else if (prop === 'style' && typeof newVal === 'object') {
				if (oldVal) dom.style = '';
				Object.assign(dom.style, newVal);
			} else {
				dom.setAttribute(prop, newVal);
			}
			domWrites++;
			if (debug>=3) glasgow.log('glasgow update set attribute', prop, newVal);
		}

		for(let key in oldNode) {
			if (key[0]==='_' || typeof oldNode[key]==='function') continue;
			if (newNode.hasOwnProperty(key)) continue;
			dom = dom || resolveDomPath(domPath);	 
			if (key === 'style' || key === 'checked' || key === 'value' || key === 'className') {
				dom[key] = '';
			} else {
				dom.removeAttribute(key);
			}
			domWrites++;
			if (debug>=3) glasgow.log('glasgow update unset attribute', key);
		}

		let func = newNode.onrefresh || newNode.refresh;
		if (typeof func==='function') afterRefresh(func, resolveDomPath(domPath), [{type:"refresh"}, context, newNode]);
		
		return newNode;
	}
	
	
	function refresh() {
		if (debug && scheduled<0) console.warn("refresh triggered during refresh");
		if (scheduled<1) scheduled = setTimeout(refreshNow, 0);
	}
	
	function refreshNow() {
		if (debug && scheduled < 0) console.error("recursive invocation?");
		scheduled = -1;

		let oldTree = treeRoot;
		treeRoot = glasgow(rootFunc, rootProps);
		
		domReads = domWrites = 0;
		let startTime = new Date();
		
		if (domRoot && canPatch(treeRoot, oldTree)) {
			treeRoot = patch(treeRoot, oldTree, [domRoot]);
		}
		else {
			glasgow.log('glasgow creating root');
			delegatedTypes = {};
			let oldRoot = domRoot;
			domRoot = null;
			create(treeRoot); // will set domRoot
			domWrites++;
			if (oldRoot) domParent.replaceChild(domRoot, oldRoot);
			else domParent.appendChild(domRoot);
		}

		glasgow.log('glasgow refreshed in', new Date() - startTime, 'ms, using', domWrites, 'DOM updates and', domReads, 'DOM reads'+(debug ? " [use glasgow.setDebug(0) if you're interested in speed]" : ""));
		
		for(let i=0; i<afterRefreshArray.length; i+=3) {
			afterRefreshArray[i].apply(afterRefreshArray[i+1], afterRefreshArray[i+2]);
		}
		afterRefreshArray.length = 0;

		if (scheduled===-1) scheduled = 0;
	}
	
					
	function unmount() {
		let pos = instances.indexOf(this);
		if (pos<0) throw new Error("not mountesd");
		instances.splice(pos,1);
		destroy(treeRoot, {}, domRoot);
		domParent.removeChild(domRoot);
	}
	
	function destroy(node, props, element) {
		if (typeof node === 'string') return;
		if (node._a) return destroy(node._a, node, element);
		let children = node._c;
		for(let i = 0; i < children.length; i++) {
			destroy(children[i], props);
		}
		let func = node.onremove || node.remove;
		if (typeof func==='function') return func.call(element, {type: "remove", parentStable: !!element}, props, node);
	}
	
	function resolveDomPath(path,limit) {
		let max = (limit==null ? path.length : limit) - 1;
		for(let i = max; i>=0; i--) {
			if (typeof path[i] !== 'number') {
				// we found a dom element!
				let el = path[i];
				for(let j=i+1; j<=max; j++) {
					el = el.childNodes[path[j]];
					if (debug && !el) throw new Error('invalid DOM path '+path);
					path[j] = el;
					domReads++;
				}
				return el;
			}
		}
		// limit === 0, we want the parent element
		domReads++;
		return path[0].parentNode;
	}
	
	
	function delegator(event) {
		let indexes = [];
		
		// indexes = [0,3,5] means that the event was fired on the 1st element, from the
		// 4th elements from the 6th element in domRoot.
		for (let element = event.target; element !== domRoot; element = element.parentNode) {
			let i = 0;
			for( let e = element.previousSibling; e; e = e.previousSibling) i++;
			indexes.push(i);
		}

		let tree = treeRoot, context;
		let treeArray = [];
		let i = indexes.length;
		while(true) {
			while(tree._a) {
				context = tree;
				tree = tree._a;
			}
			if (tree._t==='kept') break; // not really part of the virtual DOM anymore
			treeArray.push(tree, context);
			if (--i < 0) {
				if (debug && treeArray[treeArray.length-2]._e !== event.target) console.error("event tree resolve failed", event.target, treeArray[treeArray.length-2]._e, indexes);
				break;
			}
			tree = tree._c[indexes[i]];
		}
		

		let type = event.type;
		let ontype = 'on'+event.type;
		glasgow.log('glasgow event', type);
		
		let element = event.target;
		let doRefresh = false;
		for (let i = treeArray.length-2; i >= 0; i-=2) {
			let node = treeArray[i];
			let func = node[ontype] || node[type];
			if (typeof func==='function') {
				doRefresh = true;
				let props = treeArray[i+1];
				let res = func.call(element, event, props, node);
				if (res !== glasgow.NOT_HANDLED) {
					event.preventDefault();
					event.stopPropagation();
					break;
				}
			}
			element = element.parentNode;
		}
		if (doRefresh) refreshNow();
	}
	
	function bindingEventHandler(event, props, node) {
		let val = (node.type === 'checkbox') ? (node.checked = this.checked) :
							(node.type === 'number') ? parseFloat(node.value = this.value) :
							(node.value = this.value);
		writeBinding(node.binding, props, val);
	}
	
	function bind(node, props) {
		let val = readBinding(node.binding, props);
		if (node.type === 'checkbox') node.checked = !!val;
		else node.value = val==null ? "" : ""+val;
		node.oninput = bindingEventHandler;
	}
	
	function getTree() {
		return treeRoot;
	}
	
	// Called when we're done updating the DOM
	function afterRefresh(func, self, args) {
		afterRefreshArray.push(func, self, args);
	}
	
}



function fadeIn(event) {
	if (event.parentStable) transition({
		element: this,
		from: {
			height: "1px",
			opacity: 0,
			overflow: 'hidden',
			marginTop: "0px",
			marginBottom: "0px",
			paddingTop: "0px",
			paddingBottom: "0px",
			boxSizing: "border-box",
			width: this.offsetWidth+'px',
			maxWidth: "none",
			minWidth: "none",
			maxHeight: "none",
			minHeight: "none"
		},
		to: {
			height: this.offsetHeight+'px',
			opacity: 1,
			marginTop: "original",
			marginBottom: "original",
			paddingTop: "original",
			paddingBottom: "original"
		}
	});
}

function fadeOut(event) {
	if (event.parentStable) return transition({
		element: this,
		from: {
			overflow: 'hidden',
			height: this.offsetHeight+'px',
			boxSizing: "border-box",
			width: this.offsetWidth+'px',
			maxWidth: "none",
			minWidth: "none",
			maxHeight: "none",
			minHeight: "none"
		},
		to: {
			height: '0px',
			opacity: 0,
			marginTop: "0px",
			marginBottom: "0px",
			paddingTop: "0px",
			paddingBottom: "0px"
		},
		keep: true
	});
}

function transition({element, from, to, time, easing, keep}) {
	time = time || 400;
	easing = easing || 'ease';

	let original = {};
	for(let k in from) {
		original[k] = element.style[k];
		element.style[k] = from[k];
	}

	return new Promise(function(accept) {
		setTimeout(function() {
			original.transition = element.style.transition;
			element.style.transition = `all ${easing} ${time}ms`;
			for(let k in to) {
				if (!original.hasOwnProperty(k)) original[k] = element.style[k];
				element.style[k] = to[k]==='original' ? original[k] : to[k];
			}
			setTimeout(function() {
				// The extra timeout is to start this timer after the transition has actually started.
				setTimeout(function() {
					for(let k in original) {
						if (!keep || k==='transition') element.style[k] = original[k];
					}
					accept();
				}, time);
			}, 1);
		}, 0);
	});
}

function setDebug(_debug) {
	debug = 0|_debug;
}

function getInstancesCaller(method) {
	return function() {
		for(let instance of instances) {
			instance[method].apply(instance, arguments);
		}
	}
}

glasgow.mount = mount;
glasgow.NOT_HANDLED = NOT_HANDLED;
glasgow.transition = transition;
glasgow.fadeIn = fadeIn;
glasgow.fadeOut = fadeOut;
glasgow.setDebug = setDebug;
glasgow.refresh = getInstancesCaller('refresh');
glasgow.refreshNow = getInstancesCaller('refreshNow');
glasgow.refreshify = refreshify;
glasgow.log = function() { // ment to be overridden
	console.log.apply(console, arguments);
};
if (fetch) glasgow.fetch = glasgow.refreshify(fetch);

