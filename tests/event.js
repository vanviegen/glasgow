exports.click = [{
	root: function(props) {
		props.v = props.v || 0;
		return glasgow('h1', {
			click: function() {
				props.v += 100;
			}
		},
			glasgow('h2', {
				click: function() {
					props.v++;
				}
			},
				glasgow('h3', {id: 'x'})
			),
			''+props.v
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
	root: function(props) {
		props.$inp = props.$inp || "a";
		return glasgow('input', {binding:'$inp',id:'x'});
	},

	result: `input{@id="x" value="a"}`,

	after: function(body, props) {
		let x = body.getElementById('x');
		x.value = "b";
		x.event('input');
		body.assertChildren(`input{@id="x" value="b"}`);
		if (props.$inp !== "b") throw new Error("binding not changing props");
	}
}];

exports.fadeOut = [{
	root: function(props) {
		return glasgow('h1', {},
			glasgow('h2', {
				remove: glasgow.fadeOut
			})
		);
	},
	result: `h1{h2{}}`,
}, {
	root: function(props) {
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
