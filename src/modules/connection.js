import forEach from 'lodash.foreach';
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
  DDP_METHOD,
  DDP_SUB,
  DDP_UNSUB,
  DDP_ENQUEUE,

  MESSAGE_TO_ACTION,
  ACTION_TO_MESSAGE,
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
  ddpClient.socket.on('message', (payload) => {
    const type = payload.msg && MESSAGE_TO_ACTION[payload.msg];
    if (type) {
      store.dispatch({
        type,
        payload,
      });
    }
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
      case DDP_CONNECTED:
        return ((result) => {
          forEach(store.getState().ddp.connection.queue, store.dispatch);
          return result;
        })(next(action));
      case DDP_FAILED: // could not negotiate DDP protocol version
        ddpClient.socket.close();
        return next(action);
      case DDP_CONNECT:
        ddpClient.socket.send(action.payload);
        return next(action);
      case DDP_METHOD:
      case DDP_PONG:
      case DDP_SUB:
      case DDP_UNSUB:
        return (() => {
          const state = store.getState();
          const connectionState =
            state.ddp.connection &&
            state.ddp.connection.state;
          if (connectionState === DDP_CONNECTION_STATE__CONNECTED) {
            ddpClient.socket.send(action.payload);
            return next(action);
          }
          store.dispatch({
            type: DDP_ENQUEUE,
            payload: action,
          });
          return undefined;
        })();
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
    case DDP_ENQUEUE:
      return {
        ...state,
        queue: [
          ...state.queue,
          action.payload,
        ],
      };
    case DDP_METHOD:
    case DDP_PONG:
    case DDP_SUB:
    case DDP_UNSUB:
      return {
        ...state,
        queue: state.queue.filter(x => x !== action),
      };
    default:
      return state;
  }
};

