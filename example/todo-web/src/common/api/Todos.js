import Schema from '../utils/Schema.js';
import ApiSpec from '../utils/ApiSpec.js';

export const insert = new ApiSpec({
  name: 'api.Todos.insert',
  schema: new Schema({
    listId: { type: String, regEx: Schema.RegEx.Id },
    name:   { type: String },
    done:   { type: Boolean, optional: true },
  }),
});

export const update = new ApiSpec({
  name: 'api.Todos.update',
  schema: new Schema({
    todoId: { type: String, regEx: Schema.RegEx.Id },
    name:   { type: String, optional: true },
    done:   { type: Boolean, optional: true },
  }),
});

export const remove = new ApiSpec({
  name: 'api.Todos.remove',
  schema: new Schema({
    todoId: { type: String, regEx: Schema.RegEx.Id },
  }),
});

export const todosInList = new ApiSpec({
  name: 'api.Todos.todosInList',
  schema: new Schema({
    listId: { type: String, regEx: Schema.RegEx.Id },
  }),
});

export const getStats = new ApiSpec({
  name: 'api.Todos.getStats',
  schema: new Schema(),
});
