const Cmp = {
	render(children) {
		return [children, this.$squared]
	},
	start() {
		//console.log('start',this);
		running.push(this.id);
		startCount++;
		if (this.id) {
			this.$squared = this.id*this.id;
		}
	},
	stop() {
		//console.log('stop',this);
		let pos = running.indexOf(this.id);
		if (pos<0) throw new Error("this not found");
		running.splice(pos,1);
	}
}

let running = [];
let startCount = 0;

exports.multiChild = [{
	root: attrs => gg(Cmp, "test1"),
	result: `"test1"`
}, {
	root: attrs => gg(Cmp, "test2", "test3"),
	result: `div{"test2" "test3"}`
}, {
	root: attrs => gg(Cmp, gg(Cmp,{},"test2"), gg("h1",{},"test3")),
	result: `div{"test2" h1{"test3"}}`
}, {
	root: attrs => gg(Cmp, null),
	result: `div{}`
}];

function checkRunning(...expected) {
	let rj = JSON.stringify(running);
	expected = JSON.stringify(expected);
	if (rj!==expected) throw new Error(`start/stop error: ${rj} are running but expected ${expected}`);
}

exports.startStop = [{
	root: attrs => gg(Cmp, {id:1}),
	result: `"1"`,
	after: function() {
		checkRunning(1);
	}
},{
	root: attrs => gg(Cmp, {id:2}),
	result: `"4"`,
	after: function() {
		checkRunning(2);
	}
},{
	root: attrs => gg('div'),
	after: function() {
		checkRunning();
	}
},{
	root: attrs => gg(Cmp, {id:3, $squared: 'x'}, gg(Cmp, {id:4}), gg(Cmp, {id:5})),
	after: function() {
		checkRunning(3,4,5);
		startCount = 0;
	}
},{
	root: attrs => gg(Cmp, {id:3}, gg(Cmp, {id:4}), gg(Cmp, {id:5})),
	after: function() {
		checkRunning(3,4,5);
		if (startCount!=0) throw new Error("start/stop cycle when not changing anything");
	}
},{
	root: attrs => gg(Cmp, {id:3, x: 'x'}, gg(Cmp, {id:4}), gg(Cmp, {id:5})),
	after: function() {
		// 3 should restart, 4 and 5 can continue running
		checkRunning(4,5,3);
		if (startCount!=1) throw new Error("start/stop cycle should be triggered only for 3");
	}
},{
	unmount: true,
	after: function() {
		checkRunning();
	}
}];



const EventObj = {
	start(){
		this.$x = 1;
	},
	render() {
		return gg('a', '#'+this.$x, {id: 'click', onclick: this.incrX});
	},
	incrX() {
		this.$x++;
	}
};

exports.event = [{
	root: function() {
		return gg(EventObj);
	},
	after: function(body) {
		for(let i=0; i<2; i++) {
			setTimeout(function() {
				body.getElementById('click').event('click');
			}, 100+i*300);
			setTimeout(function() {
				body.assertChildren(`a{@id="click" "#${i+2}"}`);
			}, 200+i*300);
		}
	}
}];

class EventClass {
	start(){
		this.$x = 1;
	}
	render() {
		return gg('a', '#'+this.$x, {id: 'click', onclick: this.incrX});
	}
	incrX() {
		this.$x++;
	}
};

exports.es6Class = [{
	root: function() {
		return gg(EventClass);
	},
	after: function(body) {
		for(let i=0; i<2; i++) {
			setTimeout(function() {
				body.getElementById('click').event('click');
			}, 100+i*300);
			setTimeout(function() {
				body.assertChildren(`a{@id="click" "#${i+2}"}`);
			}, 200+i*300);
		}
	}
}];

