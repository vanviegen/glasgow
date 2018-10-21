function Stateful(props) {
	props.$count = props.$count ? props.$count+1 : 1;
	return glasgow('div', {}, ''+props.$count);
}

exports.keep = [{
	root: props => glasgow(Stateful,{x:1}),
	result: `div{"1"}`
}, {
	root: props => glasgow(Stateful,{x:1}),
	result: `div{"2"}`,
	maxNew: 0
}];

exports.discard = [{
	root: props => glasgow(Stateful,{x:1}),
	result: `div{"1"}`
}, {
	root: props => glasgow(Stateful,{x:2}),
	result: `div{"1"}`,
}];
