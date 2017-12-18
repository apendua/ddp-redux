import React from 'react';
import PropTypes from 'prop-types';
import forEach from 'lodash/forEach';
import keyBy from 'lodash/keyBy';
import map from 'lodash/map';
import compact from 'lodash/compact';
import mapValues from 'lodash/mapValues';
import isArray from 'lodash/isArray';
import without from 'lodash/without';
import { connect } from 'react-redux';
import {
  createSelector,
  createStructuredSelector,
} from 'reselect';
import {
  compose,
  withState,
} from 'recompose';
import {
  subscribe,
  unsubscribe,
  queryRequest,
  queryRelease,
  openSocket,
  closeSocket,
  callMethod,
} from 'ddp-redux';
import debounceProps from './debounceProps';
import connectDDP from './connectDDP';
import wrapSelector from './wrapSelector';

const stableMap = (collection, ...args) => (isArray(collection)
  ? map(collection, ...args)
  : mapValues(collection, ...args)
);

const identity = x => x;
const constant = x => () => x;
const selectProp = propName => (state, props) => props[propName];

const createGetter = getIds => createSelector(
  identity,
  createSelector(
    getIds,
    ids => stableMap(ids, id => ({ id })),
  ),
  (current, idsOnly) => stableMap(idsOnly, (idObject, key) => {
    if (current[key]) {
      return current[key];
    }
    return idObject;
  }),
);

