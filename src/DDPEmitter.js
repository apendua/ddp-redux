import forEach from 'lodash.foreach';

const listeners = new WeakMap();

class DDPEmitter {
  constructor() {
    listeners.set(this, {});
  }

  on(name, callback) {
    const thisListeners = listeners.get(this);
    if (!thisListeners[name]) {
      thisListeners[name] = [];
    }
    thisListeners[name].push(callback);
  }

  emit(name, ...args) {
    forEach(listeners.get(this)[name], callback => callback(...args));
  }
}

export default DDPEmitter;
