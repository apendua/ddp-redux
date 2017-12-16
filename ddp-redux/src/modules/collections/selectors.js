import isArray from 'lodash/isArray';
import sortBy from 'lodash/sortBy';
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

  const filter = (selectDocs, selectPredicate = constant(constantTrue)) => {
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
            throw new Error('Selector expects predicate to be an object or a function');
          }
          const selector = createValuesMappingSelector(
            selectDocs,
            (doc, id) => compiled(doc, id),
          );
          return selector;
        },
      ),
      identity,
      (valuesSelector, state) => valuesSelector(state),
    );
    return createSelector(
      selectDocs,
      selectPredicateValues,
      (docs, predicateValues) => {
        const results = {};
        forEach(predicateValues, (accepted, id) => {
          if (accepted) {
            results[id] = docs[id];
          }
        });
        return results;
      },
    );
  };

  const createList = (selectDocs, selectSorter = constant(null)) => {
    const selector = createSelector(
      selectDocs,
      selectSorter,
      (docs, sorter) => (sorter ? sortBy(values(docs), sorter) : values(docs)),
    );
    Object.assign(selector, {
      all() {
        return selectDocs;
      },
      sort(newSelectSorter) {
        return createList(selectDocs, createSelector(
          selectSorter,
          newSelectSorter,
          (sorter, newSorter) => {
            if (!sorter) {
              return newSorter;
            }
            return (isArray(sorter) ? sorter : [sorter]).concat(newSorter);
          },
        ));
      },
      where(selectPredicate) {
        return createList(filter(selectDocs, selectPredicate));
      },
    });
    return selector;
  };

  const createWhere = selectDocs => selectPredicate =>
    createList(filter(selectDocs, selectPredicate));

  const createOne = (selectDocs) => {
    const selectorCreator = (selectId) => {
      let idSelector = selectId;
      if (typeof idSelector === 'string') {
        idSelector = createPropSelector(idSelector);
      }
      if (!idSelector) {
        idSelector = createSelector(
          selectDocs,
          docs => Object.keys(docs)[0],
        );
      }
      return createSelector(
        idSelector,
        selectDocs,
        (id, docs) => (id ? docs && docs[id] : null),
      );
    };
    Object.assign(selectorCreator, {
      where: selectPredicate => createOne(filter(selectDocs, selectPredicate))(),
    });
    return selectorCreator;
  };

  const createAll = (selectDocs) => {
    const selectorCreator = constant(selectDocs);
    Object.assign(selectorCreator, {
      list: () => createList(selectDocs),
      where: selectPredicate => createAll(filter(selectDocs, selectPredicate)),
    });
    return selectorCreator;
  };

  // Example usage:
  //
  // select(Todo).one()
  // select(Todo).where()
  // select(Todo).all()
  // select(Todo).all.where()
  // select(Todo).one.where()
  // select(Todo).where().sort().limit()
  // select(Todo).where().join()

  return {
    all: createAll(selectAll),
    one: createOne(selectAll),
    where: createWhere(selectAll),
  };
};

export const createSelectors = DDPClient => mapValues(DDPClient.models, createCollectionSelectors);
