import map from 'lodash/map';
import {
  createSelector,
} from 'reselect';
import {
  DDP_METHOD_STATE__READY,
} from '../../constants';

/**
 * Create a selector that returns a list representing
 * current state of the methods user is interested in.
 * @param {Object} options
 * @param {Function} options.selectMethodsIds
 */
export const createMethodsSelector = ({
  selectMethodsIds,
  readyState = {
    state: DDP_METHOD_STATE__READY,
  },
}) => createSelector(
  selectMethodsIds,
  state => state.ddp && state.ddp.methods,
  // NOTE: If method is not present in the store, it means that's already completed.
  (methodsIds, state) => map(methodsIds, id => (id && state[id]) || readyState),
);
