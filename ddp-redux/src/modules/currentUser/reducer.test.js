/* eslint-env jest */

import {
  createReducer,
} from './reducer';
import {
  DDP_USER_STATE__LOGGING_IN,
  DDP_USER_STATE__LOGGED_IN,

  DDP_LOGIN,
  DDP_LOGGED_IN,
  DDP_LOGOUT,
  DDP_LOGGED_OUT,
  DDP_DISCONNECTED,
} from '../../constants';
import {
  DDPClient,
} from './testCommon';

describe('Test module - currentUser - reducer', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  beforeEach(() => {
    testContext.reducer = createReducer(DDPClient);
  });

  test('should initialize state', () => {
    expect(testContext.reducer(undefined, {})).toEqual({});
  });

  test('should create a new entry on login', () => {
    expect(testContext.reducer({}, {
      type: DDP_LOGIN,
      payload: {
      },
      meta: {
        socketId: 'socket/1',
      },
    })).toEqual({
      'socket/1': {
        state: DDP_USER_STATE__LOGGING_IN,
      },
    });
  });

  test('should set state to "logginIn" on logout', () => {
    expect(testContext.reducer({}, {
      type: DDP_LOGOUT,
      meta: {
        socketId: 'socket/1',
      },
    })).toEqual({
      'socket/1': {
        state: DDP_USER_STATE__LOGGING_IN,
      },
    });
  });

  test('should set user id on logged in', () => {
    expect(testContext.reducer({}, {
      type: DDP_LOGGED_IN,
      payload: {
        id: '1234',
      },
      meta: {
        socketId: 'socket/1',
      },
    })).toEqual({
      'socket/1': {
        state: DDP_USER_STATE__LOGGED_IN,
        userId: '1234',
      },
    });
  });

  test('should remove an entry on logged out', () => {
    expect(testContext.reducer({
      'socket/1': {
        userId: '1234',
      },
      'socker/2': {
        userId: '1234',
      },
    }, {
      type: DDP_LOGGED_OUT,
      payload: {
      },
      meta: {
        socketId: 'socket/1',
      },
    })).toEqual({
      'socker/2': {
        userId: '1234',
      },
    });
  });

  test('should remove an entry on disconnected', () => {
    expect(testContext.reducer({
      'socket/1': {
        userId: '1234',
      },
      'socker/2': {
        userId: '1234',
      },
    }, {
      type: DDP_DISCONNECTED,
      payload: {
      },
      meta: {
        socketId: 'socket/1',
      },
    })).toEqual({
      'socker/2': {
        userId: '1234',
      },
    });
  });
});
