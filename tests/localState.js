function Stateful(props) {
	props.state = props.state ? props.state+1 : 1;
	return gg('div', ''+props.state);
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
