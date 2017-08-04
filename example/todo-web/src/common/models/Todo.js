import BaseModel from './BaseModel.js';

class Todo extends BaseModel {
  isDone() {
    return !!this.done;
  }
  getName() {
    return this.name;
  }
  getListId() {
    return this.listId;
  }
}

Todo.collection = 'Todos';
export default Todo;
