import omit from 'lodash.omit';
import isEmpty from 'lodash.isempty';
import debounce from 'lodash.debounce';
import mapValues from 'lodash.mapvalues';
import {
  createSelector,
} from 'reselect';
import {
  DDP_ADDED,
  DDP_CHANGED,
  DDP_REMOVED,
  DDP_FLUSH,
} from '../constants';

export const mutateCollections = (DDPClient, state, collection, id, socketId, mutateOne) => {
  const Model = DDPClient.models[collection] || DDPClient.UnknownModel;
  const stateCollection = state[collection] || {};
  const stateCollectionById = stateCollection.nextById || {};
  const {
    current,
    ...other
  } = stateCollectionById[id] || {};
  const shouldRemove = !mutateOne;
  const newCurrent = shouldRemove
    ? omit(current, socketId)
    : {
      ...current,
      [socketId]: new Model(mutateOne(current && current[socketId])),
    };
  const shouldRemoveCurrent = isEmpty(newCurrent);
  const shouldRemoveCompltely = shouldRemoveCurrent && isEmpty(other);
  return {
    ...state,
    [collection]: {
      ...stateCollection,
      nextById: shouldRemoveCompltely
        ? omit(stateCollectionById, id)
        : {
          ...stateCollectionById,
          [id]: shouldRemoveCurrent
            ? omit(stateCollectionById[id], 'current')
            : {
              ...stateCollectionById[id],
              current: newCurrent,
            },
        },
    },
  };
};

export const createMiddleware = () => (store) => {
  // let flushTimeout = null;
  // const flush = () => {
  //   if (flushTimeout) {
  //     clearTimeout(flushTimeout);
  //   }
  //   flushTimeout = setTimeout(() => {
  //     store.dispatch({
  //       type: DDP_FLUSH,
  //     });
  //     flushTimeout = null;
  //   }, 200);
  // };
  const flush = debounce(() => {
    store.dispatch({
      type: DDP_FLUSH,
    });
  }, 200);
  return next => (action) => {
    if (!action || typeof action !== 'object') {
      return next(action);
    }
    switch (action.type) {
      case DDP_ADDED:
      case DDP_CHANGED:
      case DDP_REMOVED:
        return ((result) => {
          flush();
          return result;
        })(next(action));
      default:
        return next(action);
    }
  };
};

export const createReducer = DDPClient => (state = {}, action) => {
  switch (action.type) {
    case DDP_ADDED:
      return mutateCollections(
        DDPClient,
        state,
        action.payload.collection,
        action.payload.id,
        action.meta && action.meta.socketId,
        () => ({
          _id: action.payload.id,
          ...action.payload.fields,
        }),
      );
    case DDP_CHANGED:
      return mutateCollections(
        DDPClient,
        state,
        action.payload.collection,
        action.payload.id,
        action.meta && action.meta.socketId,
        entity => ({
          ...omit(entity, action.payload.cleared),
          ...action.payload.fields,
        }),
      );
    case DDP_REMOVED:
      return mutateCollections(
        DDPClient,
        state,
        action.payload.collection,
        action.payload.id,
        action.meta && action.meta.socketId,
        null,
      );
    case DDP_FLUSH:
      return mapValues(state, (collection) => {
        if (collection.nextById !== collection.byId) {
          return {
            ...collection,
            byId: collection.nextById,
          };
        }
        return collection;
      });
    default:
      return state;
  }
};

export const createSelectors = DDPClient => mapValues(DDPClient.models, (model, collection) => {
  const selectCollection = state => state.ddp.collections[collection];
  return {
    find: createSelector(
      selectCollection,
      state => state.ddp.collections[collection],
    ),
  };
});

