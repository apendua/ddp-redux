import isPlainObject from 'lodash/isPlainObject';
import isArray from 'lodash/isArray';
import forEach from 'lodash/forEach';
import memoize from 'lodash/memoize';
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

const constant = x => () => x;

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

    const modelsDictionary = {};
    if (isArray(models)) {
      forEach(models, (Model) => {
        if (Model.collection) {
          modelsDictionary[Model.collection] = Model;
        } else {
          console.warn(`Model ${Model.name} does not have "collection" property`);
        }
      });
    } else if (isPlainObject(models)) {
      Object.assign(modelsDictionary, models);
    } else if (models) {
      console.warn('DDP connector expects "models" to be either array or a plain object');
    }

    const currentUserSelectors = createCurrentUserSelectors(User);

    const createSelectorsCreator = createForCollection => memoize((collectionOrModel) => {
      let Model = collectionOrModel;
      let collection;
      if (typeof Model === 'string') {
        collection = Model;
        Model = modelsDictionary[Model];
      } else if (typeof Model === 'function') {
        collection = Model.collection;
      } else {
        throw new Error('Model must be a constructor');
      }
      if (!collection) {
        throw new Error('Collection not specified; please check if your Model has "collection" property');
      }
      const select = createForCollection(Model, collection);
      select.currentUser = constant(select.one(currentUserSelectors.userId()));
      return {
        select,
      };
    }, (collectionOrModel) => {
      if (typeof collectionOrModel === 'string') {
        return modelsDictionary[collectionOrModel] || collectionOrModel;
      }
      return collectionOrModel;
    });

    selectorCreators.from = createSelectorsCreator(createCollectionSelectors);
    selectorCreators.select = {
      ...currentUserSelectors,
    };

    selectorCreators.prop = propName => (state, props) => props[propName];

    return createStructuredSelector({
      ...createSelectors && createSelectors(selectorCreators),

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
