import Schema from '../utils/Schema.js';
import ApiSpec from '../utils/ApiSpec.js';

export const insert = new ApiSpec({
  name: 'api.TodoLists.insert',
  schema: new Schema({
    title:  { type: String },
  }),
});

export const update = new ApiSpec({
  name: 'api.TodoLists.update',
  schema: new Schema({
    listId: { type: String, regEx: Schema.RegEx.Id },
    title:  { type: String, optional: true },
  }),
});

export const remove = new ApiSpec({
  name: 'api.TodoLists.remove',
  schema: new Schema({
    listId: { type: String, regEx: Schema.RegEx.Id },
  }),
});

export const allLists = new ApiSpec({
  name: 'api.TodoLists.allLists',
  schema: new Schema(),
});

export const oneList = new ApiSpec({
  name: 'api.TodoLists.oneList',
  schema: new Schema({
    listId: { type: String, regEx: Schema.RegEx.Id },
  }),
});
