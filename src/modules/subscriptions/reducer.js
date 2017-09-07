import omit from 'lodash.omit';
import carefullyMapValues from '../../utils/carefullyMapValues';
import {
  DDP_SUBSCRIPTION_STATE__PENDING,
  DDP_SUBSCRIPTION_STATE__READY,
  DDP_SUBSCRIPTION_STATE__RESTORING,

  DDP_CONNECT,
  DDP_SUB,
  DDP_UNSUB,
  DDP_READY,
  DDP_NOSUB,
  DDP_SUBSCRIBE,
  DDP_UNSUBSCRIBE,
} from '../../constants';

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
          ...action.meta && { meta: action.meta },
        },
      };
    case DDP_UNSUB:
      return omit(state, [action.payload.id]);
    case DDP_NOSUB:
      // NOTE: If the subscription was deleted in the meantime, this will
      //       have completely no effect.
      return carefullyMapValues(state, (sub, id) => {
        if (action.payload.id === id) {
          return {
            ...sub,
            state: DDP_SUBSCRIPTION_STATE__READY,
            error: action.payload.error,
          };
        }
        return sub;
      });
    case DDP_READY:
      // NOTE: If the subscription was deleted in the meantime, this will
      //       have completely no effect.
      return carefullyMapValues(state, (sub, id) => {
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
        return carefullyMapValues(state, (sub) => {
          if (sub.meta && sub.meta.socketId === socketId && sub.state === DDP_SUBSCRIPTION_STATE__READY) {
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

