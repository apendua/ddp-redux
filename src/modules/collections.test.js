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
} from './collections';
import {
  DDP_FLUSH,
  DDP_ADDED,
  DDP_CHANGED,
  DDP_REMOVED,
} from '../constants';

chai.should();
chai.use(sinonChai);

class DDPClient {
  constructor() {
    this.socket = new DDPEmitter();
  }
}

class Model1 {
  constructor(doc) {
    Object.assign(this, doc);
  }
}

class Model2 {
  constructor(doc) {
    Object.assign(this, doc);
  }
}

DDPClient.models = {
  col1: Model1,
  col2: Model2,
};

describe('Test module - collections', () => {
  describe('Reducer', () => {
    beforeEach(function () {
      this.reducer = createReducer(DDPClient);
      this.referenceState1 = {
        col1: {
          nextById: {
            1: {
              current: new Model1({
                _id: '1',
                a: 1,
                b: 2,
              }),
            },
          },
        },
        col2: {
          nextById: {
            1: {
              current: new Model1({
                _id: '1',
                a: 1,
                b: 2,
              }),
            },
          },
        },
      };
      this.referenceState2 = {
        col1: {
          nextById: {
            1: {
              current: new Model1({
                _id: '1',
                a: 1,
                b: 2,
              }),
            },
            2: {
              current: new Model1({
                _id: '2',
                a: 3,
                b: 4,
              }),
            },
          },
        },
        col2: {
          nextById: {
            1: {
              current: new Model2({
                _id: '1',
                a: 1,
                b: 2,
              }),
            },
          },
        },
      };
    });

    it('should initialize state', function () {
      this.reducer(undefined, {}).should.deep.equal({});
    });

    it('should flush recent updates', function () {
      this.reducer(this.referenceState1, {
        type: DDP_FLUSH,
      }).should.deep.equal({
        col1: {
          ...this.referenceState1.col1,
          byId: this.referenceState1.col1.nextById,
        },
        col2: {
          ...this.referenceState1.col2,
          byId: this.referenceState1.col2.nextById,
        },
      });
    });

    it('should add an entity to an empty collection', function () {
      const state = this.reducer({
        col2: {
          nextById: {
            1: {
              current: new Model1({
                _id: '1',
                a: 1,
                b: 2,
              }),
            },
          },
        },
      }, {
        type: DDP_ADDED,
        payload: {
          id: '1',
          fields: { a: 1, b: 2 },
          collection: 'col1',
        },
      });
      state.should.deep.equal(this.referenceState1);
      state.col1.nextById[1].current.should.be.instanceOf(Model1);
    });

    it('should add another entity', function () {
      const state = this.reducer(this.referenceState1, {
        type: DDP_ADDED,
        payload: {
          id: '2',
          fields: { a: 3, b: 4 },
          collection: 'col1',
        },
      });
      state.should.deep.equal(this.referenceState2);
      state.col1.nextById[2].current.should.be.instanceOf(Model1);
    });

    it('should update existing entity', function () {
      const state = this.reducer(this.referenceState2, {
        type: DDP_CHANGED,
        payload: {
          id: '1',
          fields: { a: 3 },
          cleared: ['b'],
          collection: 'col1',
        },
      });
      state.should.deep.equal({
        col1: {
          nextById: {
            1: {
              current: new Model1({
                _id: '1',
                a: 3,
              }),
            },
            2: {
              current: new Model1({
                _id: '2',
                a: 3,
                b: 4,
              }),
            },
          },
        },
        col2: {
          nextById: {
            1: {
              current: new Model2({
                _id: '1',
                a: 1,
                b: 2,
              }),
            },
          },
        },
      });
      state.col1.nextById[1].current.should.be.instanceOf(Model1);
    });

    it('should remove an entity', function () {
      const state = this.reducer(this.referenceState2, {
        type: DDP_REMOVED,
        payload: {
          id: '1',
          collection: 'col1',
        },
      });
      state.should.deep.equal({
        col1: {
          nextById: {
            2: {
              current: new Model1({
                _id: '2',
                a: 3,
                b: 4,
              }),
            },
          },
        },
        col2: {
          nextById: {
            1: {
              current: new Model2({
                _id: '1',
                a: 1,
                b: 2,
              }),
            },
          },
        },
      });
    });
  });

  describe('Middleware', () => {
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

    [
      'added',
      'changed',
      'removed',
    ].forEach((event) => {
      it(`should dispatch FLUSH after ${event}`, function () {
        const store = this.mockStore({
          collections: {},
        });
        const action = {
          type: DDP_ADDED,
          payload: {
            msg: event,
            id: '1',
            collection: 'col1',
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
  });
});
