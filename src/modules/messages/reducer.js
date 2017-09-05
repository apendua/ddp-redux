import omit from 'lodash.omit';
import {
  DDP_CLOSED,
  DDP_PONG,
  DDP_RESULT,
  DDP_CONNECTED,
  DDP_CONNECT,
  DDP_METHOD,
  DDP_SUB,
  DDP_UNSUB,
  DDP_ENQUEUE,

  ACTION_TO_PRIORITY,
} from '../../constants';
import decentlyMapValues from '../../utils/decentlyMapValues';

const initialPending = {
  '[connect]': ACTION_TO_PRIORITY[DDP_CONNECT],
};

export const createSocketReducer = () => (state = {
  queue:   [],
  pending: initialPending,
}, action) => {
  switch (action.type) {
    case DDP_CLOSED:
      return {
        ...state,
        pending: initialPending,
      };
    case DDP_ENQUEUE:
      return {
        ...state,
        queue: ((queue) => {
          // elements with higher priority go first
          const priority = action.meta.priority || 0;
          const newQueue = [];
          let i = 0;
          while (i < queue.length && priority <= queue[i].meta.priority) {
            newQueue.push(queue[i]);
            i += 1;
          }
          const {
            type,
            ...meta
          } = action.meta;
          newQueue.push({
            type,
            meta,
            payload: action.payload,
          });
          while (i < queue.length) {
            newQueue.push(queue[i]);
            i += 1;
          }
          return newQueue;
        })(state.queue),
      };
    case DDP_CONNECTED:
      return {
        ...state,
        pending: {},
      };
    case DDP_METHOD:
      return {
        ...state,
        queue: state.queue.filter(x => x.payload.id !== action.payload.id),
        pending: {
          ...state.pending,
          [action.payload.id]: action.meta.priority,
        },
      };
    case DDP_RESULT:
      return {
        ...state,
        pending: omit(state.pending, action.payload.id),
      };
    case DDP_PONG:
    case DDP_SUB:
    case DDP_UNSUB:
      return {
        ...state,
        queue: state.queue.filter(x => x.payload.id !== action.payload.id),
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
      case DDP_CLOSED:
      case DDP_ENQUEUE:
      case DDP_CONNECTED:
      case DDP_METHOD:
      case DDP_RESULT:
      case DDP_PONG:
      case DDP_SUB:
      case DDP_UNSUB:
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
