import DDPEmitter from '../../DDPEmitter';

export class DDPClient extends DDPEmitter {
  nextUniqueId() {
    return this.constructor.defaultUniqueId;
  }
}

DDPClient.defaultUniqueId = '1';
