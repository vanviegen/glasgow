const ComponentDiv = props => glasgow('div')
const ComponentSpan = props => glasgow('span')
const ComponentText = props => "stringlet"

let types = [
	{
		name: "div",
		func: () => glasgow('div'),
		result: `div{}`
	}, {
		name: "span",
		func: () => glasgow('span'),
		result: `span{}`
	}, {
		name: "text",
		func: () => "stringlet",
		result: `"stringlet"`
	}, {
		name: "componentDiv",
		func: () => glasgow(ComponentDiv),
		result: `div{}`
	}, {
		name: "componentSpan",
		func: () => glasgow(ComponentSpan),
		result: `span{}`
	}, {
		name: "componentText",
		func: () => glasgow(ComponentText),
		result: `"stringlet"`
	}
];

for(let a of types) {
	for(let b of types) {
		if (a==b) continue;
		exports[`${a.name}-to-${b.name}`] = [
			{func: a.func, maxNew: 1, result: a.result},
			{func: a.func, maxNew: 0, result: a.result},
			{func: b.func, maxNew: 1, result: b.result},
			{func: b.func, maxNew: 0, result: b.result},
		];
	}
}

