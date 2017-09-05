
import omit from 'lodash.omit';
import find from 'lodash.find';
import forEach from 'lodash.foreach';
import mapValues from 'lodash.mapvalues';
import EJSON from '../ejson';
import decentlyMapValues from '../utils/decentlyMapValues';
import {
  DDP_QUERY_STATE__PENDING,
  DDP_QUERY_STATE__READY,
  DDP_QUERY_STATE__RESTORING,

  DDP_CONNECT,
  DDP_METHOD,
  DDP_RESULT,

  DDP_QUERY_REQUEST,
  DDP_QUERY_RELEASE,
  DDP_QUERY_REFETCH,

  DDP_QUERY_CREATE,
  DDP_QUERY_DELETE,
  DDP_QUERY_UPDATE,
} from '../constants';

// const withCollections = (state) => {
//   if (state.result && state.result.$collections) {
//     return {
//       ...state,
//       collections: mapValues(state.result.$collections, documents => Object.keys(documents)),
//     };
//   }
//   return state;
// };

const getMethodIds = (state, id) => {
  const methodIds = [];
  forEach(state, (queryId, methodId) => {
    if (queryId === id) {
      methodIds.push(methodId);
    }
  });
  return methodIds;
};

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
      const state = store.getState();
      const collections = state.ddp.queries[id].collection;
      store.dispatch({
        type: DDP_QUERY_DELETE,
        payload: {
          id,
        },
        ...collections && {
          meta: {
            collections,
          },
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
    case DDP_QUERY_REQUEST:
      return (() => {
        const state = store.getState();
        const {
          name,
          params,
        } = action.payload;
        const query = find(state.ddp.queries, x => x.name === name && EJSON.equals(x.params, params));
        const id = (query && query.id) || ddpClient.nextUniqueId();
        if (query) {
          cancelCleanup(id);
        } else {
          store.dispatch({
            type: DDP_QUERY_CREATE,
            payload: {
              id,
              name,
              params,
            },
          });
          // NOTE: Theoretically, there can me multiple methods calls to evaluate this query.
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
    case DDP_QUERY_REFETCH:
      return (() => {
        const id = action.payload.id;
        const state = store.getState();
        const query = state.ddp.queries[id];
        if (query && query.users) {
          store.dispatch({
            type: DDP_METHOD,
            payload: {
              method: query.name,
              params: query.params,
            },
            meta: {
              queryId: id,
            },
          });
        }
        return next(action);
      })();
    case DDP_RESULT:
      return (() => {
        const state = store.getState();
        const queryId = state.ddp.queries.byMethodId[action.payload.id];
        if (queryId) {
          const methodIds = getMethodIds(state, queryId);
          const result = next({
            ...action,
            meta: {
              ...action.meta,
              queryId,
            },
          });
          if (methodIds.length === 1) { // this is the last pending method
            store.dispatch({
              type: DDP_QUERY_UPDATE,
              payload: {
                id: queryId,
              },
            });
          }
          return result;
        }
        return next(action);
      })();
    case DDP_QUERY_RELEASE:
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
    case DDP_QUERY_REQUEST:
      return {
        ...state,
        [action.payload.id]: {
          ...state[action.payload.id],
          users: (state[action.payload.id].users || 0) + 1,
        },
      };
    case DDP_QUERY_RELEASE:
      return state[action.payload.id]
        ? {
          ...state,
          [action.payload.id]: {
            ...state[action.payload.id],
            users: (state[action.payload.id].users || 0) - 1,
          },
        }
        : state;
    case DDP_QUERY_REFETCH:
      return (() => {
        if (action.payload.id) {
          return {
            ...state,
            [action.payload.id]: {
              ...state[action.payload.id],
              state: DDP_QUERY_STATE__RESTORING,
            },
          };
        }
        return state;
      })();
    case DDP_QUERY_DELETE:
      return decentlyMapValues(state, (query, id, remove) => {
        if (id === action.payload.id) {
          remove(id);
        }
      });
    case DDP_QUERY_CREATE:
      return {
        ...state,
        [action.payload.id]: {
          id:      action.payload.id,
          state:   DDP_QUERY_STATE__PENDING,
          name:    action.payload.name,
          params:  action.payload.params,
        },
      };
    case DDP_QUERY_UPDATE:
      return {
        ...state,
        [action.payload.id]: {
          ...state[action.payload.id],
          state: DDP_QUERY_STATE__READY,
        },
      };
    case DDP_RESULT:
      return (() => {
        if (action.meta && action.meta.queryId) {
          const methodId = action.payload.id;
          return decentlyMapValues(state, (query, id) => {
            if (action.meta.queryId === id) {
              if (action.payload.error) {
                return {
                  ...query,
                  errors: {
                    ...query.errors,
                    [methodId]: action.payload.error,
                  },
                };
              }
              return {
                ...query,
                results: {
                  ...query.results,
                  [methodId]: action.payload.result,
                },
              };
            }
            return query;
          });
        }
        return state;
      })();
    case DDP_CONNECT:
      return decentlyMapValues(state, (query) => {
        if (query.state === DDP_QUERY_STATE__READY) {
          return {
            ...query,
            state: DDP_QUERY_STATE__RESTORING,
          };
        }
        return query;
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
    case DDP_QUERY_REFETCH:
      // NOTE: This is only useful if user triggers "refetch" while query is still pending.
      return (() => {
        const methodIds = [];
        forEach(state, (queryId, methodId) => {
          if (queryId === action.payload.id) {
            methodIds.push(methodId);
          }
        });
        if (methodIds.length > 0) {
          return omit(state, methodIds);
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

