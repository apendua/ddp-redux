import forEach from 'lodash.foreach';
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
  DDP_METHOD_UPDATE,
} from '../../constants';
import DDPError from '../../DDPError';
import {
  extractMetadata,
} from './helpers.js';

/**
 * Convert error into a DDPError object.
 * @param {string|object|DDPError} error
 * @returns {DDPError}
 */
const cleanError = (error) => {
  if (!error) {
    return null;
  }
  if (error instanceof DDPError) {
    return error;
  }
  if (error && typeof error === 'object') {
    return new DDPError(error.error, error.reason, error.details);
  }
  if (typeof error === 'string') {
    return new DDPError(error);
  }
  return new DDPError();
};

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
export const createMiddleware = () => (store) => {
  const promises = {};
  const fulfill = (id, method) => {
    const promise = promises[id];
    if (promise) {
      promise.fulfill(
        cleanError(method.error),
        method.result,
      );
    }
  };
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
          // cancel can result in either resolving or rejecting the promise, depending on the "error" flag
          fulfill(action.meta.methodId, action.error
            ? {
              error: action.payload || {
                error: DDPError.ERROR_CANCELED,
                reason: 'Method was canceled by user',
                details: action.meta,
              },
            }
            : {
              result: action.payload,
            },
          );
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
                store.dispatch({
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
              } else if (method.state === DDP_METHOD_STATE__RETURNED) {
                // TODO: Ideally, this should be fulfilled when there are no pending subscriptions,
                //       but retruning the result which we already have should be relatively safe.
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
        next({
          ...action,
          meta: {
            ...action.meta,
            methodId: action.payload.id,
          },
        });
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
        return (() => {
          const state = store.getState();
          const methodId = action.payload.id;
          const method = state.ddp.methods[methodId];
          if (method && method.state === DDP_METHOD_STATE__UPDATED) {
            fulfill(methodId, action.payload);
          }
          return next(enhance(action, method));
        })();
      case DDP_UPDATED:
        return (() => {
          const state = store.getState();
          forEach(action.payload.methods, (methodId) => {
            const method = state.ddp.methods[methodId];
            if (method && method.state === DDP_METHOD_STATE__RETURNED) {
              fulfill(methodId, method);
            }
            if (method) {
              store.dispatch(
                enhance(
                  { type: DDP_METHOD_UPDATE },
                  method,
                ),
              );
            }
          });
          return next(action);
        })();
      default:
        return next(action);
    }
  };
};
