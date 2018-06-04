import find from 'lodash/find';
import { createSelector } from 'reselect';
import stableMap from '../../utils/stableMap';
import EJSON from '../../ejson';
import {
  DEFAULT_SOCKET_ID,
  DDP_STATE__READY,
} from '../../constants';

const constant = x => () => x;

export const findQuery = (queries, name, params, properties) => find(
  queries,
  x => x.name === name &&
       EJSON.equals(x.params, params) &&
       EJSON.equals(x.properties, properties),
);

/**
 * Create a selector that returns a list (or object) representing
 * current state of the queries user is interested in.
 * @param {Object} options
 * @param {Function} options.selectQueriesRequests
 * @param {Function} options.selectConnectionId
 * @param {Function} options.emptyState - this is used to distinguish between missing subscription and no request at all
 */
export const createQueriesSelector = ({
  selectDeclaredQueries,
  selectConnectionId = constant(DEFAULT_SOCKET_ID),
  emptyState = {
    state: DDP_STATE__READY,
  },
}) => createSelector(
  selectDeclaredQueries,
  selectConnectionId,
  state => state.ddp && state.ddp.queries,
  (declaredQueries, socketId, queries) => (socketId
    ? stableMap(declaredQueries, y => (y
      ? findQuery(
        queries,
        y.name,
        y.params,
        {
          socketId,
          ...y.properties,
        },
      )
      : emptyState
    ))
    : stableMap(declaredQueries, constant(null))
  ),
);
