import omit from 'lodash.omit';
import find from 'lodash.find';
import mapValues from 'lodash.mapvalues';
import EJSON from '../ejson';
import {
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
  switch (action.type) {
    case DDP_SUBSCRIBE:
      return (() => {
        const state = store.getState();
        const sub = find(state.subscriptions,
          s => s.name === action.payload.name &&
            EJSON.equals(s.params, action.payload.params));
        const subId = (sub && sub.id) || ddpClient.nextUniqueId();
        if (!sub) {
          store.dispatch({
            type: '@DDP/OUT/SUB',
            payload: {
              msg: 'sub',
              id: subId,
              name: action.payload.name,
              params: action.payload.params,
            },
          });
        }
        next(action);
        return subId;
      })();
    case DDP_UNSUBSCRIBE:
      return (() => {
        const result = next(action);
        const state = store.getState();
        const sub = state.subscriptions[action.payload.id];
        if (sub && sub.users === 0) {
          store.dispatch({
            type: '@DDP/OUT/UNSUB',
            payload: {
              msg: 'unsub',
              id: sub.id,
            },
          });
        }
        return result;
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
      return {
        ...state,
        [action.payload.id]: {
          ...state[action.payload.id],
          users: (state[action.payload.id].users || 0) - 1,
        },
      };
    case DDP_SUB:
      return {
        ...state,
        [action.payload.id]: {
          state:  'pending',
          name:   action.payload.name,
          params: action.payload.params,
        },
      };
    case DDP_UNSUB:
      return omit(state, [action.payload.id]);
    case DDP_NOSUB:
      return {
        ...state,
        [action.payload.id]: {
          ...state[action.payload.id],
          state: 'error',
          error: action.payload.error,
        },
      };
    case DDP_READY:
      return mapValues(state, (sub, id) => {
        if (action.payload.subs.indexOf(id) >= 0) {
          return {
            ...sub,
            state: 'ready',
          };
        }
        return sub;
      });
    default:
      return state;
  }
};

