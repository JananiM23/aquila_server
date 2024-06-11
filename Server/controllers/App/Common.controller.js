var mongoose = require('mongoose');
var CustomersManagement = require('../../Models/CustomerManagement.model');
var IndustryManagement = require('../../Models/industryManagement.model');
var BusinessAndBranchManagement = require('../../Models/BusinessAndBranchManagement.model');
var NotificationModel = require('../../Models/notification_management.model');
var ErrorHandling = require('../../Handling/ErrorHandling').ErrorHandling;
var LoginHistory = require('../../Models/login_system.model');
var SMS_System = require('../../../Config/sms_config');
var fs = require('fs');
var SocketAndQRModel = require('../../Models/SocketAndQRManagement.model');
const SocketIO = require('socket.io');
var CryptoJS = require("crypto-js");
var crypto = require("crypto");
var parser = require('ua-parser-js');
const { event } = require('jquery');
const { log } = require('util');
const jwt = require('jsonwebtoken');
const IO = SocketIO();
const secret = 'khfkhdskjfhdjkfhkjdshfkjdshf';

let Socket = {
   emit: (event, data) => {
      IO.sockets.emit(event, data);
   }
};

exports.MobileOTP = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Mobile || ReceivingData.Mobile === '') {
      res.status(400).send({ Status: false, Message: "Mobile Number can not be empty" });
   } else {
      var OTP = Math.floor(100000 + Math.random() * 900000);
      res.status(200).send({ Status: true, OTP: OTP });
      // SMS_System.sendOTP(ReceivingData.Mobile, OTP, (error, response) => {
      //    if (error) {
      //       console.log(error);
      //       res.status(417).send({ Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: error });
      //    } else {

      //    }
      // });
   }
};

// Mobile OTP Sent
exports.GenerateOTP = function (req, res) {
   var ReceivingData = req.body;
   console.log('receivingdata', ReceivingData);

   if (!ReceivingData.Mobile || ReceivingData.Mobile === '') {
      res.status(400).send({ Status: false, Message: "Mobile Number can not be empty" });
   } else {
      // find if the mobile number already exists
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ Mobile: ReceivingData.Mobile, ActiveStatus: true, IfDeleted: false }, {}).exec(),
         LoginHistory.LoginHistorySchema.find({ Mobile: ReceivingData.Mobile, ActiveStatus: true, IfDeleted: false }, {}).exec(),
      ]).then(Response => {
         var CustomerDetails = Response[0];
         var ExistingLogin = Response[1];
         if (CustomerDetails !== null) {
               if (ExistingLogin.length === 0) {
                  var OTP = Math.floor(100000 + Math.random() * 900000);
                  //CustomersManagement.CustomerSchema.updateOne({ Mobile: ReceivingData.Mobile }, { $set: { OTP: OTP } }).exec();
                  // find if customerdetails.customername exists
                  // store otp in customerdetails
                  console.log('working hereee');
                 CustomersManagement.CustomerSchema.findOneAndUpdate({ Mobile: ReceivingData.Mobile }, { $set: { OTP: OTP } }, { new: true }).exec((err, result) => {
                     console.log('result', result);
                     if (err) {
                        res.status(417).send({ Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err });
                     } else {
                  if (CustomerDetails.ContactName) {
                     // save the OTP
                  res.send({ Status: true, SuccessStatus: true, OTP: OTP, CustomerType: 'Existing' });
                  } else {
                  res.send({ Status: true, SuccessStatus: true, OTP: OTP, CustomerType: 'New' });
                  }
               }
            });
            
               } else {
                  res.send({ Status: true, SuccessStatus: false, Message: "Already this number logged another device." });
               }
         } else {
            // Generate 6 digit OTP
            var OTP = Math.floor(100000 + Math.random() * 900000);
            // create customer
            const NewCustomer = new CustomersManagement.CustomerSchema({
               Mobile: ReceivingData.Mobile,
               OTP: OTP,
               ActiveStatus: true,
               IfDeleted: false
            });
            NewCustomer.save().then(Response => {
               res.status(200).send({ Status: true, SuccessStatus: true, OTP: OTP, CustomerType: 'New' });
            }).catch(Error => {
               res.status(417).send({ Status: false, Message: Error });
            });

            // NewCustomer.save().then(Response => {
            //    res.status(200).send({ Status: true, SuccessStatus: true, OTP: OTP, CustomerType: 'New' });
            // }).catch(Error => {
            //    res.status(417).send({ Status: false, Message: "Some Occurred Error in Login System" });
            // });
         }
      }).catch(Error => {
         res.status(417).send({ Status: false, Message: "Some Occurred Error in Login System" });
      });
      // SMS_System.sendOTP(ReceivingData.Mobile, OTP, (error, response) => {
      //    if (error) {
      //       console.log(error);
      //       res.status(417).send({ Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: error });
      //    } else {

      //    }
      // });
   }
};

