/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import DDPSocket from './DDPSocket';

chai.should();
chai.use(sinonChai);

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
  beforeEach(function () {
    this.socket = new DDPSocket({
      endpoint: 'ws://example.com',
      SocketConstructor: Socket,
    });
    this.onMessage = sinon.spy();
    this.onClose = sinon.spy();
    this.onOpen = sinon.spy();
    this.socket.on('message', this.onMessage);
    this.socket.on('close', this.onClose);
    this.socket.on('open', this.onOpen);
    this.socket.open('ws://example.com');
  });

  it('should trigger onOpen callback', function () {
    this.socket.rawSocket.triggerOpen();
    this.onOpen.should.have.been.called;
  });

  it('should trigger onClose callback', function () {
    this.socket.close();
    this.onClose.should.have.been.called;
  });

  it('should connect to the right endpoint', function () {
    this.socket.rawSocket.endpoint.should.equal('ws://example.com');
  });

  it('should send a stringified DDP message', function () {
    this.socket.send({
      msg: 'connect',
    });
    this.socket.rawSocket.messages.should.have.members([
      '{"msg":"connect"}',
    ]);
  });

  it('should receive a parsed DDP message', function () {
    this.socket.rawSocket.triggerMessage('{"msg":"ping"}');
    this.onMessage.should.have.been.calledWith({ msg: 'ping' });
  });
});
