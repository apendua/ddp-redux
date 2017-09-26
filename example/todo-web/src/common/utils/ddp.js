import forEach from 'lodash.foreach';
import keyBy from 'lodash.keyby';
import find from 'lodash.find';
import map from 'lodash.map';
import some from 'lodash.some';
import mapValues from 'lodash.mapvalues';
import shallowEqual from 'shallowequal';
import {
  compose,
  branch,
  lifecycle,
  withState,
  withPropsOnChange,
  renderComponent,
  setDisplayName,
} from 'recompose';
import {
  createSelector,
  createStructuredSelector,
} from 'reselect';
import { connect } from 'react-redux';
import {
  EJSON,
  DEFAULT_SOCKET_ID,
  DDP_SUBSCRIPTION_STATE__PENDING,
  DDP_CONNECTION_STATE__CONNECTING,
  DDP_QUERY_STATE__PENDING,
  subscribe,
  unsubscribe,
  queryRequest,
  queryRelease,
  openSocket,
  closeSocket,
  createCollectionSelectors,
} from 'ddp-client';
import wrapSelector from './wrapSelector';

const identity = x => x;
const constant = x => () => x;
const noop = () => {};
const stableMap = (collection, ...args) => (Array.isArray(collection)
  ? map(collection, ...args)
  : mapValues(collection, ...args)
);

