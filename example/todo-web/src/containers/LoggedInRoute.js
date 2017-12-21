import React from 'react';
import PropTypes from 'prop-types';
import { Redirect, Route } from 'react-router-dom';
import ddp from 'ddp-connector';

const createLoggedInRoute = ({
  loader,
  redirectTo,
}) => {
  const DecoratedComponent = ddp({
    loader,
    selectors: ({ from, select }) => ({
      currentUser: from('users').select.currentUser(),
      isLoggingIn: select.isLoggingIn(),
    }),
  })(({
    currentUser,
    isLoggingIn,
    component,
    ...props
  }) => {
    if (isLoggingIn) {
      return null;
    }
    if (currentUser) {
      return React.createElement(component, {
        ...props,
        currentUser,
      });
    }
    if (redirectTo) {
      return React.createElement(Redirect, {
        to: {
          pathname: redirectTo,
          state: { from: props.location },
          hash: props.location.hash,
        },
      });
    }
    return null;
  });

  const Container = ({ component, ...rest }) => React.createElement(Route, {
    ...rest,
    render: props => React.createElement(DecoratedComponent, {
      ...props,
      component,
    }),
  });

  Container.propTypes = {
    component: PropTypes.func.isRequired,
  };

  return Container;
};

const LoggedInRoute = createLoggedInRoute({
  redirectTo: '/entry',
});

export { createLoggedInRoute };
export default LoggedInRoute;
