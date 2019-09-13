function Stateful() {
	this.$count = this.$count ? this.$count+1 : 1;
	return gg('div', ''+this.$count);
}

exports.keep = [{
	root: props => gg(Stateful,{x:1}),
	result: `div{"1"}`
}, {
	root: props => gg(Stateful,{x:1}),
	result: `div{"2"}`,
	maxNew: 0
}];

exports.discard = [{
	root: props => gg(Stateful,{x:1}),
	result: `div{"1"}`
}, {
	root: props => gg(Stateful,{x:2}),
	result: `div{"1"}`,
}];

class Keep {
	render() {
		return gg('div', this.$x);
	}
	start() {
		let obj = this;
		obj.$x = 0;
		setTimeout(function() {
			obj.$x = 1;
			gg.refresh();
		}, 10);
		setTimeout(function() {
			obj.$x = 2;
			gg.refresh();
		}, 20);
	}
}


exports.discard = [{
	root: props => gg(Keep),
	after(body) {
		body.assertChildren(`div{"0"}`);
		setTimeout(function() {
			body.assertChildren(`div{"1"}`);
		}, 15);
		setTimeout(function() {
			body.assertChildren(`div{"2"}`);
		}, 25);
	}
}];

