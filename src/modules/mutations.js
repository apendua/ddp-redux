import {
  DDP_MUTATE,
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
    case DDP_MUTATE:
      return state;
    default:
      return state;
  }
};

