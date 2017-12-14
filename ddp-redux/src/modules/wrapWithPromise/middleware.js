import forEach from 'lodash/forEach';
import DDPError from '../../DDPError';
import {
  DDP_CANCEL,
  DDP_METHOD,
  DDP_RESULT,
  DDP_UPDATED,
  DDP_ENQUEUE,
  DDP_READY,
  DDP_SUB,
  DDP_NOSUB,

  DDP_METHOD_STATE__UPDATED,
  DDP_METHOD_STATE__RETURNED,
} from '../../constants';

/**
 * Create middleware for the given ddpClient.
 * @param {DDPClient} ddpClient
 */
export const createMiddleware = ddpClient => (store) => {
  const promises = {};
  /**
   * Create a promise bound to message id.
   * @param {String} id
   * @returns {Promise}
   */
  const createPromise = (id, meta) => {
    if (promises[id]) {
      return promises[id].promise;
    }
    promises[id] = {};
    promises[id].meta = meta;
    promises[id].promise = new Promise((resolve, reject) => {
      promises[id].fulfill = (err, res) => {
        delete promises[id];
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      };
    });
    if (ddpClient.onPromise) {
      ddpClient.onPromise(promises[id].promise, promises[id].meta);
    }
    return promises[id].promise;
  };
  /**
   * Fulfill an existing promise, identified by message id.
   * @param {String} id
   * @param {Object} options
   * @param {Error} [options.error]
   * @param {*} [options.result]
   */
  const fulfill = (id, { error, result }) => {
    const promise = promises[id];
    if (promise) {
      promise.fulfill(
        ddpClient.cleanError(error),
        result,
      );
    }
  };
  return next => (action) => {
    if (typeof action === 'function') {
      return action(store.dispatch, store.getState);
    }
    if (!action || typeof action !== 'object') {
      return next(action);
    }
    switch (action.type) {
      case DDP_CANCEL:
        return (() => {
          // cancel can result in either resolving or rejecting the promise, depending on the "error" flag
          fulfill(action.meta.methodId, action.error
            ? {
              error: action.payload ||
              new DDPError(DDPError.ERROR_CANCELED, 'Method was canceled by user', action),
            }
            : { result: action.payload },
          );
          return next(action);
        })();
      case DDP_ENQUEUE:
      case DDP_METHOD:
      case DDP_SUB:
        return (() => {
          let promise = null;
          if (action.type === DDP_ENQUEUE) {
            switch (action.meta.type) {
              case DDP_METHOD:
              case DDP_SUB:
                promise = createPromise(action.payload.id, action.meta);
                break;
              default:
                return next(action);
            }
          } else {
            promise = createPromise(action.payload.id, action.meta);
          }
          next(action);
          promise.id = action.payload.id;
          return promise;
        })();
      case DDP_RESULT:
        return (() => {
          const methodId = action.payload.id;
          const state = store.getState();
          const method = state.ddp.methods[methodId];
          if (method && method.state === DDP_METHOD_STATE__UPDATED) {
            fulfill(methodId, {
              error: action.payload.error, result: action.payload.result,
            });
          }
          return next(action);
        })();
      case DDP_UPDATED:
        return (() => {
          const state = store.getState();
          forEach(action.payload.methods, (methodId) => {
            const method = state.ddp.methods[methodId];
            if (method && method.state === DDP_METHOD_STATE__RETURNED) {
              fulfill(methodId, {
                error: method.error, result: method.result,
              });
            }
          });
          return next(action);
        })();
      case DDP_READY:
        forEach(action.payload.subs, (subId) => {
          fulfill(subId, {});
        });
        return next(action);
      case DDP_NOSUB:
        fulfill(action.payload.id, {
          error: action.payload.error,
        });
        return next(action);
      default:
        return next(action);
    }
  };
};
