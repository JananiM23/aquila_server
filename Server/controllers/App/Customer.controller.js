var mongoose = require('mongoose');
var CustomersManagement = require('../../Models/CustomerManagement.model');
var ErrorHandling = require('../../Handling/ErrorHandling').ErrorHandling;
var BusinessAndBranchManagement = require('../../Models/BusinessAndBranchManagement.model');
var InviteManagement = require('../../Models/Invite_Management.model');
var LoginHistory = require('../../Models/login_system.model');
var InvoiceManagement = require('../../Models/InvoiceManagement.model');
var PaymentManagement = require('../../Models/PaymentManagement.model');
var LocationManagement = require('../../Models/global_management.model');
var moment = require("moment");
const fs = require('fs');
var CryptoJS = require("crypto-js");
var crypto = require("crypto");
var parser = require('ua-parser-js');
var fsExtra = require('fs-extra');
const axios = require('axios');
const { log } = require('console');
const { type } = require('os');
const { promises } = require('readline');
const TemporaryCreditModel = require('../../Models/TemporaryCredit.model');
var options = {
   priority: 'high',
   timeToLive: 60 * 60 * 24
};

// Owner Registration
exports.OwnerRegister = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.ContactName || ReceivingData.ContactName === '') {
      res.status(400).send({ Status: false, Message: "Contact name can not be empty" });
   } else if (!ReceivingData.Mobile || ReceivingData.Mobile === '') {
      res.status(400).send({ Status: false, Message: "Mobile number can not be empty" });
   } else if (!ReceivingData.State || ReceivingData.State === '') {
      res.status(400).send({ Status: false, Message: "State can not be empty" });
   } else if (!ReceivingData.Firebase_Token || ReceivingData.Firebase_Token === '') {
      res.status(400).send({ Status: false, Message: "Firebase token can not be empty" });
   } else if (!ReceivingData.Device_Id || ReceivingData.Device_Id === '') {
      res.status(400).send({ Status: false, Message: "Device id can not be empty" });
   } else if (!ReceivingData.Device_Type || ReceivingData.Device_Type === '') {
      res.status(400).send({ Status: false, Message: "Device type can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer category can not be empty" });
   } else {
      Promise.all([
         CustomersManagement.CustomerSchema.find({ Mobile: ReceivingData.Mobile }, {}, {}).exec(),
         CustomersManagement.CustomerSchema.findOne({}, {}, { sort: { createdAt: -1 } }).exec(),
         InviteManagement.InviteManagementSchema.findOne({ Mobile: ReceivingData.Mobile, ActiveStatus: true, Invite_Status: "Pending_Approval", IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var existCustomer = Response[0];
         var LastCustomer = Response[1];
         var InvitedDetails = Response[2];
         if (existCustomer.length === 0) {
            var LastReferralCode = LastCustomer !== null ? (LastCustomer.Referral_Unique + 1) : 1;
            ReceivingData.State = mongoose.Types.ObjectId(ReceivingData.State);
            const CreateOwner = new CustomersManagement.CustomerSchema({
               ContactName: ReceivingData.ContactName,
               ReferralCode: 'AQUIL-' + LastReferralCode.toString().padStart(9, '0'),
               Referral_Unique: LastReferralCode,
               Mobile: ReceivingData.Mobile,
               Email: ReceivingData.Email || '',
               State: ReceivingData.State || null,
               CustomerCategory: ReceivingData.CustomerCategory,
               CustomerType: 'Owner',
               IfUserBusiness: true,
               BusinessAndBranches: [],
               HundiScore: 0,
               IfSellerUserPaymentApprove: true,
               IfBuyerUserInvoiceApprove: true,
               Firebase_Token: ReceivingData.Firebase_Token,
               Device_Id: ReceivingData.Device_Id,
               Device_Type: ReceivingData.Device_Type,
               File_Name: '',
               LoginPin: null,
               Owner: null,
               ActiveStatus: true,
               IfDeleted: false
            });
            CreateOwner.save(function (err, result) {
               if (err) {
                  ErrorHandling.ErrorLogCreation(req, 'Owner register DB error', 'Customer.controller -> OwnerRegister', JSON.stringify(err));
                  res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to complete this registration!.", Error: JSON.stringify(err) });
               } else {
                  if (InvitedDetails !== null) {
                     if (InvitedDetails.Buyer === null && InvitedDetails.Seller !== null) {
                        InviteManagement.InviteManagementSchema.updateOne(
                           { "_id": InvitedDetails._id },
                           {
                              $set: {
                                 "Buyer": mongoose.Types.ObjectId(result._id),
                              }
                           }
                        ).exec();
                     } else if (InvitedDetails.Buyer !== null && InvitedDetails.Seller === null) {
                        InviteManagement.InviteManagementSchema.updateOne(
                           { "_id": InvitedDetails._id },
                           {
                              $set: {
                                 "Seller": mongoose.Types.ObjectId(result._id),
                              }
                           }
                        ).exec();
                     }
                  }
                  res.status(200).send({ Status: true, Response: result });
               }
            });
         } else {
            res.status(200).send({ Status: false, Message: "This number already registered!." });
         }
      }).catch(error => {
         ErrorHandling.ErrorLogCreation(req, 'Owner registration error', 'Customer.controller -> OwnerRegister', JSON.stringify(error));
         res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: JSON.stringify(error) });
      });
   }
};

exports.OwnerRegisterMobile = async (req, res) => {
   const { ContactName, id, Email, State, CustomerCategory } = req.body;
   console.log('req.body', req.body);
   // update name, email, state, category to the user 
   try {
      const user = await CustomersManagement.CustomerSchema.findById(id);
      if (!user) {
         return res.status(404).json({ Status: false, Message: 'User not found' });
      }
      user.ContactName = ContactName;
      user.Email = Email;
      user.State = State;
      user.CustomerCategory = CustomerCategory == 'Both' ? 'BothSellerBuyer' : CustomerCategory;
      await user.save();
      console.log('user', user);
      return res.status(200).json({ Status: true, Message: 'User updated successfully', Response: user});
   } catch (error) {
      return res.status(500).json({  Status: false, Message: 'Internal server error' });
   }

};



//Web Owner Register
exports.OwnerWebRegister = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.ContactName || ReceivingData.ContactName === '') {
      res.status(400).send({ Status: false, Message: "Contact Name can not be empty" });
   } else if (!ReceivingData.Mobile || ReceivingData.Mobile === '') {
      res.status(400).send({ Status: false, Message: "Mobile Number can not be empty" });
   } else {
      Promise.all([
         CustomersManagement.CustomerSchema.find({ Mobile: ReceivingData.Mobile, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         CustomersManagement.CustomerSchema.findOne({}, {}, { sort: { createdAt: -1 } }).exec(),
         InviteManagement.InviteManagementSchema.findOne({ Mobile: ReceivingData.Mobile, ActiveStatus: true, Invite_Status: "Pending_Approval", IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         
         var InvitedDetails = Response[2];
         if (Response[0].length === 0) {
            var IfBuyerUserPaymentApprove = false;
            var IfBuyerUserPaymentANotify = false;
            var IfSellerUserPaymentApprove = false;
            var IfSellerUserPaymentANotify = false;
            var IfBuyerUserInvoiceApprove = false;
            if (ReceivingData.CustomerCategory === 'Seller') {
               IfSellerUserPaymentApprove = true;
               IfSellerUserPaymentANotify = true;
               IfBuyerUserInvoiceApprove = true;
            } else if (ReceivingData.CustomerCategory === 'Buyer') {
               IfBuyerUserPaymentApprove = true;
               IfBuyerUserPaymentANotify = true;
            } else {
               IfSellerUserPaymentApprove = true;
               IfSellerUserPaymentANotify = true;
               IfBuyerUserInvoiceApprove = true;
               IfBuyerUserPaymentApprove = true;
               IfBuyerUserPaymentANotify = true;
            }
            var LastCustomer = Response[1];
            var LastReferralCode = LastCustomer !== null ? (LastCustomer.Referral_Unique + 1) : 1;
            ReceivingData.State = mongoose.Types.ObjectId(ReceivingData.State._id);
            const Create_Buyer = new CustomersManagement.CustomerSchema({
               ContactName: ReceivingData.ContactName,
               ReferralCode: 'AQUIL-' + LastReferralCode.toString().padStart(9, '0'),
               Referral_Unique: LastReferralCode,
               Mobile: ReceivingData.Mobile,
               Email: ReceivingData.Email,
               State: ReceivingData.State,
               CustomerCategory: ReceivingData.CustomerCategory,
               CustomerType: 'Owner',
               IfUserBusiness: false,
               BusinessAndBranches: [],
               HundiScore: 0,
               IfBuyerUserPaymentApprove: IfBuyerUserPaymentApprove || false, 
               IfBuyerUserPaymentNotify: IfBuyerUserPaymentANotify || false,
               IfSellerUserPaymentApprove: IfSellerUserPaymentApprove || false,
               IfSellerUserPaymentNotify: IfSellerUserPaymentANotify || false,
               IfBuyerUserInvoiceApprove: IfBuyerUserInvoiceApprove || false, 
               Firebase_Token: '',
               Device_Id: '',
               Device_Type: 'Web',
               File_Name: '',
               LoginPin: null,
               Owner: null,
               ActiveStatus: true,
               IfDeleted: false
            });

            Create_Buyer.save(function (err, result) {
               if (err) {
                  ErrorHandling.ErrorLogCreation(req, 'Owner Register Error', 'Customer.Controller -> OwnerRegister', JSON.stringify(err));
                  res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to complete this registration!.", Error: err });
               } else {

                  if (InvitedDetails !== null) {
                     if (InvitedDetails.Buyer === null && InvitedDetails.Seller !== null) {
                        InviteManagement.InviteManagementSchema.updateOne(
                           { "_id": InvitedDetails._id },
                           {
                              $set: {
                                 "Buyer": mongoose.Types.ObjectId(result._id),
                              }
                           }
                        ).exec();
                     } else if (InvitedDetails.Buyer !== null && InvitedDetails.Seller === null) {
                        InviteManagement.InviteManagementSchema.updateOne(
                           { "_id": InvitedDetails._id },
                           {
                              $set: {
                                 "Seller": mongoose.Types.ObjectId(result._id),
                              }
                           }
                        ).exec();
                     }
                  }
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
                     User: result._id,
                     Mobile: result.Mobile,
                     ContactName: result.ContactName,
                     CustomerCategory: result.CustomerCategory,
                     CustomerType: result.CustomerType,
                     LastActive: new Date(),
                     LoginFrom: LoginFrom,
                     Password: ReceivingData.Password,
                     Firebase_Token: '',
                     Device_Id: '',
                     Device_Type: '',
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
               }
            });
         } else {
            res.status(200).send({ Status: false, Message: "This number already registered!." });
         }
      }).catch(Error => {
         ErrorHandling.ErrorLogCreation(req, 'Owner Details Error', 'Customer.Controller -> Some occurred Error', JSON.stringify(Error));
         res.status(417).send({ Status: false, Message: "Some occurred Error!.", Error: Error });
      });
   }
};


// Customer Details
exports.CustomerDetails = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "Customer details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId }, {}, {})
         .populate({ path: 'BusinessAndBranches.Business', select: ['FirstName','LastName', 'BusinessCreditLimit'] })
         .populate({path: 'Industry', select: 'Industry_Name'})
         .exec(),
      ]).then(Response => {
         var CustomerDetails = Response[0];
         if (CustomerDetails !== null) {
            if (CustomerDetails.ActiveStatus === true &&  CustomerDetails.IfDeleted === false) {
               res.status(200).send({ Status: true, Message: '', Response: CustomerDetails });
            } else {
               res.status(400).send({ Status: false, Message: "The customer account is deleted or blocked" });
            }
         } else {
            res.status(400).send({ Status: false, Message: "Invalid user details" });
         }
      }).catch(error => {
         ErrorHandling.ErrorLogCreation(req, 'Customer details getting error', 'Customer.controller -> CustomerDetails', JSON.stringify(error));
         res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: JSON.stringify(error) });
      });
   }
};

