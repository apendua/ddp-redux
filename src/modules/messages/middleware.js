import max from 'lodash.max';
import values from 'lodash.values';
import {
  DDP_RESULT,
  DDP_CONNECTED,
  DDP_METHOD,
  DDP_SUB,
  DDP_ENQUEUE,

  MESSAGE_TO_ACTION,
  ACTION_TO_MESSAGE,
  ACTION_TO_PRIORITY,
} from '../../constants';

/**
 * Return the maximal priority of the current pending messages.
 * @param {object} state
 * @param {string} socketId
 * @returns {number}
 */
const getThreshold = (state, socketId) => {
  const priorities = values(state.ddp.messages.sockets[socketId] &&
                            state.ddp.messages.sockets[socketId].pending);
  if (priorities.length === 0) {
    return -Infinity;
  }
  return max(priorities);
};

/**
 * Create middleware for the given ddpClient.
 * @param {DDPClient} ddpClient
 */
export const createMiddleware = ddpClient => (store) => {
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
