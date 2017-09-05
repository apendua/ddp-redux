import DDPEmitter from '../../DDPEmitter';

export class DDPClient extends DDPEmitter {
  nextUniqueId() {
    return '1';
  }

  getDefaultSocketId() {
    return '1';
  }
}
