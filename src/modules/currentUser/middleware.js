/** @module createUser/middleware */

import {
  DEFAULT_SOCKET_ID,
  DEFAULT_LOGIN_METHOD_NAME,
  DEFAULT_LOGOUT_METHOD_NAME,

  DDP_LOGIN,
  DDP_LOGGED_IN,
  DDP_LOGOUT,
  DDP_LOGGED_OUT,
  DDP_CONNECTED,

  LOGIN_ACTION_PRIORITY,
} from '../../constants';
import {
  callMethod,
} from '../../actions';

/**
 * Create middleware for the given ddpClient.
 * @param {DDPClient} ddpClient
 * @returns {ReduxMiddleware}
 * @private
 */
export const createMiddleware = ddpClient => (store) => {
  const getSocket = (socketId) => {
    const state = store.getState();
    return state.ddp &&
           state.ddp.connection &&
           state.ddp.connection.sockets &&
           state.ddp.connection.sockets[socketId];
  };
  const handleLoginError = (meta, err) => {
    store.dispatch({
      type: DDP_LOGGED_OUT,
      error: true,
      payload: err,
      meta,
    });
    ddpClient.emit('error', err);
  };
  return next => (action) => {
    if (!action || typeof action !== 'object') {
      return next(action);
    }
    switch (action.type) {
      case DDP_CONNECTED:
        return ((result) => {
          const socketId = action.meta.socketId;
          const socket = getSocket(socketId);
          ddpClient
            .getResumeToken(socket)
            .then(resume => store.dispatch({
              type: DDP_LOGIN,
              payload: {
                resume,
              },
              meta: {
                socketId,
              },
            }))
            .catch((err) => {
              console.warn(err);
            });
          return result;
        })(next(action));
      case DDP_LOGGED_IN:
        return (() => {
          const socketId = (action.meta && action.meta.socketId) || DEFAULT_SOCKET_ID;
          const socket = getSocket(socketId);
          ddpClient.setResumeToken(socket, action.payload.token);
          return next(action);
        })();
      case DDP_LOGGED_OUT:
        return (() => {
          const socketId = (action.meta && action.meta.socketId) || DEFAULT_SOCKET_ID;
          const socket = getSocket(socketId);
          ddpClient.clearResumeToken(socket);
          return next(action);
        })();
      case DDP_LOGIN:
        return (() => {
          const socketId = (action.meta && action.meta.socketId) || DEFAULT_SOCKET_ID;
          const method = (action.meta && action.meta.method) || DEFAULT_LOGIN_METHOD_NAME;
          next(action);
          const result = store.dispatch(
            callMethod(method, action.payload, {
              ...action.meta,
              priority: LOGIN_ACTION_PRIORITY,
            }),
          );
          if (result instanceof Promise) {
            result.then(({ id, token }) => store.dispatch({
              type: DDP_LOGGED_IN,
              payload: {
                id,
                token,
              },
              meta: {
                socketId,
              },
            })).catch(handleLoginError.bind(null, action.meta));
          }
          return result;
        })();
      case DDP_LOGOUT:
        return (() => {
          next(action);
          const result = store.dispatch(
            callMethod(DEFAULT_LOGOUT_METHOD_NAME, [], {
              ...action.meta,
              priority: LOGIN_ACTION_PRIORITY,
            }),
          );
          if (result instanceof Promise) {
            result
              .then(() => store.dispatch({
                type: DDP_LOGGED_OUT,
                meta: {
                  socketId: action.meta.socketId,
                },
              }))
              .catch(handleLoginError.bind(null, action.meta));
          }
          return result;
        })();
      default:
        return next(action);
    }
  };
};
