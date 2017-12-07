import forEach from 'lodash/forEach';
import {
  DDP_OPEN,
  DDP_CLOSE,
  DDP_METHOD,
  DDP_SUBSCRIBE,
  DDP_UNSUBSCRIBE,
  DDP_QUERY_REQUEST,
  DDP_QUERY_RELEASE,
  DDP_QUERY_REFETCH,

  DDP_LOGIN,
  DDP_LOGOUT,
} from './constants';
import sha256 from './utils/sha256';

const hashPassword = password => ({
  digest: sha256(password),
  algorithm: 'sha-256',
});

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

export const queryRequest = (name, params, properties) => ({
  type: DDP_QUERY_REQUEST,
  payload: {
    name,
    params,
    properties,
  },
});

export const queryRelease = (queryId, meta) => ({
  type: DDP_QUERY_RELEASE,
  meta: {
    ...meta,
    queryId,
  },
});


export const queryRefetch = (queryId, meta) => ({
  type: DDP_QUERY_REFETCH,
  meta: {
    ...meta,
    queryId,
  },
});

// NOTE: Do not use this method in general!
export const queryRefetchAll = () => (dispatch, getState) => {
  const state = getState();
  forEach(state.ddp.queries, (qyery, queryId) => {
    dispatch(queryRefetch(queryId));
  });
};

export const login = (params, meta) => ({
  type: DDP_LOGIN,
  payload: [params],
  ...meta && { meta },
});

export const logout = meta => ({
  type: DDP_LOGOUT,
  ...meta && { meta },
});

export const loginWithPassword = ({
  username,
  email,
  password,
}, meta) => login({
  user: {
    username,
    email,
  },
  password: hashPassword(password),
}, meta);

export const createUser = ({
  password,
  ...rest
}, meta) => ({
  type: DDP_LOGIN,
  payload: [{
    password: hashPassword(password),
    ...rest,
  }],
  meta: {
    ...meta,
    method: 'createUser',
  },
});

export const resetPassword = ({
  token,
  newPassword,
}, meta) => ({
  type: DDP_LOGIN,
  payload: [
    token,
    hashPassword(newPassword),
  ],
  meta: {
    ...meta,
    method: 'resetPassword',
  },
});

export const forgotPassword = ({
  email,
}, meta) => callMethod('forgotPassword', [{ email }], meta);
