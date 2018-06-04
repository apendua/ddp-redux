import DDPEmitter from '../../DDPEmitter';
import { callMethod } from '../../actions';

export class DDPClient extends DDPEmitter {
  getCleanupTimeout() {
    return this.constructor.getQueryCleanupTimeout();
  }

  nextUniqueId() {
    return this.constructor.defaultUniqueId;
  }

  extractEntities(result) {
    return this.constructor.extractEntities(result);
  }

  fetch(...args) {
    return this.constructor.fetch(...args);
  }

  static getQueryCleanupTimeout() {
    return 1000;
  }

  static extractEntities(result) {
    return result.entities;
  }

  static fetch(...args) {
    return callMethod(...args);
  }
}

DDPClient.defaultUniqueId = '1';
