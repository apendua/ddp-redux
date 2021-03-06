/* eslint-disable */

// Based on Meteor's EJSON implementation: https://github.com/meteor/meteor
//
//    packages/ejson/ejson.js
//    2017-08-08
//
// The MIT License (MIT)
//
// Copyright (c) 2011 - 2017 Meteor Development Group, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import base64 from 'base64-js';
import newBinary from './newBinary.js';
import canonicalStringify from './stringify';

/**
 * @namespace
 * @summary Namespace for EJSON functions
 */
const EJSON = {};

// Custom type interface definition
/**
 * @class CustomType
 * @instanceName customType
 * @memberOf EJSON
 * @summary The interface that a class must satisfy to be able to become an
 * EJSON custom type via EJSON.addType.
 */

/**
 * @function typeName
 * @memberOf EJSON.CustomType
 * @summary Return the tag used to identify this type.  This must match the
 *          tag used to register this type with
 *          [`EJSON.addType`](#ejson_add_type).
 * @locus Anywhere
 * @instance
 */

/**
 * @function toJSONValue
 * @memberOf EJSON.CustomType
 * @summary Serialize this instance into a JSON-compatible value.
 * @locus Anywhere
 * @instance
 */

/**
 * @function clone
 * @memberOf EJSON.CustomType
 * @summary Return a value `r` such that `this.equals(r)` is true, and
 *          modifications to `r` do not affect `this` and vice versa.
 * @locus Anywhere
 * @instance
 */

/**
 * @function equals
 * @memberOf EJSON.CustomType
 * @summary Return `true` if `other` has a value equal to `this`; `false`
 *          otherwise.
 * @locus Anywhere
 * @param {Object} other Another object to compare this to.
 * @instance
 */

const customTypes = {};

const hasOwn = (obj, prop) => ({}).hasOwnProperty.call(obj, prop);

const isArguments = obj => obj != null && hasOwn(obj, 'callee');

const isInfOrNan =
  obj => Number.isNaN(obj) || obj === Infinity || obj === -Infinity;

// Add a custom type, using a method of your choice to get to and
// from a basic JSON-able representation.  The factory argument
// is a function of JSON-able --> your object
// The type you add must have:
// - A toJSONValue() method, so that Meteor can serialize it
// - a typeName() method, to show how to look it up in our type table.
// It is okay if these methods are monkey-patched on.
// EJSON.clone will use toJSONValue and the given factory to produce
// a clone, but you may specify a method clone() that will be
// used instead.
// Similarly, EJSON.equals will use toJSONValue to make comparisons,
// but you may provide a method equals() instead.
/**
 * @summary Add a custom datatype to EJSON.
 * @locus Anywhere
 * @param {String} name A tag for your custom type; must be unique among
 *                      custom data types defined in your project, and must
 *                      match the result of your type's `typeName` method.
 * @param {Function} factory A function that deserializes a JSON-compatible
 *                           value into an instance of your type.  This should
 *                           match the serialization performed by your
 *                           type's `toJSONValue` method.
 */
EJSON.addType = (name, factory) => {
  if (hasOwn(customTypes, name)) {
    throw new Error(`Type ${name} already present`);
  }
  customTypes[name] = factory;
};

