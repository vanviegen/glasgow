const Cmp = (props, children) => children

exports.multiChild = [{
	root: props => glasgow(Cmp, null, "test1"),
	result: `"test1"`
}, {
	root: props => glasgow(Cmp, null, "test2", "test3"),
	result: `div{"test2" "test3"}`
}, {
	root: props => glasgow(Cmp, null, glasgow(Cmp,{},"test2"), glasgow("h1",{},"test3")),
	result: `div{"test2" h1{"test3"}}`
}, {
	root: props => glasgow(Cmp, null),
	result: `div{}`
}];

