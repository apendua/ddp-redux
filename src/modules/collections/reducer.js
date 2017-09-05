import omit from 'lodash.omit';
import isEmpty from 'lodash.isempty';
import {
  DDP_ADDED,
  DDP_CHANGED,
  DDP_REMOVED,
  DDP_FLUSH,
  DDP_OPTIMISTIC,
} from '../../constants';
import decentlyMapValues from '../../utils/decentlyMapValues';

export const mutateCollections = (state, collection, id, socketId, mutateOne) => {
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
      [socketId]: mutateOne(current && current[socketId]),
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

export const addOptmisticMutation = (state, collection, id, methodId, fields) => {
  const stateCollection = state[collection] || {};
  const stateCollectionById = stateCollection.nextById || {};
  const {
    methods = [],
  } = stateCollectionById[id] || {};
  return {
    ...state,
    [collection]: {
      ...stateCollection,
      nextById: {
        ...stateCollectionById,
        [id]: {
          ...stateCollectionById[id],
          methods: [
            ...methods,
            {
              id,
              fields,
            },
          ],
        },
      },
    },
  };
};

export const createReducer = () => (state = {}, action) => {
  switch (action.type) {
    case DDP_ADDED:
      return mutateCollections(
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
        state,
        action.payload.collection,
        action.payload.id,
        action.meta && action.meta.socketId,
        doc => ({
          ...omit(doc, action.payload.cleared),
          ...action.payload.fields,
        }),
      );
    case DDP_REMOVED:
      return mutateCollections(
        state,
        action.payload.collection,
        action.payload.id,
        action.meta && action.meta.socketId,
        null,
      );
    case DDP_FLUSH:
      return decentlyMapValues(state, (collection) => {
        if (collection.nextById !== collection.byId) {
          return {
            ...collection,
            byId: collection.nextById,
          };
        }
        return collection;
      });
    case DDP_OPTIMISTIC:
      return addOptmisticMutation(
        state,
        action.payload.collection,
        action.payload.id,
        action.meta && action.meta.methodId,
        action.payload.fields,
      );
    default:
      return state;
  }
};
