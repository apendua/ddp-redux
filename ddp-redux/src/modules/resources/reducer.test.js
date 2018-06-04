/* eslint-env jest */
/* eslint no-invalid-this: "off" */

import {
  createReducer,
} from './reducer';
import {
  DDP_RESOURCE_CREATE,
  DDP_RESOURCE_DELETE,
  DDP_RESOURCE_UPDATE,

  DDP_RESOURCE_DEPRECATE,
  DDP_RESOURCE_REQUEST,
  DDP_RESOURCE_RELEASE,
  DDP_RESOURCE_FETCH,

  DDP_STATE__INITIAL,
  DDP_STATE__PENDING,
  DDP_STATE__CANCELED,
  DDP_STATE__READY,
  DDP_STATE__OBSOLETE,
  DDP_STATE__RESTORING,
  DDP_DISCONNECTED,
} from '../../constants';

describe('Test module - resources - reducer', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  beforeEach(() => {
    testContext.reducer = createReducer();
  });

  test('should initialize state', () => {
    expect(testContext.reducer(undefined, {})).toEqual({});
  });

  test('should increase number of resource users', () => {
    expect(testContext.reducer({
      1: {
        name: 'A',
      },
    }, {
      type: DDP_RESOURCE_REQUEST,
      meta: {
        resourceId: '1',
      },
    })).toEqual({
      1: {
        name: 'A',
        users: 1,
      },
    });
  });

  test('should decrease number of resource users', () => {
    expect(testContext.reducer({
      1: {
        name: 'A',
        users: 1,
      },
    }, {
      type: DDP_RESOURCE_RELEASE,
      meta: {
        resourceId: '1',
      },
    })).toEqual({
      1: {
        name: 'A',
        users: 0,
      },
    });
  });

  test(
    'should not change resource state on DDP_RESOURCE_DEPRECATE if number of users is positive',
    () => {
      expect(testContext.reducer({
        1: {
          name: 'A',
          users: 1,
        },
      }, {
        type: DDP_RESOURCE_DEPRECATE,
        meta: {
          resourceId: '1',
        },
      })).toEqual({
        1: {
          name: 'A',
          users: 1,
        },
      });
    }
  );

  test(
    'should change state to "obsolete" on DDP_RESOURCE_DEPRECATE if there are no users',
    () => {
      expect(testContext.reducer({
        1: {
          name: 'A',
        },
      }, {
        type: DDP_RESOURCE_DEPRECATE,
        meta: {
          resourceId: '1',
        },
      })).toEqual({
        1: {
          name: 'A',
          state: DDP_STATE__OBSOLETE,
        },
      });
    }
  );

  [
    {
      from: DDP_STATE__READY,
      to: DDP_STATE__RESTORING,
    },
    {
      from: DDP_STATE__INITIAL,
      to: DDP_STATE__PENDING,
    },
  ].forEach(({ from, to }) => test(
    `should change resource state from ${from} to ${to} on DDP_RESOURCE_FETCH with no payload`,
    () => {
      expect(testContext.reducer({
        1: {
          state: from,
          name: 'A',
        },
      }, {
        type: DDP_RESOURCE_FETCH,
        meta: {
          resourceId: '1',
        },
      })).toEqual({
        1: {
          name: 'A',
          state: to,
        },
      });
    }
  ));

  [
    {
      from: DDP_STATE__READY,
      to: DDP_STATE__OBSOLETE,
    },
    {
      from: DDP_STATE__PENDING,
      to: DDP_STATE__CANCELED,
    },
    {
      from: DDP_STATE__RESTORING,
      to: DDP_STATE__OBSOLETE,
    },
    // no changes for these states ...
    { from: DDP_STATE__INITIAL },
    { from: DDP_STATE__CANCELED },
    { from: DDP_STATE__OBSOLETE },
  ].forEach(({ from, to = from }) => test(
    `should change state from ${from} to ${to} on DDP_DISCONNECTED`,
    () => {
      expect(testContext.reducer({
        1: {
          state: from,
          name: 'A',
        },
      }, {
        type: DDP_DISCONNECTED,
        meta: {
          resourceId: '1',
        },
      })).toEqual({
        1: {
          name: 'A',
          state: to,
        },
      });
    }
  ));

  test('should delete one resource', () => {
    expect(testContext.reducer({
      1: {
        name: 'A',
      },
      2: {
        name: 'B',
      },
    }, {
      type: DDP_RESOURCE_DELETE,
      meta: {
        resourceId: '2',
      },
    })).toEqual({
      1: {
        name: 'A',
      },
    });
  });

  test('should create a new resource', () => {
    expect(testContext.reducer({
      1: {
        name: 'A',
      },
    }, {
      type: DDP_RESOURCE_CREATE,
      payload: {
        name: 'B',
        params: 1,
        properties: {
          socketId: 'socket/1',
        },
      },
      meta: {
        resourceId: '2',
      },
    })).toEqual({
      1: {
        name: 'A',
      },
      2: {
        id: '2',
        name: 'B',
        params: 1,
        state: DDP_STATE__INITIAL,
        properties: {
          socketId: 'socket/1',
        },
      },
    });
  });

  test('should switch resource state from "initial" to "pending"', () => {
    expect(testContext.reducer({
      1: {
        id: '1',
        state: DDP_STATE__INITIAL,
      },
    }, {
      type: DDP_RESOURCE_FETCH,
      payload: {
      },
      meta: {
        resourceId: '1',
      },
    })).toEqual({
      1: {
        id: '1',
        state: DDP_STATE__PENDING,
      },
    });
  });

  test('should update an existing resource', () => {
    expect(testContext.reducer({
      1: {
        name: 'A',
      },
    }, {
      type: DDP_RESOURCE_UPDATE,
      payload: {
        result: { success: true },
        entities: {
          col1: {
            1: { id: '1' },
            2: { id: '2' },
          },
        },
      },
      meta: {
        resourceId: '1',
      },
    })).toEqual({
      1: {
        name: 'A',
        state: DDP_STATE__READY,
        result: { success: true },
        entities: {
          col1: {
            1: { id: '1' },
            2: { id: '2' },
          },
        },
      },
    });
  });

  test('should store result on DDP_RESOURCE_UPDATE', () => {
    expect(testContext.reducer({
      1: {
        name: 'A',
      },
    }, {
      type: DDP_RESOURCE_UPDATE,
      payload: {
        result: 123,
      },
      meta: {
        resourceId: '1',
      },
    })).toEqual({
      1: {
        name: 'A',
        result: 123,
        state: DDP_STATE__READY,
      },
    });
  });

  test('should store error on DDP_RESOURCE_UPDATE', () => {
    expect(testContext.reducer({
      1: {
        name: 'A',
      },
    }, {
      type: DDP_RESOURCE_UPDATE,
      payload: {
        error: {
          error: 'Error',
        },
      },
      meta: {
        resourceId: '1',
      },
    })).toEqual({
      1: {
        name: 'A',
        error: {
          error: 'Error',
        },
        state: DDP_STATE__CANCELED,
      },
    });
  });
});
