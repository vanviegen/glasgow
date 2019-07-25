exports.className = [{
	root: props => gg('div.a'),
	result: `div{@class="a"}`
},{
	root: props => gg('div.b'),
	result: `div{@class="b"}`,
	maxNew: 0
},{
	root: props => gg('div.c.d'),
	result: `div{@class="c d"}`,
	maxNew: 0
},{
	root: props => gg('.c'),
	result: `div{@class="c"}`,
	maxNew: 0
}];

function StyledComponent() {
	return gg('div.'+(this.className||''), gg('span'));
}

StyledComponent.css = {
	backgroundColor: 'red',
	'> span': {
		color: 'blue'
	}
};

exports.style = [{
	root: props => gg(StyledComponent),
	result: `div{@class="GlGw1" span{}}`,
	css: `.GlGw1{background-color:red;}.GlGw1 > span{color:blue;}`
},{
	root: props => gg(StyledComponent,{className: 'cn'}),
	result: `div{@class="cn GlGw1" span{}}`,
	css: ``,
	maxNew: 0,
	maxChange: 1
}];

class StyledComponentClass {
	render() {
		return gg('div.'+(this.className||''), gg('span'));
	}
	css() {
		if (this!=null) throw new Error("css() may not use this");
		return {
			backgroundColor: 'red',
			'> span': {
				color: 'blue'
			}
		}
	}
}

exports.style = [{
	root: props => gg(StyledComponentClass),
	result: `div{@class="GlGw1" span{}}`,
	css: `.GlGw1{background-color:red;}.GlGw1 > span{color:blue;}`
},{
	root: props => gg(StyledComponentClass,{className: 'cn'}),
	result: `div{@class="cn GlGw1" span{}}`,
	css: ``,
	maxNew: 0,
	maxChange: 1
}];

