import React from 'react';
import {
  Redirect,
  BrowserRouter,
  Switch,
  Route,
} from 'react-router-dom';
import List from '../containers/List';
import Lists from '../containers/Lists';
import Entry from '../containers/Entry';
import NotFound from '../components/NotFound';
import LoggedInRoute from '../containers/LoggedInRoute';

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
      <Route path="/entry" exact component={Entry} />
      <LoggedInRoute path="/lists" exact component={Lists} />
      <LoggedInRoute path="/lists/:listId" component={List} />
      <Route component={NotFound} />
    </Switch>
  </BrowserRouter>
);

export default Router;
