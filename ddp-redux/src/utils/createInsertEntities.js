import forEach from 'lodash/forEach';
import without from 'lodash/without';
import isEmpty from 'lodash/isEmpty';

/**
 * Create a function that can be used for inseting document snapshots into ddp.collections.
 * @param {string} itemsFieldName
 * @param {string} orderFieldName
 */
const createInsertEntities = (itemsFieldName, orderFieldName) => {
  const insertIntoCollection = (state, dataSourceId, docs) => {
    if (!docs || isEmpty(docs)) {
      return state;
    }
    const nextById = {
      ...state && state.nextById,
    };
    forEach(docs, (fields, docId) => {
      nextById[docId] = {
        ...nextById[docId],
        [itemsFieldName]: {
          ...nextById[docId] && nextById[docId][itemsFieldName],
          [dataSourceId]: fields,
        },
        [orderFieldName]: [
          ...without(nextById[docId] && nextById[docId][orderFieldName], dataSourceId),
          dataSourceId,
        ],
      };
    });
    return {
      ...state,
      nextById,
      needsUpdate: true,
    };
  };

  const insertEntities = (state, dataSourceId, entities) => {
    if (isEmpty(entities)) {
      return state;
    }
    const newState = {
      ...state,
    };
    forEach(entities, (docs, collection) => {
      newState[collection] = insertIntoCollection(newState[collection], dataSourceId, docs);
    });
    return newState;
  };

  return insertEntities;
};

export default createInsertEntities;
