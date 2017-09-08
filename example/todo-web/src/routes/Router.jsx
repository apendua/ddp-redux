import React from 'react';
import {
  Redirect,
  BrowserRouter,
  Switch,
  Route,
} from 'react-router-dom';
import List from '../containers/List';
import Lists from '../containers/Lists';
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
      <Route path="/lists" exact component={Lists} />
      <Route path="/lists/:listId" component={List} />
    </Switch>
  </BrowserRouter>
);

export default Router;
