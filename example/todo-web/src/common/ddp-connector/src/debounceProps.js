import React from 'react';
import forEach from 'lodash/forEach';
import {
  wrapDisplayName,
  setDisplayName,
} from 'recompose';

/**
 * @param {String} name - name of the property to debounce
 * @param {Number} ms - number of ms to ms the property update
 * @returns {HigherOrderComponent}
 */
const debounceProps = (names, {
  ms = 200,
} = {}) => {
  const hoc = (BaseComponent) => {
    /**
     * A component that adds "autosave" function to properties. That function can be called with new changes object
     * and the actual call to "onAutosave" will be postponed by the number of milliseconds given by autosaveDelay.
     */
    class Container extends React.Component {
      constructor(props) {
        super(props);
        const initialState = {};
        forEach(names, (name) => {
          initialState[name] = props[name];
        });
        this.state = initialState;
        this.timeout = null;
      }

      /**
       * Schedule updating component.
       * @private
       */
      componentWillReceiveProps(nextProps) {
        if (this.timeout) {
          clearTimeout(this.timeout);
        }
        this.timeout = setTimeout(this.update.bind(this, nextProps), ms);
      }

      /**
       * Cancel pending timeout.
       * @private
       */
      componentWillUnmount() {
        if (this.timeout) {
          clearTimeout(this.timeout);
        }
        this.timeout = null;
      }

      update(props) {
        const newState = {};
        forEach(names, (name) => {
          newState[name] = props[name];
        });
        this.setState(newState);
        this.timeout = null;
      }

      render() {
        const props = {
          ...this.props,
        };
        forEach(names, (name) => {
          props[name] = this.state[name];
        });
        return <BaseComponent {...props} />;
      }
    }
    return Container;
  };
  if (process.env.NODE_ENV !== 'production') {
    return BaseComponent => setDisplayName(wrapDisplayName(BaseComponent, 'debounceProps'))(hoc(BaseComponent));
  }
  return hoc;
};

export default debounceProps;
