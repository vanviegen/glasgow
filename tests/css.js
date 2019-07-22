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

const StyledComponent = attrs => glasgow('div.'+(attrs.className||''), glasgow('span'));

StyledComponent.css = {
	backgroundColor: 'red',
	'> span': {
		color: 'blue'
	}
};

exports.style = [{
	root: props => glasgow(StyledComponent),
	result: `div{@class="GlGw1" span{}}`,
	css: `.GlGw1{background-color:red;}.GlGw1 > span{color:blue;}`
},{
	root: props => glasgow(StyledComponent,{className: 'cn'}),
	result: `div{@class="cn GlGw1" span{}}`,
	css: ``,
	maxNew: 0,
	maxChange: 1
}];