exports.VerifyOTP = function (req, res) {
   var ReceivingData = req.body;
   console.log('ReceivingData', ReceivingData);
   if (!ReceivingData.Mobile || ReceivingData.Mobile === '') {
      res.status(400).send({ Status: false, Message: "Mobile Number can not be empty" });
   } else if (!ReceivingData.OTP || ReceivingData.OTP === '') {
      res.status(400).send({ Status: false, Message: "OTP can not be empty" });
   } else {
      CustomersManagement.CustomerSchema.findOne({ Mobile: ReceivingData.Mobile, OTP: Number(ReceivingData.OTP), ActiveStatus: true, IfDeleted: false }, {}).exec((err, result) => {
         if (err) {
            res.status(417).send({ Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err });
         } else {
            if (result !== null) {
               console.log('result', result);
               // generate jwt token
               const token = jwt.sign({ sub: result._id }, secret);
               result.OTP = null;
               result.Firebase_Token = token;
               result.Device_Id = ReceivingData.Device_Id;
               result.Device_Type = ReceivingData.Device_Type;
               result.save();

               const NewLoginHistory = new LoginHistory.LoginHistorySchema({
                  User: result._id,
                  Mobile: ReceivingData.Mobile,
                  LastActive: new Date(),
                  LoginFrom: 'APP',
                  Firebase_Token: token,
                  Device_Id: ReceivingData.Device_Id,
                  Device_Type: ReceivingData.Device_Type,
                  ActiveStatus: true,
                  IfDeleted: false
               });
               NewLoginHistory.save();
               
               res.status(200).send({ 
                  Status: true, 
                  SuccessStatus: true,
                  Message: "OTP Verified Successfully", 
                  Response: result 
               });
            } else {
               res.status(200).send({ Status: true, SuccessStatus: false,  Message: "Invalid OTP" });
            }
         }
      });
   }
};



// Mobile number Verification
exports.MobileNumberVerification = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Mobile || ReceivingData.Mobile === '') {
      res.status(400).send({ Status: false, Message: "Mobile Number can not be empty" });
   } else if (!ReceivingData.Firebase_Token || ReceivingData.Firebase_Token === '') {
      res.status(400).send({ Status: false, Message: "Firebase Token can not be empty" });
   } else if (!ReceivingData.Device_Id || ReceivingData.Device_Id === '') {
      res.status(400).send({ Status: false, Message: "Device Id can not be empty" });
   } else if (!ReceivingData.Device_Type || ReceivingData.Device_Type === '') {
      res.status(400).send({ Status: false, Message: "Device Type can not be empty" });
   } else {
      CustomersManagement.CustomerSchema.findOne({ Mobile: ReceivingData.Mobile }, { ContactName: 1, Mobile: 1, Email: 1, CustomerCategory: 1, CustomerType: 1, UserBusiness: 1,ActiveStatus: 1, IfDeleted: 1 }).exec((err, result) => {
         if (err) {
            ErrorHandling.ErrorLogCreation(req, 'Mobile Number Verification Error', 'Customer.Controller -> MobileNumberVerification', JSON.stringify(err));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to verify this mobile number!", Error: err });
         } else {
            if (result === null) {
               res.status(200).send({ Status: true, VerifyStatus: 'NewCustomer' });
            } else if (result !== null) {
               result.Device_Type = ReceivingData.Device_Type;
               result.Firebase_Token = ReceivingData.Firebase_Token;
               result.Device_Id = ReceivingData.Device_Id;
               result.save((Err, Response) => {
                  if (Err) {
                     ErrorHandling.ErrorLogCreation(req, 'Customer Details Save Error', 'Customer.Controller -> MobileNumberVerification', JSON.stringify(Err));
                     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to verify this mobile number!", Error: Err });
                  } else {
                     res.status(200).send({ Status: true, VerifyStatus: 'Already Registered', Response: Response });
                  }
               });
            }
         }
      });
   }
}; // ReturnKeys: NewCustomer, ExistingCustomer, ExistingBuyer, ExistingSeller, CustomerBlocked


