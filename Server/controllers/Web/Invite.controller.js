var mongoose = require('mongoose');
var CustomersManagement = require('../../Models/CustomerManagement.model');
var NotificationManagement = require('../../Models/notification_management.model');
var ErrorHandling = require('../../Handling/ErrorHandling').ErrorHandling;
var InviteModel = require('../../Models/Invite_Management.model');
var BusinessManagement = require('../../Models/BusinessAndBranchManagement.model');
var TemporaryManagement = require('../../Models/TemporaryCredit.model');
var FCM_App = require('../../../Config/fcm_config').CustomerNotify;
var InvoiceManagement = require('../../Models/InvoiceManagement.model');

var options = {
   priority: 'high',
   timeToLive: 60 * 60 * 24
};


// Verify Buyer Mobile Number before Send Invite
exports.Verify_Mobile = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Mobile || ReceivingData.Mobile === '') {
      res.status(400).send({ Status: false, Message: "Mobile details can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Mobile details can not be empty" });
   } else {
      CustomersManagement.CustomerSchema.findOne({ Mobile: ReceivingData.Mobile, $or: [{ CustomerCategory: ReceivingData.CustomerCategory }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(function (err, result) {
         if (err) {
            ErrorHandling.ErrorLogCreation(req, 'Buyer Mobile Verify Details Error', 'Seller.Controller -> VerifyBuyer_Mobile', JSON.stringify(err));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
         } else {
            if (result !== null) {
               res.status(200).send({ Status: true, Message: 'Existing Customer', Response: result });
            } else {
               res.status(200).send({ Status: false, Message: "New Customer!" });
            }
         }
      });
   }
};

// Seller And Buyer Business List 
exports.SellerAndBuyerBusinessList = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.InviteFrom || ReceivingData.InviteFrom === '') {
       res.status(400).send({ Status: false, Message: "Invite From details can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
       res.status(400).send({ Status: false, Message: "Customer Category details can not be empty" });
   } else if (!ReceivingData.InviteTo || ReceivingData.InviteTo === '') {
       res.status(400).send({ Status: false, Message: "InviteTo details can not be empty" });
   } else if (!ReceivingData.Business || ReceivingData.Business === '') {
       res.status(400).send({ Status: false, Message: "Business details can not be empty" });
   } else if (!ReceivingData.Branch || ReceivingData.Branch === '') {
       res.status(400).send({ Status: false, Message: "Branch details can not be empty" });
   } else {
       ReceivingData.InviteFrom = mongoose.Types.ObjectId(ReceivingData.InviteFrom);
       ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
       ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);
       if (ReceivingData.InviteTo !== 'Empty') {
           ReceivingData.InviteTo = mongoose.Types.ObjectId(ReceivingData.InviteTo);
       } else {
           ReceivingData.InviteTo = null;
       }
       if (ReceivingData.CustomerCategory === 'Seller') {
           Promise.all([
               CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.InviteFrom, $or: [{ CustomerCategory: ReceivingData.CustomerCategory }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
               InviteModel.InviteManagementSchema.find({ Seller: ReceivingData.InviteFrom, Business: ReceivingData.Business, Branch: ReceivingData.Branch, $or: [{ Invite_Status: 'Pending_Approval' }, { Invite_Status: 'Accept' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
               CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.InviteTo, $or: [{ CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
           ]).then(Response => {
               var CustomerDetails = JSON.parse(JSON.stringify(Response[0]));
               var InviteDetails = JSON.parse(JSON.stringify(Response[1]));
               var InvitedToDetails = JSON.parse(JSON.stringify(Response[2]));

               if (CustomerDetails !== null) {
                   if (InvitedToDetails !== null) {
                       if (InvitedToDetails.CustomerType === 'Owner') {
                           BusinessManagement.BusinessSchema.aggregate([
                               { $match: { IfBuyer: true, Customer: ReceivingData.InviteTo } },
                               {
                                   $lookup: {
                                       from: "Branch",
                                       let: { "id": "$_id" },
                                       pipeline: [
                                           { $match: { $expr: { $eq: ["$$id", "$Business"] } } },
                                           { $project: { "BranchName": 1 } }
                                       ],
                                       as: 'Branches'
                                   }
                               },
                               {
                                   $project: {
                                       BusinessName: 1,
                                       AvailableCreditLimit: 1,
                                       BusinessCreditLimit: 1,
                                       BusinessCategory: 1,
                                       Industry: 1,
                                       Branches: 1,
                                   }
                               }
                           ]).exec((err, result1) => {
                               if (err) {
                                   ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
                                   res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
                               } else {
                                   result1 = JSON.parse(JSON.stringify(result1));
                                   if (result1.length !== 0) {
                                       result1 = result1.filter(obj => {
                                           var ExistingBranches = InviteDetails.map(obj1 => obj1.BuyerBranch);
                                           if (obj.Branches.length > 0) {
                                               obj.Branches = obj.Branches.filter(obj1 => !ExistingBranches.includes(obj1._id));
                                           }
                                           const ReturnValue = obj.Branches.length > 0 ? true : false;
                                           delete obj.Branches;
                                           return ReturnValue;
                                       });
                                   }
                                   if (result1.length > 0) {
                                       res.status(200).send({ Status: true, Message: "Buyer Business list", Response: result1 });
                                   } else {
                                       res.status(200).send({ Status: true, Message: "Buyer Business list un-available ", Response: result1 });
                                   }
                               }
                           });
                       } else if (InvitedToDetails.CustomerType === 'User') {
                           var BusinessArray = [];
                           if (InvitedToDetails.BusinessAndBranches.length > 0) {
                               InvitedToDetails.BusinessAndBranches.map(Obj => {
                                   BusinessArray.push(mongoose.Types.ObjectId(Obj.Business));
                               });
                           }
                           BusinessManagement.BusinessSchema.aggregate([
                               { $match: { IfBuyer: true, _id: { $in: BusinessArray } } },
                               {
                                   $lookup: {
                                       from: "Branch",
                                       let: { "id": "$_id" },
                                       pipeline: [
                                           { $match: { $expr: { $eq: ["$$id", "$Business"] } } },
                                           { $project: { "BranchName": 1 } }
                                       ],
                                       as: 'Branches'
                                   }
                               },
                               {
                                   $project: {
                                       BusinessName: 1,
                                       AvailableCreditLimit: 1,
                                       BusinessCreditLimit: 1,
                                       BusinessCategory: 1,
                                       Industry: 1,
                                       Branches: 1,
                                   }
                               }
                           ]).exec((err, result1) => {
                               if (err) {
                                   ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
                                   res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
                               } else {
                                   result1 = JSON.parse(JSON.stringify(result1));
                                   if (result1.length !== 0) {
                                       result1 = result1.filter(obj => {
                                           var ExistingBranches = InviteDetails.map(obj1 => obj1.BuyerBranch);
                                           if (obj.Branches.length > 0) {
                                               obj.Branches = obj.Branches.filter(obj1 => !ExistingBranches.includes(obj1._id));
                                           }
                                           const ReturnValue = obj.Branches.length > 0 ? true : false;
                                           delete obj.Branches;
                                           return ReturnValue;
                                       });
                                   }
                                   if (result1.length > 0) {
                                       res.status(200).send({ Status: true, Message: "Buyer Business list", Response: result1 });
                                   } else {
                                       res.status(200).send({ Status: true, Message: "Buyer Business list un-available ", Response: result1 });
                                   }
                               }
                           });
                       }
                   } else {
                       res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
                   }
               } else {
                   res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
               }
           }).catch(Error => {
               ErrorHandling.ErrorLogCreation(req, 'Customer Details And Business Details Find Error', 'InviteModel.Controller -> Customer Details And Business Details Find Error', JSON.stringify(Error));
               res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
           });
       } else if (ReceivingData.CustomerCategory === 'Buyer') {
           Promise.all([
               CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.InviteFrom, $or: [{ CustomerCategory: ReceivingData.CustomerCategory }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
               InviteModel.InviteManagementSchema.find({ Buyer: ReceivingData.InviteFrom, BuyerBusiness: ReceivingData.Business, BuyerBranch: ReceivingData.Branch, $or: [{ Invite_Status: 'Pending_Approval' }, { Invite_Status: 'Accept' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
               CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.InviteTo, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
           ]).then(Response => {
               var CustomerDetails = JSON.parse(JSON.stringify(Response[0]));
               var InviteDetails = JSON.parse(JSON.stringify(Response[1]));
               var InvitedToDetails = JSON.parse(JSON.stringify(Response[2]));

               if (CustomerDetails !== null) {
                   if (InvitedToDetails !== null) {
                       if (InvitedToDetails.CustomerType === 'Owner') {
                           BusinessManagement.BusinessSchema.aggregate([
                               { $match: { IfSeller: true, Customer: ReceivingData.InviteTo, ActiveStatus: true, IfDeleted: false } },
                               {
                                   $lookup: {
                                       from: "Branch",
                                       let: { "id": "$_id" },
                                       pipeline: [
                                           { $match: { $expr: { $eq: ["$$id", "$Business"] } } },
                                           { $project: { "BranchName": 1 } }
                                       ],
                                       as: 'Branches'
                                   }
                               },
                               {
                                   $project: {
                                       BusinessName: 1,
                                       AvailableCreditLimit: 1,
                                       BusinessCreditLimit: 1,
                                       BusinessCategory: 1,
                                       Industry: 1,
                                       Branches: 1,
                                   }
                               }
                           ]).exec((err, result1) => {
                               if (err) {
                                   ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
                                   res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
                               } else {
                                   result1 = JSON.parse(JSON.stringify(result1));
                                   if (result1.length !== 0) {
                                       result1 = result1.filter(obj => {
                                           var ExistingBranches = InviteDetails.map(obj1 => obj1.Branch);
                                           if (obj.Branches.length > 0) {
                                               obj.Branches = obj.Branches.filter(obj1 => !ExistingBranches.includes(obj1._id));
                                           }
                                           const ReturnValue = obj.Branches.length > 0 ? true : false;
                                           delete obj.Branches;
                                           return ReturnValue;
                                       });
                                   }
                                   if (result1.length > 0) {
                                       res.status(200).send({ Status: true, Message: "Seller Business list", Response: result1 });
                                   } else {
                                       res.status(200).send({ Status: true, Message: "Seller Business list un-available ", Response: result1 });
                                   }
                               }
                           });
                       } else if (InvitedToDetails.CustomerType === 'User') {
                           var BusinessArray = [];
                           if (InvitedToDetails.BusinessAndBranches.length > 0) {
                               InvitedToDetails.BusinessAndBranches.map(Obj => {
                                   BusinessArray.push(mongoose.Types.ObjectId(Obj.Business));
                               });
                           }
                           BusinessManagement.BusinessSchema.aggregate([
                               { $match: { IfSeller: true, _id: { $in: BusinessArray }, ActiveStatus: true, IfDeleted: false } },
                               {
                                   $lookup: {
                                       from: "Branch",
                                       let: { "id": "$_id" },
                                       pipeline: [
                                           { $match: { $expr: { $eq: ["$$id", "$Business"] } } },
                                           { $project: { "BranchName": 1 } }
                                       ],
                                       as: 'Branches'
                                   }
                               },
                               {
                                   $project: {
                                       BusinessName: 1,
                                       AvailableCreditLimit: 1,
                                       BusinessCreditLimit: 1,
                                       BusinessCategory: 1,
                                       Industry: 1,
                                       Branches: 1,
                                   }
                               }
                           ]).exec((err, result1) => {
                               if (err) {
                                   ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
                                   res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
                               } else {
                                   result1 = JSON.parse(JSON.stringify(result1));
                                   if (result1.length !== 0) {
                                       result1 = result1.filter(obj => {
                                           var ExistingBranches = InviteDetails.map(obj1 => obj1.Branch);
                                           if (obj.Branches.length > 0) {
                                               obj.Branches = obj.Branches.filter(obj1 => !ExistingBranches.includes(obj1._id));
                                           }
                                           const ReturnValue = obj.Branches.length > 0 ? true : false;
                                           delete obj.Branches;
                                           return ReturnValue;
                                       });
                                   }
                                   if (result1.length > 0) {
                                       res.status(200).send({ Status: true, Message: "Seller Business list", Response: result1 });
                                   } else {
                                       res.status(200).send({ Status: true, Message: "Seller Business list un-available ", Response: result1 });
                                   }
                               }
                           });
                       }
                   } else {
                       res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
                   }
               } else {
                   res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
               }
           }).catch(Error => {
               ErrorHandling.ErrorLogCreation(req, 'Customer Details And Business Details Find Error', 'InviteModel.Controller -> Customer Details And Business Details Find Error', JSON.stringify(Error));
               res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
           });
       }
   }
};

exports.SellerAndBuyerBranchList = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.InviteFrom || ReceivingData.InviteFrom === '') {
       res.status(400).send({ Status: false, Message: "Invite From details can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
       res.status(400).send({ Status: false, Message: "Customer Category details can not be empty" });
   } else if (!ReceivingData.InviteTo || ReceivingData.InviteTo === '') {
       res.status(400).send({ Status: false, Message: "InviteTo details can not be empty" });
   } else if (!ReceivingData.Business || ReceivingData.Business === '') {
       res.status(400).send({ Status: false, Message: "Business details can not be empty" });
   } else if (!ReceivingData.Branch || ReceivingData.Branch === '') {
       res.status(400).send({ Status: false, Message: "Branch details can not be empty" });
   } else if (!ReceivingData.BusinessTo || ReceivingData.BusinessTo === '') {
       res.status(400).send({ Status: false, Message: "Business To details can not be empty" });
   } else {
       ReceivingData.InviteFrom = mongoose.Types.ObjectId(ReceivingData.InviteFrom);
       ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
       ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);
       ReceivingData.BusinessTo = mongoose.Types.ObjectId(ReceivingData.BusinessTo);
       if (ReceivingData.InviteTo !== 'Empty') {
           ReceivingData.InviteTo = mongoose.Types.ObjectId(ReceivingData.InviteTo);
       } else {
           ReceivingData.InviteTo = null;
       }
       if (ReceivingData.CustomerCategory === 'Seller') {
           Promise.all([
               CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.InviteFrom, $or: [{ CustomerCategory: ReceivingData.CustomerCategory }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
               InviteModel.InviteManagementSchema.find({ Seller: ReceivingData.InviteFrom, Business: ReceivingData.Business, Branch: ReceivingData.Branch, $or: [{ Invite_Status: 'Pending_Approval' }, { Invite_Status: 'Accept' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
               CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.InviteTo, $or: [{ CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
               TemporaryManagement.CreditSchema.find({ Buyer: ReceivingData.InviteFrom, BuyerBusiness: ReceivingData.Business, BuyerBranch: ReceivingData.Branch, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
           ]).then(Response => {
               var CustomerDetails = JSON.parse(JSON.stringify(Response[0]));
               var InviteDetails = JSON.parse(JSON.stringify(Response[1]));
               var InvitedToDetails = JSON.parse(JSON.stringify(Response[2]));
               var TemporaryDetails = JSON.parse(JSON.stringify(Response[3]));
               if (CustomerDetails !== null) {
                   if (InvitedToDetails !== null) {
                       if (InvitedToDetails.CustomerType === 'Owner') {
                           BusinessManagement.BranchSchema.find({ Customer: ReceivingData.InviteTo, Business: ReceivingData.BusinessTo, ActiveStatus: true, IfDeleted: false },
                               {
                                   BranchName: 1,
                                   BranchCreditLimit: 1,
                                   BrachCategory: 1,
                                   Mobile: 1,
                                   Address: 1,
                                   RegistrationId: 1,
                                   AvailableCreditLimit: 1,
                                   GSTIN: 1
                               }).exec((err, result) => {
                                   if (err) {
                                       ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
                                       res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
                                   } else {
                                       result = JSON.parse(JSON.stringify(result));
                                       if (result.length !== 0) {
                                           result = result.filter(obj => {
                                               const result1Arr = InviteDetails.filter(obj1 => obj1.BuyerBranch === obj._id);
                                               return result1Arr.length > 0 ? false : true;
                                           });
                                       }
                                       if (result.length > 0) {
                                           result.map(Obj => {
                                               const result1Arr = TemporaryDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
                                               if (result1Arr.length > 0) {
                                                   var ValidityDate = new Date();
                                                   var TodayDate = new Date();
                                                   result1Arr.map(obj => {
                                                       ValidityDate = new Date(obj.updatedAt);
                                                       ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + obj.ApprovedPeriod));
                                                       if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                                                           Obj.BranchCreditLimit = parseFloat(Obj.BranchCreditLimit) + parseFloat(obj.ApproveLimit);
                                                           Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.ApproveLimit);
                                                       }
                                                   });
                                               }
                                               const result2Arr = InviteDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
                                               if (result2Arr.length > 0) {
                                                   var ValidityInviteDate = new Date();
                                                   var TodayInviteDate = new Date();
                                                   result2Arr.map(obj => {
                                                    //   ValidityInviteDate = new Date(obj.updatedAt);
                                                     //  ValidityInviteDate = new Date(ValidityInviteDate.setDate(ValidityInviteDate.getDate() + obj.BuyerPaymentCycle));
                                                    //   if (ValidityInviteDate.valueOf() >= TodayInviteDate.valueOf()) {
                                                           Obj.BranchCreditLimit = parseFloat(Obj.BranchCreditLimit) + parseFloat(obj.AvailableLimit);
                                                           Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.AvailableLimit);
                                                     //  }
                                                   });
                                               }

                                               if (Obj.BranchCreditLimit > 0) {
                                                   Obj.BranchCreditLimit = Obj.BranchCreditLimit.toFixed(2);
                                                   Obj.BranchCreditLimit = parseFloat(Obj.BranchCreditLimit);
                                                   Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                                                   Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                               }
                                           });
                                           res.status(200).send({ Status: true, Message: "Buyer Branches list", Response: result });
                                       } else {
                                           res.status(200).send({ Status: true, Message: "Buyer Branches list un-available ", Response: result });
                                       }
                                   }
                               });
                       } else if (InvitedToDetails.CustomerType === 'User') {
                           var BranchArray = [];
                           if (InvitedToDetails.BusinessAndBranches.length > 0) {
                               InvitedToDetails.BusinessAndBranches.map(Obj => {
                                   Obj.Branches.map(obj => {
                                       BranchArray.push(mongoose.Types.ObjectId(obj));
                                   });
                               });
                           }

                           BusinessManagement.BranchSchema.find({ _id: { $in: BranchArray }, Business: ReceivingData.BusinessTo, ActiveStatus: true, IfDeleted: false },
                               {
                                   BranchName: 1,
                                   BranchCreditLimit: 1,
                                   BrachCategory: 1,
                                   Mobile: 1,
                                   Address: 1,
                                   RegistrationId: 1,
                                   AvailableCreditLimit: 1,
                                   GSTIN: 1
                               }).exec((err, result) => {
                                   if (err) {
                                       ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
                                       res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
                                   } else {
                                       result = JSON.parse(JSON.stringify(result));
                                       if (result.length !== 0) {
                                           result = result.filter(obj => {
                                               const result1Arr = InviteDetails.filter(obj1 => obj1.BuyerBranch === obj._id);
                                               return result1Arr.length > 0 ? false : true;
                                           });
                                       }
                                       if (result.length > 0) {
                                           result.map(Obj => {
                                               const result1Arr = TemporaryDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
                                               if (result1Arr.length > 0) {
                                                   var ValidityDate = new Date();
                                                   var TodayDate = new Date();
                                                   result1Arr.map(obj => {
                                                       ValidityDate = new Date(obj.updatedAt);
                                                       ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + obj.ApprovedPeriod));
                                                       if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                                                           Obj.BranchCreditLimit = parseFloat(Obj.BranchCreditLimit) + parseFloat(obj.ApproveLimit);
                                                           Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.ApproveLimit);;
                                                       }
                                                   });
                                               }
                                               const result2Arr = InviteDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
                                               if (result2Arr.length > 0) {
                                                   var ValidityInviteDate = new Date();
                                                   var TodayInviteDate = new Date();
                                                   result2Arr.map(obj => {
                                                    //   ValidityInviteDate = new Date(obj.updatedAt);
                                                    //   ValidityInviteDate = new Date(ValidityInviteDate.setDate(ValidityInviteDate.getDate() + obj.BuyerPaymentCycle));
                                                    //   if (ValidityInviteDate.valueOf() >= TodayInviteDate.valueOf()) {
                                                           Obj.BranchCreditLimit = parseFloat(Obj.BranchCreditLimit) + parseFloat(obj.AvailableLimit);
                                                           Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.AvailableLimit);
                                                    //   }
                                                   });
                                               }

                                               if (Obj.BranchCreditLimit > 0) {
                                                   Obj.BranchCreditLimit = Obj.BranchCreditLimit.toFixed(2);
                                                   Obj.BranchCreditLimit = parseFloat(Obj.BranchCreditLimit);
                                                   Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                                                   Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                               }
                                           });
                                           res.status(200).send({ Status: true, Message: "Buyer Branches list", Response: result });
                                       } else {
                                           res.status(200).send({ Status: true, Message: "Buyer Branches list un-available ", Response: result });
                                       }
                                   }
                               });
                       }
                   } else {
                       res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
                   }
               } else {
                   res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
               }
           }).catch(Error => {
               ErrorHandling.ErrorLogCreation(req, 'Customer Details And Business Details Find Error', 'InviteModel.Controller -> Customer Details And Business Details Find Error', JSON.stringify(Error));
               res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
           });
       } else if (ReceivingData.CustomerCategory === 'Buyer') {
           Promise.all([
               CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.InviteFrom, $or: [{ CustomerCategory: ReceivingData.CustomerCategory }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
               InviteModel.InviteManagementSchema.find({ Buyer: ReceivingData.InviteFrom, BuyerBusiness: ReceivingData.Business, BuyerBranch: ReceivingData.Branch, $or: [{ Invite_Status: 'Pending_Approval' }, { Invite_Status: 'Accept' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
               CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.InviteTo, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
           ]).then(Response => {
               var CustomerDetails = JSON.parse(JSON.stringify(Response[0]));
               var InviteDetails = JSON.parse(JSON.stringify(Response[1]));
               var InvitedToDetails = JSON.parse(JSON.stringify(Response[2]));

               if (CustomerDetails !== null) {
                   if (InvitedToDetails !== null) {
                       if (InvitedToDetails.CustomerType === 'Owner') {
                           BusinessManagement.BranchSchema.find({ Customer: ReceivingData.InviteTo, Business: ReceivingData.BusinessTo },
                               {
                                   BranchName: 1,
                                   BranchCreditLimit: 1,
                                   BrachCategory: 1,
                                   Mobile: 1,
                                   Address: 1,
                                   RegistrationId: 1,
                                   AvailableCreditLimit: 1,
                                   GSTIN: 1
                               }).exec((err, result) => {
                                   if (err) {
                                       ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
                                       res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
                                   } else {
                                       result = JSON.parse(JSON.stringify(result));
                                       if (result.length !== 0) {
                                           result = result.filter(obj => {
                                               const result1Arr = InviteDetails.filter(obj1 => obj1.Branch === obj._id);
                                               return result1Arr.length > 0 ? false : true;
                                           });
                                       }
                                       if (result.length > 0) {
                                           res.status(200).send({ Status: true, Message: "Seller Branches list", Response: result });
                                       } else {
                                           res.status(200).send({ Status: true, Message: "Seller Branches list un-available ", Response: result });
                                       }
                                   }
                               });
                       } else if (InvitedToDetails.CustomerType === 'User') {
                           var BranchArray = [];
                           if (InvitedToDetails.BusinessAndBranches.length > 0) {
                               InvitedToDetails.BusinessAndBranches.map(Obj => {
                                   Obj.Branches.map(obj => {
                                       BranchArray.push(mongoose.Types.ObjectId(obj));
                                   });
                               });
                           }
                           BusinessManagement.BranchSchema.find({ _id: { $in: BranchArray }, Business: ReceivingData.BusinessTo },
                               {
                                   BranchName: 1,
                                   BranchCreditLimit: 1,
                                   BrachCategory: 1,
                                   Mobile: 1,
                                   Address: 1,
                                   RegistrationId: 1,
                                   AvailableCreditLimit: 1,
                                   GSTIN: 1
                               }).exec((err, result) => {
                                   if (err) {
                                       ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
                                       res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
                                   } else {
                                       result = JSON.parse(JSON.stringify(result));
                                       if (result.length !== 0) {
                                           result = result.filter(obj => {
                                               const result1Arr = InviteDetails.filter(obj1 => obj1.Branch === obj._id);
                                               return result1Arr.length > 0 ? false : true;
                                           });
                                       }
                                       if (result.length > 0) {
                                           res.status(200).send({ Status: true, Message: "Seller Branches list", Response: result });
                                       } else {
                                           res.status(200).send({ Status: true, Message: "Seller Branches list un-available ", Response: result });
                                       }
                                   }
                               });
                       }
                   } else {
                       res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
                   }

               } else {
                   res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
               }
           }).catch(Error => {
               ErrorHandling.ErrorLogCreation(req, 'Customer Details And Business Details Find Error', 'InviteModel.Controller -> Customer Details And Business Details Find Error', JSON.stringify(Error));
               res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
           });
       }
   }
};

// SellerBusiness_List
exports.SellerBusiness_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Customer || ReceivingData.Customer === '') {
      res.status(400).send({ Status: false, Message: "Customer can not be empty" });
   } else if (!ReceivingData.Category || ReceivingData.Category === '') {
      res.status(400).send({ Status: false, Message: "Category can not be empty" });
   } else {
      ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer }, {}, {}).exec(),
      ]).then(Response => {
         var CustomerDetails = Response[0];
         var BusinessArr = [];
         if (CustomerDetails !== null) {
            if (CustomerDetails.CustomerType === 'Owner') {
               Promise.all([
                  BusinessManagement.BranchSchema.find({ Customer: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
               ]).then(ResponseRes => {
                  var BranchDetails = JSON.parse(JSON.stringify(ResponseRes[0]));
                  BusinessManagement.BusinessSchema.find({ IsAssigned: true, IfSeller: true, Customer: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false },
                     {
                        BusinessName: 1,
                        Customer: 1,
                        AvailableCreditLimit: 1,
                        BusinessCreditLimit: 1,
                        BusinessCategory: 1,
                        Industry: 1,
                     }).populate({ path: "Industry", select: ["Industry_Name"] }).exec((err, result1) => {
                        if (err) {
                           ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
                           res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
                        } else {
                           result1 = JSON.parse(JSON.stringify(result1));
                           if (result1.length > 0) {
                              result1.map(Obj => {
                                 Obj.ExtraUnitizedCreditLimit = 0;
                                 Obj.CreditBalanceExists = false;
                                 const result3Arr = BranchDetails.filter(obj1 => obj1.Business === Obj._id);
                                 var BranchCreditLimit = 0;
                                 if (result3Arr.length > 0) {                                    
                                    result3Arr.map(obj => {
                                       BranchCreditLimit = parseFloat(BranchCreditLimit) + parseFloat(obj.AvailableCreditLimit);
                                    });
                                 }
                                 Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) - parseFloat(BranchCreditLimit);                                 
                                 if (Obj.AvailableCreditLimit > 0) {
                                    Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                 } else {
                                    Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                    Obj.ExtraUnitizedCreditLimit = Obj.ExtraUnitizedCreditLimit.toFixed(2);
                                    Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.ExtraUnitizedCreditLimit);
                                    Obj.CreditBalanceExists = true;
                                    Obj.AvailableCreditLimit = 0;
                                 }
                                 Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                                 Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);                                 
                                 return Obj;
                              });
                           }
                           res.status(200).send({ Status: true, Message: "My Business list", Response: result1 });
                        }
                     });
               }).catch(ErrorRes => {
                  ErrorHandling.ErrorLogCreation(req, 'Business List Getting Error', 'BusinessManagement.Controller -> BuyerBusinessList', JSON.stringify(ErrorRes));
                  res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: ErrorRes });
               });
            } else if (CustomerDetails.CustomerType === 'User') {
               if (CustomerDetails.BusinessAndBranches.length !== 0) {
                  CustomerDetails.BusinessAndBranches.map(Obj => {
                     BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                  });
               }
               ReceivingData.Customer = mongoose.Types.ObjectId(CustomerDetails.Owner);
              Promise.all([
                  BusinessManagement.BranchSchema.find({ Customer: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
               ]).then(ResponseRes => {
                  var BranchDetails = JSON.parse(JSON.stringify(ResponseRes[0]));
                  BusinessManagement.BusinessSchema.find({ IsAssigned: true, IfSeller: true, _id: { $in: BusinessArr }, ActiveStatus: true, IfDeleted: false },
                     {
                        BusinessName: 1,
                        Customer: 1,
                        AvailableCreditLimit: 1,
                        BusinessCreditLimit: 1,
                        BusinessCategory: 1,
                        Industry: 1,
                     }).populate({ path: "Industry", select: ["Industry_Name"] }).exec((err, result1) => {
                        if (err) {
                           ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
                           res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
                        } else {
                           result1 = JSON.parse(JSON.stringify(result1));
                           if (result1.length > 0) {
                              result1.map(Obj => {
                                 Obj.ExtraUnitizedCreditLimit = 0;
                                 Obj.CreditBalanceExists = false;
                                 const result3Arr = BranchDetails.filter(obj1 => obj1.Business === Obj._id);
                                 var BranchCreditLimit = 0;
                                 if (result3Arr.length > 0) {                                    
                                    result3Arr.map(obj => {
                                       BranchCreditLimit = parseFloat(BranchCreditLimit) + parseFloat(obj.AvailableCreditLimit);
                                    });
                                 }                               
                                 Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) - parseFloat(BranchCreditLimit);                                 
                                 if (Obj.AvailableCreditLimit > 0) {
                                    Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                 } else {
                                    Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                    Obj.ExtraUnitizedCreditLimit = Obj.ExtraUnitizedCreditLimit.toFixed(2);
                                    Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.ExtraUnitizedCreditLimit);
                                    Obj.CreditBalanceExists = true;
                                    Obj.AvailableCreditLimit = 0;
                                 }
                                 Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                                 Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);                                 
                                 return Obj;
                              });
                           }
                           res.status(200).send({ Status: true, Message: "My Business list", Response: result1 });
                        }
                     });
               }).catch(ErrorRes => {
                  ErrorHandling.ErrorLogCreation(req, 'Business List Getting Error', 'BusinessManagement.Controller -> BuyerBusinessList', JSON.stringify(ErrorRes));
                  res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: ErrorRes });
               });
            }
         } else {
            res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
         }
      }).catch(Error => {
         res.status(400).send({ Status: false, Message: "Some Occurred Error" });
      });
   }
};

// BuyerBusiness_List
exports.BuyerBusiness_List = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.Customer || ReceivingData.Customer === '') {
       res.status(400).send({ Status: false, Message: "Customer can not be empty" });
    } else if (!ReceivingData.Category || ReceivingData.Category === '') {
       res.status(400).send({ Status: false, Message: "Category can not be empty" });
    } else {
       ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
       Promise.all([
          CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer }, {}, {}).exec(),
       ]).then(Response => {
          var CustomerDetails = Response[0];
          var BusinessArr = [];
          if (CustomerDetails !== null) {
             if (CustomerDetails.CustomerType === 'Owner') {
                Promise.all([
                   InviteModel.InviteManagementSchema.find({ Buyer: ReceivingData.Customer, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                   TemporaryManagement.CreditSchema.find({ Buyer: ReceivingData.Customer, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                   InvoiceManagement.InvoiceSchema.find({ Buyer: ReceivingData.Customer, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                ]).then(ResponseRes => {
                   var InviteDetails = JSON.parse(JSON.stringify(ResponseRes[0]));
                   var TemporaryDetails = JSON.parse(JSON.stringify(ResponseRes[1]));
                   var InvoiceDetails = JSON.parse(JSON.stringify(ResponseRes[2]));
                   BusinessManagement.BusinessSchema.find({ IsAssigned: true, IfBuyer: true, Customer: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false },
                      {
                         BusinessName: 1,
                         Customer: 1,
                         AvailableCreditLimit: 1,
                         BusinessCreditLimit: 1,
                         BusinessCategory: 1,
                         Industry: 1,
                      }).populate({ path: "Industry", select: ["Industry_Name"] }).exec((err, result1) => {
                         if (err) {
                            ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
                            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
                         } else {
                            result1 = JSON.parse(JSON.stringify(result1));
                            if (result1.length !== 0) {
                               result1.map(Obj => {
                                  Obj.ExtraUnitizedCreditLimit = 0;
                                  Obj.CreditBalanceExists = false;
                                  const result1Arr = TemporaryDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                                  if (result1Arr.length > 0) {
                                     var ValidityDate = new Date();
                                     var TodayDate = new Date();
                                     result1Arr.map(obj => {
                                        ValidityDate = new Date(obj.updatedAt);
                                        ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + obj.ApprovedPeriod));
                                        if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                                           Obj.BusinessCreditLimit = parseFloat(Obj.BusinessCreditLimit) + parseFloat(obj.ApproveLimit);
                                           Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.ApproveLimit);
                                        }
                                     });
                                  }
 
                                  const result2Arr = InviteDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                                  if (result2Arr.length > 0) {
                                     result2Arr.map(obj => {
                                        Obj.BusinessCreditLimit = parseFloat(Obj.BusinessCreditLimit) + parseFloat(obj.AvailableLimit);
                                        Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.AvailableLimit);
                                     });
                                  }
 
                                  const result3Arr = InvoiceDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
 
                                  if (result3Arr.length > 0) {
                                     var InvoiceAmount = 0;
                                     var InvoiceAmount = 0;
                                     result3Arr.map(obj => {
                                        InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.AvailableAmount);
                                     });
                                     if (InvoiceAmount > 0) {
                                        Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) - parseFloat(InvoiceAmount);
                                        if (Obj.AvailableCreditLimit > 0) {
                                           Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                        } else {
                                           Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                           Obj.CreditBalanceExists = true;
                                           Obj.AvailableCreditLimit = 0;
                                        }
                                     }
                                     Obj.ExtraUnitizedCreditLimit = Obj.ExtraUnitizedCreditLimit.toFixed(2);
                                     Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.ExtraUnitizedCreditLimit);
                                     Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                                     Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                  }
                                  return Obj;
                               });
                            }
                            res.status(200).send({ Status: true, Message: "My Business list", Response: result1 });
                         }
                      });
                }).catch(ErrorRes => {
                   ErrorHandling.ErrorLogCreation(req, 'Business List Getting Error', 'BusinessManagement.Controller -> BuyerBusinessList', JSON.stringify(ErrorRes));
                   res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: ErrorRes });
                });
             } else if (CustomerDetails.CustomerType === 'User') {
                if (CustomerDetails.BusinessAndBranches.length !== 0) {
                   CustomerDetails.BusinessAndBranches.map(Obj => {
                      BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                   });
                }
                Promise.all([
                   InviteModel.InviteManagementSchema.find({ BuyerBusiness: { $in: BusinessArr }, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                   TemporaryManagement.CreditSchema.find({ BuyerBusiness: { $in: BusinessArr }, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                   InvoiceManagement.InvoiceSchema.find({ BuyerBusiness: { $in: BusinessArr }, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                ]).then(ResponseRes => {
                   var InviteDetails = JSON.parse(JSON.stringify(ResponseRes[0]));
                   var TemporaryDetails = JSON.parse(JSON.stringify(ResponseRes[1]));
                   var InvoiceDetails = JSON.parse(JSON.stringify(ResponseRes[2]));
                   BusinessManagement.BusinessSchema.find({ IsAssigned: true, IfBuyer: true, _id: { $in: BusinessArr }, ActiveStatus: true, IfDeleted: false },
                      {
                         BusinessName: 1,
                         Customer: 1,
                         AvailableCreditLimit: 1,
                         BusinessCreditLimit: 1,
                         BusinessCategory: 1,
                         Industry: 1,
                      }).populate({ path: "Industry", select: ["Industry_Name"] }).exec((err, result1) => {
                         if (err) {
                            ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
                            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
                         } else {
                            result1 = JSON.parse(JSON.stringify(result1));
                            if (result1.length !== 0) {
                               result1.map(Obj => {
                                  Obj.ExtraUnitizedCreditLimit = 0;
                                  Obj.CreditBalanceExists = false;
                                  const result1Arr = TemporaryDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                                  if (result1Arr.length > 0) {
                                     var ValidityDate = new Date();
                                     var TodayDate = new Date();
                                     result1Arr.map(obj => {
                                        ValidityDate = new Date(obj.updatedAt);
                                        ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + obj.ApprovedPeriod));
                                        if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                                           Obj.BusinessCreditLimit = parseFloat(Obj.BusinessCreditLimit) + parseFloat(obj.ApproveLimit);
                                           Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.ApproveLimit);
                                        }
                                     });
                                  }
 
                                  const result2Arr = InviteDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                                  if (result2Arr.length > 0) {
                                     result2Arr.map(obj => {                                        
                                        Obj.BusinessCreditLimit = parseFloat(Obj.BusinessCreditLimit) + parseFloat(obj.AvailableLimit);
                                        Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.AvailableLimit);
                                     });
                                  }
 
                                  const result3Arr = InvoiceDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                                  if (result3Arr.length > 0) {
                                     var InvoiceAmount = 0;
                                     result3Arr.map(obj => {
                                        InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.AvailableAmount);
                                     });
 
                                     if (InvoiceAmount > 0) {
                                        Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) - parseFloat(InvoiceAmount);
                                        if (Obj.AvailableCreditLimit > 0) {
                                           Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                        } else {
                                           Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                           Obj.CreditBalanceExists = true;
                                           Obj.AvailableCreditLimit = 0;
                                        }
                                     }
                                     Obj.ExtraUnitizedCreditLimit = Obj.ExtraUnitizedCreditLimit.toFixed(2);
                                     Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.ExtraUnitizedCreditLimit);
                                     Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                                     Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                  }
                                  return Obj;
                               });
                            }
                            res.status(200).send({ Status: true, Message: "My Business list", Response: result1 });
                         }
                      });
                }).catch(ErrorRes => {
                    
                   ErrorHandling.ErrorLogCreation(req, 'Business List Getting Error', 'BusinessManagement.Controller -> BuyerBusinessList', JSON.stringify(ErrorRes));
                   res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: ErrorRes });
                });
             }
          } else {
             res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
          }
       }).catch(Error => {
          res.status(400).send({ Status: false, Message: "Some Occurred Error" });
       });
    }
 };

