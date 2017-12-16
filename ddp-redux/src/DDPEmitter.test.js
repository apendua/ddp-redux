/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import DDPEmitter from './DDPEmitter';

chai.should();
chai.use(sinonChai);

describe('Test DDPEmitter', () => {
  beforeEach(function () {
    this.emitter = new DDPEmitter();
    this.m1 = sinon.spy();
    this.m2 = sinon.spy();
    this.m3 = sinon.spy();
    this.emitter.on('m1', this.m1);
    this.emitter.on('m2', this.m2);
    this.emitter.on('m2', this.m3);
  });

  it('should not do anyghing there are no listeners', function () {
    this.emitter.emit('mx');
    this.m1.should.not.be.called;
    this.m2.should.not.be.called;
    this.m3.should.not.be.called;
  });

  it('should trigger one listener', function () {
    this.emitter.emit('m1');
    this.m1.should.be.called;
    this.m2.should.not.be.called;
    this.m3.should.not.be.called;
  });

  it('should trigger two listeners', function () {
    this.emitter.emit('m2');
    this.m1.should.not.be.called;
    this.m2.should.be.called;
    this.m3.should.be.called;
  });
});
