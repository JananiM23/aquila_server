var mongoose = require('mongoose');
var CustomersManagement = require('../../Models/CustomerManagement.model');
var ErrorHandling = require('../../Handling/ErrorHandling').ErrorHandling;
var BusinessAndBranchManagement = require('../../Models/BusinessAndBranchManagement.model');
var InvoiceManagement = require('../../Models/InvoiceManagement.model');
var InviteManagement = require('../../Models/Invite_Management.model');
var TemporaryManagement = require('../../Models/TemporaryCredit.model');
var moment = require('moment');
var multer = require('multer');
var NotificationManagement = require('../../Models/notification_management.model');
var PaymentModel = require('../../Models/PaymentManagement.model');
var FCM_App = require('../../../Config/fcm_config').CustomerNotify;


var options = {
   priority: 'high',
   timeToLive: 60 * 60 * 24
};
var fs = require('fs-extra');


// Seller Business And Branches Invoice List for Seller 
exports.Seller_PaymentCount = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Seller || ReceivingData.Seller === '') {
      res.status(400).send({ Status: false, Message: "Seller can not be empty" });
   } else {
      ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller }, {}, {}).exec(function (err, result) {
         if (err) {
            ErrorHandling.ErrorLogCreation(req, 'Seller Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(err));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
         } else {
            if (result !== null) {
               if (result.CustomerType === 'Owner') {
                  Promise.all([
                     BusinessAndBranchManagement.BusinessSchema.find({ Customer: ReceivingData.Seller, IfSeller: true, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     // BusinessAndBranchManagement.BranchSchema.find({ Customer: ReceivingData.Seller, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     InvoiceManagement.InvoiceSchema.find({ Seller: ReceivingData.Seller, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     InvoiceManagement.InvoiceSchema.find({ Seller: ReceivingData.Seller, ActiveStatus: true, InvoiceStatus: 'Pending', IfDeleted: false }, {}, {}).exec(),
                     PaymentModel.PaymentSchema.find({ Seller: ReceivingData.Seller, Payment_Status: "Pending" }, {}, {}).exec(),
                  ]).then(ResponseOU => {
                     var BusinessDetails = JSON.parse(JSON.stringify(ResponseOU[0]));
                     // var BranchDetails = JSON.parse(JSON.stringify(ResponseOU[1]));
                     var InvoiceDetails = JSON.parse(JSON.stringify(ResponseOU[1]));
                     var InvoicePendingDetails = JSON.parse(JSON.stringify(ResponseOU[2]));
                     var PendingPaymentDetails = JSON.parse(JSON.stringify(ResponseOU[3]));
                     if (BusinessDetails.length > 0) {
                        BusinessDetails.map(Obj => {
                           Obj.ExtraUnitizedCreditLimit = 0;
                           Obj.CreditBalanceExists = false;
                           const BranchDetailsArr = BranchDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                           if (BranchDetailsArr.length > 0) {
                              Obj.Branches = BranchDetailsArr;
                              Obj.Branches = JSON.parse(JSON.stringify(Obj.Branches));
                              Obj.Branches.map(ObjB => {
                                 ObjB.ExtraUnitizedCreditLimit = 0;
                                 ObjB.CreditBalanceExists = false;
                                 ObjB.UserDetails = [];
                                 ObjB.TotalPaymentAmount = 0;
                                 const InvoiceDetailsBranchArr = InvoicePendingDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Branch)) === JSON.parse(JSON.stringify(ObjB._id)));
                                 const InvoiceAcceptDetailsBranchArr = PendingPaymentDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Branch)) === JSON.parse(JSON.stringify(ObjB._id)));
                                 ObjB.InvoiceCount = InvoiceDetailsBranchArr.length;
                                 ObjB.PaymentCount = InvoiceAcceptDetailsBranchArr.length;
                                 const InvoiceDetailsBranchArray = InvoiceDetails.filter(obj1 => obj1.Branch === ObjB._id);
                                 if (InvoiceDetailsBranchArray.length > 0) {
                                    var InvoiceAmount = 0;
                                    InvoiceDetailsBranchArray.map(obj => {
                                       InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.AvailableAmount);
                                    });

                                    if (InvoiceAmount > 0) {
                                       ObjB.TotalPaymentAmount = InvoiceAmount.toFixed(2);
                                       ObjB.TotalPaymentAmount = parseFloat(ObjB.TotalPaymentAmount);

                                       ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit) - parseFloat(InvoiceAmount);
                                       if (ObjB.AvailableCreditLimit > 0) {
                                          ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                                       } else {
                                          ObjB.ExtraUnitizedCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                                          ObjB.ExtraUnitizedCreditLimit = ObjB.ExtraUnitizedCreditLimit.toFixed(2);
                                          ObjB.ExtraUnitizedCreditLimit = parseFloat(ObjB.ExtraUnitizedCreditLimit);
                                          ObjB.CreditBalanceExists = true;
                                          ObjB.AvailableCreditLimit = 0;
                                       }
                                       ObjB.AvailableCreditLimit = ObjB.AvailableCreditLimit.toFixed(2);
                                       ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                                    }
                                 }
                                 return ObjB;
                              });
                           } else {
                              Obj.Branches = [];
                           }
                           const BranchDetailsArrArr = BranchDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                           var BranchCreditLimit = 0;
                           if (BranchDetailsArrArr.length > 0) {
                              BranchDetailsArrArr.map(obj => {
                                 BranchCreditLimit = parseFloat(BranchCreditLimit) + parseFloat(obj.AvailableCreditLimit);
                              });
                              if (BranchCreditLimit > 0) {
                                 Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) - parseFloat(BranchCreditLimit);
                                 if (Obj.AvailableCreditLimit > 0) {
                                    Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                 } else {
                                    Obj.AvailableCreditLimit = 0;
                                 }
                                 Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                                 Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                              }
                           }
                           const InvoiceDetailsArr = InvoicePendingDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                           const PaymentDetailsArr = PendingPaymentDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                           Obj.BusinessInvoice = InvoiceDetailsArr.length;
                           Obj.BusinessPayment = PaymentDetailsArr.length;
                           return Obj;
                        });
                        res.status(200).send({ Status: true, Message: 'Buyer Invoice Count', Response: BusinessDetails });
                     } else {
                        res.status(200).send({ Status: true, Message: 'No Records Found', Response: [] });
                     }
                  }).catch(Error => {
                     ErrorHandling.ErrorLogCreation(req, 'Seller Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(Error));
                     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
                  });
               } else if (result.CustomerType === 'User') {
                  var BuyerBusinessArray = [];
                  var BuyerBranchArray = [];
                  if (result.BusinessAndBranches.length > 0) {
                     result.BusinessAndBranches.map(Obj => {
                        BuyerBusinessArray.push(mongoose.Types.ObjectId(Obj.Business));
                        Obj.Branches.map(obj => {
                           BuyerBranchArray.push(mongoose.Types.ObjectId(obj));
                        });
                     });
                  }

                  Promise.all([
                     BusinessAndBranchManagement.BusinessSchema.find({ _id: { $in: BuyerBusinessArray }, IfSeller: true, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     BusinessAndBranchManagement.BranchSchema.find({ _id: { $in: BuyerBranchArray }, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     InvoiceManagement.InvoiceSchema.find({ Branch: { $in: BuyerBranchArray }, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     InvoiceManagement.InvoiceSchema.find({ Branch: { $in: BuyerBranchArray }, ActiveStatus: true, InvoiceStatus: 'Pending', IfDeleted: false }, {}, {}).exec(),
                     PaymentModel.PaymentSchema.find({ Branch: { $in: BuyerBranchArray }, Payment_Status: "Pending" }, {}, {}).exec(),
                  ]).then(ResponseOU => {
                     var BusinessDetails = JSON.parse(JSON.stringify(ResponseOU[0]));
                     var BranchDetails = JSON.parse(JSON.stringify(ResponseOU[1]));
                     var InvoiceDetails = JSON.parse(JSON.stringify(ResponseOU[2]));
                     var InvoicePendingDetails = JSON.parse(JSON.stringify(ResponseOU[3]));
                     var PendingPaymentDetails = JSON.parse(JSON.stringify(ResponseOU[4]));
                     if (BusinessDetails.length > 0) {
                        BusinessDetails.map(Obj => {
                           Obj.ExtraUnitizedCreditLimit = 0;
                           Obj.CreditBalanceExists = false;
                           const BranchDetailsArr = BranchDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                           if (BranchDetailsArr.length > 0) {
                              Obj.Branches = BranchDetailsArr;
                              Obj.Branches = JSON.parse(JSON.stringify(Obj.Branches));
                              Obj.Branches.map(ObjB => {
                                 ObjB.ExtraUnitizedCreditLimit = 0;
                                 ObjB.CreditBalanceExists = false;
                                 ObjB.UserDetails = [];
                                 ObjB.TotalPaymentAmount = 0;
                                 const InvoiceDetailsBranchArr = InvoicePendingDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Branch)) === JSON.parse(JSON.stringify(ObjB._id)));
                                 const InvoiceAcceptDetailsBranchArr = PendingPaymentDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Branch)) === JSON.parse(JSON.stringify(ObjB._id)));
                                 ObjB.InvoiceCount = InvoiceDetailsBranchArr.length;
                                 ObjB.PaymentCount = InvoiceAcceptDetailsBranchArr.length;
                                 const InvoiceDetailsBranchArray = InvoiceDetails.filter(obj1 => obj1.Branch === ObjB._id);
                                 if (InvoiceDetailsBranchArray.length > 0) {
                                    var InvoiceAmount = 0;
                                    InvoiceDetailsBranchArray.map(obj => {
                                       InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.AvailableAmount);
                                    });
                                    if (InvoiceAmount > 0) {
                                       ObjB.TotalPaymentAmount = InvoiceAmount.toFixed(2);
                                       ObjB.TotalPaymentAmount = parseFloat(ObjB.TotalPaymentAmount);
                                       ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit) - parseFloat(InvoiceAmount);
                                       if (ObjB.AvailableCreditLimit > 0) {
                                          ObjB.AvailableCreditLimit = Math.abs(ObjB.AvailableCreditLimit);
                                       } else {
                                          ObjB.ExtraUnitizedCreditLimit = -Math.abs(ObjB.ExtraUnitizedCreditLimit);
                                          ObjB.ExtraUnitizedCreditLimit = ObjB.ExtraUnitizedCreditLimit.toFixed(2);
                                          ObjB.ExtraUnitizedCreditLimit = parseFloat(ObjB.ExtraUnitizedCreditLimit);
                                          ObjB.CreditBalanceExists = true;
                                          ObjB.AvailableCreditLimit = 0;
                                       }
                                       ObjB.AvailableCreditLimit = ObjB.AvailableCreditLimit.toFixed(2);
                                       ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                                    }
                                 }
                                 return ObjB;
                              });
                           } else {
                              Obj.Branches = [];
                           }
                           const BranchDetailsArrArr = BranchDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                           var BranchCreditLimit = 0;
                           if (BranchDetailsArrArr.length > 0) {
                              BranchDetailsArrArr.map(obj => {
                                 BranchCreditLimit = parseFloat(BranchCreditLimit) + parseFloat(obj.AvailableCreditLimit);
                              });
                              if (BranchCreditLimit > 0) {
                                 Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) - parseFloat(BranchCreditLimit);
                                 if (Obj.AvailableCreditLimit > 0) {
                                    Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                 } else {
                                    Obj.AvailableCreditLimit = 0;
                                 }
                                 Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                                 Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                              }
                           }
                           const InvoiceDetailsArr = InvoicePendingDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                           const PaymentDetailsArr = PendingPaymentDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                           Obj.BusinessInvoice = InvoiceDetailsArr.length;
                           Obj.BusinessPayment = PaymentDetailsArr.length;
                           return Obj;
                        });
                        res.status(200).send({ Status: true, Message: 'Buyer Invoice Count', Response: BusinessDetails });
                     } else {
                        res.status(200).send({ Status: true, Message: 'No Records Found', Response: [] });
                     }
                  }).catch(Error => {
                     ErrorHandling.ErrorLogCreation(req, 'Seller Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(Error));
                     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
                  });
               }
            } else {
               res.status(400).send({ Status: false, Message: "Invalid Customer Details" });
            }
         }
      });
   }
};

