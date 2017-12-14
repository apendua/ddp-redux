import React from 'react';
import mapValues from 'lodash/mapValues';
import isArray from 'lodash/isArray';
import createConnector from './src/createConnector';

const identity = x => x;

const ddp = createConnector({
  defaultMapQueries: ({
    queriesOptions,
  }) => (queries) => {
    if (isArray(queries)) {
      return {};
    }
    return mapValues(queries, (query, key) => {
      if (!query) {
        return query;
      }
      const options = queriesOptions && queriesOptions[key];
      const mapResult = (options && options.mapResult) || identity;
      return mapResult(query.result);
    });
  },
  defaultLoader: () => <span>Loading ...</span>,
  defaultDebounceReady: 100,
});

export {
  ddp,
  createConnector,
};
