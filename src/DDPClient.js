import shallowEqual from 'shallowequal';
import mapValues from 'lodash.mapvalues';
import DDPSocket from './DDPSocket';
import DDPEmitter from './DDPEmitter';

import {
  DEFAULT_SOCKET_ID,
} from './constants';

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
    this.defaultEndpoint = endpoint;
  }

  send(msg, { socketId = DEFAULT_SOCKET_ID } = {}) {
    const socket = this.sockets[socketId];
    if (socket) {
      socket.send(msg);
    }
  }

  open(endpoint, { socketId = DEFAULT_SOCKET_ID } = {}) {
    if (this.sockets[socketId]) {
      throw new Error('Already opened, you need to close connection first.');
    }
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
      this.emit('open', { socketId });
    });
    socket.on('close', () => {
      this.emit('close', { socketId });
      setTimeout(() => {
        if (!this.sockets[socketId]) {
          // NOTE: This means, socket was not closed intentionally, so we try to reconnect after 10 seconds.
          //       Before we do it, we need to delete it, because otherwise a "duplicate" error will be thrown.
          delete this.sockets[socketId];
          this.open(endpoint, socketId);
        }
      }, 10000);
    });
    socket.open(endpoint);
    return socketId;
  }

  close({ socketId = DEFAULT_SOCKET_ID } = {}) {
    const socket = this.sockets[socketId];
    if (socket) {
      delete this.sockets[socketId];
      socket.close();
    }
  }

  getFlushTimeout() {
    return this.constructor.getFlushTimeout();
  }

  getQueryCleanupTimeout() {
    return this.constructor.getQueryCleanupTimeout();
  }

  getSubscriptionCleanupTimeout() {
    return this.constructor.getSubscriptionCleanupTimeout();
  }

  nextUniqueId() {
    this.counter += 1;
    return this.counter.toString();
  }

  middleware() {
    const middlewares = [
      'connection',
      'messages',
      'collections',
      'methods',
      'queries',
      'subscriptions',
    ].map(name => modules[name].createMiddleware(this));
    return (store) => {
      const chain = middlewares.map(middleware => middleware(store));
      return chain.reduce((a, b) => next => a(b(next)));
    };
  }

  extractEntities(result, options) {
    return this.constructor.defaultExtractEntities(result, options);
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

  static defaultExtractEntities(result) {
    return result.entities;
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
