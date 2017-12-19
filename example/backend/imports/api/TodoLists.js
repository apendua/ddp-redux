import TodoLists from '/imports/collections/TodoLists';
import * as api from '/imports/common/api/TodoLists';
import publish from './publish';
import implement from './implement';

implement(api.insert, {
  run({
    title,
  }) {
    return TodoLists.insert({
      title,
      userId: this.userId,
    });
  },
});

implement(api.update, {
  run({
    listId,
    title,
  }) {
    return TodoLists.update({
      _id: listId,
      userId: this.userId,
    }, {
      $set: {
        title,
      },
    });
  },
});

implement(api.remove, {
  run({
    listId,
  }) {
    return TodoLists.remove({
      _id: listId,
      userId: this.userId,
    });
  },
});

publish(api.allLists, {
  run() {
    return TodoLists.find({
      userId: this.userId,
    });
  },
});

publish(api.oneList, {
  run({ listId }) {
    return TodoLists.find({
      _id: listId,
      userId: this.userId,
    });
  },
});

