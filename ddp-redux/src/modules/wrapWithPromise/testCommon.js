import DDPEmitter from '../../DDPEmitter';

export class DDPClient extends DDPEmitter {
  nextUniqueId() {
    return '1';
  }

  cleanError(error) {
    if (!error) {
      return null;
    }
    if (typeof error === 'string') {
      return new Error(error);
    }
    return new Error(error.error);
  }
}
