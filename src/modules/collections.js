import omit from 'lodash.omit';
import isEmpty from 'lodash.isempty';
import debounce from 'lodash.debounce';
import mapValues from 'lodash.mapvalues';
import values from 'lodash.values';
import merge from 'lodash.merge';
import forEach from 'lodash.foreach';
import {
  createSelector,
} from 'reselect';
import decentlyMapValues from '../utils/decentlyMapValues';
import createValuesMappingSelector from '../utils/createValuesMappingSelector';
import {
  DDP_ADDED,
  DDP_CHANGED,
  DDP_REMOVED,
  DDP_FLUSH,
  DDP_OPTIMISTIC,
  DDP_UPDATED,
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
        doc => ({
          ...omit(doc, action.payload.cleared),
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

const identity = x => x;

export const createSelectors = DDPClient => mapValues(DDPClient.models, (Model, collection) => {
  const selectCollectionById = state =>
    state.ddp.collections[collection] &&
    state.ddp.collections[collection].byId;

  const selectAll = createValuesMappingSelector(
    selectCollectionById,
    ({ current }) => {
      const rawObject = merge({}, ...values(current));
      return new Model(rawObject);
    },
  );

  const selectOne = selectId => createSelector(
    selectId,
    selectAll,
    (id, entities) => entities[id],
  );

  const find = (selectPredicate) => {
    const selectPredicateValues = createSelector(
      createSelector(
        selectPredicate,
        (predicate) => {
          const selector = createValuesMappingSelector(
            selectAll,
            doc => predicate(doc),
          );
          return selector;
        },
      ),
      identity,
      (valuesSelector, state) => valuesSelector(state),
    );
    return createSelector(
      selectAll,
      selectPredicateValues,
      (entities, predicateValues) => {
        const results = [];
        forEach(predicateValues, (accepted, id) => {
          if (accepted) {
            results.push(entities[id]);
          }
        });
        return results;
      },
    );
  };

  const findOne = selectPredicate => createSelector(
    find(selectPredicate),
    entities => (entities.length > 0 ? entities[0] : null),
  );

  return {
    selectAll,
    selectOne,
    find,
    findOne,
  };
});
