/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import {
  createReducer,
} from './reducer';
import {
  DDP_RESULT,
  DDP_CONNECT,
  DDP_METHOD,

  DDP_QUERY_CREATE,
  DDP_QUERY_DELETE,
  DDP_QUERY_UPDATE,

  DDP_QUERY_REFETCH,
  DDP_QUERY_REQUEST,
  DDP_QUERY_RELEASE,

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
    this.reducer(undefined, {}).should.deep.equal({
      byId: {},
      byMethodId: {},
    });
  });

  it('should increase number of query users', function () {
    this.reducer({
      byId: {
        1: {
          name: 'A',
        },
      },
      byMethodId: {},
    }, {
      type: DDP_QUERY_REQUEST,
      payload: {
        id: '1',
      },
    }).should.deep.equal({
      byId: {
        1: {
          name: 'A',
          users: 1,
        },
      },
      byMethodId: {},
    });
  });

  it('should decrease number of query users', function () {
    this.reducer({
      byId: {
        1: {
          name: 'A',
          users: 1,
        },
      },
      byMethodId: {},
    }, {
      type: DDP_QUERY_RELEASE,
      payload: {
        id: '1',
      },
    }).should.deep.equal({
      byId: {
        1: {
          name: 'A',
          users: 0,
        },
      },
      byMethodId: {},
    });
  });

  it('should change query state to "restoring" on refetch', function () {
    this.reducer({
      byId: {
        1: {
          name: 'A',
        },
      },
      byMethodId: {},
    }, {
      type: DDP_QUERY_REFETCH,
      payload: {
        id: '1',
      },
    }).should.deep.equal({
      byId: {
        1: {
          name: 'A',
          state: DDP_QUERY_STATE__RESTORING,
        },
      },
      byMethodId: {},
    });
  });

  it('should delete one query', function () {
    this.reducer({
      byId: {
        1: {
          name: 'A',
        },
        2: {
          name: 'B',
        },
      },
      byMethodId: {},
    }, {
      type: DDP_QUERY_DELETE,
      payload: {
        id: '2',
      },
    }).should.deep.equal({
      byId: {
        1: {
          name: 'A',
        },
      },
      byMethodId: {},
    });
  });

  it('should create a new query', function () {
    this.reducer({
      byId: {
        1: {
          name: 'A',
        },
      },
      byMethodId: {},
    }, {
      type: DDP_QUERY_CREATE,
      payload: {
        id: '2',
        name: 'B',
        params: 1,
      },
      meta: {
        socketId: 'socket/1',
      },
    }).should.deep.equal({
      byId: {
        1: {
          name: 'A',
        },
        2: {
          id: '2',
          name: 'B',
          params: 1,
          state: DDP_QUERY_STATE__PENDING,
          socketId: 'socket/1',
        },
      },
      byMethodId: {},
    });
  });

  it('should update an existing query', function () {
    this.reducer({
      byId: {
        1: {
          name: 'A',
        },
      },
      byMethodId: {},
    }, {
      type: DDP_QUERY_UPDATE,
      payload: {
        id: '1',
      },
    }).should.deep.equal({
      byId: {
        1: {
          name: 'A',
          state: DDP_QUERY_STATE__READY,
        },
      },
      byMethodId: {},
    });
  });

  it('should store related method result', function () {
    this.reducer({
      byId: {
        1: {
          name: 'A',
        },
      },
      byMethodId: {
        2: '1',
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
      byId: {
        1: {
          name: 'A',
          result: 123,
        },
      },
      byMethodId: {},
    });
  });

  it('should store related method error', function () {
    this.reducer({
      byId: {
        1: {
          name: 'A',
        },
      },
      byMethodId: {
        2: '1',
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
      byId: {
        1: {
          name: 'A',
          error: {
            error: 'Error',
          },
        },
      },
      byMethodId: {},
    });
  });

  it('should switch to "restoring" on connect', function () {
    this.reducer({
      byId: {
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
      },
      byMethodId: {
      },
    }, {
      type: DDP_CONNECT,
      payload: {
      },
      meta: {
        socketId: 'socket/1',
      },
    }).should.deep.equal({
      byId: {
        1: {
          name: 'A',
          state: DDP_QUERY_STATE__RESTORING,
          socketId: 'socket/1',
        },
        2: {
          name: 'B',
          state: DDP_QUERY_STATE__READY,
          socketId: 'socket/2',
        },
      },
      byMethodId: {},
    });
  });

  it('should add related method to the queue', function () {
    this.reducer({
      byId: {},
      byMethodId: {
        2: '1',
      },
    }, {
      type: DDP_METHOD,
      payload: {
        id: '4',
      },
      meta: {
        queryId: '3',
      },
    }).should.deep.equal({
      byId: {},
      byMethodId: {
        2: '1',
        4: '3',
      },
    });
  });

  it('should remove methods on query refetch', function () {
    this.reducer({
      byId: {},
      byMethodId: {
        2: '1',
        4: '3',
      },
    }, {
      type: DDP_QUERY_REFETCH,
      payload: {
        id: '3',
      },
    }).should.deep.equal({
      byId: {
        3: {
          state: DDP_QUERY_STATE__RESTORING,
        },
      },
      byMethodId: {
        2: '1',
      },
    });
  });
});
