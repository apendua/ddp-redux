import debounce from 'lodash.debounce';
import {
  DDP_ADDED,
  DDP_CHANGED,
  DDP_REMOVED,
  DDP_FLUSH,
} from '../../constants';

export const createMiddleware = () => (store) => {
  // let flushTimeout = null;
  // const flush = () => {
  //   if (flushTimeout) {
  //     clearTimeout(flushTimeout);
  //   }
  //   flushTimeout = setTimeout(() => {
  //     store.dispatch({
  //       type: DDP_FLUSH,
  //     });
  //     flushTimeout = null;
  //   }, 200);
  // };
  const flush = debounce(() => {
    store.dispatch({
      type: DDP_FLUSH,
    });
  }, 200);
  return next => (action) => {
    if (!action || typeof action !== 'object') {
      return next(action);
    }
    switch (action.type) {
      case DDP_ADDED:
      case DDP_CHANGED:
      case DDP_REMOVED:
        return ((result) => {
          flush();
          return result;
        })(next(action));
      default:
        return next(action);
    }
  };
};
