/* eslint no-underscore-dangle: "off" */
import React from 'react';
import { Link } from 'react-router-dom';
import {
  createSelector,
} from 'reselect';
import { connect } from 'react-redux';
import {
  compose,
  withState,
  withProps,
  withHandlers,
} from 'recompose';
import {
  callMethod,
} from 'ddp-redux/lib/actions';
import ddp from 'ddp-connector';
import {
  insert,
  update,
  remove,
  todosInList,
} from '../common/api/Todos';
import {
  oneList,
} from '../common/api/TodoLists';
import Todo from '../common/models/Todo';
import TodoList from '../common/models/TodoList';
import Loader from '../components/Loader';

const ListItem = withHandlers({
  onUpdate: ({
    todo,
    onUpdate,
  }) => () => onUpdate({
    todoId: todo._id,
    done: !todo.isDone(),
    name: todo.getName(),
  }),
})(({
  todo,
  onUpdate,
}) => (
  <li
    key={todo._id}
    onClick={onUpdate}
    style={{
      ...todo.isDone() && { textDecoration: 'line-through' },
    }}
  >
    {todo.name}
  </li>
));

const getListId = (state, { listId }) => listId;
const List = compose(
  withState('name', 'setName', ''),
  withProps(({ match: { params: { listId } } }) => ({
    listId,
  })),
  ddp({
    subscriptions: (state, { listId }) => [
      oneList.withParams({ listId }),
      todosInList.withParams({ listId }),
    ],
    models: [
      Todo,
      TodoList,
    ],
    selectors: ({
      Todos,
      TodoLists,
    }) => ({
      list: TodoLists.selectOne(getListId),
      todos: Todos.find(
        createSelector(
          getListId,
          listId => todo => todo.getListId() === listId,
        ),
      ),
    }),
    loader: Loader,
  }),
  connect(
    null,
    (dispatch, {
      name,
      setName,
      listId,
    }) => ({
      onAddTodo: () =>
        dispatch(callMethod(insert.name, [{ listId, name }]))
          .then(() => setName('')),

      onUpdateTodo: ({ todoId, name, done }) =>
        dispatch(callMethod(update.name, [{ todoId, done, name }], {
          entities: {
            [Todo.collection]: {
              [todoId]: {
                done,
                name,
              },
            },
          },
        })),
    }),
  ),
  withHandlers({
    onChangeName: ({
      setName,
    }) => e => setName(e.currentTarget.value),
  }),
)(({
  list,
  todos,
  name,
  onAddTodo,
  onChangeName,
  onUpdateTodo,
}) => (
  <div>
    <Link to="/lists/">Back</Link>
    <h1>{list && list.getTitle()}</h1>
    <ul>
      {todos.map(todo => (
        <ListItem key={todo._id} todo={todo} onUpdate={onUpdateTodo} />
      ))}
      <li>
        <input value={name} onChange={onChangeName} />
        <button onClick={onAddTodo}>
          Add
        </button>
      </li>
    </ul>
  </div>
));

export default List;
