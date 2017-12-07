import has from 'lodash/has';
import omit from 'lodash/omit';
import {
  DEFAULT_SOCKET_ID,

  DDP_QUERY_STATE__INITIAL,
  DDP_QUERY_STATE__QUEUED,
  DDP_QUERY_STATE__PENDING,
  DDP_QUERY_STATE__READY,
  DDP_QUERY_STATE__RESTORING,

  DDP_METHOD,
  DDP_ENQUEUE,
  DDP_RESULT,

  DDP_QUERY_REQUEST,
  DDP_QUERY_RELEASE,

  DDP_QUERY_CREATE,
  DDP_QUERY_DELETE,
  DDP_QUERY_UPDATE,
} from '../../constants';

const setProperty = propName => (value) => {
  if (typeof value === 'function') {
    return state => ({
      ...state,
      [propName]: value(state[propName]),
    });
  }
  return state => ({
    ...state,
    [propName]: value,
  });
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
  state: DDP_QUERY_STATE__INITIAL,
}, action) => {
  switch (action.type) {
    case DDP_QUERY_REQUEST:
      return increaseUsersByOne(state);
    case DDP_QUERY_RELEASE:
      return decreaseUsersByOne(state);
    case DDP_ENQUEUE: {
      switch (state.state) {
        case DDP_QUERY_STATE__INITIAL:
          return setState(DDP_QUERY_STATE__QUEUED)(state);
        default:
          return state;
      }
    }
    case DDP_METHOD: {
      switch (state.state) {
        case DDP_QUERY_STATE__INITIAL:
        case DDP_QUERY_STATE__QUEUED:
          return setState(DDP_QUERY_STATE__PENDING)(state);
        case DDP_QUERY_STATE__READY:
          return setState(DDP_QUERY_STATE__RESTORING)(state);
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
    case DDP_QUERY_UPDATE:
      return {
        ...state,
        state: DDP_QUERY_STATE__READY,
        entities: action.payload.entities,
      };
    case DDP_RESULT: {
      if (action.payload.error) {
        return {
          ...state,
          error: action.payload.error,
        };
      }
      return {
        ...state,
        result: action.payload.result,
      };
    }
    default:
      return state;
  }
};

export const createReducer = () => (state = {}, action) => {
  switch (action.type) {
    case DDP_QUERY_REQUEST:
    case DDP_QUERY_RELEASE:
    case DDP_ENQUEUE:
    case DDP_METHOD:
    case DDP_RESULT:
    case DDP_QUERY_UPDATE: {
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
