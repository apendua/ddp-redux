/* eslint no-underscore-dangle: "off" */
import React from 'react';
import { Link } from 'react-router-dom';
import {
  createStructuredSelector,
} from 'reselect';
import { connect } from 'react-redux';
import {
  compose,
  withState,
  withHandlers,
} from 'recompose';
import {
  callMethod,
} from 'ddp-client/lib/actions';
import ddp from '../common/ddp-connector';
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
    models: [
      TodoList,
    ],
    selectors: ({
      TodoLists,
    }) => ({
      lists: TodoLists.find(),
    }),
    loader: Loader,
  }),
  connect(
    null,
    (dispatch, { title, setTitle }) => ({
      onAddList: () =>
        dispatch(callMethod(insert.name, [{ title }]))
          .then(() => setTitle('')),
    }),
  ),
  withHandlers({
    onChangeTitle: ({
      setTitle,
    }) => e => setTitle(e.currentTarget.value),
  }),
)(({
  lists,
  title,
  onAddList,
  onChangeTitle,
}) => (
  <div>
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
