import omit from 'lodash.omit';
import forEach from 'lodash.foreach';
import isEmpty from 'lodash.isempty';
import without from 'lodash.without';
import {
  DDP_ADDED,
  DDP_ADDED_BEFORE,
  DDP_CHANGED,
  DDP_REMOVED,
  DDP_FLUSH,
  DDP_OPTIMISTIC,
  DDP_QUERY_UPDATE,
  DDP_QUERY_DELETE,
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

export const removeDocsFromCollection = (state, queryId, docs) => {
  if (!docs) {
    return state;
  }
  return {
    ...state,
    nextById: decentlyMapValues(state.nextById, (item, id, remove) => {
      if (!docs[id]) {
        return item;
      }
      const {
        queries,
        queryIds,
        ...other
      } = item;
      if (!queries) {
        return item;
      }
      const newQueryIds = without(queryIds, queryId);
      if (newQueryIds.length === 0) {
        if (isEmpty(other)) {
          return remove(id);
        }
        return other;
      }
      return {
        ...other,
        queries: omit(queries, queryId),
        queryIds: newQueryIds,
      };
    }),
  };
};

export const removeEntities = (state, queryId, entities) => {
  if (!entities || isEmpty(entities)) {
    return state;
  }
  return decentlyMapValues(state, (subState, collection) => removeDocsFromCollection(subState, queryId, entities[collection]));
};

export const insertDocsIntoCollection = (state, queryId, docs) => {
  if (!docs || isEmpty(docs)) {
    return state;
  }
  const nextById = {
    ...state.nextById,
  };
  forEach(docs, (fields, id) => {
    nextById[id] = {
      ...nextById[id],
      queries: {
        ...nextById[id] && nextById[id].queries,
        [queryId]: fields,
      },
      queryIds: [
        ...without(nextById[id] && nextById[id].queryIds, queryId),
        queryId,
      ],
    };
  });
  return {
    ...state,
    nextById,
  };
};

export const insertEntities = (state, queryId, entities) => {
  if (isEmpty(entities)) {
    return state;
  }
  const newState = {
    ...state,
  };
  forEach(entities, (docs, collection) => {
    newState[collection] = insertDocsIntoCollection(newState[collection], queryId, docs);
  });
  return newState;
};

// export const applyQueryResult = (state, collection, id, )

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
      return decentlyMapValues(state, (collection) => {
        if (collection.nextById !== collection.byId) {
          return {
            ...collection,
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
        return insertEntities(
          removeEntities(
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
        return removeEntities(
          state,
          queryId,
          entities,
        );
      })();
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
