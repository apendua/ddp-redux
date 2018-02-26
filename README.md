# ddp

[![Build Status][travis-svg]][travis-url]

`ddp-redux` is a brand new ddp client that will allow you to fetch resources from your ddp server
in a completely declarative way. Subscriptions/ methods (queries) parameters are evaluated by
selectors and all you need to do is to extract collection data from the redux store.
This approach was highly inspired by [apollo-client][apollo-client-url], but the DDP protocol
is the first class citizen in our case.

An example is worth a thousand words
```javascript
import ddp from 'ddp-connector';

const TodoList = ddp({
  subscriptions: (state, props) => [{
    name: 'api.collections.TodoLists.details',
    params: [{
      listId: props.listId,
    }],
  }, {
    name: 'api.collections.Todos.all',
    params: [{
      listId: props.listId,
    }],
  }],
  selectors: ({ from, prop }) => ({
    todoList: from('TodoLists').select.one('listId'),
    todos: from('Todos').select.where(
      createSelector(
        prop('listId'),
        listId => todo => todo.listId === listId,
      ),
    ),
  }),
})(({ todoList, todos }) => (
  <div>
    <h1>{todoList.name}</h1>
    <ul>
      {todos.map(todo => (<li key={todo._id}>{todo.title}</li>))}
    </ul>
  </div>
))
```
Most typical DDP "commands" are accessible by simply dispatching a redux action, e.g.
```javascript
import { callMethod } from 'ddp-redux';

// ...

store.dispatch(
  callMethod(
    'myTestMethod',
    param1,
    param2,
    param3,
  ))
  .then(/* ... */)
  .catch(/* ... */)
);
```

## Disclaimer

The project is still in a pretty early stage and it does not have proper documentation yet,
as some parts of the api are very likely to change, e.g. documents selectors.

## Running example app

Assuming yoy have `tmux@2.x` installed you only need to run
```
cd example
./start.sh
```
If you want to play with the code and need to ensure that the libraries
are rebuilding automatically use
```
./start-develop.sh
```

## Installation

```
npm install --save ddp-redux ddp-connector
```
If you don't have them already please install the following peer dependencies
```
npm install --save react redux react-redux
```

## Minimal configuration

```javascript
import { createStore, combineReducers, applyMiddleware } from 'redux';
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import DDPClient from 'ddp-redux';

const ddpClient = new DDPClient({
  endpoint: 'ws://localhost:3000/websocket',
  SocketConstructor: WebSocket,
});

const reducer = combineReducers({
  ddp: DDPClient.reducer(),
});

const store = createStore(
  reducer,
  {},
  applyMiddleware(
    ddpClient.middleware(),
  ),
);

ReactDOM.render(
  <Provider store={store}>
    // ...
  </Provider>
  document.getElementById('root'),
);
```

## Features

- [x] Supports Meteor standard authentication methods
- [x] Meteor subscriptions
- [x] Fetch data via meteor methods
- [x] Aggregate data from multiple ddp connections
- [x] Basic support for optimistic updates
- [ ] Sync local ids generator with server
- [ ] Out-of-the-box support for client-side joins
- [ ] Offline first

[travis-svg]: https://travis-ci.org/apendua/ddp-redux.svg?branch=develop
[travis-url]: https://travis-ci.org/apendua/ddp-redux
[apollo-client-url]: https://github.com/apollographql/apollo-client