import map from 'lodash/map';
import forEach from 'lodash/forEach';
import {
  DDP_METHOD_STATE__PENDING,
  DDP_METHOD_STATE__UPDATED,
  DDP_METHOD_STATE__RETURNED,

  DDP_DISCONNECTED,
  DDP_CANCEL,
  DDP_CONNECTED,
  DDP_METHOD,
  DDP_RESULT,
  DDP_UPDATED,
} from '../../constants';
import DDPError from '../../DDPError';
import {
  extractMetadata,
} from './helpers.js';

/**
 * Return action equipped with additional meta data taken
 * from the provided method descriptor.
 * @param {object} action
 * @param {object} method
 */
const enhance = (action, method) => {
  if (method) {
    return {
      ...action,
      meta: {
        socketId: method.socketId,
        methodId: method.id,
        ...extractMetadata(method),
        ...action.meta,
      },
    };
  }
  return action;
};

/**
 * Create middleware for the given ddpClient.
 * @param {DDPClient} ddpClient
 */
export const createMiddleware = ddpClient => (store) => {
  return next => (action) => {
    if (!action || typeof action !== 'object') {
      return next(action);
    }
    switch (action.type) {
      case DDP_CANCEL:
        return (() => {
          const state = store.getState();
          const methodId = action.meta.methodId;
          const method = state.ddp.methods[methodId];
          return next(enhance(action, method));
        })();
      case DDP_CONNECTED:
        return ((result) => {
          const state = store.getState();
          const socketId = action.meta && action.meta.socketId;
          forEach(state.ddp.methods, (method, id) => {
            // cancel all methods that were pending on the socket being closed, unless they're flagged as "retry"
            if (method.socketId === socketId) {
              if (method.retry && method.state === DDP_METHOD_STATE__PENDING) {
                // call the same method again after connection is re-established
                const promise = store.dispatch({
                  type: DDP_METHOD,
                  payload: {
                    id,
                    method: method.name,
                    params: method.params,
                  },
                  meta: {
                    socketId,
                  },
                });
                if (promise instanceof Promise) {
                  promise.catch((error) => {
                    ddpClient.emit('error', error);
                  });
                }
              } else if (method.state === DDP_METHOD_STATE__RETURNED) {
                // TODO: Ideally, this should be fulfilled when there are no pending subscriptions,
                //       but returning the result which we already have should be relatively safe.
                store.dispatch({
                  type: DDP_CANCEL,
                  payload: method.result,
                  meta: {
                    socketId,
                    methodId: id,
                  },
                });
              }
            }
          });
          return result;
        })(next(action));
      case DDP_DISCONNECTED:
        return ((result) => {
          const state = store.getState();
          const socketId = action.meta && action.meta.socketId;
          forEach(state.ddp.methods, (method, methodId) => {
            // cancel all methods that were pending on the socket being closed, unless they're flagged as "retry"
            if (method.socketId === socketId &&
                method.state !== DDP_METHOD_STATE__RETURNED) {
              //----------------------------------------------------------------
              if (method.state === DDP_METHOD_STATE__UPDATED || !method.retry) {
                store.dispatch({
                  type: DDP_CANCEL,
                  error: true,
                  payload: { // NOTE: This could be an instance of DDPError, but it would be very hard to test it that way
                    error: DDPError.ERROR_CONNECTION,
                    reason: `Connection was lost before method ${method.name} returned`,
                    details: method,
                  },
                  meta: {
                    methodId,
                    socketId,
                  },
                });
              }
            }
          });
          return result;
        })(next(action));
      case DDP_METHOD:
        return next({
          ...action,
          meta: {
            ...action.meta,
            methodId: action.payload.id,
          },
        });
      case DDP_RESULT:
        return (() => {
          const state = store.getState();
          const methodId = action.payload.id;
          const method = state.ddp.methods[methodId];
          return next(enhance(action, method));
        })();
      case DDP_UPDATED:
        return (() => {
          const state = store.getState();
          return next({
            ...action,
            meta: {
              ...action.meta,
              methods: map(
                action.payload.methods,
                methodId => state.ddp.methods[methodId],
              ),
            },
          });
        })();
      default:
        return next(action);
    }
  };
};
