import React from 'react';
import PropTypes from 'prop-types';
import DDPClient from 'ddp-client';
import {
  withContext,
} from 'recompose';
import Router from '../routes/Router';

const App = withContext({
  ddpClient: PropTypes.instanceOf(DDPClient),
}, ({
  ddpClient,
}) => ({
  ddpClient,
}))(() => (
  <Router />
));

export default App;
