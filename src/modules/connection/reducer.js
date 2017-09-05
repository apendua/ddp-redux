import {
  DDP_CONNECTION_STATE__CONNECTING,
  DDP_CONNECTION_STATE__CONNECTED,
  DDP_CONNECTION_STATE__DISCONNECTED,

  DDP_CLOSED,
  DDP_CONNECTED,
  DDP_CONNECT,
} from '../../constants';
import decentlyMapValues from '../../utils/decentlyMapValues';

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
              sockets: decentlyMapValues(state.sockets, (socket, socketId) => {
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