const builtinConverters = [
  { // Date
    matchJSONValue(obj) {
      return hasOwn(obj, '$date') && Object.keys(obj).length === 1;
    },
    matchObject(obj) {
      return obj instanceof Date;
    },
    toJSONValue(obj) {
      return {$date: obj.getTime()};
    },
    fromJSONValue(obj) {
      return new Date(obj.$date);
    },
  },
  { // RegExp
    matchJSONValue(obj) {
      return hasOwn(obj, '$regexp')
        && hasOwn(obj, '$flags')
        && Object.keys(obj).length === 2;
    },
    matchObject(obj) {
      return obj instanceof RegExp;
    },
    toJSONValue(regexp) {
      return {
        $regexp: regexp.source,
        $flags: regexp.flags
      };
    },
    fromJSONValue(obj) {
      // Replaces duplicate / invalid flags.
      return new RegExp(
        obj.$regexp,
        obj.$flags
          // Cut off flags at 50 chars to avoid abusing RegExp for DOS.
          .slice(0, 50)
          .replace(/[^gimuy]/g,'')
          .replace(/(.)(?=.*\1)/g, '')
      );
    },
  },
  { // NaN, Inf, -Inf. (These are the only objects with typeof !== 'object'
    // which we match.)
    matchJSONValue(obj) {
      return hasOwn(obj, '$InfNaN') && Object.keys(obj).length === 1;
    },
    matchObject: isInfOrNan,
    toJSONValue(obj) {
      let sign;
      if (Number.isNaN(obj)) {
        sign = 0;
      } else if (obj === Infinity) {
        sign = 1;
      } else {
        sign = -1;
      }
      return {$InfNaN: sign};
    },
    fromJSONValue(obj) {
      return obj.$InfNaN / 0;
    },
  },
  { // Binary
    matchJSONValue(obj) {
      return hasOwn(obj, '$binary') && Object.keys(obj).length === 1;
    },
    matchObject(obj) {
      return typeof Uint8Array !== 'undefined' && obj instanceof Uint8Array
        || (obj && hasOwn(obj, '$Uint8ArrayPolyfill'));
    },
    toJSONValue(obj) {
      return {$binary: base64.toByteArray(obj)};
    },
    fromJSONValue(obj) {
      return base64.fromByteArray(obj.$binary);
    },
  },
  { // Escaping one level
    matchJSONValue(obj) {
      return hasOwn(obj, '$escape') && Object.keys(obj).length === 1;
    },
    matchObject(obj) {
      let match = false;
      if (obj) {
        const keyCount = Object.keys(obj).length;
        if (keyCount === 1 || keyCount === 2) {
          match =
            builtinConverters.some(converter => converter.matchJSONValue(obj));
        }
      }
      return match;
    },
    toJSONValue(obj) {
      const newObj = {};
      Object.keys(obj).forEach(key => {
        newObj[key] = EJSON.toJSONValue(obj[key]);
      });
      return {$escape: newObj};
    },
    fromJSONValue(obj) {
      const newObj = {};
      Object.keys(obj.$escape).forEach(key => {
        newObj[key] = EJSON.fromJSONValue(obj.$escape[key]);
      });
      return newObj;
    },
  },
  { // Custom
    matchJSONValue(obj) {
      return hasOwn(obj, '$type')
        && hasOwn(obj, '$value') && Object.keys(obj).length === 2;
    },
    matchObject(obj) {
      return EJSON._isCustomType(obj);
    },
    toJSONValue(obj) {
      const jsonValue = obj.toJSONValue();
      return {$type: obj.typeName(), $value: jsonValue};
    },
    fromJSONValue(obj) {
      const typeName = obj.$type;
      if (!hasOwn(customTypes, typeName)) {
        throw new Error(`Custom EJSON type ${typeName} is not defined`);
      }
      const converter = customTypes[typeName];
      return converter(obj.$value);
    },
  },
];

EJSON._isCustomType = (obj) => (
  obj &&
  typeof obj.toJSONValue === 'function' &&
  typeof obj.typeName === 'function' &&
  hasOwn(customTypes, obj.typeName())
);

EJSON._getTypes = () => customTypes;

EJSON._getConverters = () => builtinConverters;

// Either return the JSON-compatible version of the argument, or undefined (if
// the item isn't itself replaceable, but maybe some fields in it are)
const toJSONValueHelper = item => {
  for (let i = 0; i < builtinConverters.length; i++) {
    const converter = builtinConverters[i];
    if (converter.matchObject(item)) {
      return converter.toJSONValue(item);
    }
  }
  return undefined;
};

// for both arrays and objects, in-place modification.
const adjustTypesToJSONValue = obj => {
  // Is it an atom that we need to adjust?
  if (obj === null) {
    return null;
  }

  const maybeChanged = toJSONValueHelper(obj);
  if (maybeChanged !== undefined) {
    return maybeChanged;
  }

  // Other atoms are unchanged.
  if (typeof obj !== 'object') {
    return obj;
  }

  // Iterate over array or object structure.
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    if (typeof value !== 'object' && value !== undefined &&
        !isInfOrNan(value)) {
      return; // continue
    }

    const changed = toJSONValueHelper(value);
    if (changed) {
      obj[key] = changed;
      return; // on to the next key
    }
    // if we get here, value is an object but not adjustable
    // at this level.  recurse.
    adjustTypesToJSONValue(value);
  });
  return obj;
};

EJSON._adjustTypesToJSONValue = adjustTypesToJSONValue;

/**
 * @summary Serialize an EJSON-compatible value into its plain JSON
 *          representation.
 * @locus Anywhere
 * @param {EJSON} val A value to serialize to plain JSON.
 */
