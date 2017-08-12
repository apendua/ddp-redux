import omit from 'lodash.omit';
import max from 'lodash.max';
import values from 'lodash.values';
import {
  DDP_CLOSE,
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
  const getThreshold = (state) => {
    const priorities = values(state.ddp.messages.pending);
    if (priorities.length === 0) {
      return -Infinity;
    }
    return max(priorities);
  };
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
    if (action.type === DDP_CONNECTED || action.type === DDP_RESULT) {
      // NOTE: We are propagating action first, because
      //       we want to get an up-to-date threshold.
      const result = next(action);
      const state = store.getState();
      const threshold = getThreshold(state);
      const queue = state.ddp.messages.queue;
      let i = 0;
      while (i < queue.length && threshold <= queue[i].meta.priority) {
        store.dispatch(queue[i]);
        i += 1;
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
        priority, // message action may overwrite it's priority
        ...action.meta,
      },
    };
    const state = store.getState();
    const threshold = getThreshold(state);
    if (newAction.meta.priority >= threshold) {
      ddpClient.socket.send(newAction.payload);
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

export const createReducer = () => (state = {
  queue:   [],
  pending: initialPending,
}, action) => {
  switch (action.type) {
    case DDP_CLOSE:
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

