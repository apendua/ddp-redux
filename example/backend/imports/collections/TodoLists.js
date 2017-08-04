import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Mongo } from 'meteor/mongo';
import CreatedUpdatedSchema from '../schema/CreatedUpdatedSchema';
import TodoList from '../common/models/TodoList';

const TodoLists = new Mongo.Collection(TodoList.collection, {
  transform: doc => new TodoList(doc),
});

TodoLists.schema = new SimpleSchema([CreatedUpdatedSchema, {
  title: { type: String },
}]);

TodoLists.attachSchema(TodoLists.schema);

export default TodoLists;
