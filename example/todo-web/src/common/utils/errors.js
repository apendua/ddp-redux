import flatten from 'flat';

const getErrorMessage = (message) => {
  if (typeof message === 'string') {
    return message;
  }
  if (Array.isArray(message)) {
    return getErrorMessage(message[0]);
  }
  if (typeof message === 'object') {
    const key = Object.keys(message)[0];
    return getErrorMessage(message[key]);
  }
  return 'Unrecognized error';
};

export const makeSchemaValidator = (schema, ValidationError) => {
  if (!schema) {
    return () => {};
  }
  return (value) => {
    const error = schema.getErrors(value);
    if (error) {
      const errors = [];
      const described = schema.describe(error);
      const reason = getErrorMessage(described);
      if (typeof described === 'object') {
        const fields = flatten(described);
        Object.keys(fields).forEach((name) => {
          errors.push({
            name,
            type: fields[name],
          });
        });
      }
      throw new ValidationError(errors, reason);
    }
  };
};
