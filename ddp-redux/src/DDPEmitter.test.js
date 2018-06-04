/* eslint-env jest */

import DDPEmitter from './DDPEmitter';

describe('Test DDPEmitter', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  beforeEach(() => {
    testContext.emitter = new DDPEmitter();
    testContext.m1 = jest.fn();
    testContext.m2 = jest.fn();
    testContext.m3 = jest.fn();
    testContext.emitter.on('m1', testContext.m1);
    testContext.emitter.on('m2', testContext.m2);
    testContext.emitter.on('m2', testContext.m3);
  });

  test('should not do anyghing there are no listeners', () => {
    testContext.emitter.emit('mx');
    expect(testContext.m1).not.toBeCalled();
    expect(testContext.m2).not.toBeCalled();
    expect(testContext.m3).not.toBeCalled();
  });

  test('should trigger one listener', () => {
    testContext.emitter.emit('m1');
    expect(testContext.m1).toBeCalled();
    expect(testContext.m2).not.toBeCalled();
    expect(testContext.m3).not.toBeCalled();
  });

  test('should trigger two listeners', () => {
    testContext.emitter.emit('m2');
    expect(testContext.m1).not.toBeCalled();
    expect(testContext.m2).toBeCalled();
    expect(testContext.m3).toBeCalled();
  });
});
