import omit from 'lodash/omit';
import reduce from 'lodash/reduce';
import isEmpty from 'lodash/isEmpty';
import {
  DDP_METHOD,
  DDP_UPDATED,
  DDP_ADDED,
  DDP_ADDED_BEFORE,
  DDP_CHANGED,
  DDP_REMOVED,
  DDP_FLUSH,
  DDP_QUERY_UPDATE,
  DDP_QUERY_DELETE,
} from '../../constants';
import carefullyMapValues from '../../utils/carefullyMapValues';
import createInsertEntities from '../../utils/createInsertEntities';
import createRemoveEntities from '../../utils/createRemoveEntities';

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
  const shouldRemoveCompletely = shouldRemoveCurrent && isEmpty(other);
  return {
    ...state,
    [collection]: {
      ...stateCollection,
      needsUpdate: true,
      nextById: shouldRemoveCompletely
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

const insertQueries = createInsertEntities('queries', 'queriesOrder');
const removeQueries = createRemoveEntities('queries', 'queriesOrder');

const insertChanges = createInsertEntities('methods', 'methodsOrder');
const removeChanges = createRemoveEntities('methods', 'methodsOrder');

export const createReducer = () => (state = {}, action) => {
  switch (action.type) {
    case DDP_ADDED:
    case DDP_ADDED_BEFORE:
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
      return carefullyMapValues(state, (collection) => {
        if (collection.needsUpdate) {
          const {
            needsUpdate,
            ...other
          } = collection;
          return {
            ...other,
            byId: collection.nextById,
          };
        }
        return collection;
      });
    case DDP_QUERY_UPDATE:
      return (() => {
        const queryId = action.meta.queryId;
        const entities = action.payload.entities;
        const oldEntities = action.payload.oldEntities;
        return insertQueries(
          removeQueries(
            state,
            queryId,
            oldEntities,
          ),
          queryId,
          entities,
        );
      })();
    case DDP_QUERY_DELETE:
      return (() => {
        const queryId = action.meta.queryId;
        const entities = action.payload.entities;
        return removeQueries(
          state,
          queryId,
          entities,
        );
      })();
    case DDP_METHOD:
      return insertChanges(
        state,
        action.meta.methodId,
        action.meta.entities,
      );
    case DDP_UPDATED:
      return reduce(
        action.meta.methods,
        (previousState, method) => (method
          ? removeChanges(
            previousState,
            method.id,
            method.entities,
          )
          : previousState
        ),
        state,
      );
    default:
      return state;
  }
};