// BuyerBranchesOfBusiness_List
exports.BuyerBranchesOfBusiness_List = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.Customer || ReceivingData.Customer === '') {
       res.status(400).send({ Status: false, Message: "Customer can not be empty" });
    } else if (!ReceivingData.Business || ReceivingData.Business === '') {
       res.status(400).send({ Status: false, Message: "Business can not be empty" });
    } else {
       ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
       ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
 
       Promise.all([
          CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer }, {}, {}).exec(),
       ]).then(Response => {
          var CustomerDetails = Response[0];
          var BranchArr = [];
          if (CustomerDetails !== null) {
             if (CustomerDetails.CustomerType === 'Owner') {
                Promise.all([
                   InviteModel.InviteManagementSchema.find({ Buyer: ReceivingData.Customer, BuyerBusiness: ReceivingData.Business, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                   TemporaryManagement.CreditSchema.find({ Buyer: ReceivingData.Customer, BuyerBusiness: ReceivingData.Business, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                   InvoiceManagement.InvoiceSchema.find({ Buyer: ReceivingData.Customer, BuyerBusiness: ReceivingData.Business, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                ]).then(ResponseRes => {
                   var InviteDetails = JSON.parse(JSON.stringify(ResponseRes[0]));
                   var TemporaryDetails = JSON.parse(JSON.stringify(ResponseRes[1]));
                   var InvoiceDetails = JSON.parse(JSON.stringify(ResponseRes[2]));
                   BusinessManagement.BranchSchema.find({ IsAssigned: true, Customer: ReceivingData.Customer, Business: ReceivingData.Business, ActiveStatus: true, IfDeleted: false },
                      {
                         BranchName: 1,
                         Customer: 1,
                         BranchCreditLimit: 1,
                         BrachCategory: 1,
                         Mobile: 1,
                         Address: 1,
                         RegistrationId: 1,
                         AvailableCreditLimit: 1,
                         GSTIN: 1
                      }).populate({ path: "Customer", select: ["ContactName", "Mobile", "Email", "CustomerCategory", "CustomerType"] })
                      .populate({ path: "Business", select: ['BusinessCategory', "BusinessName", "BusinessCreditLimit", "AvailableCreditLimit"] }).exec((err, result) => {
                         if (err) {
                            ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessAndBranchManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
                            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
                         } else {
                            result = JSON.parse(JSON.stringify(result));
                            if (result.length !== 0) {
                               result.map(Obj => {
                                  Obj.ExtraUnitizedCreditLimit = 0;
                                  Obj.CreditBalanceExists = false;
                                  const result1Arr = TemporaryDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
                                  if (result1Arr.length > 0) {
                                     var ValidityDate = new Date();
                                     var TodayDate = new Date();
                                     result1Arr.map(obj => {
                                        ValidityDate = new Date(obj.updatedAt);
                                        ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + obj.ApprovedPeriod));
                                        if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                                           Obj.BranchCreditLimit = parseFloat(Obj.BranchCreditLimit) + parseFloat(obj.ApproveLimit);
                                           Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.ApproveLimit);
                                        }
                                     });
                                  }
 
                                  const result2Arr = InviteDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
                                  if (result2Arr.length > 0) {
                                     result2Arr.map(obj => {                                        
                                        Obj.BranchCreditLimit = parseFloat(Obj.BranchCreditLimit) + parseFloat(obj.AvailableLimit);
                                        Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.AvailableLimit);
                                     });
                                  }
 
                                  const result3Arr = InvoiceDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
 
                                  if (result3Arr.length > 0) {
                                     var InvoiceAmount = 0;
                                     result3Arr.map(obj => {
                                        InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.AvailableAmount);
                                     });
                                     if (InvoiceAmount > 0) {
                                        Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) - parseFloat(InvoiceAmount);
                                        if (Obj.AvailableCreditLimit > 0) {
                                           Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                        } else {
                                           Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                           Obj.CreditBalanceExists = true;
                                           Obj.AvailableCreditLimit = 0;
                                        }
                                     }
                                  }
 
                                  Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                                  Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                  Obj.ExtraUnitizedCreditLimit = Obj.ExtraUnitizedCreditLimit.toFixed(2);
                                  Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.ExtraUnitizedCreditLimit);
                                  return Obj;
                               });
                            }
                            res.status(200).send({ Status: true, Response: result, Message: 'Branches List' });
                         }
                      });
                }).catch(ErrorRes => {
                   ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessAndBranchManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(ErrorRes));
                   res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: ErrorRes });
                });
             } else if (CustomerDetails.CustomerType === 'User') {
                if (CustomerDetails.BusinessAndBranches.length !== 0) {
                   CustomerDetails.BusinessAndBranches.map(Obj => {
                      Obj.Branches.map(obj => {
                         BranchArr.push(mongoose.Types.ObjectId(obj));
                      });
                   });
                }
 
                Promise.all([
                   InviteManagement.InviteManagementSchema.find({ BuyerBranch: { $in: BranchArr }, BuyerBusiness: ReceivingData.Business, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                   TemporaryManagement.CreditSchema.find({ BuyerBranch: { $in: BranchArr }, BuyerBusiness: ReceivingData.Business, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                   InvoiceManagement.InvoiceSchema.find({ BuyerBranch: { $in: BranchArr }, BuyerBusiness: ReceivingData.Business, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                ]).then(ResponseRes => {
                   var InviteDetails = JSON.parse(JSON.stringify(ResponseRes[0]));
                   var TemporaryDetails = JSON.parse(JSON.stringify(ResponseRes[1]));
                   var InvoiceDetails = JSON.parse(JSON.stringify(ResponseRes[2]));
                   BusinessManagement.BranchSchema.find({ UserAssigned: true, IsAssigned: true, _id: { $in: BranchArr }, Business: ReceivingData.Business, ActiveStatus: true, IfDeleted: false },
                      {
                         BranchName: 1,
                         Customer: 1,
                         BranchCreditLimit: 1,
                         BrachCategory: 1,
                         Mobile: 1,
                         Address: 1,
                         RegistrationId: 1,
                         AvailableCreditLimit: 1,
                         GSTIN: 1
                      }).populate({ path: "Customer", select: ["ContactName", "Mobile", "Email", "CustomerCategory", "CustomerType"] })
                      .populate({ path: "Business", select: ['BusinessCategory', "BusinessName", "BusinessCreditLimit", "AvailableCreditLimit"] }).exec((err, result) => {
                         if (err) {
                            ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessAndBranchManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
                            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
                         } else {
                            result = JSON.parse(JSON.stringify(result));
                            if (result.length !== 0) {
                               result.map(Obj => {
                                  Obj.ExtraUnitizedCreditLimit = 0;
                                  Obj.CreditBalanceExists = false;
                                  const result1Arr = TemporaryDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
                                  if (result1Arr.length > 0) {
                                     var ValidityDate = new Date();
                                     var TodayDate = new Date();
                                     result1Arr.map(obj => {
                                        ValidityDate = new Date(obj.updatedAt);
                                        ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + obj.ApprovedPeriod));
                                        if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                                           Obj.BranchCreditLimit = parseFloat(Obj.BranchCreditLimit) + parseFloat(obj.ApproveLimit);
                                           Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.ApproveLimit);
                                        }
                                     });
                                  }
 
                                  const result2Arr = InviteDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
                                  if (result2Arr.length > 0) {
                                     result2Arr.map(obj => {                                        
                                        Obj.BranchCreditLimit = parseFloat(Obj.BranchCreditLimit) + parseFloat(obj.AvailableLimit);
                                        Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.AvailableLimit);
                                     });
                                  }
 
                                  const result3Arr = InvoiceDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
 
                                  if (result3Arr.length > 0) {
                                     var InvoiceAmount = 0;
                                     result3Arr.map(obj => {
                                        InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.AvailableAmount);
                                     });
                                     if (InvoiceAmount > 0) {
                                        Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) - parseFloat(InvoiceAmount);
                                        if (Obj.AvailableCreditLimit > 0) {
                                           Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                        } else {
                                           Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                           Obj.CreditBalanceExists = true;
                                           Obj.AvailableCreditLimit = 0;
                                        }
                                     }
                                  }
                                  Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                                  Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                  Obj.ExtraUnitizedCreditLimit = Obj.ExtraUnitizedCreditLimit.toFixed(2);
                                  Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.ExtraUnitizedCreditLimit);
                                  return Obj;
                               });
                            }
                            res.status(200).send({ Status: true, Response: result, Message: 'Branches List' });
                         }
                      });
                }).catch(ErrorRes => {
                   ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessAndBranchManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(ErrorRes));
                   res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: ErrorRes });
                });
             }
          } else {
             res.status(417).send({ Status: false, Message: 'Invalid Customer Details' });
          }
       }).catch(Response => {
          res.status(417).send({ Status: false, Message: "Some errors Error." });
          ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessAndBranchManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
       });
    }
 };

