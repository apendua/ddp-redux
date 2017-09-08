import find from 'lodash.find';
import {
  DEFAULT_SOCKET_ID,

  DDP_PROTOCOL_VERSION,
  DDP_FAILED,
  DDP_ERROR,
  DDP_OPEN,
  DDP_CLOSE,
  DDP_DISCONNECTED,
  DDP_PING,
  DDP_PONG,
  DDP_CONNECT,
} from '../../constants';
import DDPError from '../../DDPError';
import EJSON from '../../ejson';
import createDelayedTask from '../../utils/createDelayedTask';

/**
 * Create middleware for the given ddpClient.
 * @param {DDPClient} ddpClient
 */
export const createMiddleware = ddpClient => (store) => {
  // TODO: Add support for "server_id" message.
  ddpClient.on('open', (meta) => {
    store.dispatch({
      meta,
      type: DDP_CONNECT,
      payload: {
        version: DDP_PROTOCOL_VERSION,
        support: [DDP_PROTOCOL_VERSION],
      },
    });
  });
  ddpClient.on('close', (meta) => {
    store.dispatch({
      meta,
      type: DDP_DISCONNECTED,
    });
  });
  if (ddpClient.defaultEndpoint) {
    setTimeout(() => {
      store.dispatch({
        type: DDP_OPEN,
        payload: {
          endpoint: ddpClient.defaultEndpoint,
        },
      });
    });
  }
  const scheduleCleanup = createDelayedTask((socketId) => {
    ddpClient.close({ socketId });
  });
  return next => (action) => {
    if (!action || typeof action !== 'object') {
      return next(action);
    }
    switch (action.type) {
      case DDP_ERROR:
        ddpClient.emit('error', new DDPError(DDPError.ERROR_BAD_MESSAGE, action.payload.reason, action.payload.offendingMessage));
        return next(action);
      case DDP_PING:
        return ((result) => {
          store.dispatch({
            type: DDP_PONG,
            payload: {
              id: action.payload.id,
            },
            meta: action.meta,
          });
          return result;
        })(next(action));
      case DDP_FAILED: // could not negotiate DDP protocol version
        ddpClient.close(action.meta);
        // NOTE: ddpClient.close() will emit "close" event and it will dispatch the DDP_DISCONNECTED
        return next(action);
      case DDP_OPEN:
        return (() => {
          const state = store.getState();
          const {
            endpoint,
            params,
          } = action.payload;
          const socket = find(state.ddp.connection.sockets, x => x.endpoint === endpoint && EJSON.equals(x.params, params));
          let socketId = socket && socket.id;
          if (!socketId) {
            if (!state.ddp.connection.sockets[DEFAULT_SOCKET_ID]) {
              socketId = DEFAULT_SOCKET_ID;
            } else {
              socketId = ddpClient.nextUniqueId();
            }
          }
          if (socket) {
            scheduleCleanup.cancel(socketId);
          } else {
            ddpClient.open(endpoint, { socketId });
          }
          next({
            ...action,
            payload: {
              ...action.payload,
            },
            meta: {
              ...action.meta,
              socketId,
            },
          });
          return socketId;
        })();
      case DDP_CLOSE:
        return (() => {
          const state = store.getState();
          const socket = state.ddp.connection.sockets[action.meta.socketId];
          // NOTE: The number of users will only be decreased after "next(action)"
          //       so at this moment it's still taking into account the one which
          //       is resigning.
          if (socket && socket.users === 1) {
            scheduleCleanup(socket.id);
          }
          return next(action);
        })();
      default:
        return next(action);
    }
  };
};
