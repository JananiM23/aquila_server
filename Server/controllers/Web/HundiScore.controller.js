var CustomerManagement = require('./../../Models/CustomerManagement.model');
var InvoiceManagement = require('./../../Models/InvoiceManagement.model');
var PaymentManagement = require('./../../Models/PaymentManagement.model');
var TemporaryManagement = require('./../../Models/TemporaryCredit.model');
var InviteManagement = require('./../../Models/Invite_Management.model');
var BusinessAndBranchManagement = require('./../../Models/BusinessAndBranchManagement.model');
var NotificationModel = require('../../Models/notification_management.model');
var mongoose = require('mongoose');


exports.SellerOwnerDashboard = function (req, res) {
  var ReceivingData = req.body;
  if (!ReceivingData.Customer || ReceivingData.Customer === '') {
    res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
  } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
    res.status(400).send({ Status: false, Message: "CustomerCategory can not be empty" });
  } else {
    ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
    CustomerManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer, CustomerType: 'Owner' }, {}, {}).exec(function (err, result) {
      if (err) {
        ErrorHandling.ErrorLogCreation(req, 'Seller Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(err));
        res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
      } else {
        if (result !== null) {
          var PaymentAcknowledgementQuery = {};
          var InvoiceDisputedQuery = {};
          var InviteRequestQuery = {};

          PaymentAcknowledgementQuery = { Seller: ReceivingData.Customer, Payment_Status: "Pending", ActiveStatus: true, IfDeleted: false };
          InvoiceDisputedQuery = { Seller: ReceivingData.Customer, InvoiceStatus: 'Disputed' };
          InviteRequestQuery = { Seller: ReceivingData.Customer, InviteCategory: ReceivingData.CustomerCategory, IfBuyer: 'Pending', };
          var PaymentCount = { Seller: ReceivingData.Customer, Payment_Status: "Pending", ActiveStatus: true, IfDeleted: false };
          var InvoiceAmount = { Seller: ReceivingData.Customer, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
          Promise.all([
            InvoiceManagement.InvoiceSchema.find({ Seller: ReceivingData.Customer, PaidORUnpaid: "Unpaid", InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            PaymentManagement.PaymentSchema.countDocuments(PaymentAcknowledgementQuery),
            InvoiceManagement.InvoiceSchema.countDocuments(InvoiceDisputedQuery),
            InviteManagement.InviteManagementSchema.countDocuments(InviteRequestQuery),
            BusinessAndBranchManagement.BusinessSchema.find({ Customer: ReceivingData.Customer, IsAssigned: true, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            BusinessAndBranchManagement.BranchSchema.find({ Customer: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            InviteManagement.InviteManagementSchema.find({ Seller: ReceivingData.Customer, Invite_Status: "Accept" }, {}, {}).exec(),
            NotificationModel.NotificationSchema.countDocuments({
              CustomerID: ReceivingData.Customer,
              $or: [{ Notification_Type: "SellerRequestSend" },
              { Notification_Type: "SellerRequestAccepted" },
              { Notification_Type: "SellerInvoiceCreated" },
              { Notification_Type: "SellerInvoiceAccept" },
              { Notification_Type: "SupportAdminReply" },
              { Notification_Type: "SupportAdminClosed" },
              { Notification_Type: "SellerInvoiceDisputed" },
              { Notification_Type: "BuyerTemporaryRequest" },
              { Notification_Type: "SellerChangedInvite" }], ActiveStatus: true, Message_Viewed: false, IfDeleted: false
            }),
            PaymentManagement.PaymentSchema.countDocuments(PaymentCount),
            InvoiceManagement.InvoiceSchema.countDocuments(InvoiceAmount),
          ]).then(Response => {
            var CustomerInvoice = JSON.parse(JSON.stringify(Response[0]));
            var PaymentAcknowledgementCount = JSON.parse(JSON.stringify(Response[1]));
            var InvoiceDisputedCount = JSON.parse(JSON.stringify(Response[2]));
            var InviteRequestCount = JSON.parse(JSON.stringify(Response[3]));
            var BusinessArr = JSON.parse(JSON.stringify(Response[4]));
            var BranchArr = JSON.parse(JSON.stringify(Response[5]));
            var InviteDetails = JSON.parse(JSON.stringify(Response[6]));
            var NotificationCount = JSON.parse(JSON.stringify(Response[7]));
            var PaymentCounts = JSON.parse(JSON.stringify(Response[8]));
            var InvoiceCounts = JSON.parse(JSON.stringify(Response[9]));
            var HundiScore = {
              _id: String,
              ContactName: String,
              Mobile: String,
              File_Name: String,
              OverDueAmount: 0,
              CreditLimit: 0,
              AvailableCreditLimit: 0,
              ExtraUnitizedCreditLimit: 0,
              CreditBalanceExists: false,
              DelayInPayment: 0,
              TemporaryCreditLimit: 0,
              DueTodayAmount: 0,
              UpComingAmount: 0,
              PaymentAcknowledgement: PaymentAcknowledgementCount,
              DisputedInvoice: InvoiceDisputedCount,
              BuyerRequest: InviteRequestCount,
              NotificationCount: NotificationCount,
              MyBusiness: false,
              InvoiceCount: InvoiceCounts,
              PaymentCount: PaymentCounts
            };
            HundiScore._id = result._id;
            HundiScore.ContactName = result.ContactName;
            HundiScore.Mobile = result.Mobile;
            HundiScore.File_Name = result.File_Name;
            HundiScore.CustomerCategory = result.CustomerCategory;

            if (BusinessArr.length !== 0) {
              HundiScore.MyBusiness = true;
            }
            var RespectiveCreditLimit = 0;
            if (BranchArr.length > 0) {
              BranchArr.map(Obj => {
                HundiScore.CreditLimit = parseFloat(HundiScore.CreditLimit) + parseFloat(Obj.AvailableCreditLimit);
                HundiScore.AvailableCreditLimit = parseFloat(HundiScore.AvailableCreditLimit) + parseFloat(Obj.AvailableCreditLimit);
                RespectiveCreditLimit = parseFloat(RespectiveCreditLimit) + parseFloat(Obj.AvailableCreditLimit);
              });
            }
            var OverDueInvoiceArr = [];
            if (CustomerInvoice.length !== 0) {
              CustomerInvoice.map(Obj => {             
                var InvoiceDate = new Date();
                var TodayDate = new Date();
                InvoiceDate = new Date(Obj.InvoiceDate);
                const InviteDetailsArr = InviteDetails.filter(obj1 => obj1.Branch === Obj.Branch);
                if (InviteDetailsArr.length > 0) {
                  InviteDetailsArr.map(ObjIn => {
                    InvoiceDate = new Date(InvoiceDate.setDate(InvoiceDate.getDate() + ObjIn.BuyerPaymentCycle + 1));                 
                  });
                  if (InvoiceDate.valueOf() < TodayDate.valueOf()) {
                    OverDueInvoiceArr.push(Obj);
                  }
                }              
              });
            }

            var RespectiveOverDueAmount = 0;
            if (OverDueInvoiceArr.length > 0) {
              OverDueInvoiceArr.map(Obj => {
                RespectiveOverDueAmount = parseFloat(RespectiveOverDueAmount) + parseFloat(Obj.AvailableAmount);        
              });
            }
            
            var InvoiceAmount = 0;
            if (CustomerInvoice.length !== 0) {
              CustomerInvoice.map(Obj => {
                InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(Obj.AvailableAmount);
              })
            }

            HundiScore.UpComingAmount = InvoiceAmount;
            var InvoiceRespectiveCreditAmount = parseFloat(InvoiceAmount) - parseFloat(RespectiveCreditLimit);
            if (InvoiceRespectiveCreditAmount >= 0) {
              HundiScore.ExtraUnitizedCreditLimit = -Math.abs(InvoiceRespectiveCreditAmount);
              HundiScore.ExtraUnitizedCreditLimit = HundiScore.ExtraUnitizedCreditLimit.toFixed(2);
              HundiScore.ExtraUnitizedCreditLimit = parseFloat(HundiScore.ExtraUnitizedCreditLimit);
              HundiScore.CreditBalanceExists = true;
              HundiScore.AvailableCreditLimit = 0;
            } else {
              if (InvoiceRespectiveCreditAmount < 0) {
                HundiScore.AvailableCreditLimit = Math.abs(InvoiceRespectiveCreditAmount);
                HundiScore.AvailableCreditLimit = HundiScore.AvailableCreditLimit.toFixed(2);
                HundiScore.AvailableCreditLimit = parseFloat(HundiScore.AvailableCreditLimit);
              }
            }
            if (RespectiveOverDueAmount > 0) {
              HundiScore.OverDueAmount = RespectiveOverDueAmount;
              HundiScore.OverDueAmount = HundiScore.OverDueAmount.toFixed(2);
              HundiScore.OverDueAmount = parseFloat(HundiScore.OverDueAmount);
            } else {
              HundiScore.OverDueAmount = 0;
            }


            var OutStandingInvoice = 0;
            var NumberOfDaysOutStanding = 0; 
            if (CustomerInvoice.length !== 0) {
              CustomerInvoice.map(Obj => {
                var InvoiceCreatedDate = new Date();
                var InvoiceApprovedDate = new Date(Obj.InvoiceDate);
                const InviteDetailsArray = InviteDetails.filter(obj1 => obj1.Seller === JSON.parse(JSON.stringify(ReceivingData.Customer)) && obj1.Branch === Obj.Branch);
                if (InviteDetailsArray.length > 0) {
                  InviteDetailsArray.map(ObjIn => {
                    InvoiceApprovedDate = new Date(InvoiceApprovedDate.setDate(InvoiceApprovedDate.getDate() + ObjIn.BuyerPaymentCycle));                  
                  });
                  if (InvoiceCreatedDate.toLocaleDateString() === InvoiceApprovedDate.toLocaleDateString()) {
                    NumberOfDaysOutStanding = NumberOfDaysOutStanding + Obj.AvailableAmount;
                  }
                }
              });
            }

            var PaymentCycle = 0;
            if (InviteDetails.length !== 0) {
              InviteDetails.map(Obj => {
                PaymentCycle = parseFloat(Obj.BuyerPaymentCycle);
              });
            }
            var DueTodayAmount = parseFloat(NumberOfDaysOutStanding);
            if (DueTodayAmount > 1 && DueTodayAmount !== Infinity) {
              HundiScore.DueTodayAmount = DueTodayAmount;
            }

            if (HundiScore.DueTodayAmount > 1) {
              HundiScore.DueTodayAmount = HundiScore.DueTodayAmount.toFixed(2);
              HundiScore.DueTodayAmount = parseFloat(HundiScore.DueTodayAmount);
            }

            if (HundiScore.UpComingAmount > 0) {
              HundiScore.UpComingAmount = HundiScore.UpComingAmount - (HundiScore.DueTodayAmount + HundiScore.OverDueAmount);
              if (HundiScore.UpComingAmount < 0) {
                HundiScore.UpComingAmount = 0;
              }
            }

            if (HundiScore.UpComingAmount > 1) {
              HundiScore.UpComingAmount = HundiScore.UpComingAmount.toFixed(2);
              HundiScore.UpComingAmount = parseFloat(HundiScore.UpComingAmount);
            }
            res.status(200).send({ Status: true, Message: "Hundi Score!.", Response: HundiScore });
          }).catch(Error => {
            res.status(400).send({ Status: false, Message: "Some Occurred Error" });
          });
        } else {
          res.status(417).send({ Status: false, Message: "Invalid Customer Details!." });
        }
      }
    });
  }
};

exports.SellerUserDashboard = function (req, res) {
  var ReceivingData = req.body;
  if (!ReceivingData.Customer || ReceivingData.Customer === '') {
    res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
  } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
    res.status(400).send({ Status: false, Message: "CustomerCategory can not be empty" });
  } else {
    ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
    CustomerManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer, CustomerType: 'User' }, {}, {}).exec(function (err, result) {
      if (err) {
        ErrorHandling.ErrorLogCreation(req, 'Seller Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(err));
        res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
      } else {
        if (result !== null) {
          var FindBranchArray = [];
          var FindBusinessArray = [];
          if (result.BusinessAndBranches.length !== 0) {
            result.BusinessAndBranches.map(Obj => {
              FindBusinessArray.push(mongoose.Types.ObjectId(Obj.Business));
              if (Obj.Branches.length !== 0) {
                Obj.Branches.map(obj => {
                  FindBranchArray.push(mongoose.Types.ObjectId(obj));
                });
              }
            });
          }
          var PaymentAcknowledgementQuery = {};
          var InvoiceDisputedQuery = {};
          var InviteRequestQuery = {};

          PaymentAcknowledgementQuery = { Branch: { $in: FindBranchArray }, Payment_Status: "Pending", ActiveStatus: true, IfDeleted: false };
          InvoiceDisputedQuery = { Branch: { $in: FindBranchArray }, InvoiceStatus: 'Disputed' };
          InviteRequestQuery = { Branch: { $in: FindBranchArray }, IfBuyer: 'Pending', };
          var PaymentCount = { Branch: { $in: FindBranchArray }, Payment_Status: "Pending", ActiveStatus: true, IfDeleted: false };
          var InvoiceAmount = { Branch: { $in: FindBranchArray }, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };

          Promise.all([
            InvoiceManagement.InvoiceSchema.find({ Branch: { $in: FindBranchArray }, InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            PaymentManagement.PaymentSchema.countDocuments(PaymentAcknowledgementQuery),
            InvoiceManagement.InvoiceSchema.countDocuments(InvoiceDisputedQuery),
            InviteManagement.InviteManagementSchema.countDocuments(InviteRequestQuery),
            BusinessAndBranchManagement.BusinessSchema.find({ _id: { $in: FindBusinessArray }, IsAssigned: true, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            BusinessAndBranchManagement.BranchSchema.find({ _id: { $in: FindBranchArray }, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            InviteManagement.InviteManagementSchema.find({ Branch: { $in: FindBranchArray }, Invite_Status: "Accept" }, {}, {}).exec(),
            NotificationModel.NotificationSchema.countDocuments({
              CustomerID: ReceivingData.Customer, $or: [
                { Notification_Type: "SellerRequestSend" },
                { Notification_Type: "SellerRequestAccepted" },
                { Notification_Type: "SellerInvoiceCreated" },
                { Notification_Type: "SellerInvoiceAccept" },
                { Notification_Type: "SupportAdminReply" },
                { Notification_Type: "SupportAdminClosed" },
                { Notification_Type: "SellerInvoiceDisputed" },
                { Notification_Type: "BuyerTemporaryRequest" },
                { Notification_Type: "SellerChangedInvite" }], ActiveStatus: true, Message_Viewed: false, IfDeleted: false
            }),
            PaymentManagement.PaymentSchema.countDocuments(PaymentCount),
            InvoiceManagement.InvoiceSchema.countDocuments(InvoiceAmount),
          ]).then(Response => {
            var CustomerInvoice = JSON.parse(JSON.stringify(Response[0]));
            var PaymentAcknowledgementCount = JSON.parse(JSON.stringify(Response[1]));
            var InvoiceDisputedCount = JSON.parse(JSON.stringify(Response[2]));
            var InviteRequestCount = JSON.parse(JSON.stringify(Response[3]));
            var BusinessArr = JSON.parse(JSON.stringify(Response[4]));
            var BranchArr = JSON.parse(JSON.stringify(Response[5]));
            var InviteDetails = JSON.parse(JSON.stringify(Response[6]));
            var NotificationCount = JSON.parse(JSON.stringify(Response[7]));
            var PaymentCounts = JSON.parse(JSON.stringify(Response[8]));
            var InvoiceCounts = JSON.parse(JSON.stringify(Response[9]));
            var HundiScore = {
              _id: String,
              ContactName: String,
              Mobile: String,
              File_Name: String,
              OverDueAmount: 0,
              CreditLimit: 0,
              AvailableCreditLimit: 0,
              DelayInPayment: 0,
              TemporaryCreditLimit: 0,
              ExtraUnitizedCreditLimit: 0,
              CreditBalanceExists: false,
              DueTodayAmount: 0,
              UpComingAmount: 0,
              PaymentAcknowledgement: PaymentAcknowledgementCount,
              DisputedInvoice: InvoiceDisputedCount,
              BuyerRequest: InviteRequestCount,
              NotificationCount: NotificationCount,
              InvoiceCount: InvoiceCounts,
              PaymentCount: PaymentCounts,
              MyBusiness: false
            };
            HundiScore._id = result._id;
            HundiScore.ContactName = result.ContactName;
            HundiScore.Mobile = result.Mobile;
            HundiScore.File_Name = result.File_Name;
            HundiScore.CustomerCategory = result.CustomerCategory;

            if (BusinessArr.length !== 0) {
              HundiScore.MyBusiness = true;
            }
            var RespectiveCreditLimit = 0;
            if (BranchArr.length > 0) {
              BranchArr.map(Obj => {
                HundiScore.CreditLimit = parseFloat(HundiScore.CreditLimit) + parseFloat(Obj.AvailableCreditLimit);
                HundiScore.AvailableCreditLimit = parseFloat(HundiScore.AvailableCreditLimit) + parseFloat(Obj.AvailableCreditLimit);
                RespectiveCreditLimit = parseFloat(RespectiveCreditLimit) + parseFloat(Obj.AvailableCreditLimit);
              });
            }

            var OverDueInvoiceArr = [];
            if (CustomerInvoice.length !== 0) {
              CustomerInvoice.map(Obj => {         
                var InvoiceDate = new Date();
                var TodayDate = new Date();
                InvoiceDate = new Date(Obj.InvoiceDate);
                const InviteDetailsArr = InviteDetails.filter(obj1 => obj1.Seller === Obj.Seller && obj1.Business === Obj.Business && obj1.Branch === Obj.Branch);
                if (InviteDetailsArr.length > 0) {
                  var ValidityDate = new Date();
                  InviteDetailsArr.map(ObjIn => {
                    ValidityDate = new Date(ObjIn.updatedAt);
                    ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + ObjIn.BuyerPaymentCycle));
                    InvoiceDate = new Date(InvoiceDate.setDate(InvoiceDate.getDate() + ObjIn.BuyerPaymentCycle + 1));                   
                  });
                  if (InvoiceDate.valueOf() < TodayDate.valueOf()) {
                    OverDueInvoiceArr.push(Obj);
                  }
                } 
              });
            }
            var RespectiveOverDueAmount = 0;
            if (OverDueInvoiceArr.length > 0) {
              OverDueInvoiceArr.map(Obj => {
                RespectiveOverDueAmount = parseFloat(RespectiveOverDueAmount) + parseFloat(Obj.AvailableAmount);                             
              });
            }
           
            var InvoiceAmount = 0;
            if (CustomerInvoice.length !== 0) {
              CustomerInvoice.map(Obj => {
                InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(Obj.AvailableAmount);
              })
            }
            HundiScore.UpComingAmount = InvoiceAmount;

            var InvoiceRespectiveCreditAmount = parseFloat(InvoiceAmount) - parseFloat(RespectiveCreditLimit);
            if (InvoiceRespectiveCreditAmount >= 0) {
              HundiScore.ExtraUnitizedCreditLimit = -Math.abs(InvoiceRespectiveCreditAmount);
              HundiScore.ExtraUnitizedCreditLimit = HundiScore.ExtraUnitizedCreditLimit.toFixed(2);
              HundiScore.ExtraUnitizedCreditLimit = parseFloat(HundiScore.ExtraUnitizedCreditLimit);
              HundiScore.CreditBalanceExists = true;
              HundiScore.AvailableCreditLimit = 0;
            } else {
              if (InvoiceRespectiveCreditAmount < 0) {
                HundiScore.AvailableCreditLimit = Math.abs(InvoiceRespectiveCreditAmount);
                HundiScore.AvailableCreditLimit = HundiScore.AvailableCreditLimit.toFixed(2);
                HundiScore.AvailableCreditLimit = parseFloat(HundiScore.AvailableCreditLimit);
              }
            }

            if (RespectiveOverDueAmount > 0) {
              HundiScore.OverDueAmount = RespectiveOverDueAmount;
              HundiScore.OverDueAmount = HundiScore.OverDueAmount.toFixed(2);
              HundiScore.OverDueAmount = parseFloat(HundiScore.OverDueAmount);
            } else {
              HundiScore.OverDueAmount = 0;
            }


            var NumberOfDaysOutStanding = 0;
            var OutStandingInvoice = 0;
            if (CustomerInvoice.length !== 0) {
              CustomerInvoice.map(Obj => {
                var InvoiceCreatedDate = new Date();
                var InvoiceApprovedDate = new Date(Obj.InvoiceDate);
                OutStandingInvoice = parseFloat(OutStandingInvoice) + parseFloat(Obj.AvailableAmount);
                const InviteDetailsArray = InviteDetails.filter(obj1 => obj1.Seller === Obj.Seller && obj1.Business === Obj.Business && obj1.Branch === Obj.Branch);
                if (InviteDetailsArray.length > 0) {
                  InviteDetailsArray.map(ObjIn => {
                    InvoiceApprovedDate = new Date(InvoiceApprovedDate.setDate(InvoiceApprovedDate.getDate() + ObjIn.BuyerPaymentCycle));                 
                  });
                  if (InvoiceCreatedDate === InvoiceApprovedDate) {
                    NumberOfDaysOutStanding = parseFloat(NumberOfDaysOutStanding) + parseFloat(Obj.AvailableAmount);
                  }
                }
              });
            }
            var PaymentCycle = 0;
            if (InviteDetails.length !== 0) {
              InviteDetails.map(Obj => {
                PaymentCycle = parseFloat(Obj.BuyerPaymentCycle);
              });
            }

            var DueTodayAmount = parseFloat(NumberOfDaysOutStanding);
            if (DueTodayAmount > 1 && DueTodayAmount !== Infinity) {
              HundiScore.DueTodayAmount = DueTodayAmount;
            }


            if (HundiScore.DueTodayAmount > 1) {
              HundiScore.DueTodayAmount = HundiScore.DueTodayAmount.toFixed(2);
              HundiScore.DueTodayAmount = parseFloat(HundiScore.DueTodayAmount);
            }

            if (HundiScore.UpComingAmount > 0) {
              HundiScore.UpComingAmount = HundiScore.UpComingAmount - (HundiScore.DueTodayAmount + HundiScore.OverDueAmount);
              if (HundiScore.UpComingAmount < 0) {
                HundiScore.UpComingAmount = 0;
              }
            }

            if (HundiScore.UpComingAmount > 1) {
              HundiScore.UpComingAmount = HundiScore.UpComingAmount.toFixed(2);
              HundiScore.UpComingAmount = parseFloat(HundiScore.UpComingAmount);
            }
            res.status(200).send({ Status: true, Message: "Hundi Score!.", Response: HundiScore });
          }).catch(Error => {
            res.status(400).send({ Status: false, Message: "Some Occurred Error" });
          });
        } else {
          res.status(417).send({ Status: false, Message: "Invalid Customer Details!." });
        }
      }
    });
  }
};

exports.BuyerOwnerDashboard = function (req, res) {
  var ReceivingData = req.body;
  if (!ReceivingData.Customer || ReceivingData.Customer === '') {
    res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
  } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
    res.status(400).send({ Status: false, Message: "CustomerCategory can not be empty" });
  } else {
    ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
    CustomerManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer, CustomerType: 'Owner' }, {}, {}).exec(function (err, result) {
      if (err) {
        ErrorHandling.ErrorLogCreation(req, 'Seller Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(err));
        res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
      } else {
        if (result !== null) {
          var PaymentAcknowledgementQuery = {};
          var InvoiceDisputedQuery = {};
          var InviteRequestQuery = {};

          PaymentAcknowledgementQuery = { Buyer: ReceivingData.Customer, Payment_Status: 'Disputed' };
          InvoiceDisputedQuery = { Buyer: ReceivingData.Customer, InvoiceStatus: 'Pending' };
          InviteRequestQuery = { IfSeller: 'Pending', InviteCategory: ReceivingData.CustomerCategory, Buyer: ReceivingData.Customer };
          var PaymentCount = { Buyer: ReceivingData.Customer, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false };
          var InvoiceAmount = { Buyer: ReceivingData.Customer, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
          Promise.all([
            InvoiceManagement.InvoiceSchema.find({ Buyer: ReceivingData.Customer, PaidORUnpaid: "Unpaid", InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            TemporaryManagement.CreditSchema.find({ Buyer: ReceivingData.Customer, Request_Status: "Accept", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            PaymentManagement.PaymentSchema.countDocuments(PaymentAcknowledgementQuery),
            InvoiceManagement.InvoiceSchema.countDocuments(InvoiceDisputedQuery),
            InviteManagement.InviteManagementSchema.countDocuments(InviteRequestQuery),
            BusinessAndBranchManagement.BusinessSchema.find({ Customer: ReceivingData.Customer, IsAssigned: true, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            InviteManagement.InviteManagementSchema.find({ Buyer: ReceivingData.Customer, Invite_Status: "Accept" }, {}, {}).exec(),
            NotificationModel.NotificationSchema.countDocuments({
              CustomerID: ReceivingData.Customer,
              $or: [{ Notification_Type: "BuyerRequestSend" },
              { Notification_Type: "BuyerRequestAccepted" },
              { Notification_Type: "BuyerInvoiceCreated" },
              { Notification_Type: "BuyerInvoiceDisputed" },
              { Notification_Type: "SupportAdminReply" },
              { Notification_Type: "SupportAdminClosed" },
              { Notification_Type: "BuyerPaymentAccepted" },
              { Notification_Type: "BuyerPaymentDisputed" },
              { Notification_Type: "SellerTemporaryAccepted" },
              { Notification_Type: "BuyerChangedInvite" }], ActiveStatus: true, Message_Viewed: false, IfDeleted: false
            }),
            InvoiceManagement.InvoiceSchema.countDocuments(PaymentCount),
            InvoiceManagement.InvoiceSchema.countDocuments(InvoiceAmount),
          ]).then(Response => {
            var InvoiceDetails = JSON.parse(JSON.stringify(Response[0]));
            var CustomerTemporary = JSON.parse(JSON.stringify(Response[1]));
            var PaymentAcknowledgementCount = JSON.parse(JSON.stringify(Response[2]));
            var InvoiceDisputedCount = JSON.parse(JSON.stringify(Response[3]));
            var InviteRequestCount = JSON.parse(JSON.stringify(Response[4]));
            var BusinessArr = JSON.parse(JSON.stringify(Response[5]));
            var InviteDetails = JSON.parse(JSON.stringify(Response[6]));
            var NotificationCount = JSON.parse(JSON.stringify(Response[7]));
            var PaymentCounts = JSON.parse(JSON.stringify(Response[8]));
            var InvoiceCounts = JSON.parse(JSON.stringify(Response[9]));
            var OverDueInvoiceArr = [];
            var HundiScore = {
              _id: String,
              ContactName: String,
              Mobile: String,
              File_Name: String,
              OverDueAmount: 0,
              CreditLimit: 0,
              AvailableCreditLimit: 0,
              DelayInPayment: 0,
              TemporaryCreditLimit: 0,
              ExtraUnitizedCreditLimit: 0,
              CreditBalanceExists: false,
              DueTodayAmount: 0,
              UpComingAmount: 0,
              PaymentDisputed: PaymentAcknowledgementCount,
              PendingInvoice: InvoiceDisputedCount,
              SellerRequest: InviteRequestCount,
              RequestRequest: InviteRequestCount,
              NotificationCount: NotificationCount,
              MyBusiness: false,
              InvoiceCount: InvoiceCounts,
              PaymentCount: PaymentCounts,
            };
            HundiScore._id = result._id;
            HundiScore.ContactName = result.ContactName;
            HundiScore.Mobile = result.Mobile;
            HundiScore.File_Name = result.File_Name;
            HundiScore.CustomerCategory = result.CustomerCategory;

            if (BusinessArr.length !== 0) {
              HundiScore.MyBusiness = true;
            }

            var TodayDate = new Date();
            var RespectiveCreditLimit = 0;
            if (InviteDetails.length > 0) {
              var ValidityDate = new Date();
              InviteDetails.map(ObjIn => {
                ValidityDate = new Date(ObjIn.updatedAt);
                // ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + ObjIn.BuyerPaymentCycle));
                // if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                RespectiveCreditLimit = parseFloat(RespectiveCreditLimit) + parseFloat(ObjIn.AvailableLimit);
                //  }

              });
            }

            if (CustomerTemporary.length > 0) {
              var TemporaryValidityDate = new Date();
              CustomerTemporary.map(ObjIn => {
                TemporaryValidityDate = new Date(ObjIn.updatedAt);
                TemporaryValidityDate = new Date(TemporaryValidityDate.setDate(TemporaryValidityDate.getDate() + ObjIn.ApprovedPeriod));
                if (TemporaryValidityDate.valueOf() >= TodayDate.valueOf()) {
                  RespectiveCreditLimit = parseFloat(RespectiveCreditLimit) + parseFloat(ObjIn.ApproveLimit);
                }

              });
            }

            HundiScore.CreditLimit = RespectiveCreditLimit;
            HundiScore.AvailableCreditLimit = RespectiveCreditLimit;

            var OverDueInvoiceArr = [];
            if (InvoiceDetails.length !== 0) {
              InvoiceDetails.map(Obj => {            
                var InvoiceDate = new Date();
                var TodayDate = new Date();
                InvoiceDate = new Date(Obj.InvoiceDate);
                const InviteDetailsArr = InviteDetails.filter(obj1 => obj1.Buyer === Obj.Buyer && obj1.BuyerBusiness === Obj.BuyerBusiness && obj1.BuyerBranch === Obj.BuyerBranch);
                if (InviteDetailsArr.length > 0) {
                  var ValidityDate = new Date();
                  InviteDetailsArr.map(ObjIn => {
                    ValidityDate = new Date(ObjIn.updatedAt);
                    ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + ObjIn.BuyerPaymentCycle));
                    InvoiceDate = new Date(InvoiceDate.setDate(InvoiceDate.getDate() + ObjIn.BuyerPaymentCycle + 1));                 
                  });
                  if (InvoiceDate.valueOf() < TodayDate.valueOf()) {
                    OverDueInvoiceArr.push(Obj);
                  }
                }
              });
            }

            var RespectiveOverDueAmount = 0;
            if (OverDueInvoiceArr.length > 0) {
              OverDueInvoiceArr.map(Obj => { 
                RespectiveOverDueAmount = parseFloat(RespectiveOverDueAmount) + parseFloat(Obj.AvailableAmount);             
            });
            }
            
            var InvoiceAmount = 0;
            if (InvoiceDetails.length !== 0) {
              InvoiceDetails.map(Obj => {
                InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(Obj.AvailableAmount);
              })
            }

            HundiScore.UpComingAmount = InvoiceAmount;
            var InvoiceRespectiveCreditAmount = parseFloat(InvoiceAmount) - parseFloat(RespectiveCreditLimit);
            if (InvoiceRespectiveCreditAmount >= 0) {
              HundiScore.ExtraUnitizedCreditLimit = -Math.abs(InvoiceRespectiveCreditAmount);
              HundiScore.ExtraUnitizedCreditLimit = HundiScore.ExtraUnitizedCreditLimit.toFixed(2);
              HundiScore.ExtraUnitizedCreditLimit = parseFloat(HundiScore.ExtraUnitizedCreditLimit);
              HundiScore.CreditBalanceExists = true;
              HundiScore.AvailableCreditLimit = 0;
            } else {
              if (InvoiceRespectiveCreditAmount < 0) {
                HundiScore.AvailableCreditLimit = Math.abs(InvoiceRespectiveCreditAmount);
                HundiScore.AvailableCreditLimit = HundiScore.AvailableCreditLimit.toFixed(2);
                HundiScore.AvailableCreditLimit = parseFloat(HundiScore.AvailableCreditLimit);
              }
            }

            var TotalRespectiveOverDueAmount = parseFloat(RespectiveOverDueAmount);
            if (TotalRespectiveOverDueAmount > 0) {
              HundiScore.OverDueAmount = TotalRespectiveOverDueAmount;
              HundiScore.OverDueAmount = HundiScore.OverDueAmount.toFixed(2);
              HundiScore.OverDueAmount = parseFloat(HundiScore.OverDueAmount);
            } else {
              HundiScore.OverDueAmount = 0;
            }

            var NumberOfDaysOutStanding = 0;
            var OutStandingInvoice = 0;
            if (InvoiceDetails.length !== 0) {
              InvoiceDetails.map(Obj => {
                var InvoiceCreatedDate = new Date();
                var InvoiceApprovedDate = new Date(Obj.InvoiceDate);
                OutStandingInvoice = parseFloat(OutStandingInvoice) + parseFloat(Obj.AvailableAmount);
                const InviteDetailsArray = InviteDetails.filter(obj1 => obj1.BuyerBusiness === Obj.BuyerBusiness && obj1.Buyer === Obj.Buyer && obj1.BuyerBranch === Obj.BuyerBranch);
                if (InviteDetailsArray.length > 0) {
                  InviteDetailsArray.map(ObjIn => {
                    InvoiceApprovedDate = new Date(InvoiceApprovedDate.setDate(InvoiceApprovedDate.getDate() + ObjIn.BuyerPaymentCycle));
                    if (InvoiceCreatedDate.toLocaleDateString() === InvoiceApprovedDate.toLocaleDateString()) {
                      NumberOfDaysOutStanding = parseFloat(NumberOfDaysOutStanding) + parseFloat(Obj.AvailableAmount);
                    }
                  });
                }
              });
            }
            var PaymentCycle = 0;
            if (InviteDetails.length !== 0) {
              InviteDetails.map(Obj => {
                PaymentCycle = parseFloat(Obj.BuyerPaymentCycle);
              });
            }

            var DueTodayAmount = parseFloat(NumberOfDaysOutStanding);
            if (DueTodayAmount > 1 && DueTodayAmount !== Infinity) {
              HundiScore.DueTodayAmount = DueTodayAmount;
            }

            if (HundiScore.DueTodayAmount > 1) {
              HundiScore.DueTodayAmount = HundiScore.DueTodayAmount.toFixed(2);
              HundiScore.DueTodayAmount = parseFloat(HundiScore.DueTodayAmount);
            }

            if (HundiScore.UpComingAmount > 0) {
              HundiScore.UpComingAmount = HundiScore.UpComingAmount - (HundiScore.DueTodayAmount + HundiScore.OverDueAmount);
              HundiScore.UpComingAmount = HundiScore.UpComingAmount.toFixed(2);
              HundiScore.UpComingAmount = parseFloat(HundiScore.UpComingAmount);
              if (HundiScore.UpComingAmount < 0) {
                HundiScore.UpComingAmount = 0;
              }
            }

            res.status(200).send({ Status: true, Message: "Hundi Score!.", Response: HundiScore });
          }).catch(Error => {
            res.status(400).send({ Status: false, Message: "Some Occurred Error" });
          });
        } else {
          res.status(417).send({ Status: false, Message: "Invalid Customer Details!." });
        }
      }
    });
  }
};

exports.BuyerUserDashboard = function (req, res) {
  var ReceivingData = req.body;
  if (!ReceivingData.Customer || ReceivingData.Customer === '') {
    res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
  } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
    res.status(400).send({ Status: false, Message: "CustomerCategory can not be empty" });
  } else {
    ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
    CustomerManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer, CustomerType: 'User' }, {}, {}).exec(function (err, result) {
      if (err) {
        ErrorHandling.ErrorLogCreation(req, 'Seller Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(err));
        res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
      } else {
        if (result !== null) {
          var FindBranchArray = [];
          var FindBusinessArray = [];
          if (result.BusinessAndBranches.length !== 0) {
            result.BusinessAndBranches.map(Obj => {
              FindBusinessArray.push(mongoose.Types.ObjectId(Obj.Business));
              if (Obj.Branches.length !== 0) {
                Obj.Branches.map(obj => {
                  FindBranchArray.push(mongoose.Types.ObjectId(obj));
                });
              }
            });
          }
          var PaymentAcknowledgementQuery = {};
          var InvoiceDisputedQuery = {};
          var InviteRequestQuery = {};

          PaymentAcknowledgementQuery = { BuyerBranch: { $in: FindBranchArray }, Payment_Status: "Disputed" };
          InvoiceDisputedQuery = { BuyerBranch: { $in: FindBranchArray }, InvoiceStatus: 'Pending' };
          InviteRequestQuery = { IfSeller: 'Pending', BuyerBranch: { $in: FindBranchArray } };
          var PaymentCount = { BuyerBranch: { $in: FindBranchArray }, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false };
          var InvoiceAmount = { BuyerBranch: { $in: FindBranchArray }, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
          Promise.all([
            InvoiceManagement.InvoiceSchema.find({ BuyerBranch: { $in: FindBranchArray }, PaidORUnpaid: "Unpaid", InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            TemporaryManagement.CreditSchema.find({ BuyerBranch: { $in: FindBranchArray }, Request_Status: "Accept", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            PaymentManagement.PaymentSchema.countDocuments(PaymentAcknowledgementQuery),
            InvoiceManagement.InvoiceSchema.countDocuments(InvoiceDisputedQuery),
            InviteManagement.InviteManagementSchema.countDocuments(InviteRequestQuery),
            BusinessAndBranchManagement.BusinessSchema.find({ _id: { $in: FindBusinessArray }, IsAssigned: true, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            InviteManagement.InviteManagementSchema.find({ BuyerBranch: { $in: FindBranchArray }, Invite_Status: "Accept" }, {}, {}).exec(),
            NotificationModel.NotificationSchema.countDocuments({
              CustomerID: ReceivingData.Customer,
              $or: [{ Notification_Type: "BuyerRequestSend" },
              { Notification_Type: "BuyerRequestAccepted" },
              { Notification_Type: "BuyerInvoiceCreated" },
              { Notification_Type: "BuyerInvoiceDisputed" },
              { Notification_Type: "SupportAdminReply" },
              { Notification_Type: "SupportAdminClosed" },
              { Notification_Type: "BuyerPaymentAccepted" },
              { Notification_Type: "BuyerPaymentDisputed" },
              { Notification_Type: "SellerTemporaryAccepted" },
              { Notification_Type: "BuyerChangedInvite" }], ActiveStatus: true, Message_Viewed: false, IfDeleted: false
            }),
            InvoiceManagement.InvoiceSchema.countDocuments(PaymentCount),
            InvoiceManagement.InvoiceSchema.countDocuments(InvoiceAmount),
          ]).then(Response => {
            var InvoiceDetails = JSON.parse(JSON.stringify(Response[0]));
            var CustomerTemporary = JSON.parse(JSON.stringify(Response[1]));
            var PaymentAcknowledgementCount = JSON.parse(JSON.stringify(Response[2]));
            var InvoiceDisputedCount = JSON.parse(JSON.stringify(Response[3]));
            var InviteRequestCount = JSON.parse(JSON.stringify(Response[4]));;
            var BusinessArr = JSON.parse(JSON.stringify(Response[5]));;
            var InviteDetails = JSON.parse(JSON.stringify(Response[6]));
            var NotificationCount = JSON.parse(JSON.stringify(Response[7]));
            var PaymentCounts = JSON.parse(JSON.stringify(Response[8]));
            var InvoiceCounts = JSON.parse(JSON.stringify(Response[9]));
            var OverDueInvoiceArr = [];
            var HundiScore = {
              _id: String,
              ContactName: String,
              Mobile: String,
              File_Name: String,
              OverDueAmount: 0,
              CreditLimit: 0,
              AvailableCreditLimit: 0,
              DelayInPayment: 0,
              TemporaryCreditLimit: 0,
              ExtraUnitizedCreditLimit: 0,
              CreditBalanceExists: false,
              DueTodayAmount: 0,
              UpComingAmount: 0,
              PaymentAcknowledgement: PaymentAcknowledgementCount,
              PaymentDisputed: PaymentAcknowledgementCount,
              DisputedInvoice: InvoiceDisputedCount,
              PendingInvoice: InvoiceDisputedCount,
              RequestRequest: InviteRequestCount,
              NotificationCount: NotificationCount,
              MyBusiness: false,
              InvoiceCount: InvoiceCounts,
              PaymentCount: PaymentCounts,
            };
            HundiScore._id = result._id;
            HundiScore.ContactName = result.ContactName;
            HundiScore.Mobile = result.Mobile;
            HundiScore.File_Name = result.File_Name;
            HundiScore.CustomerCategory = result.CustomerCategory;

            if (BusinessArr.length !== 0) {
              HundiScore.MyBusiness = true;
            }

            var TodayDate = new Date();
            var RespectiveCreditLimit = 0;
            if (InviteDetails.length > 0) {
              var ValidityDate = new Date();
              InviteDetails.map(ObjIn => {
                ValidityDate = new Date(ObjIn.updatedAt);
                //  ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + ObjIn.BuyerPaymentCycle));
                //  if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                RespectiveCreditLimit = parseFloat(RespectiveCreditLimit) + parseFloat(ObjIn.AvailableLimit);
                //  }

              });
            }

            if (CustomerTemporary.length > 0) {
              var TemporaryValidityDate = new Date();
              CustomerTemporary.map(ObjIn => {
                TemporaryValidityDate = new Date(ObjIn.updatedAt);
                TemporaryValidityDate = new Date(TemporaryValidityDate.setDate(TemporaryValidityDate.getDate() + ObjIn.ApprovedPeriod));
                if (TemporaryValidityDate.valueOf() >= TodayDate.valueOf()) {
                  RespectiveCreditLimit = parseFloat(RespectiveCreditLimit) + parseFloat(ObjIn.ApproveLimit);
                }

              });
            }

            HundiScore.CreditLimit = RespectiveCreditLimit;
            HundiScore.AvailableCreditLimit = RespectiveCreditLimit;

            if (InvoiceDetails.length !== 0) {
              InvoiceDetails.map(Obj => {            
                var InvoiceDate = new Date();
                var TodayDate = new Date();
                InvoiceDate = new Date(Obj.InvoiceDate);
                const InviteDetailsArr = InviteDetails.filter(obj1 => obj1.BuyerBusiness === Obj.BuyerBusiness && obj1.Buyer === Obj.Buyer && obj1.BuyerBranch === Obj.BuyerBranch);
                if (InviteDetailsArr.length > 0) {
                  InviteDetailsArr.map(ObjIn => {
                    InvoiceDate = new Date(InvoiceDate.setDate(InvoiceDate.getDate() + ObjIn.BuyerPaymentCycle + 1));                    
                  });
                  if (InvoiceDate.valueOf() < TodayDate.valueOf()) {
                    OverDueInvoiceArr.push(Obj);
                  }
                }
              });
            }

            var RespectiveOverDueAmount = 0;
            OverDueInvoiceArr.map(Obj => {
              if (Obj.Invoice.length !== 0) {
                Obj.Invoice.map(obj => {
                  RespectiveOverDueAmount = parseFloat(RespectiveOverDueAmount) + parseFloat(obj.AvailableAmount);
                });
              }
            });

            var InvoiceAmount = 0;
            if (InvoiceDetails.length !== 0) {
              InvoiceDetails.map(Obj => {
                InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(Obj.AvailableAmount);
              })
            }

            HundiScore.UpComingAmount = InvoiceAmount;
            var InvoiceRespectiveCreditAmount = parseFloat(InvoiceAmount) - parseFloat(RespectiveCreditLimit);
            if (InvoiceRespectiveCreditAmount >= 0) {
              HundiScore.ExtraUnitizedCreditLimit = -Math.abs(InvoiceRespectiveCreditAmount);
              HundiScore.ExtraUnitizedCreditLimit = HundiScore.ExtraUnitizedCreditLimit.toFixed(2);
              HundiScore.ExtraUnitizedCreditLimit = parseFloat(HundiScore.ExtraUnitizedCreditLimit);
              HundiScore.CreditBalanceExists = true;
              HundiScore.AvailableCreditLimit = 0;
            } else {
              if (InvoiceRespectiveCreditAmount < 0) {
                HundiScore.AvailableCreditLimit = Math.abs(InvoiceRespectiveCreditAmount);
                HundiScore.AvailableCreditLimit = HundiScore.AvailableCreditLimit.toFixed(2);
                HundiScore.AvailableCreditLimit = parseFloat(HundiScore.AvailableCreditLimit);
              }
            }

            var TotalRespectiveOverDueAmount = parseFloat(RespectiveOverDueAmount);
            if (TotalRespectiveOverDueAmount > 0) {
              HundiScore.OverDueAmount = TotalRespectiveOverDueAmount;
              HundiScore.OverDueAmount = HundiScore.OverDueAmount.toFixed(2);
              HundiScore.OverDueAmount = parseFloat(HundiScore.OverDueAmount);
            } else {
              HundiScore.OverDueAmount = 0;
            }

            var NumberOfDaysOutStanding = 0;
            var OutStandingInvoice = 0;
            if (InvoiceDetails.length !== 0) {
              InvoiceDetails.map(Obj => {
                var InvoiceCreatedDate = new Date();
                var InvoiceApprovedDate = new Date(Obj.InvoiceDate);
                OutStandingInvoice = parseFloat(OutStandingInvoice) + parseFloat(Obj.AvailableAmount);
                const InviteDetailsArray = InviteDetails.filter(obj1 => obj1.BuyerBusiness === Obj.BuyerBusiness && obj1.Buyer === Obj.Buyer && obj1.BuyerBranch === Obj.BuyerBranch);
                if (InviteDetailsArray.length > 0) {
                  InviteDetailsArray.map(ObjIn => {
                    InvoiceApprovedDate = new Date(InvoiceApprovedDate.setDate(InvoiceApprovedDate.getDate() + ObjIn.BuyerPaymentCycle));
                    if (InvoiceCreatedDate === InvoiceApprovedDate) {
                      NumberOfDaysOutStanding = parseFloat(NumberOfDaysOutStanding) + parseFloat(Obj.AvailableAmount);
                    }
                  });
                }
              });
            }
            var PaymentCycle = 0;
            if (InviteDetails.length !== 0) {
              InviteDetails.map(Obj => {
                PaymentCycle = parseFloat(Obj.BuyerPaymentCycle);
              });
            }

            var DueTodayAmount = parseFloat(NumberOfDaysOutStanding);
            if (DueTodayAmount > 1 && DueTodayAmount !== Infinity) {
              HundiScore.DueTodayAmount = DueTodayAmount;
            }
            if (HundiScore.DueTodayAmount > 1) {
              HundiScore.DueTodayAmount = HundiScore.DueTodayAmount.toFixed(2);
              HundiScore.DueTodayAmount = parseFloat(HundiScore.DueTodayAmount);
            }


            if (HundiScore.UpComingAmount > 0) {
              HundiScore.UpComingAmount = HundiScore.UpComingAmount - (HundiScore.DueTodayAmount + HundiScore.OverDueAmount);
              if (HundiScore.UpComingAmount < 0) {
                HundiScore.UpComingAmount = 0;
              }
            }

            if (HundiScore.UpComingAmount > 1) {
              HundiScore.UpComingAmount = HundiScore.UpComingAmount.toFixed(2);
              HundiScore.UpComingAmount = parseFloat(HundiScore.UpComingAmount);
            }

            res.status(200).send({ Status: true, Message: "Hundi Score!.", Response: HundiScore });
          }).catch(Error => {
            res.status(400).send({ Status: false, Message: "Some Occurred Error" });
          });
        } else {
          res.status(417).send({ Status: false, Message: "Invalid Customer Details!." });
        }
      }
    });
  }
};

exports.FilterSellerAndBusinessAndBranchAgainstBuyerScore = function (req, res) {
  var ReceivingData = req.body;
  if (!ReceivingData.Customer || ReceivingData.Customer === '') {
    res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
  } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
    res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
  } else {
    ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
    CustomerManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer }, {}, {}).exec(function (err, result) {
      if (err) {
        ErrorHandling.ErrorLogCreation(req, 'Seller Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(err));
        res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
      } else {
        if (result !== null) {
          var InvoiceQuery = {};
          var TemporaryActiveQuery = {};
          var InviteQuery = {};
          var TemporaryPendingQuery = {};
          var PaymentQuery = {};
          var InvoicePendingQuery = {};
          var BranchArr = [];
          if (result.CustomerType === 'Owner') {
            if (ReceivingData.Customer && ReceivingData.Business === '' && ReceivingData.Branch === '') {
              InvoiceQuery = { PaidORUnpaid: "Unpaid", Seller: ReceivingData.Customer, InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
              TemporaryActiveQuery = { Seller: ReceivingData.Customer, Request_Status: "Accept", ActiveStatus: true, IfDeleted: false };
              InviteQuery = { Seller: ReceivingData.Customer, Invite_Status: "Accept" };
              TemporaryPendingQuery = { Seller: ReceivingData.Customer, Request_Status: "Pending", ActiveStatus: true, IfDeleted: false };
              PaymentQuery = { Seller: ReceivingData.Customer, Payment_Status: "Pending" };
              InvoicePendingQuery = { Seller: ReceivingData.Customer, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
            } else if (ReceivingData.Customer && ReceivingData.Business && ReceivingData.Branch === '') {
              ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
              InvoiceQuery = { PaidORUnpaid: "Unpaid", Seller: ReceivingData.Customer, Business: ReceivingData.Business, InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
              TemporaryActiveQuery = { Seller: ReceivingData.Customer, Business: ReceivingData.Business, Request_Status: "Accept", ActiveStatus: true, IfDeleted: false };
              InviteQuery = { Seller: ReceivingData.Customer, Business: ReceivingData.Business, Invite_Status: "Accept" };
              TemporaryPendingQuery = { Seller: ReceivingData.Customer, Business: ReceivingData.Business, Request_Status: "Pending", ActiveStatus: true, IfDeleted: false };
              PaymentQuery = { Seller: ReceivingData.Customer, Business: ReceivingData.Business, Payment_Status: "Pending" };
              InvoicePendingQuery = { Seller: ReceivingData.Customer, Business: ReceivingData.Business, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
            } else if (ReceivingData.Customer && ReceivingData.Branch && ReceivingData.Business === '') {
              ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);
              InvoiceQuery = { Branch: ReceivingData.Branch, PaidORUnpaid: "Unpaid", Seller: ReceivingData.Customer, InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
              TemporaryActiveQuery = { Seller: ReceivingData.Customer, Branch: ReceivingData.Branch, Request_Status: "Accept", ActiveStatus: true, IfDeleted: false };
              InviteQuery = { Seller: ReceivingData.Customer, Branch: ReceivingData.Branch, Invite_Status: "Accept" };
              TemporaryPendingQuery = { Seller: ReceivingData.Customer, Branch: ReceivingData.Branch, Request_Status: "Pending", ActiveStatus: true, IfDeleted: false };
              PaymentQuery = { Seller: ReceivingData.Customer, Branch: ReceivingData.Branch, Payment_Status: "Pending" };
              InvoicePendingQuery = { Branch: ReceivingData.Branch, Seller: ReceivingData.Customer, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
            } else {
              ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
              ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);
              InvoiceQuery = { Branch: ReceivingData.Branch, PaidORUnpaid: "Unpaid", Seller: ReceivingData.Customer, Business: ReceivingData.Business, InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
              TemporaryActiveQuery = { Seller: ReceivingData.Customer, Branch: ReceivingData.Branch, Business: ReceivingData.Business, Request_Status: "Accept", ActiveStatus: true, IfDeleted: false };
              InviteQuery = { Seller: ReceivingData.Customer, Business: ReceivingData.Business, Branch: ReceivingData.Branch, Invite_Status: "Accept" };
              TemporaryPendingQuery = { Seller: ReceivingData.Customer, Business: ReceivingData.Business, Branch: ReceivingData.Branch, Request_Status: "Pending", ActiveStatus: true, IfDeleted: false };
              PaymentQuery = { Seller: ReceivingData.Customer, Business: ReceivingData.Business, Branch: ReceivingData.Branch, Payment_Status: "Pending" };
              InvoicePendingQuery = { Branch: ReceivingData.Branch, Seller: ReceivingData.Customer, Business: ReceivingData.Business, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
            }
          } else if (result.CustomerType === 'User') {
            if (result.BusinessAndBranches.length > 0) {
              result.BusinessAndBranches.map(Obj => {
                  if (Obj.Branches.length > 0) {
                    Obj.Branches.map(obj => {
                      BranchArr.push(mongoose.Types.ObjectId(obj));
                    });
                  }
              });
            }
            
            if (ReceivingData.Customer && ReceivingData.Business === '' && ReceivingData.Branch === '') {
              InvoiceQuery = { PaidORUnpaid: "Unpaid", Branch: {$in: BranchArr}, InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
              TemporaryActiveQuery = { Branch: {$in: BranchArr}, Request_Status: "Accept", ActiveStatus: true, IfDeleted: false };
              InviteQuery = { Branch: {$in: BranchArr}, Invite_Status: "Accept" };
              TemporaryPendingQuery = { Branch: {$in: BranchArr}, Request_Status: "Pending", ActiveStatus: true, IfDeleted: false };
              PaymentQuery = { Branch: {$in: BranchArr}, Payment_Status: "Pending" };
              InvoicePendingQuery = { Branch: {$in: BranchArr}, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
            } else if (ReceivingData.Customer && ReceivingData.Business && ReceivingData.Branch === '') {
              ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
              InvoiceQuery = { PaidORUnpaid: "Unpaid", Branch: {$in: BranchArr}, Business: ReceivingData.Business, InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
              TemporaryActiveQuery = { Branch: {$in: BranchArr}, Business: ReceivingData.Business, Request_Status: "Accept", ActiveStatus: true, IfDeleted: false };
              InviteQuery = { Branch: {$in: BranchArr}, Business: ReceivingData.Business, Invite_Status: "Accept" };
              TemporaryPendingQuery = { Branch: {$in: BranchArr}, Business: ReceivingData.Business, Request_Status: "Pending", ActiveStatus: true, IfDeleted: false };
              PaymentQuery = { Branch: {$in: BranchArr}, Business: ReceivingData.Business, Payment_Status: "Pending" };
              InvoicePendingQuery = { Branch: {$in: BranchArr}, Business: ReceivingData.Business, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
            } else if (ReceivingData.Customer && ReceivingData.Branch && ReceivingData.Business === '') {
              ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);
              BranchArr = [];
              BranchArr.push(mongoose.Types.ObjectId(ReceivingData.Branch));
              InvoiceQuery = { Branch: {$in: BranchArr}, PaidORUnpaid: "Unpaid", InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
              TemporaryActiveQuery = { Branch: {$in: BranchArr}, Branch: ReceivingData.Branch, Request_Status: "Accept", ActiveStatus: true, IfDeleted: false };
              InviteQuery = { Branch: {$in: BranchArr}, Branch: ReceivingData.Branch, Invite_Status: "Accept" };
              TemporaryPendingQuery = { Branch: {$in: BranchArr}, Branch: ReceivingData.Branch, Request_Status: "Pending", ActiveStatus: true, IfDeleted: false };
              PaymentQuery = { Branch: {$in: BranchArr}, Branch: ReceivingData.Branch, Payment_Status: "Pending" };
              InvoicePendingQuery = {Branch: {$in: BranchArr},  InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
            } else {
              ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
              ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);
              BranchArr = [];
              BranchArr.push(mongoose.Types.ObjectId(ReceivingData.Branch));
              InvoiceQuery = { Branch: {$in: BranchArr}, PaidORUnpaid: "Unpaid",  Business: ReceivingData.Business, InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
              TemporaryActiveQuery = { Branch: {$in: BranchArr}, Business: ReceivingData.Business, Request_Status: "Accept", ActiveStatus: true, IfDeleted: false };
              InviteQuery = {  Business: ReceivingData.Business, Branch: {$in: BranchArr}, Invite_Status: "Accept" };
              TemporaryPendingQuery = {  Business: ReceivingData.Business, Branch: {$in: BranchArr}, Request_Status: "Pending", ActiveStatus: true, IfDeleted: false };
              PaymentQuery = {  Business: ReceivingData.Business, Branch: {$in: BranchArr}, Payment_Status: "Pending" };
              InvoicePendingQuery = { Branch: {$in: BranchArr}, Business: ReceivingData.Business, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
            }
          }      
      





          Promise.all([
            InvoiceManagement.InvoiceSchema.find(InvoiceQuery, {}, {}).exec(),
            TemporaryManagement.CreditSchema.find(TemporaryActiveQuery, {}, {}).exec(),
            InviteManagement.InviteManagementSchema.find(InviteQuery, {}, {}).exec(),
            TemporaryManagement.CreditSchema.find(TemporaryPendingQuery, {}, {}).exec(),
            PaymentManagement.PaymentSchema.find(PaymentQuery, {}, {}).exec(),
            InvoiceManagement.InvoiceSchema.find(InvoicePendingQuery, {}, {}).exec(),
          ]).then(Response => {
            var BuyerInvoice = JSON.parse(JSON.stringify(Response[0]));
            var TemporaryActiveDetails = JSON.parse(JSON.stringify(Response[1]));
            var InviteDetails = JSON.parse(JSON.stringify(Response[2]));
            var TemporaryPendingDetails = JSON.parse(JSON.stringify(Response[3]));
            var BuyerPendingPayment = JSON.parse(JSON.stringify(Response[4]));
            var BuyerPendingInvoice = JSON.parse(JSON.stringify(Response[5]));
            var BusinessArray = [];
            var BranchArray = [];
            var SellerBusinessArray = [];
            var BuyerId = [];
            var SellerId = [];
            var BusinessId = [];
            var BranchId = [];
            if (InviteDetails.length > 0) {
              InviteDetails.map(Obj => {
                BuyerId.push(mongoose.Types.ObjectId(Obj.Buyer));
                BusinessId.push(mongoose.Types.ObjectId(Obj.BuyerBusiness));
                BranchId.push(mongoose.Types.ObjectId(Obj.BuyerBranch));
                SellerId.push(mongoose.Types.ObjectId(Obj.Seller));
              });
            }

            const findRequiredData = new Promise((resolve, reject) => {
              Promise.all([
                BusinessAndBranchManagement.BusinessSchema.find({ _id: { $in: BusinessId } }, {}, {}).exec(),
                BusinessAndBranchManagement.BranchSchema.find({ _id: { $in: BranchId } }, {}, {}).exec(),
                BusinessAndBranchManagement.BusinessSchema.find({ Customer: { $in: SellerId } }, {}, {}).exec(),
                CustomerManagement.CustomerSchema.find({ _id: { $in: BuyerId }, $or: [{ CustomerCategory: "Buyer" }, { CustomerCategory: 'BothBuyerAndSeller' }] }, {}, {}).exec()
              ]).then((responseNew) => {
                BusinessArray = JSON.parse(JSON.stringify(responseNew[0]));
                BranchArray = JSON.parse(JSON.stringify(responseNew[1]));
                SellerBusinessArray = JSON.parse(JSON.stringify(responseNew[2]));
                var ResponseRes = JSON.parse(JSON.stringify(responseNew[3]));
                resolve(ResponseRes);
              }).catch(errorNew => {
                reject(errorNew);
              });
            });

            const LoadMainFun = () => {
              if (BuyerId.length !== 0 && SellerId.length !== 0) {
                findRequiredData.then(responseNew => {
                  var HundiScoreArr = [];
                  var ResponseRes = responseNew;
                  ResponseRes.map(ObjM => {
                    var HundiScore = {
                      _id: String,
                      ContactName: String,
                      Mobile: String,
                      CustomerCategory: String,
                      Business: [],
                      OverDueAmount: 0,
                      HundiScoreRelatedOverDuePoint: 0,
                      CreditUnitizedPoint: 0,
                      TemporaryCreditPoint: 0,
                      DelayPaymentPoint: 0,
                      BuyerPaymentCycle: 0,
                      CreditLimit: 0,
                      InvoiceAmount: 0,
                      ExtraUnitizedCreditLimit: 0,
                      CreditBalanceExists: false,
                      AvailableCreditLimit: 0,
                      PendingInvoiceCount: 0,
                      OverDueInvoiceCount: 0,
                      DueTodayAmount: 0,
                      OutStandingPayments: 0,
                      UpComingAmount: 0,
                      HundiScore: Number,
                      BusinessVolumeIndicator: String,
                      HundiScoreStatus: ''
                    };
                    HundiScore._id = ObjM._id;
                    HundiScore.ContactName = ObjM.ContactName;
                    HundiScore.Mobile = ObjM.Mobile;
                    HundiScore.CustomerCategory = ObjM.CustomerCategory;

                    var TodayDate1 = new Date();
                    var RespectiveCreditLimit1 = 0;
                    if (ReceivingData.Customer && ReceivingData.Business === '' && ReceivingData.Branch === '') {
                      if (InviteDetails.length > 0) {
                        const InviteDetailsArray1 = InviteDetails.filter(obj1 => obj1.Buyer === ObjM._id);
                        if (InviteDetailsArray1.length > 0) {
                          var ValidityDate = new Date();
                          InviteDetailsArray1.map(ObjIn => {
                            HundiScore.BuyerPaymentCycle = parseFloat(ObjIn.BuyerPaymentCycle);
                            ValidityDate = new Date(ObjIn.updatedAt);
                            //  ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + ObjIn.BuyerPaymentCycle));
                            //  if (ValidityDate.valueOf() >= TodayDate1.valueOf()) {
                            RespectiveCreditLimit1 = parseFloat(RespectiveCreditLimit1) + parseFloat(ObjIn.AvailableLimit);
                            //   }
                          });
                        }
                      }
                      if (TemporaryActiveDetails.length > 0) {
                        const TemporaryActiveDetailsArray1 = TemporaryActiveDetails.filter(obj1 => obj1.Buyer === ObjM._id);
                        if (TemporaryActiveDetailsArray1.length > 0) {
                          var TemporaryValidityDate = new Date();
                          TemporaryActiveDetailsArray1.map(ObjIn => {
                            TemporaryValidityDate = new Date(ObjIn.updatedAt);
                            TemporaryValidityDate = new Date(TemporaryValidityDate.setDate(TemporaryValidityDate.getDate() + ObjIn.ApprovedPeriod));
                            if (TemporaryValidityDate.valueOf() >= TodayDate1.valueOf()) {
                              RespectiveCreditLimit1 = parseFloat(RespectiveCreditLimit1) + parseFloat(ObjIn.ApproveLimit);
                            }
                          });
                        }
                      }
                    } else if (ReceivingData.Customer && ReceivingData.Business && ReceivingData.Branch === '') {
                      if (BusinessArray.length > 0) {
                        BusinessArray.map(ObjB => {
                          const InviteDetailsArray1 = InviteDetails.filter(obj1 => obj1.BuyerBusiness === ObjB._id);
                          if (InviteDetailsArray1.length > 0) {
                            var ValidityDate = new Date();
                            InviteDetailsArray1.map(ObjIn => {
                              HundiScore.BuyerPaymentCycle = parseFloat(ObjIn.BuyerPaymentCycle);
                              //  ValidityDate = new Date(ObjIn.updatedAt);
                              //  ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + ObjIn.BuyerPaymentCycle));
                              // if (ValidityDate.valueOf() >= TodayDate1.valueOf()) {
                              RespectiveCreditLimit1 = parseFloat(RespectiveCreditLimit1) + parseFloat(ObjIn.AvailableLimit);
                              // }
                            });
                          }
                        });

                        const TemporaryActiveDetailsArray1 = TemporaryActiveDetails.filter(obj1 => obj1.BuyerBusiness === ObjB._id);
                        if (TemporaryActiveDetailsArray1.length > 0) {
                          var TemporaryValidityDate = new Date();
                          TemporaryActiveDetailsArray1.map(ObjIn => {
                            TemporaryValidityDate = new Date(ObjIn.updatedAt);
                            TemporaryValidityDate = new Date(TemporaryValidityDate.setDate(TemporaryValidityDate.getDate() + ObjIn.ApprovedPeriod));
                            if (TemporaryValidityDate.valueOf() >= TodayDate1.valueOf()) {
                              RespectiveCreditLimit1 = parseFloat(RespectiveCreditLimit1) + parseFloat(ObjIn.ApproveLimit);
                            }
                          });
                        }
                      }
                    } else if (ReceivingData.Customer && ReceivingData.Branch && ReceivingData.Business === '') {
                      if (BranchArray.length > 0) {
                        BranchArray.map(ObjB => {
                          const InviteDetailsArray1 = InviteDetails.filter(obj1 => obj1.BuyerBranch === ObjB._id);
                          if (InviteDetailsArray1.length > 0) {
                            var ValidityDate = new Date();
                            InviteDetailsArray1.map(ObjIn => {
                              HundiScore.BuyerPaymentCycle = parseFloat(ObjIn.BuyerPaymentCycle);
                              // ValidityDate = new Date(ObjIn.updatedAt);
                              //   ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + ObjIn.BuyerPaymentCycle));
                              //   if (ValidityDate.valueOf() >= TodayDate1.valueOf()) {
                              RespectiveCreditLimit1 = parseFloat(RespectiveCreditLimit1) + parseFloat(ObjIn.AvailableLimit);
                              //  }
                            });
                          }
                        });

                        const TemporaryActiveDetailsArray1 = TemporaryActiveDetails.filter(obj1 => obj1.BuyerBranch === ObjB._id);
                        if (TemporaryActiveDetailsArray1.length > 0) {
                          var TemporaryValidityDate = new Date();
                          TemporaryActiveDetailsArray1.map(ObjIn => {
                            TemporaryValidityDate = new Date(ObjIn.updatedAt);
                            TemporaryValidityDate = new Date(TemporaryValidityDate.setDate(TemporaryValidityDate.getDate() + ObjIn.ApprovedPeriod));
                            if (TemporaryValidityDate.valueOf() >= TodayDate1.valueOf()) {
                              RespectiveCreditLimit1 = parseFloat(RespectiveCreditLimit1) + parseFloat(ObjIn.ApproveLimit);
                            }
                          });
                        }
                      }
                    } else {
                      if (BranchArray.length > 0) {
                        BranchArray.map(ObjB => {
                          const InviteDetailsArray1 = InviteDetails.filter(obj1 => obj1.BuyerBranch === ObjB._id);
                          if (InviteDetailsArray1.length > 0) {
                            var ValidityDate = new Date();
                            InviteDetailsArray1.map(ObjIn => {
                              HundiScore.BuyerPaymentCycle = parseFloat(ObjIn.BuyerPaymentCycle);
                              //  ValidityDate = new Date(ObjIn.updatedAt);
                              //    ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + ObjIn.BuyerPaymentCycle));
                              //  if (ValidityDate.valueOf() >= TodayDate1.valueOf()) {
                              RespectiveCreditLimit1 = parseFloat(RespectiveCreditLimit1) + parseFloat(ObjIn.AvailableLimit);
                              //  }
                            });
                          }
                        });

                        const TemporaryActiveDetailsArray1 = TemporaryActiveDetails.filter(obj1 => obj1.BuyerBranch === ObjB._id);
                        if (TemporaryActiveDetailsArray1.length > 0) {
                          var TemporaryValidityDate = new Date();
                          TemporaryActiveDetailsArray1.map(ObjIn => {
                            TemporaryValidityDate = new Date(ObjIn.updatedAt);
                            TemporaryValidityDate = new Date(TemporaryValidityDate.setDate(TemporaryValidityDate.getDate() + ObjIn.ApprovedPeriod));
                            if (TemporaryValidityDate.valueOf() >= TodayDate1.valueOf()) {
                              RespectiveCreditLimit1 = parseFloat(RespectiveCreditLimit1) + parseFloat(ObjIn.ApproveLimit);
                            }
                          });
                        }
                      }
                    }

                    HundiScore.CreditLimit = RespectiveCreditLimit1;
                    HundiScore.CreditLimit = HundiScore.CreditLimit.toFixed(2);
                    HundiScore.CreditLimit = parseFloat(HundiScore.CreditLimit);
                    HundiScore.AvailableCreditLimit = RespectiveCreditLimit1;
                    HundiScore.AvailableCreditLimit = HundiScore.AvailableCreditLimit.toFixed(2);
                    HundiScore.AvailableCreditLimit = parseFloat(HundiScore.AvailableCreditLimit);
                    var OverDueInvoiceArr = [];
                    if (BuyerInvoice.length !== 0) {
                      const BuyerInvoiceArray = BuyerInvoice.filter(obj1 => obj1.Buyer === ObjM._id);
                      if (BuyerInvoiceArray.length > 0) {
                        BuyerInvoiceArray.map(Obj => {
                          var EmptyInvoicesAndInvite = {
                            Invoice: [],
                            Invite: []
                          };
                          var InvoiceDate = new Date();
                          var TodayDate = new Date();
                          InvoiceDate = new Date(Obj.InvoiceDate);
                          const InviteDetailsArr = InviteDetails.filter(obj1 => obj1.BuyerBranch === Obj.BuyerBranch && obj1.BuyerBusiness === Obj.BuyerBusiness && obj1.Buyer === ObjM._id);
                          if (InviteDetailsArr.length > 0) {
                            var ValidityDate = new Date();
                            InviteDetailsArr.map(ObjIn => {
                              ValidityDate = new Date(ObjIn.updatedAt);
                              ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + ObjIn.BuyerPaymentCycle));
                              InvoiceDate = new Date(InvoiceDate.setDate(InvoiceDate.getDate() + ObjIn.BuyerPaymentCycle + 1));
                              EmptyInvoicesAndInvite.Invite.push(ObjIn);
                              if (InvoiceDate.valueOf() < TodayDate.valueOf()) {
                                EmptyInvoicesAndInvite.Invoice.push(Obj);
                              }
                            });
                          }

                          OverDueInvoiceArr.push(EmptyInvoicesAndInvite);
                        });
                      }
                    }
                    var RespectiveOverDueAmount = 0;
                    var RespectiveCreditLimit = 0;
                    var OverDueInvoiceCount = 0;
                    OverDueInvoiceArr.map(Obj => {
                      OverDueInvoiceCount = parseFloat(OverDueInvoiceCount) + parseFloat(Obj.Invoice.length);
                      if (Obj.Invoice.length !== 0) {
                        Obj.Invoice.map(obj => {
                          RespectiveOverDueAmount = parseFloat(RespectiveOverDueAmount) + parseFloat(obj.AvailableAmount);
                        });
                      }

                      if (Obj.Invite.length !== 0) {
                        Obj.Invite.map(obj => {
                          RespectiveCreditLimit = parseFloat(RespectiveCreditLimit) + parseFloat(obj.AvailableLimit);
                        });
                      }
                      var RespectiveOverDueAndCreditAmount = 0;
                      RespectiveOverDueAndCreditAmount = parseFloat(RespectiveOverDueAmount) / parseFloat(RespectiveCreditLimit1);
                      if (RespectiveOverDueAndCreditAmount > 1 && RespectiveOverDueAndCreditAmount !== Infinity && !isNaN(RespectiveOverDueAndCreditAmount)) {
                        HundiScore.HundiScoreRelatedOverDuePoint = 40;
                      } else {
                        if (!isNaN(RespectiveOverDueAndCreditAmount) && RespectiveOverDueAndCreditAmount !== Infinity) {
                          HundiScore.HundiScoreRelatedOverDuePoint = parseFloat(30) * parseFloat(RespectiveOverDueAndCreditAmount);
                        }

                      }
                    });
                    HundiScore.OverDueInvoiceCount = OverDueInvoiceCount;
                    var InvoiceAmount = 0;
                    if (BuyerInvoice.length !== 0) {
                      const BuyerInvoiceArr = BuyerInvoice.filter(obj1 => obj1.Buyer === ObjM._id);
                      if (BuyerInvoiceArr.length > 0) {
                        BuyerInvoiceArr.map(Obj => {
                          InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(Obj.AvailableAmount);
                        });
                      }
                    }
                    HundiScore.InvoiceAmount = InvoiceAmount;
                    HundiScore.UpComingAmount = InvoiceAmount;
                    var InvoiceRespectiveCreditAmount = parseFloat(InvoiceAmount) - parseFloat(RespectiveCreditLimit1);
                    if (InvoiceRespectiveCreditAmount >= 0) {
                      HundiScore.ExtraUnitizedCreditLimit = -Math.abs(InvoiceRespectiveCreditAmount);
                      HundiScore.ExtraUnitizedCreditLimit = HundiScore.ExtraUnitizedCreditLimit.toFixed(2);
                      HundiScore.ExtraUnitizedCreditLimit = parseFloat(HundiScore.ExtraUnitizedCreditLimit);
                      HundiScore.CreditBalanceExists = true;
                      HundiScore.AvailableCreditLimit = 0;
                    } else {
                      if (InvoiceRespectiveCreditAmount < 0) {
                        HundiScore.AvailableCreditLimit = Math.abs(InvoiceRespectiveCreditAmount);
                        HundiScore.AvailableCreditLimit = HundiScore.AvailableCreditLimit.toFixed(2);
                        HundiScore.AvailableCreditLimit = parseFloat(HundiScore.AvailableCreditLimit)
                      }
                    }

                    var TotalRespectiveOverDueAmount = parseFloat(RespectiveOverDueAmount);
                    if (TotalRespectiveOverDueAmount > 0) {
                      HundiScore.OverDueAmount = TotalRespectiveOverDueAmount;
                      HundiScore.OverDueAmount = HundiScore.OverDueAmount.toFixed(2);
                      HundiScore.OverDueAmount = parseFloat(HundiScore.OverDueAmount);
                    } else {
                      HundiScore.OverDueAmount = 0;
                    }

                    var NumberOfDaysOutStanding = 0;
                    var DueTodayAmount = 0;
                    var OutStandingInvoice = 0;
                    if (BuyerInvoice.length !== 0) {
                      const BuyerInvoiceArray = BuyerInvoice.filter(obj1 => obj1.Buyer === ObjM._id);
                      if (BuyerInvoiceArray.length > 0) {
                        BuyerInvoiceArray.map(Obj => {
                          var InvoiceCreatedDate = new Date();
                          var InvoiceApprovedDate = new Date(Obj.InvoiceDate);
                          OutStandingInvoice = parseFloat(OutStandingInvoice) + parseFloat(Obj.AvailableAmount);
                          const InviteDetailsArray = InviteDetails.filter(obj1 => obj1.BuyerBranch === Obj.BuyerBranch);
                          if (InviteDetailsArray.length > 0) {
                            InviteDetailsArray.map(ObjIn => {
                              InvoiceApprovedDate = new Date(InvoiceApprovedDate.setDate(InvoiceApprovedDate.getDate() + ObjIn.BuyerPaymentCycle));
                              var InvoiceLocalCreatedDate = InvoiceCreatedDate.toLocaleDateString();
                              var InvoiceLocalApprovedDate = InvoiceApprovedDate.toLocaleDateString();
                              if (InvoiceLocalCreatedDate === InvoiceLocalApprovedDate) {
                                NumberOfDaysOutStanding = parseFloat(NumberOfDaysOutStanding) + parseFloat(Obj.AvailableAmount);
                                DueTodayAmount = parseFloat(DueTodayAmount) + parseFloat(Obj.AvailableAmount);
                              }
                            });
                          }
                        });
                      }
                    }
                    var TotalCreditLimit = 0;
                    var PaymentCycle = 0;
                    if (InviteDetails.length !== 0) {
                      const InviteDetailsArray = InviteDetails.filter(obj1 => obj1.Buyer === ObjM._id);
                      if (InviteDetailsArray.length > 0) {
                        InviteDetailsArray.map(Obj => {
                          TotalCreditLimit = parseFloat(TotalCreditLimit) + parseFloat(Obj.AvailableLimit);
                          PaymentCycle = parseFloat(Obj.BuyerPaymentCycle);
                        });
                      }
                    }

                    var DueTodayPayAmount = parseFloat(DueTodayAmount);
                    if (DueTodayPayAmount > 1 && DueTodayPayAmount !== Infinity) {
                      HundiScore.DueTodayAmount = DueTodayPayAmount.toFixed(2);
                      HundiScore.DueTodayAmount = parseFloat(DueTodayPayAmount);
                    }

                    var TotalCreditUnitized = parseFloat(OutStandingInvoice) / parseFloat(TotalCreditLimit);
                    if (TotalCreditUnitized > 0.5) {
                      TotalCreditUnitized = parseFloat(1) - parseFloat(TotalCreditUnitized);
                      TotalCreditUnitized = parseFloat(0.5) - parseFloat(TotalCreditUnitized);
                    }

                    if (TotalCreditUnitized > 1) {
                      HundiScore.CreditUnitizedPoint = 10;
                    } else {
                      HundiScore.CreditUnitizedPoint = parseFloat(10) * parseFloat(TotalCreditUnitized);
                      HundiScore.CreditUnitizedPoint = HundiScore.CreditUnitizedPoint.toFixed(2);
                      HundiScore.CreditUnitizedPoint = parseFloat(HundiScore.CreditUnitizedPoint);
                    }

                    var DelayPaymentAmount = parseFloat(NumberOfDaysOutStanding) / parseFloat(PaymentCycle);
                    if (DelayPaymentAmount > 1) {
                      HundiScore.DelayPaymentPoint = 30;
                    } else {
                      HundiScore.DelayPaymentPoint = parseFloat(30) * parseFloat(DelayPaymentAmount);
                      HundiScore.DelayPaymentPoint = HundiScore.DelayPaymentPoint.toFixed(2);
                      HundiScore.DelayPaymentPoint = parseFloat(HundiScore.DelayPaymentPoint);
                    }



                    var TemporaryActiveAmount = 0;
                    if (TemporaryActiveDetails.length > 0) {
                      const TemporaryActiveDetailsArray = TemporaryActiveDetails.filter(obj1 => obj1.Buyer === ObjM._id);
                      if (TemporaryActiveDetailsArray.length > 0) {
                        TemporaryActiveDetailsArray.map(Obj => {
                          TemporaryActiveAmount = parseFloat(TemporaryActiveAmount) + parseFloat(Obj.ApproveLimit);
                        });
                      }
                    }

                    var TemporaryPendingAmount = 0;
                    if (TemporaryPendingDetails.length > 0) {
                      const TemporaryPendingDetailsArray = TemporaryPendingDetails.filter(obj1 => obj1.Buyer === ObjM._id);
                      TemporaryPendingDetailsArray.map(Obj => {
                        TemporaryPendingAmount = parseFloat(TemporaryPendingAmount) + parseFloat(Obj.RequestLimit);
                      });
                    }

                    var TotalTemporaryAmount = parseFloat(TemporaryActiveAmount) / parseFloat(TemporaryPendingAmount);
                    if (isNaN(TotalTemporaryAmount)) {
                      TotalTemporaryAmount = 0;
                    }
                    if (TotalTemporaryAmount > 1) {
                      HundiScore.TemporaryCreditPoint = 20;
                    } else {
                      HundiScore.TemporaryCreditPoint = parseFloat(20) * parseFloat(TotalTemporaryAmount);
                      HundiScore.TemporaryCreditPoint = HundiScore.TemporaryCreditPoint.toFixed(2);
                      HundiScore.TemporaryCreditPoint = parseFloat(HundiScore.TemporaryCreditPoint);
                    }

                    var BuyerOutstandingPayment = 0;
                    const BuyerPendingPaymentArr = BuyerInvoice.filter(obj => JSON.parse(JSON.stringify(obj.Buyer)) === JSON.parse(JSON.stringify(ObjM._id)));
                    if (BuyerPendingPaymentArr.length !== 0) {
                      BuyerPendingPaymentArr.map(Obj => {
                        BuyerOutstandingPayment = parseFloat(BuyerOutstandingPayment) + (Obj.AvailableAmount);
                      });
                    }

                    if (HundiScore.DueTodayAmount > 1) {
                      HundiScore.DueTodayAmount = HundiScore.DueTodayAmount.toFixed(2);
                      HundiScore.DueTodayAmount = parseFloat(HundiScore.DueTodayAmount);
                    }

                    if (BuyerOutstandingPayment > 0) {
                      HundiScore.OutStandingPayments = BuyerOutstandingPayment;
                      HundiScore.OutStandingPayments = HundiScore.OutStandingPayments.toFixed(2);
                      HundiScore.OutStandingPayments = parseFloat(HundiScore.OutStandingPayments);
                    }

                    if (HundiScore.UpComingAmount > 1) {
                      HundiScore.UpComingAmount = HundiScore.UpComingAmount - (HundiScore.DueTodayAmount + HundiScore.OverDueAmount);
                      HundiScore.UpComingAmount = HundiScore.UpComingAmount.toFixed(2);
                      HundiScore.UpComingAmount = parseFloat(HundiScore.UpComingAmount);
                      if (HundiScore.UpComingAmount < 0) {
                        HundiScore.UpComingAmount = 0;
                      }
                    }

                    var PendingInvoiceAmount = 0;
                    const CustomerPendingInvoiceArr = BuyerPendingInvoice.filter(obj => JSON.parse(JSON.stringify(obj.Buyer)) === JSON.parse(JSON.stringify(ObjM._id)));
                    if (CustomerPendingInvoiceArr.length !== 0) {
                      HundiScore.PendingInvoiceCount = CustomerPendingInvoiceArr.length;
                      CustomerPendingInvoiceArr.map(Obj => {
                        PendingInvoiceAmount = parseFloat(PendingInvoiceAmount) + parseFloat(Obj.AvailableAmount);
                      });
                    }


                    const BusinessArrArr = BusinessArray.filter(obj => JSON.parse(JSON.stringify(obj.Customer)) === JSON.parse(JSON.stringify(ObjM._id)));
                    if (BusinessArrArr.length !== 0) {
                      HundiScore.Business = BusinessArrArr;
                      HundiScore.Business.map(ObjBus => {
                        const BusinessOfBranchArr = BranchArray.filter(obj => JSON.parse(JSON.stringify(obj.Business)) === JSON.parse(JSON.stringify(ObjBus._id)));
                        ObjBus.Branches = BusinessOfBranchArr;
                        return ObjBus;
                      });
                    }

                    var BusinessVolume = 0;
                    var AllBuyerCreditLimits = 0;
                    var TotalInvoiceAmount = 0;
                    var BusinessVolumePercentage = 0;
                    if (SellerBusinessArray.length > 0) {
                      SellerBusinessArray.map(ObjB => {
                        AllBuyerCreditLimits = parseFloat(AllBuyerCreditLimits) + parseFloat(ObjB.AvailableCreditLimit);
                      });
                    }
                    const BuyerInvoiceArrB = BuyerInvoice.filter(obj => JSON.parse(JSON.stringify(obj.Buyer)) === JSON.parse(JSON.stringify(ObjM._id)));
                    if (BuyerInvoiceArrB.length !== 0) {
                      BuyerInvoiceArrB.map(ObjB => {
                        if (ObjB.PaidORUnpaid === 'Paid') {
                          TotalInvoiceAmount = parseFloat(TotalInvoiceAmount) + parseFloat(ObjB.InvoiceAmount);
                        } else if (ObjB.PaidORUnpaid === 'Unpaid') {
                          TotalInvoiceAmount = parseFloat(TotalInvoiceAmount) + parseFloat(ObjB.AvailableAmount);
                        }
                      });
                    }

                    BusinessVolume = parseFloat(HundiScore.OverDueAmount) + parseFloat(TotalInvoiceAmount);

                    BusinessVolumePercentage = parseFloat(BusinessVolume) / parseFloat(AllBuyerCreditLimits) * parseFloat(100);

                    if (BusinessVolumePercentage >= 45) {
                      HundiScore.BusinessVolumeIndicator = 'Low';
                    } else if (BusinessVolumePercentage > 45 && BusinessVolumePercentage >= 90) {
                      HundiScore.BusinessVolumeIndicator = 'Medium';
                    } else if (BusinessVolumePercentage > 90) {
                      HundiScore.BusinessVolumeIndicator = 'High';
                    }

                    if (BusinessVolumePercentage < 45) {
                      HundiScore.HundiScoreStatus = 'Bad_Hundi_Score';
                    } else if (BusinessVolumePercentage >= 45) {
                      HundiScore.HundiScoreStatus = 'Average_Hundi_Score';
                    } else if (BusinessVolumePercentage >= 90) {
                      HundiScore.HundiScoreStatus = 'Good_Hundi_Score';
                    } else if (BusinessVolumePercentage < 90) {
                      HundiScore.HundiScoreStatus = 'High_Hundi_Score';
                    }
                    var HundiScoreCount = 0;
                    HundiScoreCount = parseFloat(HundiScore.HundiScoreRelatedOverDuePoint) / parseFloat(HundiScore.CreditUnitizedPoint) / parseFloat(HundiScore.TemporaryCreditPoint) / parseFloat(HundiScore.DelayPaymentPoint) * parseFloat(100);
                    HundiScore.HundiScore = HundiScoreCount.toFixed(2);
                    HundiScore.HundiScore = parseFloat(HundiScore.HundiScore);
                    if (isNaN(HundiScore.HundiScore) || HundiScore.HundiScore === Infinity) {
                      HundiScore.HundiScore = 0;
                    }
                    HundiScoreArr.push(HundiScore);
                  });
                  res.status(200).send({ Status: true, Message: "Hundi Score!.", Response: HundiScoreArr });      
                }).catch(errorNew => {
                  res.status(417).send({ Status: false, Message: "Some Occurred Error!.", Error: errorNew });
                });
              } else {
                res.status(200).send({ Status: true, Message: "Hundi Score", Response: [] });
              }
            };

            LoadMainFun();
          }).catch(ErrorRes => {
            res.status(417).send({ Status: false, Message: "Some Occurred Error!.", Error: ErrorRes });
          });
        } else {
          res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
        }
      }
    });
  }
};

exports.FilterBuyerAndBusinessAndBranchAgainstSellerScore = function (req, res) {
  var ReceivingData = req.body;

  if (!ReceivingData.Customer || ReceivingData.Customer === '') {
    res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
  } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
    res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
  } else {
    ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
    CustomerManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer }, {}, {}).exec(function (err, result) {
      if (err) {
        ErrorHandling.ErrorLogCreation(req, 'Seller Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(err));
        res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
      } else {
        if (result !== null) {
          if (result.CustomerType === 'User') {
            ReceivingData.Customer = mongoose.Types.ObjectId(result.Owner)
          }
          var InvoiceQuery = {};
          var TemporaryActiveQuery = {};
          var InviteQuery = {};
          var TemporaryPendingQuery = {};
          var PaymentQuery = {};
          var InvoicePendingQuery = {};


          if (ReceivingData.Customer && ReceivingData.Business === '' && ReceivingData.Branch === '') {
            InvoiceQuery = { PaidORUnpaid: "Unpaid", Buyer: ReceivingData.Customer, InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
            TemporaryActiveQuery = { Buyer: ReceivingData.Customer, Request_Status: "Accept", ActiveStatus: true, IfDeleted: false };
            InviteQuery = { Buyer: ReceivingData.Customer, Invite_Status: "Accept" };
            TemporaryPendingQuery = { Buyer: ReceivingData.Customer, Request_Status: "Pending", ActiveStatus: true, IfDeleted: false };
            PaymentQuery = { Buyer: ReceivingData.Customer, Payment_Status: "Pending" };
            InvoicePendingQuery = { Buyer: ReceivingData.Customer, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
          } else if (ReceivingData.Customer && ReceivingData.Business && ReceivingData.Branch === '') {
            ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
            InvoiceQuery = { PaidORUnpaid: "Unpaid", Buyer: ReceivingData.Customer, BuyerBusiness: ReceivingData.Business, InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
            TemporaryActiveQuery = { Buyer: ReceivingData.Customer, Request_Status: "Accept", ActiveStatus: true, IfDeleted: false };
            InviteQuery = { Buyer: ReceivingData.Customer, BuyerBusiness: ReceivingData.Business, Invite_Status: "Accept" };
            TemporaryPendingQuery = { Buyer: ReceivingData.Customer, Request_Status: "Pending", ActiveStatus: true, IfDeleted: false };
            PaymentQuery = { Buyer: ReceivingData.Customer, BuyerBusiness: ReceivingData.Business, Payment_Status: "Pending" };
            InvoicePendingQuery = { Buyer: ReceivingData.Customer, BuyerBusiness: ReceivingData.Business, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
          } else if (ReceivingData.Customer && ReceivingData.Branch && ReceivingData.Business === '') {
            ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);
            InvoiceQuery = { BuyerBranch: ReceivingData.Branch, PaidORUnpaid: "Unpaid", Buyer: ReceivingData.Customer, InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
            TemporaryActiveQuery = { Buyer: ReceivingData.Customer, Request_Status: "Accept", ActiveStatus: true, IfDeleted: false };
            InviteQuery = { Buyer: ReceivingData.Customer, BuyerBranch: ReceivingData.Branch, Invite_Status: "Accept" };
            TemporaryPendingQuery = { Buyer: ReceivingData.Customer, Request_Status: "Pending", ActiveStatus: true, IfDeleted: false };
            PaymentQuery = { Buyer: ReceivingData.Customer, BuyerBranch: ReceivingData.Branch, Payment_Status: "Pending" };
            InvoicePendingQuery = { BuyerBranch: ReceivingData.Branch, Buyer: ReceivingData.Customer, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
          } else {
            ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
            ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);
            InvoiceQuery = { BuyerBranch: ReceivingData.Branch, PaidORUnpaid: "Unpaid", Buyer: ReceivingData.Customer, BuyerBusiness: ReceivingData.Business, InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
            TemporaryActiveQuery = { Buyer: ReceivingData.Customer, Request_Status: "Accept", ActiveStatus: true, IfDeleted: false };
            InviteQuery = { Buyer: ReceivingData.Customer, BuyerBusiness: ReceivingData.Business, BuyerBranch: ReceivingData.Branch, Invite_Status: "Accept" };
            TemporaryPendingQuery = { Buyer: ReceivingData.Customer, Request_Status: "Pending", ActiveStatus: true, IfDeleted: false };
            PaymentQuery = { Buyer: ReceivingData.Customer, BuyerBusiness: ReceivingData.Business, BuyerBranch: ReceivingData.Branch, Payment_Status: "Pending" };
            InvoicePendingQuery = { BuyerBranch: ReceivingData.Branch, Buyer: ReceivingData.Customer, BuyerBusiness: ReceivingData.Business, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
          }
          Promise.all([
            InvoiceManagement.InvoiceSchema.find(InvoiceQuery, {}, {}).exec(),
            TemporaryManagement.CreditSchema.find(TemporaryActiveQuery, {}, {}).exec(),
            InviteManagement.InviteManagementSchema.find(InviteQuery, {}, {}).exec(),
            TemporaryManagement.CreditSchema.find(TemporaryPendingQuery, {}, {}).exec(),
            PaymentManagement.PaymentSchema.find(PaymentQuery, {}, {}).exec(),
            InvoiceManagement.InvoiceSchema.find(InvoicePendingQuery, {}, {}).exec(),
          ]).then(Response => {
            var BuyerInvoice = JSON.parse(JSON.stringify(Response[0]));
            var TemporaryActiveDetails = JSON.parse(JSON.stringify(Response[1]));
            var InviteDetails = JSON.parse(JSON.stringify(Response[2]));
            var TemporaryPendingDetails = JSON.parse(JSON.stringify(Response[3]));
            var BuyerPendingPayment = JSON.parse(JSON.stringify(Response[4]));
            var BuyerPendingInvoice = JSON.parse(JSON.stringify(Response[5]));
            var BusinessArray = [];
            var BranchArray = [];
            var BuyerId = [];
            var BusinessId = [];
            var BranchId = [];

            if (InviteDetails.length > 0) {
              InviteDetails.map(Obj => {
                BuyerId.push(mongoose.Types.ObjectId(Obj.Seller));
                BusinessId.push(mongoose.Types.ObjectId(Obj.Business));
                BranchId.push(mongoose.Types.ObjectId(Obj.Branch));
              });
            }

            var FindBusinessQuery = {};
            var FindBranchQuery = {};
            if (ReceivingData.Customer && ReceivingData.Business === '' && ReceivingData.Branch === '') {
              FindBusinessQuery = { Customer: { $in: BuyerId } };
              FindBranchQuery = { Customer: { $in: BuyerId } };
            } else if (ReceivingData.Customer && ReceivingData.Business && ReceivingData.Branch === '') {
              FindBusinessQuery = { Customer: { $in: BuyerId }, _id: { $in: BusinessId } };
              FindBranchQuery = { Customer: { $in: BuyerId }, Business: { $in: BusinessId } };
            } else if (ReceivingData.Customer && ReceivingData.Business === '' && ReceivingData.Branch) {
              FindBusinessQuery = { Customer: { $in: BuyerId } };
              FindBranchQuery = { Customer: { $in: BuyerId }, _id: { $in: BranchId } };
            } else {
              FindBusinessQuery = { Customer: { $in: BuyerId }, _id: { $in: BusinessId } };
              FindBranchQuery = { Customer: { $in: BuyerId }, Business: { $in: BusinessId }, _id: { $in: BranchId } };
            }


            const findRequiredData = new Promise((resolve, reject) => {
              Promise.all([
                BusinessAndBranchManagement.BusinessSchema.find(FindBusinessQuery, {}, {}).exec(),
                BusinessAndBranchManagement.BranchSchema.find(FindBranchQuery, {}, {}).exec(),
                CustomerManagement.CustomerSchema.find({ _id: { $in: BuyerId }, $or: [{ CustomerCategory: "Seller" }, { CustomerCategory: 'BothBuyerAndSeller' }] }, {}, {}).exec()
              ]).then((responseNew) => {
                BusinessArray = JSON.parse(JSON.stringify(responseNew[0]));
                BranchArray = JSON.parse(JSON.stringify(responseNew[1]));
                var ResponseRes = JSON.parse(JSON.stringify(responseNew[2]));
                resolve(ResponseRes);
              }).catch(errorNew => {
                reject(errorNew);
              });
            });

            const LoadMainFun = () => {
              if (BuyerId.length !== 0) {
                findRequiredData.then(responseNew => {
                  var ResponseRes = responseNew;
                  var HundiScoreArr = [];
                  ResponseRes = JSON.parse(JSON.stringify(ResponseRes));
                  ResponseRes.map(ObjM => {
                    var HundiScore = {
                      _id: String,
                      ContactName: String,
                      Mobile: String,
                      CustomerCategory: String,
                      Business: [],
                      OverDueAmount: 0,
                      HundiScoreRelatedOverDuePoint: 0,
                      CreditUnitizedPoint: 0,
                      TemporaryCreditPoint: 0,
                      DelayPaymentPoint: 0,
                      ExtraUnitizedCreditLimit: 0,
                      CreditBalanceExists: false,
                      OverDueInvoiceCount: 0,
                      CreditLimit: 0,
                      InvoiceAmount: 0,
                      AvailableCreditLimit: 0,
                      PendingInvoiceCount: 0,
                      DueTodayAmount: 0,
                      OutStandingPayments: 0,
                      UpComingAmount: 0,
                      HundiScore: Number,
                      BusinessVolumeIndicator: String,
                      HundiScoreStatus: ''
                    };
                    HundiScore._id = ObjM._id;
                    HundiScore.ContactName = ObjM.ContactName;
                    HundiScore.Mobile = ObjM.Mobile;
                    HundiScore.CustomerCategory = ObjM.CustomerCategory;
                    var Today = new Date();
                    var RespectiveCreditLimit = 0;

                    if (BranchArray.length > 0) {
                      const BranchArrayValue = BranchArray.filter(obj1 => obj1.Customer === ObjM._id);
                      if (BranchArrayValue.length > 0) {
                        BranchArrayValue.map(Obj => {
                          if (InviteDetails.length > 0) {
                            const InviteDetailsArray1 = InviteDetails.filter(obj1 => obj1.Branch === Obj._id);
                            if (InviteDetailsArray1.length > 0) {
                              var ValidityDate = new Date();
                              InviteDetailsArray1.map(ObjIn => {
                                // ValidityDate = new Date(ObjIn.updatedAt);
                                // ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + ObjIn.BuyerPaymentCycle));
                                // if (ValidityDate.valueOf() >= Today.valueOf()) {
                                RespectiveCreditLimit = parseFloat(RespectiveCreditLimit) + parseFloat(ObjIn.AvailableLimit);
                                // }
                              });
                            }
                          }
                          if (TemporaryActiveDetails.length > 0) {
                            const TemporaryActiveDetailsArray1 = TemporaryActiveDetails.filter(obj1 => obj1.Branch === Obj._id);
                            if (TemporaryActiveDetailsArray1.length > 0) {
                              var TemporaryValidityDate = new Date();
                              TemporaryActiveDetailsArray1.map(ObjIn => {
                                TemporaryValidityDate = new Date(ObjIn.updatedAt);
                                TemporaryValidityDate = new Date(TemporaryValidityDate.setDate(TemporaryValidityDate.getDate() + ObjIn.ApprovedPeriod));
                                if (TemporaryValidityDate.valueOf() >= Today.valueOf()) {
                                  RespectiveCreditLimit = parseFloat(RespectiveCreditLimit) + parseFloat(ObjIn.ApproveLimit);
                                }
                              });
                            }
                          }
                        });
                      }
                    }

                    HundiScore.CreditLimit = RespectiveCreditLimit;
                    HundiScore.CreditLimit = HundiScore.CreditLimit.toFixed(2);
                    HundiScore.CreditLimit = parseFloat(HundiScore.CreditLimit);
                    HundiScore.AvailableCreditLimit = RespectiveCreditLimit;
                    HundiScore.AvailableCreditLimit = HundiScore.AvailableCreditLimit.toFixed(2);
                    HundiScore.AvailableCreditLimit = parseFloat(HundiScore.AvailableCreditLimit);
                    var OverDueInvoiceArr = [];
                    if (BuyerInvoice.length !== 0) {
                      const BuyerInvoiceArray = BuyerInvoice.filter(obj1 => obj1.Seller === ObjM._id);
                      if (BuyerInvoiceArray.length > 0) {
                        BuyerInvoiceArray.map(Obj => {
                          var EmptyInvoicesAndInvite = {
                            Invoice: [],
                            Invite: []
                          };
                          var InvoiceDate = new Date();
                          var TodayDate = new Date();
                          InvoiceDate = new Date(Obj.InvoiceDate);
                          const InviteDetailsArr = InviteDetails.filter(obj1 => obj1.Branch === Obj.Branch);
                          if (InviteDetailsArr.length > 0) {
                            var ValidityDate = new Date();
                            InviteDetailsArr.map(ObjIn => {
                              ValidityDate = new Date(ObjIn.updatedAt);
                              ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + ObjIn.BuyerPaymentCycle));
                              InvoiceDate = new Date(InvoiceDate.setDate(InvoiceDate.getDate() + ObjIn.BuyerPaymentCycle));
                              if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                                EmptyInvoicesAndInvite.Invite.push(ObjIn);
                              }

                            });
                          }
                          if (InvoiceDate.valueOf() <= TodayDate.valueOf()) {
                            EmptyInvoicesAndInvite.Invoice.push(Obj);
                          }
                          OverDueInvoiceArr.push(EmptyInvoicesAndInvite);
                        });
                      }
                    }
                    var RespectiveOverDueAmount = 0;
                    var OverDueInvoiceCount = 0;
                    OverDueInvoiceArr.map(Obj => {
                      OverDueInvoiceCount = parseFloat(OverDueInvoiceCount) + parseFloat(Obj.Invoice.length);
                      if (Obj.Invoice.length !== 0) {
                        Obj.Invoice.map(obj => {
                          RespectiveOverDueAmount = parseFloat(RespectiveOverDueAmount) + parseFloat(obj.AvailableAmount);
                        });
                      }


                      var RespectiveOverDueAndCreditAmount = 0;
                      RespectiveOverDueAndCreditAmount = parseFloat(RespectiveOverDueAmount) / parseFloat(RespectiveCreditLimit);
                      if (RespectiveOverDueAndCreditAmount > 1 && RespectiveOverDueAndCreditAmount !== Infinity && !isNaN(RespectiveOverDueAndCreditAmount)) {
                        HundiScore.HundiScoreRelatedOverDuePoint = 40;
                      } else {
                        if (!isNaN(RespectiveOverDueAndCreditAmount) && RespectiveOverDueAndCreditAmount !== Infinity) {
                          HundiScore.HundiScoreRelatedOverDuePoint = parseFloat(30) * parseFloat(RespectiveOverDueAndCreditAmount);
                        }

                      }
                    });
                    HundiScore.OverDueInvoiceCount = OverDueInvoiceCount;
                    var InvoiceAmount = 0;
                    if (BuyerInvoice.length !== 0) {
                      const BuyerInvoiceArr = BuyerInvoice.filter(obj1 => obj1.Seller === ObjM._id);
                      if (BuyerInvoiceArr.length > 0) {
                        BuyerInvoiceArr.map(Obj => {
                          InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(Obj.AvailableAmount);
                        });
                      }
                    }
                    HundiScore.InvoiceAmount = InvoiceAmount;
                    HundiScore.UpComingAmount = InvoiceAmount;
                    var InvoiceRespectiveCreditAmount = parseFloat(InvoiceAmount) - parseFloat(RespectiveCreditLimit);
                    if (InvoiceRespectiveCreditAmount > 0) {
                      HundiScore.ExtraUnitizedCreditLimit = -Math.abs(InvoiceRespectiveCreditAmount);
                      HundiScore.ExtraUnitizedCreditLimit = HundiScore.ExtraUnitizedCreditLimit.toFixed(2);
                      HundiScore.ExtraUnitizedCreditLimit = parseFloat(HundiScore.ExtraUnitizedCreditLimit);
                      HundiScore.CreditBalanceExists = true;
                      HundiScore.AvailableCreditLimit = 0;
                    } else {
                      if (InvoiceRespectiveCreditAmount < 0) {
                        HundiScore.AvailableCreditLimit = Math.abs(InvoiceRespectiveCreditAmount);
                        HundiScore.AvailableCreditLimit = HundiScore.AvailableCreditLimit.toFixed(2);
                        HundiScore.AvailableCreditLimit = parseFloat(HundiScore.AvailableCreditLimit);
                      }
                    }

                    var TotalRespectiveOverDueAmount = parseFloat(RespectiveOverDueAmount);
                    if (TotalRespectiveOverDueAmount > 0) {
                      HundiScore.OverDueAmount = TotalRespectiveOverDueAmount;
                      HundiScore.OverDueAmount = HundiScore.OverDueAmount.toFixed(2);
                      HundiScore.OverDueAmount = parseFloat(HundiScore.OverDueAmount);
                    } else {
                      HundiScore.OverDueAmount = 0;
                    }

                    var NumberOfDaysOutStanding = 0;
                    var DueTodayAmount = 0;
                    var OutStandingInvoice = 0;
                    if (BuyerInvoice.length !== 0) {
                      const BuyerInvoiceArray = BuyerInvoice.filter(obj1 => obj1.Seller === ObjM._id);
                      if (BuyerInvoiceArray.length > 0) {
                        BuyerInvoiceArray.map(Obj => {
                          var InvoiceCreatedDate = new Date();
                          var InvoiceApprovedDate = new Date(Obj.InvoiceDate);
                          const InviteDetailsArray = InviteDetails.filter(obj1 => obj1.Branch === Obj.Branch);
                          if (InviteDetailsArray.length > 0) {
                            InviteDetailsArray.map(ObjIn => {
                              InvoiceApprovedDate = new Date(InvoiceApprovedDate.setDate(InvoiceApprovedDate.getDate() + ObjIn.BuyerPaymentCycle));
                            });
                          }
                          InvoiceApprovedDate = new Date(InvoiceApprovedDate.setDate(InvoiceApprovedDate.getDate() - 1));
                          var InvoiceLocalCreatedDate = InvoiceCreatedDate.toLocaleDateString();
                          var InvoiceLocalApprovedDate = InvoiceApprovedDate.toLocaleDateString();
                          if (InvoiceLocalCreatedDate === InvoiceLocalApprovedDate) {
                            NumberOfDaysOutStanding = parseFloat(NumberOfDaysOutStanding) + parseFloat(Obj.AvailableAmount);
                            DueTodayAmount = parseFloat(DueTodayAmount) + parseFloat(Obj.AvailableAmount);
                          }
                        });
                      }
                    }
                    var TotalCreditLimit = 0;
                    var PaymentCycle = 0;
                    if (InviteDetails.length !== 0) {
                      const InviteDetailsArray = InviteDetails.filter(obj1 => obj1.Seller === ObjM._id);
                      if (InviteDetailsArray.length > 0) {
                        InviteDetailsArray.map(Obj => {
                          TotalCreditLimit = parseFloat(TotalCreditLimit) + parseFloat(Obj.AvailableLimit);
                          PaymentCycle = parseFloat(Obj.BuyerPaymentCycle);
                        });
                      }
                    }

                    var DueTodayPayAmount = parseFloat(DueTodayAmount);
                    if (DueTodayPayAmount > 1 && DueTodayPayAmount !== Infinity) {
                      HundiScore.DueTodayAmount = DueTodayPayAmount.toFixed(2);
                      HundiScore.DueTodayAmount = parseFloat(DueTodayPayAmount);

                    }

                    var TotalCreditUnitized = parseFloat(OutStandingInvoice) / parseFloat(TotalCreditLimit);
                    if (TotalCreditUnitized > 0.5) {
                      TotalCreditUnitized = parseFloat(1) - parseFloat(TotalCreditUnitized);
                      TotalCreditUnitized = parseFloat(0.5) - parseFloat(TotalCreditUnitized);
                    }

                    if (TotalCreditUnitized > 1) {
                      HundiScore.CreditUnitizedPoint = 10;
                    } else {
                      HundiScore.CreditUnitizedPoint = parseFloat(10) * parseFloat(TotalCreditUnitized);
                      HundiScore.CreditUnitizedPoint = HundiScore.CreditUnitizedPoint.toFixed(2);
                      HundiScore.CreditUnitizedPoint = parseFloat(HundiScore.CreditUnitizedPoint);
                    }

                    var DelayPaymentAmount = parseFloat(NumberOfDaysOutStanding) / parseFloat(PaymentCycle);
                    if (DelayPaymentAmount > 1) {
                      HundiScore.DelayPaymentPoint = 30;
                    } else {
                      HundiScore.DelayPaymentPoint = parseFloat(30) * parseFloat(DelayPaymentAmount);
                      HundiScore.DelayPaymentPoint = HundiScore.DelayPaymentPoint.toFixed(2);
                      HundiScore.DelayPaymentPoint = parseFloat(HundiScore.DelayPaymentPoint);
                    }

                    var TemporaryActiveAmount = 0;
                    if (TemporaryActiveDetails.length > 0) {
                      const TemporaryActiveDetailsArray = TemporaryActiveDetails.filter(obj1 => obj1.Seller === ObjM._id);
                      if (TemporaryActiveDetailsArray.length > 0) {
                        TemporaryActiveDetailsArray.map(Obj => {
                          TemporaryActiveAmount = parseFloat(TemporaryActiveAmount) + parseFloat(Obj.ApproveLimit);
                        });
                      }
                    }

                    var TemporaryPendingAmount = 0;
                    if (TemporaryPendingDetails.length > 0) {
                      const TemporaryPendingDetailsArray = TemporaryPendingDetails.filter(obj1 => obj1.Seller === ObjM._id);
                      TemporaryPendingDetailsArray.map(Obj => {
                        TemporaryPendingAmount = parseFloat(TemporaryPendingAmount) + parseFloat(Obj.RequestLimit);
                      });
                    }

                    var TotalTemporaryAmount = parseFloat(TemporaryActiveAmount) / parseFloat(TemporaryPendingAmount);
                    if (isNaN(TotalTemporaryAmount)) {
                      TotalTemporaryAmount = 0;
                    }
                    if (TotalTemporaryAmount > 1) {
                      HundiScore.TemporaryCreditPoint = 20;
                    } else {
                      HundiScore.TemporaryCreditPoint = parseFloat(20) * parseFloat(TotalTemporaryAmount);
                      HundiScore.TemporaryCreditPoint = HundiScore.TemporaryCreditPoint.toFixed(2);
                      HundiScore.TemporaryCreditPoint = parseFloat(HundiScore.TemporaryCreditPoint);
                    }

                    var BuyerOutstandingPayment = 0;
                    const BuyerPendingPaymentArr = BuyerInvoice.filter(obj => JSON.parse(JSON.stringify(obj.Seller)) === JSON.parse(JSON.stringify(ObjM._id)));
                    if (BuyerPendingPaymentArr.length !== 0) {
                      BuyerPendingPaymentArr.map(Obj => {
                        BuyerOutstandingPayment = parseFloat(BuyerOutstandingPayment) + parseFloat(Obj.AvailableAmount);
                      });
                    }


                    var PendingInvoiceAmount = 0;
                    const CustomerPendingInvoiceArr = BuyerPendingInvoice.filter(obj => JSON.parse(JSON.stringify(obj.Seller)) === JSON.parse(JSON.stringify(ObjM._id)));
                    if (CustomerPendingInvoiceArr.length !== 0) {
                      HundiScore.PendingInvoiceCount = CustomerPendingInvoiceArr.length;
                      CustomerPendingInvoiceArr.map(Obj => {
                        PendingInvoiceAmount = parseFloat(PendingInvoiceAmount) + parseFloat(Obj.AvailableAmount);
                      });
                    }


                    if (HundiScore.DueTodayAmount > 1) {
                      HundiScore.DueTodayAmount = HundiScore.DueTodayAmount.toFixed(2);
                      HundiScore.DueTodayAmount = parseFloat(HundiScore.DueTodayAmount);
                    }
                    if (BuyerOutstandingPayment > 0) {
                      HundiScore.OutStandingPayments = BuyerOutstandingPayment;
                      HundiScore.OutStandingPayments = HundiScore.OutStandingPayments.toFixed(2);
                      HundiScore.OutStandingPayments = parseFloat(HundiScore.OutStandingPayments);
                    }

                    if (HundiScore.UpComingAmount > 1) {
                      HundiScore.UpComingAmount = parseFloat(HundiScore.UpComingAmount) - parseFloat(HundiScore.DueTodayAmount) - parseFloat(HundiScore.OverDueAmount);
                      HundiScore.UpComingAmount = HundiScore.UpComingAmount.toFixed(2);
                      HundiScore.UpComingAmount = parseFloat(HundiScore.UpComingAmount);
                      if (HundiScore.UpComingAmount < 0) {
                        HundiScore.UpComingAmount = 0;
                      }
                    }

                    const BusinessArrArr = BusinessArray.filter(obj => JSON.parse(JSON.stringify(obj.Customer)) === JSON.parse(JSON.stringify(ObjM._id)));
                    if (BusinessArrArr.length !== 0) {
                      HundiScore.Business = BusinessArrArr;
                      HundiScore.Business.map(ObjBus => {
                        const BusinessOfBranchArr = BranchArray.filter(obj => JSON.parse(JSON.stringify(obj.Business)) === JSON.parse(JSON.stringify(ObjBus._id)));
                        ObjBus.Branches = BusinessOfBranchArr;
                        return ObjBus;
                      });
                    }

                    var BusinessVolume = 0;
                    var AllBuyerCreditLimits = 0;
                    var TotalInvoiceAmount = 0;
                    var BusinessVolumePercentage = 0;
                    InviteDetails.map(Obj => {
                      AllBuyerCreditLimits = parseFloat(AllBuyerCreditLimits) + parseFloat(Obj.AvailableLimit);
                    });
                    const BuyerInvoiceArrB = BuyerInvoice.filter(obj => JSON.parse(JSON.stringify(obj.Seller)) === JSON.parse(JSON.stringify(ObjM._id)));
                    if (BuyerInvoiceArrB.length !== 0) {
                      BuyerInvoiceArrB.map(ObjB => {
                        if (ObjB.PaidORUnpaid === 'Paid') {
                          TotalInvoiceAmount = parseFloat(TotalInvoiceAmount) + parseFloat(ObjB.InvoiceAmount);
                        } else if (ObjB.PaidORUnpaid === 'Unpaid') {
                          TotalInvoiceAmount = parseFloat(TotalInvoiceAmount) + parseFloat(ObjB.AvailableAmount);
                        }
                      });
                    }

                    BusinessVolume = parseFloat(HundiScore.OverDueAmount) + parseFloat(TotalInvoiceAmount);

                    BusinessVolumePercentage = parseFloat(BusinessVolume) / parseFloat(AllBuyerCreditLimits);

                    if (BusinessVolumePercentage >= 45) {
                      HundiScore.BusinessVolumeIndicator = 'Low';
                    } else if (BusinessVolumePercentage > 45 && BusinessVolumePercentage >= 90) {
                      HundiScore.BusinessVolumeIndicator = 'Medium';
                    } else if (BusinessVolumePercentage > 90) {
                      HundiScore.BusinessVolumeIndicator = 'High';
                    }

                    if (BusinessVolumePercentage < 45) {
                      HundiScore.HundiScoreStatus = 'Bad_Hundi_Score';
                    } else if (BusinessVolumePercentage >= 45) {
                      HundiScore.HundiScoreStatus = 'Average_Hundi_Score';
                    } else if (BusinessVolumePercentage >= 90) {
                      HundiScore.HundiScoreStatus = 'Good_Hundi_Score';
                    } else if (BusinessVolumePercentage < 90) {
                      HundiScore.HundiScoreStatus = 'High_Hundi_Score';
                    }
                    var HundiScoreCount = 0;
                    HundiScoreCount = parseFloat(100) - parseFloat(HundiScore.HundiScoreRelatedOverDuePoint) - parseFloat(HundiScore.CreditUnitizedPoint) - parseFloat(HundiScore.TemporaryCreditPoint) - parseFloat(HundiScore.DelayPaymentPoint);
                    HundiScore.HundiScore = HundiScoreCount.toFixed(2);
                    HundiScore.HundiScore = parseFloat(HundiScore.HundiScore);
                    if (isNaN(HundiScore.HundiScore) || HundiScore.HundiScore === Infinity) {
                      HundiScore.HundiScore = 0;
                    }
                    HundiScoreArr.push(HundiScore);
                  });
                  if (ReceivingData.Low_To_High_Invoice === false && ReceivingData.High_To_Low_Invoice === false &&
                    ReceivingData.Low_To_High_OverDue === false && ReceivingData.High_To_Low_OverDue === false) {
                    var MaxMin = 0;
                    HundiScoreArr.map(Obj => {
                      MaxMin = Math.min(Number(Obj.HundiScore));
                    });

                    var HundiScoreLowToHigh = [];
                    HundiScoreArr.map(Obj => {
                      if (MaxMin <= Number(Obj.HundiScore)) {
                        HundiScoreLowToHigh.push(Obj);
                      }
                    });
                    res.status(200).send({ Status: true, Message: "Hundi Score!.", Response: HundiScoreLowToHigh });
                  } else if (ReceivingData.Low_To_High_Invoice === false && ReceivingData.High_To_Low_Invoice === false &&
                    ReceivingData.Low_To_High_OverDue === false && ReceivingData.High_To_Low_OverDue === false) {
                    var MaxValueHigh = 0;
                    HundiScoreArr.map(Obj => {
                      MaxValueHigh = Math.max(Number(Obj.InvoiceAmount));
                    });

                    var HundiScoreHighToLowIn = [];
                    HundiScoreArr.map(Obj => {
                      if (MaxValueHigh > Number(Obj.InvoiceAmount)) {
                        HundiScoreHighToLowIn.push(Obj);
                      }
                    });
                    res.status(200).send({ Status: true, Message: "Hundi Score!.", Response: HundiScoreHighToLowIn });
                  } else if (ReceivingData.Low_To_High_Invoice === false && ReceivingData.High_To_Low_Invoice === false &&
                    ReceivingData.Low_To_High_OverDue === false && ReceivingData.High_To_Low_OverDue === false) {
                    var MaxMinOverDue = 0;
                    HundiScoreArr.map(Obj => {
                      MaxMinOverDue = Math.min(Number(Obj.OverDueAmount));
                    });

                    var HundiScoreLowToHighOver = [];
                    HundiScoreArr.map(Obj => {
                      if (MaxMinOverDue <= Number(Obj.OverDueAmount)) {
                        HundiScoreLowToHighOver.push(Obj);
                      }
                    });
                    res.status(200).send({ Status: true, Message: "Hundi Score!.", Response: HundiScoreLowToHighOver });
                  } else if (ReceivingData.Low_To_High_Invoice === false && ReceivingData.High_To_Low_Invoice === false &&
                    ReceivingData.Low_To_High_OverDue === false && ReceivingData.High_To_Low_OverDue === false) {
                    var MaxValueOverDue = 0;
                    HundiScoreArr.map(Obj => {
                      MaxValueOverDue = Math.max(Number(Obj.OverDueAmount));
                    });

                    var HundiScoreHighToOver = [];
                    HundiScoreArr.map(Obj => {
                      if (MaxValueOverDue > Number(Obj.OverDueAmount)) {
                        HundiScoreHighToOver.push(Obj);
                      }
                    });
                    res.status(200).send({ Status: true, Message: "Hundi Score!.", Response: HundiScoreHighToOver });
                  } else if (ReceivingData.Low_To_High_Invoice === false && ReceivingData.High_To_Low_Invoice === false &&
                    ReceivingData.Low_To_High_OverDue === false && ReceivingData.High_To_Low_OverDue === false) {
                    var MaxMinOverDueAndInvoice1 = 0;
                    var MaxMinOverDueAndInvoice2 = 0;
                    HundiScoreArr.map(Obj => {
                      MaxMinOverDueAndInvoice1 = Math.min(Number(Obj.OverDueAmount));
                      MaxMinOverDueAndInvoice2 = Math.min(Number(Obj.InvoiceAmount));
                    });

                    var MaxMinOverDueAndInvoiceArr = [];
                    HundiScoreArr.map(Obj => {
                      if (MaxMinOverDueAndInvoice1 < Number(Obj.OverDueAmount) || MaxMinOverDueAndInvoice2 < Number(Obj.InvoiceAmount)) {
                        MaxMinOverDueAndInvoiceArr.push(Obj);
                      }
                    });
                    res.status(200).send({ Status: true, Message: "Hundi Score!.", Response: MaxMinOverDueAndInvoiceArr });
                  } else if (ReceivingData.Low_To_High_Invoice === false && ReceivingData.High_To_Low_Invoice === false &&
                    ReceivingData.Low_To_High_OverDue === false && ReceivingData.High_To_Low_OverDue === false) {
                    var MaxValueOverDueAndInvoice3 = 0;
                    var MaxValueOverDueAndInvoice4 = 0;
                    HundiScoreArr.map(Obj => {
                      MaxValueOverDueAndInvoice3 = Math.max(Number(Obj.OverDueAmount));
                      MaxValueOverDueAndInvoice4 = Math.min(Number(Obj.InvoiceAmount));
                    });

                    var MaxMinOverDueAndInvoiceArr1 = [];
                    HundiScoreArr.map(Obj => {
                      if (MaxValueOverDueAndInvoice3 > Number(Obj.OverDueAmount) || MaxValueOverDueAndInvoice4 > Number(Obj.InvoiceAmount)) {
                        MaxMinOverDueAndInvoiceArr1.push(Obj);
                      }
                    });
                    res.status(200).send({ Status: true, Message: "Hundi Score!.", Response: MaxMinOverDueAndInvoiceArr1 });
                  } else if (ReceivingData.Low_To_High_Invoice === false && ReceivingData.High_To_Low_Invoice === false &&
                    ReceivingData.Low_To_High_OverDue === false && ReceivingData.High_To_Low_OverDue === false) {
                    var MaxMinOverDueAndInvoice5 = 0;
                    var MaxMinOverDueAndInvoice6 = 0;
                    HundiScoreArr.map(Obj => {
                      MaxMinOverDueAndInvoice5 = Math.min(Number(Obj.OverDueAmount));
                      MaxMinOverDueAndInvoice6 = Math.max(Number(Obj.InvoiceAmount));
                    });

                    var MaxMinOverDueAndInvoiceArr2 = [];
                    HundiScoreArr.map(Obj => {
                      if (MaxMinOverDueAndInvoice5 < Number(Obj.OverDueAmount) || MaxMinOverDueAndInvoice6 > Number(Obj.InvoiceAmount)) {
                        MaxMinOverDueAndInvoiceArr2.push(Obj);
                      }
                    });
                    res.status(200).send({ Status: true, Message: "Hundi Score!.", Response: MaxMinOverDueAndInvoiceArr2 });
                  } else if (ReceivingData.Low_To_High_Invoice === false && ReceivingData.High_To_Low_Invoice === false &&
                    ReceivingData.Low_To_High_OverDue === false && ReceivingData.High_To_Low_OverDue === false) {
                    var MaxValueOverDueAndInvoice7 = 0;
                    var MaxValueOverDueAndInvoice8 = 0;
                    HundiScoreArr.map(Obj => {
                      MaxValueOverDueAndInvoice7 = Math.max(Number(Obj.OverDueAmount));
                      MaxValueOverDueAndInvoice8 = Math.max(Number(Obj.InvoiceAmount));
                    });

                    var MaxMinOverDueAndInvoiceArr4 = [];
                    HundiScoreArr.map(Obj => {
                      if (MaxValueOverDueAndInvoice7 > Number(Obj.OverDueAmount) || MaxValueOverDueAndInvoice8 > Number(Obj.InvoiceAmount)) {
                        MaxMinOverDueAndInvoiceArr4.push(Obj);
                      }
                    });
                    res.status(200).send({ Status: true, Message: "Hundi Score!.", Response: MaxMinOverDueAndInvoiceArr4 });
                  } else if (ReceivingData.Low_To_High_Invoice === false && ReceivingData.High_To_Low_Invoice === false &&
                    ReceivingData.Low_To_High_OverDue === false && ReceivingData.High_To_Low_OverDue === false) {
                    var MaxValueOverDueAndInvoice9 = 0;
                    var MaxValueOverDueAndInvoice10 = 0;
                    HundiScoreArr.map(Obj => {
                      MaxValueOverDueAndInvoice9 = Math.min(Number(Obj.InvoiceAmount));
                      MaxValueOverDueAndInvoice10 = Math.max(Number(Obj.InvoiceAmount));
                    });

                    var MaxMinOverDueAndInvoiceArr5 = [];
                    HundiScoreArr.map(Obj => {
                      if (MaxValueOverDueAndInvoice9 < Number(Obj.InvoiceAmount) || MaxValueOverDueAndInvoice10 > Number(Obj.InvoiceAmount)) {
                        MaxMinOverDueAndInvoiceArr5.push(Obj);
                      }
                    });
                    res.status(200).send({ Status: true, Message: "Hundi Score!.", Response: MaxMinOverDueAndInvoiceArr5 });
                  } else if (ReceivingData.Low_To_High_Invoice === false && ReceivingData.High_To_Low_Invoice === false &&
                    ReceivingData.Low_To_High_OverDue === false && ReceivingData.High_To_Low_OverDue === false) {
                    var MaxValueOverDueAndInvoice11 = 0;
                    var MaxValueOverDueAndInvoice12 = 0;
                    HundiScoreArr.map(Obj => {
                      MaxValueOverDueAndInvoice11 = Math.min(Number(Obj.OverDueAmount));
                      MaxValueOverDueAndInvoice12 = Math.max(Number(Obj.OverDueAmount));
                    });

                    var MaxMinOverDueAndInvoiceArr6 = [];
                    HundiScoreArr.map(Obj => {
                      if (MaxValueOverDueAndInvoice11 < Number(Obj.OverDueAmount) || MaxValueOverDueAndInvoice12 > Number(Obj.OverDueAmount)) {
                        MaxMinOverDueAndInvoiceArr6.push(Obj);
                      }
                    });
                    res.status(200).send({ Status: true, Message: "Hundi Score!.", Response: MaxMinOverDueAndInvoiceArr6 });
                  } else if (ReceivingData.Low_To_High_Invoice === false && ReceivingData.High_To_Low_Invoice === false &&
                    ReceivingData.Low_To_High_OverDue === false && ReceivingData.High_To_Low_OverDue === false) {
                    res.status(200).send({ Status: true, Message: "Hundi Score!.", Response: HundiScoreArr });
                  }
                }).catch(errorNew => {
                  res.status(417).send({ Status: false, Message: "Some Occurred Error!.", Error: errorNew });
                });
              } else {
                res.status(200).send({ Status: true, Message: "Hundi Score", Response: [] });
              }
            };
            LoadMainFun();
          }).catch(ErrorRes => {
            res.status(417).send({ Status: false, Message: "Some Occurred Error!.", Error: ErrorRes });
          });
        } else {
          res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
        }
      }
    });
  }
};


exports.SellerAndBusinessAndBranchAgainstBuyerScore = function (req, res) {
  var ReceivingData = req.body;
  if (!ReceivingData.Customer || ReceivingData.Customer === '') {
    res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
  } else if (!ReceivingData.Business || ReceivingData.Business === '') {
    res.status(400).send({ Status: false, Message: "Business Details can not be empty" });
  } else if (!ReceivingData.Branch || ReceivingData.Branch === '') {
    res.status(400).send({ Status: false, Message: "Business Details can not be empty" });
  } else {
    ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
    ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
    ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);
    CustomerManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer }, {}, {}).exec(function (err, result) {
      if (err) {
        ErrorHandling.ErrorLogCreation(req, 'Seller Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(err));
        res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
      } else {
        if (result !== null) {
          if (result.CustomerType === 'User') {
            ReceivingData.Customer = mongoose.Types.ObjectId(result.Owner)
          }
          Promise.all([
            InvoiceManagement.InvoiceSchema.find({ Branch: ReceivingData.Branch, PaidORUnpaid: "Unpaid", Seller: ReceivingData.Customer, Business: ReceivingData.Business, InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            TemporaryManagement.CreditSchema.find({ Seller: ReceivingData.Customer, Business: ReceivingData.Business, Branch: ReceivingData.Branch, Request_Status: "Accept", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            InviteManagement.InviteManagementSchema.find({ Seller: ReceivingData.Customer, Business: ReceivingData.Business, Branch: ReceivingData.Branch, Invite_Status: "Accept" }, {}, {}).exec(),
            TemporaryManagement.CreditSchema.find({ Seller: ReceivingData.Customer, Business: ReceivingData.Business, Branch: ReceivingData.Branch, Request_Status: "Pending", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            PaymentManagement.PaymentSchema.find({ Seller: ReceivingData.Customer, Business: ReceivingData.Business, Branch: ReceivingData.Branch, Payment_Status: "Pending" }, {}, {}).exec(),
            InvoiceManagement.InvoiceSchema.find({ Branch: ReceivingData.Branch, Seller: ReceivingData.Customer, Business: ReceivingData.Business, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
          ]).then(Response => {
            var BuyerInvoice = JSON.parse(JSON.stringify(Response[0]));
            var TemporaryActiveDetails = JSON.parse(JSON.stringify(Response[1]));
            var InviteDetails = JSON.parse(JSON.stringify(Response[2]));
            var TemporaryPendingDetails = JSON.parse(JSON.stringify(Response[3]));
            var BuyerPendingPayment = JSON.parse(JSON.stringify(Response[4]));
            var BuyerPendingInvoice = JSON.parse(JSON.stringify(Response[5]));
            var BusinessArray = [];
            var BranchArray = [];
            var BuyerId = [];
            var SellerBusinessArray = [];
            var SellerId = [];
            var BusinessId = [];
            var BranchId = [];
            if (InviteDetails.length > 0) {
              InviteDetails.map(Obj => {
                BuyerId.push(Obj.Buyer);
                SellerId.push(mongoose.Types.ObjectId(Obj.Seller));
                BusinessId.push(mongoose.Types.ObjectId(Obj.BuyerBusiness));
                BranchId.push(mongoose.Types.ObjectId(Obj.BuyerBranch));
              });
            }
            const findRequiredData = new Promise((resolve, reject) => {
              Promise.all([
                BusinessAndBranchManagement.BusinessSchema.find({ _id: { $in: BusinessId } }, {}, {}).exec(),
                BusinessAndBranchManagement.BranchSchema.find({ _id: { $in: BranchId } }, {}, {}).exec(),
                BusinessAndBranchManagement.BusinessSchema.find({ Customer: { $in: SellerId } }, {}, {}).exec(),
                CustomerManagement.CustomerSchema.find({ _id: { $in: BuyerId }, $or: [{ CustomerCategory: "Buyer" }, { CustomerCategory: 'BothBuyerAndSeller' }] }, {}, {}).exec()
              ]).then((responseNew) => {
                BusinessArray = JSON.parse(JSON.stringify(responseNew[0]));
                BranchArray = JSON.parse(JSON.stringify(responseNew[1]));
                SellerBusinessArray = JSON.parse(JSON.stringify(responseNew[2]));
                var ResponseRes = JSON.parse(JSON.stringify(responseNew[3]));
                resolve(ResponseRes);
              }).catch(errorNew => {
                reject(errorNew);
              });
            });

            const LoadMainFun = () => {
              if (BuyerId.length !== 0 && SellerId.length !== 0) {
                findRequiredData.then(responseNew => {
                  var HundiScoreArr = [];
                  var ResponseRes = responseNew;
                  ResponseRes.map(ObjM => {
                    var HundiScore = {
                      _id: String,
                      ContactName: String,
                      Mobile: String,
                      CustomerCategory: String,
                      Business: [],
                      OverDueAmount: 0,
                      HundiScoreRelatedOverDuePoint: 0,
                      CreditUnitizedPoint: 0,
                      TemporaryCreditPoint: 0,
                      DelayPaymentPoint: 0,
                      CreditLimit: 0,
                      ExtraUnitizedCreditLimit: 0,
                      CreditBalanceExists: false,
                      InvoiceAmount: 0,
                      AvailableCreditLimit: 0,
                      PendingInvoiceCount: 0,
                      DueTodayAmount: 0,
                      OutStandingPayments: 0,
                      UpComingAmount: 0,
                      HundiScore: Number,
                      BusinessVolumeIndicator: String,
                      HundiScoreStatus: ''
                    };
                    HundiScore._id = ObjM._id;
                    HundiScore.ContactName = ObjM.ContactName;
                    HundiScore.Mobile = ObjM.Mobile;
                    HundiScore.CustomerCategory = ObjM.CustomerCategory;

                    var TodayDate1 = new Date();
                    var RespectiveCreditLimit1 = 0;
                    if (BranchArray.length > 0) {
                      BranchArray.map(ObjS => {
                        if (InviteDetails.length > 0) {
                          const InviteDetailsArray1 = InviteDetails.filter(obj1 => ObjS._id === obj1.BuyerBranch && obj1.Buyer === ObjM._id);
                          if (InviteDetailsArray1.length > 0) {
                            var ValidityDate = new Date();
                            InviteDetailsArray1.map(ObjIn => {
                              ValidityDate = new Date(ObjIn.updatedAt);
                              //  ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + ObjIn.BuyerPaymentCycle));
                              //  if (ValidityDate.valueOf() >= TodayDate1.valueOf()) {
                              RespectiveCreditLimit1 = parseFloat(RespectiveCreditLimit1) + parseFloat(ObjIn.AvailableLimit);
                              //  }
                            });
                          }
                        }
                        if (TemporaryActiveDetails.length > 0) {
                          const TemporaryActiveDetailsArray1 = TemporaryActiveDetails.filter(obj1 => ObjS._id === obj1.BuyerBranch && obj1.Buyer === ObjM._id);
                          if (TemporaryActiveDetailsArray1.length > 0) {
                            var TemporaryValidityDate = new Date();
                            TemporaryActiveDetailsArray1.map(ObjIn => {
                              TemporaryValidityDate = new Date(ObjIn.updatedAt);
                              TemporaryValidityDate = new Date(TemporaryValidityDate.setDate(TemporaryValidityDate.getDate() + ObjIn.ApprovedPeriod));
                              if (TemporaryValidityDate.valueOf() >= TodayDate1.valueOf()) {
                                RespectiveCreditLimit1 = parseFloat(RespectiveCreditLimit1) + parseFloat(ObjIn.ApproveLimit);
                              }
                            });
                          }
                        }
                      });
                    }

                    HundiScore.CreditLimit = RespectiveCreditLimit1;
                    HundiScore.CreditLimit = HundiScore.CreditLimit.toFixed(2);
                    HundiScore.CreditLimit = parseFloat(HundiScore.CreditLimit);
                    HundiScore.AvailableCreditLimit = RespectiveCreditLimit1;
                    HundiScore.AvailableCreditLimit = HundiScore.AvailableCreditLimit.toFixed(2);
                    HundiScore.AvailableCreditLimit = parseFloat(HundiScore.AvailableCreditLimit);
                    var OverDueInvoiceArr = [];
                    if (BuyerInvoice.length !== 0) {
                      const BuyerInvoiceArray = BuyerInvoice.filter(obj1 => obj1.Buyer === ObjM._id);
                      if (BuyerInvoiceArray.length > 0) {
                        BuyerInvoiceArray.map(Obj => {
                          var EmptyInvoicesAndInvite = {
                            Invoice: [],
                            Invite: []
                          };
                          var InvoiceDate = new Date();
                          var TodayDate = new Date();
                          InvoiceDate = new Date(Obj.InvoiceDate);
                          const InviteDetailsArr = InviteDetails.filter(obj1 => obj1.BuyerBranch === Obj.BuyerBranch && obj1.BuyerBusiness === Obj.BuyerBusiness && obj1.Buyer === ObjM._id);
                          if (InviteDetailsArr.length > 0) {
                            var ValidityDate = new Date();
                            InviteDetailsArr.map(ObjIn => {
                              ValidityDate = new Date(ObjIn.updatedAt);
                              ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + ObjIn.BuyerPaymentCycle));
                              InvoiceDate = new Date(InvoiceDate.setDate(InvoiceDate.getDate() + ObjIn.BuyerPaymentCycle + 1));
                              if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                                EmptyInvoicesAndInvite.Invite.push(ObjIn);
                              }
                            });
                          }
                          if (InvoiceDate.valueOf() < TodayDate.valueOf()) {
                            EmptyInvoicesAndInvite.Invoice.push(Obj);
                          }
                          OverDueInvoiceArr.push(EmptyInvoicesAndInvite);
                        });
                      }
                    }
                    var RespectiveOverDueAmount = 0;
                    var RespectiveCreditLimit = 0;
                    OverDueInvoiceArr.map(Obj => {
                      if (Obj.Invoice.length !== 0) {
                        Obj.Invoice.map(obj => {
                          RespectiveOverDueAmount = parseFloat(RespectiveOverDueAmount) + parseFloat(obj.AvailableAmount);
                        });
                      }

                      if (Obj.Invite.length !== 0) {
                        Obj.Invite.map(obj => {
                          RespectiveCreditLimit = parseFloat(RespectiveCreditLimit) + parseFloat(obj.AvailableLimit);
                        });
                      }
                      var RespectiveOverDueAndCreditAmount = 0;
                      RespectiveOverDueAndCreditAmount = parseFloat(RespectiveOverDueAmount) / parseFloat(RespectiveCreditLimit1);
                      if (RespectiveOverDueAndCreditAmount > 1 && RespectiveOverDueAndCreditAmount !== Infinity && !isNaN(RespectiveOverDueAndCreditAmount)) {
                        HundiScore.HundiScoreRelatedOverDuePoint = 40;
                      } else {
                        if (!isNaN(RespectiveOverDueAndCreditAmount) && RespectiveOverDueAndCreditAmount !== Infinity) {
                          HundiScore.HundiScoreRelatedOverDuePoint = parseFloat(30) * parseFloat(RespectiveOverDueAndCreditAmount);
                        }

                      }
                    });
                    var InvoiceAmount = 0;
                    if (BuyerInvoice.length !== 0) {
                      const BuyerInvoiceArr = BuyerInvoice.filter(obj1 => obj1.Buyer === ObjM._id);
                      if (BuyerInvoiceArr.length > 0) {
                        BuyerInvoiceArr.map(Obj => {
                          InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(Obj.AvailableAmount);
                        });
                      }
                    }
                    HundiScore.InvoiceAmount = InvoiceAmount;
                    HundiScore.UpComingAmount = InvoiceAmount;
                    var InvoiceRespectiveCreditAmount = parseFloat(InvoiceAmount) - parseFloat(RespectiveCreditLimit1);
                    if (InvoiceRespectiveCreditAmount >= 0) {
                      HundiScore.ExtraUnitizedCreditLimit = -Math.abs(InvoiceRespectiveCreditAmount);
                      HundiScore.ExtraUnitizedCreditLimit = HundiScore.ExtraUnitizedCreditLimit.toFixed(2);
                      HundiScore.ExtraUnitizedCreditLimit = parseFloat(HundiScore.ExtraUnitizedCreditLimit);
                      HundiScore.CreditBalanceExists = true;
                      HundiScore.AvailableCreditLimit = 0;
                    } else {
                      if (InvoiceRespectiveCreditAmount < 0) {
                        HundiScore.AvailableCreditLimit = Math.abs(InvoiceRespectiveCreditAmount);
                        HundiScore.AvailableCreditLimit = HundiScore.AvailableCreditLimit.toFixed(2);
                        HundiScore.AvailableCreditLimit = parseFloat(HundiScore.AvailableCreditLimit)
                      }

                    }

                    var TotalRespectiveOverDueAmount = parseFloat(RespectiveOverDueAmount);
                    if (TotalRespectiveOverDueAmount > 0) {
                      HundiScore.OverDueAmount = TotalRespectiveOverDueAmount;
                      HundiScore.OverDueAmount = HundiScore.OverDueAmount.toFixed(2);
                      HundiScore.OverDueAmount = parseFloat(HundiScore.OverDueAmount);
                    } else {
                      HundiScore.OverDueAmount = 0;
                    }

                    var NumberOfDaysOutStanding = 0;
                    var DueTodayAmount = 0;
                    var OutStandingInvoice = 0;
                    if (BuyerInvoice.length !== 0) {
                      const BuyerInvoiceArray = BuyerInvoice.filter(obj1 => obj1.Buyer === ObjM._id);
                      if (BuyerInvoiceArray.length > 0) {
                        BuyerInvoiceArray.map(Obj => {
                          var InvoiceCreatedDate = new Date();
                          var InvoiceApprovedDate = new Date(Obj.InvoiceDate);
                          OutStandingInvoice = parseFloat(OutStandingInvoice) + parseFloat(Obj.AvailableAmount);
                          const InviteDetailsArray = InviteDetails.filter(obj1 => obj1.BuyerBranch === Obj.BuyerBranch);
                          if (InviteDetailsArray.length > 0) {
                            InviteDetailsArray.map(ObjIn => {
                              InvoiceApprovedDate = new Date(InvoiceApprovedDate.setDate(InvoiceApprovedDate.getDate() + ObjIn.BuyerPaymentCycle));
                            });
                          }
                          var InvoiceLocalCreatedDate = InvoiceCreatedDate.toLocaleDateString();
                          var InvoiceLocalApprovedDate = InvoiceApprovedDate.toLocaleDateString();
                          if (InvoiceLocalCreatedDate === InvoiceLocalApprovedDate) {
                            NumberOfDaysOutStanding = parseFloat(NumberOfDaysOutStanding) + parseFloat(Obj.AvailableAmount);
                            DueTodayAmount = parseFloat(DueTodayAmount) + parseFloat(Obj.AvailableAmount);
                          }
                        });
                      }
                    }
                    var TotalCreditLimit = 0;
                    var PaymentCycle = 0;
                    if (InviteDetails.length !== 0) {
                      const InviteDetailsArray = InviteDetails.filter(obj1 => obj1.Buyer === ObjM._id);
                      if (InviteDetailsArray.length > 0) {
                        InviteDetailsArray.map(Obj => {
                          TotalCreditLimit = parseFloat(TotalCreditLimit) + parseFloat(Obj.AvailableLimit);
                          PaymentCycle = parseFloat(Obj.BuyerPaymentCycle);
                        });
                      }
                    }

                    var DueTodayPayAmount = parseFloat(DueTodayAmount);
                    if (DueTodayPayAmount > 1 && DueTodayPayAmount !== Infinity) {
                      HundiScore.DueTodayAmount = DueTodayPayAmount.toFixed(2);
                      HundiScore.DueTodayAmount = parseFloat(DueTodayPayAmount);
                    }

                    var TotalCreditUnitized = parseFloat(OutStandingInvoice) / parseFloat(TotalCreditLimit);
                    if (TotalCreditUnitized > 0.5) {
                      TotalCreditUnitized = parseFloat(1) - parseFloat(TotalCreditUnitized);
                      TotalCreditUnitized = parseFloat(0.5) - parseFloat(TotalCreditUnitized);
                    }

                    if (TotalCreditUnitized > 1) {
                      HundiScore.CreditUnitizedPoint = 10;
                    } else {
                      HundiScore.CreditUnitizedPoint = parseFloat(10) * parseFloat(TotalCreditUnitized);
                      HundiScore.CreditUnitizedPoint = HundiScore.CreditUnitizedPoint.toFixed(2);
                      HundiScore.CreditUnitizedPoint = parseFloat(HundiScore.CreditUnitizedPoint);
                    }

                    var DelayPaymentAmount = parseFloat(NumberOfDaysOutStanding) / parseFloat(PaymentCycle);
                    if (DelayPaymentAmount > 1) {
                      HundiScore.DelayPaymentPoint = 30;
                    } else {
                      HundiScore.DelayPaymentPoint = parseFloat(30) * parseFloat(DelayPaymentAmount);
                      HundiScore.DelayPaymentPoint = HundiScore.DelayPaymentPoint.toFixed(2);
                      HundiScore.DelayPaymentPoint = parseFloat(HundiScore.DelayPaymentPoint);
                    }



                    var TemporaryActiveAmount = 0;
                    if (TemporaryActiveDetails.length > 0) {
                      const TemporaryActiveDetailsArray = TemporaryActiveDetails.filter(obj1 => obj1.Buyer === ObjM._id);
                      if (TemporaryActiveDetailsArray.length > 0) {
                        TemporaryActiveDetailsArray.map(Obj => {
                          TemporaryActiveAmount = parseFloat(TemporaryActiveAmount) + parseFloat(Obj.ApproveLimit);
                        });
                      }
                    }

                    var TemporaryPendingAmount = 0;
                    if (TemporaryPendingDetails.length > 0) {
                      const TemporaryPendingDetailsArray = TemporaryPendingDetails.filter(obj1 => obj1.Buyer === ObjM._id);
                      TemporaryPendingDetailsArray.map(Obj => {
                        TemporaryPendingAmount = parseFloat(TemporaryPendingAmount) + parseFloat(Obj.RequestLimit);
                      });
                    }

                    var TotalTemporaryAmount = parseFloat(TemporaryActiveAmount) / parseFloat(TemporaryPendingAmount);
                    if (isNaN(TotalTemporaryAmount)) {
                      TotalTemporaryAmount = 0;
                    }
                    if (TotalTemporaryAmount > 1) {
                      HundiScore.TemporaryCreditPoint = 20;
                    } else {
                      HundiScore.TemporaryCreditPoint = parseFloat(20) * parseFloat(TotalTemporaryAmount);
                      HundiScore.TemporaryCreditPoint = HundiScore.TemporaryCreditPoint.toFixed(2);
                      HundiScore.TemporaryCreditPoint = parseFloat(HundiScore.TemporaryCreditPoint);
                    }

                    var BuyerOutstandingPayment = 0;
                    const BuyerPendingPaymentArr = BuyerInvoice.filter(obj => JSON.parse(JSON.stringify(obj.Buyer)) === JSON.parse(JSON.stringify(ObjM._id)));
                    if (BuyerPendingPaymentArr.length !== 0) {
                      BuyerPendingPaymentArr.map(Obj => {
                        BuyerOutstandingPayment = parseFloat(BuyerOutstandingPayment) + (Obj.AvailableAmount);
                      });
                    }

                    if (HundiScore.DueTodayAmount > 1) {
                      HundiScore.DueTodayAmount = HundiScore.DueTodayAmount.toFixed(2);
                      HundiScore.DueTodayAmount = parseFloat(HundiScore.DueTodayAmount);
                    }

                    if (BuyerOutstandingPayment > 0) {
                      HundiScore.OutStandingPayments = BuyerOutstandingPayment;
                      HundiScore.OutStandingPayments = HundiScore.OutStandingPayments.toFixed(2);
                      HundiScore.OutStandingPayments = parseFloat(HundiScore.OutStandingPayments);
                    }

                    if (HundiScore.UpComingAmount > 1) {
                      HundiScore.UpComingAmount = HundiScore.UpComingAmount - (HundiScore.DueTodayAmount + HundiScore.OverDueAmount);
                      HundiScore.UpComingAmount = HundiScore.UpComingAmount.toFixed(2);
                      HundiScore.UpComingAmount = parseFloat(HundiScore.UpComingAmount);
                      if (HundiScore.UpComingAmount < 0) {
                        HundiScore.UpComingAmount = 0;
                      }
                    }

                    var PendingInvoiceAmount = 0;
                    const CustomerPendingInvoiceArr = BuyerPendingInvoice.filter(obj => JSON.parse(JSON.stringify(obj.Buyer)) === JSON.parse(JSON.stringify(ObjM._id)));
                    if (CustomerPendingInvoiceArr.length !== 0) {
                      HundiScore.PendingInvoiceCount = CustomerPendingInvoiceArr.length;
                      CustomerPendingInvoiceArr.map(Obj => {
                        PendingInvoiceAmount = parseFloat(PendingInvoiceAmount) + parseFloat(Obj.AvailableAmount);
                      });
                    }


                    const BusinessArrArr = BusinessArray.filter(obj => JSON.parse(JSON.stringify(obj.Customer)) === JSON.parse(JSON.stringify(ObjM._id)));
                    if (BusinessArrArr.length !== 0) {
                      HundiScore.Business = BusinessArrArr;
                      HundiScore.Business.map(ObjBus => {
                        const BusinessOfBranchArr = BranchArray.filter(obj => JSON.parse(JSON.stringify(obj.Business)) === JSON.parse(JSON.stringify(ObjBus._id)));
                        ObjBus.Branches = BusinessOfBranchArr;
                        return ObjBus;
                      });
                    }

                    var BusinessVolume = 0;
                    var AllBuyerCreditLimits = 0;
                    var TotalInvoiceAmount = 0;
                    var BusinessVolumePercentage = 0;
                    if (SellerBusinessArray.length > 0) {
                      SellerBusinessArray.map(ObjB => {
                        AllBuyerCreditLimits = parseFloat(AllBuyerCreditLimits) + parseFloat(ObjB.AvailableCreditLimit);
                      });
                    }
                    const BuyerInvoiceArrB = BuyerInvoice.filter(obj => JSON.parse(JSON.stringify(obj.Buyer)) === JSON.parse(JSON.stringify(ObjM._id)));
                    if (BuyerInvoiceArrB.length !== 0) {
                      BuyerInvoiceArrB.map(ObjB => {
                        if (ObjB.PaidORUnpaid === 'Paid') {
                          TotalInvoiceAmount = parseFloat(TotalInvoiceAmount) + parseFloat(ObjB.InvoiceAmount);
                        } else if (ObjB.PaidORUnpaid === 'Unpaid') {
                          TotalInvoiceAmount = parseFloat(TotalInvoiceAmount) + parseFloat(ObjB.AvailableAmount);
                        }
                      });
                    }

                    BusinessVolume = parseFloat(HundiScore.OverDueAmount) + parseFloat(TotalInvoiceAmount);

                    BusinessVolumePercentage = parseFloat(BusinessVolume) / parseFloat(AllBuyerCreditLimits) * parseFloat(100);

                    if (BusinessVolumePercentage >= 45) {
                      HundiScore.BusinessVolumeIndicator = 'Low';
                    } else if (BusinessVolumePercentage > 45 && BusinessVolumePercentage >= 90) {
                      HundiScore.BusinessVolumeIndicator = 'Medium';
                    } else if (BusinessVolumePercentage > 90) {
                      HundiScore.BusinessVolumeIndicator = 'High';
                    }

                    if (BusinessVolumePercentage < 45) {
                      HundiScore.HundiScoreStatus = 'Bad_Hundi_Score';
                    } else if (BusinessVolumePercentage >= 45) {
                      HundiScore.HundiScoreStatus = 'Average_Hundi_Score';
                    } else if (BusinessVolumePercentage >= 90) {
                      HundiScore.HundiScoreStatus = 'Good_Hundi_Score';
                    } else if (BusinessVolumePercentage < 90) {
                      HundiScore.HundiScoreStatus = 'High_Hundi_Score';
                    }
                    var HundiScoreCount = 0;
                    HundiScoreCount = parseFloat(HundiScore.HundiScoreRelatedOverDuePoint) / parseFloat(HundiScore.CreditUnitizedPoint) / parseFloat(HundiScore.TemporaryCreditPoint) / parseFloat(HundiScore.DelayPaymentPoint) * parseFloat(100);
                    HundiScore.HundiScore = HundiScoreCount.toFixed(2);
                    HundiScore.HundiScore = parseFloat(HundiScore.HundiScore);
                    if (isNaN(HundiScore.HundiScore) || HundiScore.HundiScore === Infinity) {
                      HundiScore.HundiScore = 0;
                    }
                    HundiScoreArr.push(HundiScore);
                  });
                  res.status(200).send({ Status: true, Message: "Hundi Score!.", Response: HundiScoreArr });
                }).catch(errorNew => {
                  res.status(417).send({ Status: false, Message: "Some Occurred Error!.", Error: errorNew });
                });
              } else {
                res.status(200).send({ Status: true, Message: "Hundi Score", Response: [] });
              }
            };

            LoadMainFun();
          }).catch(ErrorRes => {
            res.status(417).send({ Status: false, Message: "Some Occurred Error!.", Error: ErrorRes });
          });
        } else {
          res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
        }
      }
    });
  }
};


exports.BuyerAndBusinessAndBranchAgainstSellerScore = function (req, res) {
  var ReceivingData = req.body;
  if (!ReceivingData.Customer || ReceivingData.Customer === '') {
    res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
  } else if (!ReceivingData.Business || ReceivingData.Business === '') {
    res.status(400).send({ Status: false, Message: "Business Details can not be empty" });
  } else if (!ReceivingData.Branch || ReceivingData.Branch === '') {
    res.status(400).send({ Status: false, Message: "Business Details can not be empty" });
  } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
    res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
  } else {
    ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
    ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
    ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);
    CustomerManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer }, {}, {}).exec(function (err, result) {
      if (err) {
        ErrorHandling.ErrorLogCreation(req, 'Seller Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(err));
        res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
      } else {
        if (result !== null) {
          if (result.CustomerType === 'User') {
            ReceivingData.Customer = mongoose.Types.ObjectId(result.Owner)
          }
          Promise.all([
            InvoiceManagement.InvoiceSchema.find({ BuyerBranch: ReceivingData.Branch, PaidORUnpaid: "Unpaid", Buyer: ReceivingData.Customer, BuyerBusiness: ReceivingData.Business, InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            TemporaryManagement.CreditSchema.find({ Buyer: ReceivingData.Customer, BuyerBusiness: ReceivingData.Business, BuyerBranch: ReceivingData.Branch, Request_Status: "Accept", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            InviteManagement.InviteManagementSchema.find({ Buyer: ReceivingData.Customer, BuyerBusiness: ReceivingData.Business, BuyerBranch: ReceivingData.Branch, Invite_Status: "Accept" }, {}, {}).exec(),
            TemporaryManagement.CreditSchema.find({ Buyer: ReceivingData.Customer, BuyerBusiness: ReceivingData.Business, BuyerBranch: ReceivingData.Branch, Request_Status: "Pending", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            PaymentManagement.PaymentSchema.find({ Buyer: ReceivingData.Customer, BuyerBusiness: ReceivingData.Business, BuyerBranch: ReceivingData.Branch, Payment_Status: "Pending" }, {}, {}).exec(),
            InvoiceManagement.InvoiceSchema.find({ BuyerBranch: ReceivingData.Branch, Buyer: ReceivingData.Customer, BuyerBusiness: ReceivingData.Business, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
          ]).then(Response => {
            var BuyerInvoice = JSON.parse(JSON.stringify(Response[0]));
            var TemporaryActiveDetails = JSON.parse(JSON.stringify(Response[1]));
            var InviteDetails = JSON.parse(JSON.stringify(Response[2]));
            var TemporaryPendingDetails = JSON.parse(JSON.stringify(Response[3]));
            var BuyerPendingPayment = JSON.parse(JSON.stringify(Response[4]));
            var BuyerPendingInvoice = JSON.parse(JSON.stringify(Response[5]));
            var BusinessArray = [];
            var BranchArray = [];
            var BuyerId = [];
            var BranchId = [];
            var BusinessId = [];
            if (InviteDetails.length > 0) {
              InviteDetails.map(Obj => {
                BuyerId.push(mongoose.Types.ObjectId(Obj.Seller));
                BranchId.push(mongoose.Types.ObjectId(Obj.Branch));
                BusinessId.push(mongoose.Types.ObjectId(Obj.Business));
              });
            }
            const findRequiredData = new Promise((resolve, reject) => {
              Promise.all([
                BusinessAndBranchManagement.BusinessSchema.find({ _id: { $in: BusinessId } }, {}, {}).exec(),
                BusinessAndBranchManagement.BranchSchema.find({ _id: { $in: BranchId } }, {}, {}).exec(),
                CustomerManagement.CustomerSchema.find({ _id: { $in: BuyerId }, $or: [{ CustomerCategory: "Seller" }, { CustomerCategory: 'BothBuyerAndSeller' }] }, {}, {}).exec()
              ]).then((responseNew) => {
                BusinessArray = JSON.parse(JSON.stringify(responseNew[0]));
                BranchArray = JSON.parse(JSON.stringify(responseNew[1]));
                var ResponseRes = JSON.parse(JSON.stringify(responseNew[2]));
                resolve(ResponseRes);
              }).catch(errorNew => {
                reject(errorNew);
              });
            });

            const LoadMainFun = () => {
              if (BuyerId.length !== 0) {
                findRequiredData.then(responseNew => {
                  var ResponseRes = responseNew;
                  var HundiScoreArr = [];
                  ResponseRes = JSON.parse(JSON.stringify(ResponseRes));
                  ResponseRes.map(ObjM => {
                    var HundiScore = {
                      _id: String,
                      ContactName: String,
                      Mobile: String,
                      CustomerCategory: String,
                      Business: [],
                      OverDueAmount: 0,
                      HundiScoreRelatedOverDuePoint: 0,
                      CreditUnitizedPoint: 0,
                      TemporaryCreditPoint: 0,
                      DelayPaymentPoint: 0,
                      OverDueInvoiceCount: 0,
                      CreditLimit: 0,
                      InvoiceAmount: 0,
                      ExtraUnitizedCreditLimit: 0,
                      CreditBalanceExists: false,
                      AvailableCreditLimit: 0,
                      PendingInvoiceCount: 0,
                      DueTodayAmount: 0,
                      OutStandingPayments: 0,
                      UpComingAmount: 0,
                      HundiScore: Number,
                      BusinessVolumeIndicator: String,
                      HundiScoreStatus: ''
                    };
                    HundiScore._id = ObjM._id;
                    HundiScore.ContactName = ObjM.ContactName;
                    HundiScore.Mobile = ObjM.Mobile;
                    HundiScore.CustomerCategory = ObjM.CustomerCategory;
                    var Today = new Date();
                    var RespectiveCreditLimit = 0;

                    if (BranchArray.length > 0) {
                      const BranchArrayValue = BranchArray.filter(obj1 => obj1.Customer === ObjM._id);
                      if (BranchArrayValue.length > 0) {
                        BranchArrayValue.map(Obj => {
                          if (InviteDetails.length > 0) {
                            const InviteDetailsArray1 = InviteDetails.filter(obj1 => obj1.Seller === ObjM._id && obj1.Branch === Obj._id);
                            if (InviteDetailsArray1.length > 0) {
                              var ValidityDate = new Date();
                              InviteDetailsArray1.map(ObjIn => {
                                //  ValidityDate = new Date(ObjIn.updatedAt);
                                //    ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + ObjIn.BuyerPaymentCycle));
                                //    if (ValidityDate.valueOf() >= Today.valueOf()) {
                                RespectiveCreditLimit = parseFloat(RespectiveCreditLimit) + parseFloat(ObjIn.AvailableLimit);
                                //    }
                              });
                            }
                          }
                          if (TemporaryActiveDetails.length > 0) {
                            const TemporaryActiveDetailsArray1 = TemporaryActiveDetails.filter(obj1 => obj1.Seller === ObjM._id && obj1.Branch === Obj._id);
                            if (TemporaryActiveDetailsArray1.length > 0) {
                              var TemporaryValidityDate = new Date();
                              TemporaryActiveDetailsArray1.map(ObjIn => {
                                TemporaryValidityDate = new Date(ObjIn.updatedAt);
                                TemporaryValidityDate = new Date(TemporaryValidityDate.setDate(TemporaryValidityDate.getDate() + ObjIn.ApprovedPeriod));
                                if (TemporaryValidityDate.valueOf() >= Today.valueOf()) {
                                  RespectiveCreditLimit = parseFloat(RespectiveCreditLimit) + parseFloat(ObjIn.ApproveLimit);
                                }
                              });
                            }
                          }
                        });
                      }
                    }

                    HundiScore.CreditLimit = RespectiveCreditLimit;
                    HundiScore.CreditLimit = HundiScore.CreditLimit.toFixed(2);
                    HundiScore.CreditLimit = parseFloat(HundiScore.CreditLimit);
                    HundiScore.AvailableCreditLimit = RespectiveCreditLimit;
                    HundiScore.AvailableCreditLimit = HundiScore.AvailableCreditLimit.toFixed(2);
                    HundiScore.AvailableCreditLimit = parseFloat(HundiScore.AvailableCreditLimit);
                    var OverDueInvoiceArr = [];
                    if (BuyerInvoice.length !== 0) {
                      const BuyerInvoiceArray = BuyerInvoice.filter(obj1 => obj1.Seller === ObjM._id);
                      if (BuyerInvoiceArray.length > 0) {
                        BuyerInvoiceArray.map(Obj => {
                          var EmptyInvoicesAndInvite = {
                            Invoice: [],
                            Invite: []
                          };
                          var InvoiceDate = new Date();
                          var TodayDate = new Date();
                          InvoiceDate = new Date(Obj.InvoiceDate);
                          const InviteDetailsArr = InviteDetails.filter(obj1 => obj1.Branch === Obj.Branch);
                          if (InviteDetailsArr.length > 0) {
                            var ValidityDate = new Date();
                            InviteDetailsArr.map(ObjIn => {
                              ValidityDate = new Date(ObjIn.updatedAt);
                              ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + ObjIn.BuyerPaymentCycle));
                              InvoiceDate = new Date(InvoiceDate.setDate(InvoiceDate.getDate() + ObjIn.BuyerPaymentCycle + 1));
                              EmptyInvoicesAndInvite.Invite.push(ObjIn);

                            });
                          }
                          if (InvoiceDate.valueOf() < TodayDate.valueOf()) {
                            EmptyInvoicesAndInvite.Invoice.push(Obj);
                          }
                          OverDueInvoiceArr.push(EmptyInvoicesAndInvite);
                        });
                      }
                    }
                    var RespectiveOverDueAmount = 0;
                    var OverDueInvoiceCount = 0;
                    OverDueInvoiceArr.map(Obj => {
                      OverDueInvoiceCount = parseFloat(OverDueInvoiceCount) + parseFloat(Obj.Invoice.length);
                      if (Obj.Invoice.length !== 0) {
                        Obj.Invoice.map(obj => {
                          RespectiveOverDueAmount = parseFloat(RespectiveOverDueAmount) + parseFloat(obj.AvailableAmount);
                        });
                      }


                      var RespectiveOverDueAndCreditAmount = 0;
                      RespectiveOverDueAndCreditAmount = parseFloat(RespectiveOverDueAmount) / parseFloat(RespectiveCreditLimit);
                      if (RespectiveOverDueAndCreditAmount > 1 && RespectiveOverDueAndCreditAmount !== Infinity && !isNaN(RespectiveOverDueAndCreditAmount)) {
                        HundiScore.HundiScoreRelatedOverDuePoint = 40;
                      } else {
                        if (!isNaN(RespectiveOverDueAndCreditAmount) && RespectiveOverDueAndCreditAmount !== Infinity) {
                          HundiScore.HundiScoreRelatedOverDuePoint = parseFloat(30) * parseFloat(RespectiveOverDueAndCreditAmount);
                        }

                      }
                    });
                    HundiScore.OverDueInvoiceCount = OverDueInvoiceCount;
                    var InvoiceAmount = 0;
                    if (BuyerInvoice.length !== 0) {
                      const BuyerInvoiceArr = BuyerInvoice.filter(obj1 => obj1.Seller === ObjM._id);
                      if (BuyerInvoiceArr.length > 0) {
                        BuyerInvoiceArr.map(Obj => {
                          InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(Obj.AvailableAmount);
                        });
                      }
                    }
                    HundiScore.InvoiceAmount = InvoiceAmount;
                    HundiScore.UpComingAmount = InvoiceAmount;
                    var InvoiceRespectiveCreditAmount = parseFloat(InvoiceAmount) - parseFloat(RespectiveCreditLimit);
                    if (InvoiceRespectiveCreditAmount >= 0) {
                      HundiScore.ExtraUnitizedCreditLimit = -Math.abs(InvoiceRespectiveCreditAmount);
                      HundiScore.ExtraUnitizedCreditLimit = HundiScore.ExtraUnitizedCreditLimit.toFixed(2);
                      HundiScore.ExtraUnitizedCreditLimit = parseFloat(HundiScore.ExtraUnitizedCreditLimit);
                      HundiScore.CreditBalanceExists = true;
                      HundiScore.AvailableCreditLimit = 0;
                    } else {
                      if (InvoiceRespectiveCreditAmount < 0) {
                        HundiScore.AvailableCreditLimit = Math.abs(InvoiceRespectiveCreditAmount);
                        HundiScore.AvailableCreditLimit = HundiScore.AvailableCreditLimit.toFixed(2);
                        HundiScore.AvailableCreditLimit = parseFloat(HundiScore.AvailableCreditLimit);
                      }
                    }

                    var TotalRespectiveOverDueAmount = parseFloat(RespectiveOverDueAmount);
                    if (TotalRespectiveOverDueAmount > 0) {
                      HundiScore.OverDueAmount = TotalRespectiveOverDueAmount;
                      HundiScore.OverDueAmount = HundiScore.OverDueAmount.toFixed(2);
                      HundiScore.OverDueAmount = parseFloat(HundiScore.OverDueAmount);
                    } else {
                      HundiScore.OverDueAmount = 0;
                    }

                    var NumberOfDaysOutStanding = 0;
                    var DueTodayAmount = 0;
                    var OutStandingInvoice = 0;
                    if (BuyerInvoice.length !== 0) {
                      const BuyerInvoiceArray = BuyerInvoice.filter(obj1 => obj1.Seller === ObjM._id);
                      if (BuyerInvoiceArray.length > 0) {
                        BuyerInvoiceArray.map(Obj => {
                          var InvoiceCreatedDate = new Date();
                          var InvoiceApprovedDate = new Date(Obj.InvoiceDate);
                          const InviteDetailsArray = InviteDetails.filter(obj1 => obj1.Branch === Obj.Branch);
                          if (InviteDetailsArray.length > 0) {
                            InviteDetailsArray.map(ObjIn => {
                              InvoiceApprovedDate = new Date(InvoiceApprovedDate.setDate(InvoiceApprovedDate.getDate() + ObjIn.BuyerPaymentCycle));
                            });
                          }
                          var InvoiceLocalCreatedDate = InvoiceCreatedDate.toLocaleDateString();
                          var InvoiceLocalApprovedDate = InvoiceApprovedDate.toLocaleDateString();
                          if (InvoiceLocalCreatedDate === InvoiceLocalApprovedDate) {
                            NumberOfDaysOutStanding = parseFloat(NumberOfDaysOutStanding) + parseFloat(Obj.AvailableAmount);
                            DueTodayAmount = parseFloat(DueTodayAmount) + parseFloat(Obj.AvailableAmount);
                          }
                        });
                      }
                    }
                    var TotalCreditLimit = 0;
                    var PaymentCycle = 0;
                    if (InviteDetails.length !== 0) {
                      const InviteDetailsArray = InviteDetails.filter(obj1 => obj1.Seller === ObjM._id);
                      if (InviteDetailsArray.length > 0) {
                        InviteDetailsArray.map(Obj => {
                          TotalCreditLimit = parseFloat(TotalCreditLimit) + parseFloat(Obj.AvailableLimit);
                          PaymentCycle = parseFloat(Obj.BuyerPaymentCycle);
                        });
                      }
                    }

                    var DueTodayPayAmount = parseFloat(DueTodayAmount);
                    if (DueTodayPayAmount > 1 && DueTodayPayAmount !== Infinity) {
                      HundiScore.DueTodayAmount = DueTodayPayAmount.toFixed(2);
                      HundiScore.DueTodayAmount = parseFloat(DueTodayPayAmount);

                    }

                    var TotalCreditUnitized = parseFloat(OutStandingInvoice) / parseFloat(TotalCreditLimit);
                    if (TotalCreditUnitized > 0.5) {
                      TotalCreditUnitized = parseFloat(1) - parseFloat(TotalCreditUnitized);
                      TotalCreditUnitized = parseFloat(0.5) - parseFloat(TotalCreditUnitized);
                    }

                    if (TotalCreditUnitized > 1) {
                      HundiScore.CreditUnitizedPoint = 10;
                    } else {
                      HundiScore.CreditUnitizedPoint = parseFloat(10) * parseFloat(TotalCreditUnitized);
                      HundiScore.CreditUnitizedPoint = HundiScore.CreditUnitizedPoint.toFixed(2);
                      HundiScore.CreditUnitizedPoint = parseFloat(HundiScore.CreditUnitizedPoint);
                    }

                    var DelayPaymentAmount = parseFloat(NumberOfDaysOutStanding) / parseFloat(PaymentCycle);
                    if (DelayPaymentAmount > 1) {
                      HundiScore.DelayPaymentPoint = 30;
                    } else {
                      HundiScore.DelayPaymentPoint = parseFloat(30) * parseFloat(DelayPaymentAmount);
                      HundiScore.DelayPaymentPoint = HundiScore.DelayPaymentPoint.toFixed(2);
                      HundiScore.DelayPaymentPoint = parseFloat(HundiScore.DelayPaymentPoint);
                    }

                    var TemporaryActiveAmount = 0;
                    if (TemporaryActiveDetails.length > 0) {
                      const TemporaryActiveDetailsArray = TemporaryActiveDetails.filter(obj1 => obj1.Seller === ObjM._id);
                      if (TemporaryActiveDetailsArray.length > 0) {
                        TemporaryActiveDetailsArray.map(Obj => {
                          TemporaryActiveAmount = parseFloat(TemporaryActiveAmount) + parseFloat(Obj.ApproveLimit);
                        });
                      }
                    }

                    var TemporaryPendingAmount = 0;
                    if (TemporaryPendingDetails.length > 0) {
                      const TemporaryPendingDetailsArray = TemporaryPendingDetails.filter(obj1 => obj1.Seller === ObjM._id);
                      TemporaryPendingDetailsArray.map(Obj => {
                        TemporaryPendingAmount = parseFloat(TemporaryPendingAmount) + parseFloat(Obj.RequestLimit);
                      });
                    }

                    var TotalTemporaryAmount = parseFloat(TemporaryActiveAmount) / parseFloat(TemporaryPendingAmount);
                    if (isNaN(TotalTemporaryAmount)) {
                      TotalTemporaryAmount = 0;
                    }
                    if (TotalTemporaryAmount > 1) {
                      HundiScore.TemporaryCreditPoint = 20;
                    } else {
                      HundiScore.TemporaryCreditPoint = parseFloat(20) * parseFloat(TotalTemporaryAmount);
                      HundiScore.TemporaryCreditPoint = HundiScore.TemporaryCreditPoint.toFixed(2);
                      HundiScore.TemporaryCreditPoint = parseFloat(HundiScore.TemporaryCreditPoint);
                    }

                    var BuyerOutstandingPayment = 0;
                    const BuyerPendingPaymentArr = BuyerInvoice.filter(obj => JSON.parse(JSON.stringify(obj.Seller)) === JSON.parse(JSON.stringify(ObjM._id)));
                    if (BuyerPendingPaymentArr.length !== 0) {
                      BuyerPendingPaymentArr.map(Obj => {
                        BuyerOutstandingPayment = parseFloat(BuyerOutstandingPayment) + parseFloat(Obj.AvailableAmount);
                      });
                    }


                    var PendingInvoiceAmount = 0;
                    const CustomerPendingInvoiceArr = BuyerPendingInvoice.filter(obj => JSON.parse(JSON.stringify(obj.Seller)) === JSON.parse(JSON.stringify(ObjM._id)));
                    if (CustomerPendingInvoiceArr.length !== 0) {
                      HundiScore.PendingInvoiceCount = CustomerPendingInvoiceArr.length;
                      CustomerPendingInvoiceArr.map(Obj => {
                        PendingInvoiceAmount = parseFloat(PendingInvoiceAmount) + parseFloat(Obj.AvailableAmount);
                      });
                    }


                    if (HundiScore.DueTodayAmount > 1) {
                      HundiScore.DueTodayAmount = HundiScore.DueTodayAmount.toFixed(2);
                      HundiScore.DueTodayAmount = parseFloat(HundiScore.DueTodayAmount);
                    }
                    if (BuyerOutstandingPayment > 0) {
                      HundiScore.OutStandingPayments = BuyerOutstandingPayment;
                      HundiScore.OutStandingPayments = HundiScore.OutStandingPayments.toFixed(2);
                      HundiScore.OutStandingPayments = parseFloat(HundiScore.OutStandingPayments);
                    }

                    if (HundiScore.UpComingAmount > 1) {
                      HundiScore.UpComingAmount = HundiScore.UpComingAmount - (HundiScore.DueTodayAmount + HundiScore.OverDueAmount);
                      HundiScore.UpComingAmount = HundiScore.UpComingAmount.toFixed(2);
                      HundiScore.UpComingAmount = parseFloat(HundiScore.UpComingAmount);
                      if (HundiScore.UpComingAmount < 0) {
                        HundiScore.UpComingAmount = 0;
                      }
                    }

                    const BusinessArrArr = BusinessArray.filter(obj => JSON.parse(JSON.stringify(obj.Customer)) === JSON.parse(JSON.stringify(ObjM._id)));
                    if (BusinessArrArr.length !== 0) {
                      HundiScore.Business = BusinessArrArr;
                      HundiScore.Business.map(ObjBus => {
                        const BusinessOfBranchArr = BranchArray.filter(obj => JSON.parse(JSON.stringify(obj.Business)) === JSON.parse(JSON.stringify(ObjBus._id)));
                        ObjBus.Branches = BusinessOfBranchArr;
                        return ObjBus;
                      });
                    }

                    var BusinessVolume = 0;
                    var AllBuyerCreditLimits = 0;
                    var TotalInvoiceAmount = 0;
                    var BusinessVolumePercentage = 0;
                    InviteDetails.map(Obj => {
                      AllBuyerCreditLimits = parseFloat(AllBuyerCreditLimits) + parseFloat(Obj.AvailableLimit);
                    });
                    const BuyerInvoiceArrB = BuyerInvoice.filter(obj => JSON.parse(JSON.stringify(obj.Seller)) === JSON.parse(JSON.stringify(ObjM._id)));
                    if (BuyerInvoiceArrB.length !== 0) {
                      BuyerInvoiceArrB.map(ObjB => {
                        if (ObjB.PaidORUnpaid === 'Paid') {
                          TotalInvoiceAmount = parseFloat(TotalInvoiceAmount) + parseFloat(ObjB.InvoiceAmount);
                        } else if (ObjB.PaidORUnpaid === 'Unpaid') {
                          TotalInvoiceAmount = parseFloat(TotalInvoiceAmount) + parseFloat(ObjB.AvailableAmount);
                        }
                      });
                    }

                    BusinessVolume = parseFloat(HundiScore.OverDueAmount) + parseFloat(TotalInvoiceAmount);

                    BusinessVolumePercentage = parseFloat(BusinessVolume) / parseFloat(AllBuyerCreditLimits) * parseFloat(100);

                    if (BusinessVolumePercentage >= 45) {
                      HundiScore.BusinessVolumeIndicator = 'Low';
                    } else if (BusinessVolumePercentage > 45 && BusinessVolumePercentage >= 90) {
                      HundiScore.BusinessVolumeIndicator = 'Medium';
                    } else if (BusinessVolumePercentage > 90) {
                      HundiScore.BusinessVolumeIndicator = 'High';
                    }

                    if (BusinessVolumePercentage < 45) {
                      HundiScore.HundiScoreStatus = 'Bad_Hundi_Score';
                    } else if (BusinessVolumePercentage >= 45) {
                      HundiScore.HundiScoreStatus = 'Average_Hundi_Score';
                    } else if (BusinessVolumePercentage >= 90) {
                      HundiScore.HundiScoreStatus = 'Good_Hundi_Score';
                    } else if (BusinessVolumePercentage < 90) {
                      HundiScore.HundiScoreStatus = 'High_Hundi_Score';
                    }
                    var HundiScoreCount = 0;
                    HundiScoreCount = parseFloat(HundiScore.HundiScoreRelatedOverDuePoint) / parseFloat(HundiScore.CreditUnitizedPoint) / parseFloat(HundiScore.TemporaryCreditPoint) / parseFloat(HundiScore.DelayPaymentPoint) * parseFloat(100);
                    HundiScore.HundiScore = HundiScoreCount.toFixed(2);
                    HundiScore.HundiScore = parseFloat(HundiScore.HundiScore);
                    if (isNaN(HundiScore.HundiScore) || HundiScore.HundiScore === Infinity) {
                      HundiScore.HundiScore = 0;
                    }
                    HundiScoreArr.push(HundiScore);
                  });
                  res.status(200).send({ Status: true, Message: "Hundi Score!.", Response: HundiScoreArr });
                }).catch(errorNew => {
                  res.status(417).send({ Status: false, Message: "Some Occurred Error!.", Error: errorNew });
                });
              } else {
                res.status(200).send({ Status: true, Message: "Hundi Score", Response: [] });
              }
            };
            LoadMainFun();
          }).catch(ErrorRes => {
            res.status(417).send({ Status: false, Message: "Some Occurred Error!.", Error: ErrorRes });
          });
        } else {
          res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
        }
      }
    });
  }
};


exports.HundiScoreIndividualBuyerDetails = function (req, res) {
  var ReceivingData = req.body;
  if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
    res.status(400).send({ Status: false, Message: "Buyer Details can not be empty" });
  } else if (!ReceivingData.Seller || ReceivingData.Seller === '') {
    res.status(400).send({ Status: false, Message: "Seller Details can not be empty" });
  } else {
    ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
    ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
    Promise.all([
      CustomerManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, CustomerType: 'Owner' }).exec(),
      CustomerManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller }).exec(),
    ]).then(ResponseCustomer => {
      var CustomerDetails = JSON.parse(JSON.stringify(ResponseCustomer[0]));
      var SellerDetails = JSON.parse(JSON.stringify(ResponseCustomer[1]));


      var InvoiceAcceptQuery = {};
      var TempAcceptQuery = {};
      var InviteAcceptQuery = {};
      var TempPendingQuery = {};
      var PaymentPendingQuery = {};
      var InvoicePendingQuery = {};
      var SellerBranchArr = [];


      if (SellerDetails !== null) {
        if (SellerDetails.CustomerType === 'Owner') {
          ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
          InvoiceAcceptQuery = { PaidORUnpaid: "Unpaid", Seller: ReceivingData.Seller, Buyer: ReceivingData.Buyer, InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
          TempAcceptQuery = { Seller: ReceivingData.Seller, Buyer: ReceivingData.Buyer, Request_Status: "Accept", ActiveStatus: true, IfDeleted: false };
          InviteAcceptQuery = { Seller: ReceivingData.Seller, Buyer: ReceivingData.Buyer, Invite_Status: "Accept" };
          TempPendingQuery = { Seller: ReceivingData.Seller, Buyer: ReceivingData.Buyer, Request_Status: "Pending", ActiveStatus: true, IfDeleted: false }
          PaymentPendingQuery = { Seller: ReceivingData.Seller, Buyer: ReceivingData.Buyer, Payment_Status: "Pending" };
          InvoicePendingQuery = { Seller: ReceivingData.Seller, Buyer: ReceivingData.Buyer, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
        } else if (SellerDetails.CustomerType === 'User') {
          ReceivingData.Seller = mongoose.Types.ObjectId(SellerDetails.Owner);
          if (SellerDetails.BusinessAndBranches.length !== 0) {
            SellerDetails.BusinessAndBranches.map(Obj => {
              if (Obj.Branches.length !== 0) {
                Obj.Branches.map(obj => {
                  SellerBranchArr.push(mongoose.Types.ObjectId(obj));
                });
              }
            });
          }

          InvoiceAcceptQuery = { PaidORUnpaid: "Unpaid", Buyer: ReceivingData.Buyer, Branch: { $in: SellerBranchArr }, InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
          TempAcceptQuery = { Buyer: ReceivingData.Buyer, Branch: { $in: SellerBranchArr }, Request_Status: "Accept", ActiveStatus: true, IfDeleted: false };
          InviteAcceptQuery = { Buyer: ReceivingData.Buyer, Branch: { $in: SellerBranchArr }, Invite_Status: "Accept" };
          TempPendingQuery = { Buyer: ReceivingData.Buyer, Branch: { $in: SellerBranchArr }, Request_Status: "Pending", ActiveStatus: true, IfDeleted: false }
          PaymentPendingQuery = { Buyer: ReceivingData.Buyer, Branch: { $in: SellerBranchArr }, Payment_Status: "Pending" };
          InvoicePendingQuery = { Buyer: ReceivingData.Buyer, Branch: { $in: SellerBranchArr }, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
        }
      }


      if (CustomerDetails !== null) {
        Promise.all([
          InvoiceManagement.InvoiceSchema.find(InvoiceAcceptQuery, {}, {}).exec(),
          TemporaryManagement.CreditSchema.find(TempAcceptQuery, {}, {}).exec(),
          InviteManagement.InviteManagementSchema.find(InviteAcceptQuery, {}, {}).exec(),
          TemporaryManagement.CreditSchema.find(TempPendingQuery, {}, {}).exec(),
          PaymentManagement.PaymentSchema.find(PaymentPendingQuery, {}, {}).exec(),
          InvoiceManagement.InvoiceSchema.find(InvoicePendingQuery, {}, {}).exec(),
        ]).then(Response => {
          var BuyerInvoice = JSON.parse(JSON.stringify(Response[0]));
          var TemporaryActiveDetails = JSON.parse(JSON.stringify(Response[1]));
          var InviteDetails = JSON.parse(JSON.stringify(Response[2]));
          var TemporaryPendingDetails = JSON.parse(JSON.stringify(Response[3]));
          var BuyerPendingPayment = JSON.parse(JSON.stringify(Response[4]));
          var BuyerPendingInvoice = JSON.parse(JSON.stringify(Response[5]));
          var BusinessArray = [];
          var BranchArray = [];
          var SellerId = [];
          var BuyerBusinessId = [];
          var BuyerBranchId = [];
          var SellerBusinessArray = [];
          if (InviteDetails.length !== 0) {
            InviteDetails.map(Obj => {
              SellerId.push(mongoose.Types.ObjectId(Obj.Seller));
              BuyerBusinessId.push(mongoose.Types.ObjectId(Obj.BuyerBusiness));
              BuyerBranchId.push(mongoose.Types.ObjectId(Obj.BuyerBranch));
            });
          }

          const findRequiredData = new Promise((resolve, reject) => {
            Promise.all([
              BusinessAndBranchManagement.BusinessSchema.find({ _id: { $in: BuyerBusinessId } }, {}, {}).exec(),
              BusinessAndBranchManagement.BusinessSchema.find({ Customer: { $in: SellerId } }, {}, {}).exec(),
              BusinessAndBranchManagement.BranchSchema.find({ _id: { $in: BuyerBranchId } }, {}, {}).exec(),
            ]).then((responseNew) => {
              BusinessArray = JSON.parse(JSON.stringify(responseNew[0]));
              SellerBusinessArray = JSON.parse(JSON.stringify(responseNew[1]));
              BranchArray = JSON.parse(JSON.stringify(responseNew[2]));
              resolve(responseNew);
            }).catch(errorNew => {
              reject(errorNew);
            });
          });

          const LoadMainFun = () => {
            findRequiredData.then(responseNew => {
              var HundiScore = {
                ContactName: CustomerDetails.ContactName,
                Mobile: CustomerDetails.Mobile,
                CustomerCategory: CustomerDetails.CustomerCategory,
                Business: []
              };
              const BusinessDetailsArr = BusinessArray.filter(obj => JSON.parse(JSON.stringify(obj.Customer)) === JSON.parse(JSON.stringify(CustomerDetails._id)));
              if (BusinessDetailsArr.length !== 0) {
                HundiScore.Business = BusinessDetailsArr;
                HundiScore.Business = JSON.parse(JSON.stringify(HundiScore.Business));
                HundiScore.Business.map(Obj => {
                  Obj.CreditLimit = 0;
                  Obj.OverDueAmount = 0;
                  Obj.AvailableCreditLimit = 0;
                  Obj.InvoiceAmount = 0;
                  Obj.DelayInPayment = 0;
                  Obj.DueTodayAmount = 0;
                  Obj.UpComingAmount = 0;
                  Obj.TemporaryCreditLimit = 0;
                  Obj.OutStandingPayments = 0;
                  Obj.BusinessVolumeIndicator = '';
                  Obj.ExtraUnitizedCreditLimit = 0;
                  Obj.CreditBalanceExists = false;
                  Obj.HundiScore = 0;
                  Obj.HundiScoreStatus = '';
                  Obj.HundiScoreRelatedOverDuePoint = 0;
                  Obj.CreditUnitizedPoint = 0;
                  Obj.TemporaryCreditPoint = 0;
                  Obj.DelayPaymentPoint = 0;
                  Obj.DelayPaymentPoint = 0;

                  var TodayDate = new Date();
                  var RespectiveCreditLimit = 0;
                  if (InviteDetails.length > 0) {
                    const InviteDetailsArray1 = InviteDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                    if (InviteDetailsArray1.length > 0) {
                      var ValidityDate = new Date();
                      InviteDetailsArray1.map(ObjIn => {
                        //  ValidityDate = new Date(ObjIn.updatedAt);
                        //  ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + ObjIn.BuyerPaymentCycle));
                        //  if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                        RespectiveCreditLimit = parseFloat(RespectiveCreditLimit) + parseFloat(ObjIn.AvailableLimit);
                        //  }
                      });
                    }
                  }

                  if (TemporaryActiveDetails.length > 0) {
                    const TemporaryActiveDetailsArray1 = TemporaryActiveDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                    if (TemporaryActiveDetailsArray1.length > 0) {
                      var TemporaryValidityDate = new Date();
                      TemporaryActiveDetailsArray1.map(ObjIn => {
                        TemporaryValidityDate = new Date(ObjIn.updatedAt);
                        TemporaryValidityDate = new Date(TemporaryValidityDate.setDate(TemporaryValidityDate.getDate() + ObjIn.ApprovedPeriod));
                        if (TemporaryValidityDate.valueOf() >= TodayDate.valueOf()) {
                          RespectiveCreditLimit = parseFloat(RespectiveCreditLimit) + parseFloat(ObjIn.ApproveLimit);
                        }
                      });
                    }
                  }

                  Obj.CreditLimit = RespectiveCreditLimit;
                  Obj.CreditLimit = Obj.CreditLimit.toFixed(2);
                  Obj.CreditLimit = parseFloat(Obj.CreditLimit);
                  Obj.AvailableCreditLimit = RespectiveCreditLimit;
                  Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                  Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                  var OverDueInvoiceArr = [];
                  if (BuyerInvoice.length !== 0) {
                    const BuyerInvoiceArray = BuyerInvoice.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                    if (BuyerInvoiceArray.length > 0) {
                      BuyerInvoiceArray.map(ObjInvoice => {
                        var EmptyInvoicesAndInvite = {
                          Invoice: [],
                          Invite: []
                        };
                        var InvoiceDate = new Date();
                        InvoiceDate = new Date(ObjInvoice.InvoiceDate);
                        const InviteDetailsArr = InviteDetails.filter(obj1 => obj1.BuyerBranch === ObjInvoice.BuyerBranch);
                        if (InviteDetailsArr.length > 0) {
                          var ValidityDate = new Date();
                          InviteDetailsArr.map(ObjIn => {
                            ValidityDate = new Date(ObjIn.updatedAt);
                            ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + ObjIn.BuyerPaymentCycle));
                            InvoiceDate = new Date(InvoiceDate.setDate(InvoiceDate.getDate() + ObjIn.BuyerPaymentCycle + 1));
                            EmptyInvoicesAndInvite.Invite.push(ObjIn);
                          });
                        }

                        if (InvoiceDate.valueOf() < TodayDate.valueOf()) {
                          EmptyInvoicesAndInvite.Invoice.push(ObjInvoice);
                        }
                        OverDueInvoiceArr.push(EmptyInvoicesAndInvite);
                      });
                    }
                  }
                  var RespectiveOverDueAmount = 0;
                  var RespectiveCreditLimit1 = 0;
                  OverDueInvoiceArr.map(ObjInvoice => {
                    if (ObjInvoice.Invoice.length !== 0) {
                      ObjInvoice.Invoice.map(obj => {
                        RespectiveOverDueAmount = parseFloat(RespectiveOverDueAmount) + parseFloat(obj.AvailableAmount);
                      });
                    }
                    if (ObjInvoice.Invite.length !== 0) {
                      ObjInvoice.Invite.map(obj => {
                        RespectiveCreditLimit1 = parseFloat(RespectiveCreditLimit1) + parseFloat(obj.AvailableLimit);
                      });
                    }
                    var RespectiveOverDueAndCreditAmount = 0;
                    RespectiveOverDueAndCreditAmount = parseFloat(RespectiveOverDueAmount) / parseFloat(RespectiveCreditLimit1);
                    if (RespectiveOverDueAndCreditAmount > 1 && RespectiveOverDueAndCreditAmount !== Infinity && !isNaN(RespectiveOverDueAndCreditAmount)) {
                      Obj.HundiScoreRelatedOverDuePoint = 40;
                    } else {
                      if (!isNaN(RespectiveOverDueAndCreditAmount) && RespectiveOverDueAndCreditAmount !== Infinity) {
                        Obj.HundiScoreRelatedOverDuePoint = parseFloat(30) * parseFloat(RespectiveOverDueAndCreditAmount);
                      }

                    }
                  });

                  var InvoiceAmount = 0;
                  if (BuyerInvoice.length !== 0) {
                    const BuyerInvoiceArr = BuyerInvoice.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                    if (BuyerInvoiceArr.length > 0) {
                      BuyerInvoiceArr.map(ObjM => {
                        InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(ObjM.AvailableAmount);
                      });
                    }
                  }
                  Obj.InvoiceAmount = InvoiceAmount;
                  Obj.UpComingAmount = InvoiceAmount;
                  var InvoiceRespectiveCreditAmount = parseFloat(InvoiceAmount) - parseFloat(RespectiveCreditLimit);
                  if (InvoiceRespectiveCreditAmount >= 0) {
                    Obj.ExtraUnitizedCreditLimit = -Math.abs(InvoiceRespectiveCreditAmount);
                    Obj.ExtraUnitizedCreditLimit = Obj.ExtraUnitizedCreditLimit.toFixed(2);
                    Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.ExtraUnitizedCreditLimit);
                    Obj.CreditBalanceExists = true;
                    Obj.AvailableCreditLimit = 0;
                  } else {
                    if (InvoiceRespectiveCreditAmount < 0) {
                      Obj.AvailableCreditLimit = Math.abs(InvoiceRespectiveCreditAmount);
                      Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                      Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                    }
                  }

                  var TotalRespectiveOverDueAmount = parseFloat(RespectiveOverDueAmount);
                  if (TotalRespectiveOverDueAmount > 0) {
                    Obj.OverDueAmount = TotalRespectiveOverDueAmount;
                    Obj.OverDueAmount = Obj.OverDueAmount.toFixed(2);
                    Obj.OverDueAmount = parseFloat(Obj.OverDueAmount);
                  } else {
                    Obj.OverDueAmount = 0;
                  }

                  var NumberOfDaysOutStanding = 0;
                  var DueTodayAmount = 0;
                  var OutStandingInvoice = 0;
                  if (BuyerInvoice.length !== 0) {
                    const BuyerInvoiceArray = BuyerInvoice.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                    if (BuyerInvoiceArray.length > 0) {
                      BuyerInvoiceArray.map(ObjIn => {
                        OutStandingInvoice = parseFloat(OutStandingInvoice) + parseFloat(ObjIn.AvailableAmount);
                        var InvoiceCreatedDate = new Date();
                        var InvoiceApprovedDate = new Date(ObjIn.InvoiceDate);
                        const InviteDetailsArray = InviteDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                        if (InviteDetailsArray.length > 0) {
                          InviteDetailsArray.map(ObjIn => {
                            InvoiceApprovedDate = new Date(InvoiceApprovedDate.setDate(InvoiceApprovedDate.getDate() + ObjIn.BuyerPaymentCycle));
                          });
                        }
                        var InvoiceLocalCreatedDate = InvoiceCreatedDate.toLocaleDateString();
                        var InvoiceLocalApprovedDate = InvoiceApprovedDate.toLocaleDateString();
                        if (InvoiceLocalCreatedDate === InvoiceLocalApprovedDate) {
                          NumberOfDaysOutStanding = parseFloat(NumberOfDaysOutStanding) + parseFloat(ObjIn.AvailableAmount);
                          DueTodayAmount = parseFloat(DueTodayAmount) + parseFloat(ObjIn.AvailableAmount);
                        }
                      });
                    }
                  }

                  var TotalCreditLimit = 0;
                  var PaymentCycle = 0;
                  if (InviteDetails.length !== 0) {
                    const InviteDetailsArray = InviteDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                    if (InviteDetailsArray.length > 0) {
                      InviteDetailsArray.map(ObjIn => {
                        TotalCreditLimit = parseFloat(TotalCreditLimit) + parseFloat(ObjIn.AvailableLimit);
                        PaymentCycle = parseFloat(ObjIn.BuyerPaymentCycle);
                      });
                    }
                  }

                  var DueTodayPayAmount = parseFloat(DueTodayAmount);
                  if (DueTodayPayAmount > 1 && DueTodayPayAmount !== Infinity) {
                    Obj.DueTodayAmount = DueTodayPayAmount.toFixed(2);
                    Obj.DueTodayAmount = parseFloat(DueTodayPayAmount);

                  }

                  var TotalCreditUnitized = parseFloat(OutStandingInvoice) / parseFloat(TotalCreditLimit);
                  if (TotalCreditUnitized > 0.5) {
                    TotalCreditUnitized = parseFloat(1) - parseFloat(TotalCreditUnitized);
                    TotalCreditUnitized = parseFloat(0.5) - parseFloat(TotalCreditUnitized);
                  }

                  if (TotalCreditUnitized > 1) {
                    Obj.CreditUnitizedPoint = 10;
                  } else {
                    Obj.CreditUnitizedPoint = parseFloat(10) * parseFloat(TotalCreditUnitized);
                    Obj.CreditUnitizedPoint = Obj.CreditUnitizedPoint.toFixed(2);
                    Obj.CreditUnitizedPoint = parseFloat(Obj.CreditUnitizedPoint);
                  }

                  var DelayPaymentAmount = parseFloat(NumberOfDaysOutStanding) / parseFloat(PaymentCycle);
                  if (DelayPaymentAmount > 1) {
                    Obj.DelayPaymentPoint = 30;
                  } else {
                    Obj.DelayPaymentPoint = parseFloat(30) * parseFloat(DelayPaymentAmount);
                    Obj.DelayPaymentPoint = Obj.DelayPaymentPoint.toFixed(2);
                    Obj.DelayPaymentPoint = parseFloat(Obj.DelayPaymentPoint);

                  }

                  var TemporaryActiveAmount = 0;
                  if (TemporaryActiveDetails.length > 0) {
                    const TemporaryActiveDetailsArray = TemporaryActiveDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                    if (TemporaryActiveDetailsArray.length > 0) {
                      TemporaryActiveDetailsArray.map(ObjTemp => {
                        TemporaryActiveAmount = parseFloat(TemporaryActiveAmount) + parseFloat(ObjTemp.ApproveLimit);
                      });
                    }
                  }

                  var TemporaryPendingAmount = 0;
                  if (TemporaryPendingDetails.length > 0) {
                    const TemporaryPendingDetailsArray = TemporaryPendingDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                    TemporaryPendingDetailsArray.map(ObjP => {
                      TemporaryPendingAmount = parseFloat(TemporaryPendingAmount) + parseFloat(ObjP.RequestLimit);
                    });
                  }

                  var TotalTemporaryAmount = parseFloat(TemporaryActiveAmount) / parseFloat(TemporaryPendingAmount);
                  if (isNaN(TotalTemporaryAmount)) {
                    TotalTemporaryAmount = 0;
                  }
                  if (TotalTemporaryAmount > 1) {
                    Obj.TemporaryCreditPoint = 20;
                  } else {
                    Obj.TemporaryCreditPoint = parseFloat(20) * parseFloat(TotalTemporaryAmount);
                    Obj.TemporaryCreditPoint = Obj.TemporaryCreditPoint.toFixed(2);
                    Obj.TemporaryCreditPoint = parseFloat(Obj.TemporaryCreditPoint);

                  }

                  if (Obj.UpComingAmount > 0) {
                    Obj.UpComingAmount = Obj.UpComingAmount - (Obj.DueTodayAmount + Obj.OverDueAmount);
                    if (Obj.UpComingAmount < 0) {
                      Obj.UpComingAmount = 0;
                    }
                    Obj.UpComingAmount = Obj.UpComingAmount.toFixed(2);
                    Obj.UpComingAmount = parseFloat(Obj.UpComingAmount);
                  }

                  var BuyerOutstandingPayment = 0;
                  const BuyerPendingPaymentArr = BuyerInvoice.filter(obj => JSON.parse(JSON.stringify(obj.BuyerBusiness)) === JSON.parse(JSON.stringify(Obj._id)));
                  if (BuyerPendingPaymentArr.length !== 0) {
                    BuyerPendingPaymentArr.map(ObjP => {
                      BuyerOutstandingPayment = parseFloat(BuyerOutstandingPayment) + parseFloat(ObjP.AvailableAmount);
                    });
                  }
                  Obj.OutStandingPayments = BuyerOutstandingPayment;
                  Obj.OutStandingPayments = Obj.OutStandingPayments.toFixed(2);
                  Obj.OutStandingPayments = parseFloat(Obj.OutStandingPayments);

                  var PendingInvoiceAmount = 0;
                  const CustomerPendingInvoiceArr = BuyerPendingInvoice.filter(obj => JSON.parse(JSON.stringify(obj.BuyerBusiness)) === JSON.parse(JSON.stringify(Obj._id)));
                  if (CustomerPendingInvoiceArr.length !== 0) {
                    Obj.PendingInvoiceCount = CustomerPendingInvoiceArr.length;
                    CustomerPendingInvoiceArr.map(ObjP => {
                      PendingInvoiceAmount = parseFloat(PendingInvoiceAmount) + parseFloat(ObjP.AvailableAmount);
                    });
                  }



                  if (Obj.DueTodayAmount > 1) {
                    Obj.DueTodayAmount = Obj.DueTodayAmount.toFixed(2);
                    Obj.DueTodayAmount = parseFloat(Obj.DueTodayAmount);

                  }

                  var BusinessVolume = 0;
                  var AllBuyerCreditLimits = 0;
                  var TotalInvoiceAmount = 0;
                  var BusinessVolumePercentage = 0;
                  if (SellerBusinessArray.length > 0) {
                    SellerBusinessArray.map(ObjB => {
                      AllBuyerCreditLimits = parseFloat(AllBuyerCreditLimits) + parseFloat(ObjB.AvailableCreditLimit);
                    });
                  }
                  const BuyerInvoiceArrB = BuyerInvoice.filter(obj => JSON.parse(JSON.stringify(obj.BuyerBusiness)) === JSON.parse(JSON.stringify(Obj._id)));
                  if (BuyerInvoiceArrB.length !== 0) {
                    BuyerInvoiceArrB.map(ObjB => {
                      if (ObjB.PaidORUnpaid === 'Paid') {
                        TotalInvoiceAmount = parseFloat(TotalInvoiceAmount) + parseFloat(ObjB.InvoiceAmount);
                      } else if (ObjB.PaidORUnpaid === 'Unpaid') {
                        TotalInvoiceAmount = parseFloat(TotalInvoiceAmount) + parseFloat(ObjB.AvailableAmount);
                      }
                    });
                  }

                  BusinessVolume = parseFloat(Obj.OverDueAmount) + parseFloat(TotalInvoiceAmount);
                  BusinessVolumePercentage = parseFloat(BusinessVolume) / parseFloat(AllBuyerCreditLimits) * parseFloat(100);
                  if (BusinessVolumePercentage >= 45) {
                    Obj.BusinessVolumeIndicator = 'Low';
                  } else if (BusinessVolumePercentage > 45 && BusinessVolumePercentage >= 90) {
                    Obj.BusinessVolumeIndicator = 'Medium';
                  } else if (BusinessVolumePercentage > 90) {
                    Obj.BusinessVolumeIndicator = 'High';
                  }

                  if (BusinessVolumePercentage < 45) {
                    Obj.HundiScoreStatus = 'Bad_Hundi_Score';
                  } else if (BusinessVolumePercentage >= 45) {
                    Obj.HundiScoreStatus = 'Average_Hundi_Score';
                  } else if (BusinessVolumePercentage >= 90) {
                    Obj.HundiScoreStatus = 'Good_Hundi_Score';
                  } else if (BusinessVolumePercentage < 90) {
                    Obj.HundiScoreStatus = 'High_Hundi_Score';
                  }
                  var HundiScoreCount = 0;
                  HundiScoreCount = parseFloat(Obj.HundiScoreRelatedOverDuePoint) / parseFloat(Obj.CreditUnitizedPoint) / parseFloat(Obj.TemporaryCreditPoint) / parseFloat(Obj.DelayPaymentPoint) * parseFloat(100);
                  Obj.HundiScore = HundiScoreCount.toFixed(2);
                  Obj.HundiScore = parseFloat(Obj.HundiScore);

                  if (isNaN(Obj.HundiScore) || Obj.HundiScore === Infinity) {
                    Obj.HundiScore = 0;
                  }
                  return Obj;
                });
              }
              res.status(200).send({ Status: true, Message: "HundiScore", Response: [HundiScore] });
            }).catch(ErrorNew => {
              res.status(417).send({ Status: false, Message: "Some Occurred Error", Error: ErrorNew });
            });

          };
          LoadMainFun();
        }).catch(Error => {
          res.status(417).send({ Status: false, Message: "Some Occurred Error", Error: Error });
        });
      } else {
        res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
      }
    }).catch(ErrorResponse => {
      res.status(417).send({ Status: false, Message: "Some Occurred Error", Error: ErrorResponse });
    });
  }
};

exports.HundiScoreIndividualSellerDetails = function (req, res) {
  var ReceivingData = req.body;

  if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
    res.status(400).send({ Status: false, Message: "Buyer Details can not be empty" });
  } else if (!ReceivingData.Seller || ReceivingData.Seller === '') {
    res.status(400).send({ Status: false, Message: "Seller Details can not be empty" });
  } else {
    ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
    ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
    Promise.all([
      CustomerManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller, CustomerType: 'Owner' }).exec(),
      CustomerManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer }).exec(),
    ]).then(ResponseCustomer => {
      var CustomerDetails = JSON.parse(JSON.stringify(ResponseCustomer[0]));
      var BuyerDetails = JSON.parse(JSON.stringify(ResponseCustomer[1]));
      if (BuyerDetails.CustomerType === 'Owner') {
        ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
      } else if (BuyerDetails.CustomerType === 'User') {
        ReceivingData.Buyer = mongoose.Types.ObjectId(BuyerDetails.Owner);
      }

      var InvoiceAcceptQuery = {};
      var TempAcceptQuery = {};
      var InviteAcceptQuery = {};
      var TempPendingQuery = {};
      var PaymentPendingQuery = {};
      var InvoicePendingQuery = {};
      var BuyerBranchArr = [];
      if (BuyerDetails !== null) {
        if (BuyerDetails.CustomerType === 'Owner') {
          ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
          InvoiceAcceptQuery = { PaidORUnpaid: "Unpaid", Seller: ReceivingData.Seller, Buyer: ReceivingData.Buyer, InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
          TempAcceptQuery = { Seller: ReceivingData.Seller, Buyer: ReceivingData.Buyer, Request_Status: "Accept", ActiveStatus: true, IfDeleted: false };
          InviteAcceptQuery = { Seller: ReceivingData.Seller, Buyer: ReceivingData.Buyer, Invite_Status: "Accept" };
          TempPendingQuery = { Seller: ReceivingData.Seller, Buyer: ReceivingData.Buyer, Request_Status: "Pending", ActiveStatus: true, IfDeleted: false }
          PaymentPendingQuery = { Seller: ReceivingData.Seller, Buyer: ReceivingData.Buyer, Payment_Status: "Pending" };
          InvoicePendingQuery = { Seller: ReceivingData.Seller, Buyer: ReceivingData.Buyer, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
        } else if (BuyerDetails.CustomerType === 'User') {
          ReceivingData.Buyer = mongoose.Types.ObjectId(BuyerDetails.Owner);
          if (BuyerDetails.BusinessAndBranches.length !== 0) {
            BuyerDetails.BusinessAndBranches.map(Obj => {
              if (Obj.Branches.length !== 0) {
                Obj.Branches.map(obj => {
                  BuyerBranchArr.push(mongoose.Types.ObjectId(obj));
                });
              }
            });
          }

          InvoiceAcceptQuery = { PaidORUnpaid: "Unpaid", Seller: ReceivingData.Seller, BuyerBranch: { $in: BuyerBranchArr }, InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
          TempAcceptQuery = { Seller: ReceivingData.Seller, BuyerBranch: { $in: BuyerBranchArr }, Request_Status: "Accept", ActiveStatus: true, IfDeleted: false };
          InviteAcceptQuery = { Seller: ReceivingData.Seller, BuyerBranch: { $in: BuyerBranchArr }, Invite_Status: "Accept" };
          TempPendingQuery = { Seller: ReceivingData.Seller, BuyerBranch: { $in: BuyerBranchArr }, Request_Status: "Pending", ActiveStatus: true, IfDeleted: false }
          PaymentPendingQuery = { Seller: ReceivingData.Seller, BuyerBranch: { $in: BuyerBranchArr }, Payment_Status: "Pending" };
          InvoicePendingQuery = { Seller: ReceivingData.Seller, BuyerBranch: { $in: BuyerBranchArr }, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
        }
      }


      if (CustomerDetails !== null) {
        Promise.all([
          InvoiceManagement.InvoiceSchema.find(InvoiceAcceptQuery, {}, {}).exec(),
          TemporaryManagement.CreditSchema.find(TempAcceptQuery, {}, {}).exec(),
          InviteManagement.InviteManagementSchema.find(InviteAcceptQuery, {}, {}).exec(),
          TemporaryManagement.CreditSchema.find(TempPendingQuery, {}, {}).exec(),
          PaymentManagement.PaymentSchema.find(PaymentPendingQuery, {}, {}).exec(),
          InvoiceManagement.InvoiceSchema.find(InvoicePendingQuery, {}, {}).exec(),
        ]).then(Response => {
          var BuyerInvoice = JSON.parse(JSON.stringify(Response[0]));
          var TemporaryActiveDetails = JSON.parse(JSON.stringify(Response[1]));
          var InviteDetails = JSON.parse(JSON.stringify(Response[2]));
          var TemporaryPendingDetails = JSON.parse(JSON.stringify(Response[3]));
          var BuyerPendingPayment = JSON.parse(JSON.stringify(Response[4]));
          var BuyerPendingInvoice = JSON.parse(JSON.stringify(Response[5]));
          var BusinessArray = [];
          var BranchArray = [];
          var BuyerId = [];
          var SellerBusinessId = [];
          var SellerBranchId = [];
          var SellerBusinessArray = [];
          if (InviteDetails.length !== 0) {
            InviteDetails.map(Obj => {
              BuyerId.push(mongoose.Types.ObjectId(Obj.Buyer));
              SellerBusinessId.push(mongoose.Types.ObjectId(Obj.Business));
              SellerBranchId.push(mongoose.Types.ObjectId(Obj.Branch));
            });
          }

          const findRequiredData = new Promise((resolve, reject) => {
            Promise.all([
              BusinessAndBranchManagement.BusinessSchema.find({ _id: { $in: SellerBusinessId } }, {}, {}).exec(),
              BusinessAndBranchManagement.BusinessSchema.find({ Customer: { $in: BuyerId } }, {}, {}).exec(),
              BusinessAndBranchManagement.BranchSchema.find({ _id: { $in: SellerBranchId } }, {}, {}).exec(),
            ]).then((responseNew) => {
              BusinessArray = JSON.parse(JSON.stringify(responseNew[0]));
              SellerBusinessArray = JSON.parse(JSON.stringify(responseNew[1]));
              BranchArray = JSON.parse(JSON.stringify(responseNew[2]));
              resolve(responseNew);
            }).catch(errorNew => {
              reject(errorNew);
            });
          });

          const LoadMainFun = () => {
            findRequiredData.then(responseNew => {
              var HundiScore = {
                ContactName: CustomerDetails.ContactName,
                Mobile: CustomerDetails.Mobile,
                CustomerCategory: CustomerDetails.CustomerCategory,
                Business: []
              };
              const BusinessDetailsArr = BusinessArray.filter(obj => JSON.parse(JSON.stringify(obj.Customer)) === JSON.parse(JSON.stringify(CustomerDetails._id)));
              if (BusinessDetailsArr.length !== 0) {
                HundiScore.Business = BusinessDetailsArr;
                HundiScore.Business = JSON.parse(JSON.stringify(HundiScore.Business));
                HundiScore.Business.map(Obj => {
                  Obj.CreditLimit = 0;
                  Obj.OverDueAmount = 0;
                  Obj.AvailableCreditLimit = 0;
                  Obj.InvoiceAmount = 0;
                  Obj.DelayInPayment = 0;
                  Obj.DueTodayAmount = 0;
                  Obj.UpComingAmount = 0;
                  Obj.TemporaryCreditLimit = 0;
                  Obj.OutStandingPayments = 0;
                  Obj.BusinessVolumeIndicator = '';
                  Obj.HundiScore = 0;
                  Obj.ExtraUnitizedCreditLimit = 0;
                  Obj.CreditBalanceExists = false;
                  Obj.HundiScoreStatus = '';
                  Obj.HundiScoreRelatedOverDuePoint = 0;
                  Obj.CreditUnitizedPoint = 0;
                  Obj.TemporaryCreditPoint = 0;
                  Obj.DelayPaymentPoint = 0;
                  Obj.DelayPaymentPoint = 0;

                  var TodayDate = new Date();
                  var RespectiveCreditLimit = 0;
                  if (BranchArray.length > 0) {
                    const BranchArrayValue = BranchArray.filter(obj1 => obj1.Business === Obj._id);
                    if (BranchArrayValue.length > 0) {
                      BranchArrayValue.map(ObjS => {
                        if (InviteDetails.length > 0) {
                          const InviteDetailsArray1 = InviteDetails.filter(obj1 => obj1.Branch === ObjS._id);
                          if (InviteDetailsArray1.length > 0) {
                            var ValidityDate = new Date();
                            InviteDetailsArray1.map(ObjIn => {
                              //  ValidityDate = new Date(ObjIn.updatedAt);
                              //  ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + ObjIn.BuyerPaymentCycle));
                              //  if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                              RespectiveCreditLimit = parseFloat(RespectiveCreditLimit) + parseFloat(ObjIn.AvailableLimit);
                              //  }
                            });
                          }
                        }
                        if (TemporaryActiveDetails.length > 0) {
                          const TemporaryActiveDetailsArray1 = TemporaryActiveDetails.filter(obj1 => obj1.Branch === ObjS._id);
                          if (TemporaryActiveDetailsArray1.length > 0) {
                            var TemporaryValidityDate = new Date();
                            TemporaryActiveDetailsArray1.map(ObjIn => {
                              TemporaryValidityDate = new Date(ObjIn.updatedAt);
                              TemporaryValidityDate = new Date(TemporaryValidityDate.setDate(TemporaryValidityDate.getDate() + ObjIn.ApprovedPeriod));
                              if (TemporaryValidityDate.valueOf() >= TodayDate.valueOf()) {
                                RespectiveCreditLimit = parseFloat(RespectiveCreditLimit) + parseFloat(ObjIn.ApproveLimit);
                              }
                            });
                          }
                        }
                      });
                    }
                  }
                  Obj.CreditLimit = RespectiveCreditLimit;
                  Obj.AvailableCreditLimit = RespectiveCreditLimit;
                  Obj.CreditLimit = Obj.CreditLimit.toFixed(2);
                  Obj.CreditLimit = parseFloat(Obj.CreditLimit);
                  Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                  Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                  RespectiveCreditLimit = RespectiveCreditLimit;
                  var OverDueInvoiceArr = [];
                  if (BuyerInvoice.length !== 0) {
                    const BuyerInvoiceArray = BuyerInvoice.filter(obj1 => obj1.Business === Obj._id);
                    if (BuyerInvoiceArray.length > 0) {
                      BuyerInvoiceArray.map(ObjInvoice => {
                        var EmptyInvoicesAndInvite = {
                          Invoice: [],
                          Invite: []
                        };
                        var InvoiceDate = new Date();
                        InvoiceDate = new Date(ObjInvoice.InvoiceDate);
                        const InviteDetailsArr = InviteDetails.filter(obj1 => obj1.Branch === ObjInvoice.Branch);
                        if (InviteDetailsArr.length > 0) {
                          var ValidityDate = new Date();
                          InviteDetailsArr.map(ObjIn => {
                            ValidityDate = new Date(ObjIn.updatedAt);
                            ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + ObjIn.BuyerPaymentCycle));
                            InvoiceDate = new Date(InvoiceDate.setDate(InvoiceDate.getDate() + ObjIn.BuyerPaymentCycle + 1));
                            EmptyInvoicesAndInvite.Invite.push(ObjIn);

                          });
                        }
                        if (InvoiceDate.valueOf() < TodayDate.valueOf()) {
                          EmptyInvoicesAndInvite.Invoice.push(ObjInvoice);
                        }
                        OverDueInvoiceArr.push(EmptyInvoicesAndInvite);
                      });
                    }
                  }
                  var RespectiveOverDueAmount = 0;
                  var RespectiveCreditLimit1 = 0;
                  OverDueInvoiceArr.map(ObjInvoice => {
                    if (ObjInvoice.Invoice.length !== 0) {
                      ObjInvoice.Invoice.map(obj => {
                        RespectiveOverDueAmount = parseFloat(RespectiveOverDueAmount) + parseFloat(obj.AvailableAmount);
                      });
                    }
                    if (ObjInvoice.Invite.length !== 0) {
                      ObjInvoice.Invite.map(obj => {
                        RespectiveCreditLimit1 = parseFloat(RespectiveCreditLimit1) + parseFloat(obj.AvailableLimit);
                      });
                    }
                    var RespectiveOverDueAndCreditAmount = 0;
                    RespectiveOverDueAndCreditAmount = parseFloat(RespectiveOverDueAmount) / parseFloat(RespectiveCreditLimit1);
                    if (RespectiveOverDueAndCreditAmount > 1 && RespectiveOverDueAndCreditAmount !== Infinity && !isNaN(RespectiveOverDueAndCreditAmount)) {
                      Obj.HundiScoreRelatedOverDuePoint = 40;
                    } else {
                      if (!isNaN(RespectiveOverDueAndCreditAmount) && RespectiveOverDueAndCreditAmount !== Infinity) {
                        Obj.HundiScoreRelatedOverDuePoint = parseFloat(30) * parseFloat(RespectiveOverDueAndCreditAmount);
                      }

                    }
                  });

                  var InvoiceAmount = 0;
                  if (BuyerInvoice.length !== 0) {
                    const BuyerInvoiceArr = BuyerInvoice.filter(obj1 => obj1.Business === Obj._id);
                    if (BuyerInvoiceArr.length > 0) {
                      BuyerInvoiceArr.map(ObjM => {
                        InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(ObjM.AvailableAmount);
                      });
                    }
                  }
                  Obj.InvoiceAmount = InvoiceAmount;
                  Obj.UpComingAmount = InvoiceAmount;
                  var InvoiceRespectiveCreditAmount = parseFloat(InvoiceAmount) - parseFloat(RespectiveCreditLimit);
                  if (InvoiceRespectiveCreditAmount >= 0) {
                    Obj.ExtraUnitizedCreditLimit = -Math.abs(InvoiceRespectiveCreditAmount);
                    Obj.ExtraUnitizedCreditLimit = Obj.ExtraUnitizedCreditLimit.toFixed(2);
                    Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.ExtraUnitizedCreditLimit);
                    Obj.CreditBalanceExists = true;
                    Obj.AvailableCreditLimit = 0;
                  } else {
                    if (InvoiceRespectiveCreditAmount < 0) {
                      Obj.AvailableCreditLimit = Math.abs(InvoiceRespectiveCreditAmount);
                      Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                      Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                    }
                  }

                  var TotalRespectiveOverDueAmount = parseFloat(RespectiveOverDueAmount);
                  if (TotalRespectiveOverDueAmount > 0) {
                    Obj.OverDueAmount = TotalRespectiveOverDueAmount;
                    Obj.OverDueAmount = Obj.OverDueAmount.toFixed(2);
                    Obj.OverDueAmount = parseFloat(Obj.OverDueAmount);
                  } else {
                    Obj.OverDueAmount = 0;
                  }

                  var NumberOfDaysOutStanding = 0;
                  var DueTodayAmount = 0;
                  var OutStandingInvoice = 0;
                  if (BuyerInvoice.length !== 0) {
                    const BuyerInvoiceArray = BuyerInvoice.filter(obj1 => obj1.Business === Obj._id);
                    if (BuyerInvoiceArray.length > 0) {
                      BuyerInvoiceArray.map(ObjIn => {
                        var InvoiceCreatedDate = new Date();
                        var InvoiceApprovedDate = new Date(ObjIn.InvoiceDate);
                        OutStandingInvoice = parseFloat(OutStandingInvoice) + parseFloat(ObjIn.AvailableAmount);
                        const InviteDetailsArray = InviteDetails.filter(obj1 => obj1.Business === Obj._id);
                        if (InviteDetailsArray.length > 0) {
                          InviteDetailsArray.map(ObjIn => {
                            InvoiceApprovedDate = new Date(InvoiceApprovedDate.setDate(InvoiceApprovedDate.getDate() + ObjIn.BuyerPaymentCycle));
                          });
                        }
                        var InvoiceLocalCreatedDate = InvoiceCreatedDate.toLocaleDateString();
                        var InvoiceLocalApprovedDate = InvoiceApprovedDate.toLocaleDateString();
                        if (InvoiceLocalCreatedDate === InvoiceLocalApprovedDate) {
                          NumberOfDaysOutStanding = parseFloat(NumberOfDaysOutStanding) + parseFloat(ObjIn.AvailableAmount);
                          DueTodayAmount = parseFloat(DueTodayAmount) + parseFloat(ObjIn.AvailableAmount);
                        }
                      });
                    }
                  }

                  var TotalCreditLimit = 0;
                  var PaymentCycle = 0;
                  if (InviteDetails.length !== 0) {
                    const InviteDetailsArray = InviteDetails.filter(obj1 => obj1.Business === Obj._id);
                    if (InviteDetailsArray.length > 0) {
                      InviteDetailsArray.map(ObjIn => {
                        TotalCreditLimit = parseFloat(TotalCreditLimit) + parseFloat(ObjIn.AvailableLimit);
                        PaymentCycle = parseFloat(ObjIn.BuyerPaymentCycle);
                      });
                    }
                  }

                  var DueTodayPayAmount = parseFloat(DueTodayAmount);
                  if (DueTodayPayAmount > 1 && DueTodayPayAmount !== Infinity) {
                    Obj.DueTodayAmount = DueTodayPayAmount.toFixed(2);
                    Obj.DueTodayAmount = parseFloat(DueTodayPayAmount);
                  }
                  var TotalCreditUnitized = parseFloat(OutStandingInvoice) / parseFloat(TotalCreditLimit);
                  if (TotalCreditUnitized > 0.5) {
                    TotalCreditUnitized = parseFloat(1) - parseFloat(TotalCreditUnitized);
                    TotalCreditUnitized = parseFloat(0.5) - parseFloat(TotalCreditUnitized);
                  }

                  if (TotalCreditUnitized > 1) {
                    Obj.CreditUnitizedPoint = 10;
                  } else {
                    Obj.CreditUnitizedPoint = parseFloat(10) * parseFloat(TotalCreditUnitized);
                    Obj.CreditUnitizedPoint = parseFloat(Obj.CreditUnitizedPoint).toFixed(2)
                  }

                  var DelayPaymentAmount = parseFloat(NumberOfDaysOutStanding) / parseFloat(PaymentCycle);
                  if (DelayPaymentAmount > 1) {
                    Obj.DelayPaymentPoint = 30;
                  } else {
                    Obj.DelayPaymentPoint = parseFloat(30) * parseFloat(DelayPaymentAmount);
                    Obj.DelayPaymentPoint = Obj.DelayPaymentPoint.toFixed(2);
                    Obj.DelayPaymentPoint = parseFloat(Obj.DelayPaymentPoint);

                  }

                  var TemporaryActiveAmount = 0;
                  if (TemporaryActiveDetails.length > 0) {
                    const TemporaryActiveDetailsArray = TemporaryActiveDetails.filter(obj1 => obj1.Business === Obj._id);
                    if (TemporaryActiveDetailsArray.length > 0) {
                      TemporaryActiveDetailsArray.map(ObjTemp => {
                        TemporaryActiveAmount = parseFloat(TemporaryActiveAmount) + parseFloat(ObjTemp.ApproveLimit);
                      });
                    }
                  }

                  var TemporaryPendingAmount = 0;
                  if (TemporaryPendingDetails.length > 0) {
                    const TemporaryPendingDetailsArray = TemporaryPendingDetails.filter(obj1 => obj1.Business === Obj._id);
                    TemporaryPendingDetailsArray.map(ObjP => {
                      TemporaryPendingAmount = parseFloat(TemporaryPendingAmount) + parseFloat(ObjP.RequestLimit);
                    });
                  }
                  var TotalTemporaryAmount = parseFloat(TemporaryActiveAmount) / parseFloat(TemporaryPendingAmount);
                  if (isNaN(TotalTemporaryAmount)) {
                    TotalTemporaryAmount = 0;
                  }
                  if (TotalTemporaryAmount > 1) {
                    Obj.TemporaryCreditPoint = 20;
                  } else {
                    Obj.TemporaryCreditPoint = parseFloat(20) * parseFloat(TotalTemporaryAmount);
                    Obj.TemporaryCreditPoint = Obj.TemporaryCreditPoint.toFixed(2);
                    Obj.TemporaryCreditPoint = parseFloat(Obj.TemporaryCreditPoint);

                  }

                  if (Obj.UpComingAmount > 0) {
                    Obj.UpComingAmount = Obj.UpComingAmount - (Obj.DueTodayAmount + Obj.OverDueAmount);
                    if (Obj.UpComingAmount < 0) {
                      Obj.UpComingAmount = 0;
                    }
                    Obj.UpComingAmount = Obj.UpComingAmount.toFixed(2);
                    Obj.UpComingAmount = parseFloat(Obj.UpComingAmount);
                  }
                  var BuyerOutstandingPayment = 0;
                  const BuyerPendingPaymentArr = BuyerInvoice.filter(obj => JSON.parse(JSON.stringify(obj.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                  if (BuyerPendingPaymentArr.length !== 0) {
                    BuyerPendingPaymentArr.map(ObjP => {
                      BuyerOutstandingPayment = parseFloat(BuyerOutstandingPayment) + parseFloat(ObjP.AvailableAmount);
                    });
                  }
                  Obj.OutStandingPayments = BuyerOutstandingPayment;
                  Obj.OutStandingPayments = Obj.OutStandingPayments.toFixed(2);
                  Obj.OutStandingPayments = parseFloat(Obj.OutStandingPayments);
                  var PendingInvoiceAmount = 0;
                  const CustomerPendingInvoiceArr = BuyerPendingInvoice.filter(obj => JSON.parse(JSON.stringify(obj.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                  if (CustomerPendingInvoiceArr.length !== 0) {
                    Obj.PendingInvoiceCount = CustomerPendingInvoiceArr.length;
                    CustomerPendingInvoiceArr.map(ObjP => {
                      PendingInvoiceAmount = parseFloat(PendingInvoiceAmount) + parseFloat(ObjP.AvailableAmount);
                    });
                  }



                  if (Obj.DueTodayAmount > 1) {
                    Obj.DueTodayAmount = Obj.DueTodayAmount.toFixed(2);
                    Obj.DueTodayAmount = parseFloat(Obj.DueTodayAmount);

                  }

                  var BusinessVolume = 0;
                  var AllBuyerCreditLimits = 0;
                  var TotalInvoiceAmount = 0;
                  var BusinessVolumePercentage = 0;
                  InviteDetails.map(Obj1 => {
                    AllBuyerCreditLimits = parseFloat(AllBuyerCreditLimits) + parseFloat(Obj1.AvailableLimit);
                  });
                  const BuyerInvoiceArrB = BuyerInvoice.filter(obj => JSON.parse(JSON.stringify(obj.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                  if (BuyerInvoiceArrB.length !== 0) {
                    BuyerInvoiceArrB.map(ObjB => {
                      if (ObjB.PaidORUnpaid === 'Paid') {
                        TotalInvoiceAmount = parseFloat(TotalInvoiceAmount) + parseFloat(ObjB.InvoiceAmount);
                      } else if (ObjB.PaidORUnpaid === 'Unpaid') {
                        TotalInvoiceAmount = parseFloat(TotalInvoiceAmount) + parseFloat(ObjB.AvailableAmount);
                      }
                    });
                  }

                  BusinessVolume = parseFloat(Obj.OverDueAmount) + parseFloat(TotalInvoiceAmount);
                  BusinessVolumePercentage = parseFloat(BusinessVolume) / parseFloat(AllBuyerCreditLimits) * parseFloat(100);
                  if (BusinessVolumePercentage >= 45) {
                    Obj.BusinessVolumeIndicator = 'Low';
                  } else if (BusinessVolumePercentage > 45 && BusinessVolumePercentage >= 90) {
                    Obj.BusinessVolumeIndicator = 'Medium';
                  } else if (BusinessVolumePercentage > 90) {
                    Obj.BusinessVolumeIndicator = 'High';
                  }

                  if (BusinessVolumePercentage < 45) {
                    Obj.HundiScoreStatus = 'Bad_Hundi_Score';
                  } else if (BusinessVolumePercentage >= 45) {
                    Obj.HundiScoreStatus = 'Average_Hundi_Score';
                  } else if (BusinessVolumePercentage >= 90) {
                    Obj.HundiScoreStatus = 'Good_Hundi_Score';
                  } else if (BusinessVolumePercentage < 90) {
                    Obj.HundiScoreStatus = 'High_Hundi_Score';
                  }
                  var HundiScoreCount = 0;
                  HundiScoreCount = parseFloat(Obj.HundiScoreRelatedOverDuePoint) / parseFloat(Obj.CreditUnitizedPoint) / parseFloat(Obj.TemporaryCreditPoint) / parseFloat(Obj.DelayPaymentPoint) * parseFloat(100);
                  Obj.HundiScore = HundiScoreCount.toFixed(2);
                  Obj.HundiScore = parseFloat(Obj.HundiScore);

                  if (isNaN(Obj.HundiScore) || Obj.HundiScore === Infinity) {
                    Obj.HundiScore = 0;
                  }
                  return Obj;
                });
              }
              res.status(200).send({ Status: true, Message: "HundiScore", Response: [HundiScore] });
            }).catch(ErrorNew => {
              res.status(417).send({ Status: false, Message: "Some Occurred Error", Error: ErrorNew });
            });
          };

          LoadMainFun();
        }).catch(Error => {
          res.status(417).send({ Status: false, Message: "Some Occurred Error", Error: Error });
        });
      } else {
        res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
      }
    }).catch(ErrorResponse => {
      res.status(417).send({ Status: false, Message: "Some Occurred Error", Error: ErrorResponse });
    });
  }
};


exports.HundiScoreIndividualSellerBranchDetails = function (req, res) {
  var ReceivingData = req.body;
  if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
    res.status(400).send({ Status: false, Message: "Buyer Details can not be empty" });
  } else if (!ReceivingData.Seller || ReceivingData.Seller === '') {
    res.status(400).send({ Status: false, Message: "Seller Details can not be empty" });
  } else if (!ReceivingData.Business || ReceivingData.Business === '') {
    res.status(400).send({ Status: false, Message: "Seller Business Details can not be empty" });
  } else {
    ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
    ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
    ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
    Promise.all([
      CustomerManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller }).exec(),
      CustomerManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer }).exec(),
    ]).then(ResponseCustomer => {
      var CustomerDetails = JSON.parse(JSON.stringify(ResponseCustomer[0]));
      var BuyerDetails = JSON.parse(JSON.stringify(ResponseCustomer[1]));
      if (BuyerDetails.CustomerType === 'Owner') {
        ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
      } else if (BuyerDetails.CustomerType === 'User') {
        ReceivingData.Buyer = mongoose.Types.ObjectId(BuyerDetails.Owner);
      }
      if (CustomerDetails !== null) {
        if (CustomerDetails.CustomerType === 'Owner') {
          ReceivingData.Seller = mongoose.Types.ObjectId(CustomerDetails._id);
        } else if (CustomerDetails.CustomerType === 'User') {
          ReceivingData.Seller = mongoose.Types.ObjectId(CustomerDetails.Owner);
        }
        Promise.all([
          InvoiceManagement.InvoiceSchema.find({ PaidORUnpaid: "Unpaid", Seller: ReceivingData.Seller, Business: ReceivingData.Business, Buyer: ReceivingData.Buyer, InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
          TemporaryManagement.CreditSchema.find({ Seller: ReceivingData.Seller, Buyer: ReceivingData.Buyer, Business: ReceivingData.Business, Request_Status: "Accept", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
          InviteManagement.InviteManagementSchema.find({ Seller: ReceivingData.Seller, Buyer: ReceivingData.Buyer, Business: ReceivingData.Business, Invite_Status: "Accept" }, {}, {}).exec(),
          TemporaryManagement.CreditSchema.find({ Seller: ReceivingData.Seller, Buyer: ReceivingData.Buyer, Business: ReceivingData.Business, Request_Status: "Pending", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
          PaymentManagement.PaymentSchema.find({ Seller: ReceivingData.Seller, Buyer: ReceivingData.Buyer, Business: ReceivingData.Business, Payment_Status: "Pending" }, {}, {}).exec(),
          InvoiceManagement.InvoiceSchema.find({ Seller: ReceivingData.Seller, Buyer: ReceivingData.Buyer, Business: ReceivingData.Business, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        ]).then(Response => {
          var BuyerInvoice = JSON.parse(JSON.stringify(Response[0]));
          var TemporaryActiveDetails = JSON.parse(JSON.stringify(Response[1]));
          var InviteDetails = JSON.parse(JSON.stringify(Response[2]));
          var TemporaryPendingDetails = JSON.parse(JSON.stringify(Response[3]));
          var BuyerPendingPayment = JSON.parse(JSON.stringify(Response[4]));
          var BuyerPendingInvoice = JSON.parse(JSON.stringify(Response[5]));
          var BusinessArray = [];
          var BranchArray = [];

          var SellerBranchId = [];
          if (InviteDetails.length !== 0) {
            InviteDetails.map(Obj => {
              SellerBranchId.push(mongoose.Types.ObjectId(Obj.Branch));
            });
          }

          const findRequiredData = new Promise((resolve, reject) => {
            Promise.all([
              BusinessAndBranchManagement.BranchSchema.find({ _id: { $in: SellerBranchId } }, {}, {}).exec(),
            ]).then((responseNew) => {
              BranchArray = JSON.parse(JSON.stringify(responseNew[0]));
              resolve(responseNew);
            }).catch(errorNew => {
              reject(errorNew);
            });
          });

          const LoadMainFun = () => {
            findRequiredData.then(responseNew => {
              BranchArray.map(Obj => {
                Obj.CreditLimit = 0;
                Obj.OverDueAmount = 0;
                Obj.AvailableCreditLimit = 0;
                Obj.InvoiceAmount = 0;
                Obj.DelayInPayment = 0;
                Obj.DueTodayAmount = 0;
                Obj.UpComingAmount = 0;
                Obj.TemporaryCreditLimit = 0;
                Obj.OutStandingPayments = 0;
                Obj.BusinessVolumeIndicator = '';
                Obj.HundiScore = 0;
                Obj.BuyerPaymentCycle = 0;
                Obj.ExtraUnitizedCreditLimit = 0;
                Obj.CreditBalanceExists = false;
                Obj.HundiScoreStatus = '';
                Obj.HundiScoreRelatedOverDuePoint = 0;
                Obj.CreditUnitizedPoint = 0;
                Obj.TemporaryCreditPoint = 0;
                Obj.DelayPaymentPoint = 0;
                Obj.DelayPaymentPoint = 0;

                var TodayDate = new Date();
                var RespectiveCreditLimit = 0;

                if (InviteDetails.length > 0) {
                  const InviteDetailsArray = InviteDetails.filter(obj1 => obj1.Branch === Obj._id);
                  if (InviteDetailsArray.length > 0) {
                    InviteDetailsArray.map(ObjIn => {
                      Obj.BuyerPaymentCycle = parseFloat(ObjIn.BuyerPaymentCycle)
                      RespectiveCreditLimit = parseFloat(RespectiveCreditLimit) + parseFloat(ObjIn.AvailableLimit);
                    });
                  }
                }

                if (TemporaryActiveDetails.length > 0) {
                  const TemporaryActiveDetailsArray = TemporaryActiveDetails.filter(obj1 => obj1.Branch === Obj._id);
                  if (TemporaryActiveDetailsArray.length > 0) {
                    var TemporaryValidityDate = new Date();
                    TemporaryActiveDetailsArray.map(ObjIn => {
                      TemporaryValidityDate = new Date(ObjIn.updatedAt);
                      TemporaryValidityDate = new Date(TemporaryValidityDate.setDate(TemporaryValidityDate.getDate() + ObjIn.ApprovedPeriod));
                      if (TemporaryValidityDate.valueOf() >= TodayDate.valueOf()) {
                        RespectiveCreditLimit = parseFloat(RespectiveCreditLimit) + parseFloat(ObjIn.ApproveLimit);
                      }
                    });
                  }
                }

                Obj.CreditLimit = RespectiveCreditLimit;
                Obj.AvailableCreditLimit = RespectiveCreditLimit;
                Obj.CreditLimit = Obj.CreditLimit.toFixed(2);
                Obj.CreditLimit = parseFloat(Obj.CreditLimit);
                Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);

                var OverDueInvoiceArr = [];
                if (BuyerInvoice.length !== 0) {
                  const BuyerInvoiceArray = BuyerInvoice.filter(obj1 => obj1.Branch === Obj._id);
                  if (BuyerInvoiceArray.length > 0) {
                    BuyerInvoiceArray.map(ObjInvoice => {
                      var EmptyInvoicesAndInvite = {
                        Invoice: [],
                        Invite: []
                      };
                      var InvoiceDate = new Date();
                      InvoiceDate = new Date(ObjInvoice.InvoiceDate);
                      const InviteDetailsArr = InviteDetails.filter(obj1 => obj1.Branch === Obj._id);
                      if (InviteDetailsArr.length > 0) {
                        var ValidityDate = new Date();
                        InviteDetailsArr.map(ObjIn => {
                          ValidityDate = new Date(ObjIn.updatedAt);
                          ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + ObjIn.BuyerPaymentCycle));
                          InvoiceDate = new Date(InvoiceDate.setDate(InvoiceDate.getDate() + ObjIn.BuyerPaymentCycle + 1));
                          EmptyInvoicesAndInvite.Invite.push(ObjIn);
                        });
                      }
                      if (InvoiceDate.valueOf() < TodayDate.valueOf()) {
                        EmptyInvoicesAndInvite.Invoice.push(ObjInvoice);
                      }
                      OverDueInvoiceArr.push(EmptyInvoicesAndInvite);
                    });
                  }
                }

                var RespectiveOverDueAmount = 0;
                var RespectiveCreditLimit1 = 0;
                OverDueInvoiceArr.map(ObjInvoice => {
                  if (ObjInvoice.Invoice.length !== 0) {
                    ObjInvoice.Invoice.map(obj => {
                      RespectiveOverDueAmount = parseFloat(RespectiveOverDueAmount) + parseFloat(obj.AvailableAmount);
                    });
                  }
                  if (ObjInvoice.Invite.length !== 0) {
                    ObjInvoice.Invite.map(obj => {
                      RespectiveCreditLimit1 = parseFloat(RespectiveCreditLimit1) + parseFloat(obj.AvailableLimit);
                    });
                  }
                  var RespectiveOverDueAndCreditAmount = 0;
                  RespectiveOverDueAndCreditAmount = parseFloat(RespectiveOverDueAmount) / parseFloat(RespectiveCreditLimit1);
                  if (RespectiveOverDueAndCreditAmount > 1 && RespectiveOverDueAndCreditAmount !== Infinity && !isNaN(RespectiveOverDueAndCreditAmount)) {
                    Obj.HundiScoreRelatedOverDuePoint = 40;
                  } else {
                    if (!isNaN(RespectiveOverDueAndCreditAmount) && RespectiveOverDueAndCreditAmount !== Infinity) {
                      Obj.HundiScoreRelatedOverDuePoint = parseFloat(30) * parseFloat(RespectiveOverDueAndCreditAmount);
                    }

                  }
                });

                var InvoiceAmount = 0;
                if (BuyerInvoice.length !== 0) {
                  const BuyerInvoiceArr = BuyerInvoice.filter(obj1 => obj1.Branch === Obj._id);
                  if (BuyerInvoiceArr.length > 0) {
                    BuyerInvoiceArr.map(ObjM => {
                      InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(ObjM.AvailableAmount);
                    });
                  }
                }
                Obj.InvoiceAmount = InvoiceAmount;
                Obj.UpComingAmount = InvoiceAmount;

                var InvoiceRespectiveCreditAmount = parseFloat(InvoiceAmount) - parseFloat(RespectiveCreditLimit);
                if (InvoiceRespectiveCreditAmount >= 0) {
                  Obj.ExtraUnitizedCreditLimit = -Math.abs(InvoiceRespectiveCreditAmount);
                  Obj.ExtraUnitizedCreditLimit = Obj.ExtraUnitizedCreditLimit.toFixed(2);
                  Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.ExtraUnitizedCreditLimit);
                  Obj.CreditBalanceExists = true;
                  Obj.AvailableCreditLimit = 0;
                } else {
                  if (InvoiceRespectiveCreditAmount < 0) {
                    Obj.AvailableCreditLimit = Math.abs(InvoiceRespectiveCreditAmount);
                    Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                    Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                  }
                }

                var TotalRespectiveOverDueAmount = parseFloat(RespectiveOverDueAmount);
                if (TotalRespectiveOverDueAmount > 0) {
                  Obj.OverDueAmount = TotalRespectiveOverDueAmount;
                  Obj.OverDueAmount = Obj.OverDueAmount.toFixed(2);
                  Obj.OverDueAmount = parseFloat(Obj.OverDueAmount);
                } else {
                  Obj.OverDueAmount = 0;
                }


                var NumberOfDaysOutStanding = 0;
                var DueTodayAmount = 0;
                var OutStandingInvoice = 0;
                if (BuyerInvoice.length !== 0) {
                  const BuyerInvoiceArray = BuyerInvoice.filter(obj1 => obj1.Branch === Obj._id);
                  if (BuyerInvoiceArray.length > 0) {
                    BuyerInvoiceArray.map(ObjIn => {
                      var InvoiceCreatedDate = new Date();
                      var InvoiceApprovedDate = new Date(ObjIn.InvoiceDate);
                      OutStandingInvoice = parseFloat(OutStandingInvoice) + parseFloat(ObjIn.AvailableAmount);
                      const InviteDetailsArray = InviteDetails.filter(obj1 => obj1.Branch === Obj._id);
                      if (InviteDetailsArray.length > 0) {
                        InviteDetailsArray.map(ObjIn => {
                          InvoiceApprovedDate = new Date(InvoiceApprovedDate.setDate(InvoiceApprovedDate.getDate() + ObjIn.BuyerPaymentCycle));
                        });
                      }
                      var InvoiceLocalCreatedDate = InvoiceCreatedDate.toLocaleDateString();
                      var InvoiceLocalApprovedDate = InvoiceApprovedDate.toLocaleDateString();
                      if (InvoiceLocalCreatedDate === InvoiceLocalApprovedDate) {
                        NumberOfDaysOutStanding = parseFloat(NumberOfDaysOutStanding) + parseFloat(ObjIn.AvailableAmount);
                        DueTodayAmount = parseFloat(DueTodayAmount) + parseFloat(ObjIn.AvailableAmount);
                      }
                    });
                  }
                }

                var TotalCreditLimit = 0;
                var PaymentCycle = 0;
                if (InviteDetails.length !== 0) {
                  const InviteDetailsArray = InviteDetails.filter(obj1 => obj1.Branch === Obj._id);
                  if (InviteDetailsArray.length > 0) {
                    InviteDetailsArray.map(ObjIn => {
                      TotalCreditLimit = parseFloat(TotalCreditLimit) + parseFloat(ObjIn.AvailableLimit);
                      PaymentCycle = parseFloat(ObjIn.BuyerPaymentCycle);
                    });
                  }
                }

                var DueTodayPayAmount = parseFloat(DueTodayAmount);
                if (DueTodayPayAmount > 1 && DueTodayPayAmount !== Infinity) {
                  Obj.DueTodayAmount = DueTodayPayAmount.toFixed(2);
                  Obj.DueTodayAmount = parseFloat(DueTodayPayAmount);
                }
                var TotalCreditUnitized = parseFloat(OutStandingInvoice) / parseFloat(TotalCreditLimit);
                if (TotalCreditUnitized > 0.5) {
                  TotalCreditUnitized = parseFloat(1) - parseFloat(TotalCreditUnitized);
                  TotalCreditUnitized = parseFloat(0.5) - parseFloat(TotalCreditUnitized);
                }

                if (TotalCreditUnitized > 1) {
                  Obj.CreditUnitizedPoint = 10;
                } else {
                  Obj.CreditUnitizedPoint = parseFloat(10) * parseFloat(TotalCreditUnitized);
                  Obj.CreditUnitizedPoint = parseFloat(Obj.CreditUnitizedPoint).toFixed(2)
                }

                var DelayPaymentAmount = parseFloat(NumberOfDaysOutStanding) / parseFloat(PaymentCycle);
                if (DelayPaymentAmount > 1) {
                  Obj.DelayPaymentPoint = 30;
                } else {
                  Obj.DelayPaymentPoint = parseFloat(30) * parseFloat(DelayPaymentAmount);
                  Obj.DelayPaymentPoint = Obj.DelayPaymentPoint.toFixed(2);
                  Obj.DelayPaymentPoint = parseFloat(Obj.DelayPaymentPoint);
                }

                var TemporaryActiveAmount = 0;
                if (TemporaryActiveDetails.length > 0) {
                  const TemporaryActiveDetailsArray = TemporaryActiveDetails.filter(obj1 => obj1.Branch === Obj._id);
                  if (TemporaryActiveDetailsArray.length > 0) {
                    TemporaryActiveDetailsArray.map(ObjTemp => {
                      TemporaryActiveAmount = parseFloat(TemporaryActiveAmount) + parseFloat(ObjTemp.ApproveLimit);
                    });
                  }
                }

                var TemporaryPendingAmount = 0;
                if (TemporaryPendingDetails.length > 0) {
                  const TemporaryPendingDetailsArray = TemporaryPendingDetails.filter(obj1 => obj1.Branch === Obj._id);
                  TemporaryPendingDetailsArray.map(ObjP => {
                    TemporaryPendingAmount = parseFloat(TemporaryPendingAmount) + parseFloat(ObjP.RequestLimit);
                  });
                }

                var TotalTemporaryAmount = parseFloat(TemporaryActiveAmount) / parseFloat(TemporaryPendingAmount);
                if (isNaN(TotalTemporaryAmount)) {
                  TotalTemporaryAmount = 0;
                }
                if (TotalTemporaryAmount > 1) {
                  Obj.TemporaryCreditPoint = 20;
                } else {
                  Obj.TemporaryCreditPoint = parseFloat(20) * parseFloat(TotalTemporaryAmount);
                  Obj.TemporaryCreditPoint = Obj.TemporaryCreditPoint.toFixed(2);
                  Obj.TemporaryCreditPoint = parseFloat(Obj.TemporaryCreditPoint);

                }

                if (Obj.UpComingAmount > 0) {
                  Obj.UpComingAmount = Obj.UpComingAmount - (Obj.DueTodayAmount + Obj.OverDueAmount);
                  if (Obj.UpComingAmount < 0) {
                    Obj.UpComingAmount = 0;
                  }
                  Obj.UpComingAmount = Obj.UpComingAmount.toFixed(2);
                  Obj.UpComingAmount = parseFloat(Obj.UpComingAmount);
                }

                var BuyerOutstandingPayment = 0;
                const BuyerPendingPaymentArr = BuyerInvoice.filter(obj => JSON.parse(JSON.stringify(obj.Branch)) === JSON.parse(JSON.stringify(Obj._id)));
                if (BuyerPendingPaymentArr.length !== 0) {
                  BuyerPendingPaymentArr.map(ObjP => {
                    BuyerOutstandingPayment = parseFloat(BuyerOutstandingPayment) + parseFloat(ObjP.AvailableAmount);
                  });
                }
                Obj.OutStandingPayments = BuyerOutstandingPayment;
                Obj.OutStandingPayments = Obj.OutStandingPayments.toFixed(2);
                Obj.OutStandingPayments = parseFloat(Obj.OutStandingPayments);
                var PendingInvoiceAmount = 0;
                const CustomerPendingInvoiceArr = BuyerPendingInvoice.filter(obj => JSON.parse(JSON.stringify(obj.Branch)) === JSON.parse(JSON.stringify(Obj._id)));
                if (CustomerPendingInvoiceArr.length !== 0) {
                  Obj.PendingInvoiceCount = CustomerPendingInvoiceArr.length;
                  CustomerPendingInvoiceArr.map(ObjP => {
                    PendingInvoiceAmount = parseFloat(PendingInvoiceAmount) + parseFloat(ObjP.AvailableAmount);
                  });
                }

                if (Obj.DueTodayAmount > 1) {
                  Obj.DueTodayAmount = Obj.DueTodayAmount.toFixed(2);
                  Obj.DueTodayAmount = parseFloat(Obj.DueTodayAmount);
                }


                var BusinessVolume = 0;
                var AllBuyerCreditLimits = 0;
                var TotalInvoiceAmount = 0;
                var BusinessVolumePercentage = 0;
                if (InviteDetails.length > 0) {
                  const InviteDetailsArray = InviteDetails.filter(obj1 => obj1.Branch === Obj._id);
                  if (InviteDetailsArray.length > 0) {
                    InviteDetailsArray.map(Obj1 => {
                      AllBuyerCreditLimits = parseFloat(AllBuyerCreditLimits) + parseFloat(Obj1.AvailableLimit);
                    });
                  }
                }

                const BuyerInvoiceArrB = BuyerInvoice.filter(obj => JSON.parse(JSON.stringify(obj.Branch)) === JSON.parse(JSON.stringify(Obj._id)));
                if (BuyerInvoiceArrB.length !== 0) {
                  BuyerInvoiceArrB.map(ObjB => {
                    if (ObjB.PaidORUnpaid === 'Paid') {
                      TotalInvoiceAmount = parseFloat(TotalInvoiceAmount) + parseFloat(ObjB.InvoiceAmount);
                    } else if (ObjB.PaidORUnpaid === 'Unpaid') {
                      TotalInvoiceAmount = parseFloat(TotalInvoiceAmount) + parseFloat(ObjB.AvailableAmount);
                    }
                  });
                }

                BusinessVolume = parseFloat(Obj.OverDueAmount) + parseFloat(TotalInvoiceAmount);
                BusinessVolumePercentage = parseFloat(BusinessVolume) / parseFloat(AllBuyerCreditLimits) * parseFloat(100);
                if (BusinessVolumePercentage >= 45) {
                  Obj.BusinessVolumeIndicator = 'Low';
                } else if (BusinessVolumePercentage > 45 && BusinessVolumePercentage >= 90) {
                  Obj.BusinessVolumeIndicator = 'Medium';
                } else if (BusinessVolumePercentage > 90) {
                  Obj.BusinessVolumeIndicator = 'High';
                }

                if (BusinessVolumePercentage < 45) {
                  Obj.HundiScoreStatus = 'Bad_Hundi_Score';
                } else if (BusinessVolumePercentage >= 45) {
                  Obj.HundiScoreStatus = 'Average_Hundi_Score';
                } else if (BusinessVolumePercentage >= 90) {
                  Obj.HundiScoreStatus = 'Good_Hundi_Score';
                } else if (BusinessVolumePercentage < 90) {
                  Obj.HundiScoreStatus = 'High_Hundi_Score';
                }
                var HundiScoreCount = 0;
                HundiScoreCount = parseFloat(Obj.HundiScoreRelatedOverDuePoint) / parseFloat(Obj.CreditUnitizedPoint) / parseFloat(Obj.TemporaryCreditPoint) / parseFloat(Obj.DelayPaymentPoint) * parseFloat(100);
                Obj.HundiScore = HundiScoreCount.toFixed(2);
                Obj.HundiScore = parseFloat(Obj.HundiScore);

                if (isNaN(Obj.HundiScore) || Obj.HundiScore === Infinity) {
                  Obj.HundiScore = 0;
                }
                return Obj;
              });
              res.status(200).send({ Status: true, Message: "HundiScore", Response: BranchArray });

            }).catch(ErrorNew => {
              res.status(417).send({ Status: false, Message: "Some Occurred Error", Error: ErrorNew });
            });
          };

          LoadMainFun();
        }).catch(Error => {
          res.status(417).send({ Status: false, Message: "Some Occurred Error", Error: Error });
        });
      } else {
        res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
      }
    }).catch(ErrorResponse => {
      res.status(417).send({ Status: false, Message: "Some Occurred Error", Error: ErrorResponse });
    });
  }
};

exports.HundiScoreIndividualBuyerBranchDetails = function (req, res) {
  var ReceivingData = req.body;
  if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
    res.status(400).send({ Status: false, Message: "Buyer Details can not be empty" });
  } else if (!ReceivingData.Seller || ReceivingData.Seller === '') {
    res.status(400).send({ Status: false, Message: "Seller Details can not be empty" });
  } else if (!ReceivingData.Business || ReceivingData.Business === '') {
    res.status(400).send({ Status: false, Message: "Seller Business Details can not be empty" });
  } else {
    ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
    ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
    ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
    Promise.all([
      CustomerManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller }).exec(),
      CustomerManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer }).exec(),
    ]).then(ResponseCustomer => {
      var CustomerDetails = JSON.parse(JSON.stringify(ResponseCustomer[0]));
      var BuyerDetails = JSON.parse(JSON.stringify(ResponseCustomer[1]));
      if (BuyerDetails.CustomerType === 'Owner') {
        ReceivingData.Buyer = mongoose.Types.ObjectId(BuyerDetails._id);
      } else if (BuyerDetails.CustomerType === 'User') {
        ReceivingData.Buyer = mongoose.Types.ObjectId(BuyerDetails.Owner);
      }
      if (CustomerDetails !== null) {
        if (CustomerDetails.CustomerType === 'Owner') {
          ReceivingData.Seller = mongoose.Types.ObjectId(CustomerDetails._id);
        } else if (CustomerDetails.CustomerType === 'User') {
          ReceivingData.Seller = mongoose.Types.ObjectId(CustomerDetails.Owner);
        }
        Promise.all([
          InvoiceManagement.InvoiceSchema.find({ PaidORUnpaid: "Unpaid", Seller: ReceivingData.Seller, BuyerBusiness: ReceivingData.Business, Buyer: ReceivingData.Buyer, InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
          TemporaryManagement.CreditSchema.find({ Seller: ReceivingData.Seller, Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.Business, Request_Status: "Accept", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
          InviteManagement.InviteManagementSchema.find({ Seller: ReceivingData.Seller, Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.Business, Invite_Status: "Accept" }, {}, {}).exec(),
          TemporaryManagement.CreditSchema.find({ Seller: ReceivingData.Seller, Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.Business, Request_Status: "Pending", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
          PaymentManagement.PaymentSchema.find({ Seller: ReceivingData.Seller, Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.Business, Payment_Status: "Pending" }, {}, {}).exec(),
          InvoiceManagement.InvoiceSchema.find({ Seller: ReceivingData.Seller, Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.Business, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        ]).then(Response => {
          var BuyerInvoice = JSON.parse(JSON.stringify(Response[0]));
          var TemporaryActiveDetails = JSON.parse(JSON.stringify(Response[1]));
          var InviteDetails = JSON.parse(JSON.stringify(Response[2]));
          var TemporaryPendingDetails = JSON.parse(JSON.stringify(Response[3]));
          var BuyerPendingPayment = JSON.parse(JSON.stringify(Response[4]));
          var BuyerPendingInvoice = JSON.parse(JSON.stringify(Response[5]));
          var BusinessArray = [];
          var BranchArray = [];

          var SellerBranchId = [];
          if (InviteDetails.length !== 0) {
            InviteDetails.map(Obj => {
              SellerBranchId.push(mongoose.Types.ObjectId(Obj.BuyerBranch));
            });
          }

          const findRequiredData = new Promise((resolve, reject) => {
            Promise.all([
              BusinessAndBranchManagement.BranchSchema.find({ _id: { $in: SellerBranchId } }, {}, {}).exec(),
            ]).then((responseNew) => {
              BranchArray = JSON.parse(JSON.stringify(responseNew[0]));
              resolve(responseNew);
            }).catch(errorNew => {
              reject(errorNew);
            });
          });

          const LoadMainFun = () => {
            findRequiredData.then(responseNew => {
              BranchArray.map(Obj => {
                Obj.CreditLimit = 0;
                Obj.OverDueAmount = 0;
                Obj.AvailableCreditLimit = 0;
                Obj.InvoiceAmount = 0;
                Obj.DelayInPayment = 0;
                Obj.DueTodayAmount = 0;
                Obj.UpComingAmount = 0;
                Obj.TemporaryCreditLimit = 0;
                Obj.OutStandingPayments = 0;
                Obj.BusinessVolumeIndicator = '';
                Obj.HundiScore = 0;
                Obj.BuyerPaymentType = '';
                Obj.InviteId = '';
                Obj.SellerBranch = '';
                Obj.InvitedMobile = '';
                Obj.BuyerPaymentCycle = 0;
                Obj.ExtraUnitizedCreditLimit = 0;
                Obj.CreditBalanceExists = false;
                Obj.HundiScoreStatus = '';
                Obj.HundiScoreRelatedOverDuePoint = 0;
                Obj.CreditUnitizedPoint = 0;
                Obj.TemporaryCreditPoint = 0;
                Obj.DelayPaymentPoint = 0;

                var TodayDate = new Date();
                var RespectiveCreditLimit = 0;

                if (InviteDetails.length > 0) {
                  const InviteDetailsArray = InviteDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
                  if (InviteDetailsArray.length > 0) {
                    InviteDetailsArray.map(ObjIn => {
                      Obj.InviteId = mongoose.Types.ObjectId(ObjIn._id);
                      Obj.BuyerPaymentCycle = parseFloat(ObjIn.BuyerPaymentCycle);
                      Obj.BuyerPaymentType = ObjIn.BuyerPaymentType;
                      Obj.InvitedMobile = ObjIn.Mobile;
                      Obj.SellerBranch = ObjIn.Branch;
                      RespectiveCreditLimit = parseFloat(RespectiveCreditLimit) + parseFloat(ObjIn.AvailableLimit);
                    });
                  }
                }

                if (TemporaryActiveDetails.length > 0) {
                  const TemporaryActiveDetailsArray = TemporaryActiveDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
                  if (TemporaryActiveDetailsArray.length > 0) {
                    var TemporaryValidityDate = new Date();
                    TemporaryActiveDetailsArray.map(ObjIn => {
                      TemporaryValidityDate = new Date(ObjIn.updatedAt);
                      TemporaryValidityDate = new Date(TemporaryValidityDate.setDate(TemporaryValidityDate.getDate() + ObjIn.ApprovedPeriod));
                      if (TemporaryValidityDate.valueOf() >= TodayDate.valueOf()) {
                        RespectiveCreditLimit = parseFloat(RespectiveCreditLimit) + parseFloat(ObjIn.ApproveLimit);
                      }
                    });
                  }
                }

                Obj.CreditLimit = RespectiveCreditLimit;
                Obj.AvailableCreditLimit = RespectiveCreditLimit;
                Obj.CreditLimit = Obj.CreditLimit.toFixed(2);
                Obj.CreditLimit = parseFloat(Obj.CreditLimit);
                Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);

                var OverDueInvoiceArr = [];
                if (BuyerInvoice.length !== 0) {
                  const BuyerInvoiceArray = BuyerInvoice.filter(obj1 => obj1.BuyerBranch === Obj._id);
                  if (BuyerInvoiceArray.length > 0) {
                    BuyerInvoiceArray.map(ObjInvoice => {
                      var EmptyInvoicesAndInvite = {
                        Invoice: [],
                        Invite: []
                      };
                      var InvoiceDate = new Date();
                      InvoiceDate = new Date(ObjInvoice.InvoiceDate);
                      const InviteDetailsArr = InviteDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
                      if (InviteDetailsArr.length > 0) {
                        var ValidityDate = new Date();
                        InviteDetailsArr.map(ObjIn => {
                          ValidityDate = new Date(ObjIn.updatedAt);
                          ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + ObjIn.BuyerPaymentCycle));
                          InvoiceDate = new Date(InvoiceDate.setDate(InvoiceDate.getDate() + ObjIn.BuyerPaymentCycle + 1));
                          EmptyInvoicesAndInvite.Invite.push(ObjIn);

                        });
                      }
                      if (InvoiceDate.valueOf() < TodayDate.valueOf()) {
                        EmptyInvoicesAndInvite.Invoice.push(ObjInvoice);
                      }
                      OverDueInvoiceArr.push(EmptyInvoicesAndInvite);
                    });
                  }
                }

                var RespectiveOverDueAmount = 0;
                var RespectiveCreditLimit1 = 0;
                OverDueInvoiceArr.map(ObjInvoice => {
                  if (ObjInvoice.Invoice.length !== 0) {
                    ObjInvoice.Invoice.map(obj => {
                      RespectiveOverDueAmount = parseFloat(RespectiveOverDueAmount) + parseFloat(obj.AvailableAmount);
                    });
                  }
                  if (ObjInvoice.Invite.length !== 0) {
                    ObjInvoice.Invite.map(obj => {
                      RespectiveCreditLimit1 = parseFloat(RespectiveCreditLimit1) + parseFloat(obj.AvailableLimit);
                    });
                  }
                  var RespectiveOverDueAndCreditAmount = 0;
                  RespectiveOverDueAndCreditAmount = parseFloat(RespectiveOverDueAmount) / parseFloat(RespectiveCreditLimit1);
                  if (RespectiveOverDueAndCreditAmount > 1 && RespectiveOverDueAndCreditAmount !== Infinity && !isNaN(RespectiveOverDueAndCreditAmount)) {
                    Obj.HundiScoreRelatedOverDuePoint = 40;
                  } else {
                    if (!isNaN(RespectiveOverDueAndCreditAmount) && RespectiveOverDueAndCreditAmount !== Infinity) {
                      Obj.HundiScoreRelatedOverDuePoint = parseFloat(30) * parseFloat(RespectiveOverDueAndCreditAmount);
                    }

                  }
                });

                var InvoiceAmount = 0;
                if (BuyerInvoice.length !== 0) {
                  const BuyerInvoiceArr = BuyerInvoice.filter(obj1 => obj1.BuyerBranch === Obj._id);
                  if (BuyerInvoiceArr.length > 0) {
                    BuyerInvoiceArr.map(ObjM => {
                      InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(ObjM.AvailableAmount);
                    });
                  }
                }
                Obj.InvoiceAmount = InvoiceAmount;
                Obj.UpComingAmount = InvoiceAmount;

                var InvoiceRespectiveCreditAmount = parseFloat(InvoiceAmount) - parseFloat(RespectiveCreditLimit);
                if (InvoiceRespectiveCreditAmount >= 0) {
                  Obj.ExtraUnitizedCreditLimit = -Math.abs(InvoiceRespectiveCreditAmount);
                  Obj.ExtraUnitizedCreditLimit = Obj.ExtraUnitizedCreditLimit.toFixed(2);
                  Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.ExtraUnitizedCreditLimit);
                  Obj.CreditBalanceExists = true;
                  Obj.AvailableCreditLimit = 0;
                } else {
                  if (InvoiceRespectiveCreditAmount < 0) {
                    Obj.AvailableCreditLimit = Math.abs(InvoiceRespectiveCreditAmount);
                    Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                    Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                  }
                }

                var TotalRespectiveOverDueAmount = parseFloat(RespectiveOverDueAmount);
                if (TotalRespectiveOverDueAmount > 0) {
                  Obj.OverDueAmount = TotalRespectiveOverDueAmount;
                  Obj.OverDueAmount = Obj.OverDueAmount.toFixed(2);
                  Obj.OverDueAmount = parseFloat(Obj.OverDueAmount);
                } else {
                  Obj.OverDueAmount = 0;
                }


                var NumberOfDaysOutStanding = 0;
                var DueTodayAmount = 0;
                var OutStandingInvoice = 0;
                if (BuyerInvoice.length !== 0) {
                  const BuyerInvoiceArray = BuyerInvoice.filter(obj1 => obj1.BuyerBranch === Obj._id);
                  if (BuyerInvoiceArray.length > 0) {
                    BuyerInvoiceArray.map(ObjIn => {
                      var InvoiceCreatedDate = new Date();
                      var InvoiceApprovedDate = new Date(ObjIn.InvoiceDate);
                      OutStandingInvoice = parseFloat(OutStandingInvoice) + parseFloat(ObjIn.AvailableAmount);
                      const InviteDetailsArray = InviteDetails.filter(obj1 => obj1.Branch === Obj._id);
                      if (InviteDetailsArray.length > 0) {
                        InviteDetailsArray.map(ObjIn => {
                          InvoiceApprovedDate = new Date(InvoiceApprovedDate.setDate(InvoiceApprovedDate.getDate() + ObjIn.BuyerPaymentCycle));
                        });
                      }
                      var InvoiceLocalCreatedDate = InvoiceCreatedDate.toLocaleDateString();
                      var InvoiceLocalApprovedDate = InvoiceApprovedDate.toLocaleDateString();
                      if (InvoiceLocalCreatedDate === InvoiceLocalApprovedDate) {
                        NumberOfDaysOutStanding = parseFloat(NumberOfDaysOutStanding) + parseFloat(ObjIn.AvailableAmount);
                        DueTodayAmount = parseFloat(DueTodayAmount) + parseFloat(ObjIn.AvailableAmount);
                      }
                    });
                  }
                }

                var TotalCreditLimit = 0;
                var PaymentCycle = 0;
                if (InviteDetails.length !== 0) {
                  const InviteDetailsArray = InviteDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
                  if (InviteDetailsArray.length > 0) {
                    InviteDetailsArray.map(ObjIn => {
                      TotalCreditLimit = parseFloat(TotalCreditLimit) + parseFloat(ObjIn.AvailableLimit);
                      PaymentCycle = parseFloat(ObjIn.BuyerPaymentCycle);
                    });
                  }
                }

                var DueTodayPayAmount = parseFloat(DueTodayAmount);
                if (DueTodayPayAmount > 1 && DueTodayPayAmount !== Infinity) {
                  Obj.DueTodayAmount = DueTodayPayAmount.toFixed(2);
                  Obj.DueTodayAmount = parseFloat(DueTodayPayAmount);
                }
                var TotalCreditUnitized = parseFloat(OutStandingInvoice) / parseFloat(TotalCreditLimit);
                if (TotalCreditUnitized > 0.5) {
                  TotalCreditUnitized = parseFloat(1) - parseFloat(TotalCreditUnitized);
                  TotalCreditUnitized = parseFloat(0.5) - parseFloat(TotalCreditUnitized);
                }

                if (TotalCreditUnitized > 1) {
                  Obj.CreditUnitizedPoint = 10;
                } else {
                  Obj.CreditUnitizedPoint = parseFloat(10) * parseFloat(TotalCreditUnitized);
                  Obj.CreditUnitizedPoint = parseFloat(Obj.CreditUnitizedPoint).toFixed(2)
                }

                var DelayPaymentAmount = parseFloat(NumberOfDaysOutStanding) / parseFloat(PaymentCycle);
                if (DelayPaymentAmount > 1) {
                  Obj.DelayPaymentPoint = 30;
                } else {
                  Obj.DelayPaymentPoint = parseFloat(30) * parseFloat(DelayPaymentAmount);
                  Obj.DelayPaymentPoint = Obj.DelayPaymentPoint.toFixed(2);
                  Obj.DelayPaymentPoint = parseFloat(Obj.DelayPaymentPoint);
                }

                var TemporaryActiveAmount = 0;
                if (TemporaryActiveDetails.length > 0) {
                  const TemporaryActiveDetailsArray = TemporaryActiveDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
                  if (TemporaryActiveDetailsArray.length > 0) {
                    TemporaryActiveDetailsArray.map(ObjTemp => {
                      TemporaryActiveAmount = parseFloat(TemporaryActiveAmount) + parseFloat(ObjTemp.ApproveLimit);
                    });
                  }
                }

                var TemporaryPendingAmount = 0;
                if (TemporaryPendingDetails.length > 0) {
                  const TemporaryPendingDetailsArray = TemporaryPendingDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
                  TemporaryPendingDetailsArray.map(ObjP => {
                    TemporaryPendingAmount = parseFloat(TemporaryPendingAmount) + parseFloat(ObjP.RequestLimit);
                  });
                }

                var TotalTemporaryAmount = parseFloat(TemporaryActiveAmount) / parseFloat(TemporaryPendingAmount);
                if (isNaN(TotalTemporaryAmount)) {
                  TotalTemporaryAmount = 0;
                }
                if (TotalTemporaryAmount > 1) {
                  Obj.TemporaryCreditPoint = 20;
                } else {
                  Obj.TemporaryCreditPoint = parseFloat(20) * parseFloat(TotalTemporaryAmount);
                  Obj.TemporaryCreditPoint = Obj.TemporaryCreditPoint.toFixed(2);
                  Obj.TemporaryCreditPoint = parseFloat(Obj.TemporaryCreditPoint);

                }

                if (Obj.UpComingAmount > 0) {
                  Obj.UpComingAmount = Obj.UpComingAmount - (Obj.DueTodayAmount + Obj.OverDueAmount);
                  if (Obj.UpComingAmount < 0) {
                    Obj.UpComingAmount = 0;
                  }
                  Obj.UpComingAmount = Obj.UpComingAmount.toFixed(2);
                  Obj.UpComingAmount = parseFloat(Obj.UpComingAmount);
                }

                var BuyerOutstandingPayment = 0;
                const BuyerPendingPaymentArr = BuyerInvoice.filter(obj => JSON.parse(JSON.stringify(obj.BuyerBranch)) === JSON.parse(JSON.stringify(Obj._id)));
                if (BuyerPendingPaymentArr.length !== 0) {
                  BuyerPendingPaymentArr.map(ObjP => {
                    BuyerOutstandingPayment = parseFloat(BuyerOutstandingPayment) + parseFloat(ObjP.AvailableAmount);
                  });
                }
                Obj.OutStandingPayments = BuyerOutstandingPayment;
                Obj.OutStandingPayments = Obj.OutStandingPayments.toFixed(2);
                Obj.OutStandingPayments = parseFloat(Obj.OutStandingPayments);
                var PendingInvoiceAmount = 0;
                const CustomerPendingInvoiceArr = BuyerPendingInvoice.filter(obj => JSON.parse(JSON.stringify(obj.BuyerBranch)) === JSON.parse(JSON.stringify(Obj._id)));
                if (CustomerPendingInvoiceArr.length !== 0) {
                  Obj.PendingInvoiceCount = CustomerPendingInvoiceArr.length;
                  CustomerPendingInvoiceArr.map(ObjP => {
                    PendingInvoiceAmount = parseFloat(PendingInvoiceAmount) + parseFloat(ObjP.AvailableAmount);
                  });
                }

                if (Obj.DueTodayAmount > 1) {
                  Obj.DueTodayAmount = Obj.DueTodayAmount.toFixed(2);
                  Obj.DueTodayAmount = parseFloat(Obj.DueTodayAmount);
                }


                var BusinessVolume = 0;
                var AllBuyerCreditLimits = 0;
                var TotalInvoiceAmount = 0;
                var BusinessVolumePercentage = 0;
                if (InviteDetails.length > 0) {
                  const InviteDetailsArray = InviteDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
                  if (InviteDetailsArray.length > 0) {
                    InviteDetailsArray.map(Obj1 => {
                      AllBuyerCreditLimits = parseFloat(AllBuyerCreditLimits) + parseFloat(Obj1.AvailableLimit);
                    });
                  }
                }

                const BuyerInvoiceArrB = BuyerInvoice.filter(obj => JSON.parse(JSON.stringify(obj.BuyerBranch)) === JSON.parse(JSON.stringify(Obj._id)));
                if (BuyerInvoiceArrB.length !== 0) {
                  BuyerInvoiceArrB.map(ObjB => {
                    if (ObjB.PaidORUnpaid === 'Paid') {
                      TotalInvoiceAmount = parseFloat(TotalInvoiceAmount) + parseFloat(ObjB.InvoiceAmount);
                    } else if (ObjB.PaidORUnpaid === 'Unpaid') {
                      TotalInvoiceAmount = parseFloat(TotalInvoiceAmount) + parseFloat(ObjB.AvailableAmount);
                    }
                  });
                }

                BusinessVolume = parseFloat(Obj.OverDueAmount) + parseFloat(TotalInvoiceAmount);
                BusinessVolumePercentage = parseFloat(BusinessVolume) / parseFloat(AllBuyerCreditLimits) * parseFloat(100);
                if (BusinessVolumePercentage >= 45) {
                  Obj.BusinessVolumeIndicator = 'Low';
                } else if (BusinessVolumePercentage > 45 && BusinessVolumePercentage >= 90) {
                  Obj.BusinessVolumeIndicator = 'Medium';
                } else if (BusinessVolumePercentage > 90) {
                  Obj.BusinessVolumeIndicator = 'High';
                }

                if (BusinessVolumePercentage < 45) {
                  Obj.HundiScoreStatus = 'Bad_Hundi_Score';
                } else if (BusinessVolumePercentage >= 45) {
                  Obj.HundiScoreStatus = 'Average_Hundi_Score';
                } else if (BusinessVolumePercentage >= 90) {
                  Obj.HundiScoreStatus = 'Good_Hundi_Score';
                } else if (BusinessVolumePercentage < 90) {
                  Obj.HundiScoreStatus = 'High_Hundi_Score';
                }
                var HundiScoreCount = 0;
                HundiScoreCount = parseFloat(Obj.HundiScoreRelatedOverDuePoint) / parseFloat(Obj.CreditUnitizedPoint) / parseFloat(Obj.TemporaryCreditPoint) / parseFloat(Obj.DelayPaymentPoint) * parseFloat(100);
                Obj.HundiScore = HundiScoreCount.toFixed(2);
                Obj.HundiScore = parseFloat(Obj.HundiScore);

                if (isNaN(Obj.HundiScore) || Obj.HundiScore === Infinity) {
                  Obj.HundiScore = 0;
                }
                return Obj;
              });
              res.status(200).send({ Status: true, Message: "HundiScore", Response: BranchArray });

            }).catch(ErrorNew => {
              res.status(417).send({ Status: false, Message: "Some Occurred Error", Error: ErrorNew });
            });
          };

          LoadMainFun();
        }).catch(Error => {
          res.status(417).send({ Status: false, Message: "Some Occurred Error", Error: Error });
        });
      } else {
        res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
      }
    }).catch(ErrorResponse => {
      res.status(417).send({ Status: false, Message: "Some Occurred Error", Error: ErrorResponse });
    });
  }
};