// Status Verify
exports.StatusVerify = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Mobile || ReceivingData.Mobile === '') {
      res.status(400).send({ Status: false, Message: "Mobile Number can not be empty" });
   } else if (!ReceivingData.Device_Id || ReceivingData.Device_Id === '') {
      res.status(400).send({ Status: false, Message: "Device Id can not be empty" });
   } else if (!ReceivingData.Device_Type || ReceivingData.Device_Type === '') {
      res.status(400).send({ Status: false, Message: "Device Type can not be empty" });
   } else if (!ReceivingData.Firebase_Token || ReceivingData.Firebase_Token === '') {
      res.status(400).send({ Status: false, Message: "Firebase Token  can not be empty" });
   } else {
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ Mobile: ReceivingData.Mobile, ActiveStatus: true, IfDeleted: false }, {}).exec(),
         LoginHistory.LoginHistorySchema.find({ Mobile: ReceivingData.Mobile }, {}).exec(),
         LoginHistory.LoginHistorySchema.findOne({ Mobile: ReceivingData.Mobile, Device_Id: ReceivingData.Device_Id, ActiveStatus: true, IfDeleted: false }, {}).exec(),
      ]).then(Response => {
         var CustomerVerify = Response[0];
         var ExistingLoginHistory = Response[1];
         var DeviceIdChecking = Response[2];
         
         if (CustomerVerify === null) {
            res.status(200).send({ Status: true });
         } else if (ExistingLoginHistory.length === 0) {
            CustomersManagement.CustomerSchema.updateOne({ Mobile: ReceivingData.Mobile }, { $set: { Device_Id: ReceivingData.Device_Id, Firebase_Token: ReceivingData.Firebase_Token, Device_Type: ReceivingData.Device_Type } }).exec();
            res.status(200).send({ Status: true });
         } else if (DeviceIdChecking !== null) {
            CustomersManagement.CustomerSchema.updateOne({ Mobile: ReceivingData.Mobile }, { $set: { Device_Id: ReceivingData.Device_Id, Firebase_Token: ReceivingData.Firebase_Token, Device_Type: ReceivingData.Device_Type } }).exec();
            res.status(200).send({ Status: true });
         } else {
            const AnotherDevice = ExistingLoginHistory.filter(obj => obj.ActiveStatus === true && obj.IfDeleted === false);
            
            if (AnotherDevice.length > 0) {
               CustomersManagement.CustomerSchema.updateOne({ Mobile: ReceivingData.Mobile }, { $set: { Device_Id: ReceivingData.Device_Id, Firebase_Token: ReceivingData.Firebase_Token, Device_Type: ReceivingData.Device_Type } }).exec();
               res.status(200).send({ Status: false });
            } else {
               CustomersManagement.CustomerSchema.updateOne({ Mobile: ReceivingData.Mobile }, { $set: { Device_Id: ReceivingData.Device_Id, Firebase_Token: ReceivingData.Firebase_Token, Device_Type: ReceivingData.Device_Type } }).exec();
               res.status(200).send({ Status: true });
            }
         }
      }).catch(Error => {
         ErrorHandling.ErrorLogCreation(req, 'Status verify Error', 'Common.Controller -> StatusVerify', JSON.stringify(Error));
         res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to complete this Status Verify!.", Error: Error });
      });
   }
};

// Login System
exports.Login = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Mobile || ReceivingData.Mobile === '') {
      res.status(400).send({ Status: false, Message: "Mobile can not be empty" });
   } else if (!ReceivingData.Firebase_Token || ReceivingData.Firebase_Token === '') {
      res.status(400).send({ Status: false, Message: "Firebase Token can not be empty" });
   } else if (!ReceivingData.Device_Id || ReceivingData.Device_Id === '') {
      res.status(400).send({ Status: false, Message: "Device Id can not be empty" });
   } else if (!ReceivingData.Device_Type || ReceivingData.Device_Type === '') {
      res.status(400).send({ Status: false, Message: "Device Type can not be empty" });
   } else {
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ Mobile: ReceivingData.Mobile, ActiveStatus: true, IfDeleted: false }, {}).exec(),
         LoginHistory.LoginHistorySchema.find({ Mobile: ReceivingData.Mobile, ActiveStatus: true, IfDeleted: false }, {}).exec(),
         LoginHistory.LoginHistorySchema.findOne({ Mobile: ReceivingData.Mobile, Device_Id: ReceivingData.Device_Id, ActiveStatus: true, IfDeleted: false }, {}).exec(),
      ]).then(Response => {
         var CustomerDetails = Response[0];
         var ExistingLogin = Response[1];
         var LoginDetails = Response[2];
         if (CustomerDetails !== null) {
            if (LoginDetails === null) {
               if (ExistingLogin.length === 0) {
                  const NewLoginHistory = new LoginHistory.LoginHistorySchema({
                     User: CustomerDetails._id,
                     Mobile: ReceivingData.Mobile,
                     LastActive: new Date(),
                     LoginFrom: 'APP',
                     Firebase_Token: ReceivingData.Firebase_Token,
                     Device_Id: ReceivingData.Device_Id,
                     Device_Type: ReceivingData.Device_Type,
                     ActiveStatus: true,
                     IfDeleted: false
                  });
                  NewLoginHistory.save(function (err1, result1) {
                     if (err1) {
                        ErrorHandling.ErrorLogCreation(req, 'User Login Error', 'Common.Controller -> Login', JSON.stringify(err1));
                        res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to complete this Login!.", Error: err1 });
                     } else {
                        LoginHistory.LoginHistorySchema.findOne({ Mobile: ReceivingData.Mobile }, {})
                           .populate({ path: 'User', select: ['ContactName', 'CustomerCategory', 'CustomerType', 'Owner'] }).exec((err, result) => {
                              if (err) {
                                 ErrorHandling.ErrorLogCreation(req, 'Finding the Login history Error', 'Customer.Controller -> Login', JSON.stringify(err));
                                 res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to verify this mobile number!", Error: err });
                              } else {
                                 res.status(200).send({ Status: true, Message: "Successfully Logged", Response: result });
                              }
                           });
                     }
                  });
               } else {
                  res.status(200).send({ Status: false, Message: "Already this number logged another device" });
               }
            } else if (LoginDetails !== null) {
               LoginDetails.LastActive = new Date();
               LoginDetails.save(function (err1, result1) {
                  if (err1) {
                     ErrorHandling.ErrorLogCreation(req, 'User Login Error', 'Common.Controller -> Login', JSON.stringify(err1));
                     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to complete this Login!.", Error: err1 });
                  } else {
                     LoginHistory.LoginHistorySchema.findOne({ Mobile: ReceivingData.Mobile }, {})
                        .populate({ path: 'User', select: ['ContactName', 'CustomerCategory', 'CustomerType', 'Owner'] }).exec((err, result) => {
                           if (err) {
                              ErrorHandling.ErrorLogCreation(req, 'Finding the Login history Error', 'Customer.Controller -> Login', JSON.stringify(err));
                              res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to verify this mobile number!", Error: err });
                           } else {
                              res.status(200).send({ Status: true, Message: "Successfully Logged", Response: result });
                           }
                        });
                  }
               });
            }

         } else {
            res.status(200).send({ Status: false, Message: "Invalid Customer Details..Please Register " });
         }
      }).catch(Error => {
         res.status(417).send({ Status: false, Message: "Some Occurred Error in Login System" });
      });
   }
};


