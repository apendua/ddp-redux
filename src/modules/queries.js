import {
  DDP_CREATE_QUERY,
  DDP_DELETE_QUERY,
  DDP_UPDATE_QUERY,
} from '../constants';

export const createMiddleware = ddpClient => store => next => (action) => {
  if (!action || typeof action !== 'object') {
    return next(action);
  }
  switch (action.type) {
    default:
      return next(action);
  }
};

export const createReducer = () => (state = {}, action) => {
  switch (action.type) {
    case DDP_CREATE_QUERY:
      return state;
    case DDP_DELETE_QUERY:
      return state;
    case DDP_UPDATE_QUERY:
      return state;
    default:
      return state;
  }
};

