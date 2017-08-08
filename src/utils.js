import omit from 'lodash.omit';

export const mutateCollections = (DDPClient, state, collection, id, mutateOne) => {
  const Model = DDPClient.models[collection] || DDPClient.UnknownModel;
  const current = state.ddp.collections[name] &&
                  state.ddp.collections[name][id];
  return {
    ...state,
    collections: {
      ...state.ddp.collection,
      [collection]: !mutateOne
        ? omit(state.collections[collection], [id])
        : {
          ...state.ddp.collections[name],
          [id]: new Model(mutateOne(current)),
        },
    },
  };
};