EJSON.toJSONValue = item => {
  const changed = toJSONValueHelper(item);
  if (changed !== undefined) {
    return changed;
  }

  let newItem = item;
  if (typeof item === 'object') {
    newItem = EJSON.clone(item);
    adjustTypesToJSONValue(newItem);
  }
  return newItem;
};

// Either return the argument changed to have the non-json
// rep of itself (the Object version) or the argument itself.
// DOES NOT RECURSE.  For actually getting the fully-changed value, use
// EJSON.fromJSONValue
const fromJSONValueHelper = value => {
  if (typeof value === 'object' && value !== null) {
    const keys = Object.keys(value);
    if (keys.length <= 2
        && keys.every(k => typeof k === 'string' && k.substr(0, 1) === '$')) {
      for (let i = 0; i < builtinConverters.length; i++) {
        const converter = builtinConverters[i];
        if (converter.matchJSONValue(value)) {
          return converter.fromJSONValue(value);
        }
      }
    }
  }
  return value;
};

// for both arrays and objects. Tries its best to just
// use the object you hand it, but may return something
// different if the object you hand it itself needs changing.
const adjustTypesFromJSONValue = obj => {
  if (obj === null) {
    return null;
  }

  const maybeChanged = fromJSONValueHelper(obj);
  if (maybeChanged !== obj) {
    return maybeChanged;
  }

  // Other atoms are unchanged.
  if (typeof obj !== 'object') {
    return obj;
  }

  Object.keys(obj).forEach(key => {
    const value = obj[key];
    if (typeof value === 'object') {
      const changed = fromJSONValueHelper(value);
      if (value !== changed) {
        obj[key] = changed;
        return;
      }
      // if we get here, value is an object but not adjustable
      // at this level.  recurse.
      adjustTypesFromJSONValue(value);
    }
  });
  return obj;
};

EJSON._adjustTypesFromJSONValue = adjustTypesFromJSONValue;

/**
 * @summary Deserialize an EJSON value from its plain JSON representation.
 * @locus Anywhere
 * @param {JSONCompatible} val A value to deserialize into EJSON.
 */
EJSON.fromJSONValue = item => {
  let changed = fromJSONValueHelper(item);
  if (changed === item && typeof item === 'object') {
    changed = EJSON.clone(item);
    adjustTypesFromJSONValue(changed);
  }
  return changed;
};

/**
 * @summary Serialize a value to a string. For EJSON values, the serialization
 *          fully represents the value. For non-EJSON values, serializes the
 *          same way as `JSON.stringify`.
 * @locus Anywhere
 * @param {EJSON} val A value to stringify.
 * @param {Object} [options]
 * @param {Boolean | Integer | String} options.indent Indents objects and
 * arrays for easy readability.  When `true`, indents by 2 spaces; when an
 * integer, indents by that number of spaces; and when a string, uses the
 * string as the indentation pattern.
 * @param {Boolean} options.canonical When `true`, stringifies keys in an
 *                                    object in sorted order.
 */
EJSON.stringify = (item, options) => {
  let serialized;
  const json = EJSON.toJSONValue(item);
  if (options && (options.canonical || options.indent)) {
    serialized = canonicalStringify(json, options);
  } else {
    serialized = JSON.stringify(json);
  }
  return serialized;
};

/**
 * @summary Parse a string into an EJSON value. Throws an error if the string
 *          is not valid EJSON.
 * @locus Anywhere
 * @param {String} str A string to parse into an EJSON value.
 */
EJSON.parse = item => {
  if (typeof item !== 'string') {
    throw new Error('EJSON.parse argument should be a string');
  }
  return EJSON.fromJSONValue(JSON.parse(item));
};

/**
 * @summary Returns true if `x` is a buffer of binary data, as returned from
 *          [`EJSON.newBinary`](#ejson_new_binary).
 * @param {Object} x The variable to check.
 * @locus Anywhere
 */
EJSON.isBinary = obj => {
  return !!((typeof Uint8Array !== 'undefined' && obj instanceof Uint8Array) ||
    (obj && obj.$Uint8ArrayPolyfill));
};

/**
 * @summary Return true if `a` and `b` are equal to each other.  Return false
 *          otherwise.  Uses the `equals` method on `a` if present, otherwise
 *          performs a deep comparison.
 * @locus Anywhere
 * @param {EJSON} a
 * @param {EJSON} b
 * @param {Object} [options]
 * @param {Boolean} options.keyOrderSensitive Compare in key sensitive order,
 * if supported by the JavaScript implementation.  For example, `{a: 1, b: 2}`
 * is equal to `{b: 2, a: 1}` only when `keyOrderSensitive` is `false`.  The
 * default is `false`.
 */
