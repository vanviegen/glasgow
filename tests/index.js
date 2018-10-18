global.document = {
	createElement: tag => new Element(tag),
	createTextNode: text => new TextNode(text)
};
global.window = {};

require = require("esm")(module);
const fs = require('fs');
const glasgow = require("../glasgow.js").default;
global.glasgow = glasgow;
glasgow.setDebug(99);


let newCount = 0;
let failed = 0, passed = 0;


let logs = [];
glasgow.log = function(...args) {
	logs.push(args);
	if (verbose>1) console.log(" ", ...args);
}


class Element {
	constructor(tag) {
		this.tag = tag;
		this.childNodes = [];
		this._style = {};
		this.attrs = {};
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
		return this.children[0];
	}
	get lastChild() {
		return this.children[this.children.length-1];
	}
	get nextSibling() {
		return this.getSibling(+1);
	}
	get previousSibling() {
		return this.getSibling(-1);
	}
	getSibling(delta) {
		let siblings = this.parentNode.childNodes;
		let idx = siblings.indexOf(this);
		if (idx < 0) throw new Error("not part of sibling!?");
		return siblings[idx+delta];
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
		//div(a=3 b=4){}
		let res = this.tag;

		let props = Object.assign({}, this);
		for(let k in this.attrs) props['@'+k] = this.attrs[k];
		for(let k in this.style) props['$'+k] = this._style[k];
		delete props.tag;
		delete props.attrs;
		delete props._style;
		delete props.childNodes;
		delete props.parentNode;

		let arr = [];
		for(let k in props) arr.push(k+'='+JSON.stringify(props[k]));
		if (arr.length) {
			arr.sort();
			res += '(' + arr.join(' ') + ')';
		}

		if (this.childNodes.length) {
			res += "{";
			for(let child of this.childNodes) {
				res += child.toString();
			}
			res += "}";
		}
		else {
			res += "{}";
		}
		return res;
	}
}

class TextNode {
	constructor(textContent) {
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



function assertResult(result, desired) {
	result = result.toString();
	desired = desired.toString();
	if (result!=desired) throw new Error(`invalid result ${result} instead of ${desired}`);
}

function runTest(name, ...steps) {
	if (verbose>0) console.log(name);
	logs = [];
	let body = new Element('body');

	let mount;
	var step;
	function func() {
		return step.func.apply(this, arguments);
	}
	for(let i=0; i<steps.length; i++) {
		try {
			glasgow.log(`STEP ${i}`);
			newCount = 0;
			step = steps[i];
			if (i) mount.refreshNow();
			else mount = glasgow.mount(body, func);
			if (body.childNodes.length != 1) throw new Error("one body child expected");
			if (step.result!=null) {
				assertResult(body.childNodes[0], step.result);
			}
			if (step.maxNew!=null) {
				if (newCount > step.maxNew) throw new Error(`${newCount} new elements created, only ${step.maxNew} allowed`);
			}
		} catch(e) {
			console.log(`FAILED TEST '${name}' at step ${i}\n\t${e}\n\tLogs:\n\t\t${logs.map(e => e.join(" ")).join("\n\t\t")}`);
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

if (tests.length) {
	for(let test of tests) {
		let [file,name] = test.split(':');
		let module = require(__dirname+'/'+file+'.js');
		if (name) {
			runTest(file+':'+name, ...module[name]);
		} else {
			for(let name in module) {
				runTest(file+':'+name, ...module[name]);
			}
		}

	}
} else {
	for(let file of fs.readdirSync(__dirname)) {
		let m = file.match(/^(.+)\.js$/);
		if (m && m[1]!=='index') {
			let module = require(__dirname+'/'+file);
			for(let name in module) {
				runTest(m[1]+':'+name, ...module[name]);
			}
		}
	}
}


if (failed) console.log(`Failed ${failed} out of ${failed+passed} test`);
else console.log(`Passed all ${passed} tests!`);

