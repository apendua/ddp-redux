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

const noModelSpecified = () => {
  console.warn(`You attempted to "selectCurrent" user but no User model was specified.
This will result with null value being returned even if a user is logged in. To fix this,
please make sure that you pass a valid Model and collection name to createCollectionSelectors().`);
};

export const createCurrentUserSelectors = (Model, collection, {
  selectConnectionId = constant(DEFAULT_SOCKET_ID),
} = {}) => {
  const userSelectorCreators = Model && collection
    ? createCollectionSelectors(Model, collection)
    : null;

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

  const selectCurrent = userSelectorCreators
    ? userSelectorCreators.selectOne(
      selectCurrentUserId,
    )
    : noModelSpecified;

  const selectIsLoggingIn = createSelector(
    selectCurrentUserState,
    state => !!(state && state.state === DDP_USER_STATE__LOGGING_IN),
  );

  // Example usage would be:
  //
  // current(User).user()
  // current(User).userId()
  // current(User).isLoggingIn()

  return {
    user: constant(selectCurrent),
    userId: constant(selectCurrentUserId),
    isLoggingIn: constant(selectIsLoggingIn),
  };
};
