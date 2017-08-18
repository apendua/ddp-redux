import {
  DDP_CONNECTION_STATE__CONNECTING,
  DDP_CONNECTION_STATE__CONNECTED,
  DDP_CONNECTION_STATE__DISCONNECTED,

  DDP_PROTOCOL_VERSION,
  DDP_FAILED,
  DDP_ERROR,
  DDP_CLOSE,
  DDP_PING,
  DDP_PONG,
  DDP_CONNECTED,
  DDP_CONNECT,
} from '../constants';
import DDPError from '../DDPError';

// TODO: Add support for "server_id" message.
export const createMiddleware = ddpClient => (store) => {
  ddpClient.socket.on('open', () => {
    store.dispatch({
      type: DDP_CONNECT,
      payload: {
        msg: 'connect',
        version: DDP_PROTOCOL_VERSION,
        support: [DDP_PROTOCOL_VERSION],
      },
    });
  });
  ddpClient.socket.on('close', () => {
    store.dispatch({
      type: DDP_CLOSE,
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
          });
          return result;
        })(next(action));
      case DDP_FAILED: // could not negotiate DDP protocol version
        ddpClient.socket.close();
        return next(action);
      default:
        return next(action);
    }
  };
};

export const createReducer = () => (state = {
  state: DDP_CONNECTION_STATE__DISCONNECTED,
  queue: [],
}, action) => {
  switch (action.type) {
    case DDP_CONNECT:
      return {
        ...state,
        state: DDP_CONNECTION_STATE__CONNECTING,
      };
    case DDP_CONNECTED:
      return {
        ...state,
        state: DDP_CONNECTION_STATE__CONNECTED,
      };
    case DDP_CLOSE:
      return {
        ...state,
        state: DDP_CONNECTION_STATE__DISCONNECTED,
      };
    default:
      return state;
  }
};

