import DDPEmitter from '../../DDPEmitter';

export class DDPClient extends DDPEmitter {
  getQueryCleanupTimeout() {
    return this.constructor.getQueryCleanupTimeout();
  }

  nextUniqueId() {
    return this.constructor.defaultUniqueId;
  }

  static getQueryCleanupTimeout() {
    return 1000;
  }
}

DDPClient.defaultUniqueId = '1';
