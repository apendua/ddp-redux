import find from 'lodash/find';
import forEach from 'lodash/forEach';
import EJSON from '../../ejson';
import {
  DEFAULT_SOCKET_ID,
  DDP_SUBSCRIPTION_STATE__READY,
  DDP_SUBSCRIPTION_STATE__PENDING,
  DDP_SUBSCRIPTION_STATE__RESTORING,
  DDP_CONNECT,
  DDP_SUB,
  DDP_UNSUB,
  DDP_NOSUB,
  DDP_SUBSCRIBE,
  DDP_UNSUBSCRIBE,
  DDP_ENQUEUE,
} from '../../constants';
import createDelayedTask from '../../utils/createDelayedTask';

/**
 * Create middleware for the given ddpClient.
 * @param {DDPClient} ddpClient
 */
export const createMiddleware = ddpClient => (store) => {
  const scheduleCleanup = createDelayedTask((id) => {
    store.dispatch({
      type: DDP_UNSUB,
      payload: {
        id,
      },
      meta: {
        subId: id,
      },
    });
  }, {
    getTimeout: () => ddpClient.getSubscriptionCleanupTimeout(),
  });
  return next => (action) => {
    if (!action || typeof action !== 'object') {
      return next(action);
    }
    switch (action.type) {
      // TODO: Explain why we are using DDP_CONNECT instead of DDP_CONNECTED?
      case DDP_CONNECT: // restore all subscriptions on the given socketId on re-connect
        return ((result) => {
          const state = store.getState();
          const socketId = action.meta && action.meta.socketId;
          forEach(state.ddp.subscriptions, (sub, id) => {
            // We are only restoring subscriptions that were already requested from the server.
            // However, "pending" will not change their state to "restoring". Instead they will
            // stay "pending" until they're really finished.
            if (
              sub.socketId === socketId && (
                sub.state === DDP_SUBSCRIPTION_STATE__READY ||
                sub.state === DDP_SUBSCRIPTION_STATE__PENDING ||
                sub.state === DDP_SUBSCRIPTION_STATE__RESTORING
              )
            ) {
              store.dispatch({
                type: DDP_SUB,
                payload: {
                  id,
                  name: sub.name,
                  params: sub.params,
                },
                meta: {
                  subId: id,
                  socketId,
                },
              });
            }
          });
          return result;
        })(next(action));
      case DDP_UNSUBSCRIBE:
        return (() => {
          const state = store.getState();
          const sub = state.ddp.subscriptions[action.meta.subId];
          // NOTE: The number of users will only be decreased after "next(action)"
          //       so at this moment it's still taking into account the one which
          //       is resigning.
          if (sub && sub.users === 1) {
            scheduleCleanup(sub.id);
          }
          return next(action);
        })();
      case DDP_ENQUEUE: {
        if (action.meta.type === DDP_SUB) {
          return next({
            ...action,
            meta: {
              ...action.meta,
              subId: action.payload.id,
            },
          });
        }
        return next(action);
      }
      case DDP_SUB:
        return next({
          ...action,
          meta: {
            ...action.meta,
            subId: action.payload.id,
          },
        });
      case DDP_SUBSCRIBE:
        return (() => {
          const state = store.getState();
          const {
            name,
            params,
          } = action.payload;
          const socketId = (action.meta && action.meta.socketId) || DEFAULT_SOCKET_ID;
          const sub = find(state.ddp.subscriptions, s => s.socketId === socketId && s.name === name && EJSON.equals(s.params, params));
          const subId = (sub && sub.id) || ddpClient.nextUniqueId();
          if (sub) {
            scheduleCleanup.cancel(subId);
          } else {
            store.dispatch({
              type: DDP_SUB,
              payload: {
                name,
                params,
                id: subId,
              },
              meta: {
                subId,
                socketId,
              },
            });
          }
          next({
            ...action,
            payload: {
              ...action.payload,
              id: subId,
            },
            meta: {
              subId,
              socketId,
            },
          });
          return subId;
        })();
      case DDP_NOSUB:
        return next({
          ...action,
          meta: {
            subId: action.payload.id,
          },
        });
      default:
        return next(action);
    }
  };
};
