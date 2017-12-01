import find from 'lodash/find';
import forEach from 'lodash/forEach';
import EJSON from '../../ejson';
import {
  DEFAULT_SOCKET_ID,

  DDP_QUERY_STATE__READY,
  DDP_QUERY_STATE__PENDING,
  DDP_QUERY_STATE__RESTORING,

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

/**
 * Create middleware for the given ddpClient.
 * @param {DDPClient} ddpClient
 */
export const createMiddleware = ddpClient => (store) => {
  const scheduleCleanup = createDelayedTask((queryId) => {
    const state = store.getState();
    const query = state.ddp.queries[queryId];
    store.dispatch({
      type: DDP_QUERY_DELETE,
      payload: {
        entities: query.entities,
      },
      meta: {
        queryId,
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
            if (
              // NOTE: It's important to include "restoring" state as well,
              //       because at this point reducer may already change query
              //       state to restoring ...
              query.socketId === socketId && (
                query.state === DDP_QUERY_STATE__READY ||
                query.state === DDP_QUERY_STATE__PENDING ||
                query.state === DDP_QUERY_STATE__RESTORING
              )
            ) {
              store.dispatch(callMethod(query.name, query.params, { queryId, socketId }));
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
          const queryId = (query && query.id) || ddpClient.nextUniqueId();
          if (query) {
            scheduleCleanup.cancel(queryId);
          } else {
            store.dispatch({
              type: DDP_QUERY_CREATE,
              payload: {
                name,
                params,
              },
              meta: {
                queryId,
                socketId,
              },
            });
            // NOTE: Theoretically, there can me multiple methods calls to evaluate this query.
            store.dispatch(callMethod(name, params, { socketId, queryId }));
          }
          next({
            ...action,
            meta: {
              ...action.meta,
              queryId,
            },
          });
          return queryId;
        })();
      case DDP_QUERY_REFETCH:
        return (() => {
          const queryId = action.meta.queryId;
          const state = store.getState();
          const query = state.ddp.queries[queryId];
          // TODO: Explain why we want users to be positive.
          if (query && query.users) {
            const socketId = query.socketId;
            store.dispatch(callMethod(query.name, query.params, { queryId, socketId }));
          }
          return next(action);
        })();
      case DDP_RESULT:
        return (() => {
          const state = store.getState();
          const queryId = action.meta && action.meta.queryId;
          if (queryId) {
            const query = state.ddp.queries[queryId];
            const result = next({
              ...action,
              meta: {
                ...action.meta,
                queryId,
              },
            });
            const update = {
              type: DDP_QUERY_UPDATE,
              payload: {},
              meta: { queryId },
            };
            if (!action.payload.error && action.payload.result && typeof action.payload.result === 'object') {
              update.payload.entities = ddpClient.extractEntities(
                action.payload.result,
                {
                  name: query.name,
                },
              );
            }
            if (query && query.entities) {
              update.payload.oldEntities = query.entities;
            }
            store.dispatch(update);
            return result;
          }
          return next(action);
        })();
      case DDP_QUERY_RELEASE:
        return (() => {
          const state = store.getState();
          const query = state.ddp.queries[action.meta.queryId];
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