// Buyer Business And Branches Invoice List for Buyer
exports.Buyer_PaymentCount = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
      res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
   } else {
      ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer }, {}, {}).exec(function (err, result) {
         if (err) {
            ErrorHandling.ErrorLogCreation(req, 'Seller Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(err));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
         } else {
            if (result !== null) {
               if (result.CustomerType === 'Owner') {
                  Promise.all([
                     BusinessAndBranchManagement.BusinessSchema.find({ Customer: ReceivingData.Buyer, IfBuyer: true, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     BusinessAndBranchManagement.BranchSchema.find({ Customer: ReceivingData.Buyer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     InviteManagement.InviteManagementSchema.find({ Buyer: ReceivingData.Buyer, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     TemporaryManagement.CreditSchema.find({ Buyer: ReceivingData.Buyer, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     InvoiceManagement.InvoiceSchema.find({ Buyer: ReceivingData.Buyer, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     InvoiceManagement.InvoiceSchema.find({ Buyer: ReceivingData.Buyer, ActiveStatus: true, InvoiceStatus: 'Pending', IfDeleted: false }, {}, {}).exec(),
                     PaymentModel.PaymentSchema.find({ Buyer: ReceivingData.Buyer, Payment_Status: "Pending" }, {}, {}).exec(),
                     InvoiceManagement.InvoiceSchema.find({ Buyer: ReceivingData.Buyer, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                  ]).then(ResponseOU => {
                     var BusinessDetails = JSON.parse(JSON.stringify(ResponseOU[0]));
                     var BranchDetails = JSON.parse(JSON.stringify(ResponseOU[1]));
                     var InviteDetails = JSON.parse(JSON.stringify(ResponseOU[2]));
                     var TemporaryDetails = JSON.parse(JSON.stringify(ResponseOU[3]));
                     var InvoiceDetails = JSON.parse(JSON.stringify(ResponseOU[4]));
                     var InvoicePendingDetails = JSON.parse(JSON.stringify(ResponseOU[5]));
                     var PendingPaymentDetails = JSON.parse(JSON.stringify(ResponseOU[6]));
                     var InvoiceAcceptList = JSON.parse(JSON.stringify(ResponseOU[7]));
                     if (BusinessDetails.length > 0) {
                        BusinessDetails.map(Obj => {
                           Obj.ExtraUnitizedCreditLimit = 0;
                           Obj.CreditBalanceExists = false;
                           const BranchDetailsArr = BranchDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                           if (BranchDetailsArr.length > 0) {
                              Obj.Branches = BranchDetailsArr;
                              Obj.Branches = JSON.parse(JSON.stringify(Obj.Branches));
                              Obj.Branches.map(ObjB => {
                                 ObjB.ExtraUnitizedCreditLimit = 0;
                                 ObjB.CreditBalanceExists = false;
                                 ObjB.UserDetails = [];
                                 ObjB.TotalPaymentAmount = 0;
                                 const InvoiceDetailsBranchArr = InvoicePendingDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.BuyerBranch)) === JSON.parse(JSON.stringify(ObjB._id)));
                                 const InvoiceAcceptDetailsBranchArr = InvoiceAcceptList.filter(obj1 => JSON.parse(JSON.stringify(obj1.BuyerBranch)) === JSON.parse(JSON.stringify(ObjB._id)));

                                 ObjB.InvoiceCount = InvoiceDetailsBranchArr.length;
                                 ObjB.PaymentCount = InvoiceAcceptDetailsBranchArr.length;
                                 const TemporaryDetailsBranchArr = TemporaryDetails.filter(obj1 => obj1.BuyerBranch === ObjB._id);
                                 if (TemporaryDetailsBranchArr.length > 0) {
                                    var BranchValidityDate = new Date();
                                    var BranchTodayDate = new Date();
                                    TemporaryDetailsBranchArr.map(obj => {
                                       BranchValidityDate = new Date(obj.updatedAt);
                                       BranchValidityDate = new Date(BranchValidityDate.setDate(BranchValidityDate.getDate() + obj.ApprovedPeriod));
                                       if (BranchValidityDate.valueOf() >= BranchTodayDate.valueOf()) {
                                          ObjB.BranchCreditLimit = parseFloat(ObjB.BranchCreditLimit) + parseFloat(obj.ApproveLimit);
                                          ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit) + parseFloat(obj.ApproveLimit);
                                       }
                                    });
                                 }

                                 const InviteDetailsBranchArr = InviteDetails.filter(obj1 => obj1.BuyerBranch === ObjB._id);
                                 if (InviteDetailsBranchArr.length > 0) {
                                    var BranchValidityInviteDate = new Date();
                                    var BranchTodayInviteDate = new Date();
                                    InviteDetailsBranchArr.map(obj => {
                                       ObjB.BranchCreditLimit = parseFloat(ObjB.BranchCreditLimit) + parseFloat(obj.AvailableLimit);
                                       ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit) + parseFloat(obj.AvailableLimit);
                                    });
                                 }

                                 const InvoiceDetailsBranchArray = InvoiceDetails.filter(obj1 => obj1.BuyerBranch === ObjB._id);
                                 if (InvoiceDetailsBranchArray.length > 0) {
                                    var BranchInvoiceAmount = 0;
                                    InvoiceDetailsBranchArray.map(obj => {
                                       BranchInvoiceAmount = parseFloat(BranchInvoiceAmount) + parseFloat(obj.AvailableAmount);
                                    });

                                    if (BranchInvoiceAmount > 0) {
                                       ObjB.TotalPaymentAmount = BranchInvoiceAmount.toFixed(2);
                                       ObjB.TotalPaymentAmount = parseFloat(ObjB.TotalPaymentAmount);
                                       ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit) - parseFloat(BranchInvoiceAmount);
                                       if (ObjB.AvailableCreditLimit > 0) {
                                          ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                                       } else {
                                          ObjB.ExtraUnitizedCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                                          ObjB.ExtraUnitizedCreditLimit = ObjB.ExtraUnitizedCreditLimit.toFixed(2);
                                          ObjB.ExtraUnitizedCreditLimit = parseFloat(ObjB.ExtraUnitizedCreditLimit);
                                          ObjB.CreditBalanceExists = true;
                                          ObjB.AvailableCreditLimit = 0;
                                       }
                                       ObjB.AvailableCreditLimit = ObjB.AvailableCreditLimit.toFixed(2);
                                       ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                                    }
                                 }
                                 return ObjB;
                              });
                           } else {
                              Obj.Branches = [];
                           }

                           const TemporaryDetailsArr = TemporaryDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                           if (TemporaryDetailsArr.length > 0) {
                              var ValidityDate = new Date();
                              var TodayDate = new Date();
                              TemporaryDetailsArr.map(obj => {
                                 ValidityDate = new Date(obj.updatedAt);
                                 ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + obj.ApprovedPeriod));
                                 if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                                    Obj.BusinessCreditLimit = parseFloat(Obj.BusinessCreditLimit) + parseFloat(obj.ApproveLimit);
                                    Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.ApproveLimit);
                                 }
                              });
                           }

                           const InviteDetailsArr = InviteDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                           if (InviteDetailsArr.length > 0) {
                              InviteDetailsArr.map(obj => {
                                 Obj.BusinessCreditLimit = parseFloat(Obj.BusinessCreditLimit) + parseFloat(obj.AvailableLimit);
                                 Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.AvailableLimit);
                              });
                           }

                           const InvoiceDetailsArray = InvoiceDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                           if (InvoiceDetailsArray.length > 0) {
                              var UsedCurrentCreditAmount = 0;
                              var UsedForTemporaryAmount = 0;
                              InvoiceDetailsArray.map(obj => {
                                 UsedCurrentCreditAmount = parseFloat(UsedCurrentCreditAmount) + parseFloat(obj.UsedCurrentCreditAmount);
                                 UsedForTemporaryAmount = parseFloat(UsedForTemporaryAmount) + parseFloat(obj.UsedTemporaryCreditAmount);
                              });

                              var PermanentCreditAmount = parseFloat(UsedCurrentCreditAmount) + parseFloat(UsedForTemporaryAmount);
                              if (PermanentCreditAmount > 0) {
                                 Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) - parseFloat(PermanentCreditAmount);
                                 if (Obj.AvailableCreditLimit > 0) {
                                    Obj.AvailableCreditLimit = Math.abs(Obj.AvailableCreditLimit);
                                 } else {
                                    Obj.ExtraUnitizedCreditLimit = -Math.abs(Obj.AvailableCreditLimit);
                                    Obj.ExtraUnitizedCreditLimit = Obj.ExtraUnitizedCreditLimit.toFixed(2);
                                    Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.ExtraUnitizedCreditLimit);
                                    Obj.CreditBalanceExists = true;
                                    Obj.AvailableCreditLimit = 0;
                                 }
                                 Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                                 Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                              }
                           }
                           const InvoiceDetailsArr = InvoicePendingDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.BuyerBusiness)) === JSON.parse(JSON.stringify(Obj._id)));
                           const PaymentDetailsArr = InvoiceAcceptList.filter(obj1 => JSON.parse(JSON.stringify(obj1.BuyerBusiness)) === JSON.parse(JSON.stringify(Obj._id)));
                           Obj.BusinessInvoice = InvoiceDetailsArr.length;
                           Obj.BusinessPayment = PaymentDetailsArr.length;
                           return Obj;
                        });
                        res.status(200).send({ Status: true, Message: 'Buyer Invoice Count', Response: BusinessDetails });
                     } else {
                        res.status(200).send({ Status: true, Message: 'No Records Found', Response: [] });
                     }
                  }).catch(Error => {
                     ErrorHandling.ErrorLogCreation(req, 'Seller Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(Error));
                     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
                  });
               } else if (result.CustomerType === 'User') {
                  var BuyerBusinessArray = [];
                  var BuyerBranchArray = [];
                  if (result.BusinessAndBranches.length > 0) {
                     result.BusinessAndBranches.map(Obj => {
                        BuyerBusinessArray.push(mongoose.Types.ObjectId(Obj.Business));
                        Obj.Branches.map(obj => {
                           BuyerBranchArray.push(mongoose.Types.ObjectId(obj));
                        });
                     });
                  }

                  Promise.all([
                     BusinessAndBranchManagement.BusinessSchema.find({ _id: { $in: BuyerBusinessArray }, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     BusinessAndBranchManagement.BranchSchema.find({ _id: { $in: BuyerBranchArray }, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     InviteManagement.InviteManagementSchema.find({ BuyerBranch: { $in: BuyerBranchArray }, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     TemporaryManagement.CreditSchema.find({ BuyerBranch: { $in: BuyerBranchArray }, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     InvoiceManagement.InvoiceSchema.find({ BuyerBranch: { $in: BuyerBranchArray }, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     InvoiceManagement.InvoiceSchema.find({ BuyerBranch: { $in: BuyerBranchArray }, ActiveStatus: true, InvoiceStatus: 'Pending', IfDeleted: false }, {}, {}).exec(),
                     PaymentModel.PaymentSchema.find({ BuyerBranch: { $in: BuyerBranchArray }, Payment_Status: "Pending" }, {}, {}).exec(),
                     InvoiceManagement.InvoiceSchema.find({ BuyerBranch: { $in: BuyerBranchArray }, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                  ]).then(ResponseOU => {
                     var BusinessDetails = JSON.parse(JSON.stringify(ResponseOU[0]));
                     var BranchDetails = JSON.parse(JSON.stringify(ResponseOU[1]));
                     var InviteDetails = JSON.parse(JSON.stringify(ResponseOU[2]));
                     var TemporaryDetails = JSON.parse(JSON.stringify(ResponseOU[3]));
                     var InvoiceDetails = JSON.parse(JSON.stringify(ResponseOU[4]));
                     var InvoicePendingDetails = JSON.parse(JSON.stringify(ResponseOU[5]));
                     var PendingPaymentDetails = JSON.parse(JSON.stringify(ResponseOU[6]));
                     var InvoiceAcceptList = JSON.parse(JSON.stringify(ResponseOU[7]));
                     if (BusinessDetails.length > 0) {
                        BusinessDetails.map(Obj => {
                           Obj.ExtraUnitizedCreditLimit = 0;
                           Obj.CreditBalanceExists = false;
                           const BranchDetailsArr = BranchDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                           if (BranchDetailsArr.length > 0) {
                              Obj.Branches = BranchDetailsArr;
                              Obj.Branches = JSON.parse(JSON.stringify(Obj.Branches));
                              Obj.Branches.map(ObjB => {
                                 ObjB.ExtraUnitizedCreditLimit = 0;
                                 ObjB.CreditBalanceExists = false;
                                 ObjB.UserDetails = [];
                                 ObjB.TotalPaymentAmount = 0;
                                 const InvoiceDetailsBranchArr = InvoicePendingDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.BuyerBranch)) === JSON.parse(JSON.stringify(ObjB._id)));
                                 const InvoiceAcceptBranchArr = InvoiceAcceptList.filter(obj1 => JSON.parse(JSON.stringify(obj1.BuyerBranch)) === JSON.parse(JSON.stringify(ObjB._id)));
                                 ObjB.InvoiceCount = InvoiceDetailsBranchArr.length;
                                 ObjB.PaymentCount = InvoiceAcceptBranchArr.length;
                                 const TemporaryDetailsBranchArr = TemporaryDetails.filter(obj1 => obj1.BuyerBranch === ObjB._id);
                                 if (TemporaryDetailsBranchArr.length > 0) {
                                    var BranchValidityDate = new Date();
                                    var BranchTodayDate = new Date();
                                    TemporaryDetailsBranchArr.map(obj => {
                                       BranchValidityDate = new Date(obj.updatedAt);
                                       BranchValidityDate = new Date(BranchValidityDate.setDate(BranchValidityDate.getDate() + obj.ApprovedPeriod));
                                       if (BranchValidityDate.valueOf() >= BranchTodayDate.valueOf()) {
                                          ObjB.BranchCreditLimit = parseFloat(ObjB.BranchCreditLimit) + parseFloat(obj.ApproveLimit);
                                          ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit) + parseFloat(obj.ApproveLimit);
                                       }
                                    });
                                 }

                                 const InviteDetailsBranchArr = InviteDetails.filter(obj1 => obj1.BuyerBranch === ObjB._id);
                                 if (InviteDetailsBranchArr.length > 0) {
                                    var BranchValidityInviteDate = new Date();
                                    var BranchTodayInviteDate = new Date();
                                    InviteDetailsBranchArr.map(obj => {
                                       //   BranchValidityInviteDate = new Date(obj.updatedAt);
                                       //   BranchValidityInviteDate = new Date(BranchValidityInviteDate.setDate(BranchValidityInviteDate.getDate() + obj.BuyerPaymentCycle));
                                       // if (BranchValidityInviteDate.valueOf() >= BranchTodayInviteDate.valueOf()) {
                                       ObjB.BranchCreditLimit = parseFloat(ObjB.BranchCreditLimit) + parseFloat(obj.AvailableLimit);
                                       ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit) + parseFloat(obj.AvailableLimit);
                                       //  }
                                    });
                                 }

                                 const InvoiceDetailsBranchArray = InvoiceDetails.filter(obj1 => obj1.BuyerBranch === ObjB._id);
                                 if (InvoiceDetailsBranchArray.length > 0) {
                                    var BranchInvoiceAmount = 0;
                                    InvoiceDetailsBranchArray.map(obj => {
                                       BranchInvoiceAmount = parseFloat(BranchInvoiceAmount) + parseFloat(obj.AvailableAmount);
                                    });

                                    if (BranchInvoiceAmount > 0) {
                                       ObjB.TotalPaymentAmount = BranchInvoiceAmount.toFixed(2);
                                       ObjB.TotalPaymentAmount = parseFloat(ObjB.TotalPaymentAmount);
                                       ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit) - parseFloat(BranchInvoiceAmount);
                                       if (ObjB.AvailableCreditLimit > 0) {
                                          ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                                       } else {
                                          ObjB.ExtraUnitizedCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                                          ObjB.ExtraUnitizedCreditLimit = ObjB.ExtraUnitizedCreditLimit.toFixed(2);
                                          ObjB.ExtraUnitizedCreditLimit = parseFloat(ObjB.ExtraUnitizedCreditLimit);
                                          ObjB.CreditBalanceExists = true;
                                          ObjB.AvailableCreditLimit = 0;
                                       }
                                       ObjB.AvailableCreditLimit = ObjB.AvailableCreditLimit.toFixed(2);
                                       ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                                    }
                                 }
                                 return ObjB;
                              });
                           } else {
                              Obj.Branches = [];
                           }

                           const TemporaryDetailsArr = TemporaryDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                           if (TemporaryDetailsArr.length > 0) {
                              var ValidityDate = new Date();
                              var TodayDate = new Date();
                              TemporaryDetailsArr.map(obj => {
                                 ValidityDate = new Date(obj.updatedAt);
                                 ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + obj.ApprovedPeriod));
                                 if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                                    Obj.BusinessCreditLimit = parseFloat(Obj.BusinessCreditLimit) + parseFloat(obj.ApproveLimit);
                                    Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.ApproveLimit);
                                 }
                              });
                           }

                           const InviteDetailsArr = InviteDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                           if (InviteDetailsArr.length > 0) {
                              var ValidityInviteDate = new Date();
                              var TodayInviteDate = new Date();
                              InviteDetailsArr.map(obj => {
                                 //  ValidityInviteDate = new Date(obj.updatedAt);
                                 //  ValidityInviteDate = new Date(ValidityInviteDate.setDate(ValidityInviteDate.getDate() + obj.BuyerPaymentCycle));
                                 // if (ValidityInviteDate.valueOf() >= TodayInviteDate.valueOf()) {
                                 Obj.BusinessCreditLimit = parseFloat(Obj.BusinessCreditLimit) + parseFloat(obj.AvailableLimit);
                                 Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.AvailableLimit);
                                 //  }
                              });
                           }

                           const InvoiceDetailsArray = InvoiceDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                           if (InvoiceDetailsArray.length > 0) {
                              var UsedCurrentCreditAmount = 0;
                              var UsedForTemporaryAmount = 0;
                              InvoiceDetailsArray.map(obj => {
                                 UsedCurrentCreditAmount = parseFloat(UsedCurrentCreditAmount) + parseFloat(obj.UsedCurrentCreditAmount);
                                 UsedForTemporaryAmount = parseFloat(UsedForTemporaryAmount) + parseFloat(obj.UsedTemporaryCreditAmount);
                              });

                              var PermanentCreditAmount = parseFloat(UsedCurrentCreditAmount) + parseFloat(UsedForTemporaryAmount);
                              if (PermanentCreditAmount > 0) {
                                 Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) - parseFloat(PermanentCreditAmount);
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
                              }
                           }
                           const InvoiceDetailsArr = InvoicePendingDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.BuyerBusiness)) === JSON.parse(JSON.stringify(Obj._id)));
                           const PaymentDetailsArr = InvoiceAcceptList.filter(obj1 => JSON.parse(JSON.stringify(obj1.BuyerBusiness)) === JSON.parse(JSON.stringify(Obj._id)));
                           Obj.BusinessInvoice = InvoiceDetailsArr.length;
                           Obj.BusinessPayment = PaymentDetailsArr.length;
                           return Obj;
                        });
                        res.status(200).send({ Status: true, Message: 'Buyer Invoice Count', Response: BusinessDetails });
                     } else {
                        res.status(200).send({ Status: true, Message: 'No Records Found', Response: [] });
                     }
                  }).catch(Error => {
                     ErrorHandling.ErrorLogCreation(req, 'Seller Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(Error));
                     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
                  });
               }
            } else {
               res.status(400).send({ Status: false, Message: "Invalid Customer Details" });
            }
         }
      });
   }
};


