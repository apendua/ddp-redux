export const DDP_PROTOCOL_VERSION = '1.0';

export const DDP_CONNECTION_STATE__CONNECTING = 'connecting';
export const DDP_CONNECTION_STATE__CONNECTED = 'connected';
export const DDP_CONNECTION_STATE__DISCONNECTED = 'disconnected';

export const DDP_SUBSCRIPTION_STATE__RESTORING = 'restoring';
export const DDP_SUBSCRIPTION_STATE__PENDING = 'pending';
export const DDP_SUBSCRIPTION_STATE__READY = 'ready';
export const DDP_SUBSCRIPTION_STATE__ERROR = 'error';

export const DDP_METHOD_STATE__PENDING = 'pending';
export const DDP_METHOD_STATE__UPDATED = 'updated';
export const DDP_METHOD_STATE__RETURNED = 'RETURNED';

export const DDP_FAILED = '@DDP/IN/FAILED';
export const DDP_ERROR = '@DDP/IN/ERROR';

export const DDP_ADDED = '@DDP/IN/ADDED';
export const DDP_CHANGED = '@DDP/IN/CHANGED';
export const DDP_REMOVED = '@DDP/IN/REMOVED';
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
export const DDP_CLOSE = '@DDP/API/CLOSE';

export const DDP_METHOD = '@DDP/OUT/METHOD';
export const DDP_RESULT = '@DDP/IN/RESULT';
export const DDP_UPDATED = '@DDP/IN/UPDATED';
export const DDP_CANCEL = '@DDP/API/CANCEL';

export const DDP_MUTATE = '@DDP/API/MUTATE';

export const DDP_CREATE_QUERY = '@DDP/API/CREATE_QUERY';
export const DDP_DELETE_QUERY = '@DDP/API/DELETE_QUERY';
export const DDP_UPDATE_QUERY = '@DDP/API/UPDATE_QUERY';
