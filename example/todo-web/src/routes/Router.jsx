import React from 'react';
import {
  Redirect,
  BrowserRouter,
  Switch,
  Route,
} from 'react-router-dom';
import NotFound from '../components/NotFound';

const Router = () => (
  <BrowserRouter>
    <Switch>
      <Route
        exact
        path="/"
        render={({ location }) => (
          <Redirect to={{
            ...location,
            pathname: '/lists',
          }}
          />
        )}
      />
      <Route component={NotFound} />
    </Switch>
  </BrowserRouter>
);

export default Router;
