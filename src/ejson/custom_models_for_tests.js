/* eslint-disable */

// Based on Meteor's EJSON implementation: https://github.com/meteor/meteor
//
//    packages/ejson/custom_models_for_tests.js
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

import { EJSON } from './ejson';

class Address {
  constructor(city, state) {
    this.city = city;
    this.state = state;
  }

  typeName() {
    return 'Address';
  }

  toJSONValue() {
    return {
      city: this.city,
      state: this.state,
    };
  }
}

EJSON.addType('Address', value => new Address(value.city, value.state));

class Person {
  constructor(name, dob, address) {
    this.name = name;
    this.dob = dob;
    this.address = address;
  }

  typeName() {
    return 'Person';
  }

  toJSONValue() {
    return {
      name: this.name,
      dob: EJSON.toJSONValue(this.dob),
      address: EJSON.toJSONValue(this.address),
    };
  }
}

EJSON.addType(
  'Person',
  value => new Person(
    value.name,
    EJSON.fromJSONValue(value.dob),
    EJSON.fromJSONValue(value.address)
  )
);

class Holder {
  constructor(content) {
    this.content = content;
  }

  typeName() {
    return 'Holder';
  }

  toJSONValue() {
    return this.content;
  }
}

EJSON.addType('Holder', value => new Holder(value));

const EJSONTest = {
  Address,
  Person,
  Holder,
};

export default EJSONTest;
