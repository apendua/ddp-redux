import DDPEmitter from '../../DDPEmitter';

export class DDPClient {
  constructor() {
    this.socket = new DDPEmitter();
  }
}