// SellerBranchesOfBusiness_List
exports.SellerBranchesOfBusiness_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Customer || ReceivingData.Customer === '') {
      res.status(400).send({ Status: false, Message: "Customer can not be empty" });
   } else if (!ReceivingData.Business || ReceivingData.Business === '') {
      res.status(400).send({ Status: false, Message: "Business can not be empty" });
   } else {
      ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
      ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);

      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer }, {}, {}).exec(),
      ]).then(Response => {
         var CustomerDetails = Response[0];
         var BranchArr = [];

         if (CustomerDetails !== null) {
            if (CustomerDetails.CustomerType === 'Owner') {
               Promise.all([
                  InviteModel.InviteManagementSchema.find({ Seller: ReceivingData.Customer, Business: ReceivingData.Business, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                  BusinessManagement.BranchSchema.find({ IsAssigned: true, Customer: ReceivingData.Customer, Business: ReceivingData.Business, ActiveStatus: true, IfDeleted: false }).exec()
               ]).then(ResponseRes => {
                  var InvoiceDetails = JSON.parse(JSON.stringify(ResponseRes[0]));
                  var BranchDetails = JSON.parse(JSON.stringify(ResponseRes[1]));
                  BusinessManagement.BranchSchema.find({ IsAssigned: true, Customer: ReceivingData.Customer, Business: ReceivingData.Business, ActiveStatus: true, IfDeleted: false },
                     {
                        BranchName: 1,
                        BranchCreditLimit: 1,
                        BrachCategory: 1,
                        Mobile: 1,
                        Address: 1,
                        RegistrationId: 1,
                        AvailableCreditLimit: 1,
                        GSTIN: 1
                     }).populate({ path: "Customer", select: ["ContactName", "Mobile", "Email", "CustomerCategory", "CustomerType"] })
                     .populate({ path: "Business", select: ['BusinessCategory', "BusinessName", "BusinessCreditLimit", "AvailableCreditLimit"] }).exec((err, result) => {
                        if (err) {
                           ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessAndBranchManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
                           res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
                        } else {
                           result = JSON.parse(JSON.stringify(result));
                           if (result.length > 0) {
                              result.map(Obj => {
                                 Obj.ExtraUnitizedCreditLimit = 0;
                                 Obj.CreditBalanceExists = false;
                                 Obj.Business.ExtraUnitizedCreditLimit = 0;
                                 Obj.Business.CreditBalanceExists = false;                               
                                 const result3Arr = InvoiceDetails.filter(obj1 => obj1.Branch === Obj._id);                                
                                 var InvoiceAmount = 0;
                                 if (result3Arr.length > 0) {
                                    result3Arr.map(obj => {
                                       InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.AvailableLimit);
                                    });
                                    if (InvoiceAmount > 0) {
                                      var AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) - parseFloat(InvoiceAmount);
                                       if (AvailableCreditLimit > 0) {
                                          Obj.AvailableCreditLimit = parseFloat(AvailableCreditLimit);
                                       } else {
                                          Obj.ExtraUnitizedCreditLimit = parseFloat(AvailableCreditLimit);
                                          Obj.CreditBalanceExists = true;
                                          Obj.AvailableCreditLimit = 0;
                                       }
                                    }
                                 }
                                 Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                                 Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                 Obj.ExtraUnitizedCreditLimit = Obj.ExtraUnitizedCreditLimit.toFixed(2);
                                 Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.ExtraUnitizedCreditLimit);
                                 return Obj;
                              });
                           }
                           res.status(200).send({ Status: true, Response: result, Message: 'Branches List' });
                        }
                     });
               }).catch(ErrorRes => {
                  ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessAndBranchManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(ErrorRes));
                  res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: ErrorRes });
               });
            } else if (CustomerDetails.CustomerType === 'User') {
               if (CustomerDetails.BusinessAndBranches.length !== 0) {
                  CustomerDetails.BusinessAndBranches.map(Obj => {
                     Obj.Branches.map(obj => {
                        BranchArr.push(mongoose.Types.ObjectId(obj));
                     });
                  });
               }
               Promise.all([
                  InviteModel.InviteManagementSchema.find({ Branch: { $in: BranchArr }, Business: ReceivingData.Business, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
               ]).then(ResponseRes => {
                  var InvoiceDetails = JSON.parse(JSON.stringify(ResponseRes[0]));
                  BusinessManagement.BranchSchema.find({ IsAssigned: true, _id: { $in: BranchArr }, Business: ReceivingData.Business, ActiveStatus: true, IfDeleted: false },
                     {
                        BranchName: 1,
                        BranchCreditLimit: 1,
                        BrachCategory: 1,
                        Mobile: 1,
                        Address: 1,
                        RegistrationId: 1,
                        AvailableCreditLimit: 1,
                        GSTIN: 1
                     }).populate({ path: "Customer", select: ["ContactName", "Mobile", "Email", "CustomerCategory", "CustomerType"] })
                     .populate({ path: "Business", select: ['BusinessCategory', "BusinessName", "BusinessCreditLimit", "AvailableCreditLimit"] }).exec((err, result) => {
                        if (err) {
                           ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessAndBranchManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
                           res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
                        } else {
                           result = JSON.parse(JSON.stringify(result));
                           if (result.length > 0) {
                              result.map(Obj => {
                                 Obj.ExtraUnitizedCreditLimit = 0;
                                 Obj.CreditBalanceExists = false;
                                 const result3Arr = InvoiceDetails.filter(obj1 => obj1.Branch === Obj._id);
                                 var InvoiceAmount = 0;
                                 if (result3Arr.length > 0) {
                                    result3Arr.map(obj => {
                                       InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.AvailableLimit);
                                    });
                                    if (InvoiceAmount > 0) {
                                       var AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) - parseFloat(InvoiceAmount);
                                       if (AvailableCreditLimit > 0) {
                                          Obj.AvailableCreditLimit = parseFloat(AvailableCreditLimit);
                                       } else {
                                          Obj.ExtraUnitizedCreditLimit = parseFloat(AvailableCreditLimit);
                                          Obj.CreditBalanceExists = true;
                                          Obj.AvailableCreditLimit = 0;
                                       }
                                    }
                                 }

                                 Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                                 Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                 Obj.ExtraUnitizedCreditLimit = Obj.ExtraUnitizedCreditLimit.toFixed(2);
                                 Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.ExtraUnitizedCreditLimit);
                                 return Obj;
                              });
                           }
                           res.status(200).send({ Status: true, Response: result, Message: 'Branches List' });
                        }
                     });
               }).catch(ErrorRes => {
                  ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessAndBranchManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(ErrorRes));
                  res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: ErrorRes });
               });
            }
         } else {
            res.status(417).send({ Status: false, Message: 'Invalid Customer Details' });
         }
      }).catch(Response => {
         res.status(417).send({ Status: false, Message: "Some errors Error." });
         ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessAndBranchManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
      });
   }
};