// BuyerPendingPayment_List
exports.BuyerPendingPayment_List = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
      res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
   } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
      res.status(400).send({ Status: false, Message: "Buyer Business can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
   } else {
      ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
      ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
      // ReceivingData.BuyerBranch = mongoose.Types.ObjectId(ReceivingData.BuyerBranch);

      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.BuyerBusiness, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         // BusinessAndBranchManagement.BranchSchema.findOne({ _id: ReceivingData.BuyerBranch, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var BuyerDetails = Response[0];
         var BusinessDetails = Response[1];
         // var BranchDetails = Response[2];

         if (BuyerDetails !== null && BusinessDetails !== null) {
            var Buyer;
            var FindQuery = {};
            // var BranchArr = [];
            var BusinessArr = [];
            BusinessArr.push(ReceivingData.BuyerBusiness);
            if (BuyerDetails.CustomerType === 'Owner') {
               Buyer = mongoose.Types.ObjectId(BuyerDetails._id);
               FindQuery = { Buyer: Buyer, BuyerBusiness: ReceivingData.BuyerBusiness,Payment_Status: "Pending" };
            } else if (BuyerDetails.CustomerType === 'User') {
               Buyer = mongoose.Types.ObjectId(BuyerDetails.Owner);
               if (BuyerDetails.BusinessAndBranches.length !== 0) {
                  BuyerDetails.BusinessAndBranches.map(Obj => {
                     // Obj.Branches.map(obj => {
                        BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                     // });
                  });
               }
               FindQuery = { Buyer: Buyer,BuyerBusiness: { $in: BusinessArr }, Payment_Status: "Pending" };
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
               PaymentModel.PaymentSchema
                  .aggregate([
                     { $match: FindQuery },
                     {
                        $lookup: {
                           from: "Business",
                           let: { "business": "$Business" },
                           pipeline: [
                              { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                              { $project: { "FirstName": 1, "LastName": 1  } }
                           ],
                           as: 'Business'
                        }
                     },
                     { $unwind: { path: "$Business", preserveNullAndEmptyArrays: true } },
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
                     {
                        $lookup: {
                           from: "Customers",
                           let: { "buyer": "$Buyer" },
                           pipeline: [
                              { $match: { $expr: { $eq: ["$$buyer", "$_id"] } } },
                              { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                           ],
                           as: 'buyer'
                        }
                     },
                     { $unwind: { path: "$buyer", preserveNullAndEmptyArrays: true } },
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
                           from: "Business",
                           let: { "buyerBusiness": "$BuyerBusiness" },
                           pipeline: [
                              { $match: { $expr: { $eq: ["$$buyerBusiness", "$_id"] } } },
                              { $project: { "FirstName": 1, "LastName": 1  } }
                           ],
                           as: 'BuyerBusiness'
                        }
                     },
                     { $unwind: { path: "$BuyerBusiness", preserveNullAndEmptyArrays: true } },
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
                     {
                        $project: {
                           Business: 1,
                           // BranchInfo: 1,
                           BuyerBusiness: 1,
                           // BuyerBranchInfo: 1,
                           buyer: 1,
                           Seller: 1,
                           PaymentDate: 1,
                           PaymentID: 1,
                           PaymentAmount: 1,
                           PaymentMode: 1,
                           Remarks: 1,
                           Payment_Status: 1,
                           PaymentAttachments: 1,
                           Remarks: 1,
                           DisputedRemarks: 1,
                           PaymentAttachments: 1,
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
               PaymentModel.PaymentSchema.countDocuments(FindQuery).exec()
            ]).then(result => {
               res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
            }).catch(Error => {
               ErrorHandling.ErrorLogCreation(req, 'Invoice Find error', 'InvoiceManagement -> All Invoice List', JSON.stringify(Error));
               res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
            });
         } else {
            res.status(200).send({ Http_Code: 400, Status: true, Message: 'Invalid User Details' });
         }
      });
   }

};

// BuyerAcceptPayment_List
exports.BuyerAcceptPayment_List = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
      res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
   } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
      res.status(400).send({ Status: false, Message: "Buyer Business can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
   } else {
      ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
      ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
      // ReceivingData.BuyerBranch = mongoose.Types.ObjectId(ReceivingData.BuyerBranch);

      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.BuyerBusiness, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         // BusinessAndBranchManagement.BranchSchema.findOne({ _id: ReceivingData.BuyerBranch, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var BuyerDetails = Response[0];
         var BusinessDetails = Response[1];
         var BranchDetails = Response[2];

         if (BuyerDetails !== null && BusinessDetails !== null) {
            var Buyer;
            var FindQuery = {};
            // var BranchArr = [];
            var BUsinessArr = [];
            BUsinessArr.push(ReceivingData.BuyerBusiness);
            if (BuyerDetails.CustomerType === 'Owner') {
               Buyer = mongoose.Types.ObjectId(BuyerDetails._id);
               FindQuery = { Buyer: Buyer, BuyerBusiness: ReceivingData.BuyerBusiness,Payment_Status: "Accept" };
            } else if (BuyerDetails.CustomerType === 'User') {
               Buyer = mongoose.Types.ObjectId(BuyerDetails.Owner);
               if (BuyerDetails.BusinessAndBranches.length !== 0) {
                  BuyerDetails.BusinessAndBranches.map(Obj => {
                     // Obj.Branches.map(obj => {
                        BranchArr.push(mongoose.Types.ObjectId(obj));
                     // });
                  });
               }
               FindQuery = { Buyer: Buyer, BuyerBusiness: { $in: BUsinessArr }, Payment_Status: "Accept" };
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
               PaymentModel.PaymentSchema
                  .aggregate([
                     { $match: FindQuery },
                     {
                        $lookup: {
                           from: "Business",
                           let: { "business": "$Business" },
                           pipeline: [
                              { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                              { $project: { "FirstName": 1, "LastName": 1  } }
                           ],
                           as: 'Business'
                        }
                     },
                     { $unwind: { path: "$Business", preserveNullAndEmptyArrays: true } },
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
                     {
                        $lookup: {
                           from: "Customers",
                           let: { "buyer": "$Buyer" },
                           pipeline: [
                              { $match: { $expr: { $eq: ["$$buyer", "$_id"] } } },
                              { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                           ],
                           as: 'buyer'
                        }
                     },
                     { $unwind: { path: "$buyer", preserveNullAndEmptyArrays: true } },
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
                           from: "Business",
                           let: { "buyerBusiness": "$BuyerBusiness" },
                           pipeline: [
                              { $match: { $expr: { $eq: ["$$buyerBusiness", "$_id"] } } },
                              { $project: { "FirstName": 1, "LastName": 1  } }
                           ],
                           as: 'BuyerBusiness'
                        }
                     },
                     { $unwind: { path: "$BuyerBusiness", preserveNullAndEmptyArrays: true } },
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
                     {
                        $project: {
                           Business: 1,
                           // BranchInfo: 1,
                           BuyerBusiness: 1,
                           // BuyerBranchInfo: 1,
                           buyer: 1,
                           Seller: 1,
                           PaymentDate: 1,
                           PaymentID: 1,
                           PaymentAmount: 1,
                           PaymentMode: 1,
                           Remarks: 1,
                           Payment_Status: 1,
                           PaymentAttachments: 1,
                           Remarks: 1,
                           DisputedRemarks: 1,
                           PaymentAttachments: 1,
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
               PaymentModel.PaymentSchema.countDocuments(FindQuery).exec()
            ]).then(result => {
               res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
            }).catch(Error => {
               ErrorHandling.ErrorLogCreation(req, 'Invoice Find error', 'InvoiceManagement -> All Invoice List', JSON.stringify(Error));
               res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
            });
         } else {
            res.status(200).send({ Http_Code: 400, Status: true, Message: 'Invalid User Details' });
         }
      });
   }

};

// BuyerDisputedPayment_List
exports.BuyerDisputedPayment_List = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
      res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
   } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
      res.status(400).send({ Status: false, Message: "Buyer Business can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
   } else {
      ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
      ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
      // ReceivingData.BuyerBranch = mongoose.Types.ObjectId(ReceivingData.BuyerBranch);

      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.BuyerBusiness, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         // BusinessAndBranchManagement.BranchSchema.findOne({ _id: ReceivingData.BuyerBranch, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var BuyerDetails = Response[0];
         var BusinessDetails = Response[1];
         var BranchDetails = Response[2];

         if (BuyerDetails !== null && BusinessDetails !== null) {
            var Buyer;
            var FindQuery = {};
            // var BranchArr = [];
            var BusinessArr = [];
            BusinessArr.push(ReceivingData.BuyerBusiness);
            if (BuyerDetails.CustomerType === 'Owner') {
               Buyer = mongoose.Types.ObjectId(BuyerDetails._id);
               FindQuery = { Buyer: Buyer, BuyerBusiness: ReceivingData.BuyerBusiness,Payment_Status: "Disputed" };
            } else if (BuyerDetails.CustomerType === 'User') {
               Buyer = mongoose.Types.ObjectId(BuyerDetails.Owner);
               if (BuyerDetails.BusinessAndBranches.length !== 0) {
                  BuyerDetails.BusinessAndBranches.map(Obj => {
                     // Obj.Branches.map(obj => {
                        BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                     // });
                  });
               }
               FindQuery = { Buyer: Buyer, BuyerBusiness: { $in: BusinessArr }, Payment_Status: "Disputed" };
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
               PaymentModel.PaymentSchema
                  .aggregate([
                     { $match: FindQuery },
                     {
                        $lookup: {
                           from: "Business",
                           let: { "business": "$Business" },
                           pipeline: [
                              { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                              { $project: { "FirstName": 1, "LastName": 1  } }
                           ],
                           as: 'Business'
                        }
                     },
                     { $unwind: { path: "$Business", preserveNullAndEmptyArrays: true } },
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
                     {
                        $lookup: {
                           from: "Customers",
                           let: { "buyer": "$Buyer" },
                           pipeline: [
                              { $match: { $expr: { $eq: ["$$buyer", "$_id"] } } },
                              { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                           ],
                           as: 'buyer'
                        }
                     },
                     { $unwind: { path: "$buyer", preserveNullAndEmptyArrays: true } },
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
                           from: "Business",
                           let: { "buyerBusiness": "$BuyerBusiness" },
                           pipeline: [
                              { $match: { $expr: { $eq: ["$$buyerBusiness", "$_id"] } } },
                              { $project: { "FirstName": 1, "LastName": 1  } }
                           ],
                           as: 'BuyerBusiness'
                        }
                     },
                     { $unwind: { path: "$BuyerBusiness", preserveNullAndEmptyArrays: true } },
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
                     {
                        $project: {
                           Business: 1,
                           // BranchInfo: 1,
                           BuyerBusiness: 1,
                           // BuyerBranchInfo: 1,
                           buyer: 1,
                           Seller: 1,
                           PaymentDate: 1,
                           PaymentID: 1,
                           PaymentAmount: 1,
                           PaymentMode: 1,
                           Remarks: 1,
                           Payment_Status: 1,
                           PaymentAttachments: 1,
                           Remarks: 1,
                           DisputedRemarks: 1,
                           PaymentAttachments: 1,
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
               PaymentModel.PaymentSchema.countDocuments(FindQuery).exec()
            ]).then(result => {
               res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
            }).catch(Error => {
               ErrorHandling.ErrorLogCreation(req, 'Invoice Find error', 'InvoiceManagement -> All Invoice List', JSON.stringify(Error));
               res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
            });
         } else {
            res.status(200).send({ Http_Code: 400, Status: true, Message: 'Invalid User Details' });
         }
      });
   }

};

// SellerPendingPayment_List 
exports.SellerPendingPayment_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Seller || ReceivingData.Seller === '') {
      res.status(400).send({ Status: false, Message: "Seller can not be empty" });
   } else if (!ReceivingData.Business || ReceivingData.Business === '') {
      res.status(400).send({ Status: false, Message: "Business can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
   } else {
      ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
      ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
      // ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);

      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.Business, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         // BusinessAndBranchManagement.BranchSchema.findOne({ _id: ReceivingData.Branch, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var SellerDetails = Response[0];
         var BusinessDetails = Response[1];
         // var BranchDetails = Response[2];

         if (SellerDetails !== null && BusinessDetails !== null) {
            var Seller;
            var FindQuery = {};
            // var BranchArr = [];
            var BusinessArr = [];
            BusinessArr.push(ReceivingData.BuyerBusiness);
            if (SellerDetails.CustomerType === 'Owner') {
               Seller = mongoose.Types.ObjectId(SellerDetails._id);
               FindQuery = { Seller: Seller, Business: ReceivingData.Business,Payment_Status: "Pending" };
            } else if (SellerDetails.CustomerType === 'User') {
               Seller = mongoose.Types.ObjectId(SellerDetails.Owner);

               if (SellerDetails.BusinessAndBranches.length !== 0) {
                  SellerDetails.BusinessAndBranches.map(Obj => {
                     // Obj.Branches.map(obj => {
                        BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                     // });
                  });
               }
               FindQuery = { Seller: Seller, Business: { $in: BusinessArr }, Payment_Status: "Pending" };
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
               PaymentModel.PaymentSchema
                  .aggregate([
                     { $match: FindQuery },
                     {
                        $lookup: {
                           from: "Business",
                           let: { "buyerBusiness": "$BuyerBusiness" },
                           pipeline: [
                              { $match: { $expr: { $eq: ["$$buyerBusiness", "$_id"] } } },
                              { $project: { "FirstName": 1, "LastName": 1  } }
                           ],
                           as: 'BuyerBusiness'
                        }
                     },
                     { $unwind: { path: "$BuyerBusiness", preserveNullAndEmptyArrays: true } },
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
                           let: { "buyer": "$Buyer" },
                           pipeline: [
                              { $match: { $expr: { $eq: ["$$buyer", "$_id"] } } },
                              { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                           ],
                           as: 'buyer'
                        }
                     },
                     { $unwind: { path: "$buyer", preserveNullAndEmptyArrays: true } },
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
                           from: "Business",
                           let: { "business": "$Business" },
                           pipeline: [
                              { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                              { $project: { "FirstName": 1, "LastName": 1  } }
                           ],
                           as: 'Business'
                        }
                     },
                     { $unwind: { path: "$Business", preserveNullAndEmptyArrays: true } },
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
                     {
                        $project: {
                           BuyerBusiness: 1,
                           // BuyerBranchInfo: 1,
                           // BranchInfo: 1,
                           Business: 1,
                           buyer: 1,
                           Seller: 1,
                           PaymentDate: 1,
                           PaymentID: 1,
                           PaymentAmount: 1,
                           PaymentMode: 1,
                           Remarks: 1,
                           Payment_Status: 1,
                           PaymentAttachments: 1,
                           Remarks: 1,
                           DisputedRemarks: 1,
                           PaymentAttachments: 1,
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
               PaymentModel.PaymentSchema.countDocuments(FindQuery).exec()
            ]).then(result => {
               res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
            }).catch(Error => {
               ErrorHandling.ErrorLogCreation(req, 'Invoice Find error', 'InvoiceManagement -> All Invoice List', JSON.stringify(Error));
               res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
            });
         } else {
            res.status(200).send({ Http_Code: 400, Status: true, Message: 'Invalid User Details' });
         }
      });
   }

};


