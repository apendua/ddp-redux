import chai from 'chai';

const test = {
  isTrue:   chai.assert.isTrue,
  isFalse:  chai.assert.isFalse,
  equal:    chai.assert.deepEqual,
  throws:   chai.assert.throws,
  notEqual: chai.assert.notDeepEqual,
};

class Tinytest {
  constructor() {
    this.tests = [];
  }

  add(name, run) {
    this.tests.push({
      name,
      run,
    });
  }

  buildSuite(it) {
    this.tests.forEach(({ name, run }) => {
      it(name, () => run(test));
    });
  }
}

export default Tinytest;
