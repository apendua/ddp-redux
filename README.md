# ddp

An example is worth a thousand words
```javascript
import ddp from 'ddp-connector';

const getListId = (state, props) => props.listId;

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
  selectors: ({ collection }) => ({
    todoList: collection('TodoLists').selectOne(getListId),
    todos: collection('Todos').find(
      createSelector(
        getListId,
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

## Running example app

Assuming yoy have `tmux@2.x` installed you only need to run
```
cd example
./start.sh
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