EJSON.equals = (a, b, options) => {
  let i;
  const keyOrderSensitive = !!(options && options.keyOrderSensitive);
  if (a === b) {
    return true;
  }

  // This differs from the IEEE spec for NaN equality, b/c we don't want
  // anything ever with a NaN to be poisoned from becoming equal to anything.
  if (Number.isNaN(a) && Number.isNaN(b)) {
    return true;
  }

  // if either one is falsy, they'd have to be === to be equal
  if (!a || !b) {
    return false;
  }

  if (!(typeof a === 'object' && typeof b === 'object')) {
    return false;
  }

  if (a instanceof Date && b instanceof Date) {
    return a.valueOf() === b.valueOf();
  }

  if (EJSON.isBinary(a) && EJSON.isBinary(b)) {
    if (a.length !== b.length) {
      return false;
    }
    for (i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }

  if (typeof (a.equals) === 'function') {
    return a.equals(b, options);
  }

  if (typeof (b.equals) === 'function') {
    return b.equals(a, options);
  }

  if (a instanceof Array) {
    if (!(b instanceof Array)) {
      return false;
    }
    if (a.length !== b.length) {
      return false;
    }
    for (i = 0; i < a.length; i++) {
      if (!EJSON.equals(a[i], b[i], options)) {
        return false;
      }
    }
    return true;
  }

  // fallback for custom types that don't implement their own equals
  switch (EJSON._isCustomType(a) + EJSON._isCustomType(b)) {
    case 1: return false;
    case 2: return EJSON.equals(EJSON.toJSONValue(a), EJSON.toJSONValue(b));
    default: // Do nothing
  }

  // fall back to structural equality of objects
  let ret;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (keyOrderSensitive) {
    i = 0;
    ret = aKeys.every(key => {
      if (i >= bKeys.length) {
        return false;
      }
      if (key !== bKeys[i]) {
        return false;
      }
      if (!EJSON.equals(a[key], b[bKeys[i]], options)) {
        return false;
      }
      i++;
      return true;
    });
  } else {
    i = 0;
    ret = aKeys.every(key => {
      if (!hasOwn(b, key)) {
        return false;
      }
      if (!EJSON.equals(a[key], b[key], options)) {
        return false;
      }
      i++;
      return true;
    });
  }
  return ret && i === bKeys.length;
};

/**
 * @summary Return a deep copy of `val`.
 * @locus Anywhere
 * @param {EJSON} val A value to copy.
 */
EJSON.clone = v => {
  let ret;
  if (typeof v !== 'object') {
    return v;
  }

  if (v === null) {
    return null; // null has typeof "object"
  }

  if (v instanceof Date) {
    return new Date(v.getTime());
  }

  // RegExps are not really EJSON elements (eg we don't define a serialization
  // for them), but they're immutable anyway, so we can support them in clone.
  if (v instanceof RegExp) {
    return v;
  }

  if (EJSON.isBinary(v)) {
    ret = EJSON.newBinary(v.length);
    for (let i = 0; i < v.length; i++) {
      ret[i] = v[i];
    }
    return ret;
  }

  if (Array.isArray(v)) {
    return v.map(value => EJSON.clone(value));
  }

  if (isArguments(v)) {
    return Array.from(v).map(value => EJSON.clone(value));
  }

  // handle general user-defined typed Objects if they have a clone method
  if (typeof v.clone === 'function') {
    return v.clone();
  }

  // handle other custom types
  if (EJSON._isCustomType(v)) {
    return EJSON.fromJSONValue(EJSON.clone(EJSON.toJSONValue(v)), true);
  }

  // handle other objects
  ret = {};
  Object.keys(v).forEach((key) => {
    ret[key] = EJSON.clone(v[key]);
  });
  return ret;
};

/**
 * @summary Allocate a new buffer of binary data that EJSON can serialize.
 * @locus Anywhere
 * @param {Number} size The number of bytes of binary data to allocate.
 */
// EJSON.newBinary is the public documented API for this functionality,
// but the implementation is in the 'base64' package to avoid
// introducing a circular dependency. (If the implementation were here,
// then 'base64' would have to use EJSON.newBinary, and 'ejson' would
// also have to use 'base64'.)
EJSON.newBinary = newBinary;

export { EJSON };