// All Notifications List
exports.All_Notifications_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Customer || ReceivingData.Customer === '') {
      res.status(400).send({ Success: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Success: false, Message: "Customer Category can not be empty" });
   } else {
      ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false }, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.find({ Customer: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false }, {}).exec(),
      ]).then(Response => {
         var CustomerDetails = Response[0];
         var BusinessDetails = Response[1];
         if (CustomerDetails !== null) {
            var FindQuery = {};
            var BusinessArr = [];
            if (CustomerDetails.CustomerType === 'Owner') {
            
               if (BusinessDetails.length > 0) {
                  BusinessDetails.map(Obj => {
                     BusinessArr.push(mongoose.Types.ObjectId(Obj._id));
                  });
               }
            } else if (CustomerDetails.CustomerType === 'User') {
               if (CustomerDetails.BusinessAndBranches.length > 0) {
                  CustomerDetails.BusinessAndBranches.map(Obj => {
                     
                     if (Obj.Business.length !== null) {
                           BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                     }
                  });
               }
            }

            if (ReceivingData.CustomerCategory === 'Seller') {
               FindQuery = {
                  Business: { $in: BusinessArr },
                  $or: [{ Notification_Type: "SellerRequestSend" },
                  { Notification_Type: "SellerRequestAccepted" },
                  { Notification_Type: "SellerInvoiceCreated" },
                  { Notification_Type: "SellerInvoiceAccept" },
                  { Notification_Type: "SupportAdminReply" },
                  { Notification_Type: "SupportAdminClosed" },
                  { Notification_Type: "SellerInvoiceDisputed" },
                  { Notification_Type: "SellerChangedInvite" }],
                  ActiveStatus: true, IfDeleted: false
               };
            } else if (ReceivingData.CustomerCategory === 'Buyer') {
               FindQuery = {
                  Business: { $in: BusinessArr },
                  $or: [{ Notification_Type: "BuyerRequestSend" },
                  { Notification_Type: "BuyerRequestAccepted" },
                  { Notification_Type: "BuyerInvoiceCreated" },
                  { Notification_Type: "BuyerInvoiceDisputed" },
                  { Notification_Type: "SupportAdminReply" },
                  { Notification_Type: "SupportAdminClosed" },
                  { Notification_Type: "BuyerPaymentAccepted" },
                  { Notification_Type: "BuyerPaymentDisputed" },
                  { Notification_Type: "BuyerChangedInvite" }],
                  ActiveStatus: true, IfDeleted: false
               };
            }

            NotificationModel.NotificationSchema.find(FindQuery, {}, {})
               .exec(function (err, result) {
                  if (err) {
                     res.status(417).send({ Success: false, Message: "Some error occurred while Find The Notification Details!.", Error: err });
                  } else {
                     var Notification_Ids = [];
                     result.map(obj => {
                        Notification_Ids.push(obj._id);
                     });
                     var NotificationCounts = result.length;
                     NotificationModel.NotificationSchema.updateMany({ _id: { $in: Notification_Ids } }, { $set: { Message_Received: true } }).exec();
                     res.status(200).send({ Success: true, Response: result,NotificationCounts:NotificationCounts  });
                  }
               });
         } else {
            res.status(400).send({ Status: false, Message: "Invalid Customer Details" });
         }
      }).catch(Error => {
         ErrorHandling.ErrorLogCreation(req, 'All Notifications List Error', 'Common.Controller -> All_Notifications_List', JSON.stringify(Error));
         res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to complete this Customer Details & Branch Details!.", Error: Error });
      });
   }
};


