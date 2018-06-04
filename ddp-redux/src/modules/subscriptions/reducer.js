import omit from 'lodash/omit';
import carefullyMapValues from '../../utils/carefullyMapValues';
import {
  DEFAULT_SOCKET_ID,

  DDP_SUBSCRIPTION_STATE__INITIAL,
  DDP_SUBSCRIPTION_STATE__QUEUED,
  DDP_SUBSCRIPTION_STATE__PENDING,
  DDP_SUBSCRIPTION_STATE__READY,
  DDP_SUBSCRIPTION_STATE__RESTORING,

  DDP_ENQUEUE,
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
      return (() => {
        const sub = state[action.meta.subId];
        return {
          ...state,
          [action.meta.subId]: {
            id: (sub && sub.id) || action.meta.subId,
            state: (sub && sub.state) || DDP_SUBSCRIPTION_STATE__INITIAL,
            name: (sub && sub.name) || action.payload.name,
            params: (sub && sub.params) || action.payload.params,
            users: ((sub && sub.users) || 0) + 1,
            socketId: (sub && sub.socketId) || (action.meta && action.meta.socketId) || DEFAULT_SOCKET_ID,
          },
        };
      })();
    case DDP_UNSUBSCRIBE:
      return state[action.meta.subId]
        ? {
          ...state,
          [action.meta.subId]: {
            ...state[action.meta.subId],
            users: (state[action.meta.subId].users || 0) - 1,
          },
        }
        : state;
    case DDP_ENQUEUE: {
      const { subId } = action.meta;
      if (subId) {
        const sub = state[subId];
        if (sub) {
          switch (sub.state) {
            case DDP_SUBSCRIPTION_STATE__INITIAL:
              return {
                ...state,
                [subId]: {
                  ...sub,
                  state: DDP_SUBSCRIPTION_STATE__QUEUED,
                },
              };
            default:
              return state;
          }
        }
      }
      return state;
    }
    case DDP_SUB: {
      if (action.meta.subId) {
        const { subId } = action.meta;
        const query = state[subId];
        if (query) {
          switch (query.state) {
            case DDP_SUBSCRIPTION_STATE__INITIAL:
            case DDP_SUBSCRIPTION_STATE__QUEUED:
              return {
                ...state,
                [subId]: {
                  ...query,
                  state: DDP_SUBSCRIPTION_STATE__PENDING,
                },
              };
            case DDP_SUBSCRIPTION_STATE__READY:
              return {
                ...state,
                [subId]: {
                  ...query,
                  state: DDP_SUBSCRIPTION_STATE__RESTORING,
                },
              };
            default:
              return state;
          }
        }
      }
      return state;
    }
    case DDP_UNSUB:
      return omit(state, [action.meta.subId]);
    case DDP_NOSUB:
      // NOTE: If the subscription was deleted in the meantime, this will
      //       have completely no effect.
      return carefullyMapValues(state, (sub, id) => {
        if (action.meta.subId === id) {
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

