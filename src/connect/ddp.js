import PropTypes from 'prop-types';
import forEach from 'lodash.foreach';
import keyBy from 'lodash.keyby';
import find from 'lodash.find';
import map from 'lodash.map';
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
import DDPClient from '../DDPClient';
import wrapSelector from './wrapSelector';
import {
  subscribe,
  unsubscribe,
  queryRequest,
  queryRelease,
  openSocket,
  closeSocket,
} from '../actions';
import {
  DDP_SUBSCRIPTION_STATE__PENDING,
  DDP_CONNECTION_STATE__CONNECTING,
  DDP_QUERY_STATE__PENDING,
} from '../constants';
import EJSON from '../ejson';
import {
  createSelectors,
} from '../modules/collections/selectors';

const identity = x => x;
const constant = x => () => x;
const noop = () => {};

const ddp = ({
  subscriptions: selectSubscriptions,
  queries:       selectQueries,
  connection:    selectConnection,
  slectors:      createEntitiesSelectors,
  loader:        Loader,
}) => {
  const mapStateToSubscriptions = wrapSelector(selectSubscriptions);
  const mapStateToConnection = wrapSelector(selectConnection);
  const mapStateToQueries = wrapSelector(selectQueries);

  const createConnectionStateSelector = () => createSelector(
    mapStateToConnection,
    ({ endpoint, params } = {}, state) =>
      find(
        state.ddp &&
        state.ddp.connections &&
        state.ddp.connections.sockets,
        x => x.endpoint === endpoint && EJSON.equals(x.params, params),
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
          x => x.meta.socketId === connection.id && x.name === name && EJSON.equals(x.params, params),
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
          x => x.meta.socketId === connection.id && x.name === name && EJSON.equals(x.params, params),
        ),
      )
      : map(queries, constant(null))
    ),
  );

  return compose(
    setDisplayName('ddp'),
    connect(
      () => createStructuredSelector({
        ...createEntitiesSelectors(createSelectors(DDPClient)),

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
          const doNotDelete = keyBy(subscriptions, 'id');
          const doNotCreate = keyBy(requestedSubscriptions);
          forEach(requestedSubscriptions, (subId) => {
            if (doNotDelete[subId]) {
              return;
            }
            dispatch(unsubscribe(subId));
          });
          if (connection) {
            setRequestedSubscriptions(
              map(
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
              ),
            );
          } else {
            setRequestedSubscriptions([]);
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
            connection.id !== requestedConnection
          ) ||
          (
            !connection &&
            requestedConnection
          )) {
            dispatch(closeSocket(requestedConnection));
          }
          if (!connection && declaredConnection) {
            setRequestedConnection(
              dispatch(openSocket(declaredConnection.endpoint, declaredConnection.parmas)),
            );
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
          const doNotDelete = keyBy(queries, 'id');
          const doNotCreate = keyBy(requestedQueries);
          forEach(requestedQueries, (queryId) => {
            if (doNotDelete[queryId]) {
              return;
            }
            dispatch(queryRelease(queryId));
          });
          if (connection) {
            setRequestedQueries(
              map(
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
              ),
            );
          } else {
            setRequestedQueries([]);
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
        this.updateSubscriptions(nextProps);
        this.updateConnection(nextProps);
        this.updateQueries(nextProps);
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
        renderComponent(Loader),
        identity,
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
