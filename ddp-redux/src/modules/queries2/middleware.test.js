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
  createMiddleware as createResourcesMiddleware,
} from '../resources';
import {
  DDPClient,
} from './common.test';
import * as thunk from '../thunk';
import {
  DEFAULT_SOCKET_ID,

  DDP_CONNECTED,
  DDP_METHOD,
  DDP_RESOURCE_CREATE,
  DDP_RESOURCE_DELETE,
  DDP_RESOURCE_UPDATE,
  DDP_RESOURCE_REQUEST,
  DDP_RESOURCE_RELEASE,
  DDP_RESOURCE_FETCH,
  DDP_RESOURCE_REFETCH,
  DDP_RESOURCE_DEPRECATE,

  DDP_STATE__READY,
  DDP_STATE__QUEUED,
  DDP_STATE__PENDING,
  DDP_STATE__OBSOLETE,
  DDP_STATE__CANCELED,
} from '../../constants';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('Test module - queries2 - middleware', () => {
  beforeEach(function () {
    this.send = sinon.spy();
    this.onError = sinon.spy();
    this.ddpClient = new DDPClient();
    this.ddpClient.on('error', this.onError);
    this.ddpClient.send = this.send;
    this.middleware = createMiddleware(this.ddpClient);
    this.resourcesMiddleware = createResourcesMiddleware(this.ddpClient);
    this.methodsMiddleware = () => next => (action) => {
      if (typeof action !== 'object') {
        return next(action);
      }
      if (action.type === DDP_METHOD) {
        next(action);
        return Promise.resolve();
      }
      return next(action);
    };
    this.mockStore = configureStore([
      thunk.createMiddleware(),
      this.resourcesMiddleware,
      this.middleware,
      this.methodsMiddleware,
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

  it('should return a newly create resourceId', function () {
    const store = this.mockStore({
      ddp: {
        resources: {
        },
      },
    });
    const action = {
      type: DDP_RESOURCE_REQUEST,
      payload: {
        name: 'aQuery',
        params: [1, 2, 3],
        properties: {
          type: 'query',
          socketId: 'socket/1',
        },
      },
    };
    store.dispatch(action).should.equal(DDPClient.defaultUniqueId);
  });

  it('should dispatch DDP_RESOURCE_CREATE and DDP_METHOD if query does not yet exist', function () {
    const store = this.mockStore({
      ddp: {
        resources: {
        },
      },
    });
    const action = {
      type: DDP_RESOURCE_REQUEST,
      payload: {
        name: 'aQuery',
        params: [1, 2, 3],
        properties: {
          type: 'query',
          socketId: 'socket/1',
        },
      },
    };
    const resourceId = store.dispatch(action);
    store.getActions().should.deep.equal([
      {
        type: DDP_RESOURCE_CREATE,
        payload: {
          name: 'aQuery',
          params: [1, 2, 3],
          properties: {
            type: 'query',
            socketId: 'socket/1',
          },
        },
        meta: {
          resourceId: '1',
        },
      },
      {
        ...action,
        meta: {
          ...action.meta,
          resourceId,
        },
      },
      {
        type: DDP_RESOURCE_FETCH,
        payload: {
          name: 'aQuery',
          params: [1, 2, 3],
          properties: {
            type: 'query',
            socketId: 'socket/1',
          },
        },
        meta: {
          resourceId: '1',
        },
      },
      {
        type: DDP_METHOD,
        payload: {
          method: 'aQuery',
          params: [1, 2, 3],
        },
        meta: {
          resourceId: '1',
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
          resources: {
            1: {
              id: '1',
              name: 'aQuery',
              params: [1, 2, 3],
              properties: {
                type: 'query',
                socketId: 'socket/1',
              },
              state,
            },
          },
        },
      });
      const action = {
        type: DDP_RESOURCE_REQUEST,
        payload: {
          name: 'aQuery',
          params: [1, 2, 3],
          properties: {
            type: 'query',
            socketId: 'socket/1',
          },
        },
      };
      const resourceId = store.dispatch(action);
      store.getActions().should.deep.equal([
        {
          ...action,
          meta: {
            ...action.meta,
            resourceId,
          },
        },
        {
          type: DDP_RESOURCE_FETCH,
          payload: {
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              type: 'query',
              socketId: 'socket/1',
            },
          },
          meta: {
            resourceId: '1',
          },
        },
        {
          type: DDP_METHOD,
          payload: {
            method: 'aQuery',
            params: [1, 2, 3],
          },
          meta: {
            resourceId: '1',
            socketId: 'socket/1',
          },
        },
      ]);
    });
  });

  it('should not dispatch DDP_RESOURCE_CREATE nor DDP_METHOD if query already exists', function () {
    const store = this.mockStore({
      ddp: {
        resources: {
          2: {
            id: '2',
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              type: 'query',
              socketId: 'socket/1',
            },
            state: DDP_STATE__READY,
          },
        },
      },
    });
    const action = {
      type: DDP_RESOURCE_REQUEST,
      payload: {
        name: 'aQuery',
        params: [1, 2, 3],
        properties: {
          type: 'query',
          socketId: 'socket/1',
        },
      },
    };
    const resourceId = store.dispatch(action);
    resourceId.should.equal('2');
    store.getActions().should.deep.equal([
      {
        ...action,
        meta: {
          resourceId,
        },
      },
    ]);
  });

  it('should add "entities" into the payload on DDP_RESOURCE_UPDATE', function () {
    const store = this.mockStore({
      ddp: {
        resources: {
          1: {
            id: '1',
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              type: 'query',
            },
            state: DDP_STATE__PENDING,
            entities: {},
          },
        },
      },
    });
    const action = {
      type: DDP_RESOURCE_UPDATE,
      payload: {
        result: {
          entities: {
            col1: {
              1: { id: '1' },
            },
          },
        },
      },
      meta: {
        resourceId: '1',
      },
    };
    store.dispatch(action);
    store.getActions().should.deep.equal([
      {
        ...action,
        payload: {
          ...action.payload,
          name: 'aQuery',
          params: [1, 2, 3],
          properties: {
            type: 'query',
          },
          entities: {
            col1: {
              1: { id: '1' },
            },
          },
          oldEntities: {},
        },
        meta: {
          resourceId: '1',
        },
      },
    ]);
  });

  it('should do nothing if relase is called on unknown id', function () {
    const store = this.mockStore({
      ddp: {
        resources: {
        },
      },
    });
    const action = {
      type: DDP_RESOURCE_RELEASE,
      meta: {
        resourceId: '1',
      },
    };
    store.dispatch(action);
    store.getActions().should.deep.equal([
      action,
    ]);
  });

  it('should dispatch DDP_RESOURCE_DELETE on query release', function () {
    const store = this.mockStore({
      ddp: {
        resources: {
          1: {
            id: '1',
            state: DDP_STATE__READY,
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              type: 'query',
            },
            users: 1,
            entities: {},
          },
        },
      },
    });
    const action = {
      type: DDP_RESOURCE_RELEASE,
      meta: {
        resourceId: '1',
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
        type: DDP_RESOURCE_DELETE,
        payload: {
          name: 'aQuery',
          params: [1, 2, 3],
          properties: {
            type: 'query',
          },
          entities: {},
        },
        meta: {
          resourceId: '1',
        },
      },
    ]);
  });

  it('should not dispatch DDP_RESOURCE_DELETE on release if it is requested again', function () {
    const store = this.mockStore({
      ddp: {
        resources: {
          1: {
            id: '1',
            state: DDP_STATE__READY,
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              type: 'query',
              socketId: DEFAULT_SOCKET_ID,
            },
            users: 1,
          },
        },
      },
    });
    const action1 = {
      type: DDP_RESOURCE_RELEASE,
      meta: {
        resourceId: '1',
      },
    };
    const action2 = {
      type: DDP_RESOURCE_REQUEST,
      payload: {
        name: 'aQuery',
        params: [1, 2, 3],
        properties: {
          type: 'query',
          socketId: DEFAULT_SOCKET_ID,
        },
      },
      meta: {
        resourceId: '1',
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

  it('should not dispatch DDP_RESOURCE_DELETE if there are many users', function () {
    const store = this.mockStore({
      ddp: {
        resources: {
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
      type: DDP_RESOURCE_RELEASE,
      meta: {
        resourceId: '1',
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

  it('should re-fetch resources on re-connect', function () {
    const store = this.mockStore({
      ddp: {
        resources: {
          1: {
            id: '1',
            state: DDP_STATE__OBSOLETE,
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              type: 'query',
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
              type: 'query',
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
              type: 'query',
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
        type: DDP_RESOURCE_REFETCH,
        payload: {
          name: 'aQuery',
          params: [1, 2, 3],
          properties: {
            type: 'query',
            socketId: 'socket/1',
          },
        },
        meta: {
          resourceId: '1',
        },
      },
      {
        type: DDP_METHOD,
        payload: {
          method: 'aQuery',
          params: [1, 2, 3],
        },
        meta: {
          resourceId: '1',
          socketId: 'socket/1',
        },
      },
    ]);
  });

  it('should dispatch method call on DDP_RESOURCE_REFETCH', function () {
    const store = this.mockStore({
      ddp: {
        resources: {
          1: {
            id: '1',
            state: DDP_STATE__READY,
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              type: 'query',
              socketId: 'socket/1',
            },
            users: 1,
          },
        },
      },
    });
    const action = {
      type: DDP_RESOURCE_REFETCH,
      meta: {
        resourceId: '1',
      },
    };
    store.dispatch(action);
    store.getActions().should.deep.equal([
      {
        ...action,
        payload: {
          name: 'aQuery',
          params: [1, 2, 3],
          properties: {
            type: 'query',
            socketId: 'socket/1',
          },
        },
      },
      {
        type: DDP_METHOD,
        payload: {
          method: 'aQuery',
          params: [1, 2, 3],
        },
        meta: {
          resourceId: '1',
          socketId: 'socket/1',
        },
      },
    ]);
  });

  it('should not dispatch method call on DDP_RESOURCE_DEPRECATE if query has no users', function () {
    const store = this.mockStore({
      ddp: {
        resources: {
          1: {
            id: '1',
            state: DDP_STATE__READY,
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              type: 'query',
              socketId: 'socket/1',
            },
            users: 0,
          },
        },
      },
    });
    const action = {
      type: DDP_RESOURCE_DEPRECATE,
      meta: {
        resourceId: '1',
      },
    };
    store.dispatch(action);
    store.getActions().should.deep.equal([
      action,
    ]);
  });
});
