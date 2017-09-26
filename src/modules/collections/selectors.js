import mapValues from 'lodash.mapvalues';
import values from 'lodash.values';
import forEach from 'lodash.foreach';
import map from 'lodash.map';
import {
  createSelector,
} from 'reselect';
import createValuesMappingSelector from '../../utils/createValuesMappingSelector';

const identity = x => x;
const constant = x => () => x;
const constantTrue = constant(true);

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
      return new Model(rawObject);
    },
  );

  const selectOne = selectId => createSelector(
    selectId,
    selectAll,
    (id, docs) => docs && docs[id],
  );

  const find = (selectPredicate = constant(constantTrue)) => {
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