const ddp = ({
  models,
  User,
  mapQueries,
  subscriptions: selectSubscriptions,
  queries:       selectQueries,
  connection:    selectConnection,
  selectors:     createEntitiesSelectors,
  loader:        Loader,
}) => {
  const mapStateToSubscriptions = wrapSelector(selectSubscriptions);
  const mapStateToConnection = wrapSelector(selectConnection);
  const mapStateToQueries = wrapSelector(selectQueries);

  const createConnectionStateSelector = () => createSelector(
    mapStateToConnection,
    identity,
    (options, state) => (options
      ? find(
        state.ddp &&
        state.ddp.connection &&
        state.ddp.connection.sockets,
        x => x.endpoint === options.endpoint && EJSON.equals(x.params, options.params),
      )
      : state.ddp &&
        state.ddp.connection &&
        state.ddp.connection.sockets[DEFAULT_SOCKET_ID]
    ),
  );

  const createSubscriptionsStateSelector = () => createSelector(
    mapStateToSubscriptions,
    createConnectionStateSelector(),
    identity,
    (subscriptions, connection, state) => (connection
      ? stableMap(subscriptions, ({ name, params }) =>
        find(
          state.ddp &&
          state.ddp.subscriptions,
          x => x.socketId === connection.id && x.name === name && EJSON.equals(x.params, params),
        ),
      )
      : stableMap(subscriptions, constant(null))
    ),
  );

  const createQueriesStateSelector = () => createSelector(
    mapStateToQueries,
    createConnectionStateSelector(),
    identity,
    (queries, connection, state) => (connection
      ? stableMap(queries, ({ name, params }) =>
        find(
          state.ddp &&
          state.ddp.queries,
          x => x.socketId === connection.id && x.name === name && EJSON.equals(x.params, params),
        ),
      )
      : stableMap(queries, constant(null))
    ),
  );

  const userSelectorCreators = User
    ? createCollectionSelectors(User, User.collection)
    : null;

  const createCurrentUserIdSelector = () => createSelector(
    createConnectionStateSelector(),
    identity,
    (connection, state) => (connection
      ? state.ddp &&
        state.ddp.currentUser[connection.id] &&
        state.ddp.currentUser[connection.id].userId
      : null
    ),
  );

  const createCurrentUserSelector = () => userSelectorCreators.selectOne(
    createCurrentUserIdSelector(),
  );

  const createSelectorsForModel = (Model) => {
    const selectors = createCollectionSelectors(Model, Model.collection);
    if (User && User.collection === Model.collection) {
      selectors.current = createCurrentUserSelector;
    }
    return selectors;
  };

  return compose(
    setDisplayName('ddp'),
    connect(
      () => {
        const selectorCreateors = {};
        forEach(models, (Model) => {
          selectorCreateors[Model.collection] = createSelectorsForModel(Model);
        });
        if (User && !selectorCreateors[User.collection]) {
          selectorCreateors[User.collection] = createSelectorsForModel(User);
        }
        return createStructuredSelector({
          ...createEntitiesSelectors && createEntitiesSelectors(selectorCreateors),
          userId: createCurrentUserIdSelector(),

          subscriptions: createSubscriptionsStateSelector(),
          connection:    createConnectionStateSelector(),
          queries:       createQueriesStateSelector(),

          declaredSubscriptions: mapStateToSubscriptions,
          declaredConnection:    mapStateToConnection,
          declaredQueries:       mapStateToQueries,
        });
      },
    ),
    withState(
      'requestedSubscriptions',
      'setRequestedSubscriptions',
      [],
    ),
    withState(
      'requestedConnection',
      'setRequestedConnection',
      null,
    ),
    withState(
      'requestedQueries',
      'setRequestedQueries',
      [],
    ),
    lifecycle({
      componentWillMount() {
        this.updateSubscriptions = (props = this.props) => {
          const {
            dispatch,
            connection,
            subscriptions,
            declaredSubscriptions,
            requestedSubscriptions,
            setRequestedSubscriptions,
          } = props;
          if (!connection) {
            return;
          }
          const doNotDelete = keyBy(subscriptions, 'id');
          const doNotCreate = keyBy(requestedSubscriptions);
          forEach(requestedSubscriptions, (subId) => {
            if (doNotDelete[subId]) {
              return;
            }
            dispatch(unsubscribe(subId));
          });
          const newRequestedSubscriptions = stableMap(
            declaredSubscriptions,
            ({ name, params }, i) => {
              const sub = subscriptions[i];
              if (sub && doNotCreate[sub.id]) {
                return sub.id;
              }
              return dispatch(
                subscribe(name, params, {
                  socketId: connection.id,
                }),
              );
            },
          );
          if (!shallowEqual(newRequestedSubscriptions, requestedSubscriptions)) {
            setRequestedSubscriptions(newRequestedSubscriptions);
          }
        };
        this.updateConnection = (props = this.props) => {
          const {
            dispatch,
            connection,
            declaredConnection,
            requestedConnection,
            setRequestedConnection,
          } = props;
          // NOTE: If connection && connection.id === requestedConnection then nothing will happen
          if ((
            connection &&
            requestedConnection &&
            connection.id !== requestedConnection
          ) ||
          (
            !connection &&
            requestedConnection
          )) {
            dispatch(closeSocket(requestedConnection));
          }
          let newRequestedConnection;
          if (declaredConnection && (!connection || (connection.id !== requestedConnection))) {
            newRequestedConnection = dispatch(openSocket(declaredConnection.endpoint, declaredConnection.parmas));
          } else {
            newRequestedConnection = null;
          }
          if (newRequestedConnection !== requestedConnection) {
            setRequestedConnection(newRequestedConnection);
          }
        };
        this.updateQueries = (props = this.props) => {
          const {
            dispatch,
            connection,
            queries,
            declaredQueries,
            requestedQueries,
            setRequestedQueries,
          } = props;
          if (!connection) {
            return;
          }
          const doNotDelete = keyBy(queries, 'id');
          const doNotCreate = keyBy(requestedQueries);
          forEach(requestedQueries, (queryId) => {
            if (doNotDelete[queryId]) {
              return;
            }
            dispatch(queryRelease(queryId));
          });
          const newRequestedQueries = stableMap(
            declaredQueries,
            ({ name, params }, key) => {
              const query = queries[key];
              if (query && doNotCreate[query.id]) {
                return query.id;
              }
              return dispatch(
                queryRequest(name, params, {
                  socketId: connection.id,
                }),
              );
            },
          );
          if (!shallowEqual(newRequestedQueries, requestedQueries)) {
            setRequestedQueries(newRequestedQueries);
          }
        };
      },
      componentDidMount() {
        this.updateSubscriptions();
        this.updateConnection();
        this.updateQueries();
      },
      componentWillUnmount() {
        this.updateSubscriptions({
          dispatch:                  this.props.dispatch,
          requestedSubscriptions:    this.props.requestedSubscriptions,
          setRequestedSubscriptions: noop,
        });
        this.updateConnection({
          dispatch:            this.props.dispatch,
          connection:          null,
          requestedConnection: this.props.requestedConnection,
        });
        this.updateQueries({
          dispatch:            this.props.dispatch,
          requestedQueries:    this.props.requestedQueries,
          setRequestedQueries: noop,
        });
      },
      componentWillReceiveProps(nextProps) {
        const {
          connection,
          declaredSubscriptions,
          declaredConnection,
          declaredQueries,
        } = this.props;
        if (nextProps.connection !== connection || nextProps.declaredSubscriptions !== declaredSubscriptions) {
          this.updateSubscriptions(nextProps);
        }
        if (nextProps.declaredConnection !== declaredConnection) {
          this.updateConnection(nextProps);
        }
        if (nextProps.connection !== connection || nextProps.declaredQueries !== declaredQueries) {
          this.updateQueries(nextProps);
        }
      },
    }),
    (mapQueries
      ? withPropsOnChange([
        'queries',
      ], ({ queries }) => mapQueries(queries))
      : identity
    ),
    (Loader
      ? branch(
        ({
          subscriptions,
          connection,
          queries,
        }) => {
          if (some(subscriptions, x => !x || x.state === DDP_SUBSCRIPTION_STATE__PENDING)) {
            return false;
          }
          if (!connection || connection.state === DDP_CONNECTION_STATE__CONNECTING) {
            return false;
          }
          if (some(queries, x => !x || x.state === DDP_QUERY_STATE__PENDING)) {
            return false;
          }
          return true;
        },
        identity,
        renderComponent(Loader),
      )
      : identity
    ),
  );
};

export default ddp;

// const mutate = (request) => {
//   if (request) {
//     const { name, params } = request;
//     this.beginMutation();
//     return this.ddpConnector.apply(name, params, {})
//       .then(res => this.endMutation(res))
//       .catch((err) => {
//         this.endMutation();
//         if (onMutationError) {
//           onMutationError(err);
//         } else {
//           throw err;
//         }
//       });
//   }
//   return Promise.resolve();
// };
//
// this.handlers = {};
// Object.keys(mutations).forEach((key) => {
//   this.handlers[key] = (...args) => {
//     mutations[key]({
//       ...this.props,
//       mutate,
//     })(...args);
//   };
// });
// }
