/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */

import chai from 'chai';
import sinonChai from 'sinon-chai';
import {
  queueReducer,
  // createReducer,
} from './reducer';
import {
  DDP_ENQUEUE,
  DDP_QUEUE_RESET,
} from '../../constants';

chai.should();
chai.use(sinonChai);

describe('Test module - queues - reducer', () => {

  describe('queueReducer', () => {
    beforeEach(function () {
      this.reducer = queueReducer;
    });

    it('should initialize state', function () {
      this.reducer(undefined, {
        type: 'action',
        meta: {
          queue: {},
        },
      }).should.deep.equal({
        pending: {},
        elements: [],
      });
    });

    it('should enqueue element if queue is empty', function () {
      this.reducer({
        elements: [],
        pending: {},
      }, {
        type: DDP_ENQUEUE,
        payload: {},
        meta: {
          type: 'action',
          queue: {
            priority: 0,
          },
        },
      }).should.deep.equal({
        pending: {},
        elements: [{
          type: 'action',
          meta: {
            queue: {
              priority: 0,
            },
          },
          payload: {},
        }],
      });
    });

    it('should reset pending on DDP_QUEUE_RESET', function () {
      this.reducer({
        elements: [],
        pending: {
          1: 1,
        },
      }, {
        type: DDP_QUEUE_RESET,
      }).should.deep.equal({
        elements: [],
        pending: {},
      });
    });

    it('should enqueue element at the end of queue if priority is lower', function () {
      this.reducer({
        elements: [{
          type: 'action',
          payload: 1,
          meta: {
            queue: {
              priority: 10,
            },
          },
        }],
        pending: {},
      }, {
        type: DDP_ENQUEUE,
        payload: 2,
        meta: {
          type: 'action',
          queue: {
            priority: 5,
          },
        },
      }).should.deep.equal({
        pending: {},
        elements: [{
          type: 'action',
          payload: 1,
          meta: {
            queue: {
              priority: 10,
            },
          },
        }, {
          type: 'action',
          payload: 2,
          meta: {
            queue: {
              priority: 5,
            },
          },
        }],
      });
    });
  
    it('should enqueue element at the beginning of queue if priority is higher', function () {
      this.reducer({
        elements: [{
          type: 'action',
          meta: {
            queue: {
              priority: 10,
            },
          },
          payload: 1,
        }],
        pending: {},
      }, {
        type: DDP_ENQUEUE,
        payload: 2,
        meta: {
          type: 'action',
          queue: {
            priority: 15,
          },
        },
      }).should.deep.equal({
        pending: {},
        elements: [{
          type: 'action',
          meta: {
            queue: {
              priority: 15,
            },
          },
          payload: 2,
        }, {
          type: 'action',
          meta: {
            queue: {
              priority: 10,
            },
          },
          payload: 1,
        }],
      });
    });
  
    it('should enqueue element in the middle of the queue', function () {
      this.reducer({
        elements: [{
          type: 'action',
          meta: {
            queue: {
              priority: 20,
            },
          },
          payload: 1,
        }, {
          type: 'action',
          meta: {
            queue: {
              priority: 10,
            },
          },
          payload: 2,
        }],
        pending: {},
      }, {
        type: DDP_ENQUEUE,
        payload: 3,
        meta: {
          type: 'action',
          queue: {
            priority: 15,
          },
        },
      }).should.deep.equal({
        pending: {},
        elements: [{
          type: 'action',
          meta: {
            queue: {
              priority: 20,
            },
          },
          payload: 1,
        }, {
          type: 'action',
          meta: {
            queue: {
              priority: 15,
            },
          },
          payload: 3,
        }, {
          type: 'action',
          meta: {
            queue: {
              priority: 10,
            },
          },
          payload: 2,
        }],
      });
    });

    it('should remove element from queue when action is emited', function () {
      const action = {
        type: 'action',
        payload: {
          id: '1',
        },
        meta: {
          queue: {
            priority: 0,
            pendingValue: 0,
            elementId: '1',
          },
        },
      };
      this.reducer({
        elements: [{
          type: 'action',
          payload: action.payload,
          meta: action.meta,
        }],
        pending: {},
      }, action).should.deep.equal({
        pending: {
          1: 0,
        },
        elements: [],
      });
    });

    it('should remove pending item on action with resolve === true', function () {
      const action = {
        type: 'action',
        payload: {
          id: '1',
        },
        meta: {
          queue: {
            resolve: true,
            elementId: '1',
          },
        },
      };
      this.reducer({
        elements: [],
        pending: {
          1: 0,
          2: 0,
        },
      }, action).should.deep.equal({
        pending: {
          2: 0,
        },
        elements: [],
      });
    });
  });
});
