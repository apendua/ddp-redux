import {
  DDP_OPEN,
  DDP_CLOSE,
  DDP_METHOD,
  DDP_SUBSCRIBE,
  DDP_UNSUBSCRIBE,
  DDP_QUERY_REQUEST,
  DDP_QUERY_RELEASE,
} from './constants';

export const openSocket = (endpoint, params, meta) => ({
  type: DDP_OPEN,
  payload: {
    endpoint,
    params,
  },
  ...meta && { meta },
});

export const closeSocket = (socketId, meta) => ({
  type: DDP_CLOSE,
  meta: {
    ...meta,
    socketId,
  },
});

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

export const unsubscribe = (subId, meta) => ({
  type: DDP_UNSUBSCRIBE,
  meta: {
    ...meta,
    subId,
  },
});

export const queryRequest = (name, params, meta) => ({
  type: DDP_QUERY_REQUEST,
  payload: {
    name,
    params,
  },
  ...meta && { meta },
});

export const queryRelease = (queryId, meta) => ({
  type: DDP_QUERY_RELEASE,
  meta: {
    ...meta,
    queryId,
  },
});
