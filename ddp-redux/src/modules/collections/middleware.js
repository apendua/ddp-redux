import some from 'lodash/some';
import {
  DDP_READY,
  DDP_UPDATED,
  DDP_METHOD,
  DDP_ADDED,
  DDP_CHANGED,
  DDP_REMOVED,
  DDP_FLUSH,
  DDP_QUERY_UPDATE,
} from '../../constants';

/**
 * Create middleware for the given ddpClient.
 * @param {DDPClient} ddpClient
 */
export const createMiddleware = ddpClient => (store) => {
  let flushTimeout = null;
  const scheduleFlush = () => {
    if (flushTimeout) {
      clearTimeout(flushTimeout);
    }
    flushTimeout = setTimeout(() => {
      const state = store.getState();
      if (some(state.ddp.collections, collection => collection.needsUpdate)) {
        store.dispatch({
          type: DDP_FLUSH,
        });
      }
      flushTimeout = null;
    }, ddpClient.getFlushTimeout());
  };
  return next => (action) => {
    if (!action || typeof action !== 'object') {
      return next(action);
    }
    switch (action.type) {
      case DDP_ADDED:
      case DDP_CHANGED:
      case DDP_REMOVED:
      case DDP_METHOD:
      case DDP_QUERY_UPDATE:
        scheduleFlush();
        return next(action);
      case DDP_READY:
      case DDP_UPDATED:
        store.dispatch({
          type: DDP_FLUSH,
        });
        return next(action);
      default:
        return next(action);
    }
  };
};
