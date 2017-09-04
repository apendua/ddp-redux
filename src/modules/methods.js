import omit from 'lodash.omit';
import forEach from 'lodash.foreach';
import {
  DDP_METHOD_STATE__PENDING,
  DDP_METHOD_STATE__UPDATED,
  DDP_METHOD_STATE__RETURNED,

  DDP_METHOD,
  DDP_RESULT,
  DDP_UPDATED,
} from '../constants';
import decentlyMapValues from '../utils/decentlyMapValues';
import DDPError from '../DDPError';

export const createMiddleware = () => (store) => {
  const promises = {};
  const fulfill = (id, method) => {
    const promise = promises[id];
    if (promise) {
      promise.fulfill(
        method.error
          ? new DDPError(method.error.error, method.error.reason, method.error.details)
          : null,
        method.result,
      );
    }
  };
  return next => (action) => {
    if (!action || typeof action !== 'object') {
      return next(action);
    }
    switch (action.type) {
      case DDP_METHOD:
        next(action);
        return new Promise((resolve, reject) => {
          promises[action.payload.id] = {
            fulfill: (err, res) => {
              delete promises[action.payload.id];
              if (err) {
                reject(err);
              } else {
                resolve(res);
              }
            },
          };
        });
      case DDP_RESULT:
        return ((result) => {
          const state = store.getState(); // snapshot before action is applied
          const id = action.payload.id;
          const method = state.ddp.methods[id];
          if (method && method.state === DDP_METHOD_STATE__UPDATED) {
            fulfill(id, action.payload);
          }
          return result;
        })(next(action));
      case DDP_UPDATED:
        return ((result) => {
          const state = store.getState(); // snapshot before action is applied
          forEach(action.payload.methods, (id) => {
            const method = state.ddp.methods[id];
            if (method && method.state === DDP_METHOD_STATE__RETURNED) {
              fulfill(id, method);
            }
          });
          return result;
        })(next(action));
      default:
        return next(action);
    }
  };
};

export const createReducer = () => (state = {}, action) => {
  const id = action.payload.id;
  switch (action.type) {
    case DDP_METHOD:
      return {
        ...state,
        [id]: {
          id,
          state:  DDP_METHOD_STATE__PENDING,
          name:   action.payload.method,
          params: action.payload.params,
        },
      };
    case DDP_RESULT:
      return state[id] && state[id].state === DDP_METHOD_STATE__PENDING
        ? {
          ...state,
          [id]: {
            ...state.methods[id],
            state:  DDP_METHOD_STATE__RETURNED,
            result: action.payload.result,
            error:  action.payload.error,
          },
        }
        : omit(state, id);
    case DDP_UPDATED:
      return decentlyMapValues(state, (method, methodId, remove) => {
        if (action.payload.methods.indexOf(methodId) < 0) {
          return method;
        }
        if (method.state === DDP_METHOD_STATE__RETURNED) {
          return remove(methodId);
        }
        return {
          ...method,
          state: DDP_METHOD_STATE__UPDATED,
        };
      });
    default:
      return state;
  }
};

