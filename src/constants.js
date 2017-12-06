export const DDP_PROTOCOL_VERSION = '1';

export const DEFAULT_SOCKET_ID = 'default';

export const DDP_CONNECTION_STATE__CONNECTING = 'connecting';
export const DDP_CONNECTION_STATE__CONNECTED = 'connected';
export const DDP_CONNECTION_STATE__DISCONNECTED = 'disconnected';

export const DDP_USER_STATE__LOGGING_IN = 'loggingIn';
export const DDP_USER_STATE__LOGGED_IN = 'loggedIn';

export const DDP_SUBSCRIPTION_STATE__INITIAL = 'initial';
export const DDP_SUBSCRIPTION_STATE__QUEUED = 'queued';
export const DDP_SUBSCRIPTION_STATE__PENDING = 'pending';
export const DDP_SUBSCRIPTION_STATE__READY = 'ready';
export const DDP_SUBSCRIPTION_STATE__RESTORING = 'restoring';

// UNIVERSAL STATES
//
// initial
// queued (do we need this?)
// pending
// ready
// outdated (needs refresh)
// restoring
//

export const DDP_METHOD_STATE__QUEUED = 'queued';
export const DDP_METHOD_STATE__PENDING = 'pending';
// NOTE: Methods do not have "ready" state, because they're usually removed from store
//       as soon as they're completed, i.e. both "result" and "updated" messages are received.
//       However, we still use it in object that represents completed method in some method selectors.
export const DDP_METHOD_STATE__READY = 'ready';
export const DDP_METHOD_STATE__UPDATED = 'updated';
export const DDP_METHOD_STATE__RETURNED = 'returned';

export const DDP_QUERY_STATE__INITIAL = 'initial';
export const DDP_QUERY_STATE__QUEUED = 'queued';
export const DDP_QUERY_STATE__PENDING = 'pending';
export const DDP_QUERY_STATE__READY = 'ready';
export const DDP_QUERY_STATE__RESTORING = 'restoring';

export const DDP_FAILED = '@DDP.IN.FAILED';
export const DDP_ERROR = '@DDP.IN.ERROR';

export const DDP_ADDED = '@DDP.IN.ADDED';
export const DDP_CHANGED = '@DDP.IN.CHANGED';
export const DDP_REMOVED = '@DDP.IN.REMOVED';
export const DDP_ADDED_BEFORE = '@DDP.IN.ADDED_BEFORE';
export const DDP_MOVED_BEFORE = '@DDP.IN.MOVED_BEFORE';
export const DDP_FLUSH = '@DDP.COLLECTIONS.FLUSH';

export const DDP_SUB = '@DDP.OUT.SUB';
export const DDP_UNSUB = '@DDP.OUT.UNSUB';
export const DDP_READY = '@DDP.IN.READY';
export const DDP_NOSUB = '@DDP.IN.NOSUB';
export const DDP_SUBSCRIBE = '@DDP.SUB.SUBSCRIBE';
export const DDP_UNSUBSCRIBE = '@DDP.SUB.UNSUBSCRIBE';

export const DDP_PING = '@DDP.IN.PING';
export const DDP_PONG = '@DDP.OUT.PONG';
export const DDP_CONNECTED = '@DDP.IN.CONNECTED';
export const DDP_CONNECT = '@DDP.OUT.CONNECT';
export const DDP_ENQUEUE = '@DDP.SOCKET.ENQUEUE';
export const DDP_OPEN = '@DDP.SOCKET.OPEN';
export const DDP_CLOSE = '@DDP.SOCKET.CLOSE';
// TODO: We could use this one to allow cleaning up given connection
//       and potentially connecting to a new server.
// export const DDP_REOPEN = '@DDP.SOCKET.REOPEN';
export const DDP_DISCONNECTED = '@DDP.SOCKET.DISCONNECTED';

