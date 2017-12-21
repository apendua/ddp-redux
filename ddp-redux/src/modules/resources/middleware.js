import forEach from 'lodash/forEach';
import {
  DEFAULT_SOCKET_ID,

  DDP_CONNECTED,

  DDP_RESOURCE_REQUEST,
  DDP_RESOURCE_RELEASE,
  DDP_RESOURCE_REFRESH,

  DDP_RESOURCE_CREATE,
  DDP_RESOURCE_DELETE,

  DDP_STATE__OBSOLETE,
  DDP_STATE__CANCELED,
} from '../../constants';
import createDelayedTask from '../../utils/createDelayedTask';
import {
  findResource,
} from './selectors';

/**
 * Create resources middleware.
 */
export const createMiddleware = ({
  fetchResource,
  getCleanupTimeout,
  nextUniqueId,
}) => (store) => {
  const getResources = () => {
    const state = store.getState();
    return state.ddp &&
           state.ddp.resources;
  }

  const setResourceMeta = (action, resourceId) => ({
    ...action,
    meta: {
      ...action.meta,
      resourceId,
    },
  });

  const createResource = (resourceId, name, params, properties, meta) => ({
    type: DDP_RESOURCE_CREATE,
    payload: {
      name,
      params,
      properties,
    },
    meta: {
      ...meta,
      resourceId,
    },
  });

  const deleteResource = resourceId => ({
    type: DDP_RESOURCE_DELETE,
    meta: {
      resourceId,
    },
  });

  const refreshResource = resourceId => ({
    type: DDP_RESOURCE_REFRESH,
    meta: {
      resourceId,
    },
  });

  const scheduleCleanup = createDelayedTask((resourceId) => {
    store.dispatch(deleteResource(resourceId));
  }, {
    getTimeout: getCleanupTimeout,
  });
  return next => (action) => {
    if (!action || typeof action !== 'object') {
      return next(action);
    }
    if (action.type === DDP_CONNECTED) {
      const result = next(action);
      const socketId = action.meta && action.meta.socketId;
      forEach(getResources(), (resource, resourceId) => {
        const resourceSocketId = resource.properties &&
                                 resource.properties.socketId;
        if (
          resourceSocketId === socketId && (
            resource.state === DDP_STATE__OBSOLETE ||
            resource.state === DDP_STATE__CANCELED
          )
        ) {
          store.dispatch(refreshResource(resourceId));
        }
      });
      return result;
    }
    switch (action.type) {
      case DDP_RESOURCE_RELEASE: {
        const resourceId = action.meta && action.meta.resourceId;
        if (resourceId) {
          const resource = getResources()[resourceId];
          // NOTE: The number of users will only be decreased after "next(action)"
          //       so at this moment it's still taking into account the one which
          //       is resigning.
          if (resource && resource.users === 1) {
            scheduleCleanup(resourceId);
          }
        }
        return next(action);
      }
      case DDP_RESOURCE_REQUEST: {
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
        const resource = findResource(getResources(), name, params, properties);
        const resourceId = resource ? resource.id : nextUniqueId();

        next(setResourceMeta(action, resourceId));

        if (resource) {
          scheduleCleanup.cancel(resourceId);
        } else {
          store.dispatch(createResource(resourceId, name, params, properties, action.meta));
        }

        if (!resource ||
             resource.state === DDP_STATE__OBSOLETE ||
             resource.state === DDP_STATE__CANCELED) {
          store.dispatch(
            fetchResource(name, params, {
              ...properties,
              resourceId,
            }),
          );
        }
        return resourceId;
      }
      case DDP_RESOURCE_REFRESH: {
        const result = next(action);
        const resourceId = action.meta && action.meta.resourceId;
        if (resourceId) {
          const resource = getResources()[resourceId];
          // NOTE: If resource has no users, the reducer will set the resource state to "obsolete",
          //       and the next time it will be requested it will force re-fetch.
          if (resource && resource.users > 0) {
            store.dispatch(
              fetchResource(resource.name, resource.params, {
                ...resource.properties,
                resourceId,
              }),
            );
          }
        }
        return result;
      }
      default:
        return next(action);
    }
  };
};
