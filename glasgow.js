// glasgow.js
// (c) Frank van Viegen
// MIT license

const EMPTY_CHILDREN = [];
const EMPTY_ATTRS = {};
const EMPTY_NODE = {attrs: EMPTY_ATTRS, children: EMPTY_CHILDREN};
for(let obj of [EMPTY_CHILDREN, EMPTY_ATTRS, EMPTY_NODE])
	Object.freeze(obj);

const NOT_HANDLED = {}; // constant that can be returned by event handlers

let instances = [];

let cssClassCounter = 0; // used for generating unique class names for component css

let debug = 1;
	// 0. production build
	// 1. extra checking, a lot slower!
	// 2. reserved
	// 3. same as 1 + glasgow.log every DOM update

function VNode(tag, attrs, children) {
	this.tag = tag;
	this.attrs = attrs;
	this.children = children;
}

const dotRegEx = /\./g;

export default function glasgow(tag, ...args) {
	let children = [];
	let attrs;
	if (typeof tag==='object' && tag!==null && typeof tag.render==='function') { // an object with a render method
		attrs = Object.create(tag);
	} else if (typeof tag==='function') {
		if (tag.prototype && typeof tag.prototype.render==='function') { // a class with a render method
			attrs = new tag;
			tag = tag.prototype;
		} else { // a plain function
			attrs = {};
		}
	} else if (typeof tag === 'string') { // a DOM tag
		attrs = {};
		let pos = tag.indexOf('@');
		if (pos>=0) {
			attrs.key = tag.substr(pos+1);
			tag = tag.substr(0, pos);
		}
		pos = tag.indexOf('.');
		if (pos>=0) {
			attrs.className = tag.substr(pos+1).replace(dotRegEx, ' ') || undefined;
			tag = tag.substr(0,pos);
		}
		tag = tag||'div';
	} else if (debug) {
		throw new Error("first parameter should be a tag string, a component function or a component object (containing a render method)");
	}

	for(let arg of args) {
		if (typeof arg==='object' && arg!==null && arg.constructor === Object) {
			Object.assign(attrs, arg);
		} else {
			addChild(children, arg);
		}
	}

	return new VNode(tag, attrs, children);
};

function addChild(children, child) {
	if (child == null) return; // null or undefined
	let type = typeof child;
	if (type === 'object') {
		if (child instanceof VNode) {
			if (debug && (child.dbgEl || child.concrete)) throw new Error("VDOM nodes should not be recycled:" + JSON.stringify(child));
			children.push(child);
			return;
		}
		if (child instanceof Array) {
			for(let c of child) {
				addChild(children, c);
			}
			return;
		}
	}
	else if (type === 'number') return children.push(''+child);
	else if (type === 'string') return children.push(child);

	throw new Error("invalid child VDOM node: "+JSON.stringify(child));
}


function attrsEqual(p1,p2) {
	for(let k in p1) {
		if (p1[k]!==p2[k] && k[0]!=='$') return false;
	}
	for(let k in p2) {
		if (p1[k]!==p2[k] && k[0]!=='$') return false;
	}
	return true;
}


function resolveBinding(binding, attrs) {
	let parts = binding instanceof Array ? binding : binding.split('.');
	for(let i=0; i<parts.length-1; i++) {
		let term = parts[i];
		attrs = typeof term === 'object' ? term : (attrs[term] = attrs[term] || {});
	}
	return [attrs, parts[parts.length-1]];
}

function writeBinding(binding, attrs, value) {
	let [obj,key] = resolveBinding(binding, attrs);
	obj[key] = value;
}

function readBinding(binding, attrs) {
	let [obj,key] = resolveBinding(binding, attrs);
	return obj[key];
}


const upperCaseRegEx = /[A-Z]/g;
const upperToSnake = (letter) => '-' + letter.toLowerCase();

function objToCss(className, obj) {
	let res = className + "{";
	let sub = "";
	for(let k in obj) {
		let v = obj[k];
		if (v == null) continue;
		if (typeof v === 'object') {
			sub += objToCss(className+" "+k, v);
		} else {
			k = k.replace(upperCaseRegEx, upperToSnake);
			res += k+":"+v+";";
		}
	}
	return res+"}" + sub;
}



