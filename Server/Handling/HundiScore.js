var mongoose = require('mongoose');
var CustomerManagement = require('./../../Server/Models/CustomerManagement.model');
var InvoiceManagement = require('./../../Server/Models/InvoiceManagement.model');
var PaymentManagement = require('./../../Server/Models/PaymentManagement.model');
var TemporaryManagement = require('./../../Server/Models/TemporaryCredit.model');
var InviteManagement = require('./../../Server/Models/InviteManagement.model');
var ErrorHandling = require('./ErrorHandling');


var HundiScore = {
  Hundi: function (Customer) {    
    if (Customer !== null && Customer !== undefined) {
      Customer = mongoose.Types.ObjectId(Customer);
      
      Promise.all([
        InvoiceManagement.InvoiceSchema.find({ $or: [{ Seller: Customer }, { Buyer: Customer }], ActiveStatus: true, IfDeleted: false }, { InvoiceNumber: 1, InvoiceAmount: 1, Business: 1, Branch: 1 }, {}).exec(),
        TemporaryManagement.CreditSchema.find({ $or: [{ Seller: Customer }, { Buyer: Customer }], ActiveStatus: true, IfDeleted: false }, { RequestLimit: 1 }, {}).exec(),
        InviteManagement.InviteSchema.find({ $or: [{ InvitedBy: Customer }, { InvitedTo: Customer }], ActiveStatus: true, IfDeleted: false }, { PaymentCycle: 1, Credit_Allowed: 1 }, {}).exec(),
        CustomerManagement.CustomerSchema.findOne({ _id: Customer, ActiveStatus: true, IfDeleted: false }, {}, {})
          .populate({
            path: 'BusinessAndBranches.Branches', select: ['BranchName', 'Mobile', 'Address', 'RegistrationId',
              'AvailableCreditLimit', 'BranchCreditLimit', 'GSTIN', 'createdAt']
          }).exec(),
        PaymentManagement.PaymentSchema.find({ $or: [{ Seller: Customer }, { Buyer: Customer }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec()
        ]).then(Response => {
        var SellerAndBuyerInvoice = Response[0];
        var SellerAndBuyerTemporary = Response[1];
        var InviteSellerAndBuyerManagement = Response[2];
        var CustomerDetails = Response[3];
        var PaymentDetails = Response[4];

        var TotalOverdueAmount = 0;
        var BranchAvailableLimit = 0;
        var PaidAmountForInvoice = 0;
        var TemporaryAmount = 0;
        var BranchArr = [];

        var HundiScore1 = {
          OverDueAmount: 0,
          CreditLimit: 0,
          DelayInPayment: 0,
          TemporaryCreditLimit: 0
        };
        
        if (SellerAndBuyerInvoice.length !== 0) {
          var TotalInvoiceAmount = 0;
          var CreditLimit = 0;
          SellerAndBuyerInvoice.map(Obj => {
            TotalInvoiceAmount = (TotalInvoiceAmount + Obj.InvoiceAmount);
          });

          CustomerDetails.BusinessAndBranches.map(objB => {
            if (objB.Branches !== 0) {
              objB.Branches.map(objbr => {
                BranchArr.push(objbr);
              });
            }
          });
          BranchArr = BranchArr.filter((obj, index) => BranchArr.indexOf(obj) === index);
          if (BranchArr.length !== 0) {
            BranchArr.map(Obj => {
              CreditLimit = (CreditLimit + Obj.AvailableCreditLimit);
            });
          }

          TotalOverdueAmount = (TotalInvoiceAmount - CreditLimit);
          if (TotalOverdueAmount > 1) {

            HundiScore1.OverDueAmount = Math.ceil((TotalOverdueAmount * 40) / 100);
          }

          BranchAvailableLimit = (TotalOverdueAmount - CreditLimit);
          var TemporaryCreditLimit = 0;
          if (BranchAvailableLimit > 1) {
            if (SellerAndBuyerTemporary.length !== 0) {
              SellerAndBuyerTemporary.map(Obj => {
                TemporaryCreditLimit = (TemporaryCreditLimit + Obj.RequestLimit);
              });
            }

            HundiScore1.CreditLimit = Math.ceil(10 * TemporaryCreditLimit / 100);
            TemporaryCreditLimit = (TemporaryCreditLimit - BranchAvailableLimit);
          }
          var SellerPaymentAmount = 0;
          if (PaymentDetails.length !== 0) {

            PaymentDetails.map(Obj => {
              Obj.InvoiceDetails.map(obj => {
                SellerPaymentAmount = (SellerPaymentAmount + obj.InvoiceAmount);
              });
            });
          }
          PaidAmountForInvoice = (TotalInvoiceAmount - SellerPaymentAmount);

          if (PaidAmountForInvoice > 1) {
            HundiScore1.DelayInPayment = Math.ceil(PaidAmountForInvoice * 30 / 100);
          }

          TemporaryAmount = (TemporaryCreditLimit - CreditLimit);

          if (TemporaryAmount > 1) {
            HundiScore1.TemporaryCreditLimit = Math.ceil(TemporaryAmount * 20 / 100);
          }
          
          return HundiScore1;          
        } else {          
          return HundiScore1;
        }

      }).catch(Error => {
        ErrorHandling.ErrorLogCreation(req, 'Hundi Score Error', 'HundiScore.js -> HundiScore', JSON.stringify(Error));
        res.status(417).send({ Status: false, Message: "Some error occurred !...." });
      });      
    }
  }
};

exports.HundiScore = HundiScore;