// Seller Invite Create
exports.SellerSendInvite = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.InviteCategory || ReceivingData.InviteCategory === '') {
       res.status(400).send({ Status: false, Message: "InviteCategory can not be empty" });
   } else if (!ReceivingData.Seller || ReceivingData.Seller === '') {
       res.status(400).send({ Status: false, Message: "Seller Details can not be empty" });
   } else if (!ReceivingData.InviteType || ReceivingData.InviteType === '') {
       res.status(400).send({ Status: false, Message: "Customer Type can not be empty" });
   } else if (!ReceivingData.BuyerCreditLimit || ReceivingData.BuyerCreditLimit === '') {
       res.status(400).send({ Status: false, Message: "Credit Amount can not be empty" });
   } else if (!ReceivingData.BuyerPaymentCycle || ReceivingData.BuyerPaymentCycle === '') {
       res.status(400).send({ Status: false, Message: "Payment Cycle can not be empty" });
   } else if (!ReceivingData.Business || ReceivingData.Business === '' ) {
       res.status(400).send({ Status: false, Message: "Business Details can not be empty" });
   } else if (!ReceivingData.Branch || ReceivingData.Branch === '') {
       res.status(400).send({ Status: false, Message: "Branch Details can not be empty" });
   } else {
       ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
       ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
       ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);

       var InviteProcess = 'Pending';
       var ModeInvite = 'Mobile';
       if (ReceivingData.Buyer !== 'Empty' && ReceivingData.BuyerBusiness !== 'Empty' && ReceivingData.BuyerBranch !== 'Empty') {
           InviteProcess = 'Completed';
           ModeInvite = 'Direct';
       }

       if (ReceivingData.Buyer !== 'Empty') {
           ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
       } else {
           ReceivingData.Buyer = null;
       }

       if (ReceivingData.BuyerBusiness !== 'Empty') {
           ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
       } else {
           ReceivingData.BuyerBusiness = null;
       }

       if (ReceivingData.BuyerBranch !== 'Empty') {
           ReceivingData.BuyerBranch = mongoose.Types.ObjectId(ReceivingData.BuyerBranch);
       } else {
           ReceivingData.BuyerBranch = null;
       }

       

       Promise.all([
           CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller, CustomerType: 'Owner', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
           InviteModel.InviteManagementSchema.find({ Mobile: ReceivingData.Mobile, Seller: ReceivingData.Seller, Business: ReceivingData.Business, Branch: ReceivingData.Branch, $or: [{ Invite_Status: "Pending_Approval" }, { Invite_Status: "Accept" }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
           CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
           BusinessManagement.BusinessSchema.findOne({ _id: ReceivingData.Business, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
           InviteModel.InviteManagementSchema.findOne({ Mobile: ReceivingData.Mobile, Seller: ReceivingData.Seller, Business: ReceivingData.Business, Branch: ReceivingData.Branch, Invite_Status: "Reject", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
       ]).then(Response => {
           var CustomerDetails = Response[0];
           var InvitedDetails = Response[1];
           var BuyerDetails = JSON.parse(JSON.stringify(Response[2]));
           var BusinessDetails = JSON.parse(JSON.stringify(Response[3]));
           var RejectDetails = Response[4];
           if (CustomerDetails !== null && InvitedDetails.length === 0) {
               var IfUser = false;
               var InvitedUser = null;
               if (BuyerDetails !== null) {
                   if (BuyerDetails.CustomerType === 'Owner') {
                       ReceivingData.Buyer = mongoose.Types.ObjectId(BuyerDetails._id);
                   } else if (BuyerDetails.CustomerType === 'User') {
                       IfUser = true;
                       InvitedUser = mongoose.Types.ObjectId(BuyerDetails._id);
                       ReceivingData.Buyer = mongoose.Types.ObjectId(BuyerDetails.Owner);
                   }
               }
               ReceivingData.BuyerCreditLimit = parseFloat(ReceivingData.BuyerCreditLimit);
               if (ReceivingData.BuyerCreditLimit > 0) {                    
                   ReceivingData.BuyerCreditLimit = ReceivingData.BuyerCreditLimit.toFixed(2);
                   ReceivingData.BuyerCreditLimit = parseFloat(ReceivingData.BuyerCreditLimit);
               }
               const Create_Invite = new InviteModel.InviteManagementSchema({
                   Mobile: ReceivingData.Mobile,
                   ContactName: ReceivingData.ContactName,
                   Email: ReceivingData.Email,
                   Buyer: ReceivingData.Buyer,
                   BuyerBusiness: ReceivingData.BuyerBusiness,
                   BuyerBranch: ReceivingData.BuyerBranch,
                   Seller: ReceivingData.Seller,
                   Business: ReceivingData.Business,
                   Branch: ReceivingData.Branch,
                   IfUser: IfUser,
                   InvitedUser: InvitedUser,
                   Invite_Status: 'Pending_Approval',
                   InviteType: ReceivingData.InviteType,
                   BuyerCreditLimit: ReceivingData.BuyerCreditLimit,
                   BuyerPaymentType: ReceivingData.BuyerPaymentType,
                   BuyerPaymentCycle: ReceivingData.BuyerPaymentCycle,
                   AvailableLimit: ReceivingData.BuyerCreditLimit,
                   InvitedBy: ReceivingData.Seller,
                   InviteProcess: InviteProcess,
                   IfSeller: 'Pending',
                   IfBuyer: '',
                   InviteCategory: 'Buyer',
                   ModeInvite: ModeInvite,
                   ActiveStatus: true,
                   IfDeleted: false
               });
               Create_Invite.save(function (err, result) {
                   if (err) {
                       ErrorHandling.ErrorLogCreation(req, 'Buyer Invite Register Error', 'InviteModel.Controller -> SellerInviteSend', JSON.stringify(err));
                       res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to complete this invitation!.", Error: err });
                   } else {
                       if (result.Buyer !== null) {
                           var SmsMessage = BusinessDetails.BusinessName + ' would like to offer online invoicing for you at free of cost. Click this link to install the app and get started - Team Hundi';
                           var CustomerFCMToken = [];
                           CustomerFCMToken.push(BuyerDetails.Firebase_Token);
                           var payload = {
                               notification: {
                                   title: 'Hundi-Team',
                                   body: BusinessDetails.BusinessName + ' would like to offer online invoicing for you at free of cost. Click this link to install the app and get started - Team Hundi',
                                   sound: 'notify_tone.mp3'
                               },
                               data: {
                                   Customer: BuyerDetails._id,
                                   notification_type: 'RequestSend',
                                   click_action: 'FCM_PLUGIN_ACTIVITY',
                               }
                           };
                           if (CustomerFCMToken.length > 0) {
                               FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
                           }

                           const CreateNotification = new NotificationManagement.NotificationSchema({
                               User: null,
                               CustomerID: BuyerDetails._id,
                               Notification_Type: 'RequestSend',
                               Message: BusinessDetails.BusinessName + ' would like to offer online invoicing for you at free of cost. Click this link to install the app and get started - Team Hundi',
                               Message_Received: true,
                               Message_Viewed: false,
                               ActiveStatus: true,
                               IfDeleted: false,
                            });
                            CreateNotification.save();                             

                           const params = new URLSearchParams();
                           params.append('key', '25ECE50D1A3BD6');
                           params.append('msg', SmsMessage);
                           params.append('senderid', 'TXTDMO');
                           params.append('routeid', '3');
                           params.append('contacts', BuyerDetails.Mobile);

                           // axios.post('https://sms.textmysms.com/app/smsapi/index.php', params).then(function (response) {
                           //    callback(null, response.data);
                           //  }).catch(function (error) {
                           //    callback('Some Error for sending Buyer Invite SMS!, Error: ' + error, null);
                           //  });
                       }

                       if (RejectDetails !== null) {
                           RejectDetails.ActiveStatus = false;
                           RejectDetails.IfDeleted = true;
                           RejectDetails.save();
                       }
                       res.status(200).send({ Status: true, Response: result });
                   }
               });
           } else {
               res.status(200).send({ Status: false, Message: "Already Send to the Invite this Number And Seller, Seller Business, Seller Branch" });
           }
       }).catch(Error => {          
           ErrorHandling.ErrorLogCreation(req, 'Customer Details Error', 'InviteModel.Controller -> Customer details Error', JSON.stringify(Error));
           res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
       });
   }
};

// SellerInvite_PendingList
exports.SellerInvite_PendingList = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
        res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
    }   else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customern Category can not be empty" });
  } else {
        ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
        Promise.all([
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),          
        ]).then(Response => {
            var OwnerDetails = Response[0];            
            if (OwnerDetails !== null ) {          
               const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
               const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
               var ShortOrder = { createdAt: -1 };
               var ShortKey = ReceivingData.ShortKey;
               var ShortCondition = ReceivingData.ShortCondition;
               if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                  ShortOrder = {};
                  ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
               }         
               var FindQuery = {  InvitedBy: ReceivingData.CustomerId,  IfSeller: 'Pending' };

               if (ReceivingData.CustomerCategory === 'Seller') {
                  var FindQuery = {  InvitedBy: ReceivingData.CustomerId,  IfSeller: 'Pending' };
               } else if (ReceivingData.CustomerCategory === 'Buyer') {
                  var FindQuery = {  InvitedBy: ReceivingData.CustomerId,  IfBuyer: 'Pending' };
               }
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
                  InviteModel.InviteManagementSchema
                     .aggregate([
                        { $match: FindQuery },
                        {
                           $lookup: {
                              from: "Business",
                              let: { "business": "$Business" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                                 { $project: { "FirstName": 1 ,"LastName":1} }
                              ],
                              as: 'Business'
                           }
                        },
                        { $unwind: { path: "$Business", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Business",
                              let: { "buyerBusiness": "$BuyerBusiness" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$buyerBusiness", "$_id"] } } },
                                 { $project: { "FirstName": 1 ,"LastName":1}  }
                              ],
                              as: 'BuyerBusiness'
                           }
                        },
                        { $unwind: { path: "$BuyerBusiness", preserveNullAndEmptyArrays: true } },
                        // {
                        //    $lookup: {
                        //       from: "Branch",
                        //       let: { "branch": "$Branch" },
                        //       pipeline: [
                        //          { $match: { $expr: { $eq: ["$$branch", "$_id"] } } },
                        //          { $project: { "BranchName": 1, "AvailableCreditLimit": 1 } }
                        //       ],
                        //       as: 'BranchInfo'
                        //    }
                        // },
                        // { $unwind: { path: "$BranchInfo", preserveNullAndEmptyArrays: true } },
                        // {
                        //    $lookup: {
                        //       from: "Branch",
                        //       let: { "buyerBranch": "$BuyerBranch" },
                        //       pipeline: [
                        //          { $match: { $expr: { $eq: ["$$buyerBranch", "$_id"] } } },
                        //          { $project: { "BranchName": 1 } }
                        //       ],
                        //       as: 'BuyerBranchInfo'
                        //    }
                        // },
                        // { $unwind: { path: "$BuyerBranchInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Customers",
                              let: { "seller": "$Seller" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$seller", "$_id"] } } },
                                 { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                              ],
                              as: 'Seller'
                           }
                        },
                        { $unwind: { path: "$Seller", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Customers",
                              let: { "invitedUser": "$InvitedUser" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$invitedUser", "$_id"] } } },
                                 { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                              ],
                              as: 'InvitedUserInfo'
                           }
                        },
                        { $unwind: { path: "$InvitedUserInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Customers",
                              let: { "buyer": "$Buyer" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$buyer", "$_id"] } } },
                                 { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                              ],
                              as: 'Buyer'
                           }
                        },
                        { $unwind: { path: "$Buyer", preserveNullAndEmptyArrays: true } },
                        {
                           $project: {
                              Mobile: 1,
                              ContactName: 1,
                              Email: 1,
                              Buyer: 1,
                              BuyerBusiness: 1,
                              // BuyerBranchInfo: 1,
                              Seller: 1,
                              Business: 1,
                              // BranchInfo: 1,
                              IfUser: 1,
                              InvitedUserInfo: 1,
                              Invite_Status: 1,
                              InviteType: 1,
                              IfSeller: 1,
                              IfBuyer: 1,
                              BuyerCreditLimit: 1,
                              BuyerPaymentType: 1,
                              BuyerPaymentCycle: 1,
                              AvailableLimit: 1,
                              InvitedBy: 1,
                              InviteProcess: 1,
                              ModeInvite: 1,
                              InviteCategory: 1,
                              ActiveStatus: 1,
                              IfDeleted: 1,
                              createdAt: 1
                           }
                        },
                        { $sort: ShortOrder },
                        { $skip: Skip_Count },
                        { $limit: Limit_Count }
                     ]).exec(),
                  InviteModel.InviteManagementSchema.countDocuments(FindQuery).exec(),
                  // BusinessManagement.BranchSchema.find({ ActiveStatus: true, IfDeleted: false },{}, {}).exec(),
                  BusinessManagement.BusinessSchema.find({ ActiveStatus: true, IfDeleted: false },{}, {}).exec(),
                  InvoiceManagement.InvoiceSchema.find({ InvoiceStatus: "Accept", PaidORUnpaid: "Unpaid" },{}, {}).exec(),
               ]).then(result => {
                var InviteDetails = JSON.parse(JSON.stringify(result[0]));
                var BranchDetails = JSON.parse(JSON.stringify(result[2]));
                var InvoiceDetails = JSON.parse(JSON.stringify(result[3]));
                if (InviteDetails.length !== 0) {
                    InviteDetails.map(Obj => {
                        // if (Obj.BranchInfo !== null) {
                        //     Obj.BranchInfo.ExtraUnitizedCreditLimit = 0;
                        //     Obj.BranchInfo.CreditBalanceExists = false;
                        // }
                        // const BranchDetailsArr = BranchDetails.filter(obj => obj.Customer === Obj.SellerInfo._id && obj._id === Obj.BranchInfo._id);
                        // if (BranchDetailsArr.length > 0) {
                        //     BranchDetailsArr.map(obj => {
                        //         if (Obj.BranchInfo !== null) {
                        //             Obj.BranchInfo.AvailableCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit) + parseFloat(obj.AvailableCreditLimit);
                        //             Obj.BranchInfo.AvailableCreditLimit = Obj.BranchInfo.AvailableCreditLimit.toFixed(2);
                        //             Obj.BranchInfo.AvailableCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit);
                        //         }
                        //     });
                        // }

                        // const InvoiceDetailsArr = InvoiceDetails.filter(obj => obj.Seller === Obj.SellerInfo._id && obj._id === Obj.BranchInfo._id);
                        // var InvoiceAmount = 0;
                        // if (InvoiceDetailsArr.length > 0) {
                        //     InvoiceDetailsArr.map(obj => {
                        //         InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.AvailableAmount);
                        //     });
                        // }
                        // if (Obj.BranchInfo !== null) {
                        //     Obj.BranchInfo.AvailableCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit) + parseFloat(InvoiceAmount);
                        //     if (Obj.BranchInfo.AvailableCreditLimit > 0) {
                        //         Obj.BranchInfo.AvailableCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit);
                        //         Obj.BranchInfo.AvailableCreditLimit = Obj.BranchInfo.AvailableCreditLimit.toFixed(2);
                        //         Obj.BranchInfo.AvailableCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit);
                        //     } else {
                        //         Obj.BranchInfo.AvailableCreditLimit = 0;
                        //         Obj.BranchInfo.ExtraUnitizedCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit);
                        //         Obj.BranchInfo.ExtraUnitizedCreditLimit = Obj.BranchInfo.ExtraUnitizedCreditLimit.toFixed(2);
                        //         Obj.BranchInfo.ExtraUnitizedCreditLimit = parseFloat(Obj.BranchInfo.ExtraUnitizedCreditLimit);
                        //     }
                        // }
                        // return Obj;
                    });
                    res.status(200).send({ Status: true, Message: 'Your Invite List', Response: InviteDetails, SubResponse: result[1]});
                } else {
                    res.status(200).send({ Status: false, Message: "This Customer does not having any Invites!" });
                }                 
               }).catch(Error => {
                  ErrorHandling.ErrorLogCreation(req, 'Invite Find error', 'InviteManagement -> All Invite List', JSON.stringify(Error));
                  res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
               });
            } else {
                res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
            }
        }).catch(Error => {
            res.status(417).send({ Status: false, Message: "Some Occurred Error", Error: Error });
        });
    }
};

