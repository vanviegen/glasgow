exports.click = [{
	root: function(attrs) {
		attrs.$v = attrs.$v || 0;
		return glasgow('h1',
			{
				onclick: function() {
					attrs.$v += 100;
				}
			},
			glasgow('h2',
				{
					onclick: function() {
						attrs.$v++;
					}
				},
				glasgow('h3', {id: 'x'})
			),
			attrs.$v
		);
	},

	result: `h1{h2{h3{@id="x"}} "0"}`,

	after: function(body) {
		for(let i=0; i<2; i++) {
			setTimeout(function() {
				body.getElementById('x').event('click');
			}, 100+i*300);
			setTimeout(function() {
				body.assertChildren(`h1{h2{h3{@id="x"}} "${i+1}"}`);
			}, 200+i*300);
		}
	}
}];

exports.bind = [{
	root: function(attrs) {
		attrs.$inp = attrs.$inp || "a";
		return [
			glasgow('input', {binding:'$inp',id:'x'}),
			glasgow('div', attrs.$inp)
		];
	},

	result: `div{input{@id="x" value="a"} div{"a"}}`,

	after: function(body) {
		let x = body.getElementById('x');
		x.value = "b";
		x.event('input');
		body.assertChildren(`div{input{@id="x" value="b"} div{"b"}}`);
	}
}];

exports.fadeOut = [{
	root: function(attrs) {
		return glasgow('h1', {},
			glasgow('h2', {
				onremove: glasgow.fadeOut
			})
		);
	},
	result: `h1{h2{}}`,
}, {
	root: function(attrs) {
		return glasgow('h1');
	},
	after: function(body) {
		if (body.toString().indexOf('body{h1{h2{')!==0) throw new Error('h2 should linger');
		setTimeout(function(){
			body.assertChildren('h1{}');
		}, 1000);
		// problem is that promises fire only when returning to event loop?
	}
}];
