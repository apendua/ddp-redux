import forEach from 'lodash/forEach';
import every from 'lodash/every';
import {
  createSelector,
  createStructuredSelector,
} from 'reselect';
import { connect } from 'react-redux';
import {
  DDP_SUBSCRIPTION_STATE__READY,
  DDP_SUBSCRIPTION_STATE__RESTORING,
  DDP_CONNECTION_STATE__CONNECTED,
  DDP_QUERY_STATE__READY,
  DDP_QUERY_STATE__RESTORING,
  DDP_METHOD_STATE__READY,
  createCurrentUserSelectors,
  createCollectionSelectors,
  createSubscriptionsSelector,
  createQueriesSelector,
  createConnectionSelector,
  createMethodsSelector,
} from 'ddp-redux';

const connectDDP = ({
  User,
  models,
  createSelectors,
  selectDeclaredMutations,
  selectDeclaredQueries,
  selectDeclaredConnection,
  selectDeclaredSubscriptions,
}) => connect(
  () => {
    const selectorCreators = {};

    const selectConnectionState = createConnectionSelector({
      selectDeclaredConnection,
    });

    const selectConnectionId = createSelector(
      selectConnectionState,
      state => state && state.id,
    );

    const selectSubscriptionsState = createSubscriptionsSelector({
      selectConnectionId,
      selectDeclaredSubscriptions,
    });

    const selectQueriesState = createQueriesSelector({
      selectConnectionId,
      selectDeclaredQueries,
    });

    const selectMutationsState = createMethodsSelector({
      selectMethodsIds: selectDeclaredMutations,
    });

    // NOTE: Even if User model is not present, some selectors may still be of interest, e.g. selectCurrentUserId.
    const currentUserSelectors = createCurrentUserSelectors(User, User && User.collection, {
      selectConnectionId,
    });

    const createSelectorsForModel = (Model) => {
      const selectors = createCollectionSelectors(Model, Model.collection);
      if (User && User.collection === Model.collection) {
        selectors.current = currentUserSelectors.selectCurrent;
      }
      return selectors;
    };

    // TODO: We should probably memoize these selector createors.
    selectorCreators.collection = (Model) => {
      if (typeof Model === 'string') {
        // Model is collection name in this case
        return createCollectionSelectors(null, Model);
      }
      return createCollectionSelectors(Model, Model.collection);
    };

    forEach(models, (Model) => {
      selectorCreators[Model.collection] = createSelectorsForModel(Model);
    });
    if (User && !selectorCreators[User.collection]) {
      selectorCreators[User.collection] = createSelectorsForModel(User);
    }

    return createStructuredSelector({
      ...createSelectors && createSelectors(selectorCreators),
      userId: currentUserSelectors.selectCurrentUserId,

      mutations:     selectMutationsState,
      subscriptions: selectSubscriptionsState,
      connection:    selectConnectionState,
      queries:       selectQueriesState,

      subscriptionsReady: createSelector(
        selectSubscriptionsState,
        subscriptions => every(subscriptions, sub =>
          sub && (
            sub.state === DDP_SUBSCRIPTION_STATE__READY ||
            sub.state === DDP_SUBSCRIPTION_STATE__RESTORING
          ),
        ),
      ),

      connectionReady: createSelector(
        selectConnectionState,
        connection => connection && connection.state === DDP_CONNECTION_STATE__CONNECTED,
      ),

      queriesReady: createSelector(
        selectQueriesState,
        queries => every(queries, query =>
          query && (
            query.state !== DDP_QUERY_STATE__READY ||
            query.state !== DDP_QUERY_STATE__RESTORING
          ),
        ),
      ),

      mutationsReady: createSelector(
        selectMutationsState,
        mutations => every(mutations, mutation =>
          mutation && mutation.state === DDP_METHOD_STATE__READY,
        ),
      ),

      declaredSubscriptions: selectDeclaredSubscriptions,
      declaredConnection:    selectDeclaredConnection,
      declaredQueries:       selectDeclaredQueries,
    });
  },
);

export default connectDDP;
