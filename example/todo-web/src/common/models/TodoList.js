import BaseModel from './BaseModel.js';

class TodoList extends BaseModel {
  getTitle() {
    return this.title;
  }
}

TodoList.collection = 'TodoLists';
export default TodoList;
