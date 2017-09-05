import {
  DDP_PROTOCOL_VERSION,
  DDP_FAILED,
  DDP_ERROR,
  DDP_CLOSED,
  DDP_PING,
  DDP_PONG,
  DDP_CONNECT,
} from '../../constants';
import DDPError from '../../DDPError';

// TODO: Add support for "server_id" message.
export const createMiddleware = ddpClient => (store) => {
  ddpClient.on('open', (meta) => {
    store.dispatch({
      meta,
      type: DDP_CONNECT,
      payload: {
        msg: 'connect',
        version: DDP_PROTOCOL_VERSION,
        support: [DDP_PROTOCOL_VERSION],
      },
    });
  });
  ddpClient.on('close', (meta) => {
    store.dispatch({
      meta,
      type: DDP_CLOSED,
    });
  });
  return next => (action) => {
    if (!action || typeof action !== 'object') {
      return next(action);
    }
    switch (action.type) {
      case DDP_ERROR:
        ddpClient.emit('error', new DDPError('badMessage', action.payload.reason, action.payload.offendingMessage));
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
        ddpClient.close(action.meta && action.meta.socketId);
        return next(action);
      default:
        return next(action);
    }
  };
};
