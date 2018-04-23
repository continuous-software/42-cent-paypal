[![Build Status](https://travis-ci.org/continuous-software/42-cent-paypal.svg?branch=master)](https://travis-ci.org/continuous-software/42-cent-paypal)

![42-cent-paypal](https://cloud.githubusercontent.com/assets/412895/20221394/b7fa6260-a863-11e6-9fa5-7330b3e16c13.png)

## Installation ##

[![Greenkeeper badge](https://badges.greenkeeper.io/continuous-software/42-cent-paypal.svg)](https://greenkeeper.io/)

    $ npm install -s 42-cent-paypal

## Usage

```javascript
var Paypal = require('42-cent-paypal').factory;
var client = Paypal({
    CLIENT_ID: '<PLACEHOLDER>',
    CLIENT_SECRET: '<PLACEHOLDER>'
});
```

## Gateway API

This is an adaptor of [paypal-rest-sdk](https://github.com/paypal/PayPal-node-SDK) for [42-cent](https://github.com/continuous-software/42-cent).  
It implements the [BaseGateway](https://github.com/continuous-software/42-cent-base) API.
