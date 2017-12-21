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
  DDP_ENQUEUE,
  DDP_METHOD,

  DDP_RESOURCE_CREATE,
  DDP_RESOURCE_DELETE,
  DDP_RESOURCE_UPDATE,

  DDP_RESOURCE_REFRESH,
  DDP_RESOURCE_REQUEST,
  DDP_RESOURCE_RELEASE,

  DDP_STATE__QUEUED,
  DDP_STATE__INITIAL,
  DDP_STATE__PENDING,
  DDP_STATE__CANCELED,
  DDP_STATE__READY,
  DDP_STATE__OBSOLETE,
  DDP_STATE__RESTORING,
  DDP_DISCONNECTED,
} from '../../constants';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('Test module - resources - reducer', () => {
  beforeEach(function () {
    this.reducer = createReducer();
  });

  it('should initialize state', function () {
    this.reducer(undefined, {}).should.deep.equal({});
  });

  it('should increase number of resource users', function () {
    this.reducer({
      1: {
        name: 'A',
      },
    }, {
      type: DDP_RESOURCE_REQUEST,
      meta: {
        resourceId: '1',
      },
    }).should.deep.equal({
      1: {
        name: 'A',
        users: 1,
      },
    });
  });

  it('should decrease number of resource users', function () {
    this.reducer({
      1: {
        name: 'A',
        users: 1,
      },
    }, {
      type: DDP_RESOURCE_RELEASE,
      meta: {
        resourceId: '1',
      },
    }).should.deep.equal({
      1: {
        name: 'A',
        users: 0,
      },
    });
  });

  it('should not change resource state on DDP_RESOURCE_REFRESH if number of users is positive', function () {
    this.reducer({
      1: {
        name: 'A',
        users: 1,
      },
    }, {
      type: DDP_RESOURCE_REFRESH,
      meta: {
        resourceId: '1',
      },
    }).should.deep.equal({
      1: {
        name: 'A',
        users: 1,
      },
    });
  });

  it('should change state to "obsolete" on DDP_RESOURCE_REFRESH if there are no users', function () {
    this.reducer({
      1: {
        name: 'A',
      },
    }, {
      type: DDP_RESOURCE_REFRESH,
      meta: {
        resourceId: '1',
      },
    }).should.deep.equal({
      1: {
        name: 'A',
        state: DDP_STATE__OBSOLETE,
      },
    });
  });

  [
    {
      from: DDP_STATE__READY,
      to: DDP_STATE__RESTORING,
    },
    {
      from: DDP_STATE__INITIAL,
      to: DDP_STATE__PENDING,
    },
    {
      from: DDP_STATE__QUEUED,
      to: DDP_STATE__PENDING,
    },
  ].forEach(({ from, to }) => it(`should change resource state from ${from} to ${to} on DDP_RESOURCE_UPDATE with no payload`, function () {
    this.reducer({
      1: {
        state: from,
        name: 'A',
      },
    }, {
      type: DDP_RESOURCE_UPDATE,
      meta: {
        resourceId: '1',
      },
    }).should.deep.equal({
      1: {
        name: 'A',
        state: to,
      },
    });
  }));

  [
    {
      from: DDP_STATE__READY,
      to: DDP_STATE__OBSOLETE,
    },
    {
      from: DDP_STATE__PENDING,
      to: DDP_STATE__CANCELED,
    },
    {
      from: DDP_STATE__RESTORING,
      to: DDP_STATE__OBSOLETE,
    },
    // no changes for these states ...
    { from: DDP_STATE__INITIAL },
    { from: DDP_STATE__QUEUED },
    { from: DDP_STATE__CANCELED },
    { from: DDP_STATE__OBSOLETE },
  ].forEach(({ from, to = from }) => it(`should change state from ${from} to ${to} on DDP_DISCONNECTED`, function () {
    this.reducer({
      1: {
        state: from,
        name: 'A',
      },
    }, {
      type: DDP_DISCONNECTED,
      meta: {
        resourceId: '1',
      },
    }).should.deep.equal({
      1: {
        name: 'A',
        state: to,
      },
    });
  }));

  it('should delete one resource', function () {
    this.reducer({
      1: {
        name: 'A',
      },
      2: {
        name: 'B',
      },
    }, {
      type: DDP_RESOURCE_DELETE,
      meta: {
        resourceId: '2',
      },
    }).should.deep.equal({
      1: {
        name: 'A',
      },
    });
  });

  it('should create a new resource', function () {
    this.reducer({
      1: {
        name: 'A',
      },
    }, {
      type: DDP_RESOURCE_CREATE,
      payload: {
        name: 'B',
        params: 1,
        properties: {
          socketId: 'socket/1',
        },
      },
      meta: {
        resourceId: '2',
      },
    }).should.deep.equal({
      1: {
        name: 'A',
      },
      2: {
        id: '2',
        name: 'B',
        params: 1,
        state: DDP_STATE__INITIAL,
        properties: {
          socketId: 'socket/1',
        },
      },
    });
  });

  it('should switch resource state from "initial" to "queued"', function () {
    this.reducer({
      1: {
        id: '1',
        state: DDP_STATE__INITIAL,
      },
    }, {
      type: DDP_ENQUEUE,
      payload: {
      },
      meta: {
        type: DDP_METHOD,
        resourceId: '1',
      },
    }).should.deep.equal({
      1: {
        id: '1',
        state: DDP_STATE__QUEUED,
      },
    });
  });

  it('should update an existing resource', function () {
    this.reducer({
      1: {
        name: 'A',
      },
    }, {
      type: DDP_RESOURCE_UPDATE,
      payload: {
        result: { success: true },
        entities: {
          col1: {
            1: { id: '1' },
            2: { id: '2' },
          },
        },
      },
      meta: {
        resourceId: '1',
      },
    }).should.deep.equal({
      1: {
        name: 'A',
        state: DDP_STATE__READY,
        result: { success: true },
        entities: {
          col1: {
            1: { id: '1' },
            2: { id: '2' },
          },
        },
      },
    });
  });

  it('should store result on DDP_RESOURCE_UPDATE', function () {
    this.reducer({
      1: {
        name: 'A',
      },
    }, {
      type: DDP_RESOURCE_UPDATE,
      payload: {
        result: 123,
      },
      meta: {
        resourceId: '1',
      },
    }).should.deep.equal({
      1: {
        name: 'A',
        result: 123,
        state: DDP_STATE__READY,
      },
    });
  });

  it('should store error on DDP_RESOURCE_UPDATE', function () {
    this.reducer({
      1: {
        name: 'A',
      },
    }, {
      type: DDP_RESOURCE_UPDATE,
      payload: {
        error: {
          error: 'Error',
        },
      },
      meta: {
        resourceId: '1',
      },
    }).should.deep.equal({
      1: {
        name: 'A',
        error: {
          error: 'Error',
        },
        state: DDP_STATE__CANCELED,
      },
    });
  });
});
