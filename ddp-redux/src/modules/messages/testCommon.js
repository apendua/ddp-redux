/* eslint class-methods-use-this: "off" */
import DDPEmitter from '../../DDPEmitter';

export class DDPClient extends DDPEmitter {
  nextUniqueId() {
    return '1';
  }
}
