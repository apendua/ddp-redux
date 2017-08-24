import mapValues from 'lodash.mapvalues';
import {
  DDP_CONNECTION_STATE__CONNECTING,
  DDP_CONNECTION_STATE__CONNECTED,
  DDP_CONNECTION_STATE__DISCONNECTED,

  DDP_PROTOCOL_VERSION,
  DDP_FAILED,
  DDP_ERROR,
  DDP_OPEN,
  DDP_CLOSED,
  DDP_PING,
  DDP_PONG,
  DDP_CONNECTED,
  DDP_CONNECT,
} from '../constants';
import DDPError from '../DDPError';

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

export const createSocketReducer = () => (state = {
  state: DDP_CONNECTION_STATE__DISCONNECTED,
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
    case DDP_CLOSED:
      return {
        ...state,
        state: DDP_CONNECTION_STATE__DISCONNECTED,
      };
    default:
      return state;
  }
};

export const createReducer = (DDPClient) => {
  const socketReducer = createSocketReducer(DDPClient);
  return (state = {
    sockets: {},
  }, action) => {
    switch (action.type) {
      case DDP_CONNECT:
      case DDP_CONNECTED:
      case DDP_CLOSED:
        return (() => {
          if (action.meta && action.meta.socketId) {
            return {
              ...state,
              sockets: mapValues(state.sockets, (socket, socketId) => {
                if (socketId === action.meta.socketId) {
                  return socketReducer(socket, action);
                }
                return socket;
              }),
            };
          }
          return state;
        })();
      default:
        return state;
    }
  };
};
