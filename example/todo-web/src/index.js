/* eslint global-require: "off" */
import {
  persistState,
} from 'redux-devtools';
import {
  compose,
  createStore,
  applyMiddleware,
} from 'redux';
import DDPClient from 'ddp-redux';
import React from 'react';
import ReactDOM from 'react-dom';
import notification from 'antd/lib/notification';
import App from './containers/App';
import registerServiceWorker from './registerServiceWorker';
import rootReducer from './store/rootReducer';
import storage from './storage';
import './index.css';

const ddpClient = new DDPClient({
  endpoint: process.env.REACT_APP_ENDPOINT,
  SocketConstructor: WebSocket,
  storage,
});

ddpClient.onPromise = ((promise) => {
  promise.catch((err) => {
    notification.error({
      message: 'Error',
      description: err.reason || err.message,
    });
  });
});

const enhancer = compose(
  window.__REDUX_DEVTOOLS_EXTENSION__ ? window.__REDUX_DEVTOOLS_EXTENSION__({}) : x => x,
  persistState(
    window.location.href.match(
      /[?&]debug_session=([^&#]+)\b/,
    ),
  ),
);

const store = createStore(
  rootReducer,
  {},
  compose(
    applyMiddleware(
      ddpClient.middleware(),
    ),
    enhancer,
  ),
);

ReactDOM.render(
  <App store={store} ddpClient={ddpClient} />,
  document.getElementById('root'),
);

if (process.env.NODE_ENV !== 'production') {
  if (typeof module !== 'undefined' && module.hot) {
    module.hot.accept('./containers/App', () => {
      const NextApp = require('./containers/App').default;
      ReactDOM.render(
        <NextApp store={store} ddpClient={ddpClient} />,
        document.getElementById('root'),
      );
    });

    module.hot.accept('./store/rootReducer.js', () =>
      store.replaceReducer(require('./store/rootReducer.js').default),
    );
  }
}

registerServiceWorker();
