import { Meteor } from 'meteor/meteor';
import { ValidationError } from 'meteor/mdg:validation-error';

const publish = (apiSpec, { run }) => {
  const name = apiSpec.getName();
  const validate = apiSpec.getValidator(ValidationError);
  Meteor.publish(name, function (params) {
    validate(params);
    return run.call(this, params);
  });
};

export default publish;
