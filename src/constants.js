export const DDP_PROTOCOL_VERSION = '1.0';

export const DDP_CONNECTION_STATE__CONNECTING = 'connecting';
export const DDP_CONNECTION_STATE__CONNECTED = 'connected';
export const DDP_CONNECTION_STATE__DISCONNECTED = 'disconnected';

export const DDP_SUBSCRIPTION_STATE__PENDING = 'pending';
export const DDP_SUBSCRIPTION_STATE__READY = 'ready';
export const DDP_SUBSCRIPTION_STATE__ERROR = 'error';
export const DDP_SUBSCRIPTION_STATE__RESTORING = 'restoring';

export const DDP_METHOD_STATE__PENDING = 'pending';
export const DDP_METHOD_STATE__UPDATED = 'updated';
export const DDP_METHOD_STATE__RETURNED = 'returned';

export const DDP_QUERY_STATE__PENDING = 'pending';
export const DDP_QUERY_STATE__READY = 'ready';
export const DDP_QUERY_STATE__ERROR = 'error';
export const DDP_QUERY_STATE__RESTORING = 'restoring';
export const DDP_QUERY_STATE__UPDATING = 'updating';

export const DDP_FAILED = '@DDP/IN/FAILED';
export const DDP_ERROR = '@DDP/IN/ERROR';

export const DDP_ADDED = '@DDP/IN/ADDED';
export const DDP_CHANGED = '@DDP/IN/CHANGED';
export const DDP_REMOVED = '@DDP/IN/REMOVED';
export const DDP_ADDED_BEFORE = '@DDP/IN/ADDED_BEFORE';
export const DDP_MOVED_BEFORE = '@DDP/IN/MOVED_BEFORE';
export const DDP_FLUSH = '@DDP/API/FLUSH';

export const DDP_SUB = '@DDP/OUT/SUB';
export const DDP_UNSUB = '@DDP/OUT/UNSUB';
export const DDP_READY = '@DDP/IN/READY';
export const DDP_NOSUB = '@DDP/IN/NOSUB';
export const DDP_SUBSCRIBE = '@DDP/API/SUBSCRIBE';
export const DDP_UNSUBSCRIBE = '@DDP/API/UNSUBSCRIBE';

export const DDP_PING = '@DDP/IN/PING';
export const DDP_PONG = '@DDP/OUT/PONG';
export const DDP_CONNECTED = '@DDP/IN/CONNECTED';
export const DDP_CONNECT = '@DDP/OUT/CONNECT';
export const DDP_ENQUEUE = '@DDP/API/ENQUEUE';
export const DDP_OPEN = '@DDP/API/OPEN';
export const DDP_CLOSE = '@DDP/API/CLOSE';
export const DDP_CLOSED = '@DDP/API/CLOSED';

export const DDP_METHOD = '@DDP/OUT/METHOD';
export const DDP_RESULT = '@DDP/IN/RESULT';
export const DDP_UPDATED = '@DDP/IN/UPDATED';
export const DDP_OPTIMISTIC = '@DDP/API/OPTIMISTIC';

export const DDP_MUTATE = '@DDP/API/MUTATE';

export const DDP_CREATE_QUERY = '@DDP/API/CREATE_QUERY';
export const DDP_DELETE_QUERY = '@DDP/API/DELETE_QUERY';
export const DDP_UPDATE_QUERY = '@DDP/API/UPDATE_QUERY';

export const DDP_REQUEST = '@DDP/API/REQUEST';
export const DDP_RELEASE = '@DDP/API/RELEASE';

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
  // these two are not supported at the moment
  // [MSG_ADDED_BEFORE]: DDP_ADDED_BEFORE,
  // [MSG_MOVED_BEFORE]: DDP_MOVED_BEFORE,
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

