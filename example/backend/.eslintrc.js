var fs = require('fs');
var path = require('path');
var packages = path.resolve(__dirname, '.meteor', 'packages');

module.exports = {
  settings: {
    'import/resolver': 'meteor',
    'import/core-modules': fs.readFileSync(packages, 'utf-8')
      .split('\n')
      .filter(name => name.charAt(0) !=='#')
      .filter(name => name.length > 0)
      .map(name => name.indexOf('@') > -1 ? name.split('@')[0] : name)
      .map(name => 'meteor/' + name)
      .concat(['meteor/meteor'])
  },
};