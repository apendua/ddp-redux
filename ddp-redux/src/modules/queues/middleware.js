import max from 'lodash/max';
import values from 'lodash/values';
import { DDP_ENQUEUE } from '../../constants';

/**
 * Return the maximal priority of the current pending actions.
 * @param {object} state
 * @param {string} queueId
 * @returns {number}
 */
const getMaxPendingValue = (state, queueId) => {
  const pendingValues = values(state.ddp.queues[queueId] &&
                               state.ddp.queues[queueId].pending);
  if (pendingValues.length === 0) {
    return -Infinity;
  }
  return max(pendingValues);
};

/**
 * Create middleware for the given ddpClient.
 * @param {DDPClient} ddpClient
 */
export const createMiddleware = () => store => next => (action) => {
  if (!action || typeof action !== 'object' || action.type === DDP_ENQUEUE) {
    return next(action);
  }
  const queueId = action.meta &&
                  action.meta.queue &&
                  action.meta.queue.id;
  if (!queueId) {
    return next(action);
  }
  const {
    resolve,
    priority = 0,
  } = action.meta.queue;
  if (resolve) {
    // NOTE: We are propagating action first, because
    //       we want to get an up-to-date threshold.
    const result = next(action);
    const state = store.getState();
    const elements = state.ddp.queues[queueId] &&
                     state.ddp.queues[queueId].elements;
    if (elements) {
      let t = getMaxPendingValue(state, queueId);
      let i = 0;
      while (i < elements.length && t <= (elements[i].meta.queue.priority || 0)) {
        store.dispatch(elements[i]);
        // Note that threshold might have changed after dispatching another action.
        t = getMaxPendingValue(store.getState(), queueId);
        i += 1;
      }
    }
    return result;
  }
  if (priority >= getMaxPendingValue(store.getState(), queueId)) {
    return next(action);
  }
  return store.dispatch({
    ...action,
    type: DDP_ENQUEUE,
    meta: {
      ...action.meta,
      type: action.type,
    },
  });
};
