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
  createSelectors,
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

Model1.indexes = {
  a: {},
  b: {},
};

class Model2 {
  constructor(doc) {
    Object.assign(this, doc);
  }
}

Model2.indexes = {};

DDPClient.models = {
  col1: Model1,
  col2: Model2,
};

const constant = x => () => x;

describe('Test module - collections', () => {
  describe('Reducer', () => {
    beforeEach(function () {
      this.reducer = createReducer(DDPClient);
      this.referenceState1 = {
        col1: {
          nextById: {
            1: {
              current: {
                'socket/1': new Model1({
                  _id: '1',
                  a: 1,
                  b: 2,
                }),
              },
            },
          },
        },
        col2: {
          nextById: {
            1: {
              current: {
                'socket/1': new Model1({
                  _id: '1',
                  a: 1,
                  b: 2,
                }),
              },
            },
          },
        },
      };
      this.referenceState2 = {
        col1: {
          nextById: {
            1: {
              current: {
                'socket/1': new Model1({
                  _id: '1',
                  a: 1,
                  b: 2,
                }),
              },
            },
            2: {
              current: {
                'socket/1': new Model1({
                  _id: '2',
                  a: 3,
                  b: 4,
                }),
              },
            },
          },
        },
        col2: {
          nextById: {
            1: {
              current: {
                'socket/1': new Model2({
                  _id: '1',
                  a: 1,
                  b: 2,
                }),
              },
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
              current: {
                'socket/1': new Model1({
                  _id: '1',
                  a: 1,
                  b: 2,
                }),
              },
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
        meta: {
          socketId: 'socket/1',
        },
      });
      state.should.deep.equal(this.referenceState1);
    });

    it('should add another entity', function () {
      const state = this.reducer(this.referenceState1, {
        type: DDP_ADDED,
        payload: {
          id: '2',
          fields: { a: 3, b: 4 },
          collection: 'col1',
        },
        meta: {
          socketId: 'socket/1',
        },
      });
      state.should.deep.equal(this.referenceState2);
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
        meta: {
          socketId: 'socket/1',
        },
      });
      state.should.deep.equal({
        col1: {
          nextById: {
            1: {
              current: {
                'socket/1': new Model1({
                  _id: '1',
                  a: 3,
                }),
              },
            },
            2: {
              current: {
                'socket/1': new Model1({
                  _id: '2',
                  a: 3,
                  b: 4,
                }),
              },
            },
          },
        },
        col2: {
          nextById: {
            1: {
              current: {
                'socket/1': new Model2({
                  _id: '1',
                  a: 1,
                  b: 2,
                }),
              },
            },
          },
        },
      });
    });

    it('should remove an entity', function () {
      const state = this.reducer(this.referenceState2, {
        type: DDP_REMOVED,
        payload: {
          id: '1',
          collection: 'col1',
        },
        meta: {
          socketId: 'socket/1',
        },
      });
      state.should.deep.equal({
        col1: {
          nextById: {
            2: {
              current: {
                'socket/1': new Model1({
                  _id: '2',
                  a: 3,
                  b: 4,
                }),
              },
            },
          },
        },
        col2: {
          nextById: {
            1: {
              current: {
                'socket/1': new Model2({
                  _id: '1',
                  a: 1,
                  b: 2,
                }),
              },
            },
          },
        },
      });
    });
  });

  describe('Selectors', () => {
    beforeEach(function () {
      this.selectors = createSelectors(DDPClient);
      this.collections1 = {
        col1: {
          byId: {
            1: {
              current: {
                'socket/1': {
                  _id: '1',
                  a: 1,
                  b: 2,
                },
                'socket/2': {
                  _id: '1',
                  c: 3,
                  d: 4,
                },
              },
            },
          },
        },
        col2: {
          byId: {
            1: {
              current: {
                'socket/1': {
                  _id: '1',
                  a: 1,
                  b: 2,
                },
              },
            },
          },
        },
      };
      this.collections2 = {
        ...this.collections1,
        col1: {
          ...this.collections1.col1,
          byId: {
            ...this.collections1.col1.byId,
            2: {
              current: {
                'socket/1': {
                  _id: '2',
                  a: 1,
                  b: 2,
                },
              },
            },
          },
        },
      };
      this.collections3 = {
        ...this.collections2,
        col1: {
          ...this.collections2.col1,
          byId: {
            ...this.collections2.col1.byId,
            2: {
              ...this.collections2.col1.byId[2],
              current: {
                ...this.collections2.col1.byId[2].current,
                'socket/1': {
                  ...this.collections2.col1.byId[2].current['socket/1'],
                  a: 3,
                },
              },
            },
          },
        },
      };
      this.state1 = { ddp: { collections: this.collections1 } };
      this.state2 = { ddp: { collections: this.collections2 } };
      this.state3 = { ddp: { collections: this.collections3 } };
    });

    it('should select a document by id', function () {
      const selector = this.selectors.col1.selectOne(constant('1'));
      const expected = {
        _id: '1',
        a: 1,
        b: 2,
        c: 3,
        d: 4,
      };
      const doc1 = selector(this.state1);
      const doc2 = selector(this.state2);
      doc1.should.deep.equal(expected);
      doc2.should.equal(doc1);
      this.selectors.col1.selectAll.recomputations().should.equal(2);
    });

    it('should find all documents', function () {
      const predicate = constant(true);
      const selector = this.selectors.col1.find(() => predicate);
      const doc1 = {
        _id: '1',
        a: 1,
        b: 2,
        c: 3,
        d: 4,
      };
      const doc2 = {
        _id: '2',
        a: 1,
        b: 2,
      };
      const results1 = selector(this.state1);
      const results2 = selector(this.state2);
      results1.should.deep.equal([
        doc1,
      ]);
      results2.should.deep.equal([
        doc1,
        doc2,
      ]);
    });

    it('should find all matching documents', function () {
      const predicate = x => x.c === 3;
      const selector = this.selectors.col1.find(() => predicate);
      const doc1 = {
        _id: '1',
        a: 1,
        b: 2,
        c: 3,
        d: 4,
      };
      const results1 = selector(this.state1);
      const results2 = selector(this.state2);
      results1.should.deep.equal([
        doc1,
      ]);
      results2.should.deep.equal([
        doc1,
      ]);
    });

    it('should find one matching document', function () {
      const predicate = x => x.c === 3;
      const selector = this.selectors.col1.findOne(() => predicate);
      const doc1 = {
        _id: '1',
        a: 1,
        b: 2,
        c: 3,
        d: 4,
      };
      const results1 = selector(this.state1);
      const results2 = selector(this.state2);
      results1.should.deep.equal(doc1);
      results2.should.deep.equal(doc1);
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
          ddp: {
            collections: {},
          },
        });
        const action = {
          type: DDP_ADDED,
          payload: {
            msg: event,
            id: '1',
            collection: 'col1',
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
  });
});