//Customer Details

exports.Customer_Details = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "Customer details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId }, {}, {})
            .populate({ path: 'BusinessAndBranches.Business', select: ['FirstName','LastName', 'BusinessCreditLimit', 'Industry','createdAt'] })
            .populate({ path: 'State', select: ['State_Name'] }) // Add population for the State field
            .exec(),
      ]).then(Response => {
         var CustomerDetails = Response[0];
         var BusinessArray =[]
         CustomerDetails.BusinessAndBranches.forEach(Obj => {
            BusinessArray.push(mongoose.Types.ObjectId(Obj.Business._id));
         });
         FindQuery = { _id: { $in: BusinessArray } };
         BusinessAndBranchManagement.BusinessSchema.find(FindQuery, {}, {})
            .populate({ path: "Industry", select: ["Industry_Name"] })
            .exec((err, result) => {
               if (err) {
                  // console.log(err, 'errorerror');
                  ErrorHandling.ErrorLogCreation(req, 'Customer details getting error', 'Customer.controller -> CustomerDetails', JSON.stringify(err));
                  res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: JSON.stringify(err) });
               } else {
                  if (CustomerDetails !== null) {
                     if (CustomerDetails.ActiveStatus === true &&  CustomerDetails.IfDeleted === false) {
                        // Include industry details in the BusinessAndBranches array
                        const modifiedBusinessAndBranches = CustomerDetails.BusinessAndBranches.map(branch => ({
                           branch,
                           Industry: result.find(industry => industry._id.toString() === branch.Business._id.toString()).Industry,
                        }));
                        
                        // Construct the desired response
                        const expectedResponse = {
                           Status: true,
                           Message: 'Customer Details List !',
                           Response: {
                              ...CustomerDetails.toObject(),
                              BusinessAndBranches: modifiedBusinessAndBranches,
                           },
                        };
                        res.status(200).send(expectedResponse);
                     } else {
                        res.status(400).send({ Status: false, Message: "The customer account is deleted or blocked" });
                     }
                  } else {
                     res.status(400).send({ Status: false, Message: "Invalid user details" });
                  }
               }
            });
      }).catch(error => {
         // console.log(error, 'errorerror');
         ErrorHandling.ErrorLogCreation(req, 'Customer details getting error', 'Customer.controller -> CustomerDetails', JSON.stringify(error));
         res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: JSON.stringify(error) });
      });
   }
};




// Customer Details Update 
exports.CustomerDetailsUpdate = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "Customer details can not be empty" });
   } else if (!ReceivingData.ContactName || ReceivingData.ContactName === '') {
      res.status(400).send({ Status: false, Message: "Contact name can not be empty" });
   } else if (!ReceivingData.Mobile || ReceivingData.Mobile === '') {
      res.status(400).send({ Status: false, Message: "Mobile number can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var CustomerDetails = Response[0];
         if (CustomerDetails !== null) {
            Promise.all([
               CustomersManagement.CustomerSchema.find({ Mobile: ReceivingData.Mobile, _id: { $ne: CustomerDetails._id } }, {}, {}).exec(),
               CustomersManagement.CustomerSchema.findOne({ Mobile: ReceivingData.Mobile, _id: CustomerDetails._id }, {}, {}).exec(),
            ]).then(ResponseRes => {
               var ExistingMobile = ResponseRes[0];
               var NewMobile = ResponseRes[1];
               if (ExistingMobile.length === 0) {
                  CustomerDetails.ContactName = ReceivingData.ContactName;
                  CustomerDetails.Mobile = ReceivingData.Mobile;
                  CustomerDetails.Email = ReceivingData.Email;
                  CustomerDetails.save(function (err1, result1) {
                     if (err1) {
                        ErrorHandling.ErrorLogCreation(req, 'Owner details update error', 'Customer.controller -> CustomerDetailsUpdate', JSON.stringify(err1));
                        res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to update the customer details!.", Error: err1 });
                     } else {
                        if (NewMobile === null) {
                           LoginHistory.LoginHistorySchema.updateMany({ Mobile: CustomerDetails.Mobile },
                              {
                                 $set: {
                                    Mobile: ReceivingData.Mobile,
                                 }
                              }).exec();
                           InviteManagement.InviteManagementSchema.updateMany({ Mobile: CustomerDetails.Mobile },
                              {
                                 $set: {
                                    Mobile: ReceivingData.Mobile
                                 }
                              }).exec();
                        }
                        res.status(200).send({ Status: true, Message: "Customer details successfully updated", Response: result1 });
                     }
                  });
               } else {
                  res.status(200).send({ Status: false, Message: "Already this mobile number used on another device" });
               }
            }).catch(error => {
               ErrorHandling.ErrorLogCreation(req, 'Customer details update error', 'Customer.controller -> CustomerDetailsUpdate', JSON.stringify(error));
               res.status(417).send({ Status: false, Message: "Some error occurred will update the customer details!", Error: JSON.stringify(error) });
            });
         } else {
            res.status(400).send({ Status: false, Message: "Invalid Customer Details" });
         }
      }).catch(error => {
         ErrorHandling.ErrorLogCreation(req, 'User Details Error', 'Customer.Controller -> CustomerDetailsUpdate', JSON.stringify(error));
         res.status(417).send({ Status: false, Message: "Some error occurred will update the customer details!.", Error: JSON.stringify(error) });
      });
   }
};


// Switch To BothBuyerAndBuyer
exports.SwitchTo_BothBuyerAndSeller = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "Customer details can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer category details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(function (err, result) {
         if (err) {
            ErrorHandling.ErrorLogCreation(req, 'Owner details getting error', 'Customer.controller -> SwitchTo_BothBuyerAndSeller', JSON.stringify(err));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to find the owner details!.", Error: JSON.stringify(err) });
         } else {
            if (result !== null) {
               result.CustomerCategory = ReceivingData.CustomerCategory;
               result.save(function (err1, result1) {
                  if (err1) {
                     ErrorHandling.ErrorLogCreation(req, 'Owner category update error', 'Customer.controller -> SwitchTo_BothBuyerAndSeller', JSON.stringify(err1));
                     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to update the owner category!.", Error: JSON.stringify(err1) });
                  } else {
                     res.status(200).send({ Status: true, Message: '', Response: result1 });
                  }
               });
            } else {
               res.status(400).send({ Status: false, Message: "Invalid Owner Details!" });
            }
         }
      });
   }
};


// Owner Against User List
exports.OwnerAgainstUserList = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "Owner details can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer category can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var OwnerDetails = Response[0];
         if (OwnerDetails !== null) {
            CustomersManagement.CustomerSchema.find({ Owner: ReceivingData.CustomerId, CustomerCategory: ReceivingData.CustomerCategory, CustomerType: 'User', ActiveStatus: true, IfDeleted: false }, {}, {})
               .populate({ path: 'BusinessAndBranches.Business', select: ['FirstName','LastName', 'BusinessCreditLimit'] })
               .exec(function (err, result) {
                  if (err) {
                     ErrorHandling.ErrorLogCreation(req, 'User details list getting error', 'Customer.controller -> OwnerAgainstUserList', JSON.stringify(err));
                     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the users list!.", Error: JSON.stringify(err) });
                  } else {
                     if (result.length !== 0) {
                        result = JSON.parse(JSON.stringify(result));
                        result = result.map(obj => {
                           obj.BusinessAndBranches = obj.BusinessAndBranches.map(objNew => {
                              delete objNew.Branches;
                              return objNew;
                           });
                           return obj;
                        });
                             // Assuming response is the array of objects you have
                             result.sort(function(a, b) {
                              // Convert both names to lowercase for case-insensitive comparison
                              var nameA = a.ContactName.toLowerCase();
                              var nameB = b.ContactName.toLowerCase();
                              // Compare the names using the localeCompare method
                              return nameA.localeCompare(nameB);
                           });
 

                        res.status(200).send({ Status: true, Message: 'User details List', Response: result });
                     } else {
                        res.status(200).send({ Status: false, Message: "User details are empty!" });
                     }
                  }
               });
         } else {
            res.status(400).send({ Status: false, Message: "Invalid owner details" });
         }
      }).catch(error => {
         ErrorHandling.ErrorLogCreation(req, 'Owner details getting error', 'Customer.controller -> OwnerAgainstUserList', JSON.stringify(error));
         res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: error });
      });
   }
};

// User Create ---------------> this Web service need for Android Mobiles

