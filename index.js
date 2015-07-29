var Paypal = require('./lib/Paypal.js');
module.exports = {
  factory: function (options) {
    return new Paypal(options);
  }
};