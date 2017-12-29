import forEach from 'lodash/forEach';
import {
  DEFAULT_SOCKET_ID,

  DDP_CONNECTED,

  DDP_RESOURCE_REQUEST,
  DDP_RESOURCE_RELEASE,
  DDP_RESOURCE_DELETE,
  DDP_RESOURCE_UPDATE,
  DDP_RESOURCE_FETCH,
  DDP_RESOURCE_REFETCH,

  DDP_STATE__OBSOLETE,
  DDP_STATE__CANCELED,

  DDP_RESOURCE_CREATE,
  DDP_RESOURCE_DEPRECATE,
} from '../../constants';
import createDelayedTask from '../../utils/createDelayedTask';
import {
  findResource,
} from './selectors';
import {
  createResource,
  deleteResource,
  fetchResource,
  refetchResource,
} from '../../actions';

/**
 * Create resources middleware.
 */
export const createMiddleware = ddpClient => (store) => {
  const getResources = () => {
    const state = store.getState();
    return state.ddp &&
           state.ddp.resources;
  };

  const setResourceId = (action, resourceId) => ({
    ...action,
    meta: {
      ...action.meta,
      resourceId,
    },
  });

  const scheduleCleanup = createDelayedTask((resourceId) => {
    store.dispatch(deleteResource(resourceId));
  }, {
    getTimeout: ddpClient.getCleanupTimeout.bind(ddpClient),
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
          ) &&
          resource.users > 0
        ) {
          const {
            name,
            params,
            properties,
          } = resource;
          store.dispatch(
            refetchResource(resourceId, {
              name,
              params,
              properties,
            }),
          );
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
      case DDP_RESOURCE_UPDATE:
      case DDP_RESOURCE_DELETE:
      case DDP_RESOURCE_FETCH:
      case DDP_RESOURCE_REFETCH: {
        const resourceId = action.meta && action.meta.resourceId;
        if (resourceId) {
          const resource = getResources()[resourceId];
          if (resource) {
            const {
              name,
              params,
              properties,
            } = resource;
            return next({
              ...action,
              payload: {
                name,
                params,
                properties,
                ...action.payload,
              },
            });
          }
        }
        return next(action);
      }
      case DDP_RESOURCE_CREATE: {
        const resourceId = ddpClient.nextUniqueId();
        next(
          setResourceId(
            action,
            resourceId,
          ),
        );
        return resourceId;
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

        let resourceId;
        if (resource) {
          resourceId = resource.id;
          scheduleCleanup.cancel(resourceId);
        } else {
          resourceId = store.dispatch(createResource(name, params, properties));
        }

        next(
          setResourceId(
            action,
            resourceId,
          ),
        );

        if (!resource ||
             resource.state === DDP_STATE__OBSOLETE ||
             resource.state === DDP_STATE__CANCELED) {
          store.dispatch(
            fetchResource(resourceId, {
              name,
              params,
              properties,
            }),
          );
        }
        return resourceId;
      }
      case DDP_RESOURCE_DEPRECATE: {
        const result = next(action);
        const resourceId = action.meta && action.meta.resourceId;
        if (resourceId) {
          const resource = getResources()[resourceId];
          // NOTE: If resource has no users, the reducer will set the resource state to "obsolete",
          //       and the next time it will be requested it will force re-fetch.
          if (resource && resource.users > 0) {
            const {
              name,
              params,
              properties,
            } = resource;
            store.dispatch(
              refetchResource(resourceId, {
                name,
                params,
                properties,
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
