var mongoose = require('mongoose');
var CustomersManagement = require('../../Models/CustomerManagement.model');
var ErrorHandling = require('../../Handling/ErrorHandling').ErrorHandling;
var DeviceModel = require('../../Models/DeviceManagement.model');


 // Device Create
 exports.CreateDevice = function (req, res) {
    var ReceivingData = req.body;
 
    if (!ReceivingData.ContactName || ReceivingData.Device_Id === '') {
       res.status(400).send({ Status: false, Message: "Device Id can not be empty" });
    } else if (!ReceivingData.Device_Type || ReceivingData.Device_Type === '') {
       res.status(400).send({ Status: false, Message: "Device Type can not be empty" });
    } else if (!ReceivingData.Customer || ReceivingData.Customer === '') {
       res.status(400).send({ Status: false, Message: "Customer can not be empty" });
    } else if (!ReceivingData.Firebase_Token || ReceivingData.Firebase_Token === '') {
       res.status(400).send({ Status: false, Message: "Firebase Token can not be empty" });
    } else {
       ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer); 

       CustomersManagement.CustomerSchema.find({ _id: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec((err_5, result_1) => {
          if (err_5) {
             res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Customer!.", Error: err });
          } else {
             if (result_1 !== null) {                
                const Create_Device = new DeviceModel.DeviceSchema({
                    Customer: ReceivingData.Customer,
                    Device_Id: ReceivingData.Device_Id,
                    Device_Type: ReceivingData.Device_Type,
                    Firebase_Token: ReceivingData.Firebase_Token,
                    CustomerType: result_1.CustomerType,
                    AccountStatus: 'New',
                    CustomerStatus: ReceivingData.CustomerStatus,                       
                    ActiveStatus: true,
                    IfDeleted: false
                });
                Create_Device.save(function (err, result) {
                    if (err) {
                    ErrorHandling.ErrorLogCreation(req, 'Device Create Error', 'Device.Controller -> CreateDevice', JSON.stringify(err));
                    res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to complete this CreateDevice!.", Error: err });
                    } else {                          
                    res.status(200).send({ Status: true, Response: result });
                    }
                });                 
              
             } else {
                res.status(200).send({ Http_Code: 200, Status: true, Message: 'Invalid User' });
             }
          }
       });
    }
 };
 

  // Device Status Update
  exports.DeviceStatus_Update = function (req, res) {
    var ReceivingData = req.body;
 
    if (!ReceivingData.ContactName || ReceivingData.Device_Id === '') {
       res.status(400).send({ Status: false, Message: "Device Id can not be empty" });
    } else if (!ReceivingData.Customer || ReceivingData.Customer === '') {
       res.status(400).send({ Status: false, Message: "Customer can not be empty" });
    } else {
       ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer); 
       ReceivingData.Device_Id = mongoose.Types.ObjectId(ReceivingData.Device_Id); 

       CustomersManagement.CustomerSchema.find({ _id: ReceivingData.Customer, Device_Id: ReceivingData.Device_Id }, {}, {}).exec((err_5, result_1) => {
          if (err_5) {
             res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Customer!.", Error: err });
          } else {
             if (result_1 !== null) {          
                
                DeviceModel.DeviceSchema.updateOne(
                    { "_id": ReceivingData.Device_Id}, 
                    { $set: { 
                       "AccountStatus": 'Old',              
                      } 
                    }
                 ).exec(function (err_1, result_1) {
                    if (err_1) {
                        ErrorHandling.ErrorLogCreation(req, 'Device Status Error', 'Device.Controller -> DeviceStatus_Update', JSON.stringify(err));
                        res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to complete this CreateDevice!.", Error: err });
                    } else {                          
                        res.status(200).send({ Status: true, Response: result_1, Message: "Successfully Updated" });
                    }
                 });              
             } else {
                DeviceModel.DeviceSchema.updateOne(
                    { "_id": ReceivingData.Device_Id}, 
                    { $set: { 
                       "AccountStatus": 'New',              
                      } 
                    }
                 ).exec(function (err_1, result_1) {
                    if (err_1) {
                        ErrorHandling.ErrorLogCreation(req, 'Device Status Error', 'Device.Controller -> DeviceStatus_Update', JSON.stringify(err));
                        res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to complete this CreateDevice!.", Error: err });
                    } else {                          
                        res.status(200).send({ Status: true, Response: result_1, Message: "Successfully Updated" });
                    }
                 }); 
             }
          }
       });
    }
 };