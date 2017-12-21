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
import Input from 'antd/lib/input';
import Checkbox from 'antd/lib/checkbox';
import Button from 'antd/lib/button';
import ddp from 'ddp-connector';
import {
  insert,
  update,
  // remove,
  todosInList,
} from '../common/api/Todos';
import {
  oneList,
} from '../common/api/TodoLists';
import Todo from '../common/models/Todo';
import TodoList from '../common/models/TodoList';
import Loader from '../components/Loader';

const ListItem = withHandlers({
  onChange: ({
    todo,
    onUpdate,
  }) => event => onUpdate({
    todoId: todo._id,
    done: !!event.target.checked,
    name: todo.getName(),
  }),
})(({
  todo,
  onChange,
}) => (
  <li
    key={todo._id}
  >
    <Checkbox
      checked={todo.isDone()}
      onChange={onChange}
      style={{
        ...todo.isDone() && { textDecoration: 'line-through' },
      }}
    >
      {todo.name}
    </Checkbox>
  </li>
));

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
    selectors: ({
      prop,
      from,
    }) => ({
      list: from(TodoList).select.one('listId'),
      todos: from(Todo).select.where(
        createSelector(
          prop('listId'),
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
  <div className="container">
    <Link to="/lists/">&lt; Back</Link>
    <h1>{list && list.getTitle()}</h1>
    <ul>
      {todos.map(todo => (
        <ListItem key={todo._id} todo={todo} onUpdate={onUpdateTodo} />
      ))}
      <li>
        <Input
          onChange={onChangeName}
          value={name}
          placeholder="Please enter item description"
        />
      </li>
    </ul>
    <p style={{ textAlign: 'right' }}>
      <Button
        onClick={onAddTodo}
        type="primary"
      >
        Add
      </Button>
    </p>
  </div>
));

export default List;
