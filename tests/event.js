exports.click = [{
	root: function(attrs) {
		attrs.state = attrs.state || 0;
		return gg('h1',
			{
				onclick: function() {
					attrs.state += 100;
				}
			},
			gg('h2',
				{
					onclick: function() {
						attrs.state++;
					}
				},
				gg('h3', {id: 'x'})
			),
			attrs.state
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
		attrs.state = attrs.state || "a";
		return [
			gg('input', {binding:'state',id:'x'}),
			gg('div', attrs.state)
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
		return gg('h1',
			gg('h2', {
				onremove: gg.fadeOut
			})
		);
	},
	result: `h1{h2{}}`,
}, {
	root: function(attrs) {
		return gg('h1');
	},
	after: function(body) {
		if (body.toString().indexOf('body{h1{h2{')!==0) throw new Error('h2 should linger');
		setTimeout(function(){
			body.assertChildren('h1{}');
		}, 1000);
		// problem is that promises fire only when returning to event loop?
	}
}];
