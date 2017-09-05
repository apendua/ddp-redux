import DDPEmitter from '../../DDPEmitter';

export class DDPClient {
  constructor() {
    this.socket = new DDPEmitter();
  }
  
  getDefaultSocketId() {
    return '1';
  }

  getSubscriptionCleanupTimeout() {
    return this.constructor.getSubscriptionCleanupTimeout();
  }

  static getSubscriptionCleanupTimeout() {
    return 1000;
  }
}
