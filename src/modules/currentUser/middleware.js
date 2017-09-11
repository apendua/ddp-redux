import {
  DEFAULT_LOGIN_METHOD_NAME,
  DEFAULT_LOGOUT_MEHTOD_NAME,

  DDP_LOGIN,
  DDP_LOGGED_IN,
  DDP_LOGOUT,
  DDP_LOGGED_OUT,

  LOGIN_ACTION_PRIORITY,
} from '../../constants';
import {
  callMethod,
} from '../../actions';

/**
 * Create middleware for the given ddpClient.
 * @param {DDPClient} ddpClient
 */
export const createMiddleware = ddpClient => (store) => {
  const handleLoginError = (meta, err) => {
    store.dispatch({
      type: DDP_LOGGED_OUT,
      meta,
    });
    ddpClient.emit(err);
  };
  return next => (action) => {
    if (!action || typeof action !== 'object') {
      return next(action);
    }
    switch (action.type) {
      case DDP_LOGIN:
        return (() => {
          next(action);
          const result = store.dispatch(
            callMethod(DEFAULT_LOGIN_METHOD_NAME, [action.payload], {
              ...action.meta,
              priority: LOGIN_ACTION_PRIORITY,
            }),
          );
          if (result instanceof Promise) {
            result.then(({ id, token }) => store.dispatch({
              type: DDP_LOGGED_IN,
              payload: {
                id,
                token,
              },
              meta: {
                socketId: action.meta.socketId,
              },
            })).catch(handleLoginError.bind(null, action.meta));
          }
          return result;
        })();
      case DDP_LOGOUT:
        return (() => {
          next(action);
          const result = store.dispatch(
            callMethod(DEFAULT_LOGOUT_MEHTOD_NAME, [], {
              ...action.meta,
              priority: LOGIN_ACTION_PRIORITY,
            }),
          );
          if (result instanceof Promise) {
            result.then(() => store.dispatch({
              type: DDP_LOGGED_OUT,
              meta: {
                socketId: action.meta.socketId,
              },
            })).catch(handleLoginError.bind(null, action.meta));
          }
          return result;
        })();
      default:
        return next(action);
    }
  };
};
