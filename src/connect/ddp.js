import React from 'react';
import PropTypes from 'prop-types';
import forEach from 'lodash.foreach';
import map from 'lodash.map';
import difference from 'lodash.difference';
import EJSON from '../ejson';

const ddp = ({
  subscriptions: makeMapStateToSubscriptions,
  queries: makeMapStateToQueries,
  mutations = {},
}, {
  onMutationError,
  renderLoader = defaultComponent => React.createElement(defaultComponent),
  getResourceId = params => EJSON.stringify(params),
  queriesUpdateDelay,
  subscriptionsUpdateDalay,
} = {}) => (Inner) => {
  const propTypes = {
    subscriptions: PropTypes.array,
    queries: PropTypes.object,
    subscriptionsReady: PropTypes.bool,
    queriesReady: PropTypes.bool,
  };

  const defaultProps = {
    subscriptions: [],
    queries: {},
    subscriptionsReady: true,
    queriesReady: true,
  };

  class Container extends React.Component {
    constructor(props) {
      super(props);

      this.state = {
        subscriptionIds: [],
        queryIds:        [],
      };

      const mutate = (request) => {
        if (request) {
          const { name, params } = request;
          this.beginMutation();
          return this.ddpConnector.apply(name, params, {})
            .then(res => this.endMutation(res))
            .catch((err) => {
              this.endMutation();
              if (onMutationError) {
                onMutationError(err);
              } else {
                throw err;
              }
            });
        }
        return Promise.resolve();
      };

      this.handlers = {};
      Object.keys(mutations).forEach((key) => {
        this.handlers[key] = (...args) => {
          mutations[key]({
            ...this.props,
            mutate,
          })(...args);
        };
      });
    }

    componentDidMount() {
      this.updateSubscriptions(this.props);
      this.updateQueries(this.props);
    }

    componentWillReceiveProps(nextProps) {
      this.updateSubscriptions(nextProps);
      this.updateQueries(nextProps);
    }

    componentWillUnmount() {
      this.updateSubscriptions();
      this.updateQueries();
    }

    updateSubscriptions(nextProps = {}) {
      const dispatch = this.props.dispatch;
      const subscriptionIds = map(nextProps.subscriptions, sub => dispatch({
        type: '@DDP/API/SUBSCRIBE',
        payload: {
          name:   sub.name,
          params: sub.params,
        },
      }));
      forEach(this.state.subscriptionIds, id => dispatch({
        type: '@DDP/API/UNSUBSCRIBE',
        payload: {
          id,
        },
      }));
      this.setState({ subscriptionIds });
    }

    updateQueries(nextProps = {}) {
      const dispatch = this.props.dispatch;
      const queryIds = map(nextProps.subscriptions, sub => dispatch({
        type: '@DDP/API/START_QUERY',
        payload: {
          name:   sub.name,
          params: sub.params,
        },
      }));
      forEach(this.state.queryIds, id => dispatch({
        type: '@DDP/API/STOP_QUERY',
        payload: {
          id,
        },
      }));
      this.setState({ queryIds });
    }

    beginMutation() {
      this.setState({
        numberOfPendingMutations: this.state.numberOfPendingMutations + 1,
      });
    }

    endMutation(result) {
      this.setState({
        numberOfPendingMutations: this.state.numberOfPendingMutations - 1,
      });
      return result;
    }

    render() {
      const { ddpConnector } = this.context;
      const {
        numberOfPendingMutations,
      } = this.state;
      const {
        subscriptionsReady,
        queriesReady,
        queries,
        subscriptions,
        ...other
      } = this.props;
      const mutationsReady = numberOfPendingMutations <= 0;
      if (renderLoader &&
        (
          !subscriptionsReady ||
          !mutationsReady ||
          !queriesReady
        )
      ) {
        return renderLoader(ddpConnector.getLoaderComponent(), {
          ...other,
          subscriptionsReady,
          mutationsReady,
          queriesReady,
        });
      }
      return React.createElement(Inner, {
        ...other,
        ...this.handlers,
        queriesReady,
        mutationsReady,
        subscriptionsReady,
      });
    }
  }

  Container.propTypes = propTypes;
  Container.defaultProps = defaultProps;
  Container.contextTypes = contextTypes;

  if (process.env.NODE_ENV !== 'production') {
    Container.displayName = `ddp(${Inner.displayName})`;
  }

  const wrappedMapStateToSubscriptions = wrapMapState(makeMapStateToSubscriptions);
  const wrappedMapStateToQueries = wrapMapState(makeMapStateToQueries);

  return connect(
    () => {
      const getSubscriptionsReady = makeGetSubscriptionsReady((_, x) => getResourceId(x));
      const getQueriesValues = makeGetQueriesValues((_, x) => getResourceId(x));
      const getQueriesReady = makeGetQueriesReady((_, x) => getResourceId(x));
      //----------------------------------------------------------------------
      return (state, ownProps) => {
        const subscriptions = wrappedMapStateToSubscriptions(state, ownProps) || [];
        const queries = wrappedMapStateToQueries(state, ownProps) || {};
        return {
          ...getQueriesValues(state, queries),
          subscriptions,
          queries,
          subscriptionsReady: getSubscriptionsReady(state, { subscriptions }),
          queriesReady: getQueriesReady(state, { queries }),
        };
      };
    },
  )(Container);
};

export default ddp;