exports.SellerAcceptPayment_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Seller || ReceivingData.Seller === '') {
      res.status(400).send({ Status: false, Message: "Seller can not be empty" });
   } else if (!ReceivingData.Business || ReceivingData.Business === '') {
      res.status(400).send({ Status: false, Message: "Business can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
   } else {
      ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
      ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
      // ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);

      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.Business, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         // BusinessAndBranchManagement.BranchSchema.findOne({ _id: ReceivingData.Branch, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var SellerDetails = Response[0];
         var BusinessDetails = Response[1];
         // var BranchDetails = Response[2];

         if (SellerDetails !== null && BusinessDetails !== null) {
            var Seller;
            var FindQuery = {};
            // var BranchArr = [];
            var BusinessArr = [];
            BusinessArr.push(ReceivingData.BuyerBusinessArr);
            if (SellerDetails.CustomerType === 'Owner') {
               Seller = mongoose.Types.ObjectId(SellerDetails._id);
               FindQuery = { Seller: Seller, Business: ReceivingData.Business,Payment_Status: "Accept" };
            } else if (SellerDetails.CustomerType === 'User') {
               Seller = mongoose.Types.ObjectId(SellerDetails.Owner);

               if (SellerDetails.BusinessAndBranches.length !== 0) {
                  SellerDetails.BusinessAndBranches.map(Obj => {
                     // Obj.Branches.map(obj => {
                        BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                     // });
                  });
               }
               FindQuery = { Seller: Seller, Business: { $in: BusinessArr }, Payment_Status: "Accept" };
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
               PaymentModel.PaymentSchema
                  .aggregate([
                     { $match: FindQuery },
                     {
                        $lookup: {
                           from: "Business",
                           let: { "buyerBusiness": "$BuyerBusiness" },
                           pipeline: [
                              { $match: { $expr: { $eq: ["$$buyerBusiness", "$_id"] } } },
                              { $project: { "FirstName": 1, "LastName": 1  } }
                           ],
                           as: 'BuyerBusiness'
                        }
                     },
                     { $unwind: { path: "$BuyerBusiness", preserveNullAndEmptyArrays: true } },
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
                           let: { "buyer": "$Buyer" },
                           pipeline: [
                              { $match: { $expr: { $eq: ["$$buyer", "$_id"] } } },
                              { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                           ],
                           as: 'buyer'
                        }
                     },
                     { $unwind: { path: "$buyer", preserveNullAndEmptyArrays: true } },
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
                           from: "Business",
                           let: { "business": "$Business" },
                           pipeline: [
                              { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                              { $project: { "FirstName": 1, "LastName": 1  } }
                           ],
                           as: 'Business'
                        }
                     },
                     { $unwind: { path: "$Business", preserveNullAndEmptyArrays: true } },
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
                     {
                        $project: {
                           BuyerBusiness: 1,
                           // BuyerBranchInfo: 1,
                           Business: 1,
                           // BranchInfo: 1,
                           buyer: 1,
                           Seller: 1,
                           PaymentDate: 1,
                           PaymentID: 1,
                           PaymentAmount: 1,
                           PaymentMode: 1,
                           Remarks: 1,
                           Payment_Status: 1,
                           PaymentAttachments: 1,
                           Remarks: 1,
                           DisputedRemarks: 1,
                           PaymentAttachments: 1,
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
               PaymentModel.PaymentSchema.countDocuments(FindQuery).exec()
            ]).then(result => {
               res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
            }).catch(Error => {
               ErrorHandling.ErrorLogCreation(req, 'Invoice Find error', 'InvoiceManagement -> All Invoice List', JSON.stringify(Error));
               res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
            });
         } else {
            res.status(200).send({ Http_Code: 400, Status: true, Message: 'Invalid User Details' });
         }
      });
   }

};

exports.SellerDisputedPayment_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Seller || ReceivingData.Seller === '') {
      res.status(400).send({ Status: false, Message: "Seller can not be empty" });
   } else if (!ReceivingData.Business || ReceivingData.Business === '') {
      res.status(400).send({ Status: false, Message: "Business can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
   } else {
      ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
      ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
      // ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);

      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.Business, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         // BusinessAndBranchManagement.BranchSchema.findOne({ _id: ReceivingData.Branch, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var SellerDetails = Response[0];
         var BusinessDetails = Response[1];
         // var BranchDetails = Response[2];

         if (SellerDetails !== null && BusinessDetails !== null) {
            var Seller;
            var FindQuery = {};
            // var BranchArr = [];
            var BusinessArr = [];
            BusinessArr.push(ReceivingData.BuyerBusiness);
            if (SellerDetails.CustomerType === 'Owner') {
               Seller = mongoose.Types.ObjectId(SellerDetails._id);
               FindQuery = { Seller: Seller, Business: ReceivingData.Business, Payment_Status: "Disputed" };
            } else if (SellerDetails.CustomerType === 'User') {
               Seller = mongoose.Types.ObjectId(SellerDetails.Owner);

               if (SellerDetails.BusinessAndBranches.length !== 0) {
                  SellerDetails.BusinessAndBranches.map(Obj => {
                     // Obj.Branches.map(obj => {
                        BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                     // });
                  });
               }
               FindQuery = { Seller: Seller, Business: { $in: BusinessArr }, Payment_Status: "Disputed" };
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
               PaymentModel.PaymentSchema
                  .aggregate([
                     { $match: FindQuery },
                     {
                        $lookup: {
                           from: "Business",
                           let: { "buyerBusiness": "$BuyerBusiness" },
                           pipeline: [
                              { $match: { $expr: { $eq: ["$$buyerBusiness", "$_id"] } } },
                              { $project: { "FirstName": 1, "LastName": 1  } }
                           ],
                           as: 'BuyerBusiness'
                        }
                     },
                     { $unwind: { path: "$BuyerBusiness", preserveNullAndEmptyArrays: true } },
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
                           let: { "buyer": "$Buyer" },
                           pipeline: [
                              { $match: { $expr: { $eq: ["$$buyer", "$_id"] } } },
                              { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                           ],
                           as: 'buyer'
                        }
                     },
                     { $unwind: { path: "$buyer", preserveNullAndEmptyArrays: true } },
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
                           from: "Business",
                           let: { "business": "$Business" },
                           pipeline: [
                              { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                              { $project: { "FirstName": 1, "LastName": 1  } }
                           ],
                           as: 'Business'
                        }
                     },
                     { $unwind: { path: "$Business", preserveNullAndEmptyArrays: true } },
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
                     {
                        $project: {
                           BuyerBusiness: 1,
                           // BuyerBranchInfo: 1,
                           Business: 1,
                           // BranchInfo: 1,
                           buyer: 1,
                           Seller: 1,
                           PaymentDate: 1,
                           PaymentID: 1,
                           PaymentAmount: 1,
                           PaymentMode: 1,
                           Remarks: 1,
                           Payment_Status: 1,
                           PaymentAttachments: 1,
                           Remarks: 1,
                           DisputedRemarks: 1,
                           PaymentAttachments: 1,
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
               PaymentModel.PaymentSchema.countDocuments(FindQuery).exec()
            ]).then(result => {
               res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
            }).catch(Error => {
               ErrorHandling.ErrorLogCreation(req, 'Invoice Find error', 'InvoiceManagement -> All Invoice List', JSON.stringify(Error));
               res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
            });
         } else {
            res.status(200).send({ Http_Code: 400, Status: true, Message: 'Invalid User Details' });
         }
      });
   }

};

