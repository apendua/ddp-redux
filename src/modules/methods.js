import {
  DDP_METHOD,
  DDP_RESULT,
  DDP_UPDATED,
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
    case DDP_METHOD:
      return {
        ...state,
        [action.payload.id]: {
          state: 'pending',
          id:     action.payload.id,
          name:   action.payload.method,
          params: action.payload.params,
        },
      };
    case DDP_RESULT:
      return {
        ...state,
        [action.payload.id]: {
          ...state.methods[action.payload.id],
          result: action.payload.result,
          error:  action.payload.error,
        },
      };
    case DDP_UPDATED:
      return {
        ...state,
        [action.payload.id]: {
          ...state.methods[action.payload.id],
          state: 'updated',
        },
      };
    default:
      return state;
  }
};

