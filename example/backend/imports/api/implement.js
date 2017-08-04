import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { ValidationError } from 'meteor/mdg:validation-error';

function errors(methodOptions) {
  const originalRun = methodOptions.run;
  return {
    ...methodOptions,
    run(...args) {
      this.error = function (error, reason, details) {
        return new Meteor.Error(`${methodOptions.name}.${error}`, reason, details);
      };
      return originalRun.call(this, ...args);
    },
  };
}

const implement = (method, { mixins = [], onServer, ...options } = {}) => {
  const adjustedOptions = { ...options };
  if (onServer) {
    let func = () => {};
    if (Meteor.isServer) {
      func = onServer();
    }
    if (!func) {
      throw new Error(`Invalid method definition, check "onServer" for ${method.getName()}`);
    }
    if (options.run) {
      throw new Error('When "onServer" is provided, "run" is not allowed');
    }
    adjustedOptions.run = function (...args) {
      return func(this, ...args);
    };
  }
  return new ValidatedMethod({
    name: method.getName(),
    validate: method.getValidator(ValidationError),
    mixins: [
      ...mixins,
      errors,
    ],
    ...adjustedOptions,
  });
};

export default implement;
