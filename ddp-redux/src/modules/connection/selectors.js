import find from 'lodash/find';
import { createSelector } from 'reselect';
import EJSON from '../../ejson';
import { DEFAULT_SOCKET_ID } from '../../constants';

export const createConnectionSelector = ({
  selectDeclaredConnection,
}) => createSelector(
  selectDeclaredConnection,
  state => state.ddp && state.ddp.connection && state.ddp.connection.sockets,
  (y, state) => (y
    ? find(
      state,
      x => x.endpoint === y.endpoint && EJSON.equals(x.params, y.params),
    )
    : state[DEFAULT_SOCKET_ID]
  ),
);