// Read_All_Notifications_List
exports.Read_All_Notifications_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Customer || ReceivingData.Customer === '') {
      res.status(400).send({ Success: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Success: false, Message: "Customer Category can not be empty" });
   } else {
      ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false }, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.find({ Customer: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false }, {}).exec(),
      ]).then(Response => {
         var CustomerDetails = Response[0];
         var BusinessDetails = Response[1];
         if (CustomerDetails !== null) {
            var FindQuery = {};
            var BusinessArr = [];
            if (CustomerDetails.CustomerType === 'Owner') {
            
               if (BusinessDetails.length > 0) {
                  BusinessDetails.map(Obj => {
                     BusinessArr.push(mongoose.Types.ObjectId(Obj._id));
                  });
               }
            } else if (CustomerDetails.CustomerType === 'User') {
               if (CustomerDetails.BusinessAndBranches.length > 0) {
                  CustomerDetails.BusinessAndBranches.map(Obj => {
                     
                     if (Obj.Business.length !== null) {
                           BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                     }
                  });
               }
            }

            if (ReceivingData.CustomerCategory === 'Seller') {
               FindQuery = {
                  Business: { $in: BusinessArr },
                  $or: [{ Notification_Type: "SellerRequestSend" },
                  { Notification_Type: "SellerRequestAccepted" },
                  { Notification_Type: "SellerInvoiceCreated" },
                  { Notification_Type: "SellerInvoiceAccept" },
                  { Notification_Type: "SupportAdminReply" },
                  { Notification_Type: "SupportAdminClosed" },
                  { Notification_Type: "SellerInvoiceDisputed" },
                  { Notification_Type: "SellerChangedInvite" }],
                  ActiveStatus: true, IfDeleted: false
               };
            } else if (ReceivingData.CustomerCategory === 'Buyer') {
               FindQuery = {
                  Business: { $in: BusinessArr },
                  $or: [{ Notification_Type: "BuyerRequestSend" },
                  { Notification_Type: "BuyerRequestAccepted" },
                  { Notification_Type: "BuyerInvoiceCreated" },
                  { Notification_Type: "BuyerInvoiceDisputed" },
                  { Notification_Type: "SupportAdminReply" },
                  { Notification_Type: "SupportAdminClosed" },
                  { Notification_Type: "BuyerPaymentAccepted" },
                  { Notification_Type: "BuyerPaymentDisputed" },
                  { Notification_Type: "BuyerChangedInvite" }],
                  ActiveStatus: true, IfDeleted: false
               };
            }

            NotificationModel.NotificationSchema.find(FindQuery, {}, {})
               .exec(function (err, result) {
                  if (err) {
                     res.status(417).send({ Success: false, Message: "Some error occurred while Find The Notification Details!.", Error: err });
                  } else {
                     var Notification_Ids = [];
                     result.map(obj => {
                        Notification_Ids.push(obj._id);
                     });
                     NotificationModel.NotificationSchema.updateMany({ _id: { $in: Notification_Ids } }, { $set: {  Message_Viewed: true } }).exec();
                     res.status(200).send({ Success: true, Response: result,Message:'Successfully Read All Notifications! 😊'});
                  }
               });
         } else {
            res.status(400).send({ Status: false, Message: "Invalid Customer Details" });
         }
      }).catch(Error => {
         ErrorHandling.ErrorLogCreation(req, 'All Notifications List Error', 'Common.Controller -> All_Notifications_List', JSON.stringify(Error));
         res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to complete this Customer Details & Branch Details!.", Error: Error });
      });
   }
};

//Delete_All_Notifications_List
exports.Delete_All_Notifications_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Customer || ReceivingData.Customer === '') {
      res.status(400).send({ Success: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Success: false, Message: "Customer Category can not be empty" });
   } else {
      ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false }, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.find({ Customer: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false }, {}).exec(),
      ]).then(Response => {
         var CustomerDetails = Response[0];
         var BusinessDetails = Response[1];
         if (CustomerDetails !== null) {
            var FindQuery = {};
            var BusinessArr = [];
            if (CustomerDetails.CustomerType === 'Owner') {
            
               if (BusinessDetails.length > 0) {
                  BusinessDetails.map(Obj => {
                     BusinessArr.push(mongoose.Types.ObjectId(Obj._id));
                  });
               }
            } else if (CustomerDetails.CustomerType === 'User') {
               if (CustomerDetails.BusinessAndBranches.length > 0) {
                  CustomerDetails.BusinessAndBranches.map(Obj => {
                     
                     if (Obj.Business.length !== null) {
                           BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                     }
                  });
               }
            }

            if (ReceivingData.CustomerCategory === 'Seller') {
               FindQuery = {
                  Business: { $in: BusinessArr },
                  $or: [{ Notification_Type: "SellerRequestSend" },
                  { Notification_Type: "SellerRequestAccepted" },
                  { Notification_Type: "SellerInvoiceCreated" },
                  { Notification_Type: "SellerInvoiceAccept" },
                  { Notification_Type: "SupportAdminReply" },
                  { Notification_Type: "SupportAdminClosed" },
                  { Notification_Type: "SellerInvoiceDisputed" },
                  { Notification_Type: "SellerChangedInvite" }],
                  ActiveStatus: true, IfDeleted: false
               };
            } else if (ReceivingData.CustomerCategory === 'Buyer') {
               FindQuery = {
                  Business: { $in: BusinessArr },
                  $or: [{ Notification_Type: "BuyerRequestSend" },
                  { Notification_Type: "BuyerRequestAccepted" },
                  { Notification_Type: "BuyerInvoiceCreated" },
                  { Notification_Type: "BuyerInvoiceDisputed" },
                  { Notification_Type: "SupportAdminReply" },
                  { Notification_Type: "SupportAdminClosed" },
                  { Notification_Type: "BuyerPaymentAccepted" },
                  { Notification_Type: "BuyerPaymentDisputed" },
                  { Notification_Type: "BuyerChangedInvite" }],
                  ActiveStatus: true, IfDeleted: false
               };
            }

            NotificationModel.NotificationSchema.find(FindQuery, {}, {})
               .exec(function (err, result) {
                  if (err) {
                     res.status(417).send({ Success: false, Message: "Some error occurred while Find The Notification Details!.", Error: err });
                  } else {
                     var Notification_Ids = [];
                     result.map(obj => {
                        Notification_Ids.push(obj._id);
                     });
                     var NotificationCounts = result.length;
                     NotificationModel.NotificationSchema.updateMany({ _id: { $in: Notification_Ids } }, { $set: {  ActiveStatus:false,IfDeleted:true } }).exec();
                     res.status(200).send({ Success: true,  Message: "Sucessfully Deleted All Notifications!"  });
                  }
               });
         } else {
            res.status(400).send({ Status: false, Message: "Invalid Customer Details" });
         }
      }).catch(Error => {
         ErrorHandling.ErrorLogCreation(req, 'All Notifications List Error', 'Common.Controller -> All_Notifications_List', JSON.stringify(Error));
         res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to complete this Customer Details & Branch Details!.", Error: Error });
      });
   }
};

