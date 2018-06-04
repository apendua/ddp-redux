/* eslint-env jest */

import { createReducer } from './reducer';
import {
  DDP_CONNECTION_STATE__DISCONNECTED,
  DDP_CONNECTION_STATE__CONNECTING,
  DDP_CONNECTION_STATE__CONNECTED,

  DDP_CONNECT,
  DDP_CONNECTED,
  DDP_DISCONNECTED,
  DDP_OPEN,
  DDP_CLOSE,
} from '../../constants';
import { DDPClient } from './testCommon';

describe('Test module - connection - reducer', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  beforeEach(() => {
    testContext.reducer = createReducer(DDPClient);
  });

  test('should initialize state', () => {
    expect(testContext.reducer(undefined, {})).toEqual({
      sockets: {},
    });
  });

  test('should change state to "connecting"', () => {
    expect(testContext.reducer({
      sockets: {
        1: {
          state: DDP_CONNECTION_STATE__DISCONNECTED,
        },
      },
    }, {
      type: DDP_CONNECT,
      payload: {},
      meta: {
        socketId: '1',
      },
    })).toEqual({
      sockets: {
        1: {
          state: DDP_CONNECTION_STATE__CONNECTING,
        },
      },
    });
  });

  test('should change state to "connected"', () => {
    expect(testContext.reducer({
      sockets: {
        1: {
          state: DDP_CONNECTION_STATE__CONNECTING,
        },
      },
    }, {
      type: DDP_CONNECTED,
      payload: {},
      meta: {
        socketId: '1',
      },
    })).toEqual({
      sockets: {
        1: {
          state: DDP_CONNECTION_STATE__CONNECTED,
        },
      },
    });
  });

  test('should change state to "disconnected"', () => {
    expect(testContext.reducer({
      sockets: {
        1: {
          state: DDP_CONNECTION_STATE__CONNECTED,
          users: 1,
        },
      },
    }, {
      type: DDP_DISCONNECTED,
      payload: {},
      meta: {
        socketId: '1',
      },
    })).toEqual({
      sockets: {
        1: {
          state: DDP_CONNECTION_STATE__DISCONNECTED,
          users: 1,
        },
      },
    });
  });

  test('should remove socket completely if there are no users', () => {
    expect(testContext.reducer({
      sockets: {
        1: {
          state: DDP_CONNECTION_STATE__CONNECTED,
          users: 0,
        },
        2: {
          state: DDP_CONNECTION_STATE__CONNECTED,
          users: 1,
        },
      },
    }, {
      type: DDP_DISCONNECTED,
      payload: {},
      meta: {
        socketId: '1',
      },
    })).toEqual({
      sockets: {
        2: {
          state: DDP_CONNECTION_STATE__CONNECTED,
          users: 1,
        },
      },
    });
  });

  test('should increase the number of users', () => {
    expect(testContext.reducer({
      sockets: {
        1: {
          id: '1',
          endpoint: 'http://example.com',
          params: [],
          state: DDP_CONNECTION_STATE__CONNECTED,
          users: 1,
        },
      },
    }, {
      type: DDP_OPEN,
      payload: {
        endpoint: 'http://example.com',
        params: [],
      },
      meta: {
        socketId: '1',
      },
    })).toEqual({
      sockets: {
        1: {
          id: '1',
          endpoint: 'http://example.com',
          params: [],
          state: DDP_CONNECTION_STATE__CONNECTED,
          users: 2,
        },
      },
    });
  });

  test('should decrease the number of users', () => {
    expect(testContext.reducer({
      sockets: {
        1: {
          state: DDP_CONNECTION_STATE__CONNECTED,
          users: 1,
        },
      },
    }, {
      type: DDP_CLOSE,
      payload: {
      },
      meta: {
        socketId: '1',
      },
    })).toEqual({
      sockets: {
        1: {
          state: DDP_CONNECTION_STATE__CONNECTED,
          users: 0,
        },
      },
    });
  });
});
