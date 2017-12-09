/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import configureStore from 'redux-mock-store';
import {
  createMiddleware,
} from './middleware';
import {
  DDP_ENQUEUE,
} from '../../constants';

chai.should();
chai.use(sinonChai);

const createInitialState = (queueId, queueState) => ({
  ddp: {
    queues: {
      [queueId]: queueState,
    },
  },
});

describe('Test module - queues - middleware', () => {
  beforeEach(function () {
    this.send = sinon.spy();
    this.onError = sinon.spy();
    this.middleware = createMiddleware();
    this.mockStore = configureStore([
      this.middleware,
    ]);
  });

  it('should pass an action without queue meta field', function () {
    const store = this.mockStore();
    const action = {
      type: 'no_meta_queue',
      payload: {},
      meta: {},
    };
    store.dispatch(action);
    store.getActions().should.have.members([
      action,
    ]);
  });

  it('should enqueue action if priority is too low', function () {
    const store = this.mockStore(createInitialState('1', {
      pending: {
        1: 20,
        2: 30,
      },
      elements: [],
    }));
    const action = {
      type: 'action',
      payload: {
        id: '2',
      },
      meta: {
        queue: {
          id: '1',
          priority: 25,
        },
      },
    };
    store.dispatch(action);
    store.getActions().should.deep.equal([{
      type: DDP_ENQUEUE,
      payload: action.payload,
      meta: {
        type: action.type,
        ...action.meta,
      },
    }]);
  });

  it('should empty queue up to the computed threshold', function () {
    const store = this.mockStore(createInitialState('1', {
      pending: {
        1: 10,
        2: 0,
      },
      elements: [{
        type: 'action',
        payload: {
          id: '3',
        },
        meta: {
          queue: {
            id: '1',
            priority: 10,
          },
        },
      }, {
        type: 'action',
        payload: {
          id: '4',
        },
        meta: {
          queue: {
            id: '1',
            priority: 10,
          },
        },
      }, {
        type: 'action',
        payload: {
          id: '5',
        },
        meta: {
          queue: {
            id: '1',
            priority: 0,
          },
        },
      }],
    }));
    const action = {
      type: 'action',
      payload: 4,
      meta: {
        queue: {
          id: '1',
          resolve: true,
        },
      },
    };
    store.dispatch(action);
    store.getActions().should.deep.equal([
      action,
      {
        type: 'action',
        payload: {
          id: '3',
        },
        meta: {
          queue: {
            id: '1',
            priority: 10,
          },
        },
      },
      {
        type: 'action',
        payload: {
          id: '4',
        },
        meta: {
          queue: {
            id: '1',
            priority: 10,
          },
        },
      },
    ]);
  });
});
