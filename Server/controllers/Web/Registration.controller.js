var CustomersManagement = require('../../Models/CustomerManagement.model');
var ErrorHandling = require('../../Handling/ErrorHandling').ErrorHandling;
var LocationManagement = require('../../Models/global_management.model');
var BusinessAndBranchManagement = require('../../Models/BusinessAndBranchManagement.model');
var InviteSchema = require('../../Models/Invite_Management.model');
var mongoose = require('mongoose');
var CryptoJS = require("crypto-js");
var crypto = require("crypto");
var parser = require('ua-parser-js');
var LoginHistory = require('../../Models/login_system.model');
var SMS_System = require('../../../Config/sms_config');
var LoginHistory = require('../../Models/login_system.model');
var NotificationModel = require('../../Models/notification_management.model')
// Owner Registration
exports.OwnerRegister = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.ContactName || ReceivingData.ContactName === '') {
      res.status(400).send({ Status: false, Message: "Contact Name can not be empty" });
   } else if (!ReceivingData.Mobile || ReceivingData.Mobile === '') {
      res.status(400).send({ Status: false, Message: "Mobile Number can not be empty" });
   } else {
      Promise.all([
         CustomersManagement.CustomerSchema.find({ Mobile: ReceivingData.Mobile, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         CustomersManagement.CustomerSchema.findOne({}, {}, { sort: { createdAt: -1 } }).exec(),
         InviteSchema.InviteManagementSchema.findOne({ Mobile: ReceivingData.Mobile, ActiveStatus: true, Invite_Status: "Pending_Approval", IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var InvitedDetails = Response[2];
         if (Response[0].length === 0) {
            var IfBuyerUserPaymentApprove = false;
            var IfBuyerUserPaymentANotify = false;
            var IfSellerUserPaymentApprove = false;
            var IfSellerUserPaymentANotify = false;
            if (ReceivingData.CustomerCategory === 'Seller') {
               IfSellerUserPaymentApprove = true;
               IfSellerUserPaymentANotify = true;
            } else if (ReceivingData.CustomerCategory === 'Buyer') {
               IfBuyerUserPaymentApprove = true;
               IfBuyerUserPaymentANotify = true;
            } else {
               IfSellerUserPaymentApprove = true;
               IfSellerUserPaymentANotify = true;
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
               IfUserBranch: false,
               IfBuyerUserPaymentApprove: IfBuyerUserPaymentApprove,
               IfBuyerUserPaymentNotify: IfBuyerUserPaymentANotify,
               IfSellerUserPaymentApprove: IfSellerUserPaymentApprove,
               IfSellerUserPaymentNotify: IfSellerUserPaymentANotify,
               Firebase_Token: '',
               Device_Id: '',
               Device_Type: '',
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
                        InviteSchema.InviteManagementSchema.updateOne(
                           { "_id": InvitedDetails._id },
                           {
                              $set: {
                                 "Buyer": mongoose.Types.ObjectId(result._id),
                              }
                           }
                        ).exec();
                     } else if (InvitedDetails.Buyer !== null && InvitedDetails.Seller === null) {
                        InviteSchema.InviteManagementSchema.updateOne(
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

// Owner Details
exports.OwnerDetails = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "Owner details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, CustomerType: 'Owner', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(function (err, result) {
         if (err) {
            ErrorHandling.ErrorLogCreation(req, 'Owner Details Error', 'Registration.Controller -> OwnerDetails', JSON.stringify(err));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
         } else {
            if (result !== null) {
               res.status(200).send({ Status: true, Message: 'Owner Details', Response: result });
            } else {
               res.status(400).send({ Status: false, Message: "Invalid  Owner Details!" });
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

// Owner Create a User
exports.OwnerCreateUser = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.ContactName || ReceivingData.ContactName === '') {
      res.status(400).send({ Status: false, Message: "Contact Name can not be empty" });
   } else if (!ReceivingData.Mobile || ReceivingData.Mobile === '') {
      res.status(400).send({ Status: false, Message: "Mobile Number can not be empty" });
   } else if (!ReceivingData.Owner || ReceivingData.Owner === '') {
      res.status(400).send({ Status: false, Message: "Customer details can not be empty" });
   } else if (!ReceivingData.BusinessAndBranches || ReceivingData.BusinessAndBranches === []) {
      res.status(400).send({ Status: false, Message: "Customer details can not be empty" });
   } else {
      ReceivingData.Owner = mongoose.Types.ObjectId(ReceivingData.Owner);
      CustomersManagement.CustomerSchema.findOne({
         _id: ReceivingData.Owner, CustomerType: 'Owner', ActiveStatus: true, IfDeleted: false,
      }, {}, {}).exec(function (err, result) {
         if (err) {
            ErrorHandling.ErrorLogCreation(req, 'Owner Details Getting Error', 'Common.Controller -> Owner details', JSON.stringify(err));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Owner details!.", Error: err });
         } else {
            if (result !== null) {
               var BusinessArray = [];
               var BranchArray = [];
               if (ReceivingData.BusinessAndBranches.length !== 0) {
                  ReceivingData.BusinessAndBranches.map(Obj => {
                     const EmptyBusiness = {
                        Business: mongoose.Types.ObjectId(Obj.Business._id),
                        Branches: []
                     }
                     if (Obj.Branches.length !== 0) {
                        Obj.Branches.map(obj => {
                           EmptyBusiness.Branches.push(mongoose.Types.ObjectId(obj.Branch._id));
                           BranchArray.push(mongoose.Types.ObjectId(obj.Branch._id));
                        });
                     }
                     BusinessArray.push(EmptyBusiness);
                  });
               }
               Promise.all([
                  CustomersManagement.CustomerSchema.findOne({ Mobile: ReceivingData.Mobile, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                  CustomersManagement.CustomerSchema.find({ Mobile: ReceivingData.Mobile, ActiveStatus: false, IfDeleted: true }, {}, {}).exec(),
                  CustomersManagement.CustomerSchema.findOne({ ActiveStatus: true, IfDeleted: false }, {}, { sort: { Referral_Unique: -1 } }).exec(),
               ]).then(Response => {
                  var NewCustomer = Response[0];
                  var ExistingCustomer = Response[1];
                  var LastCustomer = Response[2];

                  if (NewCustomer === null && ExistingCustomer.length === 0) {
                     var LastReferralCode = LastCustomer !== null ? (LastCustomer.Referral_Unique + 1) : 1;
                     var IfBuyerUserPaymentApprove = false;
                     var IfBuyerUserPaymentANotify = false;
                     var IfSellerUserPaymentApprove = false;
                     var IfSellerUserPaymentANotify = false;
                     if (ReceivingData.CustomerCategory === 'Seller') {
                        IfSellerUserPaymentApprove = true;
                        IfSellerUserPaymentANotify = true;
                     } else if (ReceivingData.CustomerCategory === 'Buyer') {
                        IfBuyerUserPaymentApprove = true;
                        IfBuyerUserPaymentANotify = true;
                     } else {
                        IfSellerUserPaymentApprove = true;
                        IfSellerUserPaymentANotify = true;
                        IfBuyerUserPaymentApprove = true;
                        IfBuyerUserPaymentANotify = true;
                     }
                     const Create_Customer = new CustomersManagement.CustomerSchema({
                        ReferralCode: 'AQUIL-' + LastReferralCode.toString().padStart(9, '0'),
                        Referral_Unique: LastReferralCode,
                        ContactName: ReceivingData.ContactName,
                        Mobile: ReceivingData.Mobile,
                        Email: ReceivingData.Email,
                        State: result.State,
                        CustomerCategory: ReceivingData.CustomerCategory,
                        CustomerType: 'User',
                        IfUserBusiness: false,
                        BusinessAndBranches: BusinessArray,
                        IfUserBranch: false,
                        Assigned: 'Assigned',
                        IfSellerUserPaymentApprove: IfSellerUserPaymentApprove,
                        IfSellerUserPaymentANotify: IfSellerUserPaymentANotify,
                        IfBuyerUserPaymentApprove: IfBuyerUserPaymentApprove,
                        IfBuyerUserPaymentANotify: IfBuyerUserPaymentANotify,
                        Owner: result._id || null,
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
                           ErrorHandling.ErrorLogCreation(req, 'User Register Error', 'Common.Controller -> UserRegister', JSON.stringify(err1));
                           res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to complete this registration!.", Error: err1 });
                        } else {
                           BusinessAndBranchManagement.BranchSchema.updateMany({ _id: { $in: BranchArray }, ActiveStatus: true, IfDeleted: false },
                              { $set: { UserAssigned: true } }).exec();
                           res.status(200).send({ Status: true, Response: result1 });
                        }
                     });
                  } else {
                     res.status(200).send({ Status: true, Message: 'This number already registered' });
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
         .populate({
            path: 'BusinessAndBranches.Business', select: ['BusinessName', 'Industry', 'createdAt', 'BusinessCreditLimit', 'AvailableCreditLimit'],
            populate: { path: 'Industry', select: ['Industry_Name'] }
         })
         .populate({ path: "BusinessAndBranches.Branches", select: ['BranchName', 'Mobile', 'Address', 'GSTIN', 'createdAt'] })
         .populate({ path: "State", select: ['State_Name'] }).exec(function (err, result) {
            if (err) {
               ErrorHandling.ErrorLogCreation(req, 'User Details Error', 'Registration.Controller -> UserDetails', JSON.stringify(err));
               res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
            } else {
               if (result !== null) {
                  res.status(200).send({ Status: true, Message: 'Owner Details', Response: result });
               } else {
                  res.status(400).send({ Status: false, Message: "Invalid  Owner Details!" });
               }
            }
         });
   }
};


// User Details Update
exports.UserDetailsUpdate = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(417).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ CustomerType: 'Owner', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, CustomerType: 'User', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var CustomerDetails = Response[0];
         var BuyerUserDetails = Response[1];
         if (CustomerDetails !== null && BuyerUserDetails !== null) {
            var BusinessArray = [];
            var BranchArray = [];
            if (ReceivingData.BusinessAndBranches.length !== 0) {
               ReceivingData.BusinessAndBranches.map(Obj => {
                  const EmptyBusiness = {
                     Business: mongoose.Types.ObjectId(Obj.Business._id),
                     Branches: []
                  }
                  if (Obj.Branches.length !== 0) {
                     Obj.Branches.map(obj => {
                        EmptyBusiness.Branches.push(mongoose.Types.ObjectId(obj.Branch._id));
                        BranchArray.push(mongoose.Types.ObjectId(obj.Branch._id));
                     });
                  }
                  BusinessArray.push(EmptyBusiness);
               });
            }

            CustomersManagement.CustomerSchema.updateMany({ _id: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false },
               {
                  $set: {
                     ContactName: ReceivingData.ContactName,
                     Mobile: ReceivingData.Mobile,
                     Email: ReceivingData.Email,
                     BusinessAndBranches: BusinessArray
                  }
               }).exec();
            BusinessAndBranchManagement.BranchSchema.updateMany({ _id: { $in: BranchArray }, ActiveStatus: true, IfDeleted: false },
               { $set: { UserAssigned: true } }).exec();
               CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(function (err, result) {
                  if (err) {
                     ErrorHandling.ErrorLogCreation(req, 'Owner Details Error', 'Registration.Controller -> OwnerDetails', JSON.stringify(err));
                     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
                  } else {
                     if (result !== null) {
                        res.status(200).send({ Status: true, Response: result });
                     } else {
                        res.status(400).send({ Status: false, Message: "Invalid  Owner Details!" });
                     }
                  }
               });            
         } else {
            res.status(400).send({ Status: false, Message: "Some Occurred Error!" });         }
      }).catch(Error => {         
         res.status(400).send({ Status: false, Message: "Some Occurred Error!" });
      });
   }
};



exports.StateList = function (req, res) {
   var ReceivingData = req.body;
   if (ReceivingData.User !== '') {
      res.status(417).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      var Country = mongoose.Types.ObjectId('5b3f0552a4ed1e0474018ef6');
      LocationManagement.Global_State.find({ Country_DatabaseId: Country }, {}, {}).exec(function (err, result) {
         if (err) {
            ErrorHandling.ErrorLogCreation(req, 'User Details Error', 'Location.Controller -> StateList', JSON.stringify(err));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
         } else {

            if (result.length !== 0) {
               res.status(200).send({ Status: true, Message: 'State Details', Response: result });
            } else {
               res.status(400).send({ Status: false, Message: "Invalid Details!" });
            }
         }
      });
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

// BusinessUnAssigned
exports.BusinessUnAssigned = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Customer || ReceivingData.Customer === '') {
      res.status(400).send({ Status: false, Message: "Customer can not be empty" });
   } else {
      ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
      BusinessAndBranchManagement.BusinessSchema.find({ Customer: ReceivingData.Customer, IfSeller: ReceivingData.IfSeller, IfBuyer: ReceivingData.IfBuyer, ActiveStatus: true, IfDeleted: false },
         {
            BusinessName: 1,
         }).exec((err, result) => {
            if (err) {
               ErrorHandling.ErrorLogCreation(req, 'Business List Getting Error', 'BusinessAndBranchManagement.Controller -> Unassigned_BusinessSimpleList', JSON.stringify(err));
               res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business!.", Error: err });
            } else {
               res.status(200).send({ Status: true, Response: result, Message: 'Unassigned Business SimpleList' });
            }
         });
   }
};

// BranchUnAssigned 
exports.BranchUnAssigned = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Customer || ReceivingData.Customer === '') {
      res.status(400).send({ Status: false, Message: "Customer can not be empty" });
   } else if (!ReceivingData.Business || ReceivingData.Business === '') {
      res.status(400).send({ Status: false, Message: "Customer can not be empty" });
   } else {
      ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
      ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
      BusinessAndBranchManagement.BranchSchema.find({ Customer: ReceivingData.Customer, Business: ReceivingData.Business, UserAssigned: false },
         {
            BranchName: 1,
         }).exec((err, result) => {
            if (err) {
               ErrorHandling.ErrorLogCreation(req, 'Business List Getting Error', 'BusinessAndBranchManagement.Controller -> Unassigned_BranchSimpleList', JSON.stringify(err));
               res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business!.", Error: err });
            } else {
               res.status(200).send({ Status: true, Response: result, Message: 'Unassigned Branch SimpleList' });
            }
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
      // SMS_System.sendOTP(ReceivingData.Mobile, OTP, (error, response) => {
      //    if (error) {
      //       res.status(417).send({ Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: error });
      //    } else {
      res.status(200).send({ Status: true, Response: OTP, OTP: OTP });
      //    }
      // });
   }
};


// Status Verify
exports.StatusVerify = function (req, res) {
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

// Login System
exports.Login = function (req, res) {
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

// Business And Branches Details 
exports.BusinessAndBranches_DetailsList = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Customer || ReceivingData.Customer === '') {
      res.status(400).send({ Status: false, Message: "Customer can not be empty" });
   } else {
      ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
      Promise.all([
         BusinessAndBranchManagement.BusinessSchema.find({ Customer: ReceivingData.Customer, IsAssigned: true }, {}, {})
            .populate({ path: "Customer", select: ["ContactName", "Mobile", "Email", "CustomerCategory", "CustomerType"] })
            .populate({ path: "Industry", select: ["Industry_Name", "Status"] }).exec(),
         BusinessAndBranchManagement.BranchSchema.find({ UserAssigned: false }, {}, {}).exec(),
      ]).then(Response => {
         var BusinessDetails = JSON.parse(JSON.stringify(Response[0]));
         var BranchDetails = Response[1];
         if (BusinessDetails.length !== 0) {
            BusinessDetails = BusinessDetails.map(Obj => {
               const BranchArr = BranchDetails.filter(obj => JSON.parse(JSON.stringify(obj.Business)) === Obj._id);
               Obj.Branches = BranchArr;
               return Obj;
            });
            res.status(200).send({ Status: true, Response: BusinessDetails, Message: 'Business And Branches List' });
         } else {
            res.status(200).send({ Status: true, Response: [], Message: 'Business And Branches List' });
         }

      }).catch(Error => {
         ErrorHandling.ErrorLogCreation(req, 'Business And Branches Simple List Getting Error', 'BusinessAndBranchManagement.Controller -> BusinessAndBranches_SimpleList', JSON.stringify(Error));
         res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business and Branches!.", Error: Error });
      });
   }
};


// Customer Profile Details
exports.CustomerProfileDetails = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "Owner details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(function (err, result) {
         if (err) {
            ErrorHandling.ErrorLogCreation(req, 'Owner Details Error', 'Registration.Controller -> OwnerDetails', JSON.stringify(err));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
         } else {
            if (result !== null) {
               res.status(200).send({ Status: true, Message: 'Owner Details', Response: result });
            } else {
               res.status(400).send({ Status: false, Message: "Invalid  Owner Details!" });
            }
         }
      });
   }
};


// All Notifications List
exports.All_Notifications_List = function (req, res) {
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
exports.DeleteAllReadNotifications = function (req, res) {
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

//Notification Counts
exports.Notification_Counts = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.User || ReceivingData.User === '') {
       res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
       NotificationModel.NotificationSchema.countDocuments({
           CustomerID: ReceivingData.User,
           Message_Viewed: false,
           ActiveStatus: true,
           IfDeleted: false
       }).exec((err, result) => {
           if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred while Find The Notification Details!.", Error: err });
           } else {
               res.status(200).send({ Status: true, Response: result });
           }
       });
   }
};

// Mark All As Read Notifications
exports.MarkAllAsReadNotifications = function (req, res) {
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