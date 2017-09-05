import DDPEmitter from '../../DDPEmitter';

export class DDPClient extends DDPEmitter {
  getQueryCleanupTimeout() {
    return this.constructor.getQueryCleanupTimeout();
  }

  static getQueryCleanupTimeout() {
    return 1000;
  }
}
