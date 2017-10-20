import DDPEmitter from '../../DDPEmitter';

export class DDPClient {
  constructor() {
    this.socket = new DDPEmitter();
  }

  getSubscriptionCleanupTimeout() {
    return this.constructor.getSubscriptionCleanupTimeout();
  }

  nextUniqueId() {
    return this.constructor.defaultUniqueId;
  }

  static getSubscriptionCleanupTimeout() {
    return 1000;
  }
}

DDPClient.defaultUniqueId = '1';

