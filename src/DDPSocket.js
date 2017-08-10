import EJSON from './ejson';
import DDPEmitter from './DDPEmitter';

class DDPScoket extends DDPEmitter {
  constructor({
    SocketConstructor,
  }) {
    super();

    this.SocketConstructor = SocketConstructor;
    this.rawSocket = null;
  }

  send(obj) {
    // console.warn('ddp:out', obj);
    this.rawSocket.send(EJSON.stringify(obj));
  }

  open(endpoint) {
    if (this.rawSocket) {
      throw new Error('Socket already opened');
    }
    this.rawSocket = new this.SocketConstructor(endpoint);

    this.rawSocket.onopen = () => {
      this.emit('open');
    };

    this.rawSocket.onclose = () => {
      this.rawSocket = null;
      this.emit('close');
    };

    this.rawSocket.onerror = () => {
      delete this.rawSocket.onclose;
      this.rawSocket.close();
      this.rawSocket = null;
      this.emit('close');
    };

    this.rawSocket.onmessage = (message) => {
      let obj;
      try {
        obj = EJSON.parse(message.data);
      } catch (err) {
        // ignore for now
      }
      // console.warn('ddp:in', obj);
      this.emit('message', obj);
    };
  }

  close() {
    if (this.rawSocket) {
      this.rawSocket.close();
      this.rawSocket = null;
    }
  }
}

export default DDPScoket;
