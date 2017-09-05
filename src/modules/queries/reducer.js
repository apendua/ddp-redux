import omit from 'lodash.omit';
import forEach from 'lodash.foreach';
import decentlyMapValues from '../../utils/decentlyMapValues';
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
} from '../../constants';

// const withCollections = (state) => {
//   if (state.result && state.result.$collections) {
//     return {
//       ...state,
//       collections: mapValues(state.result.$collections, documents => Object.keys(documents)),
//     };
//   }
//   return state;
// };

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

