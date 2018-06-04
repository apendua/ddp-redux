/* eslint-env jest */
/* eslint no-invalid-this: "off" */

import { createReducer } from './reducer';
import {
  DDP_FLUSH,
  DDP_ADDED,
  DDP_ADDED_BEFORE,
  DDP_CHANGED,
  DDP_REMOVED,
  DDP_QUERY_UPDATE,
  DDP_QUERY_DELETE,
  DDP_METHOD,
  DDP_UPDATED,
} from '../../constants';
import { DDPClient } from './testCommon';

describe('Test module - collections - reducer', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  beforeEach(() => {
    testContext.reducer = createReducer(DDPClient);
    testContext.referenceState1 = {
      col1: {
        needsUpdate: true,
        nextById: {
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
      col2: {
        needsUpdate: true,
        nextById: {
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
    testContext.referenceState2 = {
      col1: {
        needsUpdate: true,
        nextById: {
          1: {
            current: {
              'socket/1': {
                _id: '1',
                a: 1,
                b: 2,
              },
            },
          },
          2: {
            current: {
              'socket/1': {
                _id: '2',
                a: 3,
                b: 4,
              },
            },
          },
        },
      },
      col2: {
        needsUpdate: true,
        nextById: {
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
    testContext.referenceState3 = {
      ...testContext.referenceState2,
      col2: {
        ...testContext.referenceState2.col2,
        nextById: {
          ...testContext.referenceState2.col2.nextById,
          1: {
            ...testContext.referenceState2.col2.nextById['1'],
            queries: {
              'query/1': {
                a: 2,
              },
            },
            queriesOrder: ['query/1'],
          },
        },
      },
    };
    testContext.referenceState4 = {
      ...testContext.referenceState2,
      col2: {
        ...testContext.referenceState2.col2,
        nextById: {
          ...testContext.referenceState2.col2.nextById,
          1: {
            ...testContext.referenceState2.col2.nextById['1'],
            methods: {
              'method/1': {
                a: 2,
              },
            },
            methodsOrder: ['method/1'],
          },
          3: {
            methods: {
              'method/1': {
                a: 3,
              },
            },
            methodsOrder: ['method/1'],
          },
        },
      },
    };
  });

  test('should initialize state', () => {
    expect(testContext.reducer(undefined, {})).toEqual({});
  });

  test('should flush recent updates', () => {
    expect(testContext.reducer(testContext.referenceState1, {
      type: DDP_FLUSH,
    })).toEqual({
      col1: {
        byId: testContext.referenceState1.col1.nextById,
        nextById: testContext.referenceState1.col1.nextById,
      },
      col2: {
        byId: testContext.referenceState1.col2.nextById,
        nextById: testContext.referenceState1.col2.nextById,
      },
    });
  });

  test('should add an entity to an empty collection', () => {
    const state = testContext.reducer({
      col2: {
        needsUpdate: true,
        nextById: {
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
    expect(state).toEqual(testContext.referenceState1);
  });

  test(
    'should add an entity to an empty collection (using added before)',
    () => {
      const state = testContext.reducer({
        col2: {
          needsUpdate: true,
          nextById: {
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
      }, {
        type: DDP_ADDED_BEFORE,
        payload: {
          id: '1',
          fields: { a: 1, b: 2 },
          collection: 'col1',
        },
        meta: {
          socketId: 'socket/1',
        },
      });
      expect(state).toEqual(testContext.referenceState1);
    },
  );

  test('should add another entity', () => {
    const state = testContext.reducer(testContext.referenceState1, {
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
    expect(state).toEqual(testContext.referenceState2);
  });

  test('should update existing entity', () => {
    const state = testContext.reducer(testContext.referenceState2, {
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
    expect(state).toEqual({
      col1: {
        needsUpdate: true,
        nextById: {
          1: {
            current: {
              'socket/1': {
                _id: '1',
                a: 3,
              },
            },
          },
          2: {
            current: {
              'socket/1': {
                _id: '2',
                a: 3,
                b: 4,
              },
            },
          },
        },
      },
      col2: {
        needsUpdate: true,
        nextById: {
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
    });
  });

  test('should remove an entity', () => {
    const state = testContext.reducer(testContext.referenceState2, {
      type: DDP_REMOVED,
      payload: {
        id: '1',
        collection: 'col1',
      },
      meta: {
        socketId: 'socket/1',
      },
    });
    expect(state).toEqual({
      col1: {
        needsUpdate: true,
        nextById: {
          2: {
            current: {
              'socket/1': {
                _id: '2',
                a: 3,
                b: 4,
              },
            },
          },
        },
      },
      col2: {
        needsUpdate: true,
        nextById: {
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
    });
  });

  test('should update query results', () => {
    const state = testContext.reducer(testContext.referenceState3, {
      type: DDP_QUERY_UPDATE,
      payload: {
        entities: {
          col2: {
            1: { a: 1 },
            2: { a: 2 },
          },
        },
      },
      meta: {
        queryId: 'query/2',
      },
    });
    expect(state).toEqual({
      ...testContext.referenceState3,
      col2: {
        needsUpdate: true,
        nextById: {
          1: {
            current: {
              'socket/1': {
                _id: '1',
                a: 1,
                b: 2,
              },
            },
            queries: {
              'query/1': { a: 2 },
              'query/2': { a: 1 },
            },
            queriesOrder: ['query/1', 'query/2'],
          },
          2: {
            queries: {
              'query/2': { a: 2 },
            },
            queriesOrder: ['query/2'],
          },
        },
      },
    });
  });

  test('should replace old query results', () => {
    const state = testContext.reducer(testContext.referenceState3, {
      type: DDP_QUERY_UPDATE,
      payload: {
        entities: {
          col2: {
            1: { a: 1 },
            2: { a: 2 },
          },
        },
        oldEntities: {
          col2: {
            1: {},
          },
        },
      },
      meta: {
        queryId: 'query/1',
      },
    });
    expect(state).toEqual({
      ...testContext.referenceState3,
      col2: {
        needsUpdate: true,
        nextById: {
          1: {
            current: {
              'socket/1': {
                _id: '1',
                a: 1,
                b: 2,
              },
            },
            queries: {
              'query/1': { a: 1 },
            },
            queriesOrder: ['query/1'],
          },
          2: {
            queries: {
              'query/1': { a: 2 },
            },
            queriesOrder: ['query/1'],
          },
        },
      },
    });
  });

  test('should completely remove query results', () => {
    const state = testContext.reducer(testContext.referenceState3, {
      type: DDP_QUERY_DELETE,
      payload: {
        entities: {
          col2: {
            1: {},
          },
        },
      },
      meta: {
        queryId: 'query/1',
      },
    });
    expect(state).toEqual({
      ...testContext.referenceState3,
      col2: {
        needsUpdate: true,
        nextById: {
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
    });
  });

  test('should insert optimistic changes', () => {
    const state = testContext.reducer(testContext.referenceState3, {
      type: DDP_METHOD,
      meta: {
        methodId: 'method/2',
        entities: {
          col2: {
            1: { a: 1 },
            2: { a: 2 },
          },
        },
      },
    });
    expect(state).toEqual({
      ...testContext.referenceState3,
      col2: {
        needsUpdate: true,
        nextById: {
          1: {
            current: {
              'socket/1': {
                _id: '1',
                a: 1,
                b: 2,
              },
            },
            methods: {
              'method/2': { a: 1 },
            },
            methodsOrder: ['method/2'],
            queries: {
              'query/1': { a: 2 },
            },
            queriesOrder: ['query/1'],
          },
          2: {
            methods: {
              'method/2': { a: 2 },
            },
            methodsOrder: ['method/2'],
          },
        },
      },
    });
  });

  test('should remove optimistic changes', () => {
    const state = testContext.reducer(testContext.referenceState4, {
      type: DDP_UPDATED,
      meta: {
        methods: [
          {
            id: 'method/1',
            entities: {
              col2: {
                1: {},
                3: {},
              },
            },
          },
        ],
      },
    });
    expect(state).toEqual({
      ...testContext.referenceState4,
      col2: {
        needsUpdate: true,
        nextById: {
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
    });
  });
});
