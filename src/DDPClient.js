import omit from 'lodash.omit';
import find from 'lodash.find';
import mapValues from 'lodash.mapvalues';
import DDPSocket from './DDPSocket';
import EJSON from './ejson';
import mutateCollections from './utils';

const DDP_VERSION = '1';

class DDPClient {
  constructor({
    endpoint,
    SocketConstructor,
  }) {
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
    return (store) => {
      let pending = [];
      this.socket.on('open', () => {
        store.dispatch({
          type: '@DDP/OUT/connect',
          payload: {
            msg: 'connect',
            version: DDP_VERSION,
            support: [DDP_VERSION],
          },
        });
      });
      this.socket.on('message', (msg) => {
        if (!msg.msg) {
          return;
        }
        store.dispatch({
          type: `@DDP/IN/${msg.msg.toUpperCase()}`,
          payload: msg,
        });
      });
      return next => (action) => {
        if (!action || typeof action !== 'object') {
          return next(action);
        }
        switch (action.type) {
          case '@DDP/IN/PING':
            return ((result) => {
              store.dispatch({
                type: '@DDP/OUT/PONG',
                payload: {
                  msg: 'pong',
                  id: action.payload.id,
                },
              });
              return result;
            })(next(action));
          case '@DDP/IN/CONNECTED':
            return ((result) => {
              pending.forEach((x) => {
                this.store.dispatch(x);
              });
              pending = [];
              return result;
            })(next(action));
          case '@DDP/OUT/CONNECT':
            this.socket.send(action.payload);
            return next(action);
          case '@DDP/API/SUBSCRIBE':
            return (() => {
              const state = store.getState();
              const sub = find(state.subscriptions,
                s => s.name === action.payload.name &&
                  EJSON.equals(s.params, action.payload.params));
              const subId = (sub && sub.id) || this.nextUniqueId();
              if (!sub) {
                store.dispatch({
                  type: '@DDP/OUT/SUB',
                  payload: {
                    msg: 'sub',
                    id: subId,
                    name: action.payload.name,
                    params: action.payload.params,
                  },
                });
              }
              next(action);
              return subId;
            })();
          case '@DDP/API/UNSUBSCRIBE':
            return (() => {
              const result = next(action);
              const state = store.getState();
              const sub = state.subscriptions[action.payload.id];
              if (sub && sub.users === 0) {
                store.dispatch({
                  type: '@DDP/OUT/UNSUB',
                  payload: {
                    msg: 'unsub',
                    id: sub.id,
                  },
                });
              }
              return result;
            })();
          case '@DDP/OUT/METHOD':
          case '@DDP/OUT/PONG':
          case '@DDP/OUT/SUB':
          case '@DDP/OUT/UNSUB':
            return (() => {
              const state = store.getState();
              const connectionState =
                state.connection &&
                state.connection.state;
              if (connectionState === 'connected') {
                this.socket.send(action.payload);
                return next(action);
              }
              pending.push(action);
              return undefined;
            })();
          default:
            return next(action);
        }
      };
    };
  }

  static reducer() {
    return (state = {
      methods:       {},
      connection:    {},
      collections:   {},
      subscriptions: {},
    }, action) => {
      switch (action.type) {
        case '@DDP/API/SUBSCRIBE':
          return {
            ...state,
            subscriptions: {
              ...state.subscriptions,
              [action.payload.id]: {
                ...state.subscriptions[action.payload.id],
                users: (state.subscriptions[action.payload.id].users || 0) + 1,
              },
            },
          };
        case '@DDP/API/UNSUBSCRIBE':
          return {
            ...state,
            subscriptions: {
              ...state.subscriptions,
              [action.payload.id]: {
                ...state.subscriptions[action.payload.id],
                users: (state.subscriptions[action.payload.id].users || 0) - 1,
              },
            },
          };
        case '@DDP/OUT/SUB':
          return {
            ...state,
            subscriptions: {
              ...state.subscriptions,
              [action.payload.id]: {
                state:  'pending',
                name:   action.payload.name,
                params: action.payload.params,
              },
            },
          };
        case '@DDP/OUT/UNSUB':
          return {
            ...state,
            subscriptions: omit(state.subscriptions, [action.payload.id]),
          };
        case '@DDP/IN/CONNECTED':
          return {
            ...state,
            connection: {
              ...state.connection,
              state: 'connected',
            },
          };
        // --- methods ---
        case '@DDP/OUT/METHOD':
          return {
            ...state,
            methods: {
              ...state.methods,
              [action.payload.id]: {
                state: 'pending',
                id:     action.payload.id,
                name:   action.payload.method,
                params: action.payload.params,
              },
            },
          };
        case '@DDP/IN/RESULT':
          return {
            ...state,
            methods: {
              ...state.methods,
              [action.payload.id]: {
                ...state.methods[action.payload.id],
                result: action.payload.result,
                error:  action.payload.error,
              },
            },
          };
        case '@DDP/IN/UPDATED':
          return {
            ...state,
            methods: {
              ...state.methods,
              [action.payload.id]: {
                ...state.methods[action.payload.id],
                state: 'updated',
              },
            },
          };
        // --- subscriptions ---
        case '@DDP/IN/NOSUB':
          return {
            ...state,
            subscriptions: {
              ...state.subscriptions,
              [action.payload.id]: {
                ...state.subscriptions[action.payload.id],
                state: 'error',
                error: action.payload.error,
              },
            },
          };
        case '@DDP/IN/READY':
          return {
            ...state,
            subscriptions: mapValues(state.subscriptions, (sub, id) => {
              if (action.payload.subs.indexOf(id) >= 0) {
                return {
                  ...sub,
                  state: 'ready',
                };
              }
              return sub;
            }),
          };
        case '@DDP/IN/ADDED':
          return mutateCollections(
            this,
            state,
            action.payload.collection,
            action.payload.id,
            () => ({
              _id: action.payload.id,
              ...action.payload.fields,
            }),
          );
        case '@DDP/IN/CHANGED':
          return mutateCollections(
            this,
            state,
            action.payload.collection,
            action.payload.id,
            current => ({
              ...omit(current, action.payload.cleared),
              ...action.payload.fields,
            }),
          );
        case '@DDP/IN/REMOVED':
          return mutateCollections(
            this,
            state,
            action.payload.collection,
            action.payload.id,
            null,
          );
        default:
          return state;
      }
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
