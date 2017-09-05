/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import {
  createReducer,
} from './reducer';
import {
  DDPClient,
} from './common.test';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('Test module - queries - middleware', () => {

});
