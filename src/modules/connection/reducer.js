import {
  DEFAULT_SOCKET_ID,

  DDP_CONNECTION_STATE__CONNECTING,
  DDP_CONNECTION_STATE__CONNECTED,
  DDP_CONNECTION_STATE__DISCONNECTED,

  DDP_OPEN,
  DDP_CLOSE,
  DDP_DISCONNECTED,
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
    case DDP_DISCONNECTED:
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
      case DDP_OPEN:
        return (() => {
          const socketId = (action.meta && action.meta.socketId) || DEFAULT_SOCKET_ID;
          return {
            ...state,
            sockets: {
              ...state.sockets,
              [socketId]: {
                ...state.sockets[socketId],
                users:    ((state.sockets[socketId] && state.sockets[socketId].users) || 0) + 1,
                params:   action.payload.params,
                endpoint: action.payload.endpoint,
              },
            },
          };
        })();
      case DDP_CLOSE:
        return (() => {
          const socketId = (action.meta && action.meta.socketId) || DEFAULT_SOCKET_ID;
          return {
            ...state,
            sockets: {
              ...state.sockets,
              [socketId]: {
                ...state.sockets[socketId],
                users: ((state.sockets[socketId] && state.sockets[socketId].users) || 0) - 1,
              },
            },
          };
        })();
      case DDP_CONNECT:
      case DDP_CONNECTED:
      case DDP_DISCONNECTED:
        return (() => {
          const actionSocketId = action.meta && action.meta.socketId;
          // NOTE: If socket is not yet there, it will be created.
          if (actionSocketId) {
            return {
              ...state,
              sockets: decentlyMapValues(state.sockets, (socket, socketId, remove) => {
                if (actionSocketId === socketId) {
                  if (action.type === DDP_DISCONNECTED && !socket.users) {
                    return remove(socketId);
                  }
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
