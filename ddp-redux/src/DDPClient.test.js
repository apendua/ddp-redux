/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import configureStore from 'redux-mock-store';
import DDPClient from './DDPClient';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('Test DDPClient', () => {
  beforeEach(function () {
    this.ddpClient = new DDPClient();
  });

  describe('Given I have a ddp middleware', () => {
    beforeEach(function () {
      this.middleware = this.ddpClient.middleware();
      this.mockStore = configureStore([
        this.middleware,
      ]);
    });

    it('should accept function as an action', function () {
      const store = this.mockStore();
      store.dispatch((dispatch) => {
        dispatch({
          type: 'test_action',
        });
      });
      store.getActions().should.have.deep.members([
        { type: 'test_action' },
      ]);
    });
  });

  it('should be ok', function () {
    this.ddpClient.should.be.ok;
  });
});
