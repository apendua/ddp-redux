/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import configureStore from 'redux-mock-store';
import DDPEmitter from '../DDPEmitter';
import {
  createReducer,
  createMiddleware,
} from './messages';
import {
  DDP_METHOD,
  DDP_CONNECT,
  DDP_CONNECTED,
  DDP_RESULT,
  DDP_PONG,
  DDP_SUB,
  DDP_UNSUB,
  DDP_ENQUEUE,
  DDP_CLOSE,

  MSG_METHOD,
  MSG_READY,
  MSG_NOSUB,
  MSG_ADDED,
  MSG_REMOVED,
  MSG_CHANGED,
  MSG_UPDATED,
  MSG_RESULT,
  MSG_PING,
  MSG_ERROR,
  MSG_CONNECTED,
  MSG_FAILED,

  MESSAGE_TO_ACTION,
  ACTION_TO_MESSAGE,
  ACTION_TO_PRIORITY,
} from '../constants';

class DDPClient extends DDPEmitter {
  constructor() {
    super();
    this.socket = new DDPEmitter();
  }

  nextUniqueId() {
    return '1';
  }
}

chai.should();
chai.use(sinonChai);

describe('Test module - messages', () => {
  describe('Reducer', () => {
    beforeEach(function () {
      this.reducer = createReducer(DDPClient);
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
        type: DDP_CLOSE,
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

    it('should method from queue when method is emited', function () {
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

  describe('Middleware', () => {
    beforeEach(function () {
      this.send = sinon.spy();
      this.close = sinon.spy();
      this.onError = sinon.spy();
      this.ddpClient = new DDPClient();
      this.ddpClient.socket.send = this.send;
      this.ddpClient.socket.close = this.close;
      this.ddpClient.on('error', this.onError);
      this.middleware = createMiddleware(this.ddpClient);
      this.mockStore = configureStore([
        this.middleware,
      ]);
    });

    [
      MSG_READY,
      MSG_NOSUB,
      MSG_ADDED,
      MSG_REMOVED,
      MSG_CHANGED,
      MSG_UPDATED,
      MSG_RESULT,
      MSG_PING,
      MSG_ERROR,
      MSG_CONNECTED,
      MSG_FAILED,
    ].forEach((msg) => {
      it(`should translate message "${msg}"`, function () {
        const store = this.mockStore({
          ddp: {
            messages: {
              pending: {},
              queue: [],
            },
          },
        });
        this.ddpClient.socket.emit('message', {
          msg,
        });
        store.getActions().should.deep.equal([{
          type: MESSAGE_TO_ACTION[msg],
          payload: {
            msg,
          },
        }]);
      });
    });

    [
      DDP_PONG,
      DDP_METHOD,
      DDP_SUB,
      DDP_UNSUB,
      DDP_CONNECT,
    ].forEach((type) => {
      it(`should process action ${type}`, function () {
        const store = this.mockStore({
          ddp: {
            messages: {
              pending: {},
              queue: [],
            },
          },
        });
        store.dispatch({
          type,
        });
        const ddpMessage = {
          msg: ACTION_TO_MESSAGE[type],
          ...(type === DDP_SUB || type === DDP_METHOD) && {
            id: '1',
          },
        };
        store.getActions().should.deep.equal([{
          type,
          payload: ddpMessage,
          meta: {
            priority: ACTION_TO_PRIORITY[type],
          },
        }]);
        this.send.should.be.calledWith(ddpMessage);
      });
    });

    it('should enqueue action if priority is too low', function () {
      const store = this.mockStore({
        ddp: {
          messages: {
            pending: {
              1: 20,
              2: 30,
            },
            queue: [],
          },
        },
      });
      const action = {
        type: DDP_METHOD,
        payload: {
          id: '2',
          msg: MSG_METHOD,
        },
        meta: {
          priority: 25,
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
      const store = this.mockStore({
        ddp: {
          messages: {
            pending: {
              1: 10,
              2: 0,
            },
            queue: [{
              type: DDP_METHOD,
              payload: {
                id: '3',
                msg: MSG_METHOD,
              },
              meta: {
                priority: 10,
              },
            }, {
              type: DDP_METHOD,
              payload: {
                id: '4',
                msg: MSG_METHOD,
              },
              meta: {
                priority: 10,
              },
            }, {
              type: DDP_METHOD,
              payload: {
                id: '5',
                msg: MSG_METHOD,
              },
              meta: {
                priority: 0,
              },
            }],
          },
        },
      });
      const action = {
        type: DDP_RESULT,
        payload: 4,
      };
      store.dispatch(action);
      store.getActions().should.deep.equal([
        action,
        {
          type: DDP_METHOD,
          payload: {
            id: '3',
            msg: MSG_METHOD,
          },
          meta: {
            priority: 10,
          },
        },
        {
          type: DDP_METHOD,
          payload: {
            id: '4',
            msg: MSG_METHOD,
          },
          meta: {
            priority: 10,
          },
        },
      ]);
    });
  });
});