const privateCreateConnector = ({
  models,
  User,
  debounceReady,
  debounceQueries,
  // TODO: I am not sure how this should work yet
  // debounceMutations,
  debounceSubscriptions,
  mutations:     mutationHandlers,
  subscriptions: selectSubscriptions,
  queries:       selectQueries,
  connection:    selectConnection,
  selectors:     createSelectors,
  loader:        Loader,
  handlers,
  mapQueries,
  mapMutations,
  mapSubscriptions,
}) => {
  const selectDeclaredSubscriptions = wrapSelector(selectSubscriptions);
  const selectDeclaredConnection = wrapSelector(selectConnection);
  const selectDeclaredQueries = wrapSelector(selectQueries);
  const selectDeclaredMutations = (state, props) => props.requestedMethodsIds;

  const createContainer = (BaseComponent) => {
    const noApiSpec = PropTypes.oneOf([
      false,
      null,
      undefined,
    ]);

    const apiSpec = PropTypes.shape({
      name: PropTypes.string.isRequired,
      params: PropTypes.arrayOf(PropTypes.any),
    });

    const collectionOfSpecs = PropTypes.oneOfType([
      noApiSpec,
      PropTypes.objectOf(
        PropTypes.oneOfType([
          apiSpec,
          noApiSpec,
        ]),
      ),
      PropTypes.arrayOf(
        PropTypes.oneOfType([
          apiSpec,
          noApiSpec,
        ]),
      ),
    ]);

    const collection = PropTypes.oneOfType([
      PropTypes.objectOf(
        PropTypes.any,
      ),
      PropTypes.arrayOf(
        PropTypes.any,
      ),
    ]);

    const propTypes = {
      dispatch: PropTypes.func.isRequired,
      subscriptions: collection,
      connection: collection,
      queries: collection,
      declaredSubscriptions: collectionOfSpecs,
      declaredConnection: collectionOfSpecs,
      declaredQueries: collectionOfSpecs,
      requestedMethodsIds: PropTypes.arrayOf(PropTypes.string),
      setRequestedMethodsIds: PropTypes.func,
      mutations: collection,
    };

    const defaultProps = {
      subscriptions: [],
      connection: null,
      queries: [],
      declaredSubscriptions: null,
      declaredConnection: null,
      declaredQueries: null,
      requestedMethodsIds: null,
      setRequestedMethodsIds: null,
      mutations: {},
    };

    class Container extends React.Component {
      constructor(props) {
        super(props);

        this.requestedSubscriptionsIds = null;
        this.requestedConnectionId = null;
        this.requestedQueriesIds = null;
        this.unmounted = false;

        const mutate = (requests) => {
          const {
            dispatch,
            connection,
            setRequestedMethodsIds,
          } = this.props;
          const promises = map(isArray(requests) ? requests : [requests], (request) => {
            if (request) {
              const {
                name,
                params,
                error,
              } = request;
              if (error) {
                return Promise.reject(error);
              }
              if (!connection) {
                return Promise.reject('Cannot call method if connection is not defined');
              }
              return dispatch(callMethod(name, params, {
                socketId: connection.id,
              }));
            }
            return Promise.resolve();
          });
          const newMutations = compact(map(promises, 'id'));
          if (newMutations.length > 0) {
            setRequestedMethodsIds(requestedMethodsIds => [
              ...requestedMethodsIds,
              ...compact(map(promises, 'id')),
            ]);
            const clean = () => {
              if (!this.unmounted) {
                setRequestedMethodsIds(requestedMethodsIds => without(requestedMethodsIds, ...newMutations));
              }
            };
            Promise.all(promises).then(clean, clean);
          }
          return isArray(requests)
            ? Promise.all(promises)
            : promises[0] || Promise.resolve();
        };

        this.handlers = {};
        forEach(mutationHandlers, (handler, key) => {
          this.handlers[key] = (...args) => {
            const result = handler({
              mutate,
              ...this.handlers,
              ...this.props,
            })(...args);
            return result;
          };
        });

        this.getQueries = createGetter(
          () => this.requestedQueriesIds,
        );

        this.getMutations = createGetter(
          () => this.props.requestedMethodsIds,
        );

        this.getSubscriptions = createGetter(
          () => this.requestedSubscriptionsIds,
        );
      }

      componentDidMount() {
        this.updateSubscriptions();
        this.updateConnection();
        this.updateQueries();
      }

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
      }

      componentWillUnmount() {
        this.updateSubscriptions({
          dispatch: this.props.dispatch,
        });
        this.updateConnection({
          dispatch:   this.props.dispatch,
          connection: null,
        });
        this.updateQueries({
          dispatch: this.props.dispatch,
        });
        this.unmounted = true;
      }

      updateSubscriptions(props = this.props) {
        const {
          dispatch,
          connection,
          subscriptions,
          declaredSubscriptions,
        } = props;
        const requestedSubscriptionsIds = this.requestedSubscriptionsIds;
        if (!connection && declaredSubscriptions) {
          return;
        }
        const doNotDelete = keyBy(subscriptions, 'id');
        const doNotCreate = keyBy(requestedSubscriptionsIds);
        forEach(requestedSubscriptionsIds, (subId) => {
          // NOTE: Here, subId can only be null, if the subscription request was empty.
          if (!subId || doNotDelete[subId]) {
            return;
          }
          dispatch(unsubscribe(subId));
        });
        // NOTE: If declared subscriptions is an array we get result of the form
        //       ['1', '2', '3']
        //       but it can also be an object, in which case we get:
        //       { sub1: '1', sub2: '2', sub3: '3' }
        const newRequestedSubscriptionsIds = stableMap(
          declaredSubscriptions,
          (request, key) => {
            if (!request) {
              return null;
            }
            const sub = subscriptions[key];
            if (sub && doNotCreate[sub.id]) {
              return sub.id;
            }
            return dispatch(
              subscribe(request.name, request.params, {
                socketId: connection.id,
              }),
            );
          },

        );
        this.requestedSubscriptionsIds = newRequestedSubscriptionsIds;
      }

      updateQueries(props = this.props) {
        const {
          dispatch,
          connection,
          queries,
          declaredQueries,
        } = props;
        const requestedQueriesIds = this.requestedQueriesIds;
        if (!connection && declaredQueries) {
          return;
        }
        const doNotDelete = keyBy(queries, 'id');
        const doNotCreate = keyBy(requestedQueriesIds);
        forEach(requestedQueriesIds, (queryId) => {
          // NOTE: Here, queryId can only be null, if the query request was empty.
          if (!queryId || doNotDelete[queryId]) {
            return;
          }
          dispatch(queryRelease(queryId));
        });
        // NOTE: If declared queires is an array we get result of the form
        //       ['1', '2', '3']
        //       but it can also be an object, in which case we get:
        //       { query1: '1', query2: '2', query3: '3' }
        const newRequestedQueriesIds = stableMap(
          declaredQueries,
          (request, key) => {
            if (!request) {
              return null;
            }
            const query = queries[key];
            if (query && doNotCreate[query.id]) {
              return query.id;
            }
            return dispatch(
              queryRequest(request.name, request.params, {
                socketId: connection.id,
              }),
            );
          },
        );
        this.requestedQueriesIds = newRequestedQueriesIds;
      }

      updateConnection(props = this.props) {
        const {
          dispatch,
          connection,
          declaredConnection,
        } = props;
        const requestedConnectionId = this.requestedConnectionId;
        // NOTE: If connection && connection.id === requestedConnectionId then nothing will happen
        if ((
          connection &&
          requestedConnectionId &&
          connection.id !== requestedConnectionId
        ) ||
        (
          !connection &&
          requestedConnectionId
        )) {
          dispatch(closeSocket(requestedConnectionId));
        }
        let newRequestedConnectionId;
        if (declaredConnection && (!connection || (connection.id !== requestedConnectionId))) {
          newRequestedConnectionId = dispatch(openSocket(declaredConnection.endpoint, declaredConnection.params));
        } else {
          newRequestedConnectionId = null;
        }
        this.requestedConnectionId = newRequestedConnectionId;
      }

      render() {
        const {
          declaredConnection,
          declaredSubscriptions,
          declaredQueries,

          setRequestedMethodsIds,
          requestedMethodsIds,
          mutations,
          connection,
          subscriptions,
          queries,

          ...props
        } = this.props;
        if (mapQueries) {
          Object.assign(props, mapQueries(
            this.getQueries(queries),
          ));
        }
        if (mapMutations) {
          Object.assign(props, mapMutations(
            this.getMutations(mutations),
          ));
        }
        if (mapSubscriptions) {
          Object.assign(props, mapSubscriptions(
            this.getSubscriptions(subscriptions),
          ));
        }
        Object.assign(props, this.handlers);
        if (
          Loader &&
          (
            !props.subscriptionsReady ||
            !props.queriesReady ||
            !props.connectionReady ||
            !props.mutationsReady
          )
        ) {
          return React.createElement(Loader);
        }
        return React.createElement(BaseComponent, props);
      }
    }

    Container.propTypes = propTypes;
    Container.defaultProps = defaultProps;

    return Container;
  };

  const deferred = !!debounceQueries || !!debounceSubscriptions;

  return compose(
    withState('requestedMethodsIds', 'setRequestedMethodsIds', []),
    deferred
      ? compose(
        connect(
          createStructuredSelector({
            declaredQueries:       selectDeclaredQueries,
            declaredSubscriptions: selectDeclaredSubscriptions,
          }),
        ),
        debounceQueries
          ? debounceProps([
            'declaredQueries',
          ], { ms: debounceQueries })
          : identity,
        debounceSubscriptions
          ? debounceProps([
            'declaredSubscriptions',
          ], { ms: debounceSubscriptions })
          : identity,
      )
      : identity,
    connectDDP({
      User,
      models,
      createSelectors,
      selectDeclaredMutations,
      selectDeclaredQueries: deferred ? selectProp('declaredQueries') : selectDeclaredQueries,
      selectDeclaredConnection,
      selectDeclaredSubscriptions: deferred ? selectProp('declaredSubscriptions') : selectDeclaredSubscriptions,
    }),
    // TODO: Combine the following three in a single "debounce" higher order component.
    debounceReady
      ? debounceProps([
        'subscriptionsReady',
        'connectionReady',
        'queriesReady',
        'mutationsReady',
      ], { ms: debounceReady })
      : identity,
    createContainer,
  );
};

const createConnector = ({
  defaultMapQueries = constant(null),
  defaultMapMutations = constant(null),
  defaultMapSubscriptions = constant(null),
  defaultLoader,
  defaultDebounceReady,
  defaultDebounceQueries,
  defaultDebounceMutations,
  defaultDebounceSubscriptions,
} = {}) => (options) => {
  const {
    debounceReady = defaultDebounceReady,
    debounceQueries = defaultDebounceQueries,
    debounceMutations = defaultDebounceMutations,
    debounceSubscriptions = defaultDebounceSubscriptions,
    loader = defaultLoader,
    mapQueries = defaultMapQueries(options),
    mapMutations = defaultMapMutations(options),
    mapSubscriptions = defaultMapSubscriptions(options),
  } = options;
  return privateCreateConnector({
    ...options,
    debounceReady,
    debounceQueries,
    debounceMutations,
    debounceSubscriptions,
    loader,
    mapQueries,
    mapMutations,
    mapSubscriptions,
  });
};

export default createConnector;
