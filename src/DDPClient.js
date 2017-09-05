import shallowEqual from 'shallowequal';
import mapValues from 'lodash.mapvalues';
import DDPSocket from './DDPSocket';
import DDPEmitter from './DDPEmitter';

import * as collections from './modules/collections';
import * as connection from './modules/connection';
import * as messages from './modules/messages';
import * as methods from './modules/methods';
import * as queries from './modules/queries';
import * as subscriptions from './modules/subscriptions';

const modules = {
  messages,
  collections,
  connection,
  methods,
  queries,
  subscriptions,
};

class DDPClient extends DDPEmitter {
  constructor({
    endpoint,
    SocketConstructor,
  } = {}) {
    super();
    this.SocketConstructor = SocketConstructor;
    this.sockets = {};
    this.counter = 0;

    if (endpoint) {
      this.open(endpoint);
    }
  }

  send(msg, {
    socketId = this.defaultSocketId,
  } = {}) {
    const socket = this.sockets[socketId];
    if (socket) {
      socket.send(msg);
    }
  }

  open(endpoint, socketId = this.nextUniqueId()) {
    const socket = new DDPSocket({
      SocketConstructor: this.SocketConstructor,
    });
    this.sockets[socketId] = socket;
    socket.on('message', (msg) => {
      this.emit('message', msg, {
        socketId,
      });
    });
    socket.on('open', () => {
      this.emit('open', socketId);
    });
    socket.on('close', () => {
      this.emit('close', socketId);
      setTimeout(() => {
        this.open(endpoint, socketId);
      }, 10000);
    });
    socket.open(endpoint);
    if (!this.defaultSocketId) {
      this.defaultSocketId = socketId;
    }
    return socketId;
  }

  close(socketId = this.defaultSocketId) {
    const socket = this.sockets[socketId];
    if (socket) {
      delete this.sockets[socketId];
      if (socketId === this.defaultSocketId) {
        delete this.defaultSocketId;
      }
      socket.close();
    }
  }

  getDefaultSocketId() {
    return this.defaultSocketId;
  }

  getFlushTimeout() {
    return this.constructor.getFlushTimeout();
  }

  getQueryCleanupTimeout() {
    return this.constructor.getQueryCleanupTimeout();
  }

  getSubscriptionCleanupTimeout() {
    return this.constructor.geSubscriptionCleanupTimeout();
  }

  nextUniqueId() {
    this.counter += 1;
    return this.counter.toString();
  }

  middleware() {
    const middlewares = [
      'messages',
      'collections',
      'connection',
      'methods',
      'queries',
      'subscriptions',
    ].map(name => modules[name].createMiddleware(this));
    return (store) => {
      const chain = middlewares.map(middleware => middleware(store));
      return chain.reduce((a, b) => next => a(b(next)));
    };
  }

  static reducer() {
    const reducers = mapValues(modules, module => module.createReducer(this));
    return (state = {}, action) => {
      const newState = mapValues(reducers, (reducer, key) => reducer(state[key], action));
      if (shallowEqual(newState, state)) {
        return state;
      }
      return newState;
    };
  }

  static registerModel(Model, collection) {
    this.models[collection] = Model;
  }

  static getFlushTimeout() {
    return this.defaultFlushTimeout();
  }

  static getQueryCleanupTimeout() {
    return this.defaultQueryCleanupTimeout;
  }

  static getSubscriptionCleanupTimeout() {
    return this.defaultSubscriptionCleanupTimeout;
  }
}

DDPClient.models = {};
DDPClient.UnknownModel = class UnknownModel {
  constructor(doc) {
    Object.assign(this, doc);
  }
};

DDPClient.defaultFlushTimeout = 200;
DDPClient.defaultQueryCleanupTimeout = 30000;
DDPClient.defaultSubscriptionCleanupTimeout = 30000;

export default DDPClient;
