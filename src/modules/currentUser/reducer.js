/** @module createUser/reducer */

import omit from 'lodash/omit';
import {
  DDP_LOGOUT,
  DDP_LOGGED_OUT,
  DDP_LOGIN,
  DDP_LOGGED_IN,
  DDP_DISCONNECTED,

  DDP_USER_STATE__LOGGING_IN,
  DDP_USER_STATE__LOGGED_IN,
} from '../../constants';

export const createSocketReducer = () => (state = {}, action) => {
  switch (action.type) {
    case DDP_LOGIN:
    case DDP_LOGOUT:
      return {
        ...state,
        state: DDP_USER_STATE__LOGGING_IN,
      };
    case DDP_LOGGED_IN:
      return {
        ...state,
        state: DDP_USER_STATE__LOGGED_IN,
        userId: action.payload.id,
      };
    default:
      return state;
  }
};

export const createReducer = (DDPClient) => {
  const socketReducer = createSocketReducer(DDPClient);
  return (state = {}, action) => {
    switch (action.type) {
      case DDP_LOGGED_OUT:
      case DDP_DISCONNECTED:
        return (() => {
          const socketId = action.meta && action.meta.socketId;
          if (socketId && state[socketId]) {
            return omit(state, socketId);
          }
          return state;
        })();
      case DDP_LOGIN:
      case DDP_LOGOUT:
      case DDP_LOGGED_IN:
        return (() => {
          if (!action.meta) {
            return state;
          }
          const {
            socketId,
          } = action.meta;
          // NOTE: If socket is not yet there, it will be created.
          if (socketId) {
            return {
              ...state,
              [socketId]: socketReducer(state[socketId], action),
            };
          }
          return state;
        })();
      default:
        return state;
    }
  };
};
