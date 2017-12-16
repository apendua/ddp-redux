/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */

import chai from 'chai';
import sinonChai from 'sinon-chai';
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
} from './common.test';

chai.should();
chai.use(sinonChai);

describe('Test module - currentUser - reducer', () => {
  beforeEach(function () {
    this.reducer = createReducer(DDPClient);
  });

  it('should initialize state', function () {
    this.reducer(undefined, {}).should.deep.equal({});
  });

  it('should create a new entry on login', function () {
    this.reducer({}, {
      type: DDP_LOGIN,
      payload: {
      },
      meta: {
        socketId: 'socket/1',
      },
    }).should.deep.equal({
      'socket/1': {
        state: DDP_USER_STATE__LOGGING_IN,
      },
    });
  });

  it('should set state to "logginIn" on logout', function () {
    this.reducer({}, {
      type: DDP_LOGOUT,
      meta: {
        socketId: 'socket/1',
      },
    }).should.deep.equal({
      'socket/1': {
        state: DDP_USER_STATE__LOGGING_IN,
      },
    });
  });

  it('should set user id on logged in', function () {
    this.reducer({}, {
      type: DDP_LOGGED_IN,
      payload: {
        id: '1234',
      },
      meta: {
        socketId: 'socket/1',
      },
    }).should.deep.equal({
      'socket/1': {
        state: DDP_USER_STATE__LOGGED_IN,
        userId: '1234',
      },
    });
  });

  it('should remove an entry on logged out', function () {
    this.reducer({
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
    }).should.deep.equal({
      'socker/2': {
        userId: '1234',
      },
    });
  });

  it('should remove an entry on disconnected', function () {
    this.reducer({
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
    }).should.deep.equal({
      'socker/2': {
        userId: '1234',
      },
    });
  });
});
