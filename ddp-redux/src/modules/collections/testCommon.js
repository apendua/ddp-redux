import DDPEmitter from '../../DDPEmitter';

export class DDPClient {
  constructor() {
    this.socket = new DDPEmitter();
  }

  getFlushTimeout() {
    return this.constructor.getFlushTimeout();
  }

  static getFlushTimeout() {
    return 200;
  }
}

export class Model1 {
  constructor(doc) {
    Object.assign(this, doc);
  }
}

Model1.indexes = {
  a: {},
  b: {},
};

export class Model2 {
  constructor(doc) {
    Object.assign(this, doc);
  }
}

Model2.indexes = {};

DDPClient.models = {
  col1: Model1,
  col2: Model2,
};
