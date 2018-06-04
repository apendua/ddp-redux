/* eslint-env jest */
/* eslint no-invalid-this: "off" */

import { createReducer } from './reducer';
import {
  DDP_ENQUEUE,
  DDP_METHOD,

  DDP_QUERY_CREATE,
  DDP_QUERY_DELETE,
  DDP_QUERY_UPDATE,

  DDP_QUERY_REFETCH,
  DDP_QUERY_REQUEST,
  DDP_QUERY_RELEASE,

  DDP_STATE__QUEUED,
  DDP_STATE__INITIAL,
  DDP_STATE__PENDING,
  DDP_STATE__CANCELED,
  DDP_STATE__READY,
  DDP_STATE__OBSOLETE,
  DDP_STATE__RESTORING,
  DDP_DISCONNECTED,
} from '../../constants';
import { DDPClient } from './testCommon';

describe('Test module - queries - reducer', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  beforeEach(() => {
    testContext.reducer = createReducer(DDPClient);
  });

  test('should initialize state', () => {
    expect(testContext.reducer(undefined, {})).toEqual({});
  });

  test('should increase number of query users', () => {
    expect(testContext.reducer({
      1: {
        name: 'A',
      },
    }, {
      type: DDP_QUERY_REQUEST,
      meta: {
        queryId: '1',
      },
    })).toEqual({
      1: {
        name: 'A',
        users: 1,
      },
    });
  });

  test('should decrease number of query users', () => {
    expect(testContext.reducer({
      1: {
        name: 'A',
        users: 1,
      },
    }, {
      type: DDP_QUERY_RELEASE,
      meta: {
        queryId: '1',
      },
    })).toEqual({
      1: {
        name: 'A',
        users: 0,
      },
    });
  });

  test(
    'should not change query state on DDP_REFETCH if number of users is positive',
    () => {
      expect(testContext.reducer({
        1: {
          name: 'A',
          users: 1,
        },
      }, {
        type: DDP_QUERY_REFETCH,
        meta: {
          queryId: '1',
        },
      })).toEqual({
        1: {
          name: 'A',
          users: 1,
        },
      });
    },
  );

  test(
    'should change state to "obsolete" on DDP_REFETCH if there are no users',
    () => {
      expect(testContext.reducer({
        1: {
          name: 'A',
        },
      }, {
        type: DDP_QUERY_REFETCH,
        meta: {
          queryId: '1',
        },
      })).toEqual({
        1: {
          name: 'A',
          state: DDP_STATE__OBSOLETE,
        },
      });
    },
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
    {
      from: DDP_STATE__QUEUED,
      to: DDP_STATE__PENDING,
    },
  ].forEach(({ from, to }) => test(
    `should change query state from ${from} to ${to} on DDP_QUERY_UPDATE with no payload`,
    () => {
      expect(testContext.reducer({
        1: {
          state: from,
          name: 'A',
        },
      }, {
        type: DDP_QUERY_UPDATE,
        meta: {
          queryId: '1',
        },
      })).toEqual({
        1: {
          name: 'A',
          state: to,
        },
      });
    },
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
    { from: DDP_STATE__QUEUED },
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
          queryId: '1',
        },
      })).toEqual({
        1: {
          name: 'A',
          state: to,
        },
      });
    },
  ));

  test('should delete one query', () => {
    expect(testContext.reducer({
      1: {
        name: 'A',
      },
      2: {
        name: 'B',
      },
    }, {
      type: DDP_QUERY_DELETE,
      meta: {
        queryId: '2',
      },
    })).toEqual({
      1: {
        name: 'A',
      },
    });
  });

  test('should create a new query', () => {
    expect(testContext.reducer({
      1: {
        name: 'A',
      },
    }, {
      type: DDP_QUERY_CREATE,
      payload: {
        name: 'B',
        params: 1,
        properties: {
          socketId: 'socket/1',
        },
      },
      meta: {
        queryId: '2',
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

  test('should switch query state from "initial" to "queued"', () => {
    expect(testContext.reducer({
      1: {
        id: '1',
        state: DDP_STATE__INITIAL,
      },
    }, {
      type: DDP_ENQUEUE,
      payload: {
      },
      meta: {
        type: DDP_METHOD,
        queryId: '1',
      },
    })).toEqual({
      1: {
        id: '1',
        state: DDP_STATE__QUEUED,
      },
    });
  });

  test('should update an existing query', () => {
    expect(testContext.reducer({
      1: {
        name: 'A',
      },
    }, {
      type: DDP_QUERY_UPDATE,
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
        queryId: '1',
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

  test('should store result on DDP_QUERY_UPDATE', () => {
    expect(testContext.reducer({
      1: {
        name: 'A',
      },
    }, {
      type: DDP_QUERY_UPDATE,
      payload: {
        result: 123,
      },
      meta: {
        queryId: '1',
      },
    })).toEqual({
      1: {
        name: 'A',
        result: 123,
        state: DDP_STATE__READY,
      },
    });
  });

  test('should store error on DDP_QUERY_UPDATE', () => {
    expect(testContext.reducer({
      1: {
        name: 'A',
      },
    }, {
      type: DDP_QUERY_UPDATE,
      payload: {
        error: {
          error: 'Error',
        },
      },
      meta: {
        queryId: '1',
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
