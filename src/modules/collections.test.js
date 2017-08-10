/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import {
  createReducer,
  createMiddleware,
} from './collections';
import {
  DDP_ADDED,
  DDP_CHANGED,
  DDP_REMOVED,
} from '../constants';

chai.should();
chai.use(sinonChai);

class DDPClient {
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
        upstream: {
          col1: {
            1: new Model1({
              _id: '1',
              a: 1,
              b: 2,
            }),
          },
        },
      };
      this.referenceState2 = {
        upstream: {
          col1: {
            1: new Model1({
              _id: '1',
              a: 1,
              b: 2,
            }),
            2: new Model1({
              _id: '2',
              a: 3,
              b: 4,
            }),
          },
        },
      };
    });

    it('should initialize state', function () {
      this.reducer(undefined, {}).should.deep.equal({
        upstream: {},
      });
    });

    it('should add an entity to empty state', function () {
      const state = this.reducer({
        upstream: {},
      }, {
        type: DDP_ADDED,
        payload: {
          id: '1',
          fields: { a: 1, b: 2 },
          collection: 'col1',
        },
      });
      state.should.deep.equal(this.referenceState1);
      state.upstream.col1[1].should.be.instanceOf(Model1);
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
      state.upstream.col1[2].should.be.instanceOf(Model1);
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
        upstream: {
          col1: {
            1: new Model1({
              _id: '1',
              a: 3,
            }),
            2: new Model1({
              _id: '2',
              a: 3,
              b: 4,
            }),
          },
        },
      });
      state.upstream.col1[1].should.be.instanceOf(Model1);
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
        upstream: {
          col1: {
            2: new Model1({
              _id: '2',
              a: 3,
              b: 4,
            }),
          },
        },
      });
    });
  });
});