// User Viewed for Notification
exports.Notification_Viewed_Update = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.NotificationID || ReceivingData.NotificationID === '') {
      res.status(400).send({ Success: false, Message: "Notification Details can not be empty" });
   } else {
      ReceivingData.NotificationID = mongoose.Types.ObjectId(ReceivingData.NotificationID);
      NotificationModel.NotificationSchema.updateOne({ _id: ReceivingData.NotificationID }, { $set: { Message_Viewed: true } })
         .exec(function (err, result) {
            if (err) {
               res.status(417).send({ Success: false, Message: "Some error occurred while Find The Notification Details!.", Error: err });
            } else {
               res.status(200).send({ Success: true, Message: 'Notification View Updated' });
            }
         });
   }
};


// User Viewed Notifications Delete
exports.Viewed_Notifications_Delete = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.NotificationID || ReceivingData.NotificationID === '') {
      res.status(400).send({ Http_Code: 400, Success: false, Message: "Notification Details can not be empty" });
   } else {
      ReceivingData.NotificationID = mongoose.Types.ObjectId(ReceivingData.NotificationID);
      NotificationModel.NotificationSchema.updateOne({ _id: ReceivingData.NotificationID, $or: [{ Message_Viewed: true }, { Message_Viewed: false }] }, { $set: { IfDeleted: true } })
         .exec(function (err, result) {
            if (err) {
               res.status(417).send({ Success: false, Message: "Some error occurred while Find The Notification Details!.", Error: err });
            } else {
               res.status(200).send({ Success: true, Message: 'Viewed Notifications Deleted' });
            }
         });
   }
};


// Industries List 
exports.SimpleIndustriesList = function (req, res) {
   IndustryManagement.IndustrySchema.find({ Active_Status: true, If_Deleted: false }, { Industry_Name: 1 }, {}).exec(function (err, result) {
      if (err) {
         ErrorHandling.ErrorLogCreation(req, 'Industries List Getting Error', 'Common.controller -> IndustriesList', JSON.stringify(err));
         res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Industries List!", Error: err });
      } else {
         res.status(200).send({ Status: true, Response: result });
      }
   });
};


// QR Code Scanning
exports.QRCodeScanning = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.QRToken || ReceivingData.QRToken === '') {
      res.status(400).send({ Status: false, Message: "QR Token can not be empty" });
   } else if (!ReceivingData.LoginId || ReceivingData.LoginId === '') {
      res.status(400).send({ Status: false, Message: "Login ID can not be empty" });
   } else {
      ReceivingData.LoginId = mongoose.Types.ObjectId(ReceivingData.LoginId);
      SocketAndQRModel.SocketSchema.findOne({ QRToken: ReceivingData.QRToken, SocketConnection: true, ActiveStatus: true, IfDeleted: false }, {}).exec((err, result) => {
         if (err) {
            ErrorHandling.ErrorLogCreation(req, 'QRCode Details Find Error', 'Common.Controller -> QRCodeScanning', JSON.stringify(err));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to complete this QR Code Scanning Error!.", Error: err });
         } else {
            if (result !== null) {
               LoginHistory.LoginHistorySchema.findOne({ _id: ReceivingData.LoginId, LoginFrom: 'APP', ActiveStatus: true, IfDeleted: false }, {}).exec((err1, result1) => {
                  if (err1) {
                     ErrorHandling.ErrorLogCreation(req, 'Mobile Number Find Error', 'Common.Controller -> QRCode Scanning', JSON.stringify(err1));
                     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to verify this mobile number!", Error: err1 });
                  } else {
                     if (result1 !== null) {
                        result.LoginId = result1._id;
                        result.save();
                        IO.on('connection', function (socket) {
                           // console.log('A User Connected');
                        });
                        res.status(200).send({ Status: true, Message: '' });
                     } else {
                        res.status(200).send({ Status: false, Message: 'Invalid Login Details' });
                     }
                  }
               });
            } else {
               res.status(200).send({ Status: false, Message: 'Invalid QR Code Details' });
            }
         }
      });
   }
};


