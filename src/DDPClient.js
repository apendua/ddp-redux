import omit from 'lodash.omit';
import mapValues from 'lodash.mapvalues';
import DDPSocket from './DDPSocket';
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
          type: `@DDP/IN/${msg.msg}`,
          payload: msg,
        });
      });
      return next => (action) => {
        const state = store.getState();
        const connectionState =
          state.connection &&
          state.connection.state;
        if (!action || typeof action !== 'object') {
          return next(action);
        }
        switch (action.type) {
          case '@DDP/IN/ping':
            return ((result) => {
              store.dispatch({
                type: '@DDP/OUT/pong',
                payload: {
                  msg: 'pong',
                  id: action.payload.id,
                },
              });
              return result;
            })(next(action));
          case '@DDP/IN/connected':
            return ((result) => {
              pending.forEach((x) => {
                this.store.dispatch(x);
              });
              pending = [];
              return result;
            })(next(action));
          case '@DDP/OUT/connect':
            this.socket.send(action.payload);
            return next(action);
          case '@DDP/OUT/method':
          case '@DDP/OUT/pong':
          case '@DDP/OUT/sub':
            if (connectionState === 'connected') {
              this.socket.send(action.payload);
              return next(action);
            }
            pending.push(action);
            break;
          default:
            return next(action);
        }
        return undefined;
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
        case '@DDP/OUT/sub':
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
        case '@DDP/IN/connected':
          return {
            ...state,
            connection: {
              ...state.connection,
              state: 'connected',
            },
          };
        // --- methods ---
        case '@DDP/OUT/method':
          return {
            ...state,
            methods: {
              ...state.methods,
              [action.payload.id]: {
                state: 'pending',
                name:   action.payload.method,
                params: action.payload.params,
              },
            },
          };
        case '@DDP/IN/result':
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
        case '@DDP/IN/updated':
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
        case '@DDP/IN/nosub':
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
        case '@DDP/IN/ready':
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
        case '@DDP/IN/added':
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
        case '@DDP/IN/changed':
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
        case '@DDP/IN/removed':
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
