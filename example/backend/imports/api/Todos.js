import Todos from '/imports/collections/Todos';
import TodoList from '/imports/common/models/TodoList';
import * as api from '/imports/common/api/Todos';
import publish from './publish';
import implement from './implement';

implement(api.insert, {
  run({
    name,
    done,
    listId,
  }) {
    Todos.insert({
      name,
      done,
      listId,
      userId: this.userId,
    });
  },
});

implement(api.update, {
  run({
    todoId,
    name,
    done,
  }) {
    const mutation = {
      $set: { name },
    };
    if (!done) {
      mutation.$unset = { done: 1 };
    } else {
      mutation.$set.done = true;
    }
    Todos.update({
      _id: todoId,
      userId: this.userId,
    }, mutation);
  },
});

implement(api.remove, {
  run({
    todoId,
  }) {
    Todos.remove({
      _id: todoId,
      userId: this.userId,
    });
  },
});

publish(api.todosInList, {
  run({ listId }) {
    return Todos.find({
      listId,
      userId: this.userId,
    });
  },
});

implement(api.getStats, {
  run() {
    const results = Todos.aggregate([
      { $match: {
        userId: this.userId,
      } },
      { $group: { 
        _id: {
          listId: '$listId',
          state: {
            $cond: {
              if: '$done',
              then: 'completed',
              else: 'active',
            },
          },
        },
        count: { $sum: 1 },
      } },
    ]);
    const byListId = {};
    results.forEach(({ _id: { listId, state }, count }) => {
      if (!byListId[listId]) {
        byListId[listId] = {};
      }
      byListId[listId][state] = count;
    });
    return {
      entities: {
        [TodoList.collection]: byListId,
      },
    };
  },
});