// BuyerInvite_PendingList
exports.BuyerInvite_PendingList = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
        res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
    } else {
        ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
        Promise.all([
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),          
        ]).then(Response => {
            var OwnerDetails = Response[0];            
            if (OwnerDetails !== null ) {          
               const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
               const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
               var ShortOrder = { createdAt: -1 };
               var ShortKey = ReceivingData.ShortKey;
               var ShortCondition = ReceivingData.ShortCondition;
               if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                  ShortOrder = {};
                  ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
               }         
               var FindQuery = {  InvitedBy: ReceivingData.CustomerId,  IfBuyer: 'Pending' };
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
                  InviteModel.InviteManagementSchema
                     .aggregate([
                        { $match: FindQuery },
                        {
                           $lookup: {
                              from: "Business",
                              let: { "business": "$Business" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                                 { $project: { "BusinessName": 1 } }
                              ],
                              as: 'BusinessInfo'
                           }
                        },
                        { $unwind: { path: "$BusinessInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Business",
                              let: { "buyerBusiness": "$BuyerBusiness" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$buyerBusiness", "$_id"] } } },
                                 { $project: { "BusinessName": 1 } }
                              ],
                              as: 'BuyerBusinessInfo'
                           }
                        },
                        { $unwind: { path: "$BuyerBusinessInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Branch",
                              let: { "branch": "$Branch" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$branch", "$_id"] } } },
                                 { $project: { "BranchName": 1, "AvailableCreditLimit": 1 } }
                              ],
                              as: 'BranchInfo'
                           }
                        },
                        { $unwind: { path: "$BranchInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Branch",
                              let: { "buyerBranch": "$BuyerBranch" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$buyerBranch", "$_id"] } } },
                                 { $project: { "BranchName": 1 } }
                              ],
                              as: 'BuyerBranchInfo'
                           }
                        },
                        { $unwind: { path: "$BuyerBranchInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Customers",
                              let: { "seller": "$Seller" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$seller", "$_id"] } } },
                                 { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                              ],
                              as: 'SellerInfo'
                           }
                        },
                        { $unwind: { path: "$SellerInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Customers",
                              let: { "invitedUser": "$InvitedUser" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$invitedUser", "$_id"] } } },
                                 { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                              ],
                              as: 'InvitedUserInfo'
                           }
                        },
                        { $unwind: { path: "$InvitedUserInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Customers",
                              let: { "buyer": "$Buyer" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$buyer", "$_id"] } } },
                                 { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                              ],
                              as: 'BuyerInfo'
                           }
                        },
                        { $unwind: { path: "$BuyerInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $project: {
                              Mobile: 1,
                              ContactName: 1,
                              Email: 1,
                              BuyerInfo: 1,
                              BuyerBusinessInfo: 1,
                              BuyerBranchInfo: 1,
                              SellerInfo: 1,
                              BusinessInfo: 1,
                              BranchInfo: 1,
                              IfUser: 1,
                              InvitedUserInfo: 1,
                              Invite_Status: 1,
                              InviteType: 1,
                              IfSeller: 1,
                              IfBuyer: 1,
                              BuyerCreditLimit: 1,
                              BuyerPaymentType: 1,
                              BuyerPaymentCycle: 1,
                              AvailableLimit: 1,
                              InvitedBy: 1,
                              InviteProcess: 1,
                              ModeInvite: 1,
                              InviteCategory: 1,
                              ActiveStatus: 1,
                              IfDeleted: 1,
                              createdAt: 1
                           }
                        },
                        { $sort: ShortOrder },
                        { $skip: Skip_Count },
                        { $limit: Limit_Count }
                     ]).exec(),
                  InviteModel.InviteManagementSchema.countDocuments(FindQuery).exec(),
                  BusinessManagement.BranchSchema.find({ ActiveStatus: true, IfDeleted: false },{}, {}).exec(),
                  InvoiceManagement.InvoiceSchema.find({ InvoiceStatus: "Accept", PaidORUnpaid: "Unpaid" },{}, {}).exec(),
               ]).then(result => {
                var InviteDetails = JSON.parse(JSON.stringify(result[0]));
                var BranchDetails = JSON.parse(JSON.stringify(result[2]));
                var InvoiceDetails = JSON.parse(JSON.stringify(result[3]));
                  res.status(200).send({ Status: true, Message: 'Your Invite List', Response: InviteDetails, SubResponse: result[1]});
               }).catch(Error => {
                  ErrorHandling.ErrorLogCreation(req, 'Invite Find error', 'InviteManagement -> All Invite List', JSON.stringify(Error));
                  res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
               });
            } else {
                res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
            }
        }).catch(Error => {
            res.status(417).send({ Status: false, Message: "Some Occurred Error", Error: Error });
        });
    }
};

// InvitedSeller_InviteList 
exports.InvitedSeller_InviteList = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.Mobile || ReceivingData.Mobile === '') {
        res.status(400).send({ Status: false, Message: "Mobile can not be empty" });
    } else if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
        res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
    } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
        res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
    } else {
        ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
        Promise.all([
            CustomersManagement.CustomerSchema.findOne({ Mobile: ReceivingData.Mobile, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            CustomersManagement.CustomerSchema.find({ Owner: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        ]).then(Response => {
            var OwnerDetails = Response[0];
            var CustomerDetails = Response[1];
            var MobileArr = [ReceivingData.Mobile];
            if (OwnerDetails !== null && (CustomerDetails.length === 0 || CustomerDetails.length !== 0)) {
                if (CustomerDetails.length !== 0) {
                    CustomerDetails.map(Obj => {
                        MobileArr.push(Obj.Mobile);
                    });
                }
                var FindQuery = { Mobile: { $in: MobileArr }, InviteCategory: ReceivingData.CustomerCategory, Invite_Status: 'Pending_Approval' };

                if (ReceivingData.CustomerCategory === 'Seller') {
                  var FindQuery = { Mobile: { $in: MobileArr }, InviteCategory: ReceivingData.CustomerCategory, Invite_Status: 'Pending_Approval' };
                } else if (ReceivingData.CustomerCategory === 'Buyer') {
                  var FindQuery = { Mobile: { $in: MobileArr }, InviteCategory: ReceivingData.CustomerCategory, Invite_Status: 'Pending_Approval' };
                }

                const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
                const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
                var ShortOrder = { createdAt: -1 };
                var ShortKey = ReceivingData.ShortKey;
                var ShortCondition = ReceivingData.ShortCondition;
                if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                   ShortOrder = {};
                   ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
                }         
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
                    InviteModel.InviteManagementSchema
                       .aggregate([
                          { $match: FindQuery },
                          {
                             $lookup: {
                                from: "Business",
                                let: { "business": "$Business" },
                                pipeline: [
                                   { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                                   { $project: { "BusinessName": 1 } }
                                ],
                                as: 'BusinessInfo'
                             }
                          },
                          { $unwind: { path: "$BusinessInfo", preserveNullAndEmptyArrays: true } },
                          {
                             $lookup: {
                                from: "Business",
                                let: { "buyerBusiness": "$BuyerBusiness" },
                                pipeline: [
                                   { $match: { $expr: { $eq: ["$$buyerBusiness", "$_id"] } } },
                                   { $project: { "BusinessName": 1 } }
                                ],
                                as: 'BuyerBusinessInfo'
                             }
                          },
                          { $unwind: { path: "$BuyerBusinessInfo", preserveNullAndEmptyArrays: true } },
                        //   {
                        //      $lookup: {
                        //         from: "Branch",
                        //         let: { "branch": "$Branch" },
                        //         pipeline: [
                        //            { $match: { $expr: { $eq: ["$$branch", "$_id"] } } },
                        //            { $project: { "BranchName": 1, "AvailableCreditLimit": 1 } }
                        //         ],
                        //         as: 'BranchInfo'
                        //      }
                        //   },
                        //   { $unwind: { path: "$BranchInfo", preserveNullAndEmptyArrays: true } },
                        //   {
                        //      $lookup: {
                        //         from: "Branch",
                        //         let: { "buyerBranch": "$BuyerBranch" },
                        //         pipeline: [
                        //            { $match: { $expr: { $eq: ["$$buyerBranch", "$_id"] } } },
                        //            { $project: { "BranchName": 1 } }
                        //         ],
                        //         as: 'BuyerBranchInfo'
                        //      }
                        //   },
                        //   { $unwind: { path: "$BuyerBranchInfo", preserveNullAndEmptyArrays: true } },
                          {
                             $lookup: {
                                from: "Customers",
                                let: { "seller": "$Seller" },
                                pipeline: [
                                   { $match: { $expr: { $eq: ["$$seller", "$_id"] } } },
                                   { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                                ],
                                as: 'SellerInfo'
                             }
                          },
                          { $unwind: { path: "$SellerInfo", preserveNullAndEmptyArrays: true } },
                          {
                             $lookup: {
                                from: "Customers",
                                let: { "invitedUser": "$InvitedUser" },
                                pipeline: [
                                   { $match: { $expr: { $eq: ["$$invitedUser", "$_id"] } } },
                                   { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                                ],
                                as: 'InvitedUserInfo'
                             }
                          },
                          { $unwind: { path: "$InvitedUserInfo", preserveNullAndEmptyArrays: true } },
                          {
                             $lookup: {
                                from: "Customers",
                                let: { "buyer": "$Buyer" },
                                pipeline: [
                                   { $match: { $expr: { $eq: ["$$buyer", "$_id"] } } },
                                   { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                                ],
                                as: 'BuyerInfo'
                             }
                          },
                          { $unwind: { path: "$BuyerInfo", preserveNullAndEmptyArrays: true } },
                          {
                             $project: {
                                Mobile: 1,
                                ContactName: 1,
                                Email: 1,
                                BuyerInfo: 1,
                                BuyerBusinessInfo: 1,
                              //   BuyerBranchInfo: 1,
                                SellerInfo: 1,
                                BusinessInfo: 1,
                              //   BranchInfo: 1,
                                IfUser: 1,
                                InvitedUserInfo: 1,
                                Invite_Status: 1,
                                InviteType: 1,
                                IfSeller: 1,
                                IfBuyer: 1,
                                BuyerCreditLimit: 1,
                                BuyerPaymentType: 1,
                                BuyerPaymentCycle: 1,
                                AvailableLimit: 1,
                                InvitedBy: 1,
                                InviteProcess: 1,
                                ModeInvite: 1,
                                InviteCategory: 1,
                                ActiveStatus: 1,
                                IfDeleted: 1,
                                createdAt: 1
                             }
                          },
                          { $sort: ShortOrder },
                          { $skip: Skip_Count },
                          { $limit: Limit_Count }
                       ]).exec(),
                    InviteModel.InviteManagementSchema.countDocuments(FindQuery).exec(),
                    BusinessManagement.BusinessSchema.find({ ActiveStatus: true, IfDeleted: false },{}, {}).exec(),
                    InvoiceManagement.InvoiceSchema.find({ InvoiceStatus: "Accept", PaidORUnpaid: "Unpaid" },{}, {}).exec(),
                 ]).then(result => {
                  var InviteDetails = JSON.parse(JSON.stringify(result[0]));
                  var BranchDetails = JSON.parse(JSON.stringify(result[2]));
                  var InvoiceDetails = JSON.parse(JSON.stringify(result[3]));
                  if (InviteDetails.length !== 0) {
                     //  InviteDetails.map(Obj => {
                     //      if (Obj.BranchInfo !== null) {
                     //          Obj.BranchInfo.ExtraUnitizedCreditLimit = 0;
                     //          Obj.BranchInfo.CreditBalanceExists = false;
                     //      }
                     //      const BranchDetailsArr = BranchDetails.filter(obj => obj.Customer === Obj.SellerInfo._id && obj._id === Obj.BranchInfo._id);
                     //      if (BranchDetailsArr.length > 0) {
                     //          BranchDetailsArr.map(obj => {
                     //              if (Obj.BranchInfo !== null) {
                     //                  Obj.BranchInfo.AvailableCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit) + parseFloat(obj.AvailableCreditLimit);
                     //                  Obj.BranchInfo.AvailableCreditLimit = Obj.BranchInfo.AvailableCreditLimit.toFixed(2);
                     //                  Obj.BranchInfo.AvailableCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit);
                     //              }
                     //          });
                     //      }
  
                     //      const InvoiceDetailsArr = InvoiceDetails.filter(obj => obj.Seller === Obj.SellerInfo._id && obj._id === Obj.BranchInfo._id);
                     //      var InvoiceAmount = 0;
                     //      if (InvoiceDetailsArr.length > 0) {
                     //          InvoiceDetailsArr.map(obj => {
                     //              InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.AvailableAmount);
                     //          });
                     //      }
                     //      if (Obj.BranchInfo !== null) {
                     //          Obj.BranchInfo.AvailableCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit) + parseFloat(InvoiceAmount);
                     //          if (Obj.BranchInfo.AvailableCreditLimit > 0) {
                     //              Obj.BranchInfo.AvailableCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit);
                     //              Obj.BranchInfo.AvailableCreditLimit = Obj.BranchInfo.AvailableCreditLimit.toFixed(2);
                     //              Obj.BranchInfo.AvailableCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit);
                     //          } else {
                     //              Obj.BranchInfo.AvailableCreditLimit = 0;
                     //              Obj.BranchInfo.ExtraUnitizedCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit);
                     //              Obj.BranchInfo.ExtraUnitizedCreditLimit = Obj.BranchInfo.ExtraUnitizedCreditLimit.toFixed(2);
                     //              Obj.BranchInfo.ExtraUnitizedCreditLimit = parseFloat(Obj.BranchInfo.ExtraUnitizedCreditLimit);
                     //          }
                     //      }
                     //      return Obj;
                     //  });
                      res.status(200).send({ Status: true, Message: 'Your Invite List', Response: InviteDetails, SubResponse: result[1]});
                  } else {
                      res.status(400).send({ Status: false, Message: "This Customer does not having any Invites!" });
                  }                 
                 }).catch(Error => {
                    ErrorHandling.ErrorLogCreation(req, 'Invite Find error', 'InviteManagement -> All Invite List', JSON.stringify(Error));
                    res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
                 });              
            } else {
                res.status(400).send({ Status: false, Message: "Invalid Customer Details" });
            }
        }).catch(Error => {
            res.status(400).send({ Status: false, Message: "This Customer does not having any Invites!" });
        });
    }
};

// SellerInvite_AcceptList
exports.SellerInvite_AcceptList = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
        res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
    }  else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customern Category can not be empty" });
  }else {
        ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
        Promise.all([
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        ]).then(Response => {
            var CustomerDetails = Response[0];
            if (CustomerDetails !== null) {
               const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
               const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
               var ShortOrder = { createdAt: -1 };
               var ShortKey = ReceivingData.ShortKey;
               var ShortCondition = ReceivingData.ShortCondition;
               if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                  ShortOrder = {};
                  ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
               }         
               // var FindQuery = { Seller: ReceivingData.CustomerId, Invite_Status: 'Accept'};

               if (ReceivingData.CustomerCategory === 'Seller') {
                  var FindQuery = { Seller: ReceivingData.CustomerId, Invite_Status: 'Accept'};
               } else if (ReceivingData.CustomerCategory === 'Buyer') {
                  var FindQuery = { Buyer: ReceivingData.CustomerId, Invite_Status: 'Accept'};
               }

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
                  InviteModel.InviteManagementSchema
                     .aggregate([
                        { $match: FindQuery },
                        {
                           $lookup: {
                              from: "Business",
                              let: { "business": "$Business" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                                 { $project: { "FirstName": 1 ,"LastName":1} }
                              ],
                              as: 'Business'
                           }
                        },
                        { $unwind: { path: "$Business", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Business",
                              let: { "buyerBusiness": "$BuyerBusiness" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$buyerBusiness", "$_id"] } } },
                                 { $project: { "FirstName": 1 ,"LastName":1} }
                              ],
                              as: 'BuyerBusiness'
                           }
                        },
                        { $unwind: { path: "$BuyerBusiness", preserveNullAndEmptyArrays: true } },
                        // {
                        //    $lookup: {
                        //       from: "Branch",
                        //       let: { "branch": "$Branch" },
                        //       pipeline: [
                        //          { $match: { $expr: { $eq: ["$$branch", "$_id"] } } },
                        //          { $project: { "BranchName": 1 } }
                        //       ],
                        //       as: 'BranchInfo'
                        //    }
                        // },
                        // { $unwind: { path: "$BranchInfo", preserveNullAndEmptyArrays: true } },
                        // {
                        //    $lookup: {
                        //       from: "Branch",
                        //       let: { "buyerBranch": "$BuyerBranch" },
                        //       pipeline: [
                        //          { $match: { $expr: { $eq: ["$$buyerBranch", "$_id"] } } },
                        //          { $project: { "BranchName": 1 } }
                        //       ],
                        //       as: 'BuyerBranchInfo'
                        //    }
                        // },
                        // { $unwind: { path: "$BuyerBranchInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Customers",
                              let: { "seller": "$Seller" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$seller", "$_id"] } } },
                                 { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                              ],
                              as: 'Seller'
                           }
                        },
                        { $unwind: { path: "$Seller", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Customers",
                              let: { "invitedUser": "$InvitedUser" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$invitedUser", "$_id"] } } },
                                 { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                              ],
                              as: 'InvitedUserInfo'
                           }
                        },
                        { $unwind: { path: "$InvitedUserInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Customers",
                              let: { "buyer": "$Buyer" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$buyer", "$_id"] } } },
                                 { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                              ],
                              as: 'Buyer'
                           }
                        },
                        { $unwind: { path: "$Buyer", preserveNullAndEmptyArrays: true } },
                        {
                           $project: {
                              Mobile: 1,
                              ContactName: 1,
                              Email: 1,
                              Buyer: 1,
                              BuyerBusiness: 1,
                              // BuyerBranchInfo: 1,
                              Seller: 1,
                              Business: 1,
                              // BranchInfo: 1,
                              IfUser: 1,
                              InvitedUserInfo: 1,
                              Invite_Status: 1,
                              InviteType: 1,
                              IfSeller: 1,
                              IfBuyer: 1,
                              BuyerCreditLimit: 1,
                              BuyerPaymentType: 1,
                              BuyerPaymentCycle: 1,
                              AvailableLimit: 1,
                              InvitedBy: 1,
                              InviteProcess: 1,
                              ModeInvite: 1,
                              InviteCategory: 1,
                              ActiveStatus: 1,
                              IfDeleted: 1,
                              createdAt: 1
                           }
                        },
                        { $sort: ShortOrder },
                        { $skip: Skip_Count },
                        { $limit: Limit_Count }
                     ]).exec(),
                  InviteModel.InviteManagementSchema.countDocuments(FindQuery).exec()
               ]).then(result => {
                  res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
               }).catch(Error => {
                  ErrorHandling.ErrorLogCreation(req, 'Invite Find error', 'InviteManagement -> All Invite List', JSON.stringify(Error));
                  res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
               });
            } else {
                res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
            }       
        }).catch(Error => {
            res.status(417).send({ Status: false, Message: "Some Occurred Error", Error: Error });
        });
    }
};

