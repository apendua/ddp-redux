import flags from 'regexp.prototype.flags';

if (!RegExp.prototype.flags) {
  flags.shim();
}
