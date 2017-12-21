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
  resourceType,
  fetchResource,
  createGetResources,
  getCleanupTimeout,
  nextUniqueId,
}) => (store) => {
  const getResources = createGetResources(store.getState);

  const setResourceMeta = (action, resourceId) => ({
    ...action,
    meta: {
      ...action.meta,
      resourceId,
      resourceType,
    },
  });

  const createResource = (resourceId, name, params, properties) => ({
    type: DDP_RESOURCE_CREATE,
    payload: {
      name,
      params,
      properties,
    },
    meta: {
      resourceId,
      resourceType,
    },
  });

  const deleteResource = resourceId => ({
    type: DDP_RESOURCE_DELETE,
    meta: {
      resourceId,
      resourceType,
    },
  });

  const refreshResource = resourceId => ({
    type: DDP_RESOURCE_REFRESH,
    meta: {
      resourceId,
      resourceType,
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
    // From now on, we are only interested in actions that correspond
    // to the specified resourceType.
    if (!action.meta || action.meta.resourceType !== resourceType) {
      return next(action);
    }
    switch (action.type) {
      case DDP_RESOURCE_RELEASE: {
        const resource = getResources()[action.meta.resourceId];
        // NOTE: The number of users will only be decreased after "next(action)"
        //       so at this moment it's still taking into account the one which
        //       is resigning.
        if (resource && resource.users === 1) {
          scheduleCleanup(resource.id);
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
          store.dispatch(createResource(resourceId, name, params, properties));
        }
        // NOTE: Theoretically, there can me multiple methods calls to evaluate this resource.
        if (!resource ||
             resource.state === DDP_STATE__OBSOLETE ||
             resource.state === DDP_STATE__CANCELED) {
          store.dispatch(
            fetchResource(name, params, {
              ...properties,
              resourceId,
              resourceType,
            }),
          );
        }
        return resourceId;
      }
      case DDP_RESOURCE_REFRESH: {
        const result = next(action);
        const resourceId = action.meta.resourceId;
        const resource = getResources()[resourceId];
        // NOTE: If resource has no users, the reducer will set the resource state to "obsolete",
        //       and the next time it will be requested it will force re-fetch.
        if (resource && resource.users > 0) {
          store.dispatch(
            fetchResource(resource.name, resource.params, {
              ...resource.properties,
              resourceId,
              resourceType,
            }),
          );
        }
        return result;
      }
      default:
        return next(action);
    }
  };
};