//acording to category make changes that's it.
exports.User_Create = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.ContactName || ReceivingData.ContactName === '') {
      res.status(400).send({ Status: false, Message: "Contact Name can not be empty" });
   } else if (!ReceivingData.Mobile || ReceivingData.Mobile === '') {
      res.status(400).send({ Status: false, Message: "Mobile Number can not be empty" });
   } else if (!ReceivingData.Owner || ReceivingData.Owner === '') {
      res.status(400).send({ Status: false, Message: "Owner details can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
   } else if (!ReceivingData.BusinessAndBranches || ReceivingData.BusinessAndBranches.length === 0) {
      res.status(400).send({ Status: false, Message: "Business And Branches can not be empty" });
   } else {
      ReceivingData.Owner = mongoose.Types.ObjectId(ReceivingData.Owner);
      if (Array.isArray(ReceivingData.BusinessAndBranches) && ReceivingData.BusinessAndBranches.length !== 0) {
         var BusinessArray = [];
         // var BranchesArray = [];
         ReceivingData.BusinessAndBranches.map(Obj => {
            Obj.Business = mongoose.Types.ObjectId(Obj.Business);
            BusinessArray.push(Obj.Business);
            // Obj.Branches.map(obj => {
            //    obj = mongoose.Types.ObjectId(obj);
            //    BranchesArray.push(obj);
            // });
         });
      }
      CustomersManagement.CustomerSchema.findOne({
         _id: ReceivingData.Owner, CustomerType: 'Owner', ActiveStatus: true, IfDeleted: false
      }, {}, {}).exec(function (err, result) {
         if (err) {
            ErrorHandling.ErrorLogCreation(req, 'Owner Details Getting Error', 'Common.Controller -> Owner details', JSON.stringify(err));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Owner details!.", Error: err });
         } else {
            if (result !== null) {
               Promise.all([
                  CustomersManagement.CustomerSchema.findOne({ Mobile: ReceivingData.Mobile, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                  CustomersManagement.CustomerSchema.find({ Mobile: ReceivingData.Mobile, ActiveStatus: false, IfDeleted: true }, {}, {}).exec(),
                  CustomersManagement.CustomerSchema.findOne({}, {}, { sort: { Referral_Unique: -1 } }).exec(),
                  InviteManagement.InviteManagementSchema.findOne({ Mobile: ReceivingData.Mobile, ActiveStatus: true, Invite_Status: "Pending_Approval", IfDeleted: false }, {}, {}).exec(),
                  BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.BusinessAndBranches[0].Business, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
               ]).then(Response => {
                  var NewCustomer = Response[0];
                  var ExistingCustomer = Response[1];
                  var LastCustomer = Response[2];
                  var InviteDetails = Response[3];
                  var BusinessDetails = Response[4];
                 
                  if (NewCustomer === null && ExistingCustomer.length === 0 && BusinessDetails !== null) {
                     var LastReferralCode = LastCustomer !== null ? (LastCustomer.Referral_Unique + 1) : 1;
                     const Create_Customer = new CustomersManagement.CustomerSchema({
                        ReferralCode: 'AQUIL-' + LastReferralCode.toString().padStart(9, '0'),
                        Referral_Unique: LastReferralCode,
                        ContactName: ReceivingData.ContactName,
                        Mobile: ReceivingData.Mobile,
                        Email: ReceivingData.Email,
                        CustomerCategory: ReceivingData.CustomerCategory,
                        CustomerType: 'User',
                        IfUserBusiness: true,
                        BusinessAndBranches: ReceivingData.BusinessAndBranches || [],
                        // IfUserBranch: true,
                        State: result.State,
                        HundiScore: 0,
                        IfSellerUserPaymentApprove: ReceivingData.UserPaymentApprove || false,
                        IfBuyerUserInvoiceApprove: ReceivingData.UserInvoiceApprove || false,
                        Owner: ReceivingData.Owner || null,
                        Firebase_Token: '',
                        Device_Id: '',
                        Device_Type: '',
                        File_Name: '',
                        LoginPin: null,
                        ActiveStatus: true,
                        IfDeleted: false
                     });
                     Create_Customer.save(function (err1, result1) {
                        if (err1) {
                           ErrorHandling.ErrorLogCreation(req, 'User Register Error', 'Common.Controller -> User_Create', JSON.stringify(err1));
                           res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to complete this registration!.", Error: err1 });
                        } else {
                           if (InviteDetails !== null) {
                              if (InviteDetails.Buyer === null && InviteDetails.Seller !== null) {
                                 InviteManagement.InviteManagementSchema.updateOne(
                                    { "_id": InviteDetails._id },
                                    {
                                       $set: {
                                          "Buyer": mongoose.Types.ObjectId(ReceivingData.Owner),
                                       }
                                    }
                                 ).exec();
                              } else if (InviteDetails.Buyer !== null && InviteDetails.Seller === null) {
                                 InviteManagement.InviteManagementSchema.updateOne(
                                    { "_id": InviteDetails._id },
                                    {
                                       $set: {
                                          "Seller": mongoose.Types.ObjectId(ReceivingData.Owner),
                                       }
                                    }
                                 ).exec();
                              }
                           }
                           // BusinessAndBranchManagement.BranchSchema.updateMany({ _id: { $in: BranchesArray }, ActiveStatus: true, IfDeleted: false },
                           //    { $set: { UserAssigned: true } }).exec();
                              BusinessAndBranchManagement.BusinessSchema.updateMany({ _id: { $in: BusinessArray }, ActiveStatus: true, IfDeleted: false },
                                 { $set: { UserAssigned: true } }).exec();
                           res.status(200).send({ Status: true, Response: result1, Message: "User Successfully Created" });
                        }
                     });
                  } else {
                     res.status(200).send({ Status: false, Message: 'This number already registered' });
                  }
               }).catch(Error => {
                  ErrorHandling.ErrorLogCreation(req, 'User Details Error', 'Common.Controller -> Some occurred Error', JSON.stringify(Error));
                  res.status(417).send({ Status: false, Message: "Some occurred Error!.", Error: Error });
               });
            } else {
               res.status(417).send({ Status: false, Message: "Some occurred Error!." });
            }
         }
      });
   }
};

// User Create ---------------> this Web service need for IOS Mobiles
exports.IOS_User_Create = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.ContactName || ReceivingData.ContactName === '') {
      res.status(400).send({ Status: false, Message: "Contact Name can not be empty" });
   } else if (!ReceivingData.Mobile || ReceivingData.Mobile === '') {
      res.status(400).send({ Status: false, Message: "Mobile Number can not be empty" });
   } else if (!ReceivingData.Owner || ReceivingData.Owner === '') {
      res.status(400).send({ Status: false, Message: "Owner details can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
   } else if (!ReceivingData.BusinessAndBranches || ReceivingData.BusinessAndBranches.length === 0) {
      res.status(400).send({ Status: false, Message: "Business And Branches can not be empty" });
   } else {
      ReceivingData.Owner = mongoose.Types.ObjectId(ReceivingData.Owner);
      if (ReceivingData.BusinessAndBranches.length === 0 && ReceivingData.BusinessAndBranches.length !== 0) 
      {
         var BusinessAndBranchesArr = [];
         var BusinessArray = [];
         var BranchesArray = [];
         ReceivingData.BusinessAndBranches.map(Obj => {
            if (Obj.Branches.length > 0) {
               Obj.Branches = Obj.Branches[0];
            }
            Obj.Business = mongoose.Types.ObjectId(Obj.Business);
            Obj.Branches = mongoose.Types.ObjectId(Obj.Branches);
            BusinessArray.push(Obj.Business);
            BranchesArray.push(Obj.Branches);
            const Idx = BusinessAndBranchesArr.findIndex(objNew => JSON.parse(JSON.stringify(objNew.Business)) === JSON.parse(JSON.stringify(Obj.Business)));
            if (Idx >= 0) {
               BusinessAndBranchesArr[Idx].Branches.push(Obj.Branches);
            } else {
               BusinessAndBranchesArr.push({ Business: Obj.Business, Branches: [Obj.Branches] });
            }
         });
      }
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Owner, CustomerType: 'Owner', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(function (err, result) {
         if (err) {
            ErrorHandling.ErrorLogCreation(req, 'Owner Details Getting Error', 'Common.Controller -> Owner details', JSON.stringify(err));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Owner details!.", Error: err });
         } else {
           
            if (result !== null) {
               Promise.all([
                  CustomersManagement.CustomerSchema.findOne({ Mobile: ReceivingData.Mobile, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                  CustomersManagement.CustomerSchema.find({ Mobile: ReceivingData.Mobile, ActiveStatus: false, IfDeleted: true }, {}, {}).exec(),
                  CustomersManagement.CustomerSchema.findOne({}, {}, { sort: { Referral_Unique: -1 } }).exec(),
                  InviteManagement.InviteManagementSchema.findOne({ Mobile: ReceivingData.Mobile, ActiveStatus: true, Invite_Status: "Pending_Approval", IfDeleted: false }, {}, {}).exec(),
                  BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.BusinessAndBranches[0].Business, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
               ]).then(Response => {
                  var NewCustomer = Response[0];
                  var ExistingCustomer = Response[1];
                  var LastCustomer = Response[2];
                  var InviteDetails = Response[3];
                  var BusinessDetails = Response[4];
                  if (NewCustomer === null && ExistingCustomer.length === 0) {
                     var LastReferralCode = LastCustomer !== null ? (LastCustomer.Referral_Unique + 1) : 1;
                     const Create_Customer = new CustomersManagement.CustomerSchema({
                        ReferralCode: 'AQUIL-' + LastReferralCode.toString().padStart(9, '0'),
                        Referral_Unique: LastReferralCode,
                        ContactName: ReceivingData.ContactName,
                        Mobile: ReceivingData.Mobile,
                        Email: ReceivingData.Email,
                        CustomerCategory: ReceivingData.CustomerCategory,
                        CustomerType: 'User',
                        IfUserBusiness: true,
                        BusinessAndBranches: BusinessAndBranchesArr || [],
                        IfUserBranch: true,
                        State: result.State,
                        IfSellerUserPaymentApprove: ReceivingData.UserPaymentApprove,
                        IfBuyerUserInvoiceApprove: ReceivingData.UserInvoiceApprove,
                        Owner: ReceivingData.Owner || null,
                        Firebase_Token: "",
                        Device_Id: "",
                        Device_Type: ReceivingData.Device_Type,
                        File_Name: '',
                        LoginPin: null,
                        ActiveStatus: true,
                        IfDeleted: false
                     });
                     Create_Customer.save(function (err1, result1) {
                        if (err1) {
                           ErrorHandling.ErrorLogCreation(req, 'User Register Error', 'Common.Controller -> IOS_User_Create', JSON.stringify(err1));
                           res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to complete this registration!.", Error: err1 });
                        } else {
                           if (InviteDetails !== null) {
                              if (InviteDetails.Buyer === null && InviteDetails.Seller !== null) {
                                 InviteManagement.InviteManagementSchema.updateOne(
                                    { "_id": InviteDetails._id },
                                    {
                                       $set: {
                                          "Buyer": mongoose.Types.ObjectId(ReceivingData.Owner),
                                       }
                                    }
                                 ).exec();
                              } else if (InviteDetails.Buyer !== null && InviteDetails.Seller === null) {
                                 InviteManagement.InviteManagementSchema.updateOne(
                                    { "_id": InviteDetails._id },
                                    {
                                       $set: {
                                          "Seller": mongoose.Types.ObjectId(ReceivingData.Owner),
                                       }
                                    }
                                 ).exec();
                              }
                           }
                           BusinessAndBranchManagement.BranchSchema.updateMany({ _id: { $in: BranchesArray }, ActiveStatus: true, IfDeleted: false },
                              { $set: { UserAssigned: true } }).exec();
                           res.status(200).send({ Status: true, Response: result1, Message: "User Successfully Created" });
                        }
                     });
                  } else {
                     res.status(200).send({ Status: false, Message: 'This number already registered' });
                  }
               }).catch(Error => {
                  ErrorHandling.ErrorLogCreation(req, 'User Details Error', 'Common.Controller -> Some occurred Error', JSON.stringify(Error));
                  res.status(417).send({ Status: false, Message: "Some occurred Error!.", Error: Error });
               });
            } else {
               res.status(417).send({ Status: false, Message: "Some occurred Error!." });
            }
         }
      });
   }
};

// User Details
exports.UserDetails = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "User details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, CustomerType: 'User', ActiveStatus: true, IfDeleted: false }, {}, {})
         .populate({ path: 'BusinessAndBranches.Business', select: ['BusinessName'] }).populate({ path: "BusinessAndBranches.Branches", select: ['BranchName', 'Mobile', 'Address'] }).exec(function (err, result) {
            if (err) {
               ErrorHandling.ErrorLogCreation(req, 'User Details Error', 'Customer.Controller -> UserDetails', JSON.stringify(err));
               res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
            } else {
               if (result !== null) {
                  res.status(200).send({ Status: true, Message: 'User Details', Response: result });
               } else {
                  res.status(400).send({ Status: false, Message: "Invalid User Details!" });
               }
            }
         });
   }
};

// User Updated 
exports.UserUpdated = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.UserId || ReceivingData.UserId === '') {
      res.status(400).send({ Status: false, Message: "User details can not be empty" });
   } else if (!ReceivingData.BusinessAndBranches || ReceivingData.BusinessAndBranches.length === 0) {
      res.status(400).send({ Status: false, Message: "Business And Branches can not be empty" });
   } else {
      ReceivingData.UserId = mongoose.Types.ObjectId(ReceivingData.UserId);
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ CustomerType: 'Owner', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.UserId, CustomerType: 'User', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var BuyerOwnerDetails = Response[0];
         var BuyerUserDetails = Response[1];
         if (BuyerOwnerDetails !== null && BuyerUserDetails !== null) {
            Promise.all([
               CustomersManagement.CustomerSchema.find({ Mobile: ReceivingData.Mobile, _id: { $ne: BuyerUserDetails._id } }, {}, {}).exec(),
               CustomersManagement.CustomerSchema.findOne({ Mobile: ReceivingData.Mobile, _id: BuyerUserDetails._id }, {}, {}).exec(),
            ]).then(ResponseRes => {
               var ExistingMobile = ResponseRes[0];
               var NewMobile = ResponseRes[1];
               var NewBusiness = [];
               var OldBusiness = [];
               var PreviousBusinessRecord = [];
               var CurrentBusinessRecord = [];
               if (ExistingMobile.length === 0) {
                  if (BuyerUserDetails.BusinessAndBranches.length !== 0 && ReceivingData.BusinessAndBranches.length !== 0) {
                     ReceivingData.BusinessAndBranches.map(Obj => {
                        CurrentBusinessRecord.push(Obj.Business);
                     });
                     
                     BuyerUserDetails.BusinessAndBranches.map(Obj => {
                        PreviousBusinessRecord.push(JSON.parse(JSON.stringify(Obj.Business)));
                     });
                    

                  
                     NewBusiness = CurrentBusinessRecord.filter(x => !PreviousBusinessRecord.includes(x));
                     OldBusiness = PreviousBusinessRecord.filter(x => !CurrentBusinessRecord.includes(x));

               
                  }

                  BuyerUserDetails.ContactName = ReceivingData.ContactName;
                  BuyerUserDetails.Mobile = ReceivingData.Mobile;
                  BuyerUserDetails.Email = ReceivingData.Email;
                  BuyerUserDetails.BusinessAndBranches = ReceivingData.BusinessAndBranches;
                  BuyerUserDetails.IfSellerUserPaymentApprove = ReceivingData.UserPaymentApprove;
                  BuyerUserDetails.IfBuyerUserInvoiceApprove = ReceivingData.UserInvoiceApprove;

                  BuyerUserDetails.save( (err, result) => {
                     if (err) {
                        ErrorHandling.ErrorLogCreation(req, 'User Details Error', 'Customer.Controller -> Some occurred Error', JSON.stringify(Error));
                        res.status(417).send({ Status: false, Message: "Some occurred Error!.", Error: JSON.stringify(Error) });
                     } else {
                        if (NewMobile === null) {
                           LoginHistory.LoginHistorySchema.updateMany({ Mobile: BuyerUserDetails.Mobile },
                              {
                                 $set: {
                                    Mobile: ReceivingData.Mobile,
                                 }
                              }).exec();
                           InviteManagement.InviteManagementSchema.updateMany({ Mobile: BuyerUserDetails.Mobile },
                              {
                                 $set: {
                                    Mobile: ReceivingData.Mobile
                                 }
                              }).exec();
                        }
      
                        if (OldBusiness.length > 0) {
                              BusinessAndBranchManagement.BusinessSchema.updateMany({ _id: { $in: OldBusiness }, ActiveStatus: true, IfDeleted: false },
                                 { $set: { UserAssigned: false } }).exec();
                        }
      
                        if (NewBusiness.length > 0) {
                              BusinessAndBranchManagement.BusinessSchema.updateMany({ _id: { $in: NewBusiness }, ActiveStatus: true, IfDeleted: false },
                                 { $set: { UserAssigned: true } }).exec();
                        }
                     }
                  });

                  res.status(200).send({ Status: true, Message: "User SuccessFully Updated", Response: BuyerUserDetails });
               } else {
                  res.status(200).send({ Status: false, Message: "Already this mobile number used on another device" });
               }
            }).catch(Error => {
               res.status(400).send({ Status: false, Message: "Some Occurred Error" });
            });
         } else {
            res.status(400).send({ Status: false, Message: "Invalid User Details" });
         }
      }).catch(Error => {
         ErrorHandling.ErrorLogCreation(req, 'User Details Error', 'Customer.Controller -> Some occurred Error', JSON.stringify(Error));
         res.status(417).send({ Status: false, Message: "Some occurred Error!.", Error: Error });
      });
   }
};

