import omit from 'lodash.omit';
import find from 'lodash.find';
import forEach from 'lodash.foreach';
import EJSON from '../ejson';
import decentlyMapValues from '../utils/decentlyMapValues';
import {
  DDP_SUBSCRIPTION_STATE__PENDING,
  DDP_SUBSCRIPTION_STATE__READY,
  DDP_SUBSCRIPTION_STATE__ERROR,
  DDP_SUBSCRIPTION_STATE__RESTORING,

  DDP_CONNECT,
  DDP_SUB,
  DDP_UNSUB,
  DDP_READY,
  DDP_NOSUB,
  DDP_SUBSCRIBE,
  DDP_UNSUBSCRIBE,
} from '../constants';

export const createMiddleware = ddpClient => store => next => (action) => {
  if (!action || typeof action !== 'object') {
    return next(action);
  }
  const timeouts = {};
  const scheduleUnsubscribe = (subId) => {
    if (timeouts[subId]) {
      clearTimeout(timeouts[subId]);
    }
    timeouts[subId] = setTimeout(() => {
      store.dispatch({
        type: DDP_UNSUB,
        payload: {
          msg: 'unsub',
          id: subId,
        },
      });
      delete timeouts[subId];
    }, 30000);
  };
  const cancelUnsubscribe = (subId) => {
    if (timeouts[subId]) {
      clearTimeout(timeouts[subId]);
      delete timeouts[subId];
    }
  };
  switch (action.type) {
    // TODO: Explain why we are using DDP_CONNECT instead of DDP_CONNECTED?
    //
    case DDP_CONNECT: // restore all subscriptions on the given socketId on re-connect
      return ((result) => {
        const state = store.getState();
        const socketId = action.meta && action.meta.socketId;
        forEach(state.ddp.subscriptions, (sub, id) => {
          if (sub.socketId === socketId) {
            store.dispatch({
              type: DDP_SUB,
              payload: {
                msg: 'sub',
                id,
                name: sub.name,
                params: sub.params,
              },
              meta: {
                socketId,
              },
            });
          }
        });
        return result;
      })(next(action));
    case DDP_SUBSCRIBE:
      return (() => {
        const state = store.getState();
        const {
          name,
          params,
        } = action.payload;
        const sub = find(state.ddp.subscriptions,
          s => s.name === name &&
            EJSON.equals(s.params, params));
        const subId = (sub && sub.id) || ddpClient.nextUniqueId();
        if (sub) {
          cancelUnsubscribe(subId);
        } else {
          store.dispatch({
            type: DDP_SUB,
            payload: {
              name,
              params,
              msg: 'sub',
              id: subId,
            },
          });
        }
        next({
          ...action,
          payload: {
            ...action.payload,
            id: subId,
          },
        });
        return subId;
      })();
    case DDP_UNSUBSCRIBE:
      return (() => {
        const state = store.getState();
        const sub = state.ddp.subscriptions[action.payload.id];
        // NOTE: The number of users will only be decreased after "next(action)"
        //       so at this moment it's still taking into account the one which
        //       is resigning.
        if (sub && sub.users === 1) {
          scheduleUnsubscribe(sub.id);
        }
        return next(action);
      })();
    default:
      return next(action);
  }
};

export const createReducer = () => (state = {}, action) => {
  switch (action.type) {
    case DDP_SUBSCRIBE:
      return {
        ...state,
        [action.payload.id]: {
          ...state[action.payload.id],
          users: (state[action.payload.id].users || 0) + 1,
        },
      };
    case DDP_UNSUBSCRIBE:
      return state[action.payload.id]
        ? {
          ...state,
          [action.payload.id]: {
            ...state[action.payload.id],
            users: (state[action.payload.id].users || 0) - 1,
          },
        }
        : state;
    case DDP_SUB:
      return {
        ...state,
        [action.payload.id]: {
          id:     action.payload.id,
          state:  DDP_SUBSCRIPTION_STATE__PENDING,
          name:   action.payload.name,
          params: action.payload.params,
          ...action.meta && action.meta.socketId && {
            socketId: action.meta.socketId,
          },
        },
      };
    case DDP_UNSUB:
      return omit(state, [action.payload.id]);
    case DDP_NOSUB:
      // NOTE: If the subscription was deleted in the meantime, this will
      //       have completely no effect.
      return decentlyMapValues(state, (sub, id) => {
        if (action.payload.id === id) {
          return {
            ...sub,
            state: DDP_SUBSCRIPTION_STATE__ERROR,
            error: action.payload.error,
          };
        }
        return sub;
      });
    case DDP_READY:
      // NOTE: If the subscription was deleted in the meantime, this will
      //       have completely no effect.
      return decentlyMapValues(state, (sub, id) => {
        if (action.payload.subs.indexOf(id) >= 0) {
          return {
            ...sub,
            state: DDP_SUBSCRIPTION_STATE__READY,
          };
        }
        return sub;
      });
    case DDP_CONNECT:
      return (() => {
        const socketId = action.meta && action.meta.socketId;
        return decentlyMapValues(state, (sub) => {
          if (sub.socketId === socketId && (sub.state === DDP_SUBSCRIPTION_STATE__READY || sub.state === DDP_SUBSCRIPTION_STATE__ERROR)) {
            return {
              ...sub,
              state: DDP_SUBSCRIPTION_STATE__RESTORING,
            };
          }
          return sub;
        });
      })();
    default:
      return state;
  }
};

