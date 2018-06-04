import find from 'lodash/find';
import { createSelector } from 'reselect';
import stableMap from '../../utils/stableMap';
import EJSON from '../../ejson';
import {
  DEFAULT_SOCKET_ID,
  DDP_STATE__READY,
} from '../../constants';

const constant = x => () => x;

export const findResource = (resources, name, params, properties) => find(
  resources,
  x => x.name === name &&
       EJSON.equals(x.properties, properties) &&
       EJSON.equals(x.params, params),
);

/**
 * Create a selector that returns a list (or object) representing
 * current state of the resources user is interested in.
 * @param {Object} options
 * @param {Function} options.selectDeclaredResources
 * @param {Function} options.selectConnectionId
 * @param {Function} options.emptyState
 */
export const createResourcesSelector = ({
  selectDeclaredResources,
  selectConnectionId = constant(DEFAULT_SOCKET_ID),
  emptyState = {
    state: DDP_STATE__READY,
  },
}) => createSelector(
  selectDeclaredResources,
  selectConnectionId,
  state => state.ddp && state.ddp.resources,
  (declaredResources, socketId, resources) => (socketId
    ? stableMap(declaredResources, y => (y
      ? findResource(
        resources,
        y.name,
        y.params,
        {
          socketId,
          ...y.properties,
        },
      )
      : emptyState
    ))
    : stableMap(declaredResources, constant(null))
  ),
);
