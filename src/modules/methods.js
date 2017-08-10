import omit from 'lodash.omit';
import {
  DDP_METHOD_STATE__PENDING,
  DDP_METHOD_STATE__UPDATED,
  DDP_METHOD_STATE__RETURNED,

  DDP_METHOD,
  DDP_RESULT,
  DDP_UPDATED,
  DDP_CANCEL,
} from '../constants';
import DDPError from '../DDPError';

export const createMiddleware = () => (store) => {
  const promises = {};
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
      case DDP_CANCEL:
        return ((result) => {
          const promise = promises[action.payload.id];
          if (promise) {
            promise.fulfill(new DDPError('canceled'));
          }
          return result;
        })(next(action));
      case DDP_RESULT:
      case DDP_UPDATED:
        return (() => {
          const state = store.getState(); // snapshot before action is applied
          const id = action.payload.id;
          const method = state.ddp.methods[id];
          const promise = promises[id];
          if (promise && method) {
            // NOTE: We only allow action propagation, if method exists.
            const result = next(action);
            if (method.state !== DDP_METHOD_STATE__PENDING) {
              promise.fulfill(
                method.error
                  ? new DDPError(method.error.error, method.error.reason, method.error.details)
                  : null,
                method.result,
              );
            }
            return result;
          }
          return undefined;
        })();
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
    case DDP_CANCEL:
      return omit(state, id);
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
      return state[id] && state[id].state === DDP_METHOD_STATE__PENDING
        ? {
          ...state,
          [id]: {
            ...state.methods[id],
            state: DDP_METHOD_STATE__UPDATED,
          },
        }
        : omit(state, id);
    default:
      return state;
  }
};

