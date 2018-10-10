Glasgow
-------

An easy-to-use JavaScript library for building user interfaces in a *functional reactive* way, using JSX.

* [Why glasgow](#why-glasgow)
* [Example usage](#example-usage)
* [Installation](#installation)
* [Reference manual](#reference-manual)


## Why Glasgow?

#### Reasons to use Glasgow:

- *Easy* to learn -- there are not many concepts to understand.

- *Easy* state mangement -- you can store state anywhere you like. There's no `setState`. The UI will refresh automatically after handling events, or when you tell it to. Component-local state is supported as well, and is just as easy.

- *Easy* event handling.
  - Function binding is usually not required, as handlers will be provided with relevant context by default.
  - Event delegation, meaning performance won't suffer much if you *do* need to bind or create new function instances on each refresh.
  - Two-way bindings, when you want it.

- *Tiny*. Less than 3kb minified and gzipped. Built from a single source file that is small enough to read. No dependencies.

- *Fast* enough. Rendering seems [about as fast as React](https://www.vanviegen.net/glasgow/benchmark.html). Startup is a lot speedier.

#### Reasons not to use Glasgow:

- It's experimental. You probably shouldn't build your business around this.

- Only the basics. No routers, no server-side rendering, no ready-to-use components.

- No community. Probably not a lot of support from me either.

- If you want to use JSX, you need to transpile your source code.


## Example usage

```jsx
// First we'll instruct the JSX compiler to generate `glasgow(..)` calls:
/** @jsx glasgow */


// I'm using global state here for the list. We could have also chosen to pass
// the state down the chain, but I want to stress the point that nothing
// special is going on here.
let list = [];


// This is the component for a single ToDo-item. Components are just functions.
// A component gets a (JSX) attributes object and an array of children (which
// we're ignoring here).
function Item(props, children) {
  return <li>
    <div class="text">{props.key}</div>
    <div class="delete" onclick={deleteItem}>x</div>
  </li>;
}

// This the onclick handler for the delete-button. Notice how we didn't need to
// bind the function, as `info` provides us access to the component's `props`,
// among other things.
function deleteItem(info) {
  // We're just modifying regular JavaScript variables here. Glasgow will 
  // refresh the UI after we return from the event handler.
  list.splice(list.indexOf(info.context.item), 1);
}


// This is our main component.
function ToDo(props, children) {
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
  // `props.$newItem`. (See: Bindings.)
  // The $-sign indicates that this is a state-variable, which means that its
  // value is kept when redrawing. (See: Component state.)
}

function addItem(info) {
  list.push(info.props.$newItem);
  info.props.$newItem = "";
}


// And this is where we add the ToDo component to the DOM. Presto!
tearea.mount(document.body, ToDo);
```


## Installation

Apart from installing and importing this library, you'll need to setup *babel* to transpile JSX to plain JavaScript. Sorry, no detailed instructions yet.



## Reference manual

 * [The glasgow module](#the-glasgow-module)
    * [glasgow(tag, props, ..children)](#glasgowtag-props-children)
       * [Example](#example)
    * [glasgow.mount(domParent, component)](#glasgowmountdomparent-component)
       * [Examples](#examples)
    * [glasgow.setDebug(debug)](#glasgowsetdebugdebug)
    * [glasgow.fadeIn(props, {element, parentStable})](#glasgowfadeinprops-element-parentstable)
    * [glasgow.fadeOut(props, {element, parentStable})](#glasgowfadeoutprops-element-parentstable)
    * [glasgow.transition({element, from, to, time, easing, keep})](#glasgowtransitionelement-from-to-time-easing-keep)
    * [Proxy functions to the current instance](#proxy-functions-to-the-current-instance)
 * [Instances](#instances)
    * [instance.refresh()](#instancerefresh)
    * [instance.refreshNow()](#instancerefreshnow)
    * [instance.refreshify(func)](#instancerefreshifyfunc)
    * [instance.fetch(...)](#instancefetch)
    * [instance.unmount()](#instanceunmount)
    * [instance.getTree()](#instancegettree)
 * [Reconciliation](#reconciliation)
 * [Event handlers](#event-handlers)
    * [Event delegation](#event-delegation)
    * [oncreate <em>(experimental)</em>](#oncreate-experimental)
    * [onremove <em>(experimental)</em>](#onremove-experimental)
    * [onrefresh](#onrefresh)
 * [Virtual DOM nodes](#virtual-dom-nodes)
 * [Components](#components)
    * [Component state](#component-state)
 * [Bindings <em>(experimental)</em>](#bindings-experimental)


### The glasgow module

This is the function obtained by importing glasgow.

```jsx
const glasgow = require('glasgow');
```

Or

```jsx
import glasgow from 'glasgow';
```

#### glasgow(tag, props, ..children)

Calls to this method are usually generated by the JSX compiler. But you're free to skip JSX entirely and make these calls yourself.

The function returns a virtual DOM node.

- `tag` is either a string containing an HTML element tag (like "div" or "a"), or a function, which will be used as a component. (See: Components.)

- `props` is an optional JavaScript object containing HTML attributes. Some special cases:
  - `className`, `checked`, `value` and `selectedIndex` are DOM properties instead of HTML attributes. `null` values are ignored.
  - `style` can receive a style properties object instead of a style string.
  - Attributes starting with `on` are assumed to be event handlers. (See: Event handlers.)
  - `key`, `binding` and attributes starting with `_` are not set as HTML attributes.
  
  Of course, when `tag` is a function, none of this applies, and the `props` are just passed as the first argument to this component function.

- `children` is an optional array of (arrays of) virtual DOM nodes. `null` values are ignored.

##### Example

```jsx
function MyLink(props, children) {
  return glasgow('a', {
    href: 'https://github.com/vanviegen/glasgow',
    target: props.newWindow ? '_blank' : null,
  }, children);
}
  
glasgow('main', {},
  glasgow('h1', {}, 'Welcome'),
  glasgow(MyLink, {newWindow: true}, 'Fork me here!')
);
```

#### glasgow.mount(domParent, component)

Mount the component to the DOM, returning a glasgow instance. (See: Instances.)

- `domParent` is just a DOM element to which a single child will be appended.
- `component` is either a component function, or a virtual DOM.

##### Examples

```jsx
let instance = glasgow.mount(document.body, MyComponent);
```

```jsx
let instance = glasgow.mount(document.body, <MyComponent foo={bar} />);
```

#### glasgow.setDebug(debug)

Configures the amount of (slow..!) extra checking and logging to perform. `debug` can be:

- `0`: Production mode. Fast, but little error checking.
- `1`: Development mode. Does a lot of extra checking and error logging, which may impact performance significantly. **Default!**
- `2`: Reserved.
- `3`: Verbose mode. Meaning: development mode + console.log all DOM updates.

#### glasgow.fadeIn(props, {element, parentStable})

This built-it transition can be used as an event handler for `oncreate` events to achieve a grow-and-fade-in effect when an element first appears.

The effect wil only happen when the element's parent already existed *before* this refresh.

See the example in the next section.

#### glasgow.fadeOut(props, {element, parentStable})

This built-it transition can be used as an event handler for `onremove` events to achieve a shrink-and-fade-out effect when an element disappears from the DOM.

This function returns a Promise, used to tell glasgow when the element can be removed. (See: Event handlers - onremove.)

The effect wil only happen when the element's parent is *not* being removed in this refresh.

```jsx
let list = [];
function addItem() {
	list.push(0|Math.random()*10);
	list.sort();
}

function List() {
	return <ul>
		{list.map((item,index) => <li
			key={item}
			oncreate={glasgow.fadeIn}
			onremove={glasgow.fadeOut}
			onclick={props => list.splice(index,1)}
		>{"#"+item}</li>)}
		<input type='submit' onclick={addItem} value="Add" />
	</ul>
}

glasgow.mount(document.body, List);
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

#### Proxy functions to the current instance

As a convenience, all functions of the glasgow instance currently refreshing or handling an event, are available on `glasgow` as well. So one could call `glasgow.unmount()` from an event handler, for instance.



### Instances

An instance object is returned by `glasgow.mount(..)`. It has these methods:

#### instance.refresh()

Schedules an asynchronous refresh. This happens automatically after handling a glasgow-event. In case data was modified at another time (for instance when arriving from the server), you'll want to call refresh. 

#### instance.refreshNow()

Refresh synchronously.

#### instance.refreshify(func)

Just a little utility that returns a function wrapping `func`. It will make sure `refresh()` gets called after every function invocation. And in case `func` returns a Promise, it'll fire again when the Promise is fulfilled. 

#### instance.fetch(...)

Just a convenient `refreshify(window.fetch)`. If you need to polyfill the `fetch` API (you're support Internet Explorer), make sure the polyfill is loaded before you `mount`.

#### instance.unmount()

Remove the glasgow instance from the DOM, calling any `onremove` handlers.

#### instance.getTree()

Returns the currently rendered virtual DOM tree. (See: Virtual DOM nodes.) This should only be used for debugging. The format may change in minor releases.



### Reconciliation

Reconciliation is the process of trying to match up elements in the new virtual DOM with elements from the old virtual DOM. Glasgow uses some heuristics to try to get this mostly right. Getting this wrong can have multiple nasty consequences:

- UI updates are slower than they could be, because larger parts of the DOM need to be recreated.
- Local component state will be lost when they or any of their ancestors cannot be properly matched.
- User input in for example `input` elements can be lost of it is not synced with global state.
- Even if user input is synced to global state, focus and cursor position may change while the user is typing.

To force glasgow to get matching right, use `key` properties on components and elements that may jump around (or whose siblings jump around, appear or disappear).

Especially for dynamically updating lists, this is crucial. In this case, you will usually want to use some sort of primary key (say: a user id) as the `key`. Example:

```jsx
function MyListComponent(props) {
	return <ul>
		{props.list.map(item => <MyItemComponent key={item.id} item={item} />)}
	</ul>
}
```

When a `key` is specified, the element or component will *never* be matched to one that does not have the same key. *Unless* the key value starts with a `'~'` character (tilde). In that case the key is interpreted as only a hint that may be ignored. This can be useful when working with data that does not have (and cannot have) any form of primary key. You can use your *data value* as a `key` in order to still correctly track most changes. Example:

```jsx
function MyListComponent(props) {
	return <ul>
		{props.list.map(item => <MyItemComponent key={"~"+JSON.stringify(item)} item={item} />)}
	</ul>
}
```

Note that keys are only matched (and thus only need to be unique) *within* a parent. 



### Event handlers

Events can be registered on any HTML virtual DOM node (meaning: *not* on components) using `on...` attributes with functions as values. For example:

```jsx
<div onclick={handler}>Click me</div>
```

Event handlers receive arguments like this:

```jsx
function handler(props, {event, element, node}) { ... }
```

Where..
- `props` is the properties object of the component containing this DOM element.
- `event` is the DOM event.
- `element` is the DOM element that received the event.
- `node` is the virtual DOM node (containing the attributes) for the DOM element that received the event.

When the event handler returns anything other than `glasgow.NOT_HANDLED`, the event will not propagate further up the tree, and `preventDefault()` will be called on it.

#### Event delegation

As glasgow uses event delegation, `addEventListener` will only be called once per event type, on the root element of the instance.

Because of this, having lots of event handlers in your tree will not require them to be reattached on every refresh, even when you're creating new bindings or new function instances in each refresh.

#### oncreate *(experimental)*

`oncreate` is a special case event, as it is not a DOM event. It is fired right after the refresh has performed all required DOM updates, but before returning control back to the browser.

Event handlers receive arguments like this:

```jsx
function createHandler(props, {element, node, parentStable}) { ... }
```

Where...
- `props` is the properties object of the component containing this DOM element.
- `element` is the DOM element that was created.
- `node` is the virtual DOM node (containing the attributes) for the new DOM element.
- `parentStable` is a boolean indicating whether the parent DOM element already existed earlier (`true`) or was also just created in this refresh (`false`). This is mostly useful for fade-in transitions and such.

This method is marked **experimental** because I'm considering changing semantics on this in the at some point.

#### onremove *(experimental)*

`onremove` is a special case event, as it is not a DOM event. It is fired right before an element is removed from the DOM.

Event handlers receive arguments like this:

```jsx
function removeHandler(props, {node, parentStable, element}) { ... }
```

Where...
- `props` is the properties object of the component containing this DOM element.
- `node` is the virtual DOM node (containing the attributes) for the to-be-removed DOM element.
- `parentStable` is a boolean indicating whether the parent element will remain in the DOM (`true`) or will also be removed during this refresh (`false`). This is mostly useful for fade-out transitions and such.
- `element` is the DOM element that is to be removed, but only when `parentStable == true`. **Otherwise it is null!**

When `parentStable == true` and the event handler returns a Promise, the element will be preserved in the DOM until the Promise resolves. This comes in handy for fade-out transitions, and such. (See: Transitions.)


This method is marked **experimental** because I'm considering changing semantics on this in the at some point.

#### onrefresh

`onrefresh` is a special case event, as it is not a DOM event. It is fired after every refresh, before returning control back to the browser.

Event handlers receive arguments like this:

```jsx
function refreshHandler(props, {node, element}) { ... }
```

Where...
- `element` is the DOM element.
- `node` is the virtual DOM node (containing the attributes) for the DOM element.
- `props` is the properties object of the component containing this DOM element.

This method is marked **experimental** because I'm considering changing semantics on this in the at some point. Perhaps an `onupdate` event, only firing when changes to the element or its children have been made, would be more useful.



### Virtual DOM nodes

There are two types of virtual DOM nodes:

- Objects returned by the `glasgow(...)` function. These are in fact just the properties objects, augmented with some underscore-prefixed keys that are implementation details to glasgow. You'll find keys like `_t` for tag, `_c` for children, and `_a` for the materialized tree of a component. You should not rely on these, as their semantics may change in minor releases.

- Plain old JavaScript strings, which are rendered to DOM `TextNode`s.



### Components

Components are just JavaScript functions that return a virtual DOM node. They receive two arguments:

- `props`: a properties object, based on the JSX attributes. There are two special cases of properties, their keys starting with..
  - `$`: these are state variables. (See: Component state.)
  - `_`: these are glasgow internals (such as `_t` for the tag and `_c` for children). You shouldn't rely on these, as their semantics may change in minor releases.
- `children`: a (possibly empty) array of virtual DOM nodes. In case, as is common, your component doesn't need to display any caller-specified *content HTML*, you can just ignore this. For example, one can imagine a `PageTemplate` component receiving content. But a `Thumbnail` component probably woudn't.

#### Component state

State variables can be (but do not need to) specified as attributes by the caller like any other property. The difference with other properties, is that when you change their value (for instance from within a component function, a event handler or using a binding), glasgow tries to preserve their value across refreshes. For example:

```jsx
function RefreshCounter(props) {
  if (!props.$count) props.$count = 1;
  return (props.$count++).toString();
}
```
This example increments the number shown every time glasgow refreshes the UI. Of course, this kind-of breaks the one-way flow of information that makes reactive functional UI programming so easy to reason about. A rule of thumb is that you should only use local state for augmenting the information you received by means of regular `props`. For example, one can load additional information (say the last-online-time for `props.userId`) from a server and store it as `props.$lastOnline`.

But how does glasgow distinguish cases where it should preserve state, from cases where a component generated in a refresh is actually ment to operate on different data?

- The first step is that glasgow must be able to match the component and all its ancestor elements and components to their versions in the previous refresh. It does this by matching tags and components based on their position within the parent, or based on keys when available. (This matching is not only done for preserving state, but is also crucial in preventing having to redraw the entire interface on every refresh.) If you're loosing state when elements are moving around in your user interface, it may help to add some keys to the moving elements and components.

- But even after matching a component with a component of the same type from the previous refresh, state will not always be preserved. This will only happen when all of the `props` (except those starting with `$` or `_`) are *exactly* identical. A property referring to a different object (or array) instance does *not* count as identical, even if it has the same content.

When it is determined that state can be preserved safely, the old `props` object is moved into the new refresh's tree. This allows you to do things like this, without refreshes that may occur during the fetch causing problems:

```jsx
function Fetcher(props) {
  if (!props.$fetching) {
    props.$fetching = true;
    glasgow.fetch(props.url)
      .then(resp => resp.text())
      .then(text => props.$data = text);
  }
  return props.$data==null ? <em>Loading...</em> : props.$data;
}
```



### Bindings *(experimental)*

Bindings are a shortcut for setting an `oninput` event handler and a initial value on an HTML `input` (or `textarea`, or `select`) element. This creates a two-way binding between the application data and the UI view.

To bind an input to the `$example` local state property, one would use:

```jsx
<input binding="$example" />
```

In many cases, it would be desirable to directly alter higher level state. When this state is referred to by component properties, we can bind to it by using a path array:

```jsx
function UserNameEditor(props) {
  // This binds the input to props.users[props.userId]
  return <input binding={["users",props.userId]} />
}
// And here's how you would use this component:
let users = {1: "Frank"};
let node = <UserNameEditor users={users}, userId={1} />;
```

It is also possible to bind to state that is not (indirectly) referred to by the components properties. Just give you state array or objects as the first element in the binding array. Like this:

```jsx
let list = [];
function ListItem(props) {
	return <input binding={[list, props.itemId]} />
}
```

Bindings support should be considered **experimental**, as not all input types are supported yet. At least `textarea` and `input` types `text`, `password`, `checkbox` and `number` *do* work. Feel free to file bugs (or pull requests!) for other types if you need them.


