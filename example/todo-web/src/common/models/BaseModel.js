import DDPClient from 'ddp-client';

class BaseModel {
  constructor(doc) {
    Object.assign(this, doc);
  }

  static set collection(name) {
    DDPClient.registerModel(this, name);
    this._collection = name;
  }

  static get collection() {
    return this._collection;
  }
}

export default BaseModel;
