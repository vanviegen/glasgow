exports.inElement = [{
	root: props => glasgow('b', {}, ["test1"]),
	result: `b{"test1"}`
}, {
	root: props => glasgow('b', {}, "test2"),
	result: `b{"test2"}`,
	maxNew: 0
}, {
	root: props => glasgow('b', {}, 3),
	result: `b{"3"}`,
	maxNew: 0
}];

exports.inElementNumeric = [{
	root: props => glasgow('b', {}, [1]),
	result: `b{"1"}`
}, {
	root: props => glasgow('b', {}, "test2"),
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
	root: props => glasgow(Cmp, null, "test1"),
	result: `"test1"`
}, {
	root: props => glasgow(Cmp, null, "test2"),
	result: `"test2"`,
	maxNew: 0
}, {
	root: props => glasgow(Cmp, null, 3),
	result: `"3"`,
	maxNew: 0
}];


exports.componentRootNumeric = [{
	root: props => glasgow(Cmp, null, 4),
	result: `"4"`
}, {
	root: props => glasgow(Cmp, null, "test5"),
	result: `"test5"`,
	maxNew: 0
}];

