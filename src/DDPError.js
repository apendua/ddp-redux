// Based on Meteor's EJSON implementation: https://github.com/meteor/meteor
//
//    packages/meteor/errors.js
//    2017-08-10
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

class DDPError extends Error {
  constructor(error, reason, details) {
    super();

    // Ensure we get a proper stack trace in most Javascript environments
    if (Error.captureStackTrace) {
      // V8 environments (Chrome and Node.js)
      Error.captureStackTrace(this, DDPError);
    } else {
      // Borrow the .stack property of a native Error object.
      this.stack = new Error().stack;
    }
    // Safari magically works.

    // Newer versions of DDP use this property to signify that an error
    // can be sent back and reconstructed on the calling client.
    this.isClientSafe = true;

    // String code uniquely identifying this kind of error.
    this.error = error;

    // Optional: A short human-readable summary of the error. Not
    // intended to be shown to end users, just developers. ("Not Found",
    // "Internal Server Error")
    this.reason = reason;

    // Optional: Additional information about the error, say for
    // debugging. It might be a (textual) stack trace if the server is
    // willing to provide one. The corresponding thing in HTTP would be
    // the body of a 404 or 500 response. (The difference is that we
    // never expect this to be shown to end users, only developers, so
    // it doesn't need to be pretty.)
    this.details = details;

    // This is what gets displayed at the top of a stack trace. Current
    // format is "[404]" (if no reason is set) or "File not found [404]"
    if (this.reason) {
      this.message = `${this.reason} [${this.error}]`;
    } else {
      this.message = `[${this.error}]`;
    }

    this.errorType = 'Meteor.Error';
  }

  // Meteor.Error is basically data and is sent over DDP, so you should be able to
  // properly EJSON-clone it. This is especially important because if a
  // Meteor.Error is thrown through a Future, the error, reason, and details
  // properties become non-enumerable so a standard Object clone won't preserve
  // them and they will be lost from DDP.
  clone() {
    return new DDPError(this.error, this.reason, this.details);
  }
}

export default DDPError;
