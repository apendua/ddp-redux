import omit from 'lodash/omit';
import findIndex from 'lodash/findIndex';
import findLastIndex from 'lodash/findLastIndex';
import {
  DDP_ENQUEUE,
  DDP_QUEUE_RESET,
} from '../../constants';

export const queueReducer = (state = {
  elements: [],
  pending: {},
}, action) => {
  switch (action.type) {
    case DDP_QUEUE_RESET:
      return {
        ...state,
        pending: (action.payload &&
                  action.payload.initialPending) || {},
      };
    case DDP_ENQUEUE:
      return {
        ...state,
        elements: ((elements) => {
          // 1. elements with higher priority go first
          // 2. if priority is not specified, we assume 0
          const priority = action.meta.queue.priority || 0;
          const index = findLastIndex(elements, el => priority <= (el.meta.queue.priority || 0));
          const {
            type,
            ...meta
          } = action.meta;
          return [
            ...elements.slice(0, index + 1),
            {
              type,
              meta,
              payload: action.payload,
            },
            ...elements.slice(index + 1),
          ];
        })(state.elements),
      };
    default: {
      const {
        resolve,
        elementId,
      } = action.meta.queue;
      if (!elementId) {
        return state;
      }
      if (resolve) {
        return {
          ...state,
          pending: omit(state.pending, elementId),
        };
      }
      const index = findIndex(state.elements, el => el.meta.queue.elementId === elementId);
      if (index < 0) {
        return state;
      }
      const { pendingValue } = state.elements[index].meta.queue;
      return {
        ...state,
        ...pendingValue !== undefined && {
          pending: {
            ...state.pending,
            [elementId]: pendingValue,
          },
        },
        elements: [
          ...state.elements.slice(0, index),
          ...state.elements.slice(index + 1),
        ],
      };
    }
  }
};

export const createReducer = () => (state = {}, action) => {
  const queueId = action.meta &&
                  action.meta.queue &&
                  action.meta.queue.id;
  if (!queueId) {
    return state;
  }
  const queue = state[queueId];
  if (!queue && action.type !== DDP_QUEUE_RESET) {
    return state;
  }
  return {
    ...state,
    [queueId]: queueReducer(queue, action),
  };
};
