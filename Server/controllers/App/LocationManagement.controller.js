var mongoose = require('mongoose');
var LocationManagement = require('../../Models/global_management.model');
var ErrorHandling = require('../../Handling/ErrorHandling').ErrorHandling;


exports.StateList = function (req, res) {   
   var Country = mongoose.Types.ObjectId('5b3f0552a4ed1e0474018ef6');
   LocationManagement.Global_State.find({ Country_DatabaseId: Country }, {}, {}).exec(function (err, result) {
      if (err) {
         ErrorHandling.ErrorLogCreation(req, 'User Details Error', 'Location.Controller -> StateList', JSON.stringify(err));
         res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
      } else {
         if (result !== null) {
            res.status(200).send({ Status: true, Message: 'State Details', Response: result });
         } else {
            res.status(400).send({ Status: false, Message: "Invalid Details!" });
         }
      }
   });
};