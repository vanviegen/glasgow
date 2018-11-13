global.document = {
	createElement: tag => new Element(tag),
	createTextNode: text => new TextNode(text)
};
global.window = {};


const fs = require('fs');
const glasgow = require("../glasgow-cjs.js");

global.glasgow = glasgow;


let newCount = 0;
let failed = 0, passed = 0;


let logs = [];
glasgow.log = function(...args) {
	logs.push(args);
	if (verbose>1) console.log(" ", ...args);
}


let timeouts = [];
let timeBase = 0;
let realSetTimeout = global.setTimeout;
global.setTimeout = function(func,time) {
	timeouts.push({func, time: time+timeBase});
};

const wait = ms => new Promise((r, j)=>realSetTimeout(r, ms))

async function runTimeouts() {
	while(true) {
		// execute all microtasks first
		await wait(0);
		// only then see if there is a macrotask created by setTimeout
		if (!timeouts.length) return;
		timeouts.sort( (a,b) => a.time-b.time );
		let timeout = timeouts.shift();
		timeBase = timeout.time;
		timeout.func.call(this);
	}
}


class ElementBase {
	get nextSibling() {
		return this.getSibling(+1);
	}
	get previousSibling() {
		return this.getSibling(-1);
	}
	getSibling(delta) {
		if (!this.parentNode) return;
		let siblings = this.parentNode.childNodes;
		let idx = siblings.indexOf(this);
		if (idx < 0) throw new Error("not part of sibling!?");
		return siblings[idx+delta];
	}
}

class Element extends ElementBase {
	constructor(tag) {
		super();
		this.tag = tag;
		this.childNodes = [];
		this._style = {};
		this.attrs = {};
		this.events = {};
		newCount++;
	}
	appendChild(node) {
		this.insertBefore(node, null);
	}
	insertBefore(node, ref) {
		if (node.parentNode) node.parentNode.removeChild(node);
		node.parentNode = this;
		if (ref) {
			let idx = this.childNodes.indexOf(ref);
			if (idx<0) throw new Error("non-existing ref node");
			this.childNodes.splice(idx, 0, node);
		} else {
			this.childNodes.push(node);
		}
	}
	removeChild(node) {
		let idx = this.childNodes.indexOf(node);
		if (idx<0) throw new Error("no such child");
		this.childNodes.splice(idx, 1);
		node.parentNode = null;
	}
	replaceChild(newNode, oldNode) {
		this.insertBefore(newNode, oldNode);
		this.removeChild(oldNode);
	}
	setAttribute(k, v) {
		this.attrs[k] = v;
	}
	removeAttribute(k) {
		delete this.attrs[k];
	}
	get firstChild() {
		return this.childNodes[0];
	}
	get lastChild() {
		return this.childNodes[this.childNodes.length-1];
	}
	set style(val) {
		if (val !== '') throw new Error("non-empty style string cannot be emulated");
		this._style = {};
	}
	get style() {
		return this._style;
	}
	set className(v) {
		this.attrs.class = v;
	}
	toString() {
		let props = Object.assign({}, this);
		for(let k in this.attrs) props['@'+k] = this.attrs[k];
		for(let k in this.style) props['$'+k] = this._style[k];
		delete props.tag;
		delete props.attrs;
		delete props._style;
		delete props.events;
		delete props.childNodes;
		delete props.parentNode;

		let arr = [];
		for(let k in props) arr.push(k+'='+JSON.stringify(props[k]));
		arr.sort();
		for(let child of this.childNodes) arr.push(child.toString());

		return this.tag + `{${arr.join(' ')}}`;
	}

	assertChildren(desired) {
		let result = this.childNodes.join(' ');
		desired = desired.toString();
		if (verbose>2) console.log(`  assert ${desired}`);
		if (result!==desired) throw new Error(`invalid result ${result} instead of ${desired}`);
	}