// User Updated 
exports.IOS_UserUpdated = function (req, res) {
   var ReceivingData = req.body;
   
   if (!ReceivingData.UserId || ReceivingData.UserId === '') {
      res.status(400).send({ Status: false, Message: "User details can not be empty" });
   } else if (!ReceivingData.BusinessAndBranches || ReceivingData.BusinessAndBranches.length === 0) {
      res.status(400).send({ Status: false, Message: "Business And Branches can not be empty" });
   } else {
      var BusinessAndBranchesArr = [];
      var BusinessArray = [];
      var BranchesArray = [];
      ReceivingData.UserId = mongoose.Types.ObjectId(ReceivingData.UserId);
      if (ReceivingData.BusinessAndBranches.length === 0 && ReceivingData.BusinessAndBranches.length !== 0) {
         ReceivingData.BusinessAndBranches.map(Obj => {
            if (Obj.Branches.length > 0) {
               Obj.Branches = Obj.Branches[0];
            }
            Obj.Business = mongoose.Types.ObjectId(Obj.Business);
            Obj.Branches = mongoose.Types.ObjectId(Obj.Branches);
            BusinessArray.push(Obj.Business);
            BranchesArray.push(Obj.Branches);
            const Idx = BusinessAndBranchesArr.findIndex(objNew => JSON.parse(JSON.stringify(objNew.Business)) === JSON.parse(JSON.stringify(Obj.Business)));
            
            if (Idx >= 0) {
                   BusinessAndBranchesArr[Idx].Branches.push(Obj.Branches);
            } else {
                   BusinessAndBranchesArr.push({ Business: Obj.Business, Branches: [Obj.Branches] });
            }
         });
      }
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ CustomerType: 'Owner', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.UserId, CustomerType: 'User', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var BuyerOwnerDetails = Response[0];
         var BuyerUserDetails = Response[1];
         if (BuyerOwnerDetails !== null && BuyerUserDetails !== null) {
            Promise.all([
               CustomersManagement.CustomerSchema.find({ Mobile: ReceivingData.Mobile, _id: { $ne: BuyerUserDetails._id } }, {}, {}).exec(),
               CustomersManagement.CustomerSchema.findOne({ Mobile: ReceivingData.Mobile, _id: BuyerUserDetails._id }, {}, {}).exec(),
            ]).then(ResponseRes => {
               var ExistingMobile = ResponseRes[0];
               var NewMobile = ResponseRes[1];
               var NewBranches = [];
               var OldBranches = [];
               var PreviousBranchRecord = [];
               var CurrentBranchRecord = [];
               if (ExistingMobile.length === 0) {
                  // if (BuyerUserDetails.BusinessAndBranches.length !== 0) {
                  //    BuyerUserDetails.BusinessAndBranches.map(obj => {
                  //       const Idx1 = BusinessAndBranchesArr.findIndex(objNew => JSON.parse(JSON.stringify(objNew.Business)) === JSON.parse(JSON.stringify(obj.Business)));
                  //       if (Idx1 >= 0) {
                  //          if (obj.Branches.length > 0) {
                  //             obj.Branches.map(objBe => {
                  //                BusinessAndBranchesArr[Idx1].Branches.push(mongoose.Types.ObjectId(objBe));
                  //             });
                  //          }
                  //       } else {
                  //          BusinessAndBranchesArr.push({ Business: obj.Business, Branches: obj.Branches });
                  //       }
                  //    });
                  // }
                  
                  if (BuyerUserDetails.BusinessAndBranches.length !== 0 && BusinessAndBranchesArr.length !== 0) {
                     BusinessAndBranchesArr.map(Obj => {
                         Obj.Branches.map(ObjNew => { 
                           CurrentBranchRecord.push(ObjNew);
                            });
                     });
                     
                     BuyerUserDetails.BusinessAndBranches.map(Obj => {
                        Obj.Branches.map(ObjNew => { PreviousBranchRecord.push(JSON.parse(JSON.stringify(ObjNew))); });
                     });
                     NewBranches = CurrentBranchRecord.filter(x => !PreviousBranchRecord.includes(x));
                     OldBranches = PreviousBranchRecord.filter(x => !CurrentBranchRecord.includes(x));
                  }

                  CustomersManagement.CustomerSchema.updateOne({ _id: BuyerUserDetails._id },
                     {
                        $set: {
                           ContactName: ReceivingData.ContactName,
                           Mobile: ReceivingData.Mobile,
                           Email: ReceivingData.Email,
                           BusinessAndBranches: BusinessAndBranchesArr
                        }
                     }).exec();
                  if (NewMobile === null) {
                     LoginHistory.LoginHistorySchema.updateMany({ Mobile: BuyerUserDetails.Mobile },
                        {
                           $set: {
                              Mobile: ReceivingData.Mobile,
                           }
                        }).exec();

                        InviteManagement.InviteManagementSchema.updateMany({ Mobile: BuyerUserDetails.Mobile },
                           {
                              $set: {
                                 Mobile: ReceivingData.Mobile
                              }
                           }).exec();
                  }
                  // BusinessAndBranchManagement.BranchSchema.updateMany({ _id: { $in: BranchesArray }, ActiveStatus: true, IfDeleted: false },
                  //    { $set: { UserAssigned: true } }).exec();

                  if (OldBranches.length > 0) {
                     BusinessAndBranchManagement.BranchSchema.updateMany({ _id: { $in: OldBranches }, ActiveStatus: true, IfDeleted: false },
                        { $set: { UserAssigned: false } }).exec();
                  }

                  if (NewBranches.length > 0) {
                     BusinessAndBranchManagement.BranchSchema.updateMany({ _id: { $in: NewBranches }, ActiveStatus: true, IfDeleted: false },
                        { $set: { UserAssigned: true } }).exec();
                  }

                  // BuyerUserDetails.save( (err, result) => {
                  //    if (err) {
                  //       ErrorHandling.ErrorLogCreation(req, 'User Details Error', 'Customer.Controller -> Some occurred Error', JSON.stringify(Error));
                  //       res.status(417).send({ Status: false, Message: "Some occurred Error!.", Error: JSON.stringify(Error) });
                  //    } else {
                  //       if (NewMobile === null) {
                  //          LoginHistory.LoginHistorySchema.updateMany({ Mobile: BuyerUserDetails.Mobile },
                  //             {
                  //                $set: {
                  //                   Mobile: ReceivingData.Mobile,
                  //                }
                  //             }).exec();
                  //          InviteManagement.InviteManagementSchema.updateMany({ Mobile: BuyerUserDetails.Mobile },
                  //             {
                  //                $set: {
                  //                   Mobile: ReceivingData.Mobile
                  //                }
                  //             }).exec();
                  //       }
      
                  //       if (OldBranches.length > 0) {
                  //          BusinessAndBranchManagement.BranchSchema.updateMany({ _id: { $in: OldBranches }, ActiveStatus: true, IfDeleted: false },
                  //             { $set: { UserAssigned: false } }).exec();
                  //       }
      
                  //       if (NewBranches.length > 0) {
                  //          BusinessAndBranchManagement.BranchSchema.updateMany({ _id: { $in: NewBranches.Branches }, ActiveStatus: true, IfDeleted: false },
                  //             { $set: { UserAssigned: true } }).exec();
                  //       }

                 
                  //    }
                  // });

                  res.status(200).send({ Status: true, Message: "User SuccessFully Updated", Response: BuyerUserDetails });
               } else {
                  res.status(200).send({ Status: false, Message: "Already this mobile number used on another device" });
               }
            }).catch(Error => {
               res.status(400).send({ Status: false, Message: "Some Occurred Error" });
            });
         } else {
            res.status(400).send({ Status: false, Message: "Invalid User Details" });
         }
      }).catch(Error => {
         ErrorHandling.ErrorLogCreation(req, 'User Details Error', 'Customer.Controller -> Some occurred Error', JSON.stringify(Error));
         res.status(417).send({ Status: false, Message: "Some occurred Error!.", Error: Error });
      });
   }
};

