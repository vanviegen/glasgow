exports.inElement = [{
	root: props => gg('b', ["test1"]),
	result: `b{"test1"}`
}, {
	root: props => gg('b', "test2"),
	result: `b{"test2"}`,
	maxNew: 0
}, {
	root: props => gg('b', 3),
	result: `b{"3"}`,
	maxNew: 0
}];

exports.inElementNumeric = [{
	root: props => gg('b', [1]),
	result: `b{"1"}`
}, {
	root: props => gg('b', "test2"),
	result: `b{"test2"}`,
	maxNew: 0
}];


exports.root = [{
	root: props => "test1",
	result: `"test1"`
}, {
	root: props => "test2",
	result: `"test2"`,
	maxNew: 0
}, {
	root: props => 3,
	result: `"3"`,
	maxNew: 0
}];


exports.rootNumeric = [{
	root: props => 4,
	result: `"4"`
}, {
	root: props => "test5",
	result: `"test5"`,
	maxNew: 0
}];


const Cmp = (props,children) => children[0]

exports.componentRoot = [{
	root: props => gg(Cmp, "test1"),
	result: `"test1"`
}, {
	root: props => gg(Cmp, "test2"),
	result: `"test2"`,
	maxNew: 0
}, {
	root: props => gg(Cmp, 3),
	result: `"3"`,
	maxNew: 0
}];


exports.componentRootNumeric = [{
	root: props => gg(Cmp, 4),
	result: `"4"`
}, {
	root: props => gg(Cmp, "test5"),
	result: `"test5"`,
	maxNew: 0
}];


exports.argumentOrder = [{
	root: props => gg('section.card@key',
		'Click here:',
		123,
		gg('button', { // attrs first
			id: 'b',
			className: 'c'
		}, 'Click me'),
		// attrs last:
		{id: 'myId'}
	),
	result: `section{@class="card" @id="myId" "Click here:" "123" button{@class="c" @id="b" "Click me"}}`
}];

