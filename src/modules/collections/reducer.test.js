/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */

import chai from 'chai';
import sinonChai from 'sinon-chai';
import {
  createReducer,
} from './reducer';
import {
  DDP_FLUSH,
  DDP_ADDED,
  DDP_CHANGED,
  DDP_REMOVED,
} from '../../constants';
import {
  DDPClient,
  Model1,
  Model2,
} from './common.test';

chai.should();
chai.use(sinonChai);

describe('Test module - collections - reducer', () => {
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