// UserDelete
exports.UserDelete = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(417).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var CustomerDetails = Response[0];
         if (CustomerDetails !== null) {
            var BusinessArr = [];
            CustomerDetails.BusinessAndBranches.map(Obj => {
               BusinessArr.push(JSON.parse(JSON.stringify(Obj.Business)));
            });

            CustomerDetails.ActiveStatus = false;
            CustomerDetails.IfDeleted = true;
            CustomerDetails.Mobile = '';
            CustomerDetails.save(function (err, result) {
               if (err) {
                  ErrorHandling.ErrorLogCreation(req, 'User Details Delete Error', 'Common.Controller -> UserDetailsDelete', JSON.stringify(err));
                  res.status(417).send({ Status: false, Message: "Some error occurred while Creating the Common Management!.", Error: err });
               } else {
                  BusinessAndBranchManagement.BusinessSchema.updateMany({ _id: { $in: BusinessArr }, ActiveStatus: true, IfDeleted: false },
                     { $set: { UserAssigned: false } }).exec();
                  // Sms message for Users
                  // var SmsMessage = 'Your account is deactivated our Aquila-Team';
                  // const params = new URLSearchParams();
                  // params.append('key', '25ECE50D1A3BD6');
                  // params.append('msg', SmsMessage);
                  // params.append('senderid', 'TXTDMO');
                  // params.append('routeid', '3');
                  // params.append('contacts', CustomerDetails.Mobile);

                  // axios.post('https://sms.textmysms.com/app/smsapi/index.php', params).then(function (response) {
                  //    callback(null, response.data);
                  //  }).catch(function (error) {
                  //    callback('Some Error for Seller Invite SMS!, Error: ' + error, null);
                  //  });
                  res.status(200).send({ Status: true, Message: 'DeRegister SuccessFully Updated' });
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

// Customer Profile Upload -
//(unoptimised)
// exports.CustomerProfileUpload = function (req, res) {
//    var ReceivingData = req.body;
//    if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
//       res.status(400).send({ Status: false, Message: "Customer details can not be empty" });
//    } else if (!ReceivingData.File_Name || ReceivingData.File_Name === '') {
//       res.status(400).send({ Status: false, Message: "File Name can not be empty" });
//    } else {
//       ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
//       CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(function (err, result) {
      
//          if (err) {
//             ErrorHandling.ErrorLogCreation(req, 'CustomerProfileUpload Getting Error', 'Common.controller -> CustomerProfileUpload', JSON.stringify(err));
//             res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get CustomerProfileUpload", Error: err });
//          } else {
//             if (result !== null) {
//                // Previous Customer Image
//                if (result.File_Name !== '') {
//                   const path = 'Uploads/Customer_Profile/' + result._id + '.png';
//                   fs.unlinkSync(path);
//                }

//                // Current Image Upload
//                var reportData = ReceivingData.File_Name.replace(/^data:[a-z]+\/[a-z]+;base64,/, "").trim();
//                var buff = Buffer.from(reportData.replace(/\r?\n|\r/g, " "), 'base64');
//                const FileName = 'Uploads/Customer_Profile/' + result._id + '.png';
//                const File_Name = result._id + '.png';
//                fsExtra.writeFileSync(FileName, buff);
//                CustomersManagement.CustomerSchema.updateOne({ _id: result._id }, { File_Name: File_Name }).exec();
//                res.status(200).send({ Status: true, Message: "Customer Profile Successfully updated" });
//             } else {
//                res.status(400).send({ Status: false, Message: "Invalid Customer Details" });
//             }
//          }
//       });
//    }
// };

//Customer Profile Upload
exports.CustomerProfileUpload = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "Customer details can not be empty" });
   } else if (!ReceivingData.File_Name || ReceivingData.File_Name === '') {
      res.status(400).send({ Status: false, Message: "File Name can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(function (err, result) {
      
         if (err) {
            ErrorHandling.ErrorLogCreation(req, 'CustomerProfileUpload Getting Error', 'Common.controller -> CustomerProfileUpload', JSON.stringify(err));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get CustomerProfileUpload", Error: err });
         } else {
            if (result !== null) {
               // Previous Customer Image
               if (result.File_Name !== '') {
                  const path = 'Uploads/Customer_Profile/' + result._id + '.png';
                  if (fs.existsSync(path)) {
                     fs.unlinkSync(path);
                  } else {
                     // console.log("File does not exist at path:", path);
                  }
               }

               // Current Image Upload
               var reportData = ReceivingData.File_Name.replace(/^data:[a-z]+\/[a-z]+;base64,/, "").trim();
               var buff = Buffer.from(reportData.replace(/\r?\n|\r/g, " "), 'base64');
               const FileName = 'Uploads/Customer_Profile/' + result._id + '.png';
               const File_Name = result._id + '.png';
               fsExtra.writeFileSync(FileName, buff);
               CustomersManagement.CustomerSchema.updateOne({ _id: result._id }, { File_Name: File_Name }).exec();
               res.status(200).send({ Status: true, Message: "Customer Profile Successfully updated" });
            } else {
               res.status(400).send({ Status: false, Message: "Invalid Customer Details" });
            }
         }
      });
   }
};








