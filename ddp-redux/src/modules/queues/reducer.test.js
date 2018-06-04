/* eslint-env jest */

import {
  queueReducer,
  // createReducer,
} from './reducer';
import {
  DDP_ENQUEUE,
  DDP_QUEUE_RESET,
} from '../../constants';

describe('Test module - queues - reducer', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  describe('queueReducer', () => {
    beforeEach(() => {
      testContext.reducer = queueReducer;
    });

    test('should initialize state', () => {
      expect(testContext.reducer(undefined, {
        type: 'action',
        meta: {
          queue: {},
        },
      })).toEqual({
        pending: {},
        elements: [],
      });
    });

    test('should enqueue element if queue is empty', () => {
      expect(testContext.reducer({
        elements: [],
        pending: {},
      }, {
        type: DDP_ENQUEUE,
        payload: {},
        meta: {
          type: 'action',
          queue: {
            priority: 0,
          },
        },
      })).toEqual({
        pending: {},
        elements: [{
          type: 'action',
          meta: {
            queue: {
              priority: 0,
            },
          },
          payload: {},
        }],
      });
    });

    test('should reset pending on DDP_QUEUE_RESET', () => {
      expect(testContext.reducer({
        elements: [],
        pending: {
          1: 1,
        },
      }, {
        type: DDP_QUEUE_RESET,
      })).toEqual({
        elements: [],
        pending: {},
      });
    });

    test(
      'should enqueue element at the end of queue if priority is lower',
      () => {
        expect(testContext.reducer({
          elements: [{
            type: 'action',
            payload: 1,
            meta: {
              queue: {
                priority: 10,
              },
            },
          }],
          pending: {},
        }, {
          type: DDP_ENQUEUE,
          payload: 2,
          meta: {
            type: 'action',
            queue: {
              priority: 5,
            },
          },
        })).toEqual({
          pending: {},
          elements: [{
            type: 'action',
            payload: 1,
            meta: {
              queue: {
                priority: 10,
              },
            },
          }, {
            type: 'action',
            payload: 2,
            meta: {
              queue: {
                priority: 5,
              },
            },
          }],
        });
      }
    );
  
    test(
      'should enqueue element at the beginning of queue if priority is higher',
      () => {
        expect(testContext.reducer({
          elements: [{
            type: 'action',
            meta: {
              queue: {
                priority: 10,
              },
            },
            payload: 1,
          }],
          pending: {},
        }, {
          type: DDP_ENQUEUE,
          payload: 2,
          meta: {
            type: 'action',
            queue: {
              priority: 15,
            },
          },
        })).toEqual({
          pending: {},
          elements: [{
            type: 'action',
            meta: {
              queue: {
                priority: 15,
              },
            },
            payload: 2,
          }, {
            type: 'action',
            meta: {
              queue: {
                priority: 10,
              },
            },
            payload: 1,
          }],
        });
      }
    );
  
    test('should enqueue element in the middle of the queue', () => {
      expect(testContext.reducer({
        elements: [{
          type: 'action',
          meta: {
            queue: {
              priority: 20,
            },
          },
          payload: 1,
        }, {
          type: 'action',
          meta: {
            queue: {
              priority: 10,
            },
          },
          payload: 2,
        }],
        pending: {},
      }, {
        type: DDP_ENQUEUE,
        payload: 3,
        meta: {
          type: 'action',
          queue: {
            priority: 15,
          },
        },
      })).toEqual({
        pending: {},
        elements: [{
          type: 'action',
          meta: {
            queue: {
              priority: 20,
            },
          },
          payload: 1,
        }, {
          type: 'action',
          meta: {
            queue: {
              priority: 15,
            },
          },
          payload: 3,
        }, {
          type: 'action',
          meta: {
            queue: {
              priority: 10,
            },
          },
          payload: 2,
        }],
      });
    });

    test('should remove element from queue when action is emited', () => {
      const action = {
        type: 'action',
        payload: {
          id: '1',
        },
        meta: {
          queue: {
            priority: 0,
            pendingValue: 0,
            elementId: '1',
          },
        },
      };
      expect(testContext.reducer({
        elements: [{
          type: 'action',
          payload: action.payload,
          meta: action.meta,
        }],
        pending: {},
      }, action)).toEqual({
        pending: {
          1: 0,
        },
        elements: [],
      });
    });

    test(
      'should remove pending item on action with resolve === true',
      () => {
        const action = {
          type: 'action',
          payload: {
            id: '1',
          },
          meta: {
            queue: {
              resolve: true,
              elementId: '1',
            },
          },
        };
        expect(testContext.reducer({
          elements: [],
          pending: {
            1: 0,
            2: 0,
          },
        }, action)).toEqual({
          pending: {
            2: 0,
          },
          elements: [],
        });
      }
    );
  });
});