// Payment Details for Individual
exports.PaymentDetails = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.PaymentId || ReceivingData.PaymentId === '') {
      res.status(400).send({ Status: false, Message: "PaymentId  can not be empty" });
   } else {
      ReceivingData.PaymentId = mongoose.Types.ObjectId(ReceivingData.PaymentId);
      PaymentModel.PaymentSchema.findOne({
         _id: ReceivingData.PaymentId,
         ActiveStatus: true,
         IfDeleted: false,
      }, {}, {})
         .populate({ path: "BuyerBusiness", select: ["BusinessName", "BusinessCreditLimit", "AvailableCreditLimit"] })
         .populate({ path: "BuyerBranch", select: ["BranchName", "Mobile", "BranchCreditLimit", "AvailableCreditLimit"] })
         .populate({ path: "Buyer", select: ["ContactName", "Mobile", "Email", "CustomerCategory"] })
         .populate({ path: "Seller", select: ["ContactName", "Mobile", "Email", "CustomerCategory"] })
         .populate({ path: "Business", select: ["BusinessName", "BusinessCreditLimit", "AvailableCreditLimit"] })
         .populate({ path: "Branch", select: ["BranchName", "Mobile", "BranchCreditLimit", "AvailableCreditLimit"] })
         .populate({ path: "InvoiceDetails.InvoiceId", select: ["InvoiceStatus", "AvailableAmount", "InvoiceAmount", "InvoiceDate", "InvoiceNumber", "DisputedRemarks", "AcceptRemarks", "InvoiceDescription"] }).exec(function (err, result) {
            if (err) {
               ErrorHandling.ErrorLogCreation(req, 'PaymentDetails Getting Error', 'PaymentManagement.Controller -> PaymentDetails', JSON.stringify(err));
               res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Payment!.", Error: err });
            } else {
               if (result !== null) {
                  res.status(200).send({ Status: true, Message: 'Payment Details', Response: result });
               } else {
                  res.status(400).send({ Status: false, Message: "Invalid Payment ID !" });
               }
            }
         });
   }
};

// BuyerAgainstSellerList
exports.BuyerAgainstSellerList = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
      res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
   } else if (!ReceivingData.Business || ReceivingData.Business === '') {
      res.status(400).send({ Status: false, Message: "Business can not be empty" });
   } else if (!ReceivingData.Branch || ReceivingData.Branch === '') {
      res.status(400).send({ Status: false, Message: "Branch can not be empty" });
   } else {
      ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
      ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business._id);
      ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch._id);

      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         InvoiceManagement.InvoiceSchema.find({ InvoiceStatus: 'Accept', BuyerBranch: ReceivingData.Branch }, {}, {})
            .populate({ path: 'Seller', select: ['ContactName'] })
      ]).then(Response => {
         var CustomerDetails = Response[0];
         var InvoiceDetails = JSON.parse(JSON.stringify(Response[1]));
         if (CustomerDetails !== null) {
            if (CustomerDetails.CustomerType === 'Owner') {
               ReceivingData.Buyer = mongoose.Types.ObjectId(CustomerDetails._id);
               InviteManagement.InviteManagementSchema.find({ Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.Business, BuyerBranch: ReceivingData.Branch, Invite_Status: 'Accept' }, {}, {})
                  .populate({ path: 'Seller', select: ['ContactName', 'Mobile', 'Email'] })
                  .exec(function (err, result) {
                     if (err) {
                        ErrorHandling.ErrorLogCreation(req, 'Seller Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(err));
                        res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
                     } else {
                        result = JSON.parse(JSON.stringify(result));
                        var InviteArr = [];
                        if (result.length !== 0) {
                           result.map(Obj => {
                              InviteArr.push(Obj.Seller);
                           });
                           res.status(200).send({ Status: true, Message: 'Buyer Against Seller List', Response: InviteArr });
                        } else {
                           res.status(200).send({ Status: false, Message: "This Buyer Doesn't having any Seller!", Response: [] });
                        }
                     }
                  });
            } else if (CustomerDetails.CustomerType === 'User') {
               var BranchArr = [ReceivingData.Branch];
               ReceivingData.Buyer = mongoose.Types.ObjectId(CustomerDetails.Owner);
               if (CustomerDetails.BusinessAndBranches.length !== 0) {
                  CustomerDetails.BusinessAndBranches.map(Obj => {
                     if (Obj.Branches.length !== 0) {
                        Obj.Branches.map(obj => {
                           BranchArr.push(mongoose.Types.ObjectId(obj));
                        });
                     }
                  });
               }
               InviteManagement.InviteManagementSchema.find({ Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.Business, BuyerBranch: { $in: BranchArr }, Invite_Status: 'Accept' }, {}, {})
                  .populate({ path: 'Seller', select: ['ContactName', 'Mobile', 'Email'] })
                  .exec(function (err, result) {
                     if (err) {
                        ErrorHandling.ErrorLogCreation(req, 'Buyer Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(err));
                        res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
                     } else {
                        result = JSON.parse(JSON.stringify(result));
                        var InviteArr = [];
                        if (result.length !== 0) {
                           result.map(Obj => {
                              InviteArr.push(Obj.Seller);
                           });
                        }

                        if (InvoiceDetails.length !== 0) {
                           InvoiceDetails.map(Obj => {
                              InviteArr.push(mongoose.Types.ObjectId(Obj.Seller._id));
                           });
                        }
                        InviteArr = JSON.parse(JSON.stringify(InviteArr));
                        InviteArr = InviteArr.filter((obj, index) => InviteArr.indexOf(obj) === index);
                        CustomersManagement.CustomerSchema.find({ _id: { $in: InviteArr }, ActiveStatus: true, IfDeleted: false }, { ContactName: 1 }, {}).exec((ErrorRes, ResponseRes) => {
                           res.status(200).send({ Status: true, Message: 'Your Seller List', Response: ResponseRes });
                        });

                     }
                  });
            }
         } else {
            res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
         }
      }).catch(Error => {
         res.status(417).send({ Status: false, Message: "Some Occurred Error", Error: Error });
      });
   }
};


// SellerAgainstBusinessList
exports.SellerAgainstBusinessList = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Seller || ReceivingData.Seller === '') {
      res.status(400).send({ Status: false, Message: "Seller can not be empty" });
   } else {
      ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller }, {}, {}).exec((error, result) => {
         if (error) {
            ErrorHandling.ErrorLogCreation(req, 'Seller Details List Error', 'InviteManagement.Controller -> SellerAgainstBusinessList', JSON.stringify(error));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: error });
         } else {
            if (result !== null) {
               if (result.CustomerType === 'Owner') {
                  Promise.all([
                     InviteManagement.InviteManagementSchema.find({ Seller: ReceivingData.Seller, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                  ]).then(Response => {
                     var InviteDetails = Response[0];
                     if (InviteDetails.length !== 0) {
                        var BusinessArr = [];
                        InviteDetails.map(Obj => {
                           BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                        });
                        BusinessAndBranchManagement.BusinessSchema.find({ IfSeller: true, _id: { $in: BusinessArr } },
                           {
                              BusinessName: 1,
                              AvailableCreditLimit: 1,
                              BusinessCreditLimit: 1,
                              BusinessCategory: 1,
                              Industry: 1,
                           }).exec((err, result1) => {
                              if (err) {
                                 ErrorHandling.ErrorLogCreation(req, 'Business List Getting Error', 'InviteManagement.Controller -> SellerAgainstBusinessList', JSON.stringify(err));
                                 res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business!.", Error: err });
                              } else {
                                 res.status(200).send({ Status: true, Message: "Seller Business list", Response: result1 });
                              }
                           });
                     } else {
                        res.status(200).send({ Status: true, Message: "Seller Business list", Response: [] });
                     }
                  }).catch(Error => {
                     ErrorHandling.ErrorLogCreation(req, 'Invite Details List Error', 'InviteManagement.Controller -> SellerAgainstBusinessList', JSON.stringify(Error));
                     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
                  });
               } else if (result.CustomerType === 'User') {
                  ReceivingData.Seller = mongoose.Types.ObjectId(result.Owner);
                  Promise.all([
                     InviteManagement.InviteManagementSchema.find({ Seller: ReceivingData.Seller, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                  ]).then(Response => {
                     var InviteDetails = Response[0];
                     if (InviteDetails.length !== 0) {
                        var BusinessArr = [];
                        InviteDetails.map(Obj => {
                           BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                        });
                        BusinessAndBranchManagement.BusinessSchema.find({ IfSeller: true, _id: { $in: BusinessArr } },
                           {
                              BusinessName: 1,
                              AvailableCreditLimit: 1,
                              BusinessCreditLimit: 1,
                              BusinessCategory: 1,
                              Industry: 1,
                           }).exec((err, result1) => {
                              if (err) {
                                 ErrorHandling.ErrorLogCreation(req, 'Business List Getting Error', 'InviteManagement.Controller -> SellerAgainstBusinessList', JSON.stringify(err));
                                 res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business!.", Error: err });
                              } else {
                                 res.status(200).send({ Status: true, Message: "Seller Business list", Response: result1 });
                              }
                           });
                     } else {
                        res.status(200).send({ Status: true, Message: "Seller Business list", Response: [] });
                     }
                  }).catch(Error => {
                     ErrorHandling.ErrorLogCreation(req, 'Invite Details List Error', 'InviteManagement.Controller -> SellerAgainstBusinessList', JSON.stringify(Error));
                     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
                  });
               }

            } else {
               res.status(417).send({ Status: false, Message: "Invalid Customer Details." });
            }
         }
      });
   }
};

// SellerAgainstBranchList
exports.SellerAgainstBranchList = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Seller || ReceivingData.Seller === '') {
      res.status(400).send({ Status: false, Message: "Seller can not be empty" });
   } else if (!ReceivingData.Business || ReceivingData.Business === '') {
      res.status(400).send({ Status: false, Message: "Business can not be empty" });
   } else {
      ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
      ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller }, {}, {}).exec((error, result) => {
         if (error) {
            ErrorHandling.ErrorLogCreation(req, 'Seller Details List Error', 'InviteManagement.Controller -> SellerAgainstBranchList', JSON.stringify(error));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: error });
         } else {
            if (result !== null) {
               if (result.CustomerType === 'Owner') {
                  Promise.all([
                     InviteManagement.InviteManagementSchema.find({ Seller: ReceivingData.Seller, Business: ReceivingData.Business, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                  ]).then(Response => {
                     var InviteDetails = Response[0];
                     if (InviteDetails.length !== 0) {
                        var BranchArr = [];
                        InviteDetails.map(Obj => {
                           BranchArr.push(mongoose.Types.ObjectId(Obj.Branch));
                        });
                        BusinessAndBranchManagement.BranchSchema.find({ Customer: ReceivingData.Seller, Business: ReceivingData.Business, _id: { $in: BranchArr } },
                           {
                              BranchName: 1,
                              BranchCreditLimit: 1,
                              BrachCategory: 1,
                              Mobile: 1,
                              Address: 1,
                              RegistrationId: 1,
                              AvailableCreditLimit: 1,
                              GSTIN: 1
                           }).exec((err, result1) => {
                              if (err) {
                                 ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'InviteManagement.Controller -> SellerAgainstBranchList', JSON.stringify(err));
                                 res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
                              } else {
                                 res.status(200).send({ Status: true, Response: result1, Message: 'Branches List' });
                              }
                           });
                     } else {
                        res.status(200).send({ Status: true, Message: "Seller Branches list", Response: [] });
                     }
                  }).catch(Error => {
                     ErrorHandling.ErrorLogCreation(req, 'Invite Details List Error', 'InviteManagement.Controller -> SellerAgainstBusinessList', JSON.stringify(Error));
                     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
                  });
               } else if (result.CustomerType === 'User') {
                  ReceivingData.Seller = mongoose.Types.ObjectId(result.Owner);
                  Promise.all([
                     InviteManagement.InviteManagementSchema.find({ Seller: ReceivingData.Seller, Business: ReceivingData.Business, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                  ]).then(Response => {
                     var InviteDetails = Response[0];
                     if (InviteDetails.length !== 0) {
                        var BranchArr = [];
                        InviteDetails.map(Obj => {
                           BranchArr.push(mongoose.Types.ObjectId(Obj.Branch));
                        });
                        BusinessAndBranchManagement.BranchSchema.find({ Customer: ReceivingData.Seller, Business: ReceivingData.Business, _id: { $in: BranchArr } },
                           {
                              BranchName: 1,
                              BranchCreditLimit: 1,
                              BrachCategory: 1,
                              Mobile: 1,
                              Address: 1,
                              RegistrationId: 1,
                              AvailableCreditLimit: 1,
                              GSTIN: 1
                           }).exec((err, result1) => {
                              if (err) {
                                 ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'InviteManagement.Controller -> SellerAgainstBranchList', JSON.stringify(err));
                                 res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
                              } else {
                                 res.status(200).send({ Status: true, Response: result1, Message: 'Branches List' });
                              }
                           });
                     } else {
                        res.status(200).send({ Status: true, Message: "Seller Branches list", Response: [] });
                     }
                  }).catch(Error => {
                     ErrorHandling.ErrorLogCreation(req, 'Invite Details List Error', 'InviteManagement.Controller -> BuyerAgainstBusinessList', JSON.stringify(Error));
                     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
                  });
               }

            } else {
               res.status(417).send({ Status: false, Message: "Invalid Customer Details." });
            }
         }
      });
   }
};

