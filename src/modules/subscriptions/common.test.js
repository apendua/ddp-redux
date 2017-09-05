import DDPEmitter from '../../DDPEmitter';

export class DDPClient {
  constructor() {
    this.socket = new DDPEmitter();
  }

  getSubscriptionCleanupTimeout() {
    return this.constructor.getSubscriptionCleanupTimeout();
  }

  static getSubscriptionCleanupTimeout() {
    return 1000;
  }
}
