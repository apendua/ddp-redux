/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import configureStore from 'redux-mock-store';
import {
  createMiddleware,
} from './middleware';
import {
  DDPClient,
} from './common.test';
import {
  DEFAULT_SOCKET_ID,

  DDP_CONNECTED,
  DDP_RESULT,
  DDP_METHOD,
  DDP_QUERY_CREATE,
  DDP_QUERY_DELETE,
  DDP_QUERY_UPDATE,
  DDP_QUERY_REQUEST,
  DDP_QUERY_RELEASE,
  DDP_QUERY_REFETCH,

  DDP_STATE__READY,
  DDP_STATE__QUEUED,
  DDP_STATE__PENDING,
  DDP_STATE__OBSOLETE,
  DDP_STATE__CANCELED,
} from '../../constants';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('Test module - queries - middleware', () => {
  beforeEach(function () {
    this.send = sinon.spy();
    this.onError = sinon.spy();
    this.ddpClient = new DDPClient();
    this.ddpClient.on('error', this.onError);
    this.ddpClient.send = this.send;
    this.middleware = createMiddleware(this.ddpClient);
    this.mockStore = configureStore([
      this.middleware,
    ]);
  });

  beforeEach(function () {
    this.clock = sinon.useFakeTimers();
  });

  afterEach(function () {
    this.clock.restore();
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

  it('should dispatch DDP_QUERY_CREATE and DDP_METHOD if query does not yet exist', function () {
    const store = this.mockStore({
      ddp: {
        queries: {
        },
      },
    });
    const action = {
      type: DDP_QUERY_REQUEST,
      payload: {
        name: 'aQuery',
        params: [1, 2, 3],
        properties: {
          socketId: 'socket/1',
        },
      },
    };
    const queryId = store.dispatch(action);
    queryId.should.equal(DDPClient.defaultUniqueId);
    store.getActions().should.deep.equal([
      {
        ...action,
        meta: {
          ...action.meta,
          queryId,
        },
      },
      {
        type: DDP_QUERY_CREATE,
        payload: {
          name: 'aQuery',
          params: [1, 2, 3],
          properties: {
            socketId: 'socket/1',
          },
        },
        meta: {
          queryId: '1',
        },
      },
      {
        type: DDP_METHOD,
        payload: {
          method: 'aQuery',
          params: [1, 2, 3],
        },
        meta: {
          queryId: '1',
          socketId: 'socket/1',
        },
      },
    ]);
  });

  [
    DDP_STATE__CANCELED,
    DDP_STATE__OBSOLETE,
  ].forEach((state) => {
    it(`should dispatch DDP_METHOD if query exists, but it is "${state}"`, function () {
      const store = this.mockStore({
        ddp: {
          queries: {
            1: {
              id: '1',
              name: 'aQuery',
              params: [1, 2, 3],
              properties: {
                socketId: 'socket/1',
              },
              state,
            },
          },
        },
      });
      const action = {
        type: DDP_QUERY_REQUEST,
        payload: {
          name: 'aQuery',
          params: [1, 2, 3],
          properties: {
            socketId: 'socket/1',
          },
        },
      };
      const queryId = store.dispatch(action);
      queryId.should.equal(DDPClient.defaultUniqueId);
      store.getActions().should.deep.equal([
        {
          ...action,
          meta: {
            ...action.meta,
            queryId,
          },
        },
        {
          type: DDP_METHOD,
          payload: {
            method: 'aQuery',
            params: [1, 2, 3],
          },
          meta: {
            queryId: '1',
            socketId: 'socket/1',
          },
        },
      ]);
    });
  });

  it('should not dispatch DDP_QUERY_CREATE nor DDP_METHOD if query already exists', function () {
    const store = this.mockStore({
      ddp: {
        queries: {
          2: {
            id: '2',
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              socketId: 'socket/1',
            },
            state: DDP_STATE__READY,
          },
        },
      },
    });
    const action = {
      type: DDP_QUERY_REQUEST,
      payload: {
        name: 'aQuery',
        params: [1, 2, 3],
        properties: {
          socketId: 'socket/1',
        },
      },
    };
    const queryId = store.dispatch(action);
    queryId.should.equal('2');
    store.getActions().should.deep.equal([
      {
        ...action,
        meta: {
          queryId,
        },
      },
    ]);
  });

  it('should dispatch DDP_QUERY_UPDATE on result received', function () {
    const store = this.mockStore({
      ddp: {
        queries: {
          1: {
            id: '1',
            name: 'aQuery',
            params: [1, 2, 3],
            state: DDP_STATE__PENDING,
          },
        },
      },
    });
    const action = {
      type: DDP_RESULT,
      payload: {
        id: '2',
        result: {
          entities: {
            col1: {
              1: { id: '1' },
            },
          },
        },
      },
      meta: {
        queryId: '1',
      },
    };
    store.dispatch(action);
    store.getActions().should.deep.equal([
      {
        ...action,
        meta: {
          ...action.meta,
          queryId: '1',
        },
      },
      {
        type: DDP_QUERY_UPDATE,
        meta: {
          queryId: '1',
        },
        payload: {
          entities: action.payload.result.entities,
        },
      },
    ]);
  });

  it('should do nothing if relase is called on unknown id', function () {
    const store = this.mockStore({
      ddp: {
        queries: {
        },
      },
    });
    const action = {
      type: DDP_QUERY_RELEASE,
      meta: {
        queryId: '1',
      },
    };
    store.dispatch(action);
    store.getActions().should.deep.equal([
      action,
    ]);
  });

  it('should dispatch DDP_QUERY_DELETE on query release', function () {
    const store = this.mockStore({
      ddp: {
        queries: {
          1: {
            id: '1',
            state: DDP_STATE__READY,
            name: 'aQuery',
            params: [1, 2, 3],
            users: 1,
            entities: {},
          },
        },
      },
    });
    const action = {
      type: DDP_QUERY_RELEASE,
      meta: {
        queryId: '1',
      },
    };
    store.dispatch(action);
    store.getActions().should.deep.equal([
      action,
    ]);

    this.clock.tick(30000);
    store.getActions().should.deep.equal([
      action,
      {
        type: DDP_QUERY_DELETE,
        payload: {
          entities: {},
        },
        meta: {
          queryId: '1',
        },
      },
    ]);
  });

  it('should not dispatch DDP_QUERY_DELETE on release if it is requested again', function () {
    const store = this.mockStore({
      ddp: {
        queries: {
          1: {
            id: '1',
            state: DDP_STATE__READY,
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              socketId: DEFAULT_SOCKET_ID,
            },
            users: 1,
          },
        },
      },
    });
    const action1 = {
      type: DDP_QUERY_RELEASE,
      meta: {
        queryId: '1',
      },
    };
    const action2 = {
      type: DDP_QUERY_REQUEST,
      payload: {
        name: 'aQuery',
        params: [1, 2, 3],
        properties: {
          socketId: DEFAULT_SOCKET_ID,
        },
      },
      meta: {
        queryId: '1',
      },
    };
    store.dispatch(action1);
    store.dispatch(action2);
    store.getActions().should.deep.equal([
      action1,
      action2,
    ]);

    this.clock.tick(30000);
    store.getActions().should.deep.equal([
      action1,
      action2,
    ]);
  });

  it('should not dispatch DDP_QUERY_DELETE if there are many users', function () {
    const store = this.mockStore({
      ddp: {
        queries: {
          1: {
            id: '1',
            state: DDP_STATE__READY,
            name: 'aQuery',
            params: [1, 2, 3],
            users: 2,
          },
        },
      },
    });
    const action = {
      type: DDP_QUERY_RELEASE,
      meta: {
        queryId: '1',
      },
    };
    store.dispatch(action);
    store.getActions().should.deep.equal([
      action,
    ]);

    this.clock.tick(30000);
    store.getActions().should.deep.equal([
      action,
    ]);
  });

  it('should re-fetch queries on re-connect', function () {
    const store = this.mockStore({
      ddp: {
        queries: {
          1: {
            id: '1',
            state: DDP_STATE__OBSOLETE,
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              socketId: 'socket/1',
            },
            users: 1,
          },
          2: {
            id: '2',
            state: DDP_STATE__QUEUED,
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              socketId: 'socket/1',
            },
            users: 1,
          },
          3: {
            id: '3',
            state: DDP_STATE__OBSOLETE,
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              socketId: 'socket/2',
            },
            users: 1,
          },
        },
      },
    });
    const action = {
      type: DDP_CONNECTED,
      payload: {},
      meta: {
        socketId: 'socket/1',
      },
    };
    store.dispatch(action);
    store.getActions().should.deep.equal([
      action,
      {
        type: DDP_QUERY_REFETCH,
        meta: {
          queryId: '1',
        },
      },
      {
        type: DDP_METHOD,
        payload: {
          method: 'aQuery',
          params: [1, 2, 3],
        },
        meta: {
          queryId: '1',
          socketId: 'socket/1',
        },
      },
    ]);
  });

  it('should dispatch method call on DDP_QUERY_REFETCH', function () {
    const store = this.mockStore({
      ddp: {
        queries: {
          1: {
            id: '1',
            state: DDP_STATE__READY,
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              socketId: 'socket/1',
            },
            users: 1,
          },
        },
      },
    });
    const action = {
      type: DDP_QUERY_REFETCH,
      meta: {
        queryId: '1',
      },
    };
    store.dispatch(action);
    store.getActions().should.deep.equal([
      action,
      {
        type: DDP_METHOD,
        payload: {
          method: 'aQuery',
          params: [1, 2, 3],
        },
        meta: {
          queryId: '1',
          socketId: 'socket/1',
        },
      },
    ]);
  });

  it('should not dispatch method call on DDP_QUERY_REFETCH if query has no users', function () {
    const store = this.mockStore({
      ddp: {
        queries: {
          1: {
            id: '1',
            state: DDP_STATE__READY,
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              socketId: 'socket/1',
            },
            users: 0,
          },
        },
      },
    });
    const action = {
      type: DDP_QUERY_REFETCH,
      meta: {
        queryId: '1',
      },
    };
    store.dispatch(action);
    store.getActions().should.deep.equal([
      action,
    ]);
  });  
});
