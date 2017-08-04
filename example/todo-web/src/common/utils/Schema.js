import {
  createSchema,
  presetDefault,
} from 'very-simple-schema';

const Schema = createSchema({
  plugins: [
    ...presetDefault,
  ],
  additionalProperties: false,
  emptyStringsAreMissingValues: true,
});

export default Schema;
