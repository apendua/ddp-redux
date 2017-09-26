import {
  createSelector,
} from 'reselect';
import {
  DEFAULT_SOCKET_ID,
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
  const createCurrentUserIdSelector = () => createSelector(
    selectConnectionId,
    identity,
    (connectionId, state) => (connectionId
      ? state.ddp &&
        state.ddp.currentUser[connectionId] &&
        state.ddp.currentUser[connectionId].userId
      : null
    ),
  );

  const selectCurrent = userSelectorCreators.selectOne(
    createCurrentUserIdSelector(),
  );

  return {
    selectCurrent,
  };
};
