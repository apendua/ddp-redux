import mapValues from 'lodash.mapvalues';
import values from 'lodash.values';
import merge from 'lodash.merge';
import forEach from 'lodash.foreach';
import {
  createSelector,
} from 'reselect';
import createValuesMappingSelector from '../../utils/createValuesMappingSelector';

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
