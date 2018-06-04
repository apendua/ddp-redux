/* eslint-env jest */

import {
  createSelectors,
} from './selectors';
import {
  DDPClient,
} from './testCommon';

const constant = x => () => x;

describe('Test module - collections - selectors', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  beforeEach(() => {
    testContext.selectors = createSelectors(DDPClient);
    testContext.collections1 = {
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
    testContext.collections2 = {
      ...testContext.collections1,
      col1: {
        ...testContext.collections1.col1,
        byId: {
          ...testContext.collections1.col1.byId,
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
    testContext.collections3 = {
      ...testContext.collections2,
      col1: {
        ...testContext.collections2.col1,
        byId: {
          ...testContext.collections2.col1.byId,
          2: {
            ...testContext.collections2.col1.byId[2],
            current: {
              ...testContext.collections2.col1.byId[2].current,
              'socket/1': {
                ...testContext.collections2.col1.byId[2].current['socket/1'],
                a: 3,
              },
            },
          },
        },
      },
    };
    testContext.state1 = { ddp: { collections: testContext.collections1 } };
    testContext.state2 = { ddp: { collections: testContext.collections2 } };
    testContext.state3 = { ddp: { collections: testContext.collections3 } };
  });

  test('should select a document by id', () => {
    const selector = testContext.selectors.col1.one(constant('1'));
    const expected = {
      _id: '1',
      a: 1,
      b: 2,
      c: 3,
      d: 4,
    };
    const doc1 = selector(testContext.state1);
    const doc2 = selector(testContext.state2);
    expect(doc1).toEqual(expected);
    expect(doc2).toBe(doc1);
    expect(testContext.selectors.col1.all().byId().recomputations()).toBe(2);
  });

  test('should find all documents', () => {
    const predicate = constant(true);
    const selector = testContext.selectors.col1.where(() => predicate);
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
    const results1 = selector(testContext.state1);
    const results2 = selector(testContext.state2);
    expect(results1).toEqual([
      doc1,
    ]);
    expect(results2).toEqual([
      doc1,
      doc2,
    ]);
  });

  test('should find all matching documents', () => {
    const predicate = x => x.c === 3;
    const selector = testContext.selectors.col1.where(() => predicate);
    const doc1 = {
      _id: '1',
      a: 1,
      b: 2,
      c: 3,
      d: 4,
    };
    const results1 = selector(testContext.state1);
    const results2 = selector(testContext.state2);
    expect(results1).toEqual([
      doc1,
    ]);
    expect(results2).toEqual([
      doc1,
    ]);
  });

  test('should find one matching document', () => {
    const predicate = x => x.c === 3;
    const selector = testContext.selectors.col1.one.where(() => predicate);
    const doc1 = {
      _id: '1',
      a: 1,
      b: 2,
      c: 3,
      d: 4,
    };
    const results1 = selector(testContext.state1);
    const results2 = selector(testContext.state2);
    expect(results1).toEqual(doc1);
    expect(results2).toEqual(doc1);
  });
});
