Glasgow
-------

An easy-to-use JavaScript library for building user interfaces in a *functional reactive* way, optionally using JSX.

* [Why glasgow](#why-glasgow)
* [Example usage](#example-usage)
* [Installation](#installation)
* [Reference manual](#reference-manual)
* [Changelog](#changelog)


## Why Glasgow?

Glasgow is primarily meant for educational use. It has the same main features as React (functional reactive DOM management, components and optional JSX), but is simpler to use.

#### Reasons to use Glasgow:

- *Easy* to learn -- there are not many concepts to understand.

- *Easy* to set up -- glasgow is pretty convenient to use without JSX, so adding webpack+babel complexity is entirely optional.

- *Easy* state mangement -- you can store state anywhere you like. There's no `setState`. The UI will refresh automatically after handling events, or when you tell it to. Component local state is supported as well, and is just as easy.

- *Easy* event handling.
  - Function binding is usually not required, as handlers will automatically be provided with [context info](#event-handlers).
  - [Event delegation](#event-delegation), meaning performance won't suffer much if you *do* need to bind or create new function instances on every refresh.
  - Two-way [binding](#bindings), when you want it.

- *Easy* [components](#components) -- they're usually just functions. [CSS styling](#component-css) can be attached to a component, allowing you to create *single file components* like Vue.js.

- *Easy* [animations](#glasgowfadein) for element creation and destruction.

- *Tiny*. Less than 4kb minified and gzipped. Built from a [single source file](glasgow.js) that is small enough to read. No dependencies.

- *Fast* enough. Rendering seems [about as fast as React](https://www.vanviegen.net/glasgow/benchmark.html). Startup is a lot speedier.

#### Reasons not to use Glasgow:

- It's not very mature. You may experience more than your fair share of bleeding edges.

- Only the basics are provided. No routers, no server-side rendering, no ready-to-use components.

- No community.


## Example usage

### Without JSX
```js

// Load the glasgow library from a CDN. As we will be using the default 
// function continuously in places where we want to avoid clutter, I'll
// give it a really short name: gg.
import gg from 'https://cdn.jsdelivr.net/npm/glasgow@0.9.4/glasgow.js';


// I'm using global state here for the list. We could have also chosen to pass
// the state down the chain, but I want to stress the point that nothing
// special is going on here.
let list = [];


// This is the component for a single ToDo-item. Components are just functions.
// A component gets a (JSX) attributes object and an array of children (which
// we're ignoring here).
function Item(children) {
  return gg('li', {oncreate: gg.fadeIn, onremove: gg.fadeOut},
    gg('label', this.key),
    gg('.delete', {onclick: deleteItem}, '✖')
  );
}

// Add some styling to the Item component
Item.css = {
	backgroundColor: '#f8f8f8',
	padding: '0.5em',
	marginBottom: '1em',
	borderRadius: '0.25em',
	display: 'flex',
	// We can use selectors here, which will match within the component
	label: {
		flex: 1,
	},
	'> .delete:hover': {
		color: 'red',
	},
};

// This the onclick handler for the delete-button. Notice how we didn't need to
// bind the function, as the component's attributes and state are provided by Glasgow
// as the `this` object.
function deleteItem() {
  // We're just modifying regular JavaScript variables here. Glasgow will 
  // refresh the UI after we return from the event handler.
  list.splice(list.indexOf(this.key), 1);
}


// This is our main component.
function ToDo(children) {
  // The JavaScript `map` function is used to translate the list of ToDo-items 
  // into a list of virtual DOM elements.
  // `key` is a special attribute, as it's used to match-up old elements with
  // new elements when doing a refresh. (See: Reconciliation.)
  return gg('main',
    gg('h1', 'Mandatory ToDo example'),
    list.map(key => gg(Item, {key})),
    gg('input', {type: 'text', placeholder: 'New item', binding: '$newItem'}),
    gg('input', {type: 'button', value: 'Add', onclick: addItem})
  )
  // We're binding the text input to `$newItem`, meaning it is synced with
  // `this.$newItem`. (See: Bindings.)
  // Attributes starting with '$' are special. They are the component state,
  // meaning they are preserved when the UI refreshes. (See: Component state.)
}

function addItem() {
  list.push(this.$newItem);
  this.$newItem = "";
}


// And this is where we add the ToDo component to the DOM. Presto!
gg.mount(document.body, ToDo);
```


### With JSX


```jsx
// First we'll instruct the JSX compiler to generate `glasgow(..)` calls:
/** @jsx glasgow */

// Import glasgow from npm package.
import glasgow from 'glasgow';


// I'm using global state here for the list. We could have also chosen to pass
// the state down the chain, but I want to stress the point that nothing
// special is going on here.
let list = [];


// This is the component for a single ToDo-item. Components are just functions.
// A component gets a (JSX) attributes object and an array of children (which
// we're ignoring here).
function Item(children) {
  return <li>
    <label>{this.key}</label>
    <div class="delete" onclick={deleteItem}>✖</div>
  </li>;
}

// Add some styling to the Item component
Item.css = {
	backgroundColor: '#f8f8f8',
	padding: '0.5em',
	marginBottom: '1em',
	borderRadius: '0.25em',
	display: 'flex',
	// We can use selectors here, which will match within the component
	label: {
		flex: 1,
	},
	'> .delete:hover': {
		color: 'red',
	},
};

// This the onclick handler for the delete-button. Notice how we didn't need to
// bind the function, as the component's attributes and state are provided by Glasgow
// as the `this` object.
function deleteItem() {
  // We're just modifying regular JavaScript variables here. Glasgow will 
  // refresh the UI after we return from the event handler.
  list.splice(list.indexOf(this.key), 1);
}


// This is our main component.
function ToDo(children) {
  // The JavaScript `map` function is used to translate the list of ToDo-items 
  // into a list of virtual DOM elements.
  // `key` is kind of a special attribute, as it's also used to match-up old
  // elements with new elements when doing a refresh. (See: Reconciliation.)
  return <main>
    <h1>Mandatory ToDo example</h1>
    <ul>
      {list.map(item => <Item key={item} />)}
    </ul>
    <input type="text" placeholder="New item" binding="$newItem" />
    <input type="button" value="Add" onclick={addItem} />
  </main>;
  // We're binding the text input to `$newItem`, meaning it is synced with
  // `this.$newItem`. (See: Bindings.)
  // Attributes starting with '$' are special. They are the component state,
  // meaning they are preserved when the UI refreshes. (See: Component state.)
}

function addItem() {
  list.push(this.$newItem);
  this.$newItem = "";
}


// And this is where we add the ToDo component to the DOM. Presto!
glasgow.mount(document.body, ToDo);
```


## Installation

Apart from installing and importing this library, you'll need to setup *babel* to transpile JSX to plain JavaScript. Sorry, no detailed instructions yet.



## Reference manual

 * [The glasgow module](#the-glasgow-module)
    * [glasgow(tag, ...args)](#glasgowtag-args)
       * [Example](#example)
    * [glasgow.mount(domParent, tag, ...args)](#glasgowmountdomparent-tag-args)
       * [Examples](#examples)
    * [glasgow.setDebug(debug)](#glasgowsetdebugdebug)
    * [glasgow.fadeIn(...)](#glasgowfadein)
    * [glasgow.fadeOut(...)](#glasgowfadeout)
    * [glasgow.transition({element, from, to, time, easing, keep})](#glasgowtransitionelement-from-to-time-easing-keep)
    * [glasgow.refresh()](#glasgowrefresh)
    * [glasgow.refreshNow()](#glasgowrefreshNow)
 * [Instances](#instances)
    * [instance.refresh()](#instancerefresh)
    * [instance.refreshNow()](#instancerefreshnow)
    * [instance.unmount()](#instanceunmount)
    * [instance.getTree()](#instancegettree)
 * [Virtual DOM nodes](#virtual-dom-nodes)
 * [Reconciliation](#reconciliation)
 * [Event handlers](#event-handlers)
    * [Event delegation](#event-delegation)
    * [oncreate](#oncreate)
    * [onremove](#onremove)
    * [onrefresh *(experimental)*](#onrefresh-experimental)
 * [Components](#components)
    * [Component state](#component-state)
    * [Component events](#component-events)
    * [Component CSS](#component-css)
 * [Bindings](#bindings)
 * [Inline SVGs](#inline-svgs)


### The glasgow module

This is the function obtained by importing glasgow.

```jsx
const glasgow = require('glasgow');
```

Or

```jsx
import glasgow from 'glasgow';
```

#### glasgow(tag, ...args)

Calls to this method are usually generated by the JSX compiler. But you're free to skip JSX entirely and make these calls yourself.

The function returns a virtual DOM node.

- `tag` is either a string containing an HTML element tag (like "div" or "a"), or a component function/class. (See: Components.) When providing a string, there's a shorthand for specifying `className` or `key` attributes: `'div.myClassName.anotherClassName@myKey123'`.
- `args` contains properties and child virtual DOM nodes. Glasgow is pretty flexible in what it excepts.
  - Virtual DOM nodes are added as child nodes.
  - Strings are added as child text nodes.
  - Objects are merged into the attributes of the virtual DOM node. What happens with the attributes depends on the type of node:
    - For component nodes (when `tag` is a function or class), the attributes will be available as `this` to the render function. There is one special attribute: `'key'`. It is used to keep track of nodes across refreshes. (See: Reconciliation.)
    - For HTML nodes (when `tag` is a string), there are some more special rules:
      - When the key is `className`, `value`, `selectedIndex`, `value` or `selectedIndex` or when the value is a boolean, they key/value pair is set on the DOM element as a property. Eg: `element.selectedIndex = 3;`.
      - When the key is `key`, the value is used to keep track of nodes across refreshes. (See: Reconciliation.)
      - When the key is `binding` it is used for creating two-binding on an input element. (see: Bindings.)
      - When the key is `style` and the value is an object, each pair in this object is copied to the element's style property.
      - When the value is a function, it is used as an event handler. (See: Event handlers.)
      - In other cases, the key/value pair is set on the DOM element as an attribute. Eg: `element.setAttribute('href', '/');`.
  - `null` and `undefined` values are ignored.
  - Sub-arrays are flattened.

##### Example

```jsx
function MyLink(children) {
  return glasgow('a', {
    href: 'https://github.com/vanviegen/glasgow',
    target: this.newWindow ? '_blank' : null,
  }, children);
}
  
glasgow('main',
  glasgow('h1', 'Welcome'),
  glasgow(MyLink, {newWindow: true}, 'Fork me here!')
);
```

#### glasgow.mount(domParent, tag, ...args)

Append `glasgow(tag, ...args)` to `domParent`, returning a glasgow instance. (See: Instances.)

- `domParent` is just a DOM element to which a single child will be appended.
- `tag` is a component function/class or an HTLM tag string.
- `args` is an arguments array such as accepted by `glasgow(tag, ...args)`.

##### Examples

```jsx
let instance = glasgow.mount(document.body, MyComponent, {list: [3,5,11], name: "Frank"}, "A child node");
```

```jsx
let instance = glasgow.mount(document.body, function(){
	return <MyComponent list={[3,5,11]} name="Frank">A child node</MyComponent>;
});
```

#### glasgow.setDebug(debug)

Configures the amount of (slow..!) extra checking and logging to perform. `debug` can be:

- `0`: Production mode. Fast, but little error checking.
- `1`: Development mode. Does a lot of extra checking and error logging, which may impact performance significantly. **Default!**
- `2`: Reserved.
- `3`: Verbose mode. Meaning: development mode + console.log all DOM updates.

#### glasgow.fadeIn(...)

This built-it transition can be used as an event handler for `oncreate` events to achieve a grow-and-fade-in effect when an element first appears.

The effect wil only happen when the element's parent already existed *before* this refresh.

See the example in the next section.

#### glasgow.fadeOut(...)

This built-it transition can be used as an event handler for `onremove` events to achieve a shrink-and-fade-out effect when an element disappears from the DOM.

This function returns a Promise, used to tell glasgow when the element can be removed. (See: Event handlers - onremove.)

The effect wil only happen when the element's parent is *not* being removed in this refresh.

```jsx
class List {
	render() {
	    return glasgow('ul',
	        this.$items.sort().map(item => {
		        return glasgow('li', '#'+item, {
		            key: item,
		            oncreate: glasgow.fadeIn,
		            onremove: glasgow.fadeOut,
		            onclick: this.removeItem
		        });
	    	}),
	    	glasgow('input', {
		    	value: 'Add',
		    	type: 'submit',
		    	onclick: this.addItem,
		    })
	    )
	}
	addItem() {
	    this.$items.push(0|Math.random()*10); 
	}
	removeItem({vnode}) {
	    this.$items.splice(this.$items.indexOf(vnode.attrs.key),1);
	}
} 
```

#### glasgow.transition({element, from, to, time, easing, keep})

A helper function to perform DOM transitions.

- `element`: The DOM element to work on.
- `from`: An array of style properties to be set immediately.
- `to`: An array of style properties to be set after a 0ms delay, triggering transition. A special value of `"original"` can be used, to set a property to what is was before `to` was applied.
- `time`: Duration of the transition in ms. Defaults to `400`.
- `easing`: Easing function string. Defaults to `"ease"`. The transition effect is set for all style properties for the duration of the effect.
- `keep`: Unless this value is true, all properties will be restored to their original states when the transition is done.

`transition(..)` returns a Promise that is fulfilled shortly after the transition is ready. When an `onremove` event handler returns a Promise, glasgow will keep the DOM element around until fulfillment.

#### glasgow.refresh()

Does an `instance.refresh()` on all mounted glasgow instances.

#### glasgow.refreshNow()

Does an `instance.refreshNow()` on all mounted glasgow instances.


### Instances

An instance object is returned by `glasgow.mount(..)`. It has these methods:

#### instance.refresh()

Schedules an asynchronous refresh. This happens automatically after handling a glasgow-event. In case data was modified at another time (for instance when arriving from the server), you'll want to call refresh. 

#### instance.refreshNow()

Refresh synchronously.

#### instance.unmount()

Remove the glasgow instance from the DOM, calling any `onremove` handlers.

#### instance.getTree()

Returns the currently rendered virtual DOM tree. (See: Virtual DOM nodes.) This should only be used for debugging. The format may change in minor releases.



### Virtual DOM nodes

There are two types of virtual DOM nodes:

- `VNode` Objects returned by the `glasgow(...)` function.

- Plain old JavaScript strings, which are rendered to DOM `TextNode`s.




### Reconciliation

Reconciliation is the process of trying to match up elements in the new virtual DOM with elements from the old virtual DOM. Glasgow uses some heuristics to try to get this mostly right. Getting this wrong can have multiple nasty consequences:

- UI updates are slower than they could be, because larger parts of the DOM need to be recreated.
- Local component state will be lost when they or any of their ancestors cannot be properly matched.
- User input in for example `input` elements can be lost of it is not synced with global state.
- Even if user input is synced to global state, focus and cursor position may change while the user is typing.

To force glasgow to get matching right, use `key` attributes on components and elements that may jump around (or whose siblings jump around, appear or disappear).

Especially for dynamically updating lists, this is crucial. In this case, you will usually want to use some sort of primary key (say: a user id) as the `key`. Example:

```jsx
function MyListComponent() {
	return <ul>
		{this.list.map(item => <MyItemComponent key={item.id} item={item} />)}
	</ul>
}
```

When a `key` is specified, the element or component will *never* be matched to one that does not have the same key. *Unless* the key value starts with a `'~'` character (tilde). In that case the key is interpreted as only a hint that may be ignored. This can be useful when working with data that does not have (and cannot have) any form of primary key. You can use your *data value* as a `key` in order to still correctly track most changes. Example:

```jsx
function MyListComponent() {
	return <ul>
		{this.list.map(item => <MyItemComponent key={"~"+JSON.stringify(item)} item={item} />)}
	</ul>
}
```

Note that keys are only matched (and thus only need to be unique) *within* a parent. 



### Event handlers

Events can be registered on any HTML virtual DOM node (meaning: *not* on components) using attributes with functions as values. For example:

```jsx
<div onclick={handler}>Click me</div>
```

Event handlers receive arguments like this:

```jsx
function handler(info) { ... }
```

Where..
- `this`: the attributes object of the component containing this DOM element.
- `info`: an object containing...
	- `event`: the DOM event.
	- `element`: the DOM element that received the event.
	- `vnode`: the virtual DOM node for the DOM element that has the event listener set. This object is used internally by glasgow and should **not** be modified. It contains (besides some implementation details you should not depend on)...
		- `tag`: the DOM tag name. (`"div"`)
		- `attrs`: the attributes for the DOM vnode. (`{className: "test", href: "/"}`)

When the event handler returns anything other than `glasgow.NOT_HANDLED`, the event will not propagate further up the tree, and `preventDefault()` will be called on it.

#### Event delegation

As glasgow uses event delegation, `addEventListener` will only be called once per event type, on the root element of the instance.

Because of this, having lots of event handlers in your tree will not require them to be reattached on every refresh, even when you're creating new bindings or new function instances in each refresh.

#### oncreate

`oncreate` is a special case event, as it is not a DOM event. It is fired right after the refresh has performed all required DOM updates, but before returning control back to the browser.

Event handlers receive arguments like this:

```jsx
function createHandler(info) { ... }
```

Where...
- `this`: the attributes object of the component containing this DOM element.
- `info`: an object containing...
	- `event`: an object, containg...
		- `type`: the string `"create"`
		- `parentStable`: a boolean indicating whether the parent DOM element already existed earlier (`true`) or was also just created in this refresh (`false`). This is mostly useful for fade-in transitions and such.
	- `element`: the DOM element that was created.
	- `vnode`: the virtual DOM node for the DOM element that has the event listener set. This object is used internally by glasgow and should **not** be modified. It contains (besides some implementation details you should not depend on)...
		- `tag`: the DOM tag name. (`"div"`)
		- `attrs`: the attributes for the DOM vnode. (`{className: "test", href: "/"}`)

#### onremove

`onremove` is a special case event, as it is not a DOM event. It is fired right before an element is removed from the DOM.

Event handlers receive arguments like this:

```jsx
function removeHandler(info) { ... }
```

Where...
- `this`: the attributes object of the component containing this DOM element.
- `info`: an object containing...
	- `event` object, containg...
		- `type`: the string `"remove"`
		- `parentStable`: a boolean indicating whether the parent element will remain in the DOM (`true`) or will also be removed during this refresh (`false`). This is mostly useful for fade-out transitions and such.
	- `element`: the DOM element that is to be removed, but only when `parentStable == true`. **Otherwise it is null!**
	- `vnode`: the virtual DOM node for the DOM element that has the event listener set. This object is used internally by glasgow and should **not** be modified. It contains (besides some implementation details you should not depend on)...
		- `tag`: the DOM tag name. (`"div"`)
		- `attrs`: the attributes for the DOM vnode. (`{className: "test", href: "/"}`)

When `parentStable == true` and the event handler returns a Promise, the element will be preserved in the DOM until the Promise resolves. This comes in handy for fade-out transitions, and such. (See: Transitions.)


#### onrefresh *(experimental)*

`onrefresh`: a special case event, as it is not a DOM event. It is fired after every refresh, before returning control back to the browser.

Event handlers receive arguments like this:

```jsx
function refreshHandler(info) { ... }
```

Where...
- `this`: the attributes object of the component containing this DOM element.
- `info`: an object containing...
	- `event` object, containing...
		- `type`: the string `"refresh"`
	- `element`: the DOM element.
	- `vnode`: the virtual DOM node for the DOM element that has the event listener set. This object is used internally by glasgow and should **not** be modified. It contains (besides some implementation details you should not depend on)...
		- `tag`: the DOM tag name. (`"div"`)
		- `attrs`: the attributes for the DOM vnode. (`{className: "test", href: "/"}`)

This method is marked **experimental** because I'm considering changing semantics on this in the at some point. Perhaps an `onupdate` event, only firing when changes to the element or its children have been made, would be more useful.


### Components

Components are just JavaScript functions that return a virtual DOM node. They receive `this` and one parameter:

- `this`: an attributes object, based on the JSX attributes (or just the provided attributes object). Attributes that have keys starting with a '$' are component local state variables. They will be copied onto the next refresh if (and only if) all other attrbutes are unchanged.
- `children`: a (possibly empty) array of virtual DOM nodes. In case, as is common, your component doesn't need to display any caller-specified *content HTML*, you can just ignore this. For example, one can imagine a `PageTemplate` component receiving content. But a `Thumbnail` component probably woudn't.

Component names should start with a capital letter, so they can be used with JSX.

```jsx
function Example(children) {
	return glasgow('main',
		glasgow('h1', this.title),
		glasgow('section', children)
	);
}

glasgow.mount(document.body, Example, {title: "Hi!"}, "Content", glasgow("h2", "More content"));
```

Components can also be (ES6) classes. The above can be written as:

```jsx
class Example {
	render(children) {
		return glasgow('main',
			glasgow('h1', this.title),
			glasgow('section', children)
		)
	}
}

glasgow.mount(document.body, Example, {title: "Hi!"}, "Content", glasgow("h2", "More content"));
```

This would allow you to implement the special `start`, `stop` and `css` methods, described below. Component classes can also be convenient for defining helper functions:

```jsx
class HelperExample {
	render(children) {
		return glasgow('ul',
			this.helper(1),
			this.helper(2),
			glasgow('a', 'Click here', {onclick: this.showAlert})
		)
	}
	helper(num) {
		return glasgow('li', `This is helper number ${num}`);
	}
	showAlert() {
		alert('You clicked!')
	}
}

glasgow.mount(document.body, HelperExample);
```


#### Component state

State variables (keys starting with a '$') can be (but do not need to) specified as attributes by the caller like any other attribute. The difference with other attributes, is that when you change their value (for instance from within a component function, an event handler or using a binding), glasgow tries to preserve their value across refreshes. For example:

```jsx
function RefreshCounter() {
  if (!this.$counter) this.$counter = 1;
  return (this.$counter++).toString();
}
```
This example increments the number shown every time glasgow refreshes the UI. Of course, this kind-of breaks the one-way flow of information that makes reactive functional UI programming so easy to reason about. A rule of thumb is that you should only use local state for augmenting the information you received by means of regular `this` attributes. For example, one can load additional information (say the last-online-time for `this.userId`) from a server and store it as `this.$lastOnline`.

But how does glasgow distinguish cases where it should preserve state, from cases where a component generated in a refresh is actually ment to operate on different data?

- The first step is that glasgow must be able to match the component and all its ancestor elements and components to their versions in the previous refresh. It does this by matching tags and components based on their position within the parent, or based on keys when available. (This matching is not only done for preserving state, but is also crucial in preventing having to redraw the entire interface on every refresh.) If you're loosing state when elements are moving around in your user interface, it may help to add some keys to the moving elements and components.

- But even after matching a component with a component of the same type from the previous refresh, state will not always be preserved. This will only happen when all of the `this` attributes (except the '$' state variables themselves) are *identical*. An attribute referring to a different object (or array) instance is *not* considered identical, even if it has the same content.

When it is determined that state can be preserved safely, the state variables are copied to the new refresh's tree. This allows you to do things like this, without refreshes that may occur during the fetch causing problems:

```jsx
function Fetcher() {
  if (!this.$initialized) {
  	$this.$initialized = true;
    fetch(this.url)
      .then(resp => resp.text())
      .then(text => {
	      this.$data = text;
	      glasgow.refresh();
	  });
  }
  return this.$data==null ? <em>Loading...</em> : this.$data;
}
```

While the above works, making sure you don't initiate another `fetch` on every refresh can be tiresome and error prone. Component events provide a cleaner solution:


#### Component events

There are cases where you'll want to initialize a component instance when it is first created -- some logic you *don't* want to run on every refresh. Fetching data from the server, for instance. For that a `start` function can be defined *on the component*. An example, using an `async` `start` function:

```JSX
class FollowerCount {
	async start() {
		// This method will start before `render()`
		let rsp = await fetch("https://api.github.com/users/vanviegen");
		// During the `await` our `render()` method will get executed.
		this.$data = await rsp.json();
		// We need to signal Glasgow that data has been updated:
		glasgow.refresh();
	}
	render() {
		if (!this.$data) return glasgow("em", "Loading...");
		return this.$data.followers + ' followers!';
	}
};

glasgow.mount(document.body, FollowerCount);
```

You may also define a `stop` function, in case some teardown needs to be done. For instance, if the `start` function initiated streaming live data over WebSocket, this would be an appropriate place to stop the streaming. Like `start`, the `stop` function receives the component attributes object as its only argument.


#### Component CSS

In order to keep everything about a component together in one file (and to prevent having to load separate CSS files for each component), a stylesheet for a component can be given as a JavaScript object. Keys of the object will be used as CSS style property names, for which the value is set on the root element(s) of the component. In case the value is itself an object, the key will be interpreted as a selector. The selector will be prefixed by a selector that matches the root element(s) of the component.

```JSX

// Create a simple component
class MyComponent {
	render() {
		return glasgow('div',
			glasgow('span', 'a'),
			glasgow('span', 'b')
		);
	}
	
	css() { // Attach a stylesheet
		return {
			// Set the background-color of the root element (the div)
			backgroundColor: 'blue',
			// Match the first child of the root element
			'> :first-child': {
				color: 'red'
			}
		}
	}
}
```

This results in something like the following CSS being added to the DOM:

```CSS
.GaGo1 {
	background-color: blue;
}

.GaGo1 > :first-child {
	color: red;
}
```

Where `GaGo1` is a generated unique class name that is added to the root elemenent(s) of all component instances.


### Bindings

Bindings are a shortcut for setting an `oninput` event handler and a initial value on an HTML `input` (or `textarea`, or `select`) element. This creates a two-way binding between the application data and the UI view.

To bind an input to the `state.example` local state attributes, one would use:

```jsx
<input binding="$example" />
```

Without the use of the binding attribute, you'd have to write something like this:

```jsx
<input value={this.$example} oninput={{element} => this.$example = element.value} />
```

In many cases, it would be desirable to directly alter authoritative data. When this data is referred to by component attributes, we can bind to it by using a path array:

```jsx
function UserNameEditor() {
  // This binds the input to this.users[this.userId]
  return <input binding={["users",this.userId]} />
}
// And here's how you would use this component:
let users = {1: "Frank"};
let node = <UserNameEditor users={users}, userId={1} />;
```

Without the use of JSX, the above code looks like this:

```jsx
function UserNameEditor() {
  // This binds the input to this.users[this.userId]
  return gg('input', {binding: ["users",this.userId]});
}
// And here's how you would use this component:
let users = {1: "Frank"};
let node = gg(UserNameEditor, {users, userId: 1});
```

When `binding` is a string, it is automatically converted to a path array by splitting it on dots (`binding.split('.')`). This allows you to write things like `<input binding="dataStore.users.123">`.

It is also possible to bind to state that is not (indirectly) referred to by the components attributes. Just pass an array or object as the first element of the binding array. Like this:

```jsx
let list = ['a', 'b', 'c'];
function ListItem() {
	return <input binding={[list, this.itemIndex]} />
}
glasgow.mount(document.body, ListItem, {list, itemIndex: 2});
```


### Inline SVGs

When the "svg" tag is used, the element and all of its children will be created within the SVG namespace. This allows you to embed SVGs without ceremony:

```jsx
function MyIcon() {
	return <div class="icon">
		<svg onclick={alert} viewBox="0 0 16 16">
			<path fill="currentColor" d="...." />
		</svg>
	</div>;
}
```


## Changelog

Breaking and important changes in major revisions.

v0.9:
- Changed argument order of event handlers -- this break just about all existing code!
- Revert to '$' prefix for marking state variables -- the breaks whatever the above didn't break!
- `this` now refers to the component attributes in render/start/stop functions as well as event handlers.
- Component attributes now have the component object as their prototypes, allowing for easier use of named event handlers without binding.
- Components can now be functions, objects containing a `render` function or ES6 classes with a `render` method.

v0.8:
- Remove `refreshify` and `fetch` utility functions. They turned out not to be very useful and a bit confusing.
- Added `start` and `stop` [component life cycle events](#component-events).

v0.7:
- It's now possible to attach stylesheets to components. See [Component CSS](#component-css).
- The attributes object and the children can now be in any order as arguments to `glasgow(tag, ...attributesObjectAndChildren)`.

v0.6:
- The `on` prefix is now mandatory for event handlers. So you must now use `onclick` instead of just `click`.
- When passing a boolean as the value for a DOM node attribute, it will now be treated as a property. This does the right thing for `autoplay`, `muted`, `loop`, etc. Setting an attribute to a boolean value doesn't ever make sense, does it?
- Use capturing for addEventListener, allowing us to support propagation of non-bubbling events. This may break things if you're setting up your own event handlers on Glasgow-managed elements.

v0.5:
- Virtual DOM node attributes are now cleanly separated from internal Glasgow properties (`_t`, `_a`, etc). This *should* not break anything, and possibly fix some thingsr, unless you're relying on exposed internals.
- Tag names now support shorthands for `#myClassName` and `@myKey`. Unless you were using `#` or `@` in HTLM tag names, you're probably fine. :-)