export const DDP_METHOD = '@DDP.OUT.METHOD';
export const DDP_CANCEL = '@DDP.METHOD.CANCEL';
export const DDP_RESULT = '@DDP.IN.RESULT';
export const DDP_UPDATED = '@DDP.IN.UPDATED';

export const DDP_LOGIN = '@DDP.USER.LOGIN';
export const DDP_LOGGED_IN = '@DDP.USER.LOGGED_IN';
export const DDP_LOGOUT = '@DDP.USER.LOGOUT';
export const DDP_LOGGED_OUT = '@DDP.USER.LOGGED_OUT';

export const DDP_QUERY_CREATE = '@DDP.QUERY.CREATE';
export const DDP_QUERY_DELETE = '@DDP.QUERY.DELETE';
export const DDP_QUERY_UPDATE = '@DDP.QUERY.UPDATE';

export const DDP_QUERY_REQUEST = '@DDP.QUERY.REQUEST';
export const DDP_QUERY_RELEASE = '@DDP.QUERY.RELEASE';
export const DDP_QUERY_REFETCH = '@DDP.QUERY.REFETCH';

// DDP messages

export const MSG_SUB = 'sub';
export const MSG_READY = 'ready';
export const MSG_UNSUB = 'unsub';
export const MSG_NOSUB = 'nosub';
export const MSG_ADDED = 'added';
export const MSG_REMOVED = 'removed';
export const MSG_CHANGED = 'changed';
export const MSG_ADDED_BEFORE = 'addedBefore';
export const MSG_MOVED_BEFORE = 'movedBefore';
export const MSG_METHOD = 'method';
export const MSG_UPDATED = 'updated';
export const MSG_RESULT = 'result';
export const MSG_PING = 'ping';
export const MSG_PONG = 'pong';
export const MSG_ERROR = 'error';
export const MSG_CONNECT = 'connect';
export const MSG_CONNECTED = 'connected';
export const MSG_FAILED = 'failed';

export const MESSAGE_TO_ACTION = {
  [MSG_READY]:        DDP_READY,
  [MSG_NOSUB]:        DDP_NOSUB,
  [MSG_ADDED]:        DDP_ADDED,
  [MSG_REMOVED]:      DDP_REMOVED,
  [MSG_CHANGED]:      DDP_CHANGED,
  // NOTE: These two are not supported at the moment;
  //       as a fallback, we interpret "added before"
  //       as "added", so ordering will be ignored
  //       but the element will still end up in the collection.
  // [MSG_ADDED_BEFORE]: DDP_ADDED_BEFORE,
  // [MSG_MOVED_BEFORE]: DDP_MOVED_BEFORE,
  [MSG_ADDED_BEFORE]: DDP_ADDED,
  [MSG_UPDATED]:      DDP_UPDATED,
  [MSG_RESULT]:       DDP_RESULT,
  [MSG_PING]:         DDP_PING,
  [MSG_ERROR]:        DDP_ERROR,
  [MSG_CONNECTED]:    DDP_CONNECTED,
  [MSG_FAILED]:       DDP_FAILED,
};

export const ACTION_TO_MESSAGE = {
  [DDP_SUB]:          MSG_SUB,
  [DDP_UNSUB]:        MSG_UNSUB,
  [DDP_METHOD]:       MSG_METHOD,
  [DDP_CONNECT]:      MSG_CONNECT,
  [DDP_PONG]:         MSG_PONG,
};

export const ACTION_TO_PRIORITY = {
  [DDP_SUB]:          10,
  [DDP_UNSUB]:        10,
  [DDP_METHOD]:       0,
  [DDP_CONNECT]:      100,
  [DDP_PONG]:         10,
};

// NOTE: It's important that the value is smaller than DDP_CONNECT priority,
//       but also greater than any other action priorities.
export const LOGIN_ACTION_PRIORITY = 99;

export const DEFAULT_LOGIN_METHOD_NAME = 'login';
export const DEFAULT_LOGOUT_METHOD_NAME = 'logout';

