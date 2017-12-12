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
import * as thunk from '../thunk';
import {
  DEFAULT_SOCKET_ID,

  DDP_CONNECTED,
  DDP_RESOURCE_CREATE,
  DDP_RESOURCE_DELETE,
  DDP_RESOURCE_REQUEST,
  DDP_RESOURCE_RELEASE,
  DDP_RESOURCE_REFRESH,

  DDP_STATE__READY,
  DDP_STATE__QUEUED,
  DDP_STATE__OBSOLETE,
  DDP_STATE__CANCELED,
} from '../../constants';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const constant = x => () => x;
const FETCH_RESOURCE = '@TEST/FETCH.RESOURCE';

describe('Test module - resources - middleware', () => {
  beforeEach(function () {
    this.send = sinon.spy();
    this.onError = sinon.spy();
    this.ddpClient = new DDPClient();
    this.ddpClient.on('error', this.onError);
    this.ddpClient.send = this.send;
    this.middleware = createMiddleware(this.ddpClient, {
      resourceType: 'generic',
      fetchResource: (name, params, { resourceId, socketId }) => ({
        type: FETCH_RESOURCE,
        payload: {
          name,
          params,
        },
        meta: {
          socketId,
          resourceId,
        },
      }),
      getCleanupTimeout: constant(1000),
      createGetResources: getState => () => getState().ddp.resources,
    });
    this.mockStore = configureStore([
      thunk.createMiddleware(),
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

  it('should dispatch DDP_RESOURCE_CREATE and "fetch" if resource does not yet exist', function () {
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
          socketId: 'socket/1',
        },
      },
      meta: {
        resourceType: 'generic',
      },
    };
    const resourceId = store.dispatch(action);
    resourceId.should.equal(DDPClient.defaultUniqueId);
    store.getActions().should.deep.equal([
      {
        ...action,
        meta: {
          ...action.meta,
          resourceId,
          resourceType: 'generic',
        },
      },
      {
        type: DDP_RESOURCE_CREATE,
        payload: {
          name: 'aQuery',
          params: [1, 2, 3],
          properties: {
            socketId: 'socket/1',
          },
        },
        meta: {
          resourceId: '1',
          resourceType: 'generic',
        },
      },
      {
        type: FETCH_RESOURCE,
        payload: {
          name: 'aQuery',
          params: [1, 2, 3],
        },
        meta: {
          socketId: 'socket/1',
          resourceId: '1',
        },
      },
    ]);
  });

  [
    DDP_STATE__CANCELED,
    DDP_STATE__OBSOLETE,
  ].forEach((state) => {
    it(`should dispatch FETCH_RESOURCE if resource exists, but it is "${state}"`, function () {
      const store = this.mockStore({
        ddp: {
          resources: {
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
        type: DDP_RESOURCE_REQUEST,
        payload: {
          name: 'aQuery',
          params: [1, 2, 3],
          properties: {
            socketId: 'socket/1',
          },
        },
        meta: {
          resourceType: 'generic',
        },
      };
      const resourceId = store.dispatch(action);
      resourceId.should.equal(DDPClient.defaultUniqueId);
      store.getActions().should.deep.equal([
        {
          ...action,
          meta: {
            ...action.meta,
            resourceId,
          },
        },
        {
          type: FETCH_RESOURCE,
          payload: {
            name: 'aQuery',
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

  it('should not dispatch DDP_RESOURCE_CREATE nor FETCH_RESOURCE if resource already exists', function () {
    const store = this.mockStore({
      ddp: {
        resources: {
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
      type: DDP_RESOURCE_REQUEST,
      payload: {
        name: 'aQuery',
        params: [1, 2, 3],
        properties: {
          socketId: 'socket/1',
        },
      },
      meta: {
        resourceType: 'generic',
      },
    };
    const resourceId = store.dispatch(action);
    resourceId.should.equal('2');
    store.getActions().should.deep.equal([
      {
        ...action,
        meta: {
          resourceId,
          resourceType: 'generic',
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

  it('should dispatch DDP_RESOURCE_DELETE on resource release', function () {
    const store = this.mockStore({
      ddp: {
        resources: {
          1: {
            id: '1',
            state: DDP_STATE__READY,
            name: 'aQuery',
            params: [1, 2, 3],
            users: 1,
          },
        },
      },
    });
    const action = {
      type: DDP_RESOURCE_RELEASE,
      meta: {
        resourceId: '1',
        resourceType: 'generic',
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
        meta: {
          resourceId: '1',
          resourceType: 'generic',
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
        resourceType: 'generic',
      },
    };
    const action2 = {
      type: DDP_RESOURCE_REQUEST,
      payload: {
        name: 'aQuery',
        params: [1, 2, 3],
        properties: {
          socketId: DEFAULT_SOCKET_ID,
        },
      },
      meta: {
        resourceId: '1',
        resourceType: 'generic',
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

  it('should refresh resources on re-connect', function () {
    const store = this.mockStore({
      ddp: {
        resources: {
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
        type: DDP_RESOURCE_REFRESH,
        meta: {
          resourceId: '1',
          resourceType: 'generic',
        },
      },
      {
        type: FETCH_RESOURCE,
        payload: {
          name: 'aQuery',
          params: [1, 2, 3],
        },
        meta: {
          resourceId: '1',
          socketId: 'socket/1',
        },
      },
    ]);
  });

  it('should dispatch FETCH_RESOURCE on DDP_RESOURCE_REFRESH', function () {
    const store = this.mockStore({
      ddp: {
        resources: {
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
      type: DDP_RESOURCE_REFRESH,
      meta: {
        resourceId: '1',
        resourceType: 'generic',
      },
    };
    store.dispatch(action);
    store.getActions().should.deep.equal([
      action,
      {
        type: FETCH_RESOURCE,
        payload: {
          name: 'aQuery',
          params: [1, 2, 3],
        },
        meta: {
          resourceId: '1',
          socketId: 'socket/1',
        },
      },
    ]);
  });

  it('should not dispatch FETCH_RESOURCE on DDP_RESOURCE_REFRESH if resource has no users', function () {
    const store = this.mockStore({
      ddp: {
        resources: {
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
      type: DDP_RESOURCE_REFRESH,
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
