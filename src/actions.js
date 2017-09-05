import {
  DDP_METHOD,
  DDP_SUBSCRIBE,
  DDP_UNSUBSCRIBE,
  DDP_QUERY_REQUEST,
  DDP_QUERY_RELEASE,
} from './constants';

export const callMethod = (name, params, meta) => ({
  type: DDP_METHOD,
  payload: {
    params,
    method: name,
  },
  ...meta && { meta },
});

export const subscribe = (name, params, meta) => ({
  type: DDP_SUBSCRIBE,
  payload: {
    name,
    params,
  },
  ...meta && { meta },
});

export const unsubscribe = (id, meta) => ({
  type: DDP_UNSUBSCRIBE,
  payload: {
    id,
  },
  ...meta && { meta },
});

export const request = (name, params, meta) => ({
  type: DDP_QUERY_REQUEST,
  payload: {
    name,
    params,
  },
  ...meta && { meta },
});

export const release = (name, params, meta) => ({
  type: DDP_QUERY_RELEASE,
  payload: {
    name,
    params,
  },
  ...meta && { meta },
});
