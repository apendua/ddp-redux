/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */
/* eslint no-invalid-this: "off" */

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import {
  createReducer,
} from './reducer';
import {
  DEFAULT_SOCKET_ID,

  DDP_ENQUEUE,
  DDP_METHOD,
  DDP_RESULT,
  DDP_CONNECT,

  DDP_QUERY_CREATE,
  DDP_QUERY_DELETE,
  DDP_QUERY_UPDATE,

  DDP_QUERY_REFETCH,
  DDP_QUERY_REQUEST,
  DDP_QUERY_RELEASE,

  DDP_QUERY_STATE__QUEUED,
  DDP_QUERY_STATE__INITIAL,
  DDP_QUERY_STATE__PENDING,
  DDP_QUERY_STATE__RESTORING,
  DDP_QUERY_STATE__READY,
} from '../../constants';
import {
  DDPClient,
} from './common.test';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('Test module - queries - reducer', () => {
  beforeEach(function () {
    this.reducer = createReducer(DDPClient);
  });

  it('should initialize state', function () {
    this.reducer(undefined, {}).should.deep.equal({});
  });

  it('should increase number of query users', function () {
    this.reducer({
      1: {
        name: 'A',
      },
    }, {
      type: DDP_QUERY_REQUEST,
      meta: {
        queryId: '1',
      },
    }).should.deep.equal({
      1: {
        name: 'A',
        users: 1,
      },
    });
  });

  it('should decrease number of query users', function () {
    this.reducer({
      1: {
        name: 'A',
        users: 1,
      },
    }, {
      type: DDP_QUERY_RELEASE,
      meta: {
        queryId: '1',
      },
    }).should.deep.equal({
      1: {
        name: 'A',
        users: 0,
      },
    });
  });

  it('should not change query state on "re-fetch" action', function () {
    this.reducer({
      1: {
        name: 'A',
      },
    }, {
      type: DDP_QUERY_REFETCH,
      meta: {
        queryId: '1',
      },
    }).should.deep.equal({
      1: {
        name: 'A',
      },
    });
  });

  [
    {
      from: DDP_QUERY_STATE__READY,
      to: DDP_QUERY_STATE__RESTORING,
    },
    {
      from: DDP_QUERY_STATE__INITIAL,
      to: DDP_QUERY_STATE__PENDING,
    },
    {
      from: DDP_QUERY_STATE__QUEUED,
      to: DDP_QUERY_STATE__PENDING,
    },
  ].forEach(({ from, to }) => it(`should change query state from ${from} to ${to} on method call`, function () {
    this.reducer({
      1: {
        state: from,
        name: 'A',
      },
    }, {
      type: DDP_METHOD,
      meta: {
        queryId: '1',
      },
    }).should.deep.equal({
      1: {
        name: 'A',
        state: to,
      },
    });
  }));

  it('should delete one query', function () {
    this.reducer({
      1: {
        name: 'A',
      },
      2: {
        name: 'B',
      },
    }, {
      type: DDP_QUERY_DELETE,
      meta: {
        queryId: '2',
      },
    }).should.deep.equal({
      1: {
        name: 'A',
      },
    });
  });

  it('should create a new query', function () {
    this.reducer({
      1: {
        name: 'A',
      },
    }, {
      type: DDP_QUERY_CREATE,
      payload: {
        name: 'B',
        params: 1,
        properties: {
          socketId: 'socket/1',
        },
      },
      meta: {
        queryId: '2',
      },
    }).should.deep.equal({
      1: {
        name: 'A',
      },
      2: {
        id: '2',
        name: 'B',
        params: 1,
        state: DDP_QUERY_STATE__INITIAL,
        properties: {
          socketId: 'socket/1',
        },
      },
    });
  });

  it('should switch query state from "initial" to "queued"', function () {
    this.reducer({
      1: {
        id: '1',
        state: DDP_QUERY_STATE__INITIAL,
      },
    }, {
      type: DDP_ENQUEUE,
      payload: {
      },
      meta: {
        type: DDP_METHOD,
        queryId: '1',
      },
    }).should.deep.equal({
      1: {
        id: '1',
        state: DDP_QUERY_STATE__QUEUED,
      },
    });
  });

  it('should not switch query state from "restoring" to "queued"', function () {
    this.reducer({
      1: {
        id: '1',
        state: DDP_QUERY_STATE__RESTORING,
      },
    }, {
      type: DDP_ENQUEUE,
      payload: {
      },
      meta: {
        type: DDP_METHOD,
        queryId: '1',
      },
    }).should.deep.equal({
      1: {
        id: '1',
        state: DDP_QUERY_STATE__RESTORING,
      },
    });
  });

  it('should switch state from "initial" to "pending" on DDP_METHOD', function () {
    this.reducer({
      1: {
        state: DDP_QUERY_STATE__INITIAL,
      },
    }, {
      type: DDP_METHOD,
      meta: {
        queryId: '1',
      },
    }).should.deep.equal({
      1: {
        state: DDP_QUERY_STATE__PENDING,
      },
    });
  });

  it('should switch state from "queued" to "pending" on DDP_METHOD', function () {
    this.reducer({
      1: {
        state: DDP_QUERY_STATE__QUEUED,
      },
    }, {
      type: DDP_METHOD,
      meta: {
        queryId: '1',
      },
    }).should.deep.equal({
      1: {
        state: DDP_QUERY_STATE__PENDING,
      },
    });
  });

  it('should not change "restoring" state on DDP_METHOD', function () {
    this.reducer({
      1: {
        state: DDP_QUERY_STATE__RESTORING,
      },
    }, {
      type: DDP_METHOD,
      meta: {
        queryId: '1',
      },
    }).should.deep.equal({
      1: {
        state: DDP_QUERY_STATE__RESTORING,
      },
    });
  });

  it('should update an existing query', function () {
    this.reducer({
      1: {
        name: 'A',
      },
    }, {
      type: DDP_QUERY_UPDATE,
      payload: {
        entities: {
          col1: {
            1: { id: '1' },
            2: { id: '2' },
          },
        },
      },
      meta: {
        queryId: '1',
      },
    }).should.deep.equal({
      1: {
        name: 'A',
        state: DDP_QUERY_STATE__READY,
        entities: {
          col1: {
            1: { id: '1' },
            2: { id: '2' },
          },
        },
      },
    });
  });

  it('should store related method result', function () {
    this.reducer({
      1: {
        name: 'A',
      },
    }, {
      type: DDP_RESULT,
      payload: {
        id: '2',
        result: 123,
      },
      meta: {
        queryId: '1',
      },
    }).should.deep.equal({
      1: {
        name: 'A',
        result: 123,
      },
    });
  });

  it('should store related method error', function () {
    this.reducer({
      1: {
        name: 'A',
      },
    }, {
      type: DDP_RESULT,
      payload: {
        id: '2',
        error: {
          error: 'Error',
        },
      },
      meta: {
        queryId: '1',
      },
    }).should.deep.equal({
      1: {
        name: 'A',
        error: {
          error: 'Error',
        },
      },
    });
  });

  it('should not switch to "restoring" on connect', function () {
    this.reducer({
      1: {
        name: 'A',
        state: DDP_QUERY_STATE__READY,
        socketId: 'socket/1',
      },
      2: {
        name: 'B',
        state: DDP_QUERY_STATE__READY,
        socketId: 'socket/2',
      },
    }, {
      type: DDP_CONNECT,
      payload: {
      },
      meta: {
        socketId: 'socket/1',
      },
    }).should.deep.equal({
      1: {
        name: 'A',
        state: DDP_QUERY_STATE__READY,
        socketId: 'socket/1',
      },
      2: {
        name: 'B',
        state: DDP_QUERY_STATE__READY,
        socketId: 'socket/2',
      },
    });
  });
});
