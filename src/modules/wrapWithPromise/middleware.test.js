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
import {
  DDP_METHOD,
  DDP_UPDATED,
  DDP_RESULT,
  DDP_CANCEL,

  DDP_METHOD_STATE__PENDING,
  DDP_METHOD_STATE__UPDATED,
  DDP_METHOD_STATE__RETURNED,
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

describe('Test module - wrapWithPromise - middleware', () => {
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

  it('should return a promise when method is dispatched', function () {
    const store = this.mockStore();
    const action = {
      type: DDP_METHOD,
      payload: {
        id: '1',
      },
    };
    store.dispatch(action).should.be.instanceOf(Promise);
    store.getActions().should.deep.equal([action]);
  });

  it('should resolve a promise when method returns after being updated', function () {
    const store = this.mockStore(createInitialState('1', {
      state: DDP_METHOD_STATE__UPDATED,
    }));
    const assertion = store.dispatch({
      type: DDP_METHOD,
      payload: {
        id: '1',
      },
    }).should.eventually.equal(1);
    store.dispatch({
      type: DDP_RESULT,
      payload: {
        id: '1',
        result: 1,
      },
    });
    return assertion;
  });

  it('should reject a promise when method returns after being updated', function () {
    const store = this.mockStore(createInitialState('1', {
      state: DDP_METHOD_STATE__UPDATED,
    }));
    const assertion = store.dispatch({
      type: DDP_METHOD,
      payload: {
        id: '1',
      },
    }).should.be.rejectedWith('Error');
    store.dispatch({
      type: DDP_RESULT,
      payload: {
        id: '1',
        error: {
          error: 'Error',
        },
      },
    });
    return assertion;
  });

  it('should resolve a promise when method is updated after returning', function () {
    const store = this.mockStore(createInitialState('1', {
      state: DDP_METHOD_STATE__RETURNED,
      result: 1,
    }));
    const assertion = store.dispatch({
      type: DDP_METHOD,
      payload: {
        id: '1',
      },
    }).should.eventually.equal(1);
    store.dispatch({
      type: DDP_UPDATED,
      payload: {
        methods: ['1', '2'],
      },
    });
    return assertion;
  });

  it('should reject a promise when method is updated after returning', function () {
    const store = this.mockStore(createInitialState('1', {
      state: DDP_METHOD_STATE__RETURNED,
      error: {
        error: 'Error',
      },
    }));
    const assertion = store.dispatch({
      type: DDP_METHOD,
      payload: {
        id: '1',
      },
    }).should.be.rejectedWith('Error');
    store.dispatch({
      type: DDP_UPDATED,
      payload: {
        methods: ['1', '2'],
      },
    });
    return assertion;
  });

  it('should resolve a promise when method is canceled', function () {
    const store = this.mockStore(createInitialState('1', {
      state: DDP_METHOD_STATE__PENDING,
      socketId: '1',
    }));
    const assertion = store.dispatch({
      type: DDP_METHOD,
      payload: {
        id: '1',
      },
      meta: {
        methodId: '1',
      },
    }).should.eventually.equal(1);
    store.dispatch({
      type: DDP_CANCEL,
      payload: 1,
      meta: {
        methodId: '1',
        socketId: '1',
      },
    });
    store.getActions().should.deep.equal([
      {
        type: DDP_METHOD,
        payload: {
          id: '1',
        },
        meta: {
          methodId: '1',
        },
      },
      {
        type: DDP_CANCEL,
        payload: 1,
        meta: {
          methodId: '1',
          socketId: '1',
        },
      },
    ]);
    return assertion;
  });

  it('should reject a promise when method is canceled', function () {
    const store = this.mockStore(createInitialState('1', {
      state: DDP_METHOD_STATE__PENDING,
      socketId: '1',
    }));
    const assertion = store.dispatch({
      type: DDP_METHOD,
      payload: {
        id: '1',
      },
      meta: {
        methodId: '1',
      },
    }).should.be.rejectedWith('Error');
    store.dispatch({
      type: DDP_CANCEL,
      error: true,
      payload: {
        error: 'Error',
      },
      meta: {
        methodId: '1',
        socketId: '1',
      },
    });
    store.getActions().should.deep.equal([
      {
        type: DDP_METHOD,
        payload: {
          id: '1',
        },
        meta: {
          methodId: '1',
        },
      },
      {
        type: DDP_CANCEL,
        error: true,
        payload: {
          error: 'Error',
        },
        meta: {
          methodId: '1',
          socketId: '1',
        },
      },
    ]);
    return assertion;
  });
});

