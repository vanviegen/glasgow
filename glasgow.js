// glasgow.js
// (c) Frank van Viegen
// MIT license

const DEBUG = true;

const EMPTY_ARRAY = [];
const NON_TOP_EMPTY_CHILDREN = [];
const NON_TOP_EMPTY_NODE = {_c: NON_TOP_EMPTY_CHILDREN};

const NOT_HANDLED = {}; // constant that can be returned by event handlers

let currentInstance; // set during event handlers and component rendering


export default function glasgow(tag, props) {
  props = props || {};
  props._t = tag;

  if (arguments.length > 2) {
    var children = props._c = [];
    for(let i=2; i<arguments.length; i++) {
      let child = arguments[i];
      if (child instanceof Array) {
        for(let j=0; j<child.length; j++) {
          if (child[j] != null) {
            children.push(child[j]);
          }
        }
      }
      else if (child != null) {
        children.push(child);
      }
    }
  } else {
    props._c = EMPTY_ARRAY;
  }
  
  return props;
};



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

function createProxy(funcName) {
  return function() {
    if (!currentInstance) throw new Error("this glasgow proxy can only be used from components and glasgow event handlers");
    return currentInstance[funcName].apply(currentInstance, arguments);
  }
}


function mount(domParent, func) {

  let domRoot;
  let treeRoot;
  let domReads, domWrites; // DOM operations counters
  let delegatedTypes; // eg {'onclick' => true}
  let afterRefreshArray = [];

  let scheduled = 0;
  let fetch = window.fetch ? refreshify(window.fetch.bind(window)) : null;
  let instance = {refresh, refreshNow, unmount, refreshify, getTree, fetch};

  if (!glasgow.refresh) {
    for(let k in instance) glasgow[k] = createProxy(k);
  }
  
  refreshNow();

  return instance;


  function create(newNode, props, parentStable) {
    if (typeof newNode === 'string') {
      domWrites++;
      return document.createTextNode(newNode);
    }
    
    let tag = newNode._t;
    if (typeof tag === 'function') { // create a component
      newNode._a = tag(newNode, newNode._c);
      return create(newNode._a, newNode, parentStable);
    }
    if (typeof tag !== 'string') {
        if (DEBUG) console.error("invalid virtual DOM node:", newNode);
        return create(""+tag);
    }
    
    let el = document.createElement(tag);
    if (!domRoot) domRoot = el; // this can't wait; needed for event delegation
    domWrites++;
    if (newNode.oncreate) afterRefresh(newNode.oncreate, props, {element:el, node:newNode, parentStable});
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
    if (DEBUG) {
      if (newNode._e) console.error('double patch', newNode, resolveDomPath(domPath));
      if (oldNode._e && oldNode._e !== resolveDomPath(domPath)) console.error('dom element not properly matched with old node', oldNode, resolveDomPath(domPath));
    }
    
    if (typeof newNode === 'string') {
      if (newNode !== oldNode) {
        resolveDomPath(domPath).textContent = newNode;
        domWrites++;
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
      if (canPatch(materialized, oldNode._a)) {
        newNode._a = patch(materialized, oldNode._a, domPath, newNode);
      } else {
        // the top-level tag or key for this component changed
        destroy(oldNode._a, oldNode);
        newNode._a = materialized;
        resolveDomPath(domPath,domPathPos-1).replaceChild(create(materialized, newNode, true), resolveDomPath(domPath));
        domWrites++;
      }
      return newNode;
    }
    
    if (DEBUG) newNode._e = resolveDomPath(domPath);
    
    let dom;
    
    // Now let's sync some children
    let newChildren = newNode._c;
    let oldChildren = oldNode._c; // ==== NON_TOP_EMPTY_CHILDREN when parent is newly created

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
          if (DEBUG && !insertBeforeE) throw new Error("element missing");
          oldElements.push(insertBeforeE); // at i-start
          insertBeforeE = insertBeforeE.nextSibling;
          domReads++;
        }
      }

      // Now for each item in the (yet unsynced) middle range of the new child
      // list, recycle (based on key) or create an element and insert/move it.
      for(let i=start; i<newChildren.length-end; i++) {
        let childDom, idx, newChild = newChildren[i];
        if (typeof newChild === 'object' && newChild.key && (idx = oldKeys[newChild.key]) && canPatch(newChild, oldChildren[idx])) {
          childDom = oldElements[idx];
          oldElements[idx-start] = undefined;
          newChildren[i] = patch(newChild, oldChildren[idx], [childDom], context);
        }
        else {
          childDom = create(newChild, context, oldChildren!==NON_TOP_EMPTY_CHILDREN);
        }
        dom.insertBefore(childDom, insertBeforeE);
        domWrites++;
      }

      // Remove spurious elements from the DOM
      for(let i=0; i<oldElements.length; i++) {
        let element = oldElements[i];
        if (element) {
          let child = oldChildren[start+i];
          if (typeof child !== 'string') {
	        if (child._t === 'kept') {
              newChildren.splice(start++, 0, child);
		      continue;
		    }
	        let res = destroy(child, context, element);
	        if (res && typeof res.then === 'function') {
		      let kept = {_t: 'kept', _c: []}
              newChildren.splice(start++, 0, kept);
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
        }
      }
    }
    domPath.length = domPathPos;
    
    
    // That's it for the children. And now for the properties!
    if (newNode.binding) bind(newNode, context);
    
    for(let key in newNode) {
      if (key==='key' || key==='binding' || key[0]==='_') continue;
      
      if (key[0]==='o' && key[1]==='n') {
        if (!delegatedTypes[key]) {
          delegatedTypes[key] = true;
          console.log('glasgow delegating event type', key);
          domRoot.addEventListener(key.substr(2), delegator);
          domWrites++;
        }
        continue;
      }
      
      let newVal = newNode[key];
      let oldVal = oldNode[key];
      if (newVal == null || newVal === oldVal) continue;

      dom = dom || resolveDomPath(domPath);
      if (key === 'checked' || key === 'value' || key === 'className' || key === 'selectedIndex') {
        dom[key] = newVal;
      } else if (key === 'style' && typeof newVal === 'object') {
        if (oldVal) dom.style = '';
        Object.assign(dom.style, newVal);
      } else {
        dom.setAttribute(key, newVal);
      }
      domWrites++;
    }

    for(let key in oldNode) {
      if (key[0]==='_' || (key[0]==='o' && key[1]==='n')) continue;
      if (newNode.hasOwnProperty(key)) continue;
      dom = dom || resolveDomPath(domPath);   
      if (key === 'style' || key === 'checked' || key === 'value' || key === 'className') {
        dom[key] = '';
      } else {
        dom.removeAttribute(key);
      }
      domWrites++;
    }

    if (newNode.onrefresh) afterRefresh(newNode.onrefresh, context, {element:resolveDomPath(domPath), node:newNode});
    
    return newNode;
  }
  
  
  function refresh() {
    if (DEBUG && scheduled<0) console.warn("refresh triggered during refresh");
    if (scheduled<1) scheduled = setTimeout(refreshNow, 0);
  }
  
  function refreshNow() {
    if (DEBUG && scheduled < 0) console.error("recursive invocation?");
    scheduled = -1;

    let oldCurrent = currentInstance;
    currentInstance = instance;
    
    let oldTree = treeRoot;
    if (typeof func==='function') {
      treeRoot = glasgow(func, {});
    } else {
      treeRoot = {};
      for(let k in func) treeRoot[k] = func[k];
    }
    
    domReads = domWrites = 0;
    let startTime = new Date();
    
    if (domRoot && canPatch(treeRoot, oldTree)) {
      treeRoot = patch(treeRoot, oldTree, [domRoot]);
    }
    else {
      console.log('glasgow creating root');
      delegatedTypes = {};
      let oldRoot = domRoot;
      domRoot = null;
      create(treeRoot); // will set domRoot
      if (oldRoot) domParent.replaceChild(domRoot, oldRoot);
      else domParent.appendChild(domRoot);
    }

    console.log('glasgow refreshed in', new Date() - startTime, 'ms, using', domWrites, 'DOM updates and', domReads, 'DOM reads'+(DEBUG ? " [disable DEBUG mode if you're interested in speed]" : ""));
    
    for(let i=0; i<afterRefreshArray.length; i+=3) {
      afterRefreshArray[i](afterRefreshArray[i+1], afterRefreshArray[i+2]);
    }
    afterRefreshArray.length = 0;

    currentInstance = oldCurrent;
    
    if (scheduled===-1) scheduled = 0;
  }
  
  function refreshify(func) {
    return function() {
      let oldCurrent = currentInstance;
      currentInstance = instance;
      let res = refreshEventResult(func.apply(this, arguments));
      currentInstance = oldCurrent;
      return res;
    }
  }
  
  function refreshEventResult (result) {
    refreshNow();
    if (result && typeof result.then === 'function') {
      result.then(refreshEventResult);
    }
    return result;
  }
          
  function unmount() {
    destroy(treeRoot, {}, domRoot);
    domParent.removeChild(domRoot);
  }
  
  function destroy(node, props, element) {
    if (node._a) return destroy(node._a, node, element);
    let children = node._c;
    for(let i = 0; i < children.length; i++) {
      if (typeof children[i] !== 'string') destroy(children[i], props);
    }
    if (node.onremove) return node.onremove(props, {node, element, parentStable:!!element});
  }
  
  function resolveDomPath(path,limit) {
    let max = (limit || path.length) - 1;
    for(let i = max; i>=0; i--) {
      if (typeof path[i] !== 'number') {
        // we found a dom element!
        let el = path[i];
        for(let j=i+1; j<=max; j++) {
          el = el.childNodes[path[j]];
          if (DEBUG && !el) throw new Error('invalid DOM path '+path);
          path[j] = el;
          domReads++;
        }
        return el;
      }
    }
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
		    if (DEBUG && treeArray[treeArray.length-2]._e !== event.target) console.error("event tree resolve failed", event.target, treeArray[treeArray.length-2]._e, indexes);
	      break;
	  }
      tree = tree._c[indexes[i]];
    }
    

    let type = 'on' + event.type;
    console.log('glasgow event', type);
    
    let element = event.target;
    for (let i = treeArray.length-2; i >= 0; i-=2) {
      let node = treeArray[i];
      let func = node[type];
      if (func) {
        let props = treeArray[i+1];
        let res = func(props, {element, event, node});
        if (res !== glasgow.NOT_HANDLED) {
          event.preventDefault();
          event.stopPropagation();
          return refreshNow();
        }
      }
      element = element.parentNode;
    }
  }
  
  function bindingEventHandler(props, {node, element}) {
    let val = (node.type === 'checkbox') ? (node.checked = element.checked) :
              (node.type === 'number') ? parseFloat(node.value = element.value) :
              (node.value = element.value);
    writeBinding(node.binding, props, val);
  }
  
  function bind(node, props) {
    let val = readBinding(node.binding, props);
    if (node.type === 'checkbox') node.checked = !!val;
    else node.value = val==null ? "" : val;
    node.oninput = bindingEventHandler;
  }
  
  function getTree() {
    return treeRoot;
  }
  
  // Called when we're done updating the DOM
  function afterRefresh(func, arg1, arg2) {
    afterRefreshArray.push(func, arg1, arg2);
  }
  
}



