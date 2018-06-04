/* eslint-env jest */

import DDPSocket from './DDPSocket';

class Socket {
  constructor(endpoint) {
    this.messages = [];
    this.endpoint = endpoint;
  }

  close() {
    if (this.onclose) {
      this.onclose();
    }
  }

  send(message) {
    this.messages.push(message);
  }

  triggerMessage(message) {
    if (this.onmessage) {
      this.onmessage({ data: message });
    }
  }

  triggerOpen() {
    if (this.onopen) {
      this.onopen();
    }
  }
}

describe('Test DDPSocket', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  beforeEach(() => {
    testContext.socket = new DDPSocket({
      endpoint: 'ws://example.com',
      SocketConstructor: Socket,
    });
    testContext.onMessage = jest.fn();
    testContext.onClose = jest.fn();
    testContext.onOpen = jest.fn();
    testContext.socket.on('message', testContext.onMessage);
    testContext.socket.on('close', testContext.onClose);
    testContext.socket.on('open', testContext.onOpen);
    testContext.socket.open('ws://example.com');
  });

  test('should trigger onOpen callback', () => {
    testContext.socket.rawSocket.triggerOpen();
    expect(testContext.onOpen).toBeCalled();
  });

  test('should trigger onClose callback', () => {
    testContext.socket.close();
    expect(testContext.onClose).toBeCalled();
  });

  test('should connect to the right endpoint', () => {
    expect(testContext.socket.rawSocket.endpoint).toBe('ws://example.com');
  });

  test('should send a stringified DDP message', () => {
    testContext.socket.send({
      msg: 'connect',
    });
    expect(testContext.socket.rawSocket.messages).toEqual(expect.arrayContaining([
      '{"msg":"connect"}',
    ]));
  });

  test('should receive a parsed DDP message', () => {
    testContext.socket.rawSocket.triggerMessage('{"msg":"ping"}');
    expect(testContext.onMessage).toBeCalledWith({ msg: 'ping' });
  });
});
