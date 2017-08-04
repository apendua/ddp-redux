import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import {
  setDateOnInsert,
  setUserOnInsert,
  setDateOnUpdate,
  setUserOnUpdate,
} from './autoValue.js';

const CreatedUpdatedSchema = new SimpleSchema({

  createdAt: { type: Date, autoValue: setDateOnInsert },
  createdBy: { type: String, optional: true, regEx: SimpleSchema.RegEx.Id, autoValue: setUserOnInsert },

  updatedAt: { type: Date, optional: true, autoValue: setDateOnUpdate },
  updatedBy: { type: String, optional: true, regEx: SimpleSchema.RegEx.Id, autoValue: setUserOnUpdate },

});

export default CreatedUpdatedSchema;
