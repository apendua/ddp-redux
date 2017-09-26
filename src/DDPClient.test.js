/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import DDPClient from './DDPClient';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('Test DDPClient', () => {
  beforeEach(function () {
    this.ddpClient = new DDPClient();
  });

  it('should be ok', function () {
    this.ddpClient.should.be.ok;
  });
});
