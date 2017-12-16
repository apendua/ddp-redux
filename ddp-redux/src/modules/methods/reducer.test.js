/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */
/* eslint no-invalid-this: "off" */

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import {
  createReducer,
} from './reducer';
import {
  DDP_ENQUEUE,
  DDP_METHOD,
  DDP_UPDATED,
  DDP_RESULT,
  DDP_CANCEL,

  DDP_METHOD_STATE__QUEUED,
  DDP_METHOD_STATE__PENDING,
  DDP_METHOD_STATE__UPDATED,
  DDP_METHOD_STATE__RETURNED,
} from '../../constants';
import {
  DDPClient,
} from './common.test';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('Test module - methods - reducer', () => {
  beforeEach(function () {
    this.reducer = createReducer(DDPClient);
  });

  it('should initialize state', function () {
    this.reducer(undefined, {}).should.deep.equal({});
  });

  it('should add new method', function () {
    this.reducer({}, {
      type: DDP_METHOD,
      payload: {
        id: '1',
        method: 'methodA',
        params: [1, 2, 3],
      },
      meta: {
        methodId: '1',
        socketId: 'socket/1',
      },
    }).should.deep.equal({
      1: {
        id: '1',
        name: 'methodA',
        params: [1, 2, 3],
        state: DDP_METHOD_STATE__PENDING,
        socketId: 'socket/1',
      },
    });
  });

  it('should add method in "queued" state', function () {
    this.reducer({}, {
      type: DDP_ENQUEUE,
      payload: {
      },
      meta: {
        type: DDP_METHOD,
        methodId: '1',
      },
    }).should.deep.equal({
      1: {
        id: '1',
        state: DDP_METHOD_STATE__QUEUED,
      },
    });
  });

  it('should switch state from "queued" to "pending" on DDP_METHOD', function () {
    this.reducer({
      1: {
        state: DDP_METHOD_STATE__QUEUED,
      },
    }, {
      type: DDP_METHOD,
      payload: {
        method: 'methodA',
        params: [],
      },
      meta: {
        methodId: '1',
      },
    }).should.deep.equal({
      1: {
        id: '1',
        state: DDP_METHOD_STATE__PENDING,
        name: 'methodA',
        params: [],
      },
    });
  });

  it('should change method state to "returned"', function () {
    this.reducer({
      1: {
        id: '1',
        state: DDP_METHOD_STATE__PENDING,
      },
    }, {
      type: DDP_RESULT,
      payload: {
        id: '1',
      },
      meta: {
        methodId: '1',
      },
    }).should.deep.equal({
      1: {
        id: '1',
        state: DDP_METHOD_STATE__RETURNED,
        result: undefined,
        error: undefined,
      },
    });
  });

  it('should change method state to "updated"', function () {
    this.reducer({
      1: {
        id: '1',
        state: DDP_METHOD_STATE__PENDING,
      },
    }, {
      type: DDP_UPDATED,
      payload: {
        methods: ['1'],
      },
      meta: {},
    }).should.deep.equal({
      1: {
        id: '1',
        state: DDP_METHOD_STATE__UPDATED,
      },
    });
  });

  it('should remove method if it is already updated', function () {
    this.reducer({
      1: {
        id: '1',
        state: DDP_METHOD_STATE__UPDATED,
      },
    }, {
      type: DDP_RESULT,
      payload: {
        id: '1',
      },
      meta: {
        methodId: '1',
      },
    }).should.deep.equal({});
  });

  it('should remove method if it already returned', function () {
    this.reducer({
      1: {
        id: '1',
        state: DDP_METHOD_STATE__RETURNED,
      },
    }, {
      type: DDP_UPDATED,
      payload: {
        methods: ['1', '2'],
      },
    }).should.deep.equal({});
  });

  it('should remove method if it is canceled', function () {
    this.reducer({
      1: {
        id: '1',
        state: DDP_METHOD_STATE__PENDING,
      },
    }, {
      type: DDP_CANCEL,
      meta: {
        methodId: '1',
      },
    }).should.deep.equal({});
  });
});
