import React from 'react';
import {
  Form,
  Field,
} from 'react-final-form';
import AntdForm from 'antd/lib/form';
import Input from 'antd/lib/input';
import Button from 'antd/lib/button';
import Checkbox from 'antd/lib/checkbox';
import { Redirect } from 'react-router-dom';
import ddp from 'ddp-connector';
import {
  loginWithPassword,
  createUser,
} from 'ddp-redux';

// const composeValidators = (...validators) =>
//   validators.reudce((a, b) => value => a(value) || b(value))

const required = value => (value ? undefined : 'Value is required');
const FormItem = AntdForm.Item;

const Entry = ddp({
  selectors: ({
    from,
  }) => ({
    user: from('users').select.currentUser(),
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
      : dispatch(loginWithPassword({ email, password }))
    ),
  },
})(({
  user,
  onSubmit,
}) => (user
  ? <div className="container">
    <Redirect to="/lists" />
  </div>
  : <Form
    onSubmit={onSubmit}
    render={({
      handleSubmit,
      reset,
      values,
      pristine,
      submitting,
    }) => (
      <form onSubmit={handleSubmit} className="container">
        <h1>
          <code>ddp-redux:</code> Todo Lists
        </h1>
        <Field name="email" validate={required}>
          {({ input, meta }) => (
            <FormItem
              label="Email"
              validateStatus={(meta.error && meta.touched && 'error') || ''}
              help={meta.touched && meta.error}
              hasFeedback
            >
              <Input {...input} />
            </FormItem>
          )}
        </Field>
        <Field name="password" validate={required}>
          {({ input, meta }) => (
            <FormItem
              label="Password"
              validateStatus={(meta.error && meta.touched && 'error') || ''}
              help={meta.touched && meta.error}
              hasFeedback
            >
              <Input {...input} type="password" />
            </FormItem>
          )}
        </Field>
        <Field name="createNew">
          {({ input }) => (
            <FormItem>
              <Checkbox {...input}>Create new account?</Checkbox>
            </FormItem>
          )}
        </Field>
        <div>
          <Button
            type="primary"
            htmlType="submit"
            disabled={submitting}
          >
            {values.createNew ? 'Create account' : 'Login'}
          </Button>
          <Button
            htmlType="button"
            onClick={reset}
            disabled={submitting || pristine}
          >
            Reset
          </Button>
        </div>
      </form>
    )}
  />
));

export default Entry;
