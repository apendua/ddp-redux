/* eslint no-underscore-dangle: "off" */
import React from 'react';
import {
  compose,
  withState,
  withHandlers,
  lifecycle,
} from 'recompose';
import { Link } from 'react-router-dom';
import {
  callMethod,
} from 'ddp-redux/lib/actions';
import ddp from 'ddp-connector';
import {
  logout,
  queryRefetchAll,
} from 'ddp-redux';
import Input from 'antd/lib/input';
import Button from 'antd/lib/button';
import List from 'antd/lib/list';
import {
  insert,
  allLists,
} from '../common/api/TodoLists';
import {
  getStats,
} from '../common/api/Todos';
import Loader from '../components/Loader';
import TodoList from '../common/models/TodoList';

const Lists = compose(
  lifecycle({
    componentDidMount() {
      const {
        dispatch,
      } = this.props;
      // NOTE: Of course this is suboptimal.
      //       It will be improved after refactoring queries api.
      dispatch(queryRefetchAll());
    },
  }),
  withState('title', 'setTitle', ''),
  ddp({
    subscriptions: [
      allLists.withParams(),
    ],
    queries: [
      getStats.withParams(),
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
  <div className="container">
    <h1>Todo Lists</h1>
    <p>
      <Button icon="logout" size="small" onClick={onLogout}>
        Logout
      </Button>
    </p>
    <List
      dataSource={lists}
      itemLayout="horizontal"
      renderItem={list => (
        <List.Item key={list._id}>
          <List.Item.Meta
            title={
              <Link to={`/lists/${list._id}`}>
                {list.title}
              </Link>
            }
            description={`Active: ${list.active || 0}, completed: ${list.completed || 0}`}
          />
        </List.Item>
      )}
    />
    <p>
      <Input
        onChange={onChangeTitle}
        value={title}
        placeholder="Please enter list title"
      />
    </p>
    <p style={{ textAlign: 'right' }}>
      <Button type="primary" onClick={onAddList}>Create list</Button>
    </p>
  </div>
));

export default Lists;
