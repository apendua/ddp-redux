import { makeSchemaValidator } from './errors.js';

class ApiSpec {
  constructor(options) {
    Object.assign(this, options);
    if (!this.name) {
      throw new Error('Api spec requires name');
    }
  }

  getName() {
    return this.name;
  }

  withParams(params) {
    if (this.schema) {
      try {
        this.schema.validate(params); // this may throw an error!
      } catch (err) {
        console.error(err);
        console.error('GOT', params);
        throw err;
      }
    }
    return {
      name: this.getName(),
      params: params !== undefined ? [params] : [],
    };
  }

  getValidator(ValidationError) {
    return makeSchemaValidator(this.schema, ValidationError);
  }

  callMethod(params, { client, ValidationError }) {
    const validator = this.getValidator(ValidationError);
    return Promise.resolve()
      .then(() => validator(params))
      .then(() => client.apply(this.name, [params]));
  }
}

export default ApiSpec;
