import forEach from 'lodash/forEach';
import {
  DEFAULT_SOCKET_ID,

  DDP_CONNECTED,
  DDP_RESULT,

  DDP_QUERY_REQUEST,
  DDP_QUERY_RELEASE,
  DDP_QUERY_REFETCH,

  DDP_QUERY_CREATE,
  DDP_QUERY_DELETE,
  DDP_QUERY_UPDATE,

  DDP_STATE__OBSOLETE,
  DDP_STATE__CANCELED,
} from '../../constants';
import createDelayedTask from '../../utils/createDelayedTask';
import {
  findQuery,
} from './selectors';
import {
  queryRefetch,
} from '../../actions';

const setQueryId = (action, queryId) => ({
  ...action,
  meta: {
    ...action.meta,
    queryId,
  },
});

const createQuery = (queryId, name, params, properties) => ({
  type: DDP_QUERY_CREATE,
  payload: {
    name,
    params,
    properties,
  },
  meta: {
    queryId,
  },
});

const deleteQuery = queryId => (dispatch, getState) => {
  const state = getState();
  const query = state.ddp.queries[queryId];
  if (!query) {
    return;
  }
  dispatch({
    type: DDP_QUERY_DELETE,
    payload: {
      entities: query.entities,
    },
    meta: {
      queryId,
    },
  });
};

/**
 * Create middleware for the given ddpClient.
 * @param {DDPClient} ddpClient
 */
export const createMiddleware = ddpClient => (store) => {
  const scheduleCleanup = createDelayedTask((queryId) => {
    store.dispatch(deleteQuery(queryId));
  }, {
    getTimeout: () => ddpClient.getQueryCleanupTimeout(),
  });
  return next => (action) => {
    if (!action || typeof action !== 'object') {
      return next(action);
    }
    switch (action.type) {
      case DDP_CONNECTED: {
        const result = next(action);
        const socketId = action.meta && action.meta.socketId;
        const state = store.getState();
        forEach(state.ddp.queries, (query, queryId) => {
          const querySocketId = query.properties &&
                                query.properties.socketId;
          if (
            querySocketId === socketId && (
              query.state === DDP_STATE__OBSOLETE ||
              query.state === DDP_STATE__CANCELED
            )
          ) {
            // NOTE: We are forcing query re-fetch here, not trying to invoke the "fetch" method directly.
            store.dispatch(queryRefetch(queryId));
          }
        });
        return result;
      }
      case DDP_QUERY_RELEASE: {
        const state = store.getState();
        const query = state.ddp.queries[action.meta.queryId];
        // NOTE: The number of users will only be decreased after "next(action)"
        //       so at this moment it's still taking into account the one which
        //       is resigning.
        if (query && query.users === 1) {
          scheduleCleanup(query.id);
        }
        return next(action);
      }
      case DDP_QUERY_REQUEST: {
        const state = store.getState();
        const {
          name,
          params,
        } = action.payload;
        let {
          properties,
        } = action.payload;
        properties = {
          socketId: DEFAULT_SOCKET_ID,
          ...properties,
        };
        const query = findQuery(state.ddp.queries, name, params, properties);
        const queryId = query ? query.id : ddpClient.nextUniqueId();

        next(setQueryId(action, queryId));

        if (query) {
          scheduleCleanup.cancel(queryId);
        } else {
          store.dispatch(createQuery(queryId, name, params, properties));
        }
        // NOTE: Theoretically, there can me multiple methods calls to evaluate this query.
        if (!query ||
             query.state === DDP_STATE__OBSOLETE ||
             query.state === DDP_STATE__CANCELED) {
          store.dispatch(
            ddpClient.fetch(name, params, {
              ...properties,
              queryId,
            }),
          );
        }
        return queryId;
      }
      case DDP_QUERY_REFETCH: {
        const result = next(action);
        const queryId = action.meta.queryId;
        const state = store.getState();
        const query = state.ddp.queries[queryId];
        // NOTE: If query has no users, the reducer will set the query state to "obsolete",
        //       and the next time it will be requested it will force re-fetch.
        if (query && query.users > 0) {
          store.dispatch(
            ddpClient.fetch(query.name, query.params, {
              ...query.properties,
              queryId,
            }),
          );
        }
        return result;
      }
      case DDP_RESULT: {
        const state = store.getState();
        const queryId = action.meta && action.meta.queryId;
        if (queryId) {
          const query = state.ddp.queries[queryId];
          const result = next(setQueryId(action, queryId));
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
      }
      default:
        return next(action);
    }
  };
};
