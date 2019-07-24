const ComponentDiv = props => gg('div')
const ComponentSpan = props => gg('span')
const ComponentText = props => "stringlet"

let types = [
	{
		name: "div",
		root: () => gg('div'),
		result: `div{}`
	}, {
		name: "span",
		root: () => gg('span'),
		result: `span{}`
	}, {
		name: "text",
		root: () => "stringlet",
		result: `"stringlet"`
	}, {
		name: "componentDiv",
		root: () => gg(ComponentDiv),
		result: `div{}`
	}, {
		name: "componentSpan",
		root: () => gg(ComponentSpan),
		result: `span{}`
	}, {
		name: "componentText",
		root: () => gg(ComponentText),
		result: `"stringlet"`
	}
];

for(let a of types) {
	for(let b of types) {
		if (a==b) continue;
		exports[`${a.name}-to-${b.name}`] = [
			{root: a.root, maxNew: 2, result: a.result},
			{root: a.root, maxNew: 0, result: a.result},
			{root: b.root, maxNew: 1, result: b.result},
			{root: b.root, maxNew: 0, result: b.result},
		];
	}
}

exports.rootProps = {
	root: props => props.abc,
	result: `"23"`,
};