// BuyerInvite_AcceptList
exports.BuyerInvite_AcceptList = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
        res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
    } else {
        ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
        Promise.all([
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        ]).then(Response => {
            var CustomerDetails = Response[0];
            var CustomerDetails = Response[0];
            if (CustomerDetails !== null) {
               const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
               const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
               var ShortOrder = { createdAt: -1 };
               var ShortKey = ReceivingData.ShortKey;
               var ShortCondition = ReceivingData.ShortCondition;
               if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                  ShortOrder = {};
                  ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
               }         
               var FindQuery = { Buyer: ReceivingData.CustomerId, Invite_Status: 'Accept'};
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
                  InviteModel.InviteManagementSchema
                     .aggregate([
                        { $match: FindQuery },
                        {
                           $lookup: {
                              from: "Business",
                              let: { "business": "$Business" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                                 { $project: { "BusinessName": 1 } }
                              ],
                              as: 'BusinessInfo'
                           }
                        },
                        { $unwind: { path: "$BusinessInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Business",
                              let: { "buyerBusiness": "$BuyerBusiness" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$buyerBusiness", "$_id"] } } },
                                 { $project: { "BusinessName": 1 } }
                              ],
                              as: 'BuyerBusinessInfo'
                           }
                        },
                        { $unwind: { path: "$BuyerBusinessInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Branch",
                              let: { "branch": "$Branch" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$branch", "$_id"] } } },
                                 { $project: { "BranchName": 1 } }
                              ],
                              as: 'BranchInfo'
                           }
                        },
                        { $unwind: { path: "$BranchInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Branch",
                              let: { "buyerBranch": "$BuyerBranch" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$buyerBranch", "$_id"] } } },
                                 { $project: { "BranchName": 1 } }
                              ],
                              as: 'BuyerBranchInfo'
                           }
                        },
                        { $unwind: { path: "$BuyerBranchInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Customers",
                              let: { "seller": "$Seller" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$seller", "$_id"] } } },
                                 { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                              ],
                              as: 'SellerInfo'
                           }
                        },
                        { $unwind: { path: "$SellerInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Customers",
                              let: { "invitedUser": "$InvitedUser" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$invitedUser", "$_id"] } } },
                                 { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                              ],
                              as: 'InvitedUserInfo'
                           }
                        },
                        { $unwind: { path: "$InvitedUserInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Customers",
                              let: { "buyer": "$Buyer" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$buyer", "$_id"] } } },
                                 { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                              ],
                              as: 'BuyerInfo'
                           }
                        },
                        { $unwind: { path: "$BuyerInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $project: {
                              Mobile: 1,
                              ContactName: 1,
                              Email: 1,
                              BuyerInfo: 1,
                              BuyerBusinessInfo: 1,
                              BuyerBranchInfo: 1,
                              SellerInfo: 1,
                              BusinessInfo: 1,
                              BranchInfo: 1,
                              IfUser: 1,
                              InvitedUserInfo: 1,
                              Invite_Status: 1,
                              InviteType: 1,
                              IfSeller: 1,
                              IfBuyer: 1,
                              BuyerCreditLimit: 1,
                              BuyerPaymentType: 1,
                              BuyerPaymentCycle: 1,
                              AvailableLimit: 1,
                              InvitedBy: 1,
                              InviteProcess: 1,
                              ModeInvite: 1,
                              InviteCategory: 1,
                              ActiveStatus: 1,
                              IfDeleted: 1,
                              createdAt: 1
                           }
                        },
                        { $sort: ShortOrder },
                        { $skip: Skip_Count },
                        { $limit: Limit_Count }
                     ]).exec(),
                  InviteModel.InviteManagementSchema.countDocuments(FindQuery).exec()
               ]).then(result => {
                  res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
               }).catch(Error => {
                  ErrorHandling.ErrorLogCreation(req, 'Invite Find error', 'InviteManagement -> All Invite List', JSON.stringify(Error));
                  res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
               });
            } else {
                res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
            }       
        }).catch(Error => {
            res.status(417).send({ Status: false, Message: "Some Occurred Error", Error: Error });
        });
    }
};

// SellerInvite_RejectList
exports.SellerInvite_RejectList = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
        res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
    }  else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customern Category can not be empty" });
  } else {
        ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
        Promise.all([
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        ]).then(Response => {
            var CustomerDetails = Response[0];
            if (CustomerDetails !== null) {
               const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
               const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
               var ShortOrder = { createdAt: -1 };
               var ShortKey = ReceivingData.ShortKey;
               var ShortCondition = ReceivingData.ShortCondition;
               if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                  ShortOrder = {};
                  ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
               }         
               // var FindQuery = { Seller: ReceivingData.CustomerId, Invite_Status: 'Reject'};
               
             if (ReceivingData.CustomerCategory === 'Seller') {
               console.log('Sell');
               var FindQuery = { Seller: ReceivingData.CustomerId, Invite_Status: 'Reject'};
            } else if (ReceivingData.CustomerCategory === 'Buyer') {
               console.log('Buyyy');
               var FindQuery = { Buyer: ReceivingData.CustomerId, Invite_Status: 'Reject'};
            }
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
                  InviteModel.InviteManagementSchema
                     .aggregate([
                        { $match: FindQuery },
                        {
                           $lookup: {
                              from: "Business",
                              let: { "business": "$Business" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                                 { $project: { "FirstName": 1 ,"LastName":1} }
                              ],
                              as: 'Business'
                           }
                        },
                        { $unwind: { path: "$Business", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Business",
                              let: { "buyerBusiness": "$BuyerBusiness" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$buyerBusiness", "$_id"] } } },
                                 { $project: { "FirstName": 1 ,"LastName":1} }
                              ],
                              as: 'BuyerBusiness'
                           }
                        },
                        { $unwind: { path: "$BuyerBusiness", preserveNullAndEmptyArrays: true } },
                        // {
                        //    $lookup: {
                        //       from: "Branch",
                        //       let: { "branch": "$Branch" },
                        //       pipeline: [
                        //          { $match: { $expr: { $eq: ["$$branch", "$_id"] } } },
                        //          { $project: { "BranchName": 1 } }
                        //       ],
                        //       as: 'BranchInfo'
                        //    }
                        // },
                        // { $unwind: { path: "$BranchInfo", preserveNullAndEmptyArrays: true } },
                        // {
                        //    $lookup: {
                        //       from: "Branch",
                        //       let: { "buyerBranch": "$BuyerBranch" },
                        //       pipeline: [
                        //          { $match: { $expr: { $eq: ["$$buyerBranch", "$_id"] } } },
                        //          { $project: { "BranchName": 1 } }
                        //       ],
                        //       as: 'BuyerBranchInfo'
                        //    }
                        // },
                        // { $unwind: { path: "$BuyerBranchInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Customers",
                              let: { "seller": "$Seller" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$seller", "$_id"] } } },
                                 { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                              ],
                              as: 'Seller'
                           }
                        },
                        { $unwind: { path: "$Seller", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Customers",
                              let: { "invitedUser": "$InvitedUser" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$invitedUser", "$_id"] } } },
                                 { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                              ],
                              as: 'InvitedUserInfo'
                           }
                        },
                        { $unwind: { path: "$InvitedUserInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Customers",
                              let: { "buyer": "$Buyer" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$buyer", "$_id"] } } },
                                 { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                              ],
                              as: 'Buyer'
                           }
                        },
                        { $unwind: { path: "$Buyer", preserveNullAndEmptyArrays: true } },
                        {
                           $project: {
                              Mobile: 1,
                              ContactName: 1,
                              Email: 1,
                              Buyer: 1,
                              BuyerBusiness: 1,
                              // BuyerBranchInfo: 1,
                              Seller: 1,
                              Business: 1,
                              // BranchInfo: 1,
                              IfUser: 1,
                              InvitedUserInfo: 1,
                              Invite_Status: 1,
                              InviteType: 1,
                              IfSeller: 1,
                              IfBuyer: 1,
                              BuyerCreditLimit: 1,
                              BuyerPaymentType: 1,
                              BuyerPaymentCycle: 1,
                              AvailableLimit: 1,
                              InvitedBy: 1,
                              InviteProcess: 1,
                              ModeInvite: 1,
                              InviteCategory: 1,
                              ActiveStatus: 1,
                              IfDeleted: 1,
                              createdAt: 1
                           }
                        },
                        { $sort: ShortOrder },
                        { $skip: Skip_Count },
                        { $limit: Limit_Count }
                     ]).exec(),
                  InviteModel.InviteManagementSchema.countDocuments(FindQuery).exec()
               ]).then(result => {
                  res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
               }).catch(Error => {
                  ErrorHandling.ErrorLogCreation(req, 'Invite Find error', 'InviteManagement -> All Invite List', JSON.stringify(Error));
                  res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
               });
            } else {
                res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
            }       
        }).catch(Error => {
            res.status(417).send({ Status: false, Message: "Some Occurred Error", Error: Error });
        });
    }
};

// BuyerInvite_RejectList
exports.BuyerInvite_RejectList = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
        res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
    } else {
        ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
        Promise.all([
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        ]).then(Response => {
            var CustomerDetails = Response[0];
            var CustomerDetails = Response[0];
            if (CustomerDetails !== null) {
               const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
               const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
               var ShortOrder = { createdAt: -1 };
               var ShortKey = ReceivingData.ShortKey;
               var ShortCondition = ReceivingData.ShortCondition;
               if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                  ShortOrder = {};
                  ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
               }         
               var FindQuery = { Buyer: ReceivingData.CustomerId, Invite_Status: 'Reject'};
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
                  InviteModel.InviteManagementSchema
                     .aggregate([
                        { $match: FindQuery },
                        {
                           $lookup: {
                              from: "Business",
                              let: { "business": "$Business" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                                 { $project: { "BusinessName": 1 } }
                              ],
                              as: 'BusinessInfo'
                           }
                        },
                        { $unwind: { path: "$BusinessInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Business",
                              let: { "buyerBusiness": "$BuyerBusiness" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$buyerBusiness", "$_id"] } } },
                                 { $project: { "BusinessName": 1 } }
                              ],
                              as: 'BuyerBusinessInfo'
                           }
                        },
                        { $unwind: { path: "$BuyerBusinessInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Branch",
                              let: { "branch": "$Branch" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$branch", "$_id"] } } },
                                 { $project: { "BranchName": 1 } }
                              ],
                              as: 'BranchInfo'
                           }
                        },
                        { $unwind: { path: "$BranchInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Branch",
                              let: { "buyerBranch": "$BuyerBranch" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$buyerBranch", "$_id"] } } },
                                 { $project: { "BranchName": 1 } }
                              ],
                              as: 'BuyerBranchInfo'
                           }
                        },
                        { $unwind: { path: "$BuyerBranchInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Customers",
                              let: { "seller": "$Seller" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$seller", "$_id"] } } },
                                 { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                              ],
                              as: 'SellerInfo'
                           }
                        },
                        { $unwind: { path: "$SellerInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Customers",
                              let: { "invitedUser": "$InvitedUser" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$invitedUser", "$_id"] } } },
                                 { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                              ],
                              as: 'InvitedUserInfo'
                           }
                        },
                        { $unwind: { path: "$InvitedUserInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Customers",
                              let: { "buyer": "$Buyer" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$buyer", "$_id"] } } },
                                 { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                              ],
                              as: 'BuyerInfo'
                           }
                        },
                        { $unwind: { path: "$BuyerInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $project: {
                              Mobile: 1,
                              ContactName: 1,
                              Email: 1,
                              BuyerInfo: 1,
                              BuyerBusinessInfo: 1,
                              BuyerBranchInfo: 1,
                              SellerInfo: 1,
                              BusinessInfo: 1,
                              BranchInfo: 1,
                              IfUser: 1,
                              InvitedUserInfo: 1,
                              Invite_Status: 1,
                              InviteType: 1,
                              IfSeller: 1,
                              IfBuyer: 1,
                              BuyerCreditLimit: 1,
                              BuyerPaymentType: 1,
                              BuyerPaymentCycle: 1,
                              AvailableLimit: 1,
                              InvitedBy: 1,
                              InviteProcess: 1,
                              ModeInvite: 1,
                              InviteCategory: 1,
                              ActiveStatus: 1,
                              IfDeleted: 1,
                              createdAt: 1
                           }
                        },
                        { $sort: ShortOrder },
                        { $skip: Skip_Count },
                        { $limit: Limit_Count }
                     ]).exec(),
                  InviteModel.InviteManagementSchema.countDocuments(FindQuery).exec()
               ]).then(result => {
                  res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
               }).catch(Error => {
                  ErrorHandling.ErrorLogCreation(req, 'Invite Find error', 'InviteManagement -> All Invite List', JSON.stringify(Error));
                  res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
               });
            } else {
                res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
            }       
        }).catch(Error => {
            res.status(417).send({ Status: false, Message: "Some Occurred Error", Error: Error });
        });
    }
};

// Invite Reject 
exports.Invite_Reject = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.InviteId || ReceivingData.InviteId === '') {
        res.status(400).send({ Status: false, Message: "InviteId can not be empty" });
    } else if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
        res.status(400).send({ Status: false, Message: "CustomerId can not be empty" });
    } else {
        ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.CustomerId);
        ReceivingData.InviteId = mongoose.Types.ObjectId(ReceivingData.InviteId);
        Promise.all([
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            InviteModel.InviteManagementSchema.findOne({ _id: ReceivingData.InviteId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        ]).then(Response => {
            var CustomerDetails = Response[0];
            var InviteDetails = Response[1];
            if (CustomerDetails !== null && InviteDetails !== null) {
                InviteModel.InviteManagementSchema.updateOne(
                    { "_id": ReceivingData.InviteId },
                    { $set: { Invite_Status: 'Reject', IfBuyer: 'Reject', IfSeller: 'Reject' } }
                ).exec(function (err_1, result_1) {
                    if (err_1) {
                        res.status(417).send({ Status: false, Message: "Some error occurred while Updating the Invite Status!.", Error: err_1 });
                    } else {
                        res.status(200).send({ Status: true, Message: "Invite Status Successfully Updated" });
                    }
                });
            } else {
                res.status(417).send({ Status: false, Message: "Invalid Customer details!." });
            }
        }).catch(Error => {
            res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: Error });
        });
    }
};

// Invite Status Update Buyer Update 
exports.SellerInvite_StatusUpdate = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.InviteId || ReceivingData.InviteId === '') {
        res.status(400).send({ Status: false, Message: "InviteId can not be empty" });
    } else if (!ReceivingData.Invite_Status || ReceivingData.Invite_Status === '') {
        res.status(400).send({ Status: false, Message: "Invite Status can not be empty" });
    } else if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
        res.status(400).send({ Status: false, Message: "CustomerId can not be empty" });
    } else if (!ReceivingData.Business || ReceivingData.Business === '') {
        res.status(400).send({ Status: false, Message: "Business can not be empty" });
    } else if (!ReceivingData.Branch || ReceivingData.Branch === '') {
        res.status(400).send({ Status: false, Message: "Branch can not be empty" });
    } else if (!ReceivingData.BuyerCreditLimit || ReceivingData.BuyerCreditLimit === '') {
        res.status(400).send({ Status: false, Message: "Buyer Credit Limit can not be empty" });
    } else if (!ReceivingData.BuyerPaymentCycle || ReceivingData.BuyerPaymentCycle === '') {
        res.status(400).send({ Status: false, Message: "Buyer Payment Cycle can not be empty" });
    } else if (!ReceivingData.BuyerPaymentType || ReceivingData.BuyerPaymentType === '') {
        res.status(400).send({ Status: false, Message: "Buyer Payment Type can not be empty" });
    } else {
        ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.CustomerId);
        ReceivingData.InviteId = mongoose.Types.ObjectId(ReceivingData.InviteId);
        ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
        ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);
        Promise.all([
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            InviteModel.InviteManagementSchema.findOne({ _id: ReceivingData.InviteId, ActiveStatus: true, IfDeleted: false }, {}, {})
                .populate({ path: "BuyerBusiness", select: "BusinessName" }).populate({ path: "Buyer", select: ["Firebase_Token", "Device_Type", "Mobile"] }).exec(),
            CustomersManagement.CustomerSchema.findOne({ Mobile: ReceivingData.Mobile, CustomerType: 'User', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),    
        ]).then(Response => {
            var CustomerDetails = Response[0];
            var InviteDetails = JSON.parse(JSON.stringify(Response[1]));
            var UserDetails = JSON.parse(JSON.stringify(Response[2]));
            if (CustomerDetails !== null && InviteDetails !== null) {
                ReceivingData.BuyerCreditLimit = parseFloat(ReceivingData.BuyerCreditLimit);
                if (ReceivingData.BuyerCreditLimit > 0) {                    
                    ReceivingData.BuyerCreditLimit = ReceivingData.BuyerCreditLimit.toFixed(2);
                    ReceivingData.BuyerCreditLimit = parseFloat(ReceivingData.BuyerCreditLimit);
                }
                InviteModel.InviteManagementSchema.updateOne(
                    { "_id": ReceivingData.InviteId },
                    {
                        $set: {
                            "Invite_Status": ReceivingData.Invite_Status,
                            "IfSeller": ReceivingData.Invite_Status,
                            "IfBuyer": ReceivingData.Invite_Status,
                            "Business": ReceivingData.Business,
                            "Branch": ReceivingData.Branch,
                            "BuyerCreditLimit": ReceivingData.BuyerCreditLimit,
                            "AvailableLimit": ReceivingData.BuyerCreditLimit,
                            "BuyerPaymentCycle": ReceivingData.BuyerPaymentCycle,
                            "BuyerPaymentType": ReceivingData.BuyerPaymentType,
                            "InviteProcess": 'Completed'
                        }
                    }
                ).exec(function (err_1, result_1) {
                    if (err_1) {
                        res.status(417).send({ Status: false, Message: "Some error occurred while Updating the Invite Status!.", Error: err_1 });
                    } else {
                        var CustomerFCMToken = [];
                        var MobileNumber = null;
                        var BuyerId = null
                        if (UserDetails !== null) {
                            CustomerFCMToken.push(UserDetails.Firebase_Token);
                            MobileNumber = UserDetails.Mobile;
                            BuyerId = UserDetails._id;
                        } else {
                            CustomerFCMToken.push(InviteDetails.Buyer.Firebase_Token);
                            MobileNumber = InviteDetails.Buyer.Mobile;
                            BuyerId = InviteDetails.Buyer._id;
                        } 
                        var payload = {
                            notification: {
                                title: 'Hundi-Team',
                                body: InviteDetails.BuyerBusiness.BusinessName + ' accepted your invite. Click here to create your first invoice for ' + InviteDetails.BuyerBusiness.BusinessName,
                                sound: 'notify_tone.mp3'
                            },
                            data: {
                                Customer: BuyerId,
                                notification_type: 'RequestAccepted',
                                click_action: 'FCM_PLUGIN_ACTIVITY',
                            }
                        };
                        if (CustomerFCMToken.length > 0) {
                            FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
                        }

                        var SmsMessage = InviteDetails.BuyerBusiness.BusinessName + ' accepted your invite. Click here to create your first invoice for ' + InviteDetails.BuyerBusiness.BusinessName;
                        const params = new URLSearchParams();
                        params.append('key', '25ECE50D1A3BD6');
                        params.append('msg', SmsMessage);
                        params.append('senderid', 'TXTDMO');
                        params.append('routeid', '3');
                        params.append('contacts', InviteDetails.Buyer.Mobile);

                        // axios.post('https://sms.textmysms.com/app/smsapi/index.php', params).then(function (response) {
                        //    callback(null, response.data);
                        //  }).catch(function (error) {
                        //    callback('Some Error for Seller Invite SMS!, Error: ' + error, null);
                        //  });

                        const CreateNotification = new NotificationManagement.NotificationSchema({
                            User: null,
                            CustomerID: BuyerId,
                            Notification_Type: 'RequestAccepted',
                            Message: InviteDetails.BuyerBusiness.BusinessName + ' accepted your invite. Click here to create your first invoice for ' + InviteDetails.BuyerBusiness.BusinessName,
                            Message_Received: true,
                            Message_Viewed: false,
                            ActiveStatus: true,
                            IfDeleted: false,
                         });
                         CreateNotification.save();
                        res.status(200).send({ Status: true, Message: "Invite Status Successfully Updated" });
                    }
                });

            } else {
                res.status(417).send({ Status: false, Message: "Invalid Customer details!." });
            }
        }).catch(Error => {
            res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: Error });
        });
    }
};

