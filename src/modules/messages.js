import omit from 'lodash.omit';
import max from 'lodash.max';
import values from 'lodash.values';
import mapValues from 'lodash.mapvalues';
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

  MESSAGE_TO_ACTION,
  ACTION_TO_MESSAGE,
  ACTION_TO_PRIORITY,
} from '../constants';

export const createMiddleware = ddpClient => (store) => {
  const getThreshold = (state, socketId) => {
    const priorities = values(state.ddp.messages.sockets[socketId] &&
                              state.ddp.messages.sockets[socketId].pending);
    if (priorities.length === 0) {
      return -Infinity;
    }
    return max(priorities);
  };
  ddpClient.on('message', (payload, meta) => {
    const type = payload.msg && MESSAGE_TO_ACTION[payload.msg];
    if (type) {
      store.dispatch({
        type,
        payload,
        meta,
      });
    }
  });
  return next => (action) => {
    if (!action || typeof action !== 'object') {
      return next(action);
    }
    const socketId = (action.meta && action.meta.socketId) || ddpClient.getDefaultSocketId();
    if (action.type === DDP_CONNECTED || action.type === DDP_RESULT) {
      // NOTE: We are propagating action first, because
      //       we want to get an up-to-date threshold.
      const result = next(action);
      const state = store.getState();
      const queue = state.ddp.messages.sockets[socketId] &&
                    state.ddp.messages.sockets[socketId].queue;
      if (queue) {
        const threshold = getThreshold(state, socketId);
        let i = 0;
        while (i < queue.length && threshold <= queue[i].meta.priority) {
          store.dispatch(queue[i]);
          i += 1;
        }
      }
      return result;
    }
    const msg = ACTION_TO_MESSAGE[action.type];
    if (!msg) {
      return next(action);
    }
    const priority = ACTION_TO_PRIORITY[action.type] || 0;
    const newAction = {
      ...action,
      payload: {
        ...action.payload,
        msg,
      },
      meta: {
        priority, // action may overwrite it's priority
        socketId, // action may overwrite it's socketId
        ...action.meta,
      },
    };
    // Ensure that method & sub messages always have valid unique id
    if (action.type === DDP_METHOD || action.type === DDP_SUB) {
      newAction.payload.id = newAction.payload.id || ddpClient.nextUniqueId();
    }
    const state = store.getState();
    const threshold = getThreshold(state, socketId);
    if (newAction.meta.priority >= threshold) {
      ddpClient.send(newAction.payload, newAction.meta);
      return next(newAction);
    }
    store.dispatch({
      type: DDP_ENQUEUE,
      payload: newAction.payload,
      meta: {
        type: newAction.type,
        ...newAction.meta,
      },
    });
    return undefined;
  };
};

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
