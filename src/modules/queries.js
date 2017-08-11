
import omit from 'lodash.omit';
import find from 'lodash.find';
import forEach from 'lodash.foreach';
import mapValues from 'lodash.mapvalues';
import EJSON from '../ejson';
import {
  DDP_QUERY_STATE__PENDING,
  DDP_QUERY_STATE__READY,
  DDP_QUERY_STATE__ERROR,
  DDP_QUERY_STATE__RESTORING,
  DDP_QUERY_STATE__UPDATING,

  DDP_CONNECT,
  DDP_METHOD,
  DDP_REQUEST,
  DDP_RELEASE,
  DDP_CREATE_QUERY,
  DDP_DELETE_QUERY,
  DDP_UPDATE_QUERY,
} from '../constants';

export const createMiddleware = ddpClient => store => next => (action) => {
  if (!action || typeof action !== 'object') {
    return next(action);
  }
  const timeouts = {};
  const scheduleCleanup = (id) => {
    if (timeouts[id]) {
      clearTimeout(timeouts[id]);
    }
    timeouts[id] = setTimeout(() => {
      store.dispatch({
        type: DDP_DELETE_QUERY,
        payload: {
          id,
        },
      });
      delete timeouts[id];
    }, 30000);
  };
  const cancelCleanup = (id) => {
    if (timeouts[id]) {
      clearTimeout(timeouts[id]);
      delete timeouts[id];
    }
  };
  switch (action.type) {
    case DDP_CONNECT: // Restore all queries on re-connect
      return ((result) => {
        const state = store.getState();
        forEach(state.ddp.queries, ({ name, params }, id) => {
          store.dispatch({
            type: DDP_METHOD,
            payload: {
              id,
              params,
              method: name,
              msg: 'method',
            },
            meta: {
              queryId: 0,
            },
          });
        });
        return result;
      })(next(action));
    case DDP_REQUEST:
      return (() => {
        const state = store.getState();
        const {
          name,
          params,
        } = action.payload;
        const query = find(state.ddp.queries,
          s => s.name === name &&
            EJSON.equals(s.params, params));
        const id = (query && query.id) || ddpClient.nextUniqueId();
        cancelCleanup(id);
        if (query) {
          cancelCleanup(id);
        } else {
          store.dispatch({
            type: '@DDP/OUT/SUB',
            payload: {
              name,
              params,
              msg: 'query',
              id,
            },
          });
        }
        next({
          ...action,
          payload: {
            ...action.payload,
            id,
          },
        });
        return id;
      })();
    case DDP_RELEASE:
      return (() => {
        const state = store.getState();
        const sub = state.ddp.queries[action.payload.id];
        // NOTE: The number of users will only be decreased after "next(action)"
        //       so at this moment it's still taking into account the one which
        //       is resigning.
        if (sub && sub.users === 1) {
          scheduleCleanup(sub.id);
        }
        return next(action);
      })();
    default:
      return next(action);
  }
};

export const createReducer = () => (state = {}, action) => {
  switch (action.type) {
    case DDP_REQUEST:
      return {
        ...state,
        [action.payload.id]: {
          ...state[action.payload.id],
          users: (state[action.payload.id].users || 0) + 1,
        },
      };
    case DDP_RELEASE:
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
          state:  DDP_QUERY_STATE__PENDING,
          name:   action.payload.name,
          params: action.payload.params,
        },
      };
    case DDP_UNSUB:
      return omit(state, [action.payload.id]);
    case DDP_NOSUB:
      // NOTE: If the subscription was deleted in the meantime, this will
      //       have completely no effect.
      return mapValues(state, (sub, id) => {
        if (action.payload.id === id) {
          return {
            ...sub,
            state: DDP_QUERY_STATE__ERROR,
            error: action.payload.error,
          };
        }
        return sub;
      });
    case DDP_READY:
      // NOTE: If the subscription was deleted in the meantime, this will
      //       have completely no effect.
      return mapValues(state, (sub, id) => {
        if (action.payload.subs.indexOf(id) >= 0) {
          return {
            ...sub,
            state: DDP_QUERY_STATE__READY,
          };
        }
        return sub;
      });
    case DDP_CONNECT:
      return mapValues(state, (sub) => {
        if (
          sub.state === DDP_QUERY_STATE__READY ||
          sub.state === DDP_QUERY_STATE__ERROR
        ) {
          return {
            ...sub,
            state: DDP_QUERY_STATE__RESTORING,
          };
        }
        return sub;
      });
    default:
      return state;
  }
};

