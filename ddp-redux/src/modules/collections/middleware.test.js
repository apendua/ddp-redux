/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */
/* eslint no-invalid-this: "off" */

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import configureStore from 'redux-mock-store';
import {
  createMiddleware,
} from './middleware';
import {
  DDP_FLUSH,
  DDP_READY,
  DDP_UPDATED,

  DDP_ADDED,
  DDP_CHANGED,
  DDP_REMOVED,
} from '../../constants';
import {
  DDPClient,
} from './common.test';

chai.should();
chai.use(sinonChai);

describe('Test module - collections - middleware', () => {
  beforeEach(function () {
    this.clock = sinon.useFakeTimers();
  });

  afterEach(function () {
    this.clock.restore();
  });

  beforeEach(function () {
    this.send = sinon.spy();
    this.ddpClient = new DDPClient();
    this.ddpClient.socket.send = this.send;
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
    DDP_ADDED,
    DDP_CHANGED,
    DDP_REMOVED,
  ].forEach((type) => {
    it(`should schedule dispatching ${DDP_FLUSH} after ${type}`, function () {
      const store = this.mockStore({
        ddp: {
          collections: {
            col1: {
              needsUpdate: true,
            },
          },
        },
      });
      const action = {
        type,
        payload: {
        },
        meta: {
          socketId: 'socket/1',
        },
      };
      store.dispatch(action);
      store.getActions().should.deep.equal([
        action,
      ]);

      this.clock.tick(1000);

      store.getActions().should.deep.equal([
        action,
        {
          type: DDP_FLUSH,
        },
      ]);
    });
  });

  [
    DDP_READY,
    DDP_UPDATED,
  ].forEach((type) => {
    it(`should dispatch ${DDP_FLUSH} right before ${type}`, function () {
      const store = this.mockStore({
        ddp: {
          collections: {
            col1: {
              needsUpdate: true,
            },
          },
        },
      });
      const action = {
        type,
        payload: {
        },
      };
      store.dispatch(action);
      store.getActions().should.deep.equal([
        {
          type: DDP_FLUSH,
        },
        action,
      ]);
    });
  });
});
