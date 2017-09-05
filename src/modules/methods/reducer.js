import omit from 'lodash.omit';
import {
  DDP_METHOD_STATE__PENDING,
  DDP_METHOD_STATE__UPDATED,
  DDP_METHOD_STATE__RETURNED,

  DDP_CANCEL,
  DDP_METHOD,
  DDP_RESULT,
  DDP_UPDATED,
} from '../../constants';
import decentlyMapValues from '../../utils/decentlyMapValues';

export const createReducer = () => (state = {}, action) => {
  const id = action.payload && action.payload.id;
  switch (action.type) {
    case DDP_CANCEL:
      return decentlyMapValues(state, (method, methodId, remove) => {
        if (methodId === action.meta.id) {
          return remove(methodId);
        }
        return method;
      });
    case DDP_METHOD:
      return {
        ...state,
        [id]: {
          id,
          state:    DDP_METHOD_STATE__PENDING,
          name:     action.payload.method,
          params:   action.payload.params,
          ...action.meta && action.meta.socketId && {
            socketId: action.meta.socketId,
          },
        },
      };
    case DDP_RESULT:
      return state[id] && state[id].state === DDP_METHOD_STATE__PENDING
        ? {
          ...state,
          [id]: {
            ...state[id],
            state:  DDP_METHOD_STATE__RETURNED,
            result: action.payload.result,
            error:  action.payload.error,
          },
        }
        : omit(state, id);
    case DDP_UPDATED:
      return decentlyMapValues(state, (method, methodId, remove) => {
        if (action.payload.methods.indexOf(methodId) < 0) {
          return method;
        }
        if (method.state === DDP_METHOD_STATE__RETURNED) {
          return remove(methodId);
        }
        return {
          ...method,
          state: DDP_METHOD_STATE__UPDATED,
        };
      });
    default:
      return state;
  }
};

