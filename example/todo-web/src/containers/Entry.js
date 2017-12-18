import React from 'react';
import {
  Form,
  Field,
} from 'react-final-form';
import ddp from 'ddp-connector';
import {
  login,
  createUser,
} from 'ddp-redux';

// const composeValidators = (...validators) =>
//   validators.reudce((a, b) => value => a(value) || b(value))

const required = value => (value ? undefined : 'Value is required');

const Entry = ddp({
  selectors: ({
    current,
  }) => ({
    user: current('users').user(),
  }),
  mutations: {
    onSubmit: ({
      dispatch,
    }) => ({
      email,
      password,
      createNew,
    }) => (createNew
      ? dispatch(createUser({ email, password }))
      : dispatch(login({ email, password }))
    )
  },
})(({
  reset,
  pristine,
  submitting,
  onSubmit,
}) => (
  <Form
    onSubmit={onSubmit}
    render={({ handleSubmit }) => (
      <form onSubmit={handleSubmit}>
        <Field name="email" validate={required}>
          {({ input, meta }) => (
            <div>
              <label>Email</label>
              <input {...input} type="email" placeholder="Email" />
              {meta.error && meta.touched && <span>{meta.error}</span>}
            </div>
          )}
        </Field>
        <Field name="password" validate={required}>
          {({ input, meta }) => (
            <div>
              <label>Password</label>
              <input {...input} type="password" placeholder="Password" />
              {meta.error && meta.touched && <span>{meta.error}</span>}
            </div>
          )}
        </Field>    
        <Field name="createNew" validate={required}>
          {({ input, meta }) => (
            <div>
              <label>Create new account?</label>
              <input {...input} type="checkbox" />
              {meta.error && meta.touched && <span>{meta.error}</span>}
            </div>
          )}
        </Field>
        <div>
          <button
            type="submit"
            disabled={submitting}
          >
            Submit
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={submitting || pristine}
          >
            Reset
          </button>
        </div>
      </form>
    )}
  />
));

export default Entry;
