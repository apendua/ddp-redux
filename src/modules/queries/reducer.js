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
          return remove(id);
        }
        return query;
      });
    case DDP_QUERY_CREATE:
      return {
        ...state,
        [action.payload.id]: {
          id:      action.payload.id,
          state:   DDP_QUERY_STATE__PENDING,
          name:    action.payload.name,
          params:  action.payload.params,
          ...action.meta && action.meta.socketId && {
            socketId: action.meta.socketId,
          },
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
          return decentlyMapValues(state, (query, id) => {
            if (action.meta.queryId === id) {
              if (action.payload.error) {
                return {
                  ...query,
                  error: action.payload.error,
                };
              }
              return {
                ...query,
                result: action.payload.result,
              };
            }
            return query;
          });
        }
        return state;
      })();
    case DDP_CONNECT:
      return (() => {
        const socketId = action.meta && action.meta.socketId;
        return decentlyMapValues(state, (query) => {
          // NOTE: If the state was pending, it should remain pending
          if (query.socketId === socketId && query.state === DDP_QUERY_STATE__READY) {
            return {
              ...query,
              state: DDP_QUERY_STATE__RESTORING,
            };
          }
          return query;
        });
      })();
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
      return decentlyMapValues(state, (queryId, methodId, remove) => {
        if (queryId === action.payload.id) {
          return remove(methodId);
        }
        return queryId;
      });
    default:
      return state;
  }
};

export const createReducer = () => (state = {}, action) => {
  // TODO: Optimize
  const primary = createPrimaryReducer();
  const secondary = createSecondaryReducer();
  return {
    byId: primary(state.byId, action),
    byMethodId: secondary(state.byMethodId, action),
  };
};

