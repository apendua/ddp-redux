import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Mongo } from 'meteor/mongo';
import CreatedUpdatedSchema from '../schema/CreatedUpdatedSchema';
import Todo from '../common/models/Todo';

const Todos = new Mongo.Collection(Todo.collection, {
  transform: doc => new Todo(doc),
});

Todos.schema = new SimpleSchema([CreatedUpdatedSchema, {
  userId: { type: String, regEx: SimpleSchema.RegEx.Id },
  listId: { type: String, regEx: SimpleSchema.RegEx.Id },
  name:   { type: String },
  done:   { type: Boolean, optional: true },
}]);

Todos.attachSchema(Todos.schema);

export default Todos;