// Monthly Calender
exports.MonthlyReports = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "Customer details can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer Category Details can not be empty" });
   } else if (!ReceivingData.DateOfMonth || ReceivingData.DateOfMonth === '') {
      res.status(400).send({ Status: false, Message: "Date Of Month can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(function (err, result) {
         if (err) {
            ErrorHandling.ErrorLogCreation(req, 'Customer Details Finding Getting Error', 'Common.controller -> MonthlyReports', JSON.stringify(err));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get MonthlyReports", Error: err });
         } else {
            if (result !== null) {
               var InvoiceQuery = {};
               var PaymentQuery = {};
               var UsersBusinessArr = [];
               var currentDate = new Date();
               var startOfDay = new Date(moment(ReceivingData.DateOfMonth, "DD-MM-YYYY").toDate().setHours(0, 0, 0, 0));
               var endOfDay = new Date(currentDate);
            //   if (startOfDay.valueOf() < moment().startOf("month").toDate().valueOf()) {
                  const temp = new Date(new Date(startOfDay).setMonth(startOfDay.getMonth() + 1));
                  endOfDay = new Date(new Date(temp).setDate(temp.getDate() - 1));
                  
            //   }
              // endOfDay = new Date(endOfDay.setHours(23, 59, 59, 999));
               if (ReceivingData.CustomerCategory === 'Seller') {
                  if (result.CustomerType === 'Owner') {
                     InvoiceQuery = { Seller: ReceivingData.CustomerId, $and: [{ InvoiceDate: { $gte: startOfDay } }, { InvoiceDate: { $lte: endOfDay } }], InvoiceStatus: "Accept",PaidORUnpaid:"Unpaid", ActiveStatus: true, IfDeleted: false };
                     PaymentQuery = { Seller: ReceivingData.CustomerId, $and: [{ PaymentDate: { $gte: startOfDay } }, { PaymentDate: { $lte: endOfDay } }], Payment_Status: "Pending", ActiveStatus: true, IfDeleted: false };
                  } else if (result.CustomerType === 'User') {
                     if (result.BusinessAndBranches.length > 0) {
                        result.BusinessAndBranches.map(Obj => {
                           UsersBusinessArr.push(mongoose.Types.ObjectId(Obj.Business))
                        });
                     }

                     InvoiceQuery = { Business: { $in: UsersBusinessArr }, $and: [{ InvoiceDate: { $gte: startOfDay } }, { InvoiceDate: { $lte: endOfDay } }], InvoiceStatus: "Accept", PaidORUnpaid:"Unpaid",ActiveStatus: true, IfDeleted: false };
                     PaymentQuery = { Business: { $in: UsersBusinessArr }, $and: [{ PaymentDate: { $gte: startOfDay } }, { PaymentDate: { $lte: endOfDay } }], Payment_Status: "Pending", ActiveStatus: true, IfDeleted: false };
               
                  }
               } else if (ReceivingData.CustomerCategory === 'Buyer') {
                  if (result.CustomerType === 'Owner') {
                     InvoiceQuery = { Buyer: ReceivingData.CustomerId, $and: [{ InvoiceDate: { $gte: startOfDay } }, { InvoiceDate: { $lte: endOfDay } }], InvoiceStatus: "Accept",PaidORUnpaid:"Unpaid", ActiveStatus: true, IfDeleted: false };
                     PaymentQuery = { Buyer: ReceivingData.CustomerId, $and: [{ PaymentDate: { $gte: startOfDay } }, { PaymentDate: { $lte: endOfDay } }], Payment_Status: "Pending", ActiveStatus: true, IfDeleted: false };
                  } else if (result.CustomerType === 'User') {
                     if (result.BusinessAndBranches.length > 0) {
                        result.BusinessAndBranches.map(Obj => {
                           UsersBusinessArr.push(mongoose.Types.ObjectId(Obj.Business))
                        });
                     }
                     InvoiceQuery = { BuyerBusiness: { $in: UsersBusinessArr }, $and: [{ InvoiceDate: { $gte: startOfDay } }, { InvoiceDate: { $lte: endOfDay } }], InvoiceStatus: "Accept",PaidORUnpaid:"Unpaid", ActiveStatus: true, IfDeleted: false };
                     PaymentQuery = { BuyerBusiness: { $in: UsersBusinessArr }, $and: [{ PaymentDate: { $gte: startOfDay } }, { PaymentDate: { $lte: endOfDay } }], Payment_Status: "Pending", ActiveStatus: true, IfDeleted: false };
                  }
               }

               Promise.all([
                  InvoiceManagement.InvoiceSchema.find(InvoiceQuery, {}, {}).populate({ path: "Seller", select:["ContactName","Mobile"] }).
                  populate({ path: "Buyer", select: ["ContactName","Mobile"] }).populate({ path: "Business", select: ["FirstName","LastName"] }).populate({ path: "BuyerBusiness", select: ["FirstName","LastName"] }).exec(),
                  PaymentManagement.PaymentSchema.find(PaymentQuery, {}, {}).populate({ path: "Seller", select: ["ContactName","Mobile"] }).
                  populate({ path: "Buyer", select: ["ContactName","Mobile"] }).populate({ path: "Business", select: ["FirstName","LastName"] }).populate({ path: "BuyerBusiness", select: ["FirstName","LastName"] }).exec(),
            
               ]).then(Response => {
                  var InvoiceDetails = JSON.parse(JSON.stringify(Response[0]));
                  var PaymentDetails = JSON.parse(JSON.stringify(Response[1]));
                  var MonthlyCalenderDetails = [];

                  var CalenderPurpose = new Date();
                  var CurrentMonth = CalenderPurpose.getMonth();
                  var CurrentYear = CalenderPurpose.getFullYear();
                  CalenderPurpose = new Date(CurrentYear, CurrentMonth, 0o1); // Fix: Replace 01 with 0o1
                  var FirstDay = CalenderPurpose.getDay();
                  CalenderPurpose.setMonth(CurrentMonth + 1, 0);
                  var LastDay = CalenderPurpose.getDate();
                  var Days = 0;

                  for (Day = 0; Day <= 41; Day++) {
                     if ((Day >= FirstDay) && (Day <= LastDay)) {
                        Days = Days + 1;
                        var Calender = {
                           Date: null,
                           PaymentAmount: 0,
                           InvoiceAmount: 0,
                           OverDueAmount: 0,
                           DueTodayAmount: 0,
                           UpComingAmount: 0,
                           Details: [],
                        };
                    
                        if (ReceivingData.CustomerCategory === 'Seller' || ReceivingData.CustomerCategory === 'Buyer' ) {
                           if (InvoiceDetails.length > 0) {
                              const InvoiceDetailsArr = InvoiceDetails.filter(objNew => JSON.parse(JSON.stringify(new Date(objNew.InvoiceDate).getDate())) === JSON.parse(JSON.stringify(Days)));
                              if (InvoiceDetailsArr.length > 0) {
                                 Calender.Date = moment(new Date(InvoiceDetailsArr[0].InvoiceDate)).format("DD-MM-YYYY");
                                 var InvoiceAmount = 0;
                                 var OverDueAmount = 0;
                                 var DueTodayAmount = 0;
                                 var UpComingAmount = 0;

                                 
                                 InvoiceDetailsArr.map(Obj => {
                                    var TodayDate = new Date();
                                    var mInvoiceDate = moment(Obj.InvoiceDueDate);
                                    var mCurrentDateDate = moment(TodayDate);
                                 

                                    if (mInvoiceDate.valueOf() < mCurrentDateDate.valueOf())
                                    {
                                       OverDueAmount = parseFloat(OverDueAmount) + parseFloat(Obj.RemainingAmount);
                                    }
                                    else if(mInvoiceDate.valueOf() > mCurrentDateDate.valueOf())
                                    {
                                       UpComingAmount = parseFloat(UpComingAmount) + parseFloat(Obj.RemainingAmount);
                                    }
                                    else if(mInvoiceDate.valueOf() === mCurrentDateDate.valueOf())
                                    {
                                          DueTodayAmount = parseFloat(DueTodayAmount) + parseFloat(Obj.RemainingAmount);  
                                    }


                                    InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(Obj.RemainingAmount);
                                    // OverDueAmount = parseFloat(OverDueAmount) + parseFloat(Obj.InvoiceAmount);
                                    // DueTodayAmount = parseFloat(DueTodayAmount) + parseFloat(Obj.InvoiceAmount);
                                    // UpComingAmount = parseFloat(UpComingAmount) + parseFloat(Obj.InvoiceAmount);
                                    Calender.Details.push({
                                       "Seller": Obj.Seller,
                                       "Buyer": Obj.Buyer,
                                       "Business": Obj.Business,
                                       "BuyerBusiness": Obj.BuyerBusiness,
                                       "Amount": Obj.RemainingAmount,
                                       "Date": moment(new Date(Obj.InvoiceDate)).format("DD-MM-YYYY"),
                                       "UniqueNumber": Obj.InvoiceNumber,
                                       "Type": "Invoice"
                                    });
                                 });``
                                 Calender.InvoiceAmount = InvoiceAmount.toFixed(2);
                                 Calender.InvoiceAmount = parseFloat(Calender.InvoiceAmount);

                                 Calender.OverDueAmount = OverDueAmount.toFixed(2);
                                 Calender.OverDueAmount = parseFloat(Calender.OverDueAmount);

                                 Calender.DueTodayAmount = DueTodayAmount.toFixed(2);
                                 Calender.DueTodayAmount = parseFloat(Calender.DueTodayAmount);

                                 Calender.UpComingAmount = UpComingAmount.toFixed(2);
                                 Calender.UpComingAmount = parseFloat(Calender.UpComingAmount);
                              }
                           }
                        }
                        //Payment Details
                     //  if (ReceivingData.CustomerCategory === 'Buyer') {
                     //    if (PaymentDetails.length > 0) {
                     //       const PaymentDetailsArr = PaymentDetails.filter(objNew => JSON.parse(JSON.stringify(new Date(objNew.PaymentDate).getDate())) === JSON.parse(JSON.stringify(Days)));
                     //       if (PaymentDetailsArr.length > 0) {
                     //          Calender.Date = moment(new Date(PaymentDetailsArr[0].PaymentDate)).format("DD-MM-YYYY");
                     //          var PaymentAmount = 0;
                     //          var OverDueAmount = 0;
                     //          var DueTodayAmount = 0;
                     //          var UpComingAmount = 0;
                     //          PaymentDetailsArr.map(Obj => {
                     //             Obj.InvoiceDetails.map(obj=>{
                     //                var TodayDate = new Date();
                     //                var mPaymentDate = moment(Obj.PaymentDueDate);
                     //                var mCurrentDateDate = moment(TodayDate);
                                 
   
                     //                if (mPaymentDate.valueOf() < mCurrentDateDate.valueOf())
                     //                {
                     //                   OverDueAmount = parseFloat(OverDueAmount) + parseFloat(obj.RemainingAmount);
                     //                }
                     //                else if(mPaymentDate.valueOf() > mCurrentDateDate.valueOf())
                     //                {
                     //                   UpComingAmount = parseFloat(UpComingAmount) + parseFloat(obj.RemainingAmount);
                     //                }
                     //                else if(mPaymentDate.valueOf() === mCurrentDateDate.valueOf())
                     //                {
                     //                      DueTodayAmount = parseFloat(DueTodayAmount) + parseFloat(obj.RemainingAmount);  
                     //                }
   
                     //                PaymentAmount = parseFloat(PaymentAmount) + parseFloat(obj.RemainingAmount);
                     //                Calender.Details.push({
                     //                   "Seller": Obj.Seller,
                     //                   "Buyer": Obj.Buyer,
                     //                   "Business": Obj.Business,
                     //                   "BuyerBusiness": Obj.BuyerBusiness,
                     //                   "Amount": Obj.PaymentAmount,
                     //                   "Date": moment(new Date(Obj.PaymentDate)).format("DD-MM-YYYY"),
                     //                   "UniqueNumber": Obj.PaymentID,
                     //                   "Type": "Payment"
                     //                });
                     //             })
                     //          });
                     //          Calender.PaymentAmount = PaymentAmount.toFixed(2);
                     //          Calender.PaymentAmount = parseFloat(Calender.PaymentAmount);

                     //          Calender.OverDueAmount = OverDueAmount.toFixed(2);
                     //          Calender.OverDueAmount = parseFloat(Calender.OverDueAmount);

                     //          Calender.DueTodayAmount = DueTodayAmount.toFixed(2);
                     //          Calender.DueTodayAmount = parseFloat(Calender.DueTodayAmount);

                     //          Calender.UpComingAmount = UpComingAmount.toFixed(2);
                     //          Calender.UpComingAmount = parseFloat(Calender.UpComingAmount);
                     //       }
                     //    }
                     //  }

                        if (Calender.Date !== null) {
                           MonthlyCalenderDetails.push(Calender);
                        }
                     }
                  }
                  res.status(200).send({ Status: true, Message: "Monthly Calender", Response: MonthlyCalenderDetails });
               }).catch(Error => {
                  ErrorHandling.ErrorLogCreation(req, 'CustomerProfileUpload Getting Error', 'Common.controller -> CustomerProfileUpload', JSON.stringify(err));
                  res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get CustomerProfileUpload", Error: err });
               });
            } else {
               res.status(400).send({ Status: false, Message: "Invalid Customer Details" });
            }
         }
      });
   }
};



// Owner Details Update
exports.OwnerDetailsUpdate = function (req, res) {
   var ReceivingData = req.body;
 
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
     res.status(400).send({ Status: false, Message: "Owner details can not be empty" });
   } else {
     ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
     CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, CustomerType: 'Owner', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(function (err, result) {
       if (err) {
         ErrorHandling.ErrorLogCreation(req, 'Owner Details Error', 'Customer.Controller -> OwnerDetails', JSON.stringify(err));
         res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
       } else {
         if (result !== null) {
           Promise.all([
             CustomersManagement.CustomerSchema.find({ Mobile: ReceivingData.Mobile, _id: { $ne: result._id } }, {}, {}).exec(),
             CustomersManagement.CustomerSchema.findOne({ Mobile: ReceivingData.Mobile, _id: result._id }, {}, {}).exec(),
           ]).then(Response => {
             var ExistingMobile = Response[0];
             var NewMobile = Response[1];
             if (ExistingMobile.length === 0) {
               result.ContactName = ReceivingData.ContactName;
               result.Mobile = ReceivingData.Mobile;
               result.Email = ReceivingData.Email;
               result.save(function (err1, result1) {
                 if (err1) {
                   ErrorHandling.ErrorLogCreation(req, 'Owner Details Update Error', 'Customer.Controller -> OwnerDetailsUpdate', JSON.stringify(err1));
                   res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to complete this registration!.", Error: err1 });
                 } else {
                   if (NewMobile === null) {
                     LoginHistory.LoginHistorySchema.updateMany({ Mobile: result.Mobile },
                       {
                         $set: {
                           Mobile: ReceivingData.Mobile,
                         }
                       }).exec();
                     InviteManagement.InviteManagementSchema.updateMany({ Mobile: result.Mobile },
                       {
                         $set: {
                           Mobile: ReceivingData.Mobile
                         }
                       }).exec();
                   }
                   res.status(200).send({ Status: true, Response: result1 });
                 }
               });
             } else {
               res.status(200).send({ Status: false, Message: "Already this mobile number used on another device" });
             }
           }).catch(Error => {
             res.status(400).send({ Status: false, Message: "Some Occurred Error" });
           })
         } else {
           res.status(400).send({ Status: false, Message: "Invalid Owner Details!" });
         }
       }
     });
   }
 };

 // My Business List
