import omit from 'lodash.omit';
import {
  DDP_ADDED,
  DDP_CHANGED,
  DDP_REMOVED,
} from '../constants';

export const mutateCollections = (DDPClient, state, collection, id, mutateOne) => {
  const Model = DDPClient.models[collection] || DDPClient.UnknownModel;
  const current = mutateOne &&
                  state.upstream[collection] &&
                  state.upstream[collection][id];
  return {
    ...state,
    upstream: {
      ...state.collection,
      [collection]: !mutateOne
        ? omit(state.upstream[collection], [id])
        : {
          ...state.upstream[collection],
          [id]: new Model(mutateOne(current)),
        },
    },
  };
};

export const createMiddleware = () => () => next => next;

export const createReducer = DDPClient => (state = {
  upstream: {},
}, action) => {
  switch (action.type) {
    case DDP_ADDED:
      return mutateCollections(
        DDPClient,
        state,
        action.payload.collection,
        action.payload.id,
        () => ({
          _id: action.payload.id,
          ...action.payload.fields,
        }),
      );
    case DDP_CHANGED:
      return mutateCollections(
        DDPClient,
        state,
        action.payload.collection,
        action.payload.id,
        current => ({
          ...omit(current, action.payload.cleared),
          ...action.payload.fields,
        }),
      );
    case DDP_REMOVED:
      return mutateCollections(
        DDPClient,
        state,
        action.payload.collection,
        action.payload.id,
        null,
      );
    default:
      return state;
  }
};