// Buyer Accepted Invoice List
exports.BuyerInvoice_AcceptList = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Branch || ReceivingData.Branch === '') {
      res.status(400).send({ Status: false, Message: "Branch can not be empty" });
   } else if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
      res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
   } else if (!ReceivingData.Business || ReceivingData.Business === '') {
      res.status(400).send({ Status: false, Message: "Business can not be empty" });
   } else if (!ReceivingData.Seller || ReceivingData.Seller === '') {
      res.status(400).send({ Status: false, Message: "Business can not be empty" });
   } else if (!ReceivingData.BuyerBranch || ReceivingData.BuyerBranch === '') {
      res.status(400).send({ Status: false, Message: "Business can not be empty" });
   } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
      res.status(400).send({ Status: false, Message: "Business can not be empty" });
   } else {
      ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);
      ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
      ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
      ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
      ReceivingData.BuyerBranch = mongoose.Types.ObjectId(ReceivingData.BuyerBranch);
      ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.Business, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var SellerDetails = Response[0];
         var BusinessDetails = Response[1];
         var BuyerDetails = Response[2];

         if (SellerDetails !== null && BusinessDetails !== null && BuyerDetails !== null) {
            var Seller;
            var Buyer;
            if (SellerDetails.CustomerType === 'Owner') {
               Seller = mongoose.Types.ObjectId(SellerDetails._id);
            } else if (SellerDetails.CustomerType === 'User') {
               Seller = mongoose.Types.ObjectId(SellerDetails.Owner);
            }

            if (BuyerDetails.CustomerType === 'Owner') {
               Buyer = mongoose.Types.ObjectId(BuyerDetails._id);
            } else if (BuyerDetails.CustomerType === 'User') {
               Buyer = mongoose.Types.ObjectId(BuyerDetails.Owner);
            }

            Promise.all([
               InvoiceManagement.InvoiceSchema.find({
                  Buyer: Buyer,
                  Seller: Seller,
                  BuyerBusiness: ReceivingData.BuyerBusiness,
                  BuyerBranch: ReceivingData.BuyerBranch,
                  Business: ReceivingData.Business,
                  Branch: ReceivingData.Branch,
                  IfBuyerNotify: true,
                  IfBuyerApprove: true,
                  PaidORUnpaid: "Unpaid",
                  InvoiceStatus: 'Accept', ActiveStatus: true
               }, {}, {})
                  .populate({ path: 'Business', select: ['BusinessName', 'BusinessCreditLimit', 'AvailableCreditLimit'] })
                  .populate({ path: 'Branch', select: ['BranchName', 'BranchCreditLimit', 'AvailableCreditLimit'] })
                  .populate({ path: 'BuyerBusiness', select: ['BusinessName', 'BusinessCreditLimit', 'AvailableCreditLimit'] })
                  .populate({ path: 'BuyerBranch', select: ['BranchName', 'BranchCreditLimit', 'AvailableCreditLimit'] })
                  .populate({ path: 'Buyer', select: ['ContactName'] }).exec(),
               PaymentModel.PaymentSchema.find({
                  Buyer: Buyer,
                  Seller: Seller,
                  BuyerBusiness: ReceivingData.BuyerBusiness,
                  BuyerBranch: ReceivingData.BuyerBranch,
                  Business: ReceivingData.Business,
                  Branch: ReceivingData.Branch,
                  Payment_Status: 'Pending', ActiveStatus: true
               }, {}, {}).exec()
            ]).then(ResponseRes => {
               var InvoiceDetails = JSON.parse(JSON.stringify(ResponseRes[0]));
               var PaymentDetails = JSON.parse(JSON.stringify(ResponseRes[1]));
               var InvoiceArr = [];
               var InvoiceDetailsArray = [];
               if (InvoiceDetails.length > 0) {
                  if (PaymentDetails.length > 0) {
                     PaymentDetails.map(Obj => {
                        Obj.InvoiceDetails.map(obj => {
                           InvoiceArr.push(obj);
                        });
                     });
                  }
                  InvoiceDetails.map(Obj => {
                     Obj.InvoiceDate = moment(new Date(Obj.InvoiceDate)).format("YYYY-MM-DD");
                     const InvoiceWithPayment = InvoiceArr.filter(obj => JSON.parse(JSON.stringify(obj.InvoiceId)) === JSON.parse(JSON.stringify(Obj._id)));
                     if (InvoiceWithPayment.length > 0) {
                        var PaidForInvoiceAmount = 0;
                        InvoiceWithPayment.map(obj => {
                           PaidForInvoiceAmount = parseFloat(PaidForInvoiceAmount) + parseFloat(obj.InvoiceAmount);
                        });
                        var LessThanInvoiceAmount = parseFloat(Obj.AvailableAmount) - parseFloat(PaidForInvoiceAmount);
                        Obj.AvailableAmount = LessThanInvoiceAmount;
                        if (Obj.AvailableAmount > 0) {
                           InvoiceDetailsArray.push(Obj);
                        }
                     } else {
                        InvoiceDetailsArray.push(Obj);
                     }
                     return Obj;
                  });
                  res.status(200).send({ Status: true, Response: InvoiceDetailsArray, Message: 'Buyer Accepted Invoice List' });
               } else {
                  res.status(200).send({ Status: true, Response: InvoiceDetails, Message: 'Buyer Accepted Invoice List' });
               }
            }).catch(ErrorRes => {
               ErrorHandling.ErrorLogCreation(req, 'Invoice List Getting Error', 'InvoiceManagement.Controller -> BuyerInvoice_AcceptList', JSON.stringify(ErrorRes));
               res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Invoice!.", Error: ErrorRes });
            });
         } else {
            res.status(417).send({ Status: false, Message: "Invalid Seller and Business and Buyer Details!." });
         }
      }).catch(Error => {
         ErrorHandling.ErrorLogCreation(req, 'Finding the Seller And Buyer , Business Getting Error', 'InvoiceManagement.Controller -> BuyerInvoice_PendingList', JSON.stringify(Error));
         res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Invoice!.", Error: Error });
      });
   }
};


