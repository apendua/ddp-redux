/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */

import chai from 'chai';
import sinonChai from 'sinon-chai';
import {
  createSocketReducer,
} from './reducer';
import {
  DDP_METHOD,
  DDP_CONNECTED,
  DDP_RESULT,
  DDP_ENQUEUE,
  DDP_DISCONNECTED,

  MSG_METHOD,
} from '../../constants';
import {
  DDPClient,
} from './common.test';

chai.should();
chai.use(sinonChai);

describe('Test module - messages - reducer', () => {
  beforeEach(function () {
    this.reducer = createSocketReducer(DDPClient);
  });

  it('should initialize state', function () {
    this.reducer(undefined, {}).should.deep.equal({
      pending: {
        '[connect]': 100,
      },
      queue: [],
    });
  });

  it('should reset pending on conection close', function () {
    this.reducer({
      queue: [],
      pending: {
        1: 1,
      },
    }, {
      type: DDP_DISCONNECTED,
    }).should.deep.equal({
      pending: {
        '[connect]': 100,
      },
      queue: [],
    });
  });

  it('should enqueue element if queue is empty', function () {
    this.reducer({
      queue: [],
      pending: {},
    }, {
      type: DDP_ENQUEUE,
      payload: {},
      meta: {
        type: DDP_METHOD,
        priority: 0,
      },
    }).should.deep.equal({
      pending: {},
      queue: [{
        type: DDP_METHOD,
        meta: {
          priority: 0,
        },
        payload: {},
      }],
    });
  });

  it('should enqueue element at the end of queue if priority is lower', function () {
    this.reducer({
      queue: [{
        type: DDP_METHOD,
        payload: 1,
        meta: {
          priority: 10,
        },
      }],
      pending: {},
    }, {
      type: DDP_ENQUEUE,
      payload: 2,
      meta: {
        type: DDP_METHOD,
        priority: 5,
      },
    }).should.deep.equal({
      pending: {},
      queue: [{
        type: DDP_METHOD,
        payload: 1,
        meta: {
          priority: 10,
        },
      }, {
        type: DDP_METHOD,
        payload: 2,
        meta: {
          priority: 5,
        },
      }],
    });
  });

  it('should enqueue element at the beginning of queue if priority is higher', function () {
    this.reducer({
      queue: [{
        type: DDP_METHOD,
        meta: {
          priority: 10,
        },
        payload: 1,
      }],
      pending: {},
    }, {
      type: DDP_ENQUEUE,
      payload: 2,
      meta: {
        type: DDP_METHOD,
        priority: 15,
      },
    }).should.deep.equal({
      pending: {},
      queue: [{
        type: DDP_METHOD,
        meta: {
          priority: 15,
        },
        payload: 2,
      }, {
        type: DDP_METHOD,
        meta: {
          priority: 10,
        },
        payload: 1,
      }],
    });
  });

  it('should enqueue element in the middle of the queue', function () {
    this.reducer({
      queue: [{
        type: DDP_METHOD,
        meta: {
          priority: 20,
        },
        payload: 1,
      }, {
        type: DDP_METHOD,
        meta: {
          priority: 10,
        },
        payload: 2,
      }],
      pending: {},
    }, {
      type: DDP_ENQUEUE,
      payload: 3,
      meta: {
        type: DDP_METHOD,
        priority: 15,
      },
    }).should.deep.equal({
      pending: {},
      queue: [{
        type: DDP_METHOD,
        meta: {
          priority: 20,
        },
        payload: 1,
      }, {
        type: DDP_METHOD,
        meta: {
          priority: 15,
        },
        payload: 3,
      }, {
        type: DDP_METHOD,
        meta: {
          priority: 10,
        },
        payload: 2,
      }],
    });
  });

  it('should remove method from queue when method is emited', function () {
    const action = {
      type: DDP_METHOD,
      payload: {
        id: '1',
        msg: MSG_METHOD,
      },
      meta: {
        priority: 0,
      },
    };
    this.reducer({
      queue: [{
        type: DDP_METHOD,
        payload: action.payload,
        meta: action.meta,
      }],
      pending: {},
    }, action).should.deep.equal({
      pending: {
        1: 0,
      },
      queue: [],
    });
  });

  it('should remove pending item on method result', function () {
    const action = {
      type: DDP_RESULT,
      payload: {
        id: '1',
      },
    };
    this.reducer({
      queue: [],
      pending: {
        1: 0,
        2: 0,
      },
    }, action).should.deep.equal({
      pending: {
        2: 0,
      },
      queue: [],
    });
  });

  it('should remove all pending items on connected', function () {
    const action = {
      type: DDP_CONNECTED,
    };
    this.reducer({
      queue: [],
      pending: {
        1: 0,
        2: 0,
      },
    }, action).should.deep.equal({
      pending: {},
      queue: [],
    });
  });
});
