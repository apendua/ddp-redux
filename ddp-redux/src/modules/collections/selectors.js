import every from 'lodash/every';
import mapValues from 'lodash/mapValues';
import values from 'lodash/values';
import forEach from 'lodash/forEach';
import map from 'lodash/map';
import {
  createSelector,
} from 'reselect';
import createValuesMappingSelector from '../../utils/createValuesMappingSelector';

const identity = x => x;
const constant = x => () => x;
const constantTrue = constant(true);

const createPropSelector = propName => (state, props) => props[propName];
const createMatch = properties => object =>
  every(properties, (value, key) => object[key] === value);

export const createCollectionSelectors = (Model, collection) => {
  const selectCollectionById = state =>
    state.ddp.collections[collection] &&
    state.ddp.collections[collection].byId;

  const selectAll = createValuesMappingSelector(
    selectCollectionById,
    ({
      current,
      queries,
      queriesOrder,
      methods,
      methodsOrder,
    }) => {
      const rawObject = {};
      // 1. use information from query results
      if (queriesOrder && queriesOrder.length > 0) {
        Object.assign(rawObject, ...map(queriesOrder, id => queries[id]));
      }
      // 2. use information from subscriptions
      Object.assign(rawObject, ...values(current));
      // 3. use infromation from optimistic updates
      if (methodsOrder && methodsOrder.length > 0) {
        Object.assign(rawObject, ...map(methodsOrder, id => methods[id]));
      }
      return Model ? new Model(rawObject) : rawObject;
    },
  );

  const selectOne = (selectId) => {
    let idSelector = selectId;
    if (typeof selectId === 'string') {
      idSelector = createPropSelector(selectId);
    }
    return createSelector(
      idSelector,
      selectAll,
      (id, docs) => docs && docs[id],
    );
  };

  const find = (selectPredicate = constant(constantTrue)) => {
    let predicateSelector = selectPredicate;
    if (typeof selectPredicate !== 'function') {
      predicateSelector = constant(selectPredicate);
    }
    const selectPredicateValues = createSelector(
      createSelector(
        predicateSelector,
        (predicate) => {
          let compiled = predicate;
          if (typeof predicate === 'object') {
            compiled = createMatch(predicate);
          } else if (typeof predicate !== 'function') {
            throw new Error('Find selector expects predicate to be an object or a function');
          }
          const selector = createValuesMappingSelector(
            selectAll,
            (doc, id) => compiled(doc, id),
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
      (docs, predicateValues) => {
        const results = [];
        forEach(predicateValues, (accepted, id) => {
          if (accepted) {
            results.push(docs[id]);
          }
        });
        return results;
      },
    );
  };

  const findOne = selectPredicate => createSelector(
    find(selectPredicate),
    docs => (docs.length > 0 ? docs[0] : null),
  );

  return {
    selectAll,
    selectOne,
    find,
    findOne,
  };
};

export const createSelectors = DDPClient => mapValues(DDPClient.models, createCollectionSelectors);
