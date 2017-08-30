import omit from 'lodash.omit';
import isEmpty from 'lodash.isempty';
import debounce from 'lodash.debounce';
import mapValues from 'lodash.mapvalues';
import values from 'lodash.values';
import merge from 'lodash.merge';
import forEach from 'lodash.foreach';
import shallowEqual from 'shallowequal';
import {
  defaultMemoize,
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

const defaultIsEqual = (a, b) => a === b;

const memoizeValuesMapping = (mapOneValue, isEqual) => {
  let lastArg = null;
  let lastResult = null;
  return (arg) => {
    if (shallowEqual(arg, lastArg)) {
      return lastResult;
    }
    const result = mapValues(arg, (value, key) => {
      if (lastArg && lastArg[key] === value) {
        return lastResult && lastResult[key];
      }
      const newValue = mapOneValue(value);
      if (!isEqual(newValue, lastResult && lastResult[key])) {
        return newValue;
      }
      return lastResult[key];
    });
    lastArg = arg;
    if (!shallowEqual(result, lastResult)) {
      lastResult = result;
    }
    return lastResult;
  };
};

export const createValuesMappingSelector = (selectObject, mapOneValue, isEqual = defaultIsEqual) => {
  let recomputations = 0;
  const memoizedMapValues = memoizeValuesMapping((...args) => {
    recomputations += 1;
    return mapOneValue(...args);
  }, isEqual);
  const selector = defaultMemoize((...args) => memoizedMapValues(selectObject(...args)));
  selector.recomputations = () => recomputations;
  selector.resetRecomputations = () => {
    recomputations = 0;
  };
  return selector;
};

export const createSelectors = DDPClient => mapValues(DDPClient.models, (Model, collection) => {
  const selectCollectionById = state =>
    state.ddp.collections[collection] &&
    state.ddp.collections[collection].byId;

  const selectDocuments = createValuesMappingSelector(
    selectCollectionById,
    ({ current }) => {
      const rawObject = merge({}, ...values(current));
      return new Model(rawObject);
    },
  );
  return {
    selectDocuments,
    selectOne: selectId => createSelector(
      selectId,
      selectDocuments,
      (id, documents) => documents[id],
    ),
    find: (predicate, ...optionsSelectors) => {
      const selectPredicateValues = createSelector(
        createSelector(
          ...optionsSelectors,
          (...options) => {
            const selector = createValuesMappingSelector(
              selectDocuments,
              doc => predicate(doc, ...options),
            );
            return selector;
          },
        ),
        valuesSelector => valuesSelector(),
      );
      return createSelector(
        selectDocuments,
        selectPredicateValues,
        (documents, predicateValues) => {
          const results = [];
          forEach(predicateValues, (accepted, id) => {
            if (accepted) {
              results.push(documents[id]);
            }
          });
          return results;
        },
      );
    },
  };
});

