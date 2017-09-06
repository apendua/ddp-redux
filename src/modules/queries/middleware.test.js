/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import configureStore from 'redux-mock-store';
import {
  createMiddleware,
} from './middleware';
import {
  DDPClient,
} from './common.test';
import {
  DDP_METHOD,
  DDP_QUERY_CREATE,
  // DDP_QUERY_DELETE,
  // DDP_QUERY_UPDATE,

  DDP_QUERY_REQUEST,
} from '../../constants';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('Test module - queries - middleware', () => {
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

  it('should not dispatch METHOD if query does not yet exist', function () {
    const store = this.mockStore({
      ddp: {
        subscriptions: {
        },
      },
    });
    const action = {
      type: DDP_QUERY_REQUEST,
      payload: {
        name: 'aQuery',
        params: [1, 2, 3],
      },
      meta: {
        socketId: 'socket/1',
      },
    };
    const queryId = store.dispatch(action);
    queryId.should.equal(DDPClient.defaultUniqueId);
    store.getActions().should.deep.equal([
      {
        type: DDP_QUERY_CREATE,
        payload: {
          name: 'aQuery',
          params: [1, 2, 3],
          socketId: 'socket/1',
        },
        meta: {
          queryId: '1',
        },
      },
      {
        type: DDP_METHOD,
        payload: {
          method: 'aQuery',
          params: [1, 2, 3],
        },
        meta: {
          queryId: '1',
          socketId: 'socket/1',
        },
      },
      {
        ...action,
        meta: {
          ...action.meta,
          queryId,
        },
      },
    ]);
  });
});
