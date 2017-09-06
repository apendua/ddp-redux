import find from 'lodash.find';
import forEach from 'lodash.foreach';
import EJSON from '../../ejson';
import {
  DEFAULT_SOCKET_ID,

  DDP_CONNECT,
  DDP_RESULT,

  DDP_QUERY_REQUEST,
  DDP_QUERY_RELEASE,
  DDP_QUERY_REFETCH,

  DDP_QUERY_CREATE,
  DDP_QUERY_DELETE,
  DDP_QUERY_UPDATE,
} from '../../constants';
import {
  callMethod,
} from '../../actions';
import createDelayedTask from '../../utils/createDelayedTask';

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

/**
 * Create middleware for the given ddpClient.
 * @param {DDPClient} ddpClient
 */
export const createMiddleware = ddpClient => (store) => {
  const scheduleCleanup = createDelayedTask((id) => {
    const state = store.getState();
    const collections = state.ddp.queries[id].collections;
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
  }, {
    getTimeout: () => ddpClient.getQueryCleanupTimeout(),
  });
  return next => (action) => {
    if (!action || typeof action !== 'object') {
      return next(action);
    }
    switch (action.type) {
      case DDP_CONNECT: // restore all queries on re-connect
        return ((result) => {
          const socketId = action.meta && action.meta.socketId;
          const state = store.getState();
          forEach(state.ddp.queries, (query, queryId) => {
            if (query.socketId === socketId) {
              store.dispatch(callMethod(query.name, query.params, {
                queryId,
                socketId,
              }));
            }
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
          const socketId = (action.meta && action.meta.socketId) || DEFAULT_SOCKET_ID;
          const query = find(state.ddp.queries, x => x.socketId === socketId && x.name === name && EJSON.equals(x.params, params));
          const id = (query && query.id) || ddpClient.nextUniqueId();
          if (query) {
            scheduleCleanup.cancel(id);
          } else {
            store.dispatch({
              type: DDP_QUERY_CREATE,
              payload: {
                id,
                name,
                params,
                socketId,
              },
            });
            // NOTE: Theoretically, there can me multiple methods calls to evaluate this query.
            store.dispatch(callMethod(name, params, {
              socketId,
              queryId: id,
            }));
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
          const queryId = action.payload.id;
          const state = store.getState();
          const query = state.ddp.queries[queryId];
          if (query && query.users) {
            const socketId = query.socketId;
            store.dispatch(callMethod(query.name, query.params, {
              queryId,
              socketId,
            }));
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
};
