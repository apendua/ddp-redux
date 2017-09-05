import DDPEmitter from '../../DDPEmitter';

export class DDPClient extends DDPEmitter {
  getQueryCleanupTimeout() {
    return this.constructor.getQueryCleanupTimeout();
  }

  getDefaultSocketId() {
    return '1';
  }

  static getQueryCleanupTimeout() {
    return 1000;
  }
}