// Invite Status Update Buyer Update 
exports.BuyerInvite_StatusUpdate = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.InviteId || ReceivingData.InviteId === '') {
        res.status(400).send({ Status: false, Message: "InviteId can not be empty" });
    } else if (!ReceivingData.Invite_Status || ReceivingData.Invite_Status === '') {
        res.status(400).send({ Status: false, Message: "Invite Status can not be empty" });
    } else if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
        res.status(400).send({ Status: false, Message: "CustomerId can not be empty" });
    } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
        res.status(400).send({ Status: false, Message: "Buyer Business can not be empty" });
    } else if (!ReceivingData.BuyerBranch || ReceivingData.BuyerBranch === '') {
        res.status(400).send({ Status: false, Message: "Buyer Branch can not be empty" });
    } else {
        ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.CustomerId);
        ReceivingData.InviteId = mongoose.Types.ObjectId(ReceivingData.InviteId);
        ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
        ReceivingData.BuyerBranch = mongoose.Types.ObjectId(ReceivingData.BuyerBranch);
        Promise.all([
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            InviteModel.InviteManagementSchema.findOne({ _id: ReceivingData.InviteId, ActiveStatus: true, IfDeleted: false }, {}, {})
                .populate({ path: "Business", select: "BusinessName" }).populate({ path: "Seller", select: ["Firebase_Token", "Device_Type", "Mobile"] }).exec(),
            CustomersManagement.CustomerSchema.findOne({ Mobile: ReceivingData.Mobile, CustomerType: 'User', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),    
        ]).then(Response => {
            var CustomerDetails = Response[0];
            var InviteDetails = JSON.parse(JSON.stringify(Response[1]));
            var UserDetails = JSON.parse(JSON.stringify(Response[2]));
            if (CustomerDetails !== null && InviteDetails !== null) {
                    InviteModel.InviteManagementSchema.updateOne(
                        { "_id": ReceivingData.InviteId },
                        {
                            $set: {
                                "Invite_Status": ReceivingData.Invite_Status,
                                "IfSeller": ReceivingData.Invite_Status,
                                "IfBuyer": ReceivingData.Invite_Status,
                                "BuyerBusiness": ReceivingData.BuyerBusiness,
                                "BuyerBranch": ReceivingData.BuyerBranch,
                                "InviteProcess": 'Completed'
                            }
                        }
                    ).exec(function (err_1, result_1) {
                        if (err_1) {
                            res.status(417).send({ Status: false, Message: "Some error occurred while Updating the Invite Status!.", Error: err_1 });
                        } else {
                            var CustomerFCMToken = [];
                            var MobileNumber = null;
                            var SellerId = null
                            if (UserDetails !== null) {
                                CustomerFCMToken.push(UserDetails.Firebase_Token);
                                MobileNumber = UserDetails.Mobile;
                                SellerId = UserDetails._id;
                            } else {
                                CustomerFCMToken.push(InviteDetails.Seller.Firebase_Token);
                                MobileNumber = InviteDetails.Seller.Mobile;
                                SellerId = InviteDetails.Seller._id;
                            }
                            
                            var SmsMessage = InviteDetails.Business.BusinessName + ' accepted your invite. Click here to create your first invoice for ' + InviteDetails.Business.BusinessName;
                            var payload = {
                                notification: {
                                    title: 'Hundi-Team',
                                    body: InviteDetails.Business.BusinessName + ' accepted your invite. Click here to create your first invoice for ' + InviteDetails.Business.BusinessName,
                                    sound: 'notify_tone.mp3'
                                },
                                data: {
                                    Customer: SellerId,
                                    notification_type: 'RequestAccepted',
                                    click_action: 'FCM_PLUGIN_ACTIVITY',
                                }
                            };
                            if (CustomerFCMToken.length > 0) {
                                FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
                            }

                            const params = new URLSearchParams();
                            params.append('key', '25ECE50D1A3BD6');
                            params.append('msg', SmsMessage);
                            params.append('senderid', 'TXTDMO');
                            params.append('routeid', '3');
                            params.append('contacts', MobileNumber);

                            // axios.post('https://sms.textmysms.com/app/smsapi/index.php', params).then(function (response) {
                            //    callback(null, response.data);
                            //  }).catch(function (error) {
                            //    callback('Some Error for Seller Invite SMS!, Error: ' + error, null);
                            //  });

                            const CreateNotification = new NotificationManagement.NotificationSchema({
                                User: null,
                                CustomerID: SellerId,
                                Notification_Type: 'RequestAccepted',
                                Message: InviteDetails.Business.BusinessName + ' accepted your invite. Click here to create your first invoice for ' + InviteDetails.Business.BusinessName,
                                Message_Received: true,
                                Message_Viewed: false,
                                ActiveStatus: true,
                                IfDeleted: false,
                             });
                             CreateNotification.save(); 
                            res.status(200).send({ Status: true, Message: "Invite Status Successfully Updated" });
                        }
                    });            
            } else {
                res.status(417).send({ Status: false, Message: "Invalid Customer details!." });
            }
        }).catch(Error => {
            res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: Error });
        });
    }
};

// InvitedBuyer_InviteList 
exports.InvitedBuyer_InviteList = function (req, res) {
    var ReceivingData = req.body;
    
    if (!ReceivingData.Mobile || ReceivingData.Mobile === '') {
        res.status(400).send({ Status: false, Message: "Mobile can not be empty" });
    } else if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
        res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
    } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
        res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
    } else {
        ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
        Promise.all([
            CustomersManagement.CustomerSchema.findOne({ Mobile: ReceivingData.Mobile, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            CustomersManagement.CustomerSchema.find({ Owner: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        ]).then(Response => {
            var OwnerDetails = Response[0];
            var CustomerDetails = Response[1];
            var MobileArr = [ReceivingData.Mobile];
            if (OwnerDetails !== null && (CustomerDetails.length === 0 || CustomerDetails.length !== 0)) {
                if (CustomerDetails.length !== 0) {
                    CustomerDetails.map(Obj => {
                        MobileArr.push(Obj.Mobile);
                    });
                }
                var FindQuery = { Mobile: { $in: MobileArr }, InviteCategory: ReceivingData.CustomerCategory, Invite_Status: 'Pending_Approval' };
                const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
                const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
                var ShortOrder = { createdAt: -1 };
                var ShortKey = ReceivingData.ShortKey;
                var ShortCondition = ReceivingData.ShortCondition;
                if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                   ShortOrder = {};
                   ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
                }         
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
                    InviteModel.InviteManagementSchema
                       .aggregate([
                          { $match: FindQuery },
                          {
                             $lookup: {
                                from: "Business",
                                let: { "business": "$Business" },
                                pipeline: [
                                   { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                                   { $project: { "BusinessName": 1 } }
                                ],
                                as: 'BusinessInfo'
                             }
                          },
                          { $unwind: { path: "$BusinessInfo", preserveNullAndEmptyArrays: true } },
                          {
                             $lookup: {
                                from: "Business",
                                let: { "buyerBusiness": "$BuyerBusiness" },
                                pipeline: [
                                   { $match: { $expr: { $eq: ["$$buyerBusiness", "$_id"] } } },
                                   { $project: { "BusinessName": 1 } }
                                ],
                                as: 'BuyerBusinessInfo'
                             }
                          },
                          { $unwind: { path: "$BuyerBusinessInfo", preserveNullAndEmptyArrays: true } },
                          {
                             $lookup: {
                                from: "Branch",
                                let: { "branch": "$Branch" },
                                pipeline: [
                                   { $match: { $expr: { $eq: ["$$branch", "$_id"] } } },
                                   { $project: { "BranchName": 1, "AvailableCreditLimit": 1 } }
                                ],
                                as: 'BranchInfo'
                             }
                          },
                          { $unwind: { path: "$BranchInfo", preserveNullAndEmptyArrays: true } },
                          {
                             $lookup: {
                                from: "Branch",
                                let: { "buyerBranch": "$BuyerBranch" },
                                pipeline: [
                                   { $match: { $expr: { $eq: ["$$buyerBranch", "$_id"] } } },
                                   { $project: { "BranchName": 1 } }
                                ],
                                as: 'BuyerBranchInfo'
                             }
                          },
                          { $unwind: { path: "$BuyerBranchInfo", preserveNullAndEmptyArrays: true } },
                          {
                             $lookup: {
                                from: "Customers",
                                let: { "seller": "$Seller" },
                                pipeline: [
                                   { $match: { $expr: { $eq: ["$$seller", "$_id"] } } },
                                   { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                                ],
                                as: 'SellerInfo'
                             }
                          },
                          { $unwind: { path: "$SellerInfo", preserveNullAndEmptyArrays: true } },
                          {
                             $lookup: {
                                from: "Customers",
                                let: { "invitedUser": "$InvitedUser" },
                                pipeline: [
                                   { $match: { $expr: { $eq: ["$$invitedUser", "$_id"] } } },
                                   { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                                ],
                                as: 'InvitedUserInfo'
                             }
                          },
                          { $unwind: { path: "$InvitedUserInfo", preserveNullAndEmptyArrays: true } },
                          {
                             $lookup: {
                                from: "Customers",
                                let: { "buyer": "$Buyer" },
                                pipeline: [
                                   { $match: { $expr: { $eq: ["$$buyer", "$_id"] } } },
                                   { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                                ],
                                as: 'BuyerInfo'
                             }
                          },
                          { $unwind: { path: "$BuyerInfo", preserveNullAndEmptyArrays: true } },
                          {
                             $project: {
                                Mobile: 1,
                                ContactName: 1,
                                Email: 1,
                                BuyerInfo: 1,
                                BuyerBusinessInfo: 1,
                                BuyerBranchInfo: 1,
                                SellerInfo: 1,
                                BusinessInfo: 1,
                                BranchInfo: 1,
                                IfUser: 1,
                                InvitedUserInfo: 1,
                                Invite_Status: 1,
                                InviteType: 1,
                                IfSeller: 1,
                                IfBuyer: 1,
                                BuyerCreditLimit: 1,
                                BuyerPaymentType: 1,
                                BuyerPaymentCycle: 1,
                                AvailableLimit: 1,
                                InvitedBy: 1,
                                InviteProcess: 1,
                                ModeInvite: 1,
                                InviteCategory: 1,
                                ActiveStatus: 1,
                                IfDeleted: 1,
                                createdAt: 1
                             }
                          },
                          { $sort: ShortOrder },
                          { $skip: Skip_Count },
                          { $limit: Limit_Count }
                       ]).exec(),
                    InviteModel.InviteManagementSchema.countDocuments(FindQuery).exec(),
                    BusinessManagement.BranchSchema.find({ ActiveStatus: true, IfDeleted: false },{}, {}).exec(),
                    InvoiceManagement.InvoiceSchema.find({ InvoiceStatus: "Accept", PaidORUnpaid: "Unpaid" },{}, {}).exec(),
                 ]).then(result => {
                  var InviteDetails = JSON.parse(JSON.stringify(result[0]));
                  var BranchDetails = JSON.parse(JSON.stringify(result[2]));
                  var InvoiceDetails = JSON.parse(JSON.stringify(result[3]));
                  if (InviteDetails.length !== 0) {
                      InviteDetails.map(Obj => {
                          if (Obj.BranchInfo !== null) {
                              Obj.BranchInfo.ExtraUnitizedCreditLimit = 0;
                              Obj.BranchInfo.CreditBalanceExists = false;
                          }
                          const BranchDetailsArr = BranchDetails.filter(obj => obj.Customer === Obj.SellerInfo._id && obj._id === Obj.BranchInfo._id);
                          if (BranchDetailsArr.length > 0) {
                              BranchDetailsArr.map(obj => {
                                  if (Obj.BranchInfo !== null) {
                                      Obj.BranchInfo.AvailableCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit) + parseFloat(obj.AvailableCreditLimit);
                                      Obj.BranchInfo.AvailableCreditLimit = Obj.BranchInfo.AvailableCreditLimit.toFixed(2);
                                      Obj.BranchInfo.AvailableCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit);
                                  }
                              });
                          }
  
                          const InvoiceDetailsArr = InvoiceDetails.filter(obj => obj.Seller === Obj.SellerInfo._id && obj._id === Obj.BranchInfo._id);
                          var InvoiceAmount = 0;
                          if (InvoiceDetailsArr.length > 0) {
                              InvoiceDetailsArr.map(obj => {
                                  InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.AvailableAmount);
                              });
                          }
                          if (Obj.BranchInfo !== null) {
                              Obj.BranchInfo.AvailableCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit) + parseFloat(InvoiceAmount);
                              if (Obj.BranchInfo.AvailableCreditLimit > 0) {
                                  Obj.BranchInfo.AvailableCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit);
                                  Obj.BranchInfo.AvailableCreditLimit = Obj.BranchInfo.AvailableCreditLimit.toFixed(2);
                                  Obj.BranchInfo.AvailableCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit);
                              } else {
                                  Obj.BranchInfo.AvailableCreditLimit = 0;
                                  Obj.BranchInfo.ExtraUnitizedCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit);
                                  Obj.BranchInfo.ExtraUnitizedCreditLimit = Obj.BranchInfo.ExtraUnitizedCreditLimit.toFixed(2);
                                  Obj.BranchInfo.ExtraUnitizedCreditLimit = parseFloat(Obj.BranchInfo.ExtraUnitizedCreditLimit);
                              }
                          }
                          return Obj;
                      });
                      res.status(200).send({ Status: true, Message: 'Your Invite List', Response: InviteDetails, SubResponse: result[1]});
                  } else {
                      res.status(400).send({ Status: false, Message: "This Customer does not having any Invites!" });
                  }                 
                 }).catch(Error => {
                    ErrorHandling.ErrorLogCreation(req, 'Invite Find error', 'InviteManagement -> All Invite List', JSON.stringify(Error));
                    res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
                 });              
            } else {
                res.status(400).send({ Status: false, Message: "Invalid Customer Details" });
            }
        }).catch(Error => {
            res.status(400).send({ Status: false, Message: "This Customer does not having any Invites!" });
        });
    }
};


