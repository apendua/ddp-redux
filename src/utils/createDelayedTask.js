const constant = x => () => x;

/**
 * Create a function that will be executed with some delay
 * and can be canceled in the meatime.
 * @param {function} execute
 * @param {object} options
 * @param {function} options.getTimeout
 * @returns {function}
 */
const createDelayedTask = (execute, {
  getTimeout = constant(1000),
} = {}) => {
  const timeouts = {};
  /**
   * Scheudle task for the given element.
   * @param {string} id
   */
  const schedule = (id) => {
    if (timeouts[id]) {
      clearTimeout(timeouts[id]);
    }
    timeouts[id] = setTimeout(() => {
      execute(id);
      delete timeouts[id];
    }, getTimeout(id));
  };
  /**
   * Cancel task for the given element.
   * @param {string} id
   */
  const cancel = (id) => {
    if (timeouts[id]) {
      clearTimeout(timeouts[id]);
      delete timeouts[id];
    }
  };

  schedule.cancel = cancel;
  return schedule;
};

export default createDelayedTask;