function fadeIn(props, {element, parentStable}) {
	if (parentStable) transition({
		element,
		from: {height: "1px", opacity: 0, overflow: 'hidden'},
		to: {height: element.offsetHeight+'px', opacity: 1}
	});
}

function fadeOut(props, {element, parentStable}) {
	if (parentStable) return transition({
		element,
		from: {overflow: 'hidden', height: element.offsetHeight+'px'},
		to: {height: '0px', opacity: 0},
		keep: true
	});
}

function transition({element, from, to, time, easing}) {
	time = time || 350;
	easing = easing || 'ease-out';

	let transition = [];
	for(let k in to) {
		transition.push(`${k} ${easing} ${time}ms`);
	}
	from.transition = transition.join();

	let original = {};
	for(let k in from) {
		original[k] = element.style[k];
		element.style[k] = from[k];
	}

	return new Promise(function(accept) {
		setTimeout(function() {
			for(let k in to) {
				if (!original.hasOwnProperty(k)) original[k] = element.style[k];
				element.style[k] = to[k];
			}
			setTimeout(function() {
				for(let k in original) {
					element.style[k] = original[k];
				}
				accept();
			}, time+150);
		}, 0);
	});
}


let statics = {mount, NOT_HANDLED, transition, fadeIn, fadeOut};
for(let k in statics) glasgow[k] = statics[k];

