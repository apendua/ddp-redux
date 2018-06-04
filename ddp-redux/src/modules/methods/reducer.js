import omit from 'lodash/omit';
import {
  DDP_METHOD_STATE__QUEUED,
  DDP_METHOD_STATE__PENDING,
  DDP_METHOD_STATE__UPDATED,
  DDP_METHOD_STATE__RETURNED,

  DDP_CANCEL,
  DDP_METHOD,
  DDP_RESULT,
  DDP_UPDATED,
  DDP_ENQUEUE,
} from '../../constants';
import { extractMetadata } from './helpers';
import carefullyMapValues from '../../utils/carefullyMapValues';

export const createReducer = () => (state = {}, action) => {
  const id = action.meta && action.meta.methodId;
  switch (action.type) {
    case DDP_CANCEL:
      return carefullyMapValues(state, (method, methodId, remove) => {
        if (methodId === action.meta.methodId) {
          return remove(methodId);
        }
        return method;
      });
    case DDP_ENQUEUE: {
      if (action.meta.methodId) {
        const { methodId } = action.meta;
        return {
          ...state,
          [methodId]: {
            ...state[methodId],
            id: methodId,
            state: DDP_METHOD_STATE__QUEUED,
          },
        };
      }
      return state;
    }
    case DDP_METHOD:
      return {
        ...state,
        [id]: {
          ...state[id],
          id,
          state: DDP_METHOD_STATE__PENDING,
          name: action.payload.method,
          params: action.payload.params,
          ...extractMetadata(action.meta),
        },
      };
    case DDP_RESULT:
      return state[id] && state[id].state === DDP_METHOD_STATE__PENDING
        ? {
          ...state,
          [id]: {
            ...state[id],
            state: DDP_METHOD_STATE__RETURNED,
            result: action.payload.result,
            error: action.payload.error,
          },
        }
        : omit(state, id);
    case DDP_UPDATED:
      return carefullyMapValues(state, (method, methodId, remove) => {
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

