import shallowEqual from 'shallowequal';
import mapValues from 'lodash.mapvalues';
import DDPSocket from './DDPSocket';
import DDPEmitter from './DDPEmitter';

import * as collections from './modules/collections';
import * as connection from './modules/connection';
import * as messages from './modules/messages';
import * as methods from './modules/methods';
import * as mutations from './modules/mutations';
import * as queries from './modules/queries';
import * as subscriptions from './modules/subscriptions';

const modules = {
  messages,
  collections,
  connection,
  methods,
  mutations,
  queries,
  subscriptions,
};

class DDPClient extends DDPEmitter {
  constructor({
    endpoint,
    SocketConstructor,
  }) {
    super();

    this.socket = new DDPSocket({
      SocketConstructor,
    });
    this.socket.open(endpoint);
    this.counter = 0;
  }

  nextUniqueId() {
    this.counter += 1;
    return this.counter.toString();
  }

  middleware() {
    const middlewares = [
      'collections',
      'connection',
      'methods',
      'mutations',
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
}

DDPClient.models = {};
DDPClient.UnknownModel = class UnknownModel {
  constructor(doc) {
    Object.assign(this, doc);
  }
};

export default DDPClient;
