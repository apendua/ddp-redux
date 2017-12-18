/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */

import chai from 'chai';
import sinonChai from 'sinon-chai';
import {
  createSelectors,
} from './selectors';
import {
  DDPClient,
} from './common.test';

chai.should();
chai.use(sinonChai);

const constant = x => () => x;

describe('Test module - collections - selectors', () => {
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
              },
            },
            queries: {
              'query/1': {
                d: 4,
              },
            },
            queriesOrder: ['query/1'],
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
              },
            },
            queries: {
              'query/1': {
                _id: '1',
                a: 9,
                b: 2,
              },
            },
            queriesOrder: ['query/1'],
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
    const selector = this.selectors.col1.one(constant('1'));
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
    this.selectors.col1.all().byId().recomputations().should.equal(2);
  });

  it('should find all documents', function () {
    const predicate = constant(true);
    const selector = this.selectors.col1.where(() => predicate);
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
    const selector = this.selectors.col1.where(() => predicate);
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
    const selector = this.selectors.col1.one.where(() => predicate);
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
