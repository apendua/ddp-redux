import has from 'lodash/has';
import omit from 'lodash/omit';
import {
  DDP_STATE__INITIAL,
  DDP_STATE__QUEUED,
  DDP_STATE__PENDING,
  DDP_STATE__READY,
  DDP_STATE__OBSOLETE,
  DDP_STATE__RESTORING,
  DDP_STATE__CANCELED,

  DDP_ENQUEUE,
  DDP_DISCONNECTED,

  DDP_QUERY_REQUEST,
  DDP_QUERY_RELEASE,

  DDP_QUERY_CREATE,
  DDP_QUERY_DELETE,
  DDP_QUERY_UPDATE,
  DDP_QUERY_REFETCH,
} from '../../constants';

const setProperty = propName => (value) => {
  if (typeof value === 'function') {
    return (state) => {
      const valueToSet = value(state[propName]);
      return (state[propName] === valueToSet
        ? state
        : {
          ...state,
          [propName]: valueToSet,
        }
      );
    };
  }
  return state => (state[propName] === value
    ? state
    : {
      ...state,
      [propName]: value,
    }
  );
};

const increaseBy = value => (currentValue = 0) => currentValue + value;

const increaseProperty = propName => value => setProperty(propName)(increaseBy(value));

const setState = setProperty('state');
const deleteKey = (object, key) => {
  if (has(object, key)) {
    return omit(object, key);
  }
  return object;
};

const increaseUsersByOne = increaseProperty('users')(1);
const decreaseUsersByOne = increaseProperty('users')(-1);

const queryReducer = (state = {
  state: DDP_STATE__INITIAL,
}, action) => {
  switch (action.type) {
    case DDP_QUERY_REQUEST:
      return increaseUsersByOne(state);
    case DDP_QUERY_RELEASE:
      return decreaseUsersByOne(state);
    case DDP_ENQUEUE: {
      switch (state.state) {
        case DDP_STATE__INITIAL:
          return setState(DDP_STATE__QUEUED)(state);
        default:
          return state;
      }
    }
    case DDP_DISCONNECTED: {
      switch (state.state) {
        case DDP_STATE__PENDING:
          return setState(DDP_STATE__CANCELED)(state);
        case DDP_STATE__READY:
        case DDP_STATE__RESTORING:
          return setState(DDP_STATE__OBSOLETE)(state);
        default:
          return state;
      }
    }
    case DDP_QUERY_CREATE:
      return {
        ...state,
        id: action.meta.queryId,
        name: action.payload.name,
        params: action.payload.params,
        properties: action.payload.properties,
      };
    case DDP_QUERY_REFETCH:
      return state.users > 0 ? state : setState(DDP_STATE__OBSOLETE)(state);
    case DDP_QUERY_UPDATE: {
      if (!action.payload) {
        switch (state.state) {
          case DDP_STATE__INITIAL:
          case DDP_STATE__QUEUED:
            return setState(DDP_STATE__PENDING)(state);
          case DDP_STATE__READY:
            return setState(DDP_STATE__RESTORING)(state);
          default:
            return state;
        }
      }
      const {
        error,
        result,
        entities,
      } = action.payload;
      if (error) {
        return {
          ...state,
          error,
          state: DDP_STATE__CANCELED,
        };
      }
      return {
        ...state,
        ...entities !== undefined && { entities },
        result,
        state: DDP_STATE__READY,
      };
    }
    default:
      return state;
  }
};

export const createReducer = () => (state = {}, action) => {
  switch (action.type) {
    case DDP_ENQUEUE:
    case DDP_QUERY_REQUEST:
    case DDP_QUERY_RELEASE:
    case DDP_QUERY_UPDATE:
    case DDP_QUERY_REFETCH:
    case DDP_DISCONNECTED: {
      const queryId = action.meta &&
                      action.meta.queryId;
      if (queryId) {
        const queryState = state[queryId];
        return {
          ...state,
          [queryId]: queryReducer(queryState, action),
        };
      }
      return state;
    }
    case DDP_QUERY_DELETE:
      return deleteKey(state, action.meta.queryId);
    case DDP_QUERY_CREATE: {
      const queryId = action.meta &&
                      action.meta.queryId;
      if (queryId) {
        return {
          ...state,
          [queryId]: queryReducer(state[queryId], action),
        };
      }
      return state;
    }
    default:
      return state;
  }
};