// Buyer Invite Create
exports.BuyerSendInvite = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.InviteCategory || ReceivingData.InviteCategory === '') {
        res.status(400).send({ Status: false, Message: "InviteCategory can not be empty" });
    } else if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
        res.status(400).send({ Status: false, Message: "Buyer Details can not be empty" });
    } else if (!ReceivingData.InviteType || ReceivingData.InviteType === '') {
        res.status(400).send({ Status: false, Message: "Customer Type can not be empty" });
    } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
        res.status(400).send({ Status: false, Message: " Buyer Business Details can not be empty" });
    } else if (!ReceivingData.BuyerBranch || ReceivingData.BuyerBranch === '') {
        res.status(400).send({ Status: false, Message: "Buyer Branch Details can not be empty" });
    } else {
        ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
        ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
        ReceivingData.BuyerBranch = mongoose.Types.ObjectId(ReceivingData.BuyerBranch);

        var InviteProcess = 'Pending';
        var ModeInvite = 'Mobile';
        if (ReceivingData.Seller !== 'Empty' && ReceivingData.Business !== 'Empty' && ReceivingData.Branch !== 'Empty') {
            InviteProcess = 'Completed';
            ModeInvite = 'Direct';
        }

        if (ReceivingData.Seller !== 'Empty') {
            ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
        } else {
            ReceivingData.Seller = null;
        }

        if (ReceivingData.Business !== 'Empty') {
            ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
        } else {
            ReceivingData.Business = null;
        }

        if (ReceivingData.Branch !== 'Empty') {
            ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);
        } else {
            ReceivingData.Branch = null;
        }

        Promise.all([
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, CustomerType: 'Owner', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            InviteModel.InviteManagementSchema.find({ Mobile: ReceivingData.Mobile, Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, BuyerBranch: ReceivingData.BuyerBranch, $or: [{ Invite_Status: "Pending_Approval" }, { Invite_Status: "Accept" }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            BusinessManagement.BusinessSchema.findOne({ _id: ReceivingData.BuyerBusiness, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            InviteModel.InviteManagementSchema.findOne({ Mobile: ReceivingData.Mobile, Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, BuyerBranch: ReceivingData.BuyerBranch, Invite_Status: "Reject", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        ]).then(Response => {
            var CustomerDetails = Response[0];
            var InvitedDetails = Response[1];
            var SellerDetails = JSON.parse(JSON.stringify(Response[2]));
            var BusinessDetails = JSON.parse(JSON.stringify(Response[3]));
            var RejectDetails = Response[4];
            if (CustomerDetails !== null && InvitedDetails.length === 0) {
                var IfUser = IfUser;
                var InvitedUser = null;
                if (SellerDetails !== null) {
                    if (SellerDetails.CustomerType === 'Owner') {
                        ReceivingData.Seller = mongoose.Types.ObjectId(SellerDetails._id);
                    } else if (SellerDetails.CustomerType === 'User') {
                        IfUser = true;
                        InvitedUser = mongoose.Types.ObjectId(SellerDetails._id);
                        ReceivingData.Seller = mongoose.Types.ObjectId(SellerDetails.Owner);
                    }
                }

                ReceivingData.BuyerCreditLimit = parseFloat(ReceivingData.BuyerCreditLimit);
                if (ReceivingData.BuyerCreditLimit > 0) {                    
                    ReceivingData.BuyerCreditLimit = ReceivingData.BuyerCreditLimit.toFixed(2);
                    ReceivingData.BuyerCreditLimit = parseFloat(ReceivingData.BuyerCreditLimit);
                }
                const Create_Invite = new InviteModel.InviteManagementSchema({
                    Mobile: ReceivingData.Mobile,
                    ContactName: ReceivingData.ContactName,
                    Email: ReceivingData.Email,
                    Buyer: ReceivingData.Buyer,
                    BuyerBusiness: ReceivingData.BuyerBusiness,
                    BuyerBranch: ReceivingData.BuyerBranch,
                    Seller: ReceivingData.Seller,
                    Business: ReceivingData.Business,
                    Branch: ReceivingData.Branch,
                    IfUser: IfUser,
                    InvitedUser: InvitedUser,
                    Invite_Status: 'Pending_Approval',
                    InviteType: ReceivingData.InviteType,
                    BuyerCreditLimit: ReceivingData.BuyerCreditLimit || 0,
                    BuyerPaymentType: ReceivingData.BuyerPaymentType || '',
                    BuyerPaymentCycle: ReceivingData.BuyerPaymentCycle || 0,
                    AvailableLimit: ReceivingData.BuyerCreditLimit || 0,
                    InvitedBy: ReceivingData.Buyer,
                    InviteProcess: InviteProcess,                    
                    IfSeller: '',
                    IfBuyer: 'Pending',
                    InviteCategory: 'Seller',
                    ModeInvite: ModeInvite,
                    ActiveStatus: true,
                    IfDeleted: false
                });
                Create_Invite.save(function (err, result) {
                    if (err) {
                        ErrorHandling.ErrorLogCreation(req, 'Buyer Invite Register Error', 'InviteManagement.Controller -> SellerInviteSend', JSON.stringify(err));
                        res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to complete this invitation!.", Error: err });
                    } else {
                        if (result.Seller !== null) {
                            var SmsMessage = BusinessDetails.BusinessName + ' would like to offer online payment system for you at free of cost. Click this link to install the app and get started - Team Hundi';
                            var CustomerFCMToken = [];
                            CustomerFCMToken.push(SellerDetails.Firebase_Token);
                            var payload = {
                                notification: {
                                    title: 'Hundi-Team',
                                    body: BusinessDetails.BusinessName + ' would like to offer online payment system for you at free of cost. Click this link to install the app and get started - Team Hundi',
                                    sound: 'notify_tone.mp3'
                                },
                                data: {
                                    Customer: SellerDetails._id,
                                    notification_type: 'NewSignUpRequest',
                                    click_action: 'FCM_PLUGIN_ACTIVITY',
                                }
                            };
                            if (CustomerFCMToken.length > 0) {
                                FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
                            }

                            const CreateNotification = new NotificationManagement.NotificationSchema({
                                User: null,
                                CustomerID: SellerDetails._id,
                                Notification_Type: 'RequestSend',
                                Message: BusinessDetails.BusinessName + ' would like to offer online payment system for you at free of cost. Click this link to install the app and get started - Team Hundi',
                                Message_Received: true,
                                Message_Viewed: false,
                                ActiveStatus: true,
                                IfDeleted: false,
                             });
                             CreateNotification.save(); 

                            const params = new URLSearchParams();
                            params.append('key', '25ECE50D1A3BD6');
                            params.append('msg', SmsMessage);
                            params.append('senderid', 'TXTDMO');
                            params.append('routeid', '3');
                            params.append('contacts', SellerDetails.Mobile);

                            // axios.post('https://sms.textmysms.com/app/smsapi/index.php', params).then(function (response) {
                            //    callback(null, response.data);
                            //  }).catch(function (error) {
                            //    callback('Some Error for Seller Invite SMS!, Error: ' + error, null);
                            //  });
                        }

                        if (RejectDetails !== null) {
                            RejectDetails.ActiveStatus = false;
                            RejectDetails.IfDeleted = true;
                            RejectDetails.save();
                        }
                        res.status(200).send({ Status: true, Response: result });
                    }
                });
            } else {
                res.status(200).send({ Status: false, Message: "Already Send to the Invite this Number And Buyer, Buyer Business, Buyer Branch" });
            }
        }).catch(Error => {
            ErrorHandling.ErrorLogCreation(req, 'Customer Details Error', 'InviteManagement.Controller -> Customer details Error', JSON.stringify(Error));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
        });
    }
};


// Seller Update To Buyer Credit limit
exports.SellerUpdateToBuyerCreditLimit = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.InviteId || ReceivingData.InviteId === '') {
       res.status(400).send({ Status: false, Message: "InviteId can not be empty" });
   } else if (!ReceivingData.BuyerCreditLimit || ReceivingData.BuyerCreditLimit === '') {
       res.status(400).send({ Status: false, Message: "Buyer Credit Limit can not be empty" });
   } else if (!ReceivingData.BuyerPaymentCycle || ReceivingData.BuyerPaymentCycle === '') {
       res.status(400).send({ Status: false, Message: "Buyer Payment Cycle can not be empty" });
   } else if (!ReceivingData.BuyerPaymentType || ReceivingData.BuyerPaymentType === '') {
       res.status(400).send({ Status: false, Message: "Buyer Payment Type can not be empty" });
   } else if (!ReceivingData.Mobile || ReceivingData.Mobile === '') {
       res.status(400).send({ Status: false, Message: "Mobile Number can not be empty" });
   } else if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
       res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.Branch || ReceivingData.Branch === '') {
       res.status(400).send({ Status: false, Message: "Seller Branch can not be empty" });
   } else if (!ReceivingData.BuyerBranch || ReceivingData.BuyerBranch === '') {
       res.status(400).send({ Status: false, Message: "Buyer Branch can not be empty" });
   } else {
       ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.CustomerId);
       ReceivingData.InviteId = mongoose.Types.ObjectId(ReceivingData.InviteId);
       ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);
       ReceivingData.BuyerBranch = mongoose.Types.ObjectId(ReceivingData.BuyerBranch);

       var SellerBranches = [ReceivingData.Branch];
       var BuyerBranches = [ReceivingData.BuyerBranch];
       Promise.all([
           CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
           InviteModel.InviteManagementSchema.findOne({ _id: ReceivingData.InviteId, ActiveStatus: true, IfDeleted: false }, {}, {})
               .populate({ path: "Business", select: "BusinessName" })
               .populate({ path: "BuyerBusiness", select: "BusinessName" })
               .populate({ path: "Branch", select: "BranchName" })
               .populate({ path: "BuyerBranch", select: "BranchName" })
               .populate({ path: "Buyer", select: ["Firebase_Token", "Device_Type", "Mobile"] }).exec(),
           CustomersManagement.CustomerSchema.find({ "BusinessAndBranches.Branches": { $in: SellerBranches }, CustomerType: 'User', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
           CustomersManagement.CustomerSchema.find({ "BusinessAndBranches.Branches": { $in: BuyerBranches }, CustomerType: 'User', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
       ]).then(Response => {
           var CustomerDetails = Response[0];
           var InviteDetails = JSON.parse(JSON.stringify(Response[1]));
           var SellerUserDetails = JSON.parse(JSON.stringify(Response[2]));
           var BuyerUserDetails = JSON.parse(JSON.stringify(Response[3]));
           if (CustomerDetails !== null && InviteDetails !== null) {
               ReceivingData.BuyerCreditLimit = parseFloat(ReceivingData.BuyerCreditLimit);
               if (ReceivingData.BuyerCreditLimit > 0) {
                   ReceivingData.BuyerCreditLimit = ReceivingData.BuyerCreditLimit.toFixed(2);
                   ReceivingData.BuyerCreditLimit = parseFloat(ReceivingData.BuyerCreditLimit);
               }
               InviteModel.InviteManagementSchema.updateOne(
                   { "_id": ReceivingData.InviteId },
                   {
                       $set: {
                           "BuyerCreditLimit": ReceivingData.BuyerCreditLimit,
                           "AvailableLimit": ReceivingData.BuyerCreditLimit,
                           "BuyerPaymentCycle": ReceivingData.BuyerPaymentCycle,
                           "BuyerPaymentType": ReceivingData.BuyerPaymentType,
                       }
                   }
               ).exec(function (err_1, result_1) {
                   if (err_1) {
                       res.status(417).send({ Status: false, Message: "Some error occurred while Updating the Invite Status!.", Error: err_1 });
                   } else {

                       if (SellerUserDetails.length > 0) {
                           SellerUserDetails.map(Obj => {
                               var BuyerFCMToken = [];
                               BuyerFCMToken.push(Obj.Firebase_Token);
                               var payload = {
                                   notification: {
                                       title: 'Hundi-Team',
                                       body: InviteDetails.BuyerBusiness.BusinessName + ',' + InviteDetails.BuyerBranch.BranchName + 'credit limit has been changed to Rs.' + ReceivingData.BuyerCreditLimit + ' and Payment cycle to (' + ReceivingData.BuyerPaymentCycle + 'Days) by ' + InviteDetails.Business.BusinessName + ',' + InviteDetails.Branch.BranchName,
                                       sound: 'notify_tone.mp3'
                                   },
                                   data: {
                                       Customer: Obj._id,
                                       notification_type: 'InviteNotification',
                                       click_action: 'FCM_PLUGIN_ACTIVITY',
                                   }
                               };

                               if (BuyerFCMToken.length > 0) {
                                   FCM_App.messaging().sendToDevice(BuyerFCMToken, payload, options).then((NotifyRes) => { });
                               }

                               var SmsMessage = InviteDetails.BuyerBusiness.BusinessName + ',' + InviteDetails.BuyerBranch.BranchName + 'credit limit has been changed to Rs.' + ReceivingData.BuyerCreditLimit + ' and Payment cycle to (' + ReceivingData.BuyerPaymentCycle + 'Days) by ' + InviteDetails.Business.BusinessName + ',' + InviteDetails.Branch.BranchName;
                               const params = new URLSearchParams();
                               params.append('key', '25ECE50D1A3BD6');
                               params.append('msg', SmsMessage);
                               params.append('senderid', 'TXTDMO');
                               params.append('routeid', '3');
                               params.append('contacts', Obj.Mobile);

                               // axios.post('https://sms.textmysms.com/app/smsapi/index.php', params).then(function (response) {
                               //    callback(null, response.data);
                               //  }).catch(function (error) {
                               //    callback('Some Error for Seller Invite SMS!, Error: ' + error, null);
                               //  });

                               const CreateNotification = new NotificationManagement.NotificationSchema({
                                   User: null,
                                   CustomerID: Obj._id,
                                   Notification_Type: 'SellerChangedInvite',
                                   Message: InviteDetails.Business.BusinessName + ' accepted your invite. Click here to create your first invoice for ' + InviteDetails.BuyerBusiness.BusinessName,
                                   Message_Received: true,
                                   Message_Viewed: false,
                                   ActiveStatus: true,
                                   IfDeleted: false,
                               });
                               CreateNotification.save();
                               return Obj;
                           });
                       }


                       if (BuyerUserDetails.length > 0) {
                           BuyerUserDetails.map(Obj => {
                               var SellerFCMToken = [];
                               SellerFCMToken.push(Obj.Firebase_Token);
                               var payload = {
                                   notification: {
                                       title: 'Hundi-Team',
                                       body: InviteDetails.BuyerBusiness.BusinessName + ',' + InviteDetails.BuyerBranch.BranchName + 'credit limit has been changed to Rs.' + ReceivingData.BuyerCreditLimit + ' and Payment cycle to (' + ReceivingData.BuyerPaymentCycle + 'Days) by ' + InviteDetails.Business.BusinessName + ',' + InviteDetails.Branch.BranchName,
                                       sound: 'notify_tone.mp3'
                                   },
                                   data: {
                                       Customer: Obj._id,
                                       notification_type: 'InviteNotification',
                                       click_action: 'FCM_PLUGIN_ACTIVITY',
                                   }
                               };

                               if (SellerFCMToken.length > 0) {
                                   FCM_App.messaging().sendToDevice(SellerFCMToken, payload, options).then((NotifyRes) => { });
                               }

                               var SmsMessage = InviteDetails.BuyerBusiness.BusinessName + ',' + InviteDetails.BuyerBranch.BranchName + 'credit limit has been changed to Rs.' + ReceivingData.BuyerCreditLimit + ' and Payment cycle to (' + ReceivingData.BuyerPaymentCycle + 'Days) by ' + InviteDetails.Business.BusinessName + ',' + InviteDetails.Branch.BranchName;
                               const params = new URLSearchParams();
                               params.append('key', '25ECE50D1A3BD6');
                               params.append('msg', SmsMessage);
                               params.append('senderid', 'TXTDMO');
                               params.append('routeid', '3');
                               params.append('contacts', Obj.Mobile);

                               // axios.post('https://sms.textmysms.com/app/smsapi/index.php', params).then(function (response) {
                               //    callback(null, response.data);
                               //  }).catch(function (error) {
                               //    callback('Some Error for Seller Invite SMS!, Error: ' + error, null);
                               //  });

                               const CreateNotification = new NotificationManagement.NotificationSchema({
                                   User: null,
                                   CustomerID: Obj._id,
                                   Notification_Type: 'BuyerChangedInvite',
                                   Message: InviteDetails.Business.BusinessName + ' accepted your invite. Click here to create your first invoice for ' + InviteDetails.BuyerBusiness.BusinessName,
                                   Message_Received: true,
                                   Message_Viewed: false,
                                   ActiveStatus: true,
                                   IfDeleted: false,
                               });
                               CreateNotification.save();
                               return Obj;
                           });
                       }


                       var CustomerFCMToken = [];
                       CustomerFCMToken.push(InviteDetails.Buyer.Firebase_Token);
                       var payload = {
                           notification: {
                               title: 'Hundi-Team',
                               body: InviteDetails.BuyerBusiness.BusinessName + ',' + InviteDetails.BuyerBranch.BranchName + 'credit limit has been changed to Rs.' + ReceivingData.BuyerCreditLimit + ' and Payment cycle to (' + ReceivingData.BuyerPaymentCycle + 'Days) by ' + InviteDetails.Business.BusinessName + ',' + InviteDetails.Branch.BranchName,
                               sound: 'notify_tone.mp3'
                           },
                           data: {
                               Customer: InviteDetails.Buyer._id,
                               notification_type: 'InviteNotification',
                               click_action: 'FCM_PLUGIN_ACTIVITY',
                           }
                       };

                       if (CustomerFCMToken.length > 0) {
                           FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
                       }


                       var SmsMessage = InviteDetails.BuyerBusiness.BusinessName + ',' + InviteDetails.BuyerBranch.BranchName + 'credit limit has been changed to Rs.' + ReceivingData.BuyerCreditLimit + ' and Payment cycle to (' + ReceivingData.BuyerPaymentCycle + 'Days) by ' + InviteDetails.Business.BusinessName + ',' + InviteDetails.Branch.BranchName;
                       const params = new URLSearchParams();
                       params.append('key', '25ECE50D1A3BD6');
                       params.append('msg', SmsMessage);
                       params.append('senderid', 'TXTDMO');
                       params.append('routeid', '3');
                       params.append('contacts', InviteDetails.Buyer.Mobile);

                       // axios.post('https://sms.textmysms.com/app/smsapi/index.php', params).then(function (response) {
                       //    callback(null, response.data);
                       //  }).catch(function (error) {
                       //    callback('Some Error for Seller Invite SMS!, Error: ' + error, null);
                       //  });

                       const CreateNotification = new NotificationManagement.NotificationSchema({
                           User: null,
                           CustomerID: InviteDetails.Buyer._id,
                           Notification_Type: 'BuyerChangedInvite',
                           Message: InviteDetails.BuyerBusiness.BusinessName + ',' + InviteDetails.BuyerBranch.BranchName + 'credit limit has been changed to Rs.' + ReceivingData.BuyerCreditLimit + ' and Payment cycle to (' + ReceivingData.BuyerPaymentCycle + 'Days) by ' + InviteDetails.Business.BusinessName + ',' + InviteDetails.Branch.BranchName,
                           Message_Received: true,
                           Message_Viewed: false,
                           ActiveStatus: true,
                           IfDeleted: false,
                       });
                       CreateNotification.save();
                       res.status(200).send({ Status: true, Message: "Invite Status Successfully Updated" });
                   }
               });

           } else {
               res.status(417).send({ Status: false, Message: "Invalid Customer details!." });
           }
       }).catch(Error => {
           res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: Error });
       });
   }
};




