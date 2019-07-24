exports.swapTwo = [{
	root: props => gg('ul',
		gg('li.a@1', "A"),
		gg('li.b@2', "B")
	),
	result: `ul{li{@class="a" "A"} li{@class="b" "B"}}`
}, {
	root: props => gg('ul',
		gg('li.b@2', "B"),
		gg('li.a@1', "A")
	),
	result: `ul{li{@class="b" "B"} li{@class="a" "A"}}`,
	maxNew: 0,
	maxChange: 2
}];

let items = [];
for(let i=0; i<50; i++) {
	items.push(`t${i}.c${i}@${i}`);
}

exports.remove1 = [{
	root: props => gg('ul', items.map(i => gg(i))),
}, {
	root: props => {
		items.splice(20,1);
		return gg('ul', items.map(i => gg(i)));
	},
	maxChange: 1,
	maxNew: 0
}];

exports.move1 = [{
	root: props => gg('ul', items.map(i => gg(i))),
}, {
	root: props => {
		let item = items[30];
		items.splice(30,1);
		items.splice(10, 0, item);
		return gg('ul', items.map(i => gg(i)));
	},
	maxChange: 21, // TODO: this should ideally be 1
	maxNew: 0
}];