// Logout
exports.LogOut = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Mobile || ReceivingData.Mobile === '') {
      res.status(417).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ Mobile: ReceivingData.Mobile, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var CustomerDetails = Response[0];
         if (CustomerDetails !== null) {
            CustomerDetails.Firebase_Token = '';
            CustomerDetails.Device_Id = '';
            CustomerDetails.Device_Type = '';
            CustomerDetails.save(function (err, result) {
               if (err) {
                  ErrorHandling.ErrorLogCreation(req, 'DeRegister Error', 'Common.Controller -> DeRegister Update', JSON.stringify(err));
                  res.status(417).send({ Status: false, Message: "Some error occurred while Creating the Common Management!.", Error: err });
               } else {
                  LoginHistory.LoginHistorySchema.updateMany({ Mobile: ReceivingData.Mobile, LoginFrom: 'APP' },
                     {
                        $set: {
                           LastActive: new Date(),
                           ActiveStatus: false,
                           IfDeleted: true
                        }
                     }).exec();
                  res.status(200).send({ Status: true, Message: 'Logout SuccessFully' });
               }
            });
         } else {
            res.status(400).send({ Status: false, Message: "Some Occurred Error!" });
         }
      }).catch(Error => {
         res.status(400).send({ Status: false, Message: "Some Occurred Error!" });
      });
   }
};



// User Details Delete
exports.DeviceDeRegister = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(417).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         LoginHistory.LoginHistorySchema.findOne({ User: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var CustomerDetails = Response[0];
         var LoginDetails = Response[1];
         if (CustomerDetails !== null) {
            CustomerDetails.Firebase_Token = '';
            CustomerDetails.Device_Id = '';
            CustomerDetails.Device_Type = '';
            CustomerDetails.save(function (err, result) {
               if (err) {
                  ErrorHandling.ErrorLogCreation(req, 'DeRegister Error', 'Common.Controller -> DeRegister Update', JSON.stringify(err));
                  res.status(417).send({ Status: false, Message: "Some error occurred while Creating the Common Management!.", Error: err });
               } else {
                  if (LoginDetails !== null) {
                     LoginDetails.LastActive = new Date();
                     LoginDetails.ActiveStatus = false;
                     LoginDetails.IfDeleted = true;
                     LoginDetails.save(function (err_1, result_1) {
                        if (err_1) {
                           ErrorHandling.ErrorLogCreation(req, 'Login history update Error', 'Common.Controller -> LoginHistory Updated Error', JSON.stringify(err_1));
                           res.status(417).send({ Status: false, Message: "Some error occurred while Creating the Common Management!.", Error: err_1 });
                        } else {
                           res.status(200).send({ Status: true, Message: 'DeRegister SuccessFully Updated' });
                        }
                     });
                  } else {
                     res.status(200).send({ Status: true, Message: 'DeRegister SuccessFully Updated' });
                  }
               }
            });
         } else {
            res.status(400).send({ Status: false, Message: "Some Occurred Error!" });
         }
      }).catch(Error => {
         res.status(400).send({ Status: false, Message: "Some Occurred Error!" });
      });
   }
};

// All Notifications List
exports.Web_All_Notifications_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.User || ReceivingData.User === '') {
       res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
       ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
       NotificationModel.NotificationSchema.find({
           CustomerID: ReceivingData.User,
           ActiveStatus: true, IfDeleted: false
       }, {}, { 'sort': { createdAt: -1 } })
           .exec(function (err, result) {
               if (err) {
                   res.status(417).send({ Status: false, Message: "Some error occurred while Find The Notification Details!.", Error: err });
               } else {
                   var Notification_Ids = [];
                   result.map(obj => {
                       Notification_Ids.push(obj._id);
                   });
                   NotificationModel.NotificationSchema.updateMany({ _id: { $in: Notification_Ids } }, { $set: { Message_Received: true } }).exec();
                   res.status(200).send({ Status: true, Response: result });
               }
           });
   }
};


// Delete All Read Notifications
exports.Web_DeleteAllReadNotifications = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.User || ReceivingData.User === '') {
       res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
       ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
       NotificationModel.NotificationSchema.updateMany({
           CustomerID: ReceivingData.User,
           Message_Viewed: true,
           ActiveStatus: true, IfDeleted: false
       }, { $set: { IfDeleted: true } })
           .exec(function (err, result) {
               if (err) {
                   res.status(417).send({ Status: false, Message: "Some error occurred while Find The Notification Details!.", Error: err });
               } else {
                   res.status(200).send({ Status: true, Message: "Successfully Update for Notification", Response: result });
               }
           });
   }
};

// Mark All As Read Notifications
exports.Web_MarkAllAsReadNotifications = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.User || ReceivingData.User === '') {
       res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
       ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
       NotificationModel.NotificationSchema.updateMany({
           CustomerID: ReceivingData.User,
           ActiveStatus: true, IfDeleted: false
       }, { $set: { Message_Viewed: true } })
           .exec(function (err, result) {
               if (err) {
                   res.status(417).send({ Status: false, Message: "Some error occurred while Find The Notification Details!.", Error: err });
               } else {
                   res.status(200).send({ Status: true, Message: "SuccessFully Mark All As Read Notification", Response: result });
               }
           });
   }
};



