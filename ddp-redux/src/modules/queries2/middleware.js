import {
  DDP_RESOURCE_UPDATE,
  DDP_RESOURCE_DELETE,
  DDP_RESOURCE_FETCH,
  DDP_RESOURCE_REFETCH,
} from '../../constants';
import {
  callMethod,
  updateResource,
} from '../../actions';

/**
 * Create middleware for the given ddpClient.
 * @param {DDPClient} ddpClient
 */
export const createMiddleware = ddpClient => (store) => {
  return next => (action) => {
    if (!action ||
        typeof action !== 'object' ||
        !action.payload ||
        !action.meta) {
      return next(action);
    }
    switch (action.type) {
      case DDP_RESOURCE_FETCH:
      case DDP_RESOURCE_REFETCH:
      case DDP_RESOURCE_DELETE:
      case DDP_RESOURCE_UPDATE: {
        const type = action.payload.properties &&
                     action.payload.properties.type;
        if (type !== 'query') {
          return next(action);
        }
        break;
      }
      default:
        return next(action);
    }
    const {
      name,
      params,
      properties,
    } = action.payload;
    const {
      resourceId,
    } = action.meta;

    switch (action.type) {
      case DDP_RESOURCE_FETCH:
      case DDP_RESOURCE_REFETCH: {
        const {
          socketId,
        } = properties;
        const nextResult = next(action);

        store.dispatch(
          callMethod(name, params, {
            resourceId,
            socketId,
          }),
        ).then((result) => {
          store.dispatch(
            updateResource(resourceId, { result }),
          );
        }).catch((error) => {
          store.dispatch(
            updateResource(resourceId, { error }),
          );
        });

        return nextResult;
      }
      case DDP_RESOURCE_DELETE: {
        const state = store.getState();
        const resource = resourceId && state.ddp.resources[resourceId];
        if (!resource) {
          return next(action);
        }
        return next({
          ...action,
          payload: {
            entities: resource.entities,
            ...action.payload,
          },
        });
      }
      case DDP_RESOURCE_UPDATE: {
        const state = store.getState();
        const resource = resourceId && state.ddp.resources[resourceId];
        if (!resource) {
          return next(action);
        }
        const newAction = {
          ...action,
          payload: {
            ...action.payload,
            oldEntities: resource.entities,
          },
        };
        if (action.payload &&
            action.payload.result &&
            typeof action.payload.result === 'object'
        ) {
          newAction.payload.entities = ddpClient.extractEntities(
            action.payload.result,
            {
              name,
              params,
              properties,
            },
          );
        }
        return next(newAction);
      }
      default:
        return next(action);
    }
  };
};
