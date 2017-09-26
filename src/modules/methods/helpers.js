
/**
 * Pick fields from metadata object that can potentially
 * be stored at directly the method object in redux store,
 * and vice versa.
 * @param {object} object
 * @returns {object}
 */
export const extractMetadata = (object) => {
  if (!object) {
    return {};
  }
  const {
    queryId,
    socketId,
    entities,
  } = object;
  const result = {};
  if (queryId) {
    result.queryId = queryId;
  }
  if (socketId) {
    result.socketId = socketId;
  }
  if (entities) {
    result.entities = entities;
  }
  return result;
};
