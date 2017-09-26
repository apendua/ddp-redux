/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */

import chai from 'chai';
import sinonChai from 'sinon-chai';
import {
  createReducer,
} from './reducer';
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
import {
  DDPClient,
} from './common.test';

chai.should();
chai.use(sinonChai);

describe('Test module - connection - reducer', () => {
  beforeEach(function () {
    this.reducer = createReducer(DDPClient);
  });

  it('should initialize state', function () {
    this.reducer(undefined, {}).should.deep.equal({
      sockets: {},
    });
  });

  it('should change state to "connecting"', function () {
    this.reducer({
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
    }).should.deep.equal({
      sockets: {
        1: {
          state: DDP_CONNECTION_STATE__CONNECTING,
        },
      },
    });
  });

  it('should change state to "connected"', function () {
    this.reducer({
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
    }).should.deep.equal({
      sockets: {
        1: {
          state: DDP_CONNECTION_STATE__CONNECTED,
        },
      },
    });
  });

  it('should change state to "disconnected"', function () {
    this.reducer({
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
    }).should.deep.equal({
      sockets: {
        1: {
          state: DDP_CONNECTION_STATE__DISCONNECTED,
          users: 1,
        },
      },
    });
  });

  it('should remove socket completely if there are no users', function () {
    this.reducer({
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
    }).should.deep.equal({
      sockets: {
        2: {
          state: DDP_CONNECTION_STATE__CONNECTED,
          users: 1,
        },
      },
    });
  });

  it('should increase the number of users', function () {
    this.reducer({
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
    }).should.deep.equal({
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

  it('should decrease the number of users', function () {
    this.reducer({
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
    }).should.deep.equal({
      sockets: {
        1: {
          state: DDP_CONNECTION_STATE__CONNECTED,
          users: 0,
        },
      },
    });
  });
});
