import forEach from 'lodash.foreach';
import keyBy from 'lodash.keyby';
import find from 'lodash.find';
import map from 'lodash.map';
import shallowEqual from 'shallowequal';
import {
  compose,
  branch,
  lifecycle,
  withState,
  renderComponent,
  setDisplayName,
} from 'recompose';
import {
  createSelector,
  createStructuredSelector,
} from 'reselect';
import { connect } from 'react-redux';
import DDPClient, { EJSON } from 'ddp-client';
import {
  subscribe,
  unsubscribe,
  queryRequest,
  queryRelease,
  openSocket,
  closeSocket,
} from 'ddp-client/lib/actions';
import {
  DEFAULT_SOCKET_ID,
  DDP_SUBSCRIPTION_STATE__PENDING,
  DDP_CONNECTION_STATE__CONNECTING,
  DDP_QUERY_STATE__PENDING,
} from 'ddp-client/lib/constants';
import {
  createSelectors,
} from 'ddp-client/lib/modules/collections/selectors';
import wrapSelector from './wrapSelector';

const identity = x => x;
const constant = x => () => x;
const noop = () => {};

const ddp = ({
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
      ? map(subscriptions, ({ name, params }) =>
        find(
          state.ddp &&
          state.ddp.subscriptions,
          x => x.socketId === connection.id && x.name === name && EJSON.equals(x.params, params),
        ),
      )
      : map(subscriptions, constant(null))
    ),
  );

  const createQueriesStateSelector = () => createSelector(
    mapStateToQueries,
    createConnectionStateSelector(),
    identity,
    (queries, connection, state) => (connection
      ? map(queries, ({ name, params }) =>
        find(
          state.ddp &&
          state.ddp.queries,
          x => x.socketId === connection.id && x.name === name && EJSON.equals(x.params, params),
        ),
      )
      : map(queries, constant(null))
    ),
  );
  return compose(
    setDisplayName('ddp'),
    connect(
      () => createStructuredSelector({
        ...createEntitiesSelectors && createEntitiesSelectors(createSelectors(DDPClient)),

        subscriptions: createSubscriptionsStateSelector(),
        connection:    createConnectionStateSelector(),
        queries:       createQueriesStateSelector(),

        declaredSubscriptions: mapStateToSubscriptions,
        declaredConnection:    mapStateToConnection,
        declaredQueries:       mapStateToQueries,
      }),
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
          const newRequestedSubscriptions = map(
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
          const newRequestedQueries = map(
            declaredQueries,
            ({ name, params }, i) => {
              const query = queries[i];
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
    (Loader
      ? branch(
        ({
          subscriptions,
          connection,
          queries,
        }) => {
          if (subscriptions.some(x => !x || x.state === DDP_SUBSCRIPTION_STATE__PENDING)) {
            return false;
          }
          if (!connection || connection.state === DDP_CONNECTION_STATE__CONNECTING) {
            return false;
          }
          if (queries.some(x => !x || x.state === DDP_QUERY_STATE__PENDING)) {
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
