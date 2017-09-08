import React from 'react';
import PropTypes from 'prop-types';
import { Provider } from 'react-redux';
import Router from '../routes/Router';

const App = ({ store }) => (
  <Provider store={store}>
    <Router />
  </Provider>
);

App.propTypes = {
  store: PropTypes.object.isRequired,
};

export default App;
