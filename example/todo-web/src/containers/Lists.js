/* eslint no-underscore-dangle: "off" */
import React from 'react';
import { Link } from 'react-router-dom';
import {
  compose,
  withState,
  withHandlers,
} from 'recompose';
import {
  callMethod,
} from 'ddp-redux/lib/actions';
import ddp from 'ddp-connector';
import {
  logout,
} from 'ddp-redux';
import {
  insert,
  allLists,
} from '../common/api/TodoLists';
import Loader from '../components/Loader';
import TodoList from '../common/models/TodoList';

const Lists = compose(
  withState('title', 'setTitle', ''),
  ddp({
    subscriptions: [
      allLists.withParams(),
    ],
    selectors: ({
      from,
    }) => ({
      lists: from(TodoList).select.all(),
    }),
    loader: Loader,
  }),
  withHandlers({
    onLogout: ({ dispatch }) => () => dispatch(logout()),
    onAddList: ({
      title,
      setTitle,
      dispatch,
    }) => () =>
      dispatch(callMethod(insert.name, [{ title }]))
        .then(() => setTitle('')),    
    onChangeTitle: ({
      setTitle,
    }) => e => setTitle(e.currentTarget.value),
  }),
)(({
  lists,
  title,
  onLogout,
  onAddList,
  onChangeTitle,
}) => (
  <div>
    <button onClick={onLogout}>Logout</button>
    <ul>
      {lists.map(list => (
        <li key={list._id}>
          <Link to={`/lists/${list._id}`}>
            {list.title}
          </Link>
        </li>
      ))}
      <li>
        <input value={title} onChange={onChangeTitle} />
        <button onClick={onAddList}>
          Add list
        </button>
      </li>
    </ul>
  </div>
));

export default Lists;
