import carefullyMapValues from '../../utils/carefullyMapValues';
import {
  DEFAULT_SOCKET_ID,

  DDP_QUERY_STATE__INITIAL,
  DDP_QUERY_STATE__QUEUED,
  DDP_QUERY_STATE__PENDING,
  DDP_QUERY_STATE__READY,
  DDP_QUERY_STATE__RESTORING,

  DDP_METHOD,
  DDP_ENQUEUE,
  DDP_CONNECT,
  DDP_RESULT,

  DDP_QUERY_REQUEST,
  DDP_QUERY_RELEASE,
  DDP_QUERY_REFETCH,

  DDP_QUERY_CREATE,
  DDP_QUERY_DELETE,
  DDP_QUERY_UPDATE,
} from '../../constants';

export const createReducer = () => (state = {}, action) => {
  switch (action.type) {
    case DDP_QUERY_REQUEST:
      return {
        ...state,
        [action.meta.queryId]: {
          ...state[action.meta.queryId],
          users: (state[action.meta.queryId].users || 0) + 1,
        },
      };
    case DDP_QUERY_RELEASE:
      return state[action.meta.queryId]
        ? {
          ...state,
          [action.meta.queryId]: {
            ...state[action.meta.queryId],
            users: (state[action.meta.queryId].users || 0) - 1,
          },
        }
        : state;
    case DDP_QUERY_REFETCH:
      return (() => {
        if (action.meta.queryId) {
          return {
            ...state,
            [action.meta.queryId]: {
              ...state[action.meta.queryId],
              state: DDP_QUERY_STATE__RESTORING,
            },
          };
        }
        return state;
      })();
    case DDP_ENQUEUE:
      return (() => {
        if (action.meta.type === DDP_METHOD && action.meta.queryId) {
          const id = action.meta.queryId;
          const query = state[id];
          if (query && query.state === DDP_QUERY_STATE__INITIAL) {
            return {
              ...state,
              [id]: {
                ...state[id],
                state: DDP_QUERY_STATE__QUEUED,
              },
            };
          }
          return state;
        }
        return state;
      })();
    case DDP_METHOD:
      return (() => {
        if (action.meta.queryId) {
          const id = action.meta.queryId;
          const query = state[id];
          if (
            query && (
              query.state === DDP_QUERY_STATE__INITIAL ||
              query.state === DDP_QUERY_STATE__QUEUED
            )
          ) {
            return {
              ...state,
              [id]: {
                ...state[id],
                state: DDP_QUERY_STATE__PENDING,
              },
            };
          }
          return state;
        }
        return state;
      })();
    case DDP_QUERY_DELETE:
      return carefullyMapValues(state, (query, id, remove) => {
        if (id === action.meta.queryId) {
          return remove(id);
        }
        return query;
      });
    case DDP_QUERY_CREATE:
      return {
        ...state,
        [action.meta.queryId]: {
          ...state[action.meta.queryId],
          id:       action.meta.queryId,
          state:    DDP_QUERY_STATE__INITIAL,
          name:     action.payload.name,
          params:   action.payload.params,
          socketId: (action.meta && action.meta.socketId) || DEFAULT_SOCKET_ID,
        },
      };
    case DDP_QUERY_UPDATE:
      return {
        ...state,
        [action.meta.queryId]: {
          ...state[action.meta.queryId],
          state: DDP_QUERY_STATE__READY,
          entities: action.payload.entities,
        },
      };
    case DDP_RESULT:
      return (() => {
        if (action.meta && action.meta.queryId) {
          return carefullyMapValues(state, (query, id) => {
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
        return carefullyMapValues(state, (query) => {
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
