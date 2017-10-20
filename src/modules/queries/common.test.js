import DDPEmitter from '../../DDPEmitter';

export class DDPClient extends DDPEmitter {
  getQueryCleanupTimeout() {
    return this.constructor.getQueryCleanupTimeout();
  }

  nextUniqueId() {
    return this.constructor.defaultUniqueId;
  }

  extractEntities(result) {
    return this.constructor.extractEntities(result);
  }

  static getQueryCleanupTimeout() {
    return 1000;
  }

  static extractEntities(result) {
    return result.entities;
  }
}

DDPClient.defaultUniqueId = '1';
