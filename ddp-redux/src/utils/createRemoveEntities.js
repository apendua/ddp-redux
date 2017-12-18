import omit from 'lodash/omit';
import without from 'lodash/without';
import isEmpty from 'lodash/isEmpty';
import carefullyMapValues from './carefullyMapValues';

/**
 * Create a function that can be used for removing document snapshots
 * from ddp.collections.
 * @param {string} itemsFieldName
 * @param {string} orderFieldName
 */
const createRemoveEntities = (itemsFieldName, orderFieldName) => {
  const removeFromCollection = (state, dataSourceId, docs) => {
    if (!docs) {
      return state;
    }
    const nextById = carefullyMapValues(state.nextById, (item, id, remove) => {
      if (!docs[id]) {
        return item;
      }
      const {
        [itemsFieldName]: items,
        [orderFieldName]: order,
        ...other
      } = item;
      if (!items) {
        return item;
      }
      const newItemsOrder = without(order, dataSourceId);
      if (newItemsOrder.length === 0) {
        if (isEmpty(other)) {
          return remove(id);
        }
        return other;
      }
      return {
        ...other,
        [itemsFieldName]: omit(items, dataSourceId),
        [orderFieldName]: newItemsOrder,
      };
    });
    return {
      ...state,
      nextById,
    };
  };

  const removeEntities = (state, dataSourceId, entities) => {
    if (!entities || isEmpty(entities)) {
      return state;
    }
    return carefullyMapValues(state, (collection, name) =>
      removeFromCollection(collection, dataSourceId, entities[name]));
  };

  return removeEntities;
};

export default createRemoveEntities;
