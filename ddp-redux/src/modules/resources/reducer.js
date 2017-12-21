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

  DDP_RESOURCE_REQUEST,
  DDP_RESOURCE_RELEASE,
  DDP_RESOURCE_REFRESH,

  DDP_RESOURCE_CREATE,
  DDP_RESOURCE_DELETE,
  DDP_RESOURCE_UPDATE,
} from '../../constants';

const setProperty = propName => (value) => {
  if (typeof value === 'function') {
    return (state) => {
      const valueToSet = value(state[propName]);
      return (
        state[propName] === valueToSet
          ? state
          : {
            ...state,
            [propName]: valueToSet,
          }
      );
    };
  }
  return state => (
    state[propName] === value
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

const resourceReducer = (state = {
  state: DDP_STATE__INITIAL,
}, action) => {
  switch (action.type) {
    case DDP_RESOURCE_REQUEST:
      return increaseUsersByOne(state);
    case DDP_RESOURCE_RELEASE:
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
    case DDP_RESOURCE_CREATE:
      return {
        ...state,
        id: action.meta.resourceId,
        name: action.payload.name,
        params: action.payload.params,
        properties: action.payload.properties,
      };
    case DDP_RESOURCE_REFRESH:
      return state.users > 0 ? state : setState(DDP_STATE__OBSOLETE)(state);
    case DDP_RESOURCE_UPDATE: {
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
        ...other
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
        ...other,
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
    case DDP_RESOURCE_REQUEST:
    case DDP_RESOURCE_RELEASE:
    case DDP_RESOURCE_UPDATE:
    case DDP_RESOURCE_REFRESH:
    case DDP_DISCONNECTED: {
      const resourceId = action.meta &&
                         action.meta.resourceId;
      if (resourceId) {
        const resourceState = state[resourceId];
        return {
          ...state,
          [resourceId]: resourceReducer(resourceState, action),
        };
      }
      return state;
    }
    case DDP_RESOURCE_DELETE:
      return deleteKey(state, action.meta.resourceId);
    case DDP_RESOURCE_CREATE: {
      const resourceId = action.meta &&
                         action.meta.resourceId;
      if (resourceId) {
        return {
          ...state,
          [resourceId]: resourceReducer(state[resourceId], action),
        };
      }
      return state;
    }
    default:
      return state;
  }
};
