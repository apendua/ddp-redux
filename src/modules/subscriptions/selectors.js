import find from 'lodash/find';
import {
  createSelector,
} from 'reselect';
import stableMap from '../../utils/stableMap';
import EJSON from '../../ejson';
import {
  DEFAULT_SOCKET_ID,
} from '../../constants';

const constant = x => () => x;

/**
 * Create a selector that returns a list (or object) representing
 * current state of the subscriptions user is interested in.
 * @param {Object} options
 * @param {Function} options.selectDeclaredSubscriptions
 * @param {Function} options.selectConnectionId
 * @param {Function} options.emptyState - this is used to distinguish between missing subscription and no request at all
 */
export const createSubscriptionsSelector = ({
  selectDeclaredSubscriptions,
  selectConnectionId = constant(DEFAULT_SOCKET_ID),
  emptyState = {},
}) => createSelector(
  selectDeclaredSubscriptions,
  selectConnectionId,
  state => state.ddp && state.ddp.subscriptions,
  (subscriptions, connectionId, state) => (connectionId
    ? stableMap(subscriptions, y => (y
        ? find(
            state,
            x => x.socketId === connectionId &&
                 x.name === y.name &&
                 EJSON.equals(x.params, y.params),
          )
        : emptyState
      ),
    )
    : stableMap(subscriptions, constant(null))
  ),
);
