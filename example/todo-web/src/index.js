import DDPClient from 'ddp-client';
import React from 'react';
import ReactDOM from 'react-dom';
import App from './containers/App';
import Todo from './common/models/Todo';
import TodoList from './common/models/TodoList';
import './index.css';

// const ddpClient = new DDPClient({
//   endpoint: 'ws://localhost:4000/websocket',
//   SocketConstructor: WebSocket,
//   debug: true,
// });

const ddpClient = {};

// [
//   Todo,
//   TodoList,
// ].forEach(M => DDPClient.registerModel(M, M.collection));

ReactDOM.render(
  <App ddpClient={ddpClient}/>,
  document.getElementById('root')
);
