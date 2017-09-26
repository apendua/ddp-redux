import DDPEmitter from '../../DDPEmitter';
import {
  DEFAULT_SOCKET_ID,
} from '../../constants';

export class DDPClient extends DDPEmitter {
  constructor() {
    super();
    this.sockets = {};
  }

  nextUniqueId() {
    return this.constructor.defaultUniqueId;
  }

  open(endpoint, { socketId = DEFAULT_SOCKET_ID } = {}) {
    this.sockets[socketId] = {
      endpoint,
    };
  }

  close({ socketId = DEFAULT_SOCKET_ID } = {}) {
    delete this.sockets[socketId];
  }
}

DDPClient.defaultUniqueId = '1';
