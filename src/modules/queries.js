
import omit from 'lodash.omit';
import find from 'lodash.find';
import forEach from 'lodash.foreach';
import EJSON from '../ejson';
import decentlyMapValues from '../utils/decentlyMapValues';
import {
  DDP_QUERY_STATE__PENDING,
  DDP_QUERY_STATE__READY,
  DDP_QUERY_STATE__ERROR,
  DDP_QUERY_STATE__RESTORING,
  DDP_QUERY_STATE__UPDATING,

  DDP_CONNECT,
  DDP_METHOD,
  DDP_RESULT,
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
              params,
              method: name,
            },
            meta: {
              queryId: id,
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
          x => x.name === name &&
            EJSON.equals(x.params, params));
        const id = (query && query.id) || ddpClient.nextUniqueId();
        if (query) {
          cancelCleanup(id);
        } else {
          store.dispatch({
            type: DDP_METHOD,
            payload: {
              params,
              method: name,
            },
            meta: {
              queryId: id,
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
    case DDP_RESULT:
      return (() => {
        const state = store.getState();
        const queryId = state.ddp.queries.byMethodId[action.payload.id];
        if (queryId) {
          return next({
            ...action,
            meta: {
              ...action.meta,
              queryId,
            },
          });
        }
        return next(action);
      })();
    case DDP_RELEASE:
      return (() => {
        const state = store.getState();
        const query = state.ddp.queries[action.payload.id];
        // NOTE: The number of users will only be decreased after "next(action)"
        //       so at this moment it's still taking into account the one which
        //       is resigning.
        if (query && query.users === 1) {
          scheduleCleanup(query.id);
        }
        return next(action);
      })();
    default:
      return next(action);
  }
};

export const createPrimaryReducer = () => (state = {}, action) => {
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
    case DDP_METHOD:
      return (() => {
        if (action.meta.queryId) {
          return {
            ...state,
            [action.meta.queryId]: {
              id:     action.meta.queryId,
              state:  DDP_QUERY_STATE__PENDING,
              name:   action.payload.method,
              params: action.payload.params,
            },
          };
        }
        return state;
      })();
    case DDP_RESULT:
      return (() => {
        if (action.meta && action.meta.queryId) {
          return decentlyMapValues(state, (query, id) => {
            if (action.meta.queryId === id) {
              if (action.payload.error) {
                return {
                  ...query,
                  state: DDP_QUERY_STATE__ERROR,
                  error: action.payload.error,
                };
              }
              return {
                ...query,
                state: DDP_QUERY_STATE__READY,
                result: action.payload.result,
              };
            }
            return query;
          });
        }
        return state;
      })();
    case DDP_CONNECT:
      return decentlyMapValues(state, (sub) => {
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

export const createSecondaryReducer = () => (state = {}, action) => {
  switch (action.type) {
    case DDP_METHOD:
      return (() => {
        if (action.meta.queryId) {
          return {
            ...state,
            [action.payload.id]: action.meta.queryId,
          };
        }
        return state;
      })();
    case DDP_RESULT:
      return (() => {
        if (state[action.payload.id]) {
          return omit(state, action.payload.id);
        }
        return state;
      })();
    default:
      return state;
  }
};

export const createReducer = () => (state = {
  byId: {},
  byMethodId: {},
}, action) => {
  // TODO: Optimize
  const primary = createPrimaryReducer();
  const secondary = createSecondaryReducer();
  return {
    byId: primary(state.byId, action),
    byMethodId: secondary(state.byMethodId, action),
  };
};