// Create Payment Request for Buyer & Buyer User
exports.PaymentCreate = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Seller || ReceivingData.Seller === '') {
      res.status(400).send({ Status: false, Message: "Seller can not be empty" });
   } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
      res.status(400).send({ Status: false, Message: "BuyerBusiness can not be empty" });
   } else if (!ReceivingData.Branch || ReceivingData.Branch === '') {
      res.status(400).send({ Status: false, Message: "Seller Branch can not be empty" });
   } else if (!ReceivingData.Business || ReceivingData.Business === '') {
      res.status(400).send({ Status: false, Message: "Seller Business can not be empty" });
   } else if (!ReceivingData.BuyerBranch || ReceivingData.BuyerBranch === '') {
      res.status(400).send({ Status: false, Message: "Buyer Branch can not be empty" });
   } else if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
      res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
   } else if (!ReceivingData.PaymentDate || ReceivingData.PaymentDate === '') {
      res.status(400).send({ Status: false, Message: "PaymentDate  can not be empty" });
   } else if (!ReceivingData.PaymentMode || ReceivingData.PaymentMode === '') {
      res.status(400).send({ Status: false, Message: "PaymentMode can not be empty" });
   } else {

      ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
      ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
      ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);
      ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
      ReceivingData.BuyerBranch = mongoose.Types.ObjectId(ReceivingData.BuyerBranch);
      ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
      var Invoice = [];
      var InvoiceArr = [];
      var PaymentAmount = 0;
      if (ReceivingData.InvoiceDetails.length === 0) {
         Invoice = [];
      } else {
         ReceivingData.InvoiceDetails.map(Obj => {
            InvoiceArr.push(mongoose.Types.ObjectId(Obj.InvoiceId));
            if (Obj.InvoiceAcceptAndCancel === true) {
               Invoice.push({
                  'InvoiceId': mongoose.Types.ObjectId(Obj.InvoiceId),
                  'InvoiceAmount': Obj.PayToInvoiceAmount,
                  'PaidORUnpaid': Obj.PaidORUnpaid
               });
               PaymentAmount = parseFloat(PaymentAmount) + parseFloat(Obj.PayToInvoiceAmount);
               return Obj;
            }
         });
      }

      PaymentAmount = PaymentAmount.toFixed(2);
      PaymentAmount = parseFloat(PaymentAmount);


      var PaymentAttachArray = [];
      if (ReceivingData.PaymentAttachments.length > 0) {
         ReceivingData.PaymentAttachments.map(Obj => {
            if (Obj.PaymentPreviewAvailable === true) {
               PaymentAttachArray.push({
                  fileName: Obj.PaymentPreview,
                  fileType: '.png'
               });
            }
         });
      }

      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.Business, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BranchSchema.findOne({ _id: ReceivingData.Branch, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.BuyerBusiness, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BranchSchema.findOne({ _id: ReceivingData.BuyerBranch, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         PaymentModel.PaymentSchema.findOne({ ActiveStatus: true, IfDeleted: false }, {}, { sort: { PaymentID: -1 } }).exec(),
         InvoiceManagement.InvoiceSchema.find({ _id: { $in: InvoiceArr }, InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var SellerDetails = Response[0];
         var BusinessDetails = Response[1];
         var BranchDetails = Response[2];
         var BuyerDetails = Response[3];
         var BuyerBusinessDetails = Response[4];
         var BuyerBranchDetails = Response[5];
         var LastPayment = Response[6];
         var InvoiceDetails = Response[7];
         if (SellerDetails !== null && InvoiceDetails.length !== 0 && BusinessDetails !== null && BranchDetails !== null && BuyerDetails !== null && BuyerBusinessDetails !== null && BuyerBranchDetails !== null) {
            var Seller;
            var Buyer;
            if (SellerDetails.CustomerType === 'Owner') {
               Seller = mongoose.Types.ObjectId(SellerDetails._id);
            } else if (SellerDetails.CustomerType === 'User') {
               Seller = mongoose.Types.ObjectId(SellerDetails.Owner);
            }

            if (BuyerDetails.CustomerType === 'Owner') {
               Buyer = mongoose.Types.ObjectId(BuyerDetails._id);
            } else if (BuyerDetails.CustomerType === 'User') {
               Buyer = mongoose.Types.ObjectId(BuyerDetails.Owner);
            }

            var LastPayment_Reference = LastPayment !== null ? (LastPayment.PaymentID_Unique + 1) : 1;
            const Create_Payment = new PaymentModel.PaymentSchema({
               Seller: Seller,
               Business: ReceivingData.Business,
               Branch: ReceivingData.Branch,
               Buyer: Buyer,
               BuyerBusiness: ReceivingData.BuyerBusiness,
               BuyerBranch: ReceivingData.BuyerBranch,
               PaymentID: 'PAY-' + LastPayment_Reference.toString().padStart(9, '0'),
               PaymentID_Unique: LastPayment_Reference,
               InvoiceDetails: Invoice,
               PaymentDate: ReceivingData.PaymentDate,
               PaymentAmount: PaymentAmount || 0,
               PaymentMode: ReceivingData.PaymentMode,
               Remarks: ReceivingData.Remarks || '',
               IfSellerApprove: false,
               IfSellerNotify: false,
               DisputedRemarks: '',
               Payment_Status: 'Pending',
               PaymentAttachments: PaymentAttachArray || [],
               ActiveStatus: true,
               IfDeleted: false
            });

            Create_Payment.save(function (err_2, result_2) {
               if (err_2) {
                  ErrorHandling.ErrorLogCreation(req, 'Payment Create Error', 'PaymentManagement.Controller -> PaymentCreate', JSON.stringify(err_2));
                  res.status(417).send({ Status: false, Message: "Some error occurred while Creating the Payment!.", Error: err_2 });
               } else {
                  if (result_2.PaymentAttachments.length !== 0) {
                     var PaymentArr = [];
                     var PaymentAttachments = result_2.PaymentAttachments;
                     PaymentAttachments = PaymentAttachments.map(Obj => {
                        var PaymentObj = {
                           _id: String,
                           fileName: String,
                           fileType: String
                        };
                        var reportData = Obj.fileName.replace(/^data:[a-z]+\/[a-z]+;base64,/, "").trim();
                        var buff = Buffer.from(reportData, 'base64');
                        const fineName = 'Uploads/Payment/' + Obj._id + '.png';
                        PaymentObj._id = Obj._id;
                        PaymentObj.fileName = Obj._id + '.png';
                        PaymentObj.fileType = Obj.fileType;
                        fs.writeFileSync(fineName, buff);
                        PaymentArr.push(PaymentObj);
                     });
                     PaymentModel.PaymentSchema.updateOne({ _id: result_2._id }, { PaymentAttachments: PaymentArr }).exec();
                  }
                  res.status(200).send({ Status: true, Response: result_2, Message: 'Payment SuccessFully Created' });
               }
            });
         } else {
            res.status(417).send({ Status: false, Message: "Some error occurred while Creating the Payment Management!." });
         }
      }).catch(Error => {
         ErrorHandling.ErrorLogCreation(req, 'Payment Create Error', 'PaymentManagement.Controller -> Payment_Create', JSON.stringify(Error));
         res.status(417).send({ Status: false, Message: "Some error occurred !...." });
      });

   }
};


// Buyer Payment Disputed
exports.BuyerPayment_Disputed = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "CustomerId can not be empty" });
   } else if (!ReceivingData.WaitForApprovalArray || ReceivingData.WaitForApprovalArray === '') {
      res.status(400).send({ Status: false, Message: "Wait For Approval  can not be empty" });
   } else if (!ReceivingData.Payment_Status || ReceivingData.Payment_Status === '') {
      res.status(400).send({ Status: false, Message: "Payment Status can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      var PaymentArray = [];
      ReceivingData.WaitForApprovalArray.map(Obj => {
         PaymentArray.push(mongoose.Types.ObjectId(Obj._id));
      });
      PaymentModel.PaymentSchema.findOne({ "_id": { $in: PaymentArray } }, {}, {}).exec((err_Res, result_Res) => {
         if (err_Res) {
            res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Delivery Person Details!.", Error: err_Res });
         } else {
            if (result_Res !== null) {
               var InvoiceArr = [];
               result_Res.InvoiceDetails.map(Obj => {
                  InvoiceArr.push(mongoose.Types.ObjectId(Obj.InvoiceId));
               });
               Promise.all([
                  InvoiceManagement.InvoiceSchema.find({ "_id": { $in: InvoiceArr } }, {}, {}).
                     populate({ path: 'Buyer', select: ['ContactName', 'Firebase_Token'] }).populate({ path: 'Buyer', select: ["ContactName", "Firebase_Token"] }).
                     populate({ path: 'Business', select: 'BusinessName' }).populate({ path: 'BuyerBusiness', select: 'BusinessName' }).
                     populate({ path: 'BuyerBranch', select: 'BranchName' }).populate({ path: 'Branch', select: 'BranchName' }).exec(),
                  CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
               ]).then(Response => {
                  var InvoiceDetails = JSON.parse(JSON.stringify(Response[0]));
                  var CustomerDetails = JSON.parse(JSON.stringify(Response[1]));
                  if (CustomerDetails !== null && InvoiceDetails.length !== 0) {
                     PaymentModel.PaymentSchema.updateOne(
                        { "_id": { $in: PaymentArray } },
                        {
                           $set: {
                              "Payment_Status": ReceivingData.Payment_Status,
                              "Payment_ApprovedBy": ReceivingData.CustomerId,
                           }
                        }
                     ).exec(function (err_1, result_1) {
                        if (err_1) {
                           ErrorHandling.ErrorLogCreation(req, 'PaymentDetails Update Getting Error', 'PaymentManagement.Controller -> PaymentApprove', JSON.stringify(err_1));
                           res.status(417).send({ Status: false, Message: "Some error occurred while Updating the Payment Status!.", Error: err_1 });
                        } else {
                           var CustomerFCMToken = [];
                           InvoiceDetails.map(Obj => {

                              CustomerFCMToken.push(Obj.Buyer.Firebase_Token);
                              var payload = {
                                 notification: {
                                    title: 'Hundi-Team',
                                    body: 'Seller Business Name : ' + Obj.Business.BusinessName + ' disputed your payment on invoice ' + ' Invoice Number: ' + Obj.InvoiceNumber + ' Payment Amount: ' + result_Res.PaymentAmount + '. Click here to review the same ',
                                    sound: 'notify_tone.mp3'
                                 },
                                 data: {
                                    Customer: Obj.Buyer._id,
                                    notification_type: 'BuyerPaymentDisputed',
                                    click_action: 'FCM_PLUGIN_ACTIVITY',
                                 }
                              };

                              var payload1 = {
                                 notification: {
                                    title: 'Hundi-Team',
                                    body: 'Seller Business Name : ' + Obj.Business.BusinessName + ' disputed your payment on invoice ' + ' Invoice Number: ' + Obj.InvoiceNumber + ' Payment Amount: ' + result_Res.PaymentAmount + '. Click here to review the same. Please note today is the due date on invoice Invoice ID:' + Obj.InvoiceNumber + '  If you fail to review and complete this today, that invoice will show up as overdue',
                                    sound: 'notify_tone.mp3'
                                 },
                                 data: {
                                    Customer: Obj.Buyer._id,
                                    notification_type: 'BuyerPaymentDisputed',
                                    click_action: 'FCM_PLUGIN_ACTIVITY',
                                 }
                              };
                              if (CustomerFCMToken.length > 0) {
                                 FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
                                 FCM_App.messaging().sendToDevice(CustomerFCMToken, payload1, options).then((NotifyRes) => { });
                              }

                              const CreateNotification = new NotificationManagement.NotificationSchema({
                                 User: null,
                                 CustomerID: Obj.Buyer._id,
                                 Notification_Type: 'BuyerPaymentDisputed',
                                 Message: 'Seller Business Name : ' + Obj.Business.BusinessName + ' disputed your payment on invoice ' + ' Invoice Number: ' + Obj.InvoiceNumber + ' Payment Amount: ' + result_Res.PaymentAmount + '. Click here to review the same ',
                                 Message_Received: true,
                                 Message_Viewed: false,
                                 ActiveStatus: true,
                                 IfDeleted: false,
                              });
                              CreateNotification.save();
                           });
                           res.status(200).send({ Status: true, Message: "Payment Status Updated SuccessFully", });

                        }
                     });
                  } else {
                     res.status(417).send({ Http_Code: 417, Status: false, Message: "Invalid Customer Details!." });
                  }
               }).catch(Error => {
                  ErrorHandling.ErrorLogCreation(req, 'Finding the Invoice details and Customer details Getting Error', 'PaymentManagement.Controller -> PaymentApprove', JSON.stringify(Error));
                  res.status(417).send({ Http_Code: 417, Status: false, Message: "Invalid Payment Details!." });
               });
            } else {
               res.status(417).send({ Http_Code: 417, Status: false, Message: "Some Occurred Error!." });
            }
         }
      });
   }
};


// Seller or Owner Update the Buyer's Payment Request    
exports.BuyerPayment_Approve = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "CustomerId can not be empty" });
   } else if (!ReceivingData.WaitForApprovalArray || ReceivingData.WaitForApprovalArray === '') {
      res.status(400).send({ Status: false, Message: "Wait For Approval  can not be empty" });
   } else if (!ReceivingData.Payment_Status || ReceivingData.Payment_Status === '') {
      res.status(400).send({ Status: false, Message: "Payment Status can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      var PaymentArray = [];
      ReceivingData.WaitForApprovalArray.map(Obj => {
         PaymentArray.push(mongoose.Types.ObjectId(Obj._id));
      });
      PaymentModel.PaymentSchema.findOne({ "_id": { $in: PaymentArray } }, {}, {}).exec((err_Res, result_Res) => {
         if (err_Res) {
            res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Delivery Person Details!.", Error: err_Res });
         } else {
            if (result_Res !== null) {
               var Invoice = [];
               var InvoiceArr = [];
               result_Res.InvoiceDetails.map(Obj => {
                  InvoiceArr.push(mongoose.Types.ObjectId(Obj.InvoiceId));
                  Invoice.push(Obj);
               });
               Promise.all([
                  InvoiceManagement.InvoiceSchema.find({ "_id": { $in: InvoiceArr } }, {}, {}).
                     populate({ path: 'Buyer', select: ['ContactName', 'Firebase_Token', 'Mobile'] }).populate({ path: 'Buyer', select: ["ContactName", "Firebase_Token"] }).
                     populate({ path: 'Business', select: 'BusinessName' }).populate({ path: 'BuyerBusiness', select: 'BusinessName' }).
                     populate({ path: 'BuyerBranch', select: 'BranchName' }).populate({ path: 'Branch', select: 'BranchName' }).exec(),
                  CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
               ]).then(Response => {
                  var InvoiceDetails = JSON.parse(JSON.stringify(Response[0]));
                  var CustomerDetails = JSON.parse(JSON.stringify(Response[1]));
                  if (CustomerDetails !== null && InvoiceDetails.length !== 0) {
                     var Seller;
                     if (CustomerDetails.CustomerType === 'Owner') {
                        Seller = mongoose.Types.ObjectId(CustomerDetails._id);
                     } else if (CustomerDetails.CustomerType === 'User') {
                        Seller = mongoose.Types.ObjectId(CustomerDetails.Owner);
                     }
                     PaymentModel.PaymentSchema.updateOne(
                        { "_id": { $in: PaymentArray } },
                        {
                           $set: {
                              "Payment_Status": ReceivingData.Payment_Status,
                              "Payment_ApprovedBy": Seller,
                              "IfSellerApprove": true,
                              "IfSellerNotify": true,
                           }
                        }
                     ).exec(function (err_1, result_1) {
                        if (err_1) {
                           ErrorHandling.ErrorLogCreation(req, 'PaymentDetails Update Getting Error', 'PaymentManagement.Controller -> PaymentApprove', JSON.stringify(err_1));
                           res.status(417).send({ Status: false, Message: "Some error occurred while Updating the Payment Status!.", Error: err_1 });
                        } else {
                           var CustomerFCMToken = [];
                           InvoiceDetails.map(Obj => {
                              const CreateNotification = new NotificationManagement.NotificationSchema({
                                 User: null,
                                 CustomerID: mongoose.Types.ObjectId(Obj.Buyer._id),
                                 Notification_Type: 'BuyerPaymentAccepted',
                                 Message: 'Your Payment from ' + Obj.Business.BusinessName + ' is still pending for your acceptance. Please click here to review & accept. Please note if you fail to accept this before tomorrow it will marked as accepted automatically.',
                                 Message_Received: true,
                                 Message_Viewed: false,
                                 ActiveStatus: true,
                                 IfDeleted: false,
                              });
                              CreateNotification.save();
                              CustomerFCMToken.push(Obj.Buyer.Firebase_Token);
                              var payload = {
                                 notification: {
                                    title: 'Hundi-Team',
                                    body: 'Your invoice from ' + Obj.Business.BusinessName + ' is still pending for your acceptance. Please click here to review & accept. Please note if you fail to accept this before tomorrow it will marked as accepted automatically.',
                                    sound: 'notify_tone.mp3'
                                 },
                                 data: {
                                    Customer: Obj.Buyer._id,
                                    notification_type: 'BuyerPaymentAccepted',
                                    click_action: 'FCM_PLUGIN_ACTIVITY',
                                 }
                              };
                              var SmsMessage = 'Your invoice from ' + Obj.Business.BusinessName + ' is still pending for your acceptance. Please click here to review & accept. Please note if you fail to accept this before tomorrow it will marked as accepted automatically.';
                              const params = new URLSearchParams();
                              params.append('key', '25ECE50D1A3BD6');
                              params.append('msg', SmsMessage);
                              params.append('senderid', 'TXTDMO');
                              params.append('routeid', '3');
                              params.append('contacts', Obj.Buyer.Mobile);

                              // axios.post('https://sms.textmysms.com/app/smsapi/index.php', params1).then(function (response) {
                              //    callback(null, response.data);
                              //  }).catch(function (error) {
                              //    callback('Some Error for Seller Invite SMS!, Error: ' + error, null);
                              //  });

                              FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
                           });

                           InvoiceDetails.map(Obj => {
                              const InvoiceDetailsArray = Invoice.filter(obj => JSON.parse(JSON.stringify(Obj._id)) === JSON.parse(JSON.stringify(obj.InvoiceId)));
                              if (InvoiceDetailsArray.length !== 0) {
                                 var LessThanInvoice = 0;
                                 var UsedCurrentCreditAmount = 0;
                                 var UsedTemporaryCreditAmount = 0;
                                 var ExtraUsedCreditAmount = 0;
                                 var LessUsedCurrentCreditAmount = 0;
                                 var LessUsedTemporaryCreditAmount = 0;
                                 var LessExtraUsedCreditAmount = 0;
                                 InvoiceDetailsArray.map(ObjIn => {
                                    LessThanInvoice = Number(Obj.InvoiceAmount) - Number(ObjIn.InvoiceAmount);
                                    LessExtraUsedCreditAmount = Number(Obj.ExtraUsedCreditAmount) + Number(ObjIn.InvoiceAmount);
                                    if (LessExtraUsedCreditAmount > 0) {
                                       ExtraUsedCreditAmount = 0;
                                    } else {
                                       ExtraUsedCreditAmount = LessExtraUsedCreditAmount
                                    }

                                    if (ExtraUsedCreditAmount === 0) {
                                       LessUsedTemporaryCreditAmount = Number(LessExtraUsedCreditAmount) - Number(Obj.UsedTemporaryCreditAmount);

                                       if (LessUsedTemporaryCreditAmount > 0) {
                                          UsedTemporaryCreditAmount = 0;
                                          LessUsedCurrentCreditAmount = Number(LessUsedTemporaryCreditAmount) - Number(Obj.UsedCurrentCreditAmount);
                                          if (LessUsedCurrentCreditAmount > 0) {
                                             UsedCurrentCreditAmount = 0
                                          } else {
                                             LessUsedCurrentCreditAmount = Math.abs(LessUsedCurrentCreditAmount);
                                             UsedCurrentCreditAmount = LessUsedCurrentCreditAmount;
                                          }

                                       } else {
                                          LessUsedTemporaryCreditAmount = Math.abs(LessUsedTemporaryCreditAmount);
                                          UsedTemporaryCreditAmount = LessUsedTemporaryCreditAmount;
                                       }
                                    }

                                    InvoiceManagement.InvoiceSchema.updateOne({ _id: mongoose.Types.ObjectId(ObjIn.InvoiceId) },
                                       {
                                          $set: {
                                             AvailableAmount: LessThanInvoice,
                                             PaidORUnpaid: ObjIn.PaidORUnpaid,
                                             UsedCurrentCreditAmount: UsedCurrentCreditAmount,
                                             UsedTemporaryCreditAmount: UsedTemporaryCreditAmount,
                                             ExtraUsedCreditAmount: ExtraUsedCreditAmount
                                          }
                                       }).exec(function (err_3, result_3) {
                                          if (err_3) {
                                             res.status(417).send({ Status: false, Message: "Some error occurred while Update Invoice Status !.", Error: err_3 });
                                          } else {

                                          }
                                       });
                                    return ObjIn;
                                 });

                              }
                           });
                           res.status(200).send({ Status: true, Message: "Invoice Status Updated SuccessFully", });

                        }
                     });
                  } else {
                     res.status(417).send({ Http_Code: 417, Status: false, Message: "Invalid Customer Details!." });
                  }
               }).catch(Error => {
                  ErrorHandling.ErrorLogCreation(req, 'Finding the Invoice details and Customer details Getting Error', 'PaymentManagement.Controller -> PaymentApprove', JSON.stringify(Error));
                  res.status(417).send({ Http_Code: 417, Status: false, Message: "Invalid Payment Details!." });
               });
            } else {
               res.status(417).send({ Http_Code: 417, Status: false, Message: "Some Occurred Error!." });
            }
         }
      });
   }
};


// Payment Details Update
exports.PaymentDetailsUpdate = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Seller || ReceivingData.Seller === '') {
      res.status(400).send({ Status: false, Message: "Seller can not be empty" });
   } else if (!ReceivingData.Business || ReceivingData.Business === '') {
      res.status(400).send({ Status: false, Message: "Business can not be empty" });
   } else if (!ReceivingData.Branch || ReceivingData.Branch === '') {
      res.status(400).send({ Status: false, Message: "Branch can not be empty" });
   } else if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
      res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
   } else if (!ReceivingData.PaymentId || ReceivingData.PaymentId === '') {
      res.status(400).send({ Status: false, Message: "PaymentId can not be empty" });
   } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
      res.status(400).send({ Status: false, Message: "Invoice can not be empty" });
   } else if (!ReceivingData.BuyerBranch || ReceivingData.BuyerBranch === '') {
      res.status(400).send({ Status: false, Message: "Invoice can not be empty" });
   } else if (!ReceivingData.Payment_Status || ReceivingData.Payment_Status === '') {
      res.status(400).send({ Status: false, Message: "Payment Status can not be empty" });
   } else if (!ReceivingData.InvoiceDetails || ReceivingData.InvoiceDetails === '') {
      res.status(400).send({ Status: false, Message: "InvoiceDetails can not be empty" });
   } else if (!ReceivingData.PaymentDate || ReceivingData.PaymentDate === '') {
      res.status(400).send({ Status: false, Message: "PaymentDate  can not be empty" });
   } else if (!ReceivingData.PaymentMode || ReceivingData.PaymentMode === '') {
      res.status(400).send({ Status: false, Message: "PaymentMode can not be empty" });
   } else {
      var Invoice = [];
      var PaymentAmount = 0;
      if (ReceivingData.InvoiceDetails.length === 0) {
         Invoice = [];
      } else {
         ReceivingData.InvoiceDetails = ReceivingData.InvoiceDetails.map(Obj => {
            Invoice.push({
               'InvoiceId': mongoose.Types.ObjectId(Obj.InvoiceId),
               'InvoiceAmount': Obj.PayToInvoiceAmount,
               'PaidORUnpaid': Obj.PaidORUnpaid
            });
            PaymentAmount = parseFloat(PaymentAmount) + parseFloat(Obj.PayToInvoiceAmount);
            return Obj;
         });
      }

      var PaymentAttachArray = [];
      if (ReceivingData.PaymentAttachments.length > 0) {
         ReceivingData.PaymentAttachments.map(Obj => {
            if (Obj.PaymentPreviewAvailable === true) {
               PaymentAttachArray.push({
                  fileName: Obj.PaymentPreview,
                  fileType: '.png'
               });
            }
         });
      }

      ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
      ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
      ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);
      ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
      ReceivingData.PaymentId = mongoose.Types.ObjectId(ReceivingData.PaymentId);
      ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
      ReceivingData.BuyerBranch = mongoose.Types.ObjectId(ReceivingData.BuyerBranch);
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.Business, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BranchSchema.findOne({ _id: ReceivingData.Branch, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.BuyerBusiness, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BranchSchema.findOne({ _id: ReceivingData.BuyerBranch, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         PaymentModel.PaymentSchema.findOne({ _id: ReceivingData.PaymentId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         PaymentModel.PaymentSchema.findOne({ ActiveStatus: true, IfDeleted: false }, {}, { sort: { PaymentID: -1 } }).exec(),
      ]).then(Response => {
         var SellerDetails = Response[0];
         var BusinessDetails = Response[1];
         var BranchDetails = Response[2];
         var BuyerDetails = Response[3];
         var BuyerBusinessDetails = Response[4];
         var BuyerBranchDetails = Response[5];
         var PaymentDetails = Response[6];
         var LastPayment = Response[7];
         var LastPayment_Reference = LastPayment !== null ? (LastPayment.PaymentID_Unique + 1) : 1;
         if (SellerDetails !== null && BuyerBusinessDetails !== null && BuyerBranchDetails !== null && BusinessDetails !== null && BranchDetails !== null && BuyerDetails !== null) {
            var PaymentAttachments = [];
            if (ReceivingData.PaymentAttachments === null) {
               PaymentAttachments = [];
            } else {
               ReceivingData.PaymentAttachments.map(obj => {
                  PaymentAttachments.push(obj);
               });
            }

            var Seller;
            var Buyer;
            if (SellerDetails.CustomerType === 'Owner') {
               Seller = mongoose.Types.ObjectId(SellerDetails._id);
            } else if (SellerDetails.CustomerType === 'User') {
               Seller = mongoose.Types.ObjectId(SellerDetails.Owner);
            }

            if (BuyerDetails.CustomerType === 'Owner') {
               Buyer = mongoose.Types.ObjectId(BuyerDetails._id);
            } else if (BuyerDetails.CustomerType === 'User') {
               Buyer = mongoose.Types.ObjectId(BuyerDetails.Owner);
            }

            if (ReceivingData.Payment_Status === "Disputed") {
               PaymentDetails.Payment_Status = 'Closed';
               PaymentDetails.ActiveStatus = false;
               PaymentDetails.IfDeleted = true;
               PaymentDetails.save((err, result) => {
                  if (err) {
                     ErrorHandling.ErrorLogCreation(req, 'Payment Update Error', 'Payment.Controller -> Payment_Update', JSON.stringify(err));
                     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to create the Invoice!.", Error: err });
                  } else {
                     const Create_Payment = new PaymentModel.PaymentSchema({
                        Seller: Seller,
                        Business: ReceivingData.Business,
                        Branch: ReceivingData.Branch,
                        Buyer: Buyer,
                        BuyerBusiness: ReceivingData.BuyerBusiness,
                        BuyerBranch: ReceivingData.BuyerBranch,
                        PaymentID: 'PAY-' + LastPayment_Reference.toString().padStart(9, '0'),
                        PaymentID_Unique: LastPayment_Reference,
                        InvoiceDetails: Invoice,
                        PaymentDate: ReceivingData.PaymentDate,
                        PaymentAmount: PaymentAmount || 0,
                        PaymentMode: ReceivingData.PaymentMode,
                        Remarks: ReceivingData.Remarks || '',
                        Payment_Status: 'Pending',
                        PaymentAttachments: PaymentAttachArray || [],
                        IfSellerApprove: false,
                        IfSellerNotify: false,
                        DisputedRemarks: '',
                        ActiveStatus: true,
                        IfDeleted: false
                     });
                     Create_Payment.save(function (err_2, result_2) {
                        if (err_2) {
                           ErrorHandling.ErrorLogCreation(req, 'Payment Create Error', 'PaymentManagement.Controller -> PaymentCreate', JSON.stringify(err_2));
                           res.status(417).send({ Status: false, Message: "Some error occurred while Creating the Payment!.", Error: err_2 });
                        } else {
                           if (result_2.PaymentAttachments.length !== 0) {
                              var PaymentArr = [];
                              var PaymentAttachments = result_2.PaymentAttachments;
                              PaymentAttachments = PaymentAttachments.map(Obj => {
                                 var PaymentObj = {
                                    _id: String,
                                    fileName: String,
                                    fileType: String
                                 };
                                 var reportData = Obj.fileName.replace(/^data:[a-z]+\/[a-z]+;base64,/, "").trim();
                                 var buff = Buffer.from(reportData, 'base64');
                                 const fineName = 'Uploads/Payment/' + Obj._id + '.png';
                                 PaymentObj._id = Obj._id;
                                 PaymentObj.fileName = Obj._id + '.png';
                                 PaymentObj.fileType = Obj.fileType;
                                 fs.writeFileSync(fineName, buff);
                                 PaymentArr.push(PaymentObj);
                              });
                              PaymentModel.PaymentSchema.updateOne({ _id: result_2._id }, { PaymentAttachments: PaymentArr }).exec();
                           }
                           res.status(200).send({ Status: true, Response: result_2, Message: 'Payment SuccessFully Updated' });
                           // if (result_2) {     
                           //     var Invoice = [];
                           //     ReceivingData.InvoiceDetails = ReceivingData.InvoiceDetails.map(Obj => {
                           //         Invoice.push({
                           //             'InvoiceId': mongoose.Types.ObjectId(Obj._id),
                           //         });
                           //         return Obj;
                           //     });     
                                            
                           //     InvoiceManagement.InvoiceSchema.updateOne({ _id: { $in: Invoice }}, 
                           //     { $set: {InvoiceStatus: 'Buyer_Accept'} }).exec(function (err_3, result_3) {
                           //         if (err_3) {
                           //         res.status(417).send({ Status: false, Message: "Some error occurred while Update Invoice Status !.", Error: err_3 });
                           //         } else {
                           //         res.status(201).send({ Status: true, Message: "Invoice Status Updated SuccessFully", });
                           //         }
                           //     });   
                           // }
                        }
                     });
                  }
               });
            } else {
               PaymentDetails.Seller = Seller;
               PaymentDetails.Business = ReceivingData.Business;
               PaymentDetails.Branch = ReceivingData.Branch;
               PaymentDetails.Buyer = Buyer;
               PaymentDetails.BuyerBusiness = ReceivingData.BuyerBusiness;
               PaymentDetails.BuyerBranch = ReceivingData.BuyerBranch;
               PaymentDetails.InvoiceDetails = Invoice;
               PaymentDetails.PaymentDate = ReceivingData.PaymentDate;
               PaymentDetails.Remarks = ReceivingData.Remarks || '';
               PaymentDetails.PaymentAmount = PaymentAmount || 0;
               PaymentDetails.Payment_Status = ReceivingData.Payment_Status || 'Closed';
               PaymentDetails.PaymentAttachments = PaymentAttachArray || [];
               PaymentDetails.PaymentMode = ReceivingData.PaymentMode;
               PaymentDetails.save((err, result) => {
                  if (err) {
                     ErrorHandling.ErrorLogCreation(req, 'Payment Update Error', 'Payment.Controller -> Payment_Update', JSON.stringify(err));
                     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to create the Invoice!.", Error: err });
                  } else {
                     if (result.PaymentAttachments.length !== 0) {
                        var PaymentArr = [];
                        var PaymentAttachments = result.PaymentAttachments;
                        PaymentAttachments = PaymentAttachments.map(Obj => {
                           var PaymentObj = {
                              _id: String,
                              fileName: String,
                              fileType: String
                           };
                           var reportData = Obj.fileName.replace(/^data:[a-z]+\/[a-z]+;base64,/, "").trim();
                           var buff = Buffer.from(reportData, 'base64');
                           const fineName = 'Uploads/Payment/' + Obj._id + '.png';
                           PaymentObj._id = Obj._id;
                           PaymentObj.fileName = Obj._id + '.png';
                           PaymentObj.fileType = Obj.fileType;
                           fs.writeFileSync(fineName, buff);
                           PaymentArr.push(PaymentObj);
                        });
                        PaymentModel.PaymentSchema.updateOne({ _id: result._id }, { PaymentAttachments: PaymentArr }).exec();
                     }
                     res.status(200).send({ Status: true, Response: result, Message: 'Payment SuccessFully Updated' });
                  }
               });
            }
         } else {
            res.status(400).send({ Status: false, Message: "Some Occurred Error" });
         }
      }).catch(Error => {
         // console.log(Error);
         ErrorHandling.ErrorLogCreation(req, 'SellerDetails InvoiceDetails BusinessDetails BranchDetails BuyerDetails Error', 'InvoiceManagement.Controller -> Some occurred Error', JSON.stringify(Error));
         res.status(417).send({ Status: false, Message: "Some occurred Error!.", Error: Error });
      });
   }
};