exports.MyBusinessList = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Customer || ReceivingData.Customer === '') {
      res.status(400).send({ Status: false, Message: "Customer can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
   } else {
      ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer}, {}, {}).exec(),
      ]).then(Response => {
         var CustomerDetails = Response[0];
         // console.log(CustomerDetails,'CustomerDetails');
         var BusinessArr = [];
         var BranchArr = [];
         if (CustomerDetails !== null) {
            var InvoiceQuery = {};
            var FindQuery = {};
            var BranchFindQuery = {};
            var BusinessFindQuery = {};
            var TemporaryQuery = {};
            var InviteQuery = {};
            var InvoicePendingListQuery = {};
            if (ReceivingData.CustomerCategory === 'Seller') {
               if (CustomerDetails.CustomerType === 'Owner') {
                  InvoiceQuery = { Seller: ReceivingData.Customer, PaidORUnpaid: "Unpaid",InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
                  FindQuery = { Customer: ReceivingData.Customer, IfSeller: true, IfBuyer: false, ActiveStatus: true, IfDeleted: false };
                  InviteQuery = { Seller: ReceivingData.Customer, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                  TemporaryQuery = { Seller: ReceivingData.Customer, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
               } else if (CustomerDetails.CustomerType === 'User') {
                  if (CustomerDetails.BusinessAndBranches.length > 0) {
                     CustomerDetails.BusinessAndBranches.map(Obj => {
                        BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                     });
                     // CustomerDetails.BusinessAndBranches.map(Obj => {
                     //    // console.log(Obj,'Obj');
                     //    if (Obj.Branches.length > 0) {
                     //       Obj.Branches.map(obj => {
                     //          BranchArr.push(mongoose.Types.ObjectId(obj));
                     //       });
                     //    }
                     // });
                  }

                  // FindQuery = { _id: { $in: BusinessArr }, IfSeller: true, IfBuyer: false, ActiveStatus: true, IfDeleted: false };
                  // InvoiceQuery = { Branch: { $in: BranchArr }, PaidORUnpaid: "Unpaid",InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
                  // TemporaryQuery = { Branch: { $in: BranchArr }, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                  // InviteQuery = { Branch: { $in: BranchArr }, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                  // BranchFindQuery = { _id: { $in: BranchArr },  ActiveStatus: true, IfDeleted: false };

                  FindQuery = { _id: { $in: BusinessArr }, IfSeller: true, IfBuyer: false, ActiveStatus: true, IfDeleted: false };
                  InvoiceQuery = { Business: { $in: BusinessArr }, PaidORUnpaid: "Unpaid",InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
                  TemporaryQuery = { Business: { $in: BusinessArr }, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                  InviteQuery = { Business: { $in: BusinessArr }, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                  BusinessFindQuery = { _id: { $in: BusinessArr },  ActiveStatus: true, IfDeleted: false };

               }

            } else if (ReceivingData.CustomerCategory === 'Buyer') {
               if (CustomerDetails.CustomerType === 'Owner') {
                  InvoiceQuery = { Buyer: ReceivingData.Customer, PaidORUnpaid: "Unpaid",InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
                  InvoicePendingListQuery =  { Buyer: ReceivingData.Customer,  InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
                  FindQuery = { Customer: ReceivingData.Customer, IfSeller: false, IfBuyer: true, ActiveStatus: true, IfDeleted: false };
                  TemporaryQuery = { Buyer: ReceivingData.Customer, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                  InviteQuery = { Buyer: ReceivingData.Customer, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
               } else if (CustomerDetails.CustomerType === 'User') {
                  if (CustomerDetails.BusinessAndBranches.length > 0) {
                     CustomerDetails.BusinessAndBranches.map(Obj => {
                        BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                     });
                  }

                  // CustomerDetails.BusinessAndBranches.map(Obj => {
                  //    if (Obj.Branches.length > 0) {
                  //       Obj.Branches.map(obj => {
                  //          BranchArr.push(mongoose.Types.ObjectId(obj));
                  //       });
                  //    }
                  // });

                  // InvoiceQuery = { BuyerBranch: { $in: BranchArr },PaidORUnpaid: "Unpaid", InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
                  // InvoicePendingListQuery = { BuyerBusiness: { $in: BusinessArr }, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
                  // FindQuery = { _id: { $in: BusinessArr }, IfSeller: false, IfBuyer: true, ActiveStatus: true, IfDeleted: false };
                  // TemporaryQuery = { BuyerBusiness: { $in: BusinessArr }, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                  // InviteQuery = { BuyerBusiness: { $in: BusinessArr }, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                  // BranchFindQuery = { _id: { $in: BranchArr },  ActiveStatus: true, IfDeleted: false };


                  InvoiceQuery = { BuyerBusiness: { $in: BusinessArr },PaidORUnpaid: "Unpaid", InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
                  InvoicePendingListQuery = { BuyerBusiness: { $in: BusinessArr }, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
                  FindQuery = { _id: { $in: BusinessArr }, IfSeller: false, IfBuyer: true, ActiveStatus: true, IfDeleted: false };
                  TemporaryQuery = { BuyerBusiness: { $in: BusinessArr }, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                  InviteQuery = { BuyerBusiness: { $in: BusinessArr }, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                  BusinessFindQuery = { _id: { $in: BusinessArr },  ActiveStatus: true, IfDeleted: false };
               }
            }

            Promise.all([
               BusinessAndBranchManagement.BusinessSchema.find(FindQuery, {}, {}).populate({path: 'Industry', select: 'Industry_Name'}).exec(),
               InvoiceManagement.InvoiceSchema.find(InvoiceQuery, {}, {}).exec(),
               TemporaryCreditModel.CreditSchema.find(TemporaryQuery, {}, {}).exec(),
               InviteManagement.InviteManagementSchema.find(InviteQuery, {}, {}).exec(),
               BusinessAndBranchManagement.BusinessSchema.find(BusinessFindQuery, {}, {}).exec(),
               InvoiceManagement.InvoiceSchema.find(InvoicePendingListQuery, {}, {}).exec(),
            ]).then(ResponseRes => {
               var BusinessDetails = JSON.parse(JSON.stringify(ResponseRes[0]));
               var InvoiceDetails = JSON.parse(JSON.stringify(ResponseRes[1]));
               var TemporaryDetails = JSON.parse(JSON.stringify(ResponseRes[2]));
               var InviteDetails = JSON.parse(JSON.stringify(ResponseRes[3]));
               var BusinessDetailLists = JSON.parse(JSON.stringify(ResponseRes[4]));
               var InvoicePendingList = JSON.parse(JSON.stringify(ResponseRes[5]));

               // console.log(BusinessDetails,'BusinessDetailsBusinessDetailsBusinessDetails');
               // console.log(InvoiceDetails,'InvoiceDetailsInvoiceDetailsInvoiceDetails');
               // console.log(TemporaryDetails,'TemporaryDetailsTemporaryDetailsTemporaryDetails');
               // console.log(InviteDetails,'InviteDetailsInviteDetailsInviteDetails');
               // console.log(BusinessDetailLists,'BranchDetailsBranchDetailsBranchDetails');
               // console.log(InvoicePendingList,'InvoicePendingListInvoicePendingListInvoicePendingList');

					// if (CustomerDetails.CustomerCategory === 'Seller' && CustomerDetails.CustomerType === 'User') {
					// 	BusinessDetails = BusinessDetails.map(business => {
					// 		const BranchesArr = BranchDetails.filter(branch => branch.Business === business._id);
					// 		var BusinessCreditLimit = 0;
					// 		var AvailableCreditLimit = 0;
					// 		BranchesArr.map(Obj => {
					// 			BusinessCreditLimit = BusinessCreditLimit + Obj.BranchCreditLimit;
					// 			AvailableCreditLimit = AvailableCreditLimit + Obj.AvailableCreditLimit;
					// 		});
					// 		business.BusinessCreditLimit = BusinessCreditLimit;
					// 		business.AvailableCreditLimit = AvailableCreditLimit;
					// 		return business;
					// 	});
					// }

            

               // Seller Business Available Credit balance check
               if (BusinessDetails.length > 0) {
                  BusinessDetails.map(Obj => {
                     var TodayDate = new Date();
                     TodayDate = new Date(TodayDate.setHours(0, 0, 0, 0));
                     Obj.OverDueAmount = 0;
                     Obj.AvailableTemporaryCreditLimit = 0;
                     Obj.TotalTemporaryCreditLimit = 0;
                     Obj.DueTodayAmount = 0;
                     Obj.UpComingAmount = 0;

                     const result1Arr = TemporaryDetails.filter(obj1 => (obj1.BuyerBusiness === Obj._id && Obj.IfBuyer) ||
                        (obj1.Business === Obj._id && Obj.IfSeller));
                     if (result1Arr.length > 0) {
                        var ValidityDate = new Date();
                        result1Arr.map(obj => {
                           ValidityDate = new Date(obj.updatedAt);
                           ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + obj.ApprovedPeriod));
                           ValidityDate = new Date(ValidityDate.setHours(0, 0, 0, 0));
                           if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                              Obj.TotalTemporaryCreditLimit = parseFloat(Obj.TotalTemporaryCreditLimit) + parseFloat(obj.ApproveLimit);
                              Obj.AvailableTemporaryCreditLimit = parseFloat(Obj.AvailableTemporaryCreditLimit) + parseFloat(obj.ApproveLimit);
                           }
                        });
                     }
                     const result2Arr = InviteDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id && Obj.IfBuyer);
                   
                     if (result2Arr.length > 0) {
                        result2Arr.map(obj => {
                           if (CustomerDetails.CustomerCategory === 'Seller') {
                              Obj.BusinessCreditLimit = parseFloat(Obj.BusinessCreditLimit) + parseFloat(obj.AvailableLimit);
                              Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.AvailableLimit);
                           }
                           else if (CustomerDetails.CustomerCategory === 'Buyer') {

                              BusinessDetails.map(ObjBusiness => {
                              
                                 if(CustomerDetails.CustomerType === 'User' && ObjBusiness._id === obj.BuyerBranch) {
                                 var mInvoiceAmount = 0;
                                 InvoicePendingList.map(ObjIn1 => {
                                    if(obj.BuyerBusiness === ObjIn1.BuyerBusiness && obj.Business === ObjIn1.Business) {
                                       if(ObjIn1.InvoiceStatus === 'Pending')
                                       {
                                          mInvoiceAmount = mInvoiceAmount + ObjIn1.UsedCurrentCreditAmount ;  
                                       }
                                    }
                                  });
                                 Obj.BusinessCreditLimit = parseFloat(Obj.BusinessCreditLimit) + parseFloat(obj.BuyerCreditLimit);
                                 Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.AvailableLimit) + parseFloat(mInvoiceAmount);
                              } else if(CustomerDetails.CustomerType === 'Owner' && ObjBusiness._id === obj.BuyerBusiness) {
                                 var mInvoiceAmount = 0;
                                 InvoicePendingList.map(ObjIn1 => {
                                    if(obj.BuyerBusiness === ObjIn1.BuyerBusiness && obj.Business === ObjIn1.Business) {
                                       if(ObjIn1.InvoiceStatus === 'Pending')
                                       {
                                          mInvoiceAmount = mInvoiceAmount + ObjIn1.UsedCurrentCreditAmount ;  
                                       }
                                    }
                                  });
                                 Obj.BusinessCreditLimit = parseFloat(Obj.BusinessCreditLimit) + parseFloat(obj.BuyerCreditLimit);
                                 Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.AvailableLimit) + parseFloat(mInvoiceAmount);
                              }
                              });
                           }
                        });
                     }
                     const result4Arr = InvoiceDetails.filter(obj1 => (obj1.BuyerBusiness === Obj._id && Obj.IfBuyer && !Obj.IfSeller) ||
                        (obj1.Business === Obj._id && !Obj.IfBuyer && Obj.IfSeller));

                    
                      
                     var OverDueDate = new Date();
                     var DueTodayDate = new Date();
                     if (result4Arr.length > 0) {
                        var InvoiceAmount = 0;
                        var OverDueAmount = 0;
                        var DueTodayAmount = 0;
                        var UpComingAmount = 0;
                        result4Arr.map(obj => {
                          
                           InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.RemainingAmount); //parseFloat(obj.AvailableAmount);
                           OverDueDate = new Date(obj.InvoiceDueDate);
                           DueTodayDate = new Date(obj.InvoiceDueDate);

                         // var mCurrentDate = moment(TodayDate)
                          var mInvoiceDate = moment(obj.InvoiceDueDate)

                           if(mInvoiceDate.valueOf() < TodayDate.valueOf())
                           {
                              OverDueAmount = parseFloat(OverDueAmount) + parseFloat(obj.InvoiceAmount);
                              
                           }
                           else if(mInvoiceDate.valueOf() > TodayDate.valueOf())
                           {
                              UpComingAmount = parseFloat(UpComingAmount) + parseFloat(obj.InvoiceAmount);
                             
                             
                           }
                           else if(mInvoiceDate.valueOf() === TodayDate.valueOf())
                           {
                              DueTodayAmount = parseFloat(DueTodayAmount) + parseFloat(obj.InvoiceAmount);
                             
                           }
                          
                           

                           // const InviteDetailsArr = InviteDetails.filter(obj1 => (obj1.Business === obj.Business && obj1.Seller === obj.Seller) ||
                           //    (obj1.BuyerBusiness === obj.BuyerBusiness && obj1.Buyer === obj.Buyer));
                           // if (InviteDetailsArr.length > 0) {
                           //    InviteDetailsArr.map(objInvite => {
                           //       // OverDueDate = new Date(OverDueDate.setDate(OverDueDate.getDate() + objInvite.BuyerPaymentCycle + 1));
                           //       // DueTodayDate = new Date(DueTodayDate.setDate(DueTodayDate.getDate() + objInvite.BuyerPaymentCycle));

                           //       OverDueDate = new Date(OverDueDate.setDate(OverDueDate.getDate() ));
                           //       DueTodayDate = new Date(DueTodayDate.setDate(DueTodayDate.getDate() ));
                           //    });
                           //    OverDueDate = new Date(OverDueDate.setHours(0, 0, 0, 0));
                           //    if (OverDueAmount.valueOf() < TodayDate.valueOf()) {
                           //       OverDueAmount = parseFloat(OverDueAmount) + parseFloat(obj.InvoiceAmount);
                           //    }
                           //    if (DueTodayDate.toLocaleDateString() === TodayDate.toLocaleDateString()) {
                           //       DueTodayAmount = parseFloat(DueTodayAmount) + parseFloat(obj.InvoiceAmount);
                           //    }
                           // }
                        });
                       
                        // Obj.OverDueAmount = Obj.OverDueAmount.toFixed(2);
                        // Obj.OverDueAmount = parseFloat(Obj.OverDueAmount);
                        // Obj.UpComingAmount = InvoiceAmount.toFixed(2);
                        // Obj.UpComingAmount = parseFloat(Obj.UpComingAmount);
                        // Obj.DueTodayAmount = DueTodayAmount.toFixed(2);
                      //  Obj.DueTodayAmount = parseFloat(Obj.DueTodayAmount);

                        Obj.OverDueAmount = OverDueAmount.toFixed(2);
                        Obj.OverDueAmount = parseFloat(Obj.OverDueAmount);
                        Obj.UpComingAmount = UpComingAmount.toFixed(2);
                        Obj.UpComingAmount = parseFloat(Obj.UpComingAmount);
                        Obj.DueTodayAmount = DueTodayAmount.toFixed(2);
                        Obj.DueTodayAmount = parseFloat(Obj.DueTodayAmount);

                        // if (Obj.OverDueAmount > 0 || Obj.DueTodayAmount > 0) {
                        //    Obj.UpComingAmount = Obj.UpComingAmount - (Obj.DueTodayAmount + Obj.OverDueAmount);
                        //    if (Obj.UpComingAmount > 0) {
                        //       Obj.UpComingAmount = Obj.UpComingAmount.toFixed(2);
                        //       Obj.UpComingAmount = parseFloat(Obj.UpComingAmount);
                        //    } else {
                        //       Obj.UpComingAmount = 0;
                        //    }
                        // }

                        if (InvoiceAmount > 0 && ReceivingData.CustomerCategory === 'Buyer') {
                           Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) //- parseFloat(InvoiceAmount);
                           if (Obj.AvailableCreditLimit > 0) {
                              Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                           } else {
                              if (Obj.AvailableCreditLimit < 0) {
                                 Obj.AvailableTemporaryCreditLimit = parseFloat(Obj.AvailableTemporaryCreditLimit) + parseFloat(Obj.AvailableCreditLimit);
                                 if (Obj.AvailableTemporaryCreditLimit > 0) {
                                    Obj.AvailableTemporaryCreditLimit = parseFloat(Obj.AvailableTemporaryCreditLimit);
                                 } else {
                                    Obj.AvailableTemporaryCreditLimit = 0;
                                 }
                              }
                              Obj.AvailableCreditLimit = 0;
                           }
                        }
                     }
                     return Obj;
                  });
               }
               //Sort By Business Name in Alphabetical Order
              
               // Define a comparison function
                  function compareNames(a, b) {
                     // Get the full names
                     let nameA = a.FirstName + " " + a.LastName;
                     let nameB = b.FirstName + " " + b.LastName;
                     // Compare them lexicographically
                     if (nameA < nameB) {
                     return -1;
                     }
                     if (nameA > nameB) {
                     return 1;
                     }
                     // If equal, return 0
                     return 0;
                  }
                  
                  // Sort the array using the comparison function
                  BusinessDetails.sort(compareNames);
  
               res.status(200).send({ Status: true, Message: "My Business List!!!.", Response: BusinessDetails});
            }).catch(ErrorRes => {
               ErrorHandling.ErrorLogCreation(req, 'Business And Invoice, Invite, Temporary List Getting Error', 'BusinessAndBranchManagement.Controller -> MyBusinessList', JSON.stringify(ErrorRes));
               res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business And Invoice, Invite, Temporary!.", Error: ErrorRes });
            });
         } else {
            res.status(400).send({ Status: false, Message: "Invalid Customer Details!." });
         }
      }).catch(Error => {
         ErrorHandling.ErrorLogCreation(req, 'Business And Invoice, Invite, Temporary List Getting Error', 'BusinessAndBranchManagement.Controller -> MyBusinessList', JSON.stringify(Error));
         res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business And Invoice, Invite, Temporary!.", Error: Error });
      });
   }
};

// Mobile OTP Sent
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

// OwnerOfUsersList 
exports.OwnerOfUsersList = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Owner || ReceivingData.Owner === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer category can not be empty" });
   }  else {
      ReceivingData.Owner = mongoose.Types.ObjectId(ReceivingData.Owner);
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Owner, CustomerType: 'Owner', ActiveStatus: true, IfDeleted: false }, {}, {}, function (err, result) {
         if (err) {
            ErrorHandling.ErrorLogCreation(req, 'User Find error', 'CustomerManagement -> UserDetails', JSON.stringify(err));
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find the User Management!.", Error: err });
         } else {
            if (result !== null) {
               const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
               const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
               var ShortOrder = { createdAt: -1 };
               var ShortKey = ReceivingData.ShortKey;
               var ShortCondition = ReceivingData.ShortCondition;
               if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                  ShortOrder = {};
                  ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
               }
               var FindQuery = { 'IfDeleted': false, CustomerType: 'User', Owner: ReceivingData.Owner,CustomerCategory: ReceivingData.CustomerCategory, };

               if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object' && ReceivingData.FilterQuery !== null && ReceivingData.FilterQuery.length > 0) {
                  ReceivingData.FilterQuery.map(obj => {
                     if (obj.Type === 'String') {
                        FindQuery[obj.DBName] = { $regex: new RegExp(".*" + obj.Value + ".*", "i") };
                     }
                     if (obj.Type === 'Select') {
                        FindQuery[obj.DBName] = obj.Value;
                     }
                     if (obj.Type === 'Date') {
                        if (FindQuery[obj.DBName] === undefined) {
                           FindQuery[obj.DBName] = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                        } else {
                           const DBName = obj.DBName;
                           const AndQuery = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                           FindQuery['$and'] = [{ [DBName]: FindQuery[obj.DBName] }, { [DBName]: AndQuery }];
                        }
                     }
                     if (obj.Type === 'Object') {
                        FindQuery[obj.DBName] = mongoose.Types.ObjectId(obj.Value._id);
                     }
                  });
               }
               Promise.all([
                  CustomersManagement.CustomerSchema
                     .aggregate([
                        { $match: FindQuery },
                        { $addFields: { ContactNameSort: { $toLower: "$ContactName" } } },
                        { $addFields: { MobileSort: { $toLower: "$Mobile" } } },
                        { $addFields: { EmailSort: { $toLower: "$Email" } } },
                        { $addFields: { CustomerCategorySort: { $toLower: "$CustomerCategory" } } },
                        { $addFields: { CustomerTypeSort: { $toLower: "$CustomerType" } } },
                        {
                           $lookup: {
                              from: "Global_State",
                              let: { "state": "$State" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$state", "$_id"] } } },
                                 { $project: { "State_Name": 1 } }
                              ],
                              as: 'State'
                           }
                        },
                        { $unwind: { path: "$State", preserveNullAndEmptyArrays: true } },
                        {
                           $project: {
                              ContactName: 1,
                              Mobile: 1,
                              Email: 1,
                              CustomerCategory: 1,
                              State: 1,
                              CustomerType: 1,
                              BusinessAndBranches: 1,
                              ActiveStatus: 1,
                              IfDeleted: 1,
                              createdAt: 1,
                              updatedAt: 1
                           }
                        },
                        { $sort: ShortOrder },
                        { $skip: Skip_Count },
                        { $limit: Limit_Count }
                     ]).exec(),
                  CustomersManagement.CustomerSchema.countDocuments(FindQuery).exec()
               ]).then(result => {
                  res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
               }).catch(Error => {
                  ErrorHandling.ErrorLogCreation(req, 'Customer Find error', 'CustomerManagement -> All Customer List', JSON.stringify(Error));
                  res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
               });
            } else {
               res.status(200).send({ Http_Code: 400, Status: true, Message: 'Invalid User Details' });
            }
         }
      });
   }

};



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

exports.StateListMobile = function (req, res) {   
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