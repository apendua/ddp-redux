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
  DDP_METHOD,
  DDP_CONNECT,
  DDP_RESULT,
  DDP_PONG,
  DDP_SUB,
  DDP_UNSUB,
  DDP_ENQUEUE,

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
} from '../../constants';
import {
  DDPClient,
} from './common.test';

chai.should();
chai.use(sinonChai);

const createInitialState = (socketId, socketState) => ({
  ddp: {
    messages: {
      sockets: {
        [socketId]: socketState,
      },
    },
  },
});


describe('Test module - messages - middleware', () => {
  beforeEach(function () {
    this.send = sinon.spy();
    this.onError = sinon.spy();
    this.ddpClient = new DDPClient();
    this.ddpClient.on('error', this.onError);
    this.ddpClient.send = this.send;
    this.middleware = createMiddleware(this.ddpClient);
    this.mockStore = configureStore([
      this.middleware,
    ]);
  });

  it('should pass through an unknown action', function () {
    const store = this.mockStore();
    const action = {
      type: 'unknown',
      payload: {},
    };
    store.dispatch(action);
    store.getActions().should.have.members([
      action,
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
            sockets: {},
          },
        },
      });
      this.ddpClient.emit('message', {
        msg,
      }, {
        socketId: '1',
      });
      store.getActions().should.deep.equal([{
        type: MESSAGE_TO_ACTION[msg],
        payload: {
          msg,
        },
        meta: {
          socketId: '1',
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
      const store = this.mockStore(createInitialState('1', {
        pending: {},
        queue: [],
      }));
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
          socketId: '1',
        },
      }]);
      this.send.should.be.calledWith(ddpMessage);
    });
  });

  it('should enqueue action if priority is too low', function () {
    const store = this.mockStore(createInitialState('1', {
      pending: {
        1: 20,
        2: 30,
      },
      queue: [],
    }));
    const action = {
      type: DDP_METHOD,
      payload: {
        id: '2',
        msg: MSG_METHOD,
      },
      meta: {
        socketId: '1',
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
    const store = this.mockStore(createInitialState('1', {
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
          socketId: '1',
          priority: 10,
        },
      }, {
        type: DDP_METHOD,
        payload: {
          id: '4',
          msg: MSG_METHOD,
        },
        meta: {
          socketId: '1',
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
    }));
    const action = {
      type: DDP_RESULT,
      payload: 4,
      meta: {
        socketId: '1',
      },
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
          socketId: '1',
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
          socketId: '1',
          priority: 10,
        },
      },
    ]);
  });
});
