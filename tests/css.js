exports.className = [{
	root: props => glasgow('div.a'),
	result: `div{@class="a"}`
},{
	root: props => glasgow('div.b'),
	result: `div{@class="b"}`,
	maxNew: 0
},{
	root: props => glasgow('div.c.d'),
	result: `div{@class="c d"}`,
	maxNew: 0
},{
	root: props => glasgow('.c'),
	result: `div{@class="c"}`,
	maxNew: 0
}];


