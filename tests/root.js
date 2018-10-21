const ComponentDiv = props => glasgow('div')
const ComponentSpan = props => glasgow('span')
const ComponentText = props => "stringlet"

let types = [
	{
		name: "div",
		root: () => glasgow('div'),
		result: `div{}`
	}, {
		name: "span",
		root: () => glasgow('span'),
		result: `span{}`
	}, {
		name: "text",
		root: () => "stringlet",
		result: `"stringlet"`
	}, {
		name: "componentDiv",
		root: () => glasgow(ComponentDiv),
		result: `div{}`
	}, {
		name: "componentSpan",
		root: () => glasgow(ComponentSpan),
		result: `span{}`
	}, {
		name: "componentText",
		root: () => glasgow(ComponentText),
		result: `"stringlet"`
	}
];

for(let a of types) {
	for(let b of types) {
		if (a==b) continue;
		exports[`${a.name}-to-${b.name}`] = [
			{root: a.root, maxNew: 1, result: a.result},
			{root: a.root, maxNew: 0, result: a.result},
			{root: b.root, maxNew: 1, result: b.result},
			{root: b.root, maxNew: 0, result: b.result},
		];
	}
}