function mount(domParent, ...rootTagArgs) {

	let domRoot; // the root DOM element this mount has added
	let rootVnode; // the currently displaying tree
	let domReads, domWrites; // DOM operations counters
	let newDelegatedEvents = {}, allDelegatedEvents = {}; // eg {'onclick' => true}
	let afterRefreshArray = []; // used to fire events after the DOM has been updated
	let insertCss = ''; // css text to be added to the DOM, used by Component.css

	let scheduled = 0; // 0: not set, >0: a setTimeout handle, -1: refreshing, <-1: refreshing and another refresh is needed

	let instance = {refresh, refreshNow, unmount, getTree};
	instances.push(instance);
	refreshNow();
	return instance;


	function materialize(newNode) {
		let tag = newNode.tag;
		let res = (typeof tag==='function' ? tag : tag.render).call(newNode.attrs, newNode.children);
		delete newNode.children;

		let arr = [];
		addChild(arr, res);

		if (tag.css) {
			if (!tag.cssClass) {
				tag.cssClass = "GlGw" + ++cssClassCounter;
				if (typeof tag.css==='function') tag.css = tag.css.call(null);
				insertCss += objToCss('.'+tag.cssClass, tag.css);
			}
			for(let el of arr) {
				if (typeof el === 'object') {
					el.attrs.className = el.attrs.className==null ? tag.cssClass : el.attrs.className+' '+tag.cssClass;
				}
			}
		}

		return arr.length===1 ? arr[0] : {tag: 'div', attrs: {}, children: arr};
	}

	function create(newNode, context, parentStable) {
		if (typeof newNode === 'string') {
			domWrites++;
			if (debug>=3) glasgow.log('glasgow update create TextNode', newNode);
			return document.createTextNode(newNode);
		}

		let tag = newNode.tag;
		if (typeof tag !== 'string') { // create a component
			if (typeof tag.start === 'function') tag.start.call(newNode.attrs);
			newNode.concrete = materialize(newNode);
			return create(newNode.concrete, newNode.attrs, parentStable);
		}
		if (tag==='svg') newNode.svg = true;
		
		let el = newNode.svg ? document.createElementNS("http://www.w3.org/2000/svg", tag) : document.createElement(tag);
		domWrites++;
		if (debug>=3) glasgow.log('glasgow update create', tag);
		let func = newNode.attrs.oncreate;
		if (typeof func==='function') afterRefresh(func, context, [{element: el, event: {type:'create', parentStable}, vnode: newNode}]);
		patch(newNode, EMPTY_NODE, [el], context);
		return el;
	}
	
	function canPatch(newNode, oldNode) {
		return typeof newNode === typeof oldNode && (
			typeof newNode === 'string' || (
				newNode.tag === oldNode.tag &&
				newNode.attrs.key === oldNode.attrs.key
		 	)
		 );
	}
	
	function patch(newNode, oldNode, domPath, context) {
		if (debug) {
			if (newNode.dbgEl) console.error('double patch', newNode, resolveDomPath(domPath));
			if (oldNode.dbgEl && oldNode.dbgEl !== resolveDomPath(domPath)) console.error('dom element not properly matched with old node', oldNode, resolveDomPath(domPath));
		}

		if (typeof newNode === 'string') {
			if (newNode !== oldNode) {
				resolveDomPath(domPath).textContent = newNode;
				domWrites++;
				if (debug>=3) glasgow.log('glasgow update set TextNode', newNode);
			}
			return;
		}

		let domPathPos = domPath.length;

		let tag = newNode.tag;
		if (typeof tag !== 'string') { // a component
			// When the attributes match, we will transfer state from the old component.
			if (attrsEqual(newNode.attrs,oldNode.attrs)) {
				newNode.attrs = oldNode.attrs;
			} else {
				if (typeof tag.stop === 'function') tag.stop.call(oldNode.attrs);
				if (typeof tag.start === 'function') tag.start.call(newNode.attrs);
			}

			newNode.concrete = materialize(newNode);

			if (canPatch(newNode.concrete, oldNode.concrete)) {
				patch(newNode.concrete, oldNode.concrete, domPath, newNode.attrs);
			} else {
				// the top-level tag or key for this component changed
				destroy(oldNode.concrete, oldNode.attrs);

				let parentE = resolveDomPath(domPath, domPathPos-1);
				let newE = create(newNode.concrete, newNode.attrs, true);
				let oldE = resolveDomPath(domPath);
				parentE.replaceChild(newE, oldE);

				domWrites++;
				if (debug>=3) glasgow.log('glasgow update replace child', resolveDomPath(domPath));
				
				if (oldE===domRoot) {
					if (debug) glasgow.log('replacing root element');
					domRoot = domPath[0] = newE;
					newDelegatedEvents = allDelegatedEvents;
				}
			}
			return;
		}
		
		if (debug) newNode.dbgEl = resolveDomPath(domPath);
		
		let dom;
		
		// Now let's sync some children
		let newChildren = newNode.children;
		let oldChildren = oldNode.children; // === EMPTY_CHILDREN when parent is newly create

		// SVG tag is propagated recursively
		const svg = newNode.svg;
		if (svg) {
			for(let child of newChildren) child.svg = true;
		}
	
		// First, we'll try to match the head and tail
		let start, end, count = Math.min(newChildren.length, oldChildren.length);

		for(start = 0; start < count && canPatch(newChildren[start], oldChildren[start]); start++) {
			domPath[domPathPos] = start;
			patch(newChildren[start], oldChildren[start], domPath, context);
		}
		count -= start;

		let newLast = newChildren.length - 1;
		let oldLast = oldChildren.length - 1;
		for(end = 0; end < count && canPatch(newChildren[newLast-end], oldChildren[oldLast-end]); end++) {
			domPath[domPathPos] = oldLast-end;
			patch(newChildren[newLast-end], oldChildren[oldLast-end], domPath, context);
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
				let key;
				for(let i=start; i<oldChildren.length-end; i++) {
					let child = oldChildren[i];
					if (typeof child === 'object' && (key=child.attrs.key)) oldKeys[key] = i;
					if (debug && !insertBeforeE) throw new Error("element missing");
					oldElements.push(insertBeforeE); // at i-start
					insertBeforeE = insertBeforeE.nextSibling;
					domReads++;
				}
			}

			let key, newKeys = {};
			for(let i=start; i<newChildren.length-end; i++) {
				let child = newChildren[i];
				if (typeof child === 'object' && (key=child.attrs.key)) newKeys[key] = i;
			}

			// Now for each item in the (yet unsynced) middle range of the new child
			// list, recycle (based on key) or create an element and insert/move it.
			let keepAfterall = 0;
			remainingChildLoop:
			for(let i=start; i<newChildren.length-end; i++) {
				let childDom = undefined;
				let newChild = newChildren[i];
				if (typeof newChild === 'object') {
					let idx, newKey = newChild.attrs.key;
					if (newKey && (idx = oldKeys[newKey])!=null && canPatch(newChild, oldChildren[idx])) {
						// Okay, we can recycle a keyed object
						childDom = oldElements[idx-start];
						oldElements[idx-start] = undefined;
						patch(newChild, oldChildren[idx], [childDom], context);
					}
					else if (!newKey || newKey[0]==='~') {
						// Scan for usable elements around this element
						let endJ = Math.min(i+5, oldChildren.length)
						for(let j=Math.max(i-5,0); j<endJ; j++) {
							let oldChild = oldChildren[j];
							if (typeof oldChild === 'object' && oldChild.tag === newChild.tag && oldElements[j-start]) {
								let oldKey = oldChild.attrs.key;
								if (!oldKey || (oldKey[0]==='~' && newKeys[oldKey]==null)) {
									childDom = oldElements[j-start];
									oldElements[j-start] = undefined;
									patch(newChild, oldChild, [childDom], context);
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
				if (!childDom) childDom = create(newChild, context, oldChildren!==EMPTY_CHILDREN);
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
						if (child.tag === 'kept') {
							newChildren.splice(insertKept++, 0, child);
							continue;
						}
						let res = destroy(child, context, element);
						if (res && typeof res.then === 'function') {
							let kept = {tag: 'kept', children: [], attrs: {}};
							newChildren.splice(insertKept++, 0, kept);
							(function(kept) {
								res.then(function() {
									kept.tag = 'discard';
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
		
		
		// That's it for the children. And now for the attributes!
		let newAttrs = newNode.attrs;
		let oldAttrs = oldNode.attrs;
		if (newAttrs.binding) bind(newNode, context);

		for(let attr in newAttrs) {
			if (attr==='key' || attr==='binding') continue;
			
			let newVal = newAttrs[attr];
			if (typeof newVal === 'function') {
				if (debug && attr.substr(0,2)!=='on') throw new Error('function attributes values are only allowed for "on..." events, not for "'+attr+'"');
				attr = attr.substr(2);
				if (!allDelegatedEvents[attr]) {
					if (debug) glasgow.log('glasgow delegating event type', attr);
					newDelegatedEvents[attr] = allDelegatedEvents[attr] = true;
				}
				continue;
			}
			
			let oldVal = oldAttrs[attr];
			if (newVal === oldVal) continue;
			if (newVal == null) {
				if (oldVal == null) continue;
				newVal = '';
			}

			dom = dom || resolveDomPath(domPath);
			if (attr === 'value' || attr === 'className' || attr === 'selectedIndex' || newVal===true || newVal===false) {
				dom[attr] = newVal;
			} else if (attr === 'style' && typeof newVal === 'object') {
				if (oldVal) dom.style = '';
				Object.assign(dom.style, newVal);
			} else if (svg) {
				dom.setAttributeNS(null, attr, newVal);
			} else {
				dom.setAttribute(attr, newVal);
			}
			domWrites++;
			if (debug>=3) glasgow.log('glasgow update set attribute', attr, newVal);
		}

		for(let key in oldAttrs) {
			if (typeof oldAttrs[key]==='function') continue;
			if (newAttrs.hasOwnProperty(key)) continue;
			dom = dom || resolveDomPath(domPath);	 
			if (key === 'style' || key === 'checked' || key === 'value' || key === 'className') {
				dom[key] = '';
			} else {
				dom.removeAttribute(key);
			}
			domWrites++;
			if (debug>=3) glasgow.log('glasgow update unset attribute', key);
		}

		let func = newNode.attrs.onrefresh;
		if (typeof func==='function') afterRefresh(func, context, [{element: resolveDomPath(domPath), event: {type:"refresh"}, vnode: newNode}]);
		
		return;
	}
	
	
	function refresh() {
		if (scheduled<0) scheduled--;
		else if (scheduled<1) scheduled = setTimeout(refreshNow, 0);
	}

	function refreshNow() {
		if (scheduled<0) return;
		scheduled = -1;

		let oldRootVnode = rootVnode;
		rootVnode = glasgow(...rootTagArgs);
		
		domReads = domWrites = 0;
		let startTime = new Date();

		if (oldRootVnode) {
			if (debug && !canPatch(rootVnode,oldRootVnode)) throw new Error("root canPatch failed");
			patch(rootVnode, oldRootVnode, [domRoot], {});
		} else {
			domRoot = create(rootVnode, undefined, false);
			domParent.appendChild(domRoot);
		}

		for(let event in newDelegatedEvents) {
			domRoot.addEventListener(event, delegator, true);
			domWrites++;
			if (debug>=3) glasgow.log('glasgow update add event listener', event);
		}
		newDelegatedEvents = {};

		if (insertCss!=='') {
			const styleSheet = document.createElement("style")
			styleSheet.innerText = insertCss;
			document.head.appendChild(styleSheet)
			domWrites+=3;
			if (debug>=3) glasgow.log('glasgow inserted css', insertCss);
			insertCss = '';
		}

		glasgow.log('glasgow refreshed in', new Date() - startTime, 'ms, using', domWrites, 'DOM updates and', domReads, 'DOM reads'+(debug ? " [use glasgow.setDebug(0) if you're interested in speed]" : ""));
		
		for(let i=0; i<afterRefreshArray.length; i+=3) {
			afterRefreshArray[i].apply(afterRefreshArray[i+1], afterRefreshArray[i+2]);
		}
		afterRefreshArray.length = 0;

		if (scheduled < -1) {
			scheduled = 0;
			return refreshNow();
		}
		scheduled = 0;
	}
	
					
	function unmount() {
		let pos = instances.indexOf(this);
		if (pos<0) throw new Error("not mountesd");
		instances.splice(pos,1);
		destroy(rootVnode, {}, domRoot);
		domParent.removeChild(domRoot);
	}
	
	function destroy(node, attrs, element) {
		if (typeof node === 'string') return;
		if (node.concrete) {
			if (typeof node.tag.stop === 'function') node.tag.stop.call(node.attrs);
			return destroy(node.concrete, node.attrs, element);
		}
		let children = node.children;
		for(let i = 0; i < children.length; i++) {
			destroy(children[i], attrs);
		}
		let func = node.attrs.onremove;
		if (typeof func==='function') return func.call(attrs, {element, event: {type: "remove", parentStable: !!element}, vnode: node});
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
		return domParent;
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

		let tree = rootVnode, context;
		let treeArray = [];
		let i = indexes.length;
		while(true) {
			while(tree.concrete) {
				context = tree.attrs;
				tree = tree.concrete;
			}
			if (tree.tag==='kept') break; // not really part of the virtual DOM anymore
			treeArray.push(tree, context);
			if (--i < 0) {
				if (debug && treeArray[treeArray.length-2].dbgEl !== event.target) console.error("event tree resolve failed", event.target, treeArray[treeArray.length-2].dbgEl, indexes);
				break;
			}
			tree = tree.children[indexes[i]];
		}
		

		let type = event.type;
		let ontype = 'on'+event.type;
		glasgow.log('glasgow event', type);
		
		let element = event.target;
		let doRefresh = false;
		for (let i = treeArray.length-2; i >= 0; i-=2) {
			let node = treeArray[i];
			let func = node.attrs[ontype];
			if (typeof func==='function') {
				doRefresh = true;
				let attrs = treeArray[i+1];
				let res = func.call(attrs, {element, event, vnode: node});
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
	
	function bindingEventHandler({element,vnode:{attrs}}) {
		let val = (attrs.type === 'checkbox') ? (attrs.checked = element.checked) :
							(attrs.type === 'number') ? parseFloat(attrs.value = element.value) :
							(attrs.value = element.value);
		writeBinding(attrs.binding, this, val);
	}
	
	function bind(node, context) {
		let val = readBinding(node.attrs.binding, context);
		if (node.attrs.type === 'checkbox') node.attrs.checked = val = !!val;
		else node.attrs.value = val = val==null ? "" : ""+val;

		// If the bound property was empty, immediately set it to its default value
		writeBinding(node.attrs.binding, context, val);

		node.attrs.oninput = bindingEventHandler;
	}
	
	function getTree() {
		return rootVnode;
	}
	
	// Called when we're done updating the DOM
	function afterRefresh(func, self, args) {
		afterRefreshArray.push(func, self, args);
	}
	
}

function fadeOut({element,event}) {
	if (event.parentStable) return glasgow.transition({
		element,
		to: {
			marginTop: (element.offsetHeight / -2) + 'px',
			marginBottom: (element.offsetHeight / -2) + 'px',
			opacity: 0,
			transform: "scaleY(0)"
		},
		keep: true,
		easing: 'ease-out'
	});
}

function fadeIn({element,event}) {
	if (event.parentStable) return glasgow.transition({
		element: element,
		from: {
			marginTop: (element.offsetHeight / -2) + 'px',
			marginBottom: (element.offsetHeight / -2) + 'px',
			opacity: 0,
			transform: "scaleY(0)"
		},
		to: {
			marginTop: getComputedStyle(element).getPropertyValue('margin-top'),
			marginBottom: getComputedStyle(element).getPropertyValue('margin-bottom'),
			opacity: 1,
			transform: "scaleY(1)"
		},
		easing: 'ease-out'
	});
}

function transition({element, from, to, time, easing, keep}) {
	time = time || 400;
	easing = easing || 'ease-out';

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
glasgow.log = function() { // ment to be overridden
	console.log.apply(console, arguments);
};