// Web_Login System
exports.CustomerWebLogin = function (req, res) {
   var ReceivingData = req.body;
   var currentDate = new Date();
   var startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
   var endOfDay = new Date(currentDate.setHours(23, 59, 59, 999));
   LoginHistory.LoginHistorySchema.updateMany(
      { $and: [{ LastActive: { $gte: startOfDay } }, { LastActive: { $lte: endOfDay } }], ActiveStatus: true, IfDeleted: false },
      { $set: { ActiveStatus: false } }
   ).exec();

   if (!ReceivingData.Mobile || ReceivingData.Mobile === '') {
      res.status(400).send({ Status: false, Message: "Mobile can not be empty" });
   } else {
      LoginHistory.LoginHistorySchema
         .findOne({
            'Mobile': ReceivingData.Mobile,
            $and: [{ LastActive: { $gte: startOfDay } }, { LastActive: { $lte: endOfDay } }],
            'ActiveStatus': true,
            'IfDeleted': false
         }, {}, {})
         .exec(function (err, result) {
            if (err) {
               res.status(417).send({ Status: false, ErrorCode: 417, Message: "Some error occurred while Validate The User Details!." });
            } else {
               if (result === null) {
                  CustomersManagement.CustomerSchema.findOne({ Mobile: ReceivingData.Mobile, ActiveStatus: true, IfDeleted: false }, {}).exec((Error1, Response) => {
                     if (Response !== null) {
                        var RandomToken = crypto.randomBytes(32).toString("hex");
                        var UserData = JSON.parse(JSON.stringify(result));
                        var UserHash = CryptoJS.SHA512(JSON.stringify(UserData)).toString(CryptoJS.enc.Hex);
                        var Ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
                        var DeviceInfo = parser(req.headers['user-agent']);
                        var LoginFrom = JSON.stringify({
                           Ip: Ip,
                           Request_From_Origin: req.headers.origin,
                           Request_From: req.headers.referer,
                           Request_Url: req.url,
                           Request_Body: req.body,
                           If_Get: req.params,
                           Device_Info: DeviceInfo,
                        });
                        
                        const LoginHistory1 = new LoginHistory.LoginHistorySchema({
                           User: Response._id,
                           Mobile: Response.Mobile,
                           ContactName: Response.ContactName,
                           CustomerCategory: Response.CustomerCategory,
                           CustomerType: Response.CustomerType,
                           LastActive: new Date(),
                           LoginFrom: LoginFrom,
                           Firebase_Token: '',
                           Device_Id: '',
                           Device_Type: 'Web',
                           ActiveStatus: true,
                           IfDeleted: false,
                        });
                        LoginHistory1.save((err_2, result_2) => {
                           if (err_2) {
                              res.status(417).send({ Status: false, Message: "Some error occurred while Validate Update the User Details!" });
                           } else {
                              var ReturnResponse = CryptoJS.AES.encrypt(JSON.stringify(result_2), RandomToken.slice(3, 10)).toString();
                              res.status(200).send({ Status: true, Http_Code: 200, Key: RandomToken, Response: ReturnResponse });
                           }
                        });
                     } else {
                        res.status(200).send({ Status: true, Http_Code: 201 });
                     }
                  });
               }
            }
         });
   }
};

// Web_Status Verify
exports.WebStatusVerify = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Mobile || ReceivingData.Mobile === '') {
      res.status(400).send({ Status: false, Message: "Mobile Number can not be empty" });
   } else {
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ Mobile: ReceivingData.Mobile, ActiveStatus: true, IfDeleted: false }, {}).exec(),
         LoginHistory.LoginHistorySchema.find({ Mobile: ReceivingData.Mobile }, {}).exec(),
         LoginHistory.LoginHistorySchema.findOne({ Mobile: ReceivingData.Mobile, LoginFrom: 'APP', ActiveStatus: true, IfDeleted: false }, {}).exec(),
      ]).then(Response => {
         var CustomerVerify = Response[0];
         var ExistingLoginHistory = Response[1];
         var DeviceIdChecking = Response[2];

         if (CustomerVerify === null) {
            res.status(200).send({ Http_Code: 200, Status: true });
         } else if (ExistingLoginHistory.length === 0) {
            res.status(200).send({ Http_Code: 201, Status: true });
         } else if (DeviceIdChecking !== null) {
            res.status(200).send({ Http_Code: 201, Status: true });
         } else {
            const AnotherDevice = ExistingLoginHistory.filter(obj => obj.ActiveStatus === true && obj.IfDeleted === false);
            if (AnotherDevice.length > 0) {
               res.status(200).send({ Http_Code: 201, Status: true });
            } else {
               res.status(200).send({ Http_Code: 201, Status: true });
            }
         }
      }).catch(Error => {
         ErrorHandling.ErrorLogCreation(req, 'Status verify Error', 'Common.Controller -> StatusVerify', JSON.stringify(Error));
         res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to complete this Status Verify!.", Error: Error });
      });
   }
};