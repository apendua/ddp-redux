import TodoLists from '/imports/collections/TodoLists';
import * as api from '/imports/common/api/TodoLists';
import publish from './publish';
import implement from './implement';

implement(api.insert, {
  run({
    title,
  }) {
    return TodoLists.insert({ title });
  },
});

implement(api.update, {
  run({
    listId,
    title,
  }) {
    return TodoLists.update({ _id: listId }, {
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
    return TodoLists.remove({ _id: listId });
  },
});

publish(api.allLists, {
  run() {
    return TodoLists.find({});
  },
});

publish(api.oneList, {
  run({ listId }) {
    return TodoLists.find({ _id: listId });
  },
});

