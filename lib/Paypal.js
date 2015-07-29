var util = require('util');
var BaseGateway = require('42-cent-base').BaseGateway;
var paypal = require('paypal-rest-sdk');
var assert = require('assert');
var mapKeys = require('42-cent-util').mapKeys;
var P = require('bluebird');
var assign = require('object-assign');
var cardType = require('credit-card-type');
var creditCardSchema = {
  creditCardNumber: 'number',
  expirationMonth: 'expire_month',
  expirationYear: 'expire_year',
  cvv2: 'cvv2',
  billingFirstName: 'first_name',
  billingLastName: 'last_name'
};
var GatewayError = require('42-cent-base').GatewayError;

var billingAddressSchema = {
  billingPhone: 'phone',
  billingAddress1: 'line1',
  billingAddress2: 'line2',
  billingCity: 'city',
  billingState: 'state',
  billingPostalCode: 'postal_code',
  billingCountry: 'country_code'
};

function Paypal (options) {
  assert(options.CLIENT_ID, 'you must provide CLIENT_ID in the options');
  assert(options.CLIENT_SECRET, 'you must provide CLIENT_SECRET in the options');
  BaseGateway.call(this, options);
  this.paypal = paypal;
  this.paypal.configure({
    mode: options.testMode === true ? 'sandbox' : 'live',
    client_id: options.CLIENT_ID,
    client_secret: options.CLIENT_SECRET
  });

}
util.inherits(Paypal, BaseGateway);

function handleError (err) {
  if (err.httpStatusCode && err.httpStatusCode >= 400) {
    throw  new GatewayError(err.message, err);
  } else {
    throw err;
  }
}

function createPayment (intent) {
  return function submitTransaction (order, creditcard, prospect, other) {
    return P.resolve()
      .then(function () {
        var type;
        var pay = P.promisify(this.paypal.payment.create.bind(this.paypal.payment));
        var cc = mapKeys(assign({}, creditcard, prospect), creditCardSchema);
        var amount = parseNumber(order.amount);
        cc.billing_address = mapKeys(prospect, billingAddressSchema, {});
        type = cardType(creditcard.creditCardNumber)[0].niceType.toLowerCase();
        type = type === 'american express' ? 'amex' : type;
        cc.type = type;
        var payload = {
          intent: intent,
          payer: {
            payment_method: 'credit_card',
            funding_instruments: [
              {credit_card: cc}
            ]
          },
          transactions: [{
            amount: {
              total: amount,
              currency: order.currency || 'USD'
            }
          }]
        };
        return pay(payload);
      }.bind(this))
      .then(function parse (response) {
        var relatedResource = response.transactions[0].related_resources[0];
        var id = intent === 'sale' ? relatedResource.sale.id : relatedResource.authorization.id;
        return {
          _original: response,
          transactionId: id
        };
      })
      .catch(handleError);
  }
}

function parseNumber (number) {
  return typeof number === 'number' ? number.toFixed(2) : parseFloat(number.toString()).toFixed(2);
}

Paypal.prototype.submitTransaction = createPayment('sale');

Paypal.prototype.authorizeTransaction = createPayment('authorize');

Paypal.prototype.refundTransaction = function refundTransaction (transactionId, options) {

  return P.resolve()
    .then(function () {
      options = options || {};
      var amount = {};
      var payload = {};
      var refund = P.promisify(this.paypal.sale.refund.bind(this.paypal.sale));
      if (options.amount) {
        amount.total = parseNumber(options.amount);
      }
      if (options.currency) {
        amount.currency = options.currency;
      }
      payload = amount.total ? {amount: amount} : payload;
      return refund(transactionId, payload)
    }.bind(this))
    .then(function (result) {
      return {
        _original: result
      };
    })
    .catch(handleError);

};

Paypal.prototype.voidTransaction = function voidTransaction (authorizationId, options) {
  return P.resolve()
    .then(function () {
      var paypalVoid = P.promisify(this.paypal.authorization.void.bind(this.paypal.authorization));
      return paypalVoid(authorizationId)
    }.bind(this))
    .then(function (res) {
      return {
        _original: res
      };
    })
    .catch(handleError);
};

Paypal.prototype.createCustomerProfile = function createCustomerProfile (creditcard, prospect, options) {
  return P.resolve()
    .then(function () {
      options = options || {};
      var createProfile = P.promisify(this.paypal.creditCard.create.bind(this.paypal.creditCard));
      var cc = mapKeys(assign({}, creditcard, prospect), creditCardSchema);
      var type = cardType(creditcard.creditCardNumber)[0].niceType.toLocaleLowerCase();
      type = type === 'american express' ? 'amex' : type;
      cc.billing_address = mapKeys(prospect, billingAddressSchema, {});
      cc.type = type;
      cc = assign(cc, options);
      return createProfile(cc);
    }.bind(this))
    .then(function (result) {
      return {
        profileId: result.id,
        _original: result
      };
    })
    .catch(handleError);
};

Paypal.prototype.chargeCustomer = function chargeCustomer (order, prospect) {
  return P.resolve()
    .then(function () {
      assert(prospect.profileId, 'prospect must have a profileId');
      var pay = P.promisify(this.paypal.payment.create.bind(this.paypal.payment));
      var amount = parseNumber(order.amount);
      var payload = {
        intent: 'sale',
        payer: {
          payment_method: 'credit_card',
          funding_instruments: [
            {
              credit_card_token: {
                credit_card_id: prospect.profileId
              }
            }
          ]
        },
        transactions: [{
          amount: {
            total: amount,
            currency: order.currency || 'USD'
          }
        }]
      };
      return pay(payload);
    }.bind(this))
    .then(function (response) {
      var relatedResource = response.transactions[0].related_resources[0];
      var id = relatedResource.sale.id;
      return {
        _original: response,
        transactionId: id
      };
    })
    .catch(handleError)
};

module.exports = Paypal;