	addEventListener(name, func) {
		this.events[name] = this.events[name] || [];
		this.events[name].push(func);
	}
	event(info) {
		if (typeof info === 'string') info = {type: info};
		let type = info.type;
		info.target = this;
		info.preventDefault = function(){};
		info.stopPropagation = function(){ info.stopped = true; };
		let node = this;
		while(node && !info.stopped) {
			let funcs = node.events[type];
			if (funcs) {
				for(let func of funcs) {
					func.call(node, info);
				}
			}
			node = node.parentNode;
		}
	}
	getElementById(id) {
		if (this.attrs.id === id) return this;
		for(let child of this.childNodes) {
			let el = child.getElementById(id);
			if (el) return el;
		}
	}
}

class TextNode extends ElementBase {
	constructor(textContent) {
		super();
		this.textContent = textContent;
		newCount++;
	}
	toString(indent) {
		return (indent||"") + JSON.stringify(this.textContent);
	}
}

function objEmpty(obj) {
	for(let k in obj) return false;
	return true;
}



async function runTest(name, steps) {
	if (!(steps instanceof Array)) steps = [steps];
	for(let setDebug of [9,0]) {
		glasgow.setDebug(setDebug);

		if (verbose>0) console.log(`${name} [setDebug(${setDebug})]`);
		logs = [];
		let body = new Element('body');
		timeouts = [];

		let mount;
		let rootProps = {abc:23};
		var step;
		function root() {
			return step.root.apply(this, arguments);
		}
		for(let i=0; i<steps.length; i++) {
			try {
				glasgow.log(`STEP ${i}`);
				newCount = 0;
				step = steps[i];
				if (i) mount.refreshNow();
				else mount = glasgow.mount(body, root, rootProps);
				if (step.result!=null) {
					body.assertChildren(step.result);
				}
				if (step.maxNew!=null) {
					if (newCount > step.maxNew) throw new Error(`${newCount} new elements created, only ${step.maxNew} allowed`);
				}
				if (step.after) step.after(body, rootProps);
				await runTimeouts();
			} catch(e) {
				console.log(`FAILED TEST '${name}' [setDebug(${setDebug})] at step ${i}\n\t${(e.stack||e).replace(/\n {0,4}/g,"\n\t\t")}\n\tLogs:\n\t\t${logs.map(e => e.join(" ")).join("\n\t\t")}`);
				failed++;
				try {
					mount.unmount();
				} catch(e) {}
				return;
			}
		}

		passed++;
		mount.unmount();
	}
}

let tests = [];
let verbose = 0;
let endOfFlags = false;
for(let i=2; i<process.argv.length; i++) {
	let arg = process.argv[i];
	if (endOfFlags || arg[0]!=='-') {
		tests.push(arg);
	} else if (arg[1]==='-') {
		if (arg=='--') {
			endOfFlags = true;
		}
		else {
			throw new Error(`unknown flag '${arg}'`);
		}
	} else {
		for(let j=1; j<arg.length; j++) {
			let letter = arg[j];
			if (letter==='v') {
				verbose++;
			} else {
				throw new Error(`unknown flag '-${letter}'`);
			}
		}
	}
}

runTests(tests);

async function runTests(tests) {
	if (tests.length) {
		for(let test of tests) {
			let [file,name] = test.split(':');
			let module = require(__dirname+'/'+file+'.js');
			if (await name) {
				await runTest(file+':'+name, module[name]);
			} else {
				for(let name in module) {
					await runTest(file+':'+name, module[name]);
				}
			}

		}
	} else {
		for(let file of fs.readdirSync(__dirname)) {
			let m = file.match(/^(.+)\.js$/);
			if (m && m[1]!=='index') {
				let module = require(__dirname+'/'+file);
				for(let name in module) {
					await runTest(m[1]+':'+name, module[name]);
				}
			}
		}
	}
	if (failed) console.log(`Failed ${failed} out of ${failed+passed} test`);
	else console.log(`Passed all ${passed} tests!`);
}



