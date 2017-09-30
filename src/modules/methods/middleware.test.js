/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */
/* eslint no-invalid-this: "off" */

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import configureStore from 'redux-mock-store';
import {
  createMiddleware,
} from './middleware';
import DDPError from '../../DDPError';
import {
  DDP_METHOD,
  DDP_METHOD_UPDATE,
  DDP_UPDATED,
  DDP_CONNECTED,
  DDP_DISCONNECTED,
  DDP_CANCEL,

  DDP_METHOD_STATE__PENDING,
} from '../../constants';
import {
  DDPClient,
} from './common.test';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const createInitialState = (methodId, methodState) => ({
  ddp: {
    methods: {
      [methodId]: methodState,
    },
  },
});

describe('Test module - methods - middleware', () => {
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

  it('should dispatch DDP_METHOD_UPDATE if method is updated', function () {
    const store = this.mockStore(createInitialState('1', {
      id: '1',
      state: DDP_METHOD_STATE__PENDING,
      socketId: '1',
    }));
    store.dispatch({
      type: DDP_UPDATED,
      payload: {
        methods: ['1', '2'],
      },
    });
    store.getActions().should.deep.equal([
      {
        type: DDP_METHOD_UPDATE,
        meta: {
          methodId: '1',
          socketId: '1',
        },
      },
      {
        type: DDP_UPDATED,
        payload: {
          methods: ['1', '2'],
        },
      },
    ]);
  });

  it('should cancel pending methods if connection is lost', function () {
    const store = this.mockStore(createInitialState('1', {
      state: DDP_METHOD_STATE__PENDING,
      name: 'A',
      socketId: '1',
    }));
    const action = {
      type: DDP_DISCONNECTED,
      payload: {
      },
      meta: {
        socketId: '1',
      },
    };
    store.dispatch(action);
    store.getActions().should.deep.equal([
      action,
      {
        type: DDP_CANCEL,
        error: true,
        payload: {
          error: DDPError.ERROR_CONNECTION,
          reason: 'Connection was lost before method A returned',
          details: {
            state: DDP_METHOD_STATE__PENDING,
            name: 'A',
            socketId: '1',
          },
        },
        meta: {
          methodId: '1',
          socketId: '1',
        },
      },
    ]);
  });

  it('should not cancel pending methods if retry flag is set', function () {
    const store = this.mockStore(createInitialState('1', {
      state: DDP_METHOD_STATE__PENDING,
      name: 'A',
      retry: true,
      socketId: '1',
    }));
    const action = {
      type: DDP_DISCONNECTED,
      payload: {
      },
      meta: {
        socketId: '1',
      },
    };
    store.dispatch(action);
    store.getActions().should.deep.equal([
      action,
    ]);
  });

  it('should retry methods when connection is restored', function () {
    const store = this.mockStore(createInitialState('1', {
      state: DDP_METHOD_STATE__PENDING,
      name: 'A',
      socketId: '1',
      retry: true,
    }));
    const action = {
      type: DDP_CONNECTED,
      payload: {
      },
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
          id: '1',
          method: 'A',
          params: undefined,
        },
        meta: {
          socketId: '1',
          methodId: '1',
        },
      },
    ]);
  });
});

