import {
  createSelector,
} from 'reselect';
import {
  DEFAULT_SOCKET_ID,
  DDP_USER_STATE__LOGGING_IN,
} from '../../constants';
import {
  createCollectionSelectors,
} from '../collections/selectors';

const constant = x => () => x;
const identity = x => x;

export const createCurrentUserSelectors = (Model, collection, {
  selectConnectionId = constant(DEFAULT_SOCKET_ID),
} = {}) => {
  const userSelectorCreators = createCollectionSelectors(Model, collection);

  const selectCurrentUserState = createSelector(
    selectConnectionId,
    identity,
    (connectionId, state) => (connectionId
      ? state.ddp &&
        state.ddp.currentUser[connectionId]
      : null
    ),
  );

  const selectCurrentUserId = createSelector(
    selectCurrentUserState,
    state => state && state.userId,
  );

  const selectCurrent = userSelectorCreators.selectOne(
    selectCurrentUserId,
  );

  const selectIsLoggingIn = createSelector(
    selectCurrentUserState,
    state => !!(state && state.state === DDP_USER_STATE__LOGGING_IN),
  );

  return {
    selectCurrent,
    selectIsLoggingIn,
  };
};
