var admin = require("firebase-admin");
var CustomerAccount = require("./aquilahundi-950213791192.json");

var _customerNotify = admin.initializeApp({
       credential: admin.credential.cert(CustomerAccount),
       databaseURL: ""
       }, 'customerNotify');

exports.CustomerNotify = _customerNotify;
