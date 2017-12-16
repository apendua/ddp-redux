/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */
/* eslint no-invalid-this: "off" */

import chai from 'chai';
import sinonChai from 'sinon-chai';
import {
  createReducer,
} from './reducer';
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
import {
  DDPClient,
} from './common.test';

chai.should();
chai.use(sinonChai);

describe('Test module - collections - reducer', () => {
  beforeEach(function () {
    this.reducer = createReducer(DDPClient);
    this.referenceState1 = {
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
    this.referenceState2 = {
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
    this.referenceState3 = {
      ...this.referenceState2,
      col2: {
        ...this.referenceState2.col2,
        nextById: {
          ...this.referenceState2.col2.nextById,
          1: {
            ...this.referenceState2.col2.nextById['1'],
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
    this.referenceState4 = {
      ...this.referenceState2,
      col2: {
        ...this.referenceState2.col2,
        nextById: {
          ...this.referenceState2.col2.nextById,
          1: {
            ...this.referenceState2.col2.nextById['1'],
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

  it('should initialize state', function () {
    this.reducer(undefined, {}).should.deep.equal({});
  });

  it('should flush recent updates', function () {
    this.reducer(this.referenceState1, {
      type: DDP_FLUSH,
    }).should.deep.equal({
      col1: {
        byId: this.referenceState1.col1.nextById,
        nextById: this.referenceState1.col1.nextById,
      },
      col2: {
        byId: this.referenceState1.col2.nextById,
        nextById: this.referenceState1.col2.nextById,
      },
    });
  });

  it('should add an entity to an empty collection', function () {
    const state = this.reducer({
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
    state.should.deep.equal(this.referenceState1);
  });

  it('should add an entity to an empty collection (using added before)', function () {
    const state = this.reducer({
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

  it('should update query results', function () {
    const state = this.reducer(this.referenceState3, {
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
    state.should.deep.equal({
      ...this.referenceState3,
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

  it('should replace old query results', function () {
    const state = this.reducer(this.referenceState3, {
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
    state.should.deep.equal({
      ...this.referenceState3,
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

  it('should completely remove query results', function () {
    const state = this.reducer(this.referenceState3, {
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
    state.should.deep.equal({
      ...this.referenceState3,
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

  it('should insert optimistic changes', function () {
    const state = this.reducer(this.referenceState3, {
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
    state.should.deep.equal({
      ...this.referenceState3,
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

  it('should remove optimistic changes', function () {
    const state = this.reducer(this.referenceState4, {
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
    state.should.deep.equal({
      ...this.referenceState4,
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