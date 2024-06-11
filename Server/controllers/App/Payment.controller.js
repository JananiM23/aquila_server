var mongoose = require('mongoose');
const ObjectId = require('mongodb').ObjectId;
var CustomersManagement = require('../../Models/CustomerManagement.model');
var ErrorHandling = require('../../Handling/ErrorHandling').ErrorHandling;
var PaymentManagement = require('../../Models/PaymentManagement.model');
var InvoiceManagement = require('../../Models/InvoiceManagement.model');
var TemporaryManagement = require('../../Models/TemporaryCredit.model');
var InviteManagement = require('../../Models/Invite_Management.model');
var moment = require('moment');
var BusinessAndBranchManagement = require('../../Models/BusinessAndBranchManagement.model');
var NotificationManagement = require('../../Models/notification_management.model');
var FCM_App = require('../../../Config/fcm_config').CustomerNotify;
const axios = require('axios');
const fsRemove = require('fs');
var fs = require('fs-extra');
const { log } = require('util');
const { create } = require('domain');

var options = {
   priority: 'high',
   timeToLive: 60 * 60 * 24
};


// Set useFindAndModify option to false
mongoose.set('useFindAndModify', false);

// Create Payment Request for Buyer & Buyer User
exports.PaymentCreate = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Seller || ReceivingData.Seller === '') {
      res.status(400).send({ Status: false, Message: "Seller can not be empty" });
   } else if (!ReceivingData.Business || ReceivingData.Business === '') {
      res.status(400).send({ Status: false, Message: "Seller Business can not be empty" });
   } else if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
      res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
   } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
      res.status(400).send({ Status: false, Message: "BuyerBusiness can not be empty" });
   } else if (!ReceivingData.PaymentDate || ReceivingData.PaymentDate === '') {
      res.status(400).send({ Status: false, Message: "PaymentDate  can not be empty" });
   } else if (!ReceivingData.PaymentMode || ReceivingData.PaymentMode === '') {
      res.status(400).send({ Status: false, Message: "PaymentMode can not be empty" });
   } else {

      ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
      ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
      ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
      ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
      // var PaymentDate = moment(ReceivingData.PaymentDate, "DD-MM-YYYY").toDate();
      var PaymentDueDate = moment(ReceivingData.PaymentDate, "DD-MM-YYYY").toDate();

      const paymentDate = moment(ReceivingData.PaymentDate, "DD-MM-YYYY");
      const combinedDateTime = moment().set({
         year: paymentDate.year(),
         month: paymentDate.month(),
         date: paymentDate.date(),
         hour: moment().hour(),
         minute: moment().minute(),
         second: moment().second(),
         millisecond: moment().millisecond()
         });
         var PaymentDate = moment(ReceivingData.PaymentDate, "DD-MM-YYYY")//.toDate();
         var PaymentDate = combinedDateTime.toDate();

      var Invoice = [];
      var InvoiceArr = [];
      var InviteQuery = {};
      InviteQuery = {  Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };

      if (ReceivingData.InvoiceDetails === null) {
         Invoice = [];
      } else {
          //'PaidAmount': Obj.PaidAmount,
      
         ReceivingData.InvoiceDetails.map(Obj => {
           
            InvoiceArr.push(mongoose.Types.ObjectId(Obj.InvoiceId));
            Invoice.push({
               'InvoiceId': mongoose.Types.ObjectId(Obj.InvoiceId),
               'PaidORUnpaid': Obj.PaidORUnpaid,
               'InvoiceNumber': Obj.InvoiceNumber,
               'IfUsedTemporaryCredit': Obj.IfUsedTemporaryCredit,
               'IfUsedPaidTemporaryCredit':Obj.IfUsedPaidTemporaryCredit,
               'InvoiceAmount': Obj.InvoiceAmount,
               'InvoiceDate': Obj.InvoiceDate,
               'RemainingAmount': Obj.RemainingAmount,
               'InProgressAmount': Obj.InProgressAmount,
               'CurrentCreditAmount': Obj.CurrentCreditAmount,
               'UsedCurrentCreditAmount': Obj.UsedCurrentCreditAmount,
               'PaidCurrentCreditAmount': Obj.PaidCurrentCreditAmount,
               'TemporaryCreditAmount': Obj.TemporaryCreditAmount,
               'UsedTemporaryCreditAmount': Obj.UsedTemporaryCreditAmount,
               'PaidTemporaryCreditAmount': Obj.PaidTemporaryCreditAmount
            });
            return Obj;
           
         });
      }

      Promise.all([

         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.Business, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.BuyerBusiness, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),

         PaymentManagement.PaymentSchema.findOne({ ActiveStatus: true, IfDeleted: false }, {}, { sort: { PaymentID_Unique : -1 } }).exec(),
         InvoiceManagement.InvoiceSchema.find({ _id: { $in: InvoiceArr }, InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         InviteManagement.InviteManagementSchema.find(InviteQuery, {}, {}).exec(),
      ]).then(Response => {
         var SellerDetails = Response[0];
         var BusinessDetails = Response[1];
         var BuyerDetails = Response[2];
         var BuyerBusinessDetails = Response[3];
         var LastPayment = Response[4];
         var InvoiceDetails = Response[5];
         var InviteDetails = JSON.parse(JSON.stringify(Response[6]));         



         ///// Payment DueDate//////////////////////
         var mGetPaymentDate = new Date(moment(ReceivingData.PaymentDate, "DD-MM-YYYY"));
         if (InviteDetails.length > 0) 
         {
            InviteDetails.map(ObjIn => {
               PaymentDueDate = moment(addDays(mGetPaymentDate, ObjIn.BuyerPaymentCycle));//.format("YYYY-MM-DD");  
            });
         }
         else
         {
            PaymentDueDate = PaymentDueDate;
         }
         ////////////////////////////////////////// Payment DueDate ////////////////////
      

            if (SellerDetails !== null && InvoiceDetails.length !== 0 && BusinessDetails !== null && BuyerDetails !== null && BuyerBusinessDetails !== null) {
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
       

               // PaymentID: 'PAY-' + LastPayment_Reference.toString().padStart(9, '0'),
            //    var LastPayment_Reference = LastPayment !== null ? (LastPayment.PaymentID_Unique + 1) : 1;   

            // const Create_Payment = new PaymentManagement.PaymentSchema({
            //    Seller: Seller,
            //    Business: ReceivingData.Business,
            //    Buyer: Buyer,
            //    BuyerBusiness: ReceivingData.BuyerBusiness,
            //    PaymentID: 'PAY -'+ LastPayment_Reference.toString(),
            //    PaymentID_Unique: LastPayment_Reference,
            //    InvoiceDetails: Invoice,
            //    PaymentDate: PaymentDate,
            //    PaymentDueDate: PaymentDueDate,
            //    PaymentAmount: ReceivingData.PaymentAmount || 0,
            //    PaymentMode: ReceivingData.PaymentMode,
            //    Remarks: ReceivingData.Remarks || '',
            //    IfSellerApprove: false,
            //    IfSellerNotify: false,
            //    DisputedRemarks: '',
            //    Payment_Status: 'Pending',
            //    PaymentAttachments: ReceivingData.PaymentAttachments || [],
            //    ActiveStatus: true,
            //    IfDeleted: false
            // });


            // Create_Payment.save(function (err_2, result_2) {
            //    if (err_2) {
            //       ErrorHandling.ErrorLogCreation(req, 'Payment Create Error', 'PaymentManagement.Controller -> PaymentCreate', JSON.stringify(err_2));
            //       res.status(417).send({ Status: false, Message: "Some error occurred while Creating the Payment!.", Error: err_2 });
            //    } else {
                
            //       if (result_2.PaymentAttachments.length !== 0) {
            //          var PaymentArr = [];
            //          var PaymentAttachments = result_2.PaymentAttachments;
            //          PaymentAttachments = PaymentAttachments.map(Obj => {
            //             var PaymentObj = {
            //                _id: String,
            //                fileName: String,
            //                fileType: String
            //             };
            //             var reportData = Obj.fileName.replace(/^data:[a-z]+\/[a-z]+;base64,/, "").trim();
            //             var buff = Buffer.from(reportData, 'base64');
            //             const fineName = 'Uploads/Payment/' + Obj._id + '.png';
            //             PaymentObj._id = Obj._id;
            //             PaymentObj.fileName = Obj._id + '.png';
            //             PaymentObj.fileType = Obj.fileType;
            //             fs.writeFileSync(fineName, buff);
            //             PaymentArr.push(PaymentObj);
            //          });
            //          PaymentManagement.PaymentSchema.updateOne({ _id: result_2._id }, { PaymentAttachments: PaymentArr }).exec();                     
            //       }
            //          if(InvoiceDetails.length !== 0)
            //          {
            //             InvoiceDetails.map(Obj_Invoice => { 
            //                ReceivingData.InvoiceDetails.map(Obj => {
            //                       var mInProgressAmount = Number(Obj_Invoice.InProgressAmount) + Number(Obj.InProgressAmount);
            //                       InvoiceManagement.InvoiceSchema.updateOne({ _id: Obj.InvoiceId },{ $set: { RemainingAmount : Obj.RemainingAmount, InProgressAmount  : mInProgressAmount,PaidORUnpaid : Obj.PaidORUnpaid}}).exec();
            //                 });
            //             });
            //          }
            //          else
            //          {
            //             ReceivingData.InvoiceDetails.map(Obj => {
            //                InvoiceManagement.InvoiceSchema.updateOne({ _id: Obj.InvoiceId },{ $set: { RemainingAmount : Obj.RemainingAmount, InProgressAmount  : Obj.InProgressAmount,PaidORUnpaid : Obj.PaidORUnpaid}}).exec();
            //          });
            //          }
                     
                       
                   

            //          // if (result_2.Branch !== null) {
            //             if (result_2.Business !== null) {
            //          const CreateNotification = new NotificationManagement.NotificationSchema({
            //             User: null,
            //             // Branch: result_2.Branch,
            //             Business: result_2.Business,
            //             Notification_Type: 'BuyerMakeToPayment',
            //             Message: BuyerDetails.ContactName + 'of ' + BuyerBusinessDetails.BusinessName + ' the create the invoice against to make the payment process that details Payment ID - ' +
            //             result_2.PaymentID + ',' + ' Rs.' + result_2.PaymentAmount + '. Click here to view the Payment.',
            //             Message_Received: true,
            //             Message_Viewed: false,
            //             ActiveStatus: true,
            //             IfDeleted: false,
            //          });
            //          CreateNotification.save();
            //       }

            //       // if (result_2.BuyerBranch !== null) {
            //          if (result_2.BuyerBusiness !== null) {
            //          const BuyerBranchCreateNotification = new NotificationManagement.NotificationSchema({
            //             User: null,
            //             // Branch: result_2.BuyerBranch,
            //             Business:result_2.BuyerBusiness,
            //             Notification_Type: 'MakeOurBranchPayment',
            //             Message: SellerDetails.ContactName + 'of ' + BusinessDetails.BusinessName + ' the create the invoice against to make the payment process that details Payment ID - ' +
            //             result_2.PaymentID + ',' + ' Rs.' + result_2.PaymentAmount + '. Click here to view the Payment.',
            //             Message_Received: true,
            //             Message_Viewed: false,
            //             ActiveStatus: true,
            //             IfDeleted: false,
            //          });
            //          BuyerBranchCreateNotification.save();
            //       }
            //       res.status(200).send({ Status: true, Response: result_2, Message: 'Payment SuccessFully Created' });
            //    }
            // });

/********************************************************************************************************************************* */
// mark the function as async
async function createPayment() {
   try {
     // use await before the Mongoose query
     const LastPayment = await PaymentManagement.PaymentSchema.findOne({ActiveStatus:true,IfDeleted:false}).sort({ PaymentID_Unique: -1 });
   //   var LastPayment_Reference = LastPayment !== null ? (LastPayment.PaymentID_Unique + 1) : 1;
        var LastPayment_Reference = LastPayment !== null ? (LastPayment.PaymentID_Unique + 1) : 1;

     const Create_Payment = new PaymentManagement.PaymentSchema({
       Seller: Seller,
       Business: ReceivingData.Business,
       Buyer: Buyer,
       BuyerBusiness: ReceivingData.BuyerBusiness,
       PaymentID: 'PAY -' + LastPayment_Reference.toString(),
       PaymentID_Unique: LastPayment_Reference,
       InvoiceDetails: Invoice,
       PaymentDate: PaymentDate,
       PaymentDueDate: PaymentDueDate,
       PaymentAmount: ReceivingData.PaymentAmount || 0,
       PaymentMode: ReceivingData.PaymentMode,
       Remarks: ReceivingData.Remarks || '',
       IfSellerApprove: false,
       IfSellerNotify: false,
       DisputedRemarks: '',
       Payment_Status: 'Pending',
       PaymentAttachments: ReceivingData.PaymentAttachments || [],
       ActiveStatus: true,
       IfDeleted: false
     });

     // use await before saving the document
     const result = await Create_Payment.save(function (err_2, result_2) {
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
            PaymentManagement.PaymentSchema.updateOne({ _id: result_2._id }, { PaymentAttachments: PaymentArr }).exec();                     
         }

       //Update Invoice Amounts Here while Making Paymnt v
            if(InvoiceDetails.length !== 0)
            {
               InvoiceDetails.map(Obj_Invoice => { 
                  // console.log(Invoice,'invvv');
                  ReceivingData.InvoiceDetails.map(Obj => {
                     // console.log(Obj,'Objjjj');
                         var mInProgressAmount = Number(Obj_Invoice.InProgressAmount) + Number(Obj.InProgressAmount);
                         var x = Number(Obj_Invoice.RemainingAmount) + Number(Obj.RemainingAmount);
                         var mRemainingAmount = Number(Obj.InvoiceAmount)  -Number(Obj_Invoice.PaidAmount)- mInProgressAmount;
                        //  console.log(mRemainingAmount,'mRemainingAmountmRemainingAmountmRemainingAmount');
                        //  console.log(Obj.RemainingAmount,'Obj.RemainingAmount,Obj.RemainingAmount,');
                        //  console.log(Obj_Invoice.RemainingAmount,'Obj_InvoiceObj_Invoice');
                        //  console.log('----------------------------------------------');
                        //  console.log(x,'xdasdsxasdasc');
                        //  console.log('=============================================');
                        //  RemainingAmount : Obj.RemainingAmount,
                         InvoiceManagement.InvoiceSchema.updateOne({ _id: Obj.InvoiceId },{ $set: { RemainingAmount : Obj.RemainingAmount, InProgressAmount  : mInProgressAmount,PaidORUnpaid : Obj.PaidORUnpaid}}).exec();
                   });
               });
            }
            else
            {
               ReceivingData.InvoiceDetails.map(Obj => {
                  InvoiceManagement.InvoiceSchema.updateOne({ _id: Obj.InvoiceId },{ $set: { RemainingAmount : Obj.RemainingAmount, InProgressAmount  : Obj.InProgressAmount,PaidORUnpaid : Obj.PaidORUnpaid}}).exec();
            });
            }
      //Update Invoice Amounts Here while Making Paymnt ^
          

            // if (result_2.Branch !== null) {
               if (result_2.Business !== null) {
            const CreateNotification = new NotificationManagement.NotificationSchema({
               User: null,
               // Branch: result_2.Branch,
               Business: result_2.Business,
               Notification_Type: 'BuyerMakeToPayment',
               Message: BuyerDetails.ContactName + 'of ' + BuyerBusinessDetails.FirstName +''+ BuyerBusinessDetails.LastName  + ' the create the invoice against to make the payment process that details Payment ID - ' +
               result_2.PaymentID + ',' + ' Rs.' + result_2.PaymentAmount + '. Click here to view the Payment.',
               Message_Received: true,
               Message_Viewed: false,
               ActiveStatus: true,
               IfDeleted: false,
            });
            CreateNotification.save();
         }

         // if (result_2.BuyerBranch !== null) {
            if (result_2.BuyerBusiness !== null) {
            const BuyerBranchCreateNotification = new NotificationManagement.NotificationSchema({
               User: null,
               // Branch: result_2.BuyerBranch,
               Business:result_2.BuyerBusiness,
               Notification_Type: 'MakeOurBranchPayment',
               Message: SellerDetails.ContactName + 'of ' + BusinessDetails.FirstName +''+ BusinessDetails.LastName  + ' the create the invoice against to make the payment process that details Payment ID - ' +
               result_2.PaymentID + ',' + ' Rs.' + result_2.PaymentAmount + '. Click here to view the Payment.',
               Message_Received: true,
               Message_Viewed: false,
               ActiveStatus: true,
               IfDeleted: false,
            });
            BuyerBranchCreateNotification.save();
         }
         res.status(200).send({ Status: true, Response: result_2, Message: 'Payment SuccessFully Created' });
      }
   });
   
     // handle the success
   //   res.status(200).send({ Status: true,Response: result_2, Message: 'Payment SuccessFully Created' });
   } catch (error) {
     // handle the error

     res.status(400).send({ Status: false, Message: "Some error occurred while creating the payment", error });
   }
 }
 createPayment().then((result) => {
   
}).catch((error) => {
   res.status(400).send({ Status: false, Message: "Some error occurred while creating the payment", error });
  // handle the error
});
/******************************************************************************************************************************* */

         } else {
            res.status(417).send({ Status: false, Message: "Some error occurred while Creating the Payment Management!." });
         }
      }).catch(Error => {
         ErrorHandling.ErrorLogCreation(req, 'Payment Create Error', 'PaymentManagement.Controller -> Payment_Create', JSON.stringify(Error));
         res.status(417).send({ Status: false, Message: "Some error occurred !...." });
      });

   }
};

// Payment List
exports.CompletePaymentList = function (req, res) {
   var ReceivingData = req.body;
 
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(function (err, result) {
         if (err) {
            ErrorHandling.ErrorLogCreation(req, 'Customer Details Getting Error', 'PaymentManagement.Controller -> Customer Details Finding Error', JSON.stringify(err));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Customer Details!.", Error: err });
         } else {
            var customerDetails = JSON.parse(JSON.stringify(result));
            if (result !== null) {
               ReceivingData.PageNumber = ReceivingData.PageNumber !== 0 && ReceivingData.PageNumber !== '' ? ReceivingData.PageNumber : 1;
               var Limit = 25 ;
               var Skip = (ReceivingData.PageNumber - 1) * Limit;
               var mainQuery = { IfDeleted: false, ActiveStatus: true };
               var SubQueryOne = { IfDeleted: false, ActiveStatus: true, Payment_Status: "Pending" };
               var SubQueryTwo = { IfDeleted: false, ActiveStatus: true, Payment_Status: "Accept" };
               var SubQueryThree = { IfDeleted: false, ActiveStatus: true, Payment_Status: "Disputed"};

               // User Branches Restriction
               if (customerDetails.CustomerType === 'User' &&
                  ((ReceivingData.FilterQuery.Business === '' && ReceivingData.CustomerCategory === 'Seller') ||
                     (ReceivingData.FilterQuery.BuyerBusiness === '' && ReceivingData.CustomerCategory === 'Buyer'))) {
                  const userBranches = [];
                  const branchKey = ReceivingData.CustomerCategory === 'Seller' ? 'Business' : 'BuyerBusiness';

                  customerDetails.BusinessAndBranches.map(Obj => { 
                        userBranches.push(mongoose.Types.ObjectId(Obj.Business));
              
                  });

                  mainQuery[branchKey] = { $in: userBranches };
                  SubQueryOne[branchKey] = { $in: userBranches };
                  SubQueryTwo[branchKey] = { $in: userBranches };
                  SubQueryThree[branchKey] = { $in: userBranches };
               } else if (customerDetails.CustomerType === 'Owner' ) {
                  if (ReceivingData.CustomerCategory === 'Seller') {
                     mainQuery.Seller = ReceivingData.CustomerId;
                     SubQueryOne.Seller = ReceivingData.CustomerId;
                     SubQueryTwo.Seller = ReceivingData.CustomerId;
                     SubQueryThree.Seller = ReceivingData.CustomerId;
                  } else if (ReceivingData.CustomerCategory === 'Buyer') {
                     mainQuery.Buyer = ReceivingData.CustomerId;
                     SubQueryOne.Buyer = ReceivingData.CustomerId;
                     SubQueryTwo.Buyer = ReceivingData.CustomerId;
                     SubQueryThree.Buyer = ReceivingData.CustomerId;
                  }
               }
               // Default Filters
               if (ReceivingData.FilterQuery.Seller !== '') {
                  mainQuery.Seller = mongoose.Types.ObjectId(ReceivingData.FilterQuery.Seller);
               }
               if (ReceivingData.FilterQuery.Business !== '') {
                  mainQuery.Business = mongoose.Types.ObjectId(ReceivingData.FilterQuery.Business);
               }
               if (ReceivingData.FilterQuery.Buyer !== '') {
                  mainQuery.Buyer = mongoose.Types.ObjectId(ReceivingData.FilterQuery.Buyer);
               }
               if (ReceivingData.FilterQuery.BuyerBusiness !== '') {
                  mainQuery.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.FilterQuery.BuyerBusiness);
               }

               // Date Ranges Config
               const todayRange = {
                 from: new Date(new Date().setHours(0, 0, 0, 0)),
                 to: new Date(new Date().setHours(23, 59, 59, 999)),
               };
               const yesterdayRange = {
                 from: new Date(new Date(todayRange.to).setDate(new Date(todayRange.from).getDate() - 1)),
                 to: new Date(new Date(todayRange.to).setDate(new Date(todayRange.to).getDate() - 1)),
               };
               // const tomorrowRange = {
               //    from: new Date(new Date(todayRange.to).setDate(new Date(todayRange.from).getDate() + 1)),
               //    to: new Date(new Date(todayRange.to).setDate(new Date(todayRange.to).getDate() + 1)),
               // };
               // const upcomingRange = {
               //    from: new Date(new Date(todayRange.to).setDate(new Date(todayRange.from).getDate() + 1)),
               //    to: null,
               // };
               const previousRange = {
                  from: null,
                  to: new Date(new Date(todayRange.to).setDate(new Date(todayRange.to).getDate() - 1)),
               };
               var startOfWeek = moment().startOf('week').toDate();
               var endOfWeek   = moment().endOf('week').toDate();
               const currentWeekRange = {
                  from: startOfWeek,
                  to: endOfWeek,
               };
               const lastWeekRange = {
                  from: new Date(new Date(startOfWeek).setDate(startOfWeek.getDate() - 7)),
                  to: new Date(new Date(endOfWeek).setDate(endOfWeek.getDate() - 7)),
               };
               var startOfMonth = moment().startOf('month').toDate();
               var endOfMonth = moment().subtract(1, 'day').endOf('month').endOf('day').toDate();
               // var startOfMonth = moment().startOf('month').toDate();
               // var endOfMonth   = moment().endOf('month').toDate();
               const currentMonthRange = {
                  from: startOfMonth,
                  to: endOfMonth,
               };
               const lastMonthStart = moment().subtract(1, 'months').startOf('month').toDate();
               const lastMonthEnd = moment().subtract(1, 'months').endOf('month').endOf('day').toDate();
            const lastMonthRange = {
                     from:lastMonthStart,
                     to:lastMonthEnd
               // from: new Date(new Date(startOfWeek).setMonth(startOfWeek.getMonth() - 1)),
               // to: new Date(new Date(new Date(startOfWeek).setDate(startOfWeek.getDate() - 1)).setHours(23, 59, 59, 999))
            };
               const customRange = {
                  from: ReceivingData.FilterQuery.DateRange === 'Custom' && ReceivingData.FilterQuery.CustomDateRange.From !== '' ? moment(ReceivingData.FilterQuery.CustomDateRange.From, 'DD-MM-YYYY').toDate() : null,
                  to: ReceivingData.FilterQuery.DateRange === 'Custom' && ReceivingData.FilterQuery.CustomDateRange.To !== '' ? moment(ReceivingData.FilterQuery.CustomDateRange.To, 'DD-MM-YYYY').toDate() : null
               };
               var DateRange = ReceivingData.FilterQuery.DateRange;
               var FromDate =
                               DateRange === 'Today' ? todayRange.from : 
                              DateRange === 'Yesterday' ? yesterdayRange.from :
                              // DateRange === 'Tomorrow' ? tomorrowRange.from :
                              // DateRange === 'AllUpcoming' ? upcomingRange.from :
                              DateRange === 'AllPrevious' ? previousRange.from :
                              DateRange === 'CurrentWeek' ? currentWeekRange.from :
                              DateRange === 'LastWeek' ? lastWeekRange.from :
                              DateRange === 'CurrentMonth' ? currentMonthRange.from :
                              DateRange === 'LastMonth' ? lastMonthRange.from :
                              DateRange === 'Custom' ? customRange.from : null ;
                              
               var ToDate = 
                              DateRange === 'Today' ? todayRange.to : 
                              DateRange === 'Yesterday' ? yesterdayRange.to :
                              // DateRange === 'Tomorrow' ? tomorrowRange.to :
                              // DateRange === 'AllUpcoming' ? upcomingRange.to :
                              DateRange === 'AllPrevious' ? previousRange.to :
                              DateRange === 'CurrentWeek' ? currentWeekRange.to :
                              DateRange === 'LastWeek' ? lastWeekRange.to :
                              DateRange === 'CurrentMonth' ? currentMonthRange.to :
                              DateRange === 'LastMonth' ? lastMonthRange.to :
                              DateRange === 'Custom' ? customRange.to : null ;

               // Filter Status
               // if (ReceivingData.FilterQuery.StatusType === 'OverDue') {
               //    ToDate = new Date(new Date(todayRange.to).getDate() - 1);
               //    if ( FromDate !== null && new Date(FromDate).valueOf() > new Date(ToDate).valueOf()  ) {
               //       FromDate = new Date(new Date(todayRange.from).getDate() - 1);
               //    }
               // }
               // if (ReceivingData.FilterQuery.StatusType === 'Upcoming') {
               //    FromDate = new Date(new Date(todayRange.from).getDate() + 1);
               //    if ( ToDate !== null && new Date(ToDate).valueOf() <= new Date(FromDate).valueOf()  ) {
               //       ToDate = new Date(new Date(todayRange.to).getDate() + 1);
               //    }
               // }
               // if (ReceivingData.FilterQuery.StatusType === 'DueToday') {
               //    FromDate = todayRange.from;
               //    ToDate = todayRange.to;
               // }
               // if (ReceivingData.FilterQuery.StatusType !== 'All') {
               //    mainQuery["$or"] = [{PaymentStatus: "WaitForPayment" }, {PaymentStatus: "PartialPayment" }];
               // }

               // Final Date Filter
               if (FromDate !== null || ToDate !== null) {
                  if (FromDate === null || FromDate === null) {
                     mainQuery.PaymentDate = ToDate === null ? {$gte: FromDate} : FromDate === null ? {$lte: ToDate} : null;
                     SubQueryOne.PaymentDate = mainQuery.PaymentDate;
                     SubQueryTwo.PaymentDate = mainQuery.PaymentDate;
                     SubQueryThree.PaymentDate = mainQuery.PaymentDate;
                  } else {
                     mainQuery["$and"] = [{PaymentDate: {$gte: FromDate} }, {PaymentDate: {$lte: ToDate} }];
                     SubQueryOne["$and"] = [{PaymentDate: {$gte: FromDate} }, {PaymentDate: {$lte: ToDate} }];
                     SubQueryTwo["$and"] = [{PaymentDate: {$gte: FromDate} }, {PaymentDate: {$lte: ToDate} }];
                     SubQueryThree["$and"] = [{PaymentDate: {$gte: FromDate} }, {PaymentDate: {$lte: ToDate} }];
                  }
               }
               
               // Search Key
               if (ReceivingData.FilterQuery.SearchKey !== '') {
                  mainQuery.PaymentID = { $regex: new RegExp(".*" + ReceivingData.FilterQuery.SearchKey + ".*", "i") };
               }
               Promise.all([
                  PaymentManagement.PaymentSchema.countDocuments(SubQueryOne).exec(),
                  PaymentManagement.PaymentSchema.countDocuments(SubQueryTwo).exec(),
                  PaymentManagement.PaymentSchema.countDocuments(SubQueryThree).exec()
               ]).then(response => {
                 
                  var OpenCount = response[0];
                  var AcceptCount = response[1];
                  var DisputeCount = response[2];
                
       
                  if (ReceivingData.PaymentType === '') {   
                     if (ReceivingData.CustomerCategory === 'Seller') {
                        ReceivingData.PaymentType = OpenCount > 0 ? "Pending" : DisputeCount > 0 ? "Disputed" :  "Accept";
                     } else {
                        ReceivingData.PaymentType = DisputeCount > 0 ? "Disputed" : OpenCount> 0 ? "Pending" :  "Accept";
                     }
                  }
                 
                  mainQuery.Payment_Status = ReceivingData.PaymentType;
              
                  Promise.all([
                     PaymentManagement.PaymentSchema
                     .find(mainQuery, {}, {skip: Skip, limit: Limit,sort: { createdAt: -1 }})
                     .populate({ path: 'Seller', select: ['ContactName'] })
                     .populate({ path: 'Business', select: ['FirstName','LastName'] })
                     .populate({ path: 'BuyerBusiness', select: ['FirstName','LastName'] })
                     .populate({ path: 'Buyer', select: ['ContactName'] }).exec(),
                     PaymentManagement.PaymentSchema.countDocuments(mainQuery).exec()
                  ]).then(responseNew => {
                     var PaidORUnpaid = 'Paid';
                     responseNew[0] = JSON.parse(JSON.stringify(responseNew[0]));
                     responseNew[0] = responseNew[0].map(Obj => {
                        Obj.PaymentDate = moment(new Date(Obj.PaymentDate)).format("YYYY-MM-DD");
                        Obj.PaymentDueDate = moment(new Date(Obj.PaymentDueDate)).format("YYYY-MM-DD");
                        Obj.createdAt = moment(new Date(Obj.createdAt))//.format("YYYY-MM-DD");

                        Obj.InvoiceDetails.map(objInvoice => { 
                           objInvoice.InvoiceDate = moment(new Date(objInvoice.InvoiceDate)).format("DD MMM YYYY");
                           if(objInvoice.PaidORUnpaid === 'Unpaid')
                           {
                              PaidORUnpaid = 'Unpaid';
                           }
                           Obj.PaidORUnpaid = PaidORUnpaid;
                        });
                        return Obj;
                     });

                  // Assuming your data is stored in a variable named 'paymentData'

                     // const sortedPaymentList = responseNew[0].sort((a, b) => {
                     //    const dateA = new Date(a.PaymentDate);
                     //    const dateB = new Date(b.PaymentDate);

                     //    // Sort in descending order
                     //    return dateB - dateA;
                     // });
                  
                     responseNew[0].sort((a, b) => {
                        const dateComparison = new Date(b.createdAt) - new Date(a.createdAt);
                        
                        if (dateComparison === 0) {
                            return b.PaymentID_Unique - a.PaymentID_Unique;
                        }
                    
                        return dateComparison;
                    });
                    
                  
               //      responseNew[1].sort((a, b) => {
               //       const dateComparison = new Date(b.createdAt) - new Date(a.createdAt);
                     
               //       if (dateComparison === 0) {
               //           return b.PaymentID_Unique - a.PaymentID_Unique;
               //       }
                 
               //       return dateComparison;
               //   });

                    
                  //   // Sort the payment list by date and PaymentID_Unique in descending order
                  //   const sortedPaymentList = responseNew[0].sort((a, b) => {
                  //    // Sort by date first
                  //    const dateComparison = new Date(b.PaymentDate) - new Date(a.PaymentDate);
                     
                  //    // If dates are equal, sort by PaymentID_Unique
                  //    return dateComparison === 0 ? b.PaymentID_Unique - a.PaymentID_Unique : dateComparison;
                  // });


                  

                     
                     const Response = {
                        // PaymentList: responseNew[0].sort((a, b) => new Date(b.InvoiceDate) - new Date(a.InvoiceDate)),
                        // PaymentList: sortedPaymentList,
                        PaymentList: responseNew[0],
                        ActiveCount: responseNew[1],
                        OpenCount: OpenCount,
                        AcceptCount: AcceptCount,
                        DisputeCount: DisputeCount,
                        NoOfPages: responseNew[1] > Limit ? Math.ceil(responseNew[1] / Limit) : 1,
                        ActiveTab: ReceivingData.PaymentType
                     };
                     res.status(200).send({ Status: true, Response: Response, Message: 'Payment List' });
                  }).catch(error => {
                     // console.log(error);
                     ErrorHandling.ErrorLogCreation(req, 'Payment 1 List Getting Error', 'PaymentManagement.Controller -> CompletePaymentList', JSON.stringify(error));
                     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Payments!.", Error: JSON.stringify(error) });
                  });
               }).catch(error => {
                  ErrorHandling.ErrorLogCreation(req, 'Payment 2 List Getting Error', 'PaymentManagement.Controller -> CompletePaymentList', JSON.stringify(error));
                  res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Payments!.", Error: JSON.stringify(error) });
               });
            } else {
               res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
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
   } else if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
      res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
   } else if (!ReceivingData.PaymentId || ReceivingData.PaymentId === '') {
      res.status(400).send({ Status: false, Message: "PaymentId can not be empty" });
   } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
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
      if (ReceivingData.InvoiceDetails === null) {
         Invoice = [];
      } else {
         ReceivingData.InvoiceDetails = ReceivingData.InvoiceDetails.map(Obj => {
            
            Invoice.push({
               'InvoiceId': mongoose.Types.ObjectId(Obj.InvoiceId),
               'PaidORUnpaid': Obj.PaidORUnpaid,
               'InvoiceNumber': Obj.InvoiceNumber,
               'IfUsedTemporaryCredit': Obj.IfUsedTemporaryCredit,
               'IfUsedPaidTemporaryCredit':Obj.IfUsedPaidTemporaryCredit,
               'InvoiceAmount': Obj.InvoiceAmount,
               'InvoiceDate': Obj.InvoiceDate,
               'RemainingAmount': Obj.RemainingAmount,
               'InProgressAmount': Obj.InProgressAmount,
               'CurrentCreditAmount': Obj.CurrentCreditAmount,
               'UsedCurrentCreditAmount': Obj.UsedCurrentCreditAmount,
               'PaidCurrentCreditAmount': Obj.PaidCurrentCreditAmount,
               'TemporaryCreditAmount': Obj.TemporaryCreditAmount,
               'UsedTemporaryCreditAmount': Obj.UsedTemporaryCreditAmount,
               'PaidTemporaryCreditAmount': Obj.PaidTemporaryCreditAmount
            });
            return Obj;
         });
      }
      
      ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
      ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
      ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
      ReceivingData.PaymentId = mongoose.Types.ObjectId(ReceivingData.PaymentId);
      ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
      // var PaymentDate = moment(ReceivingData.PaymentDate, "DD-MM-YYYY").toDate();
      var PaymentDueDate = moment(ReceivingData.PaymentDate, "DD-MM-YYYY").toDate();


      const paymentDate = moment(ReceivingData.PaymentDate, "DD-MM-YYYY");
      const combinedDateTime = moment().set({
         year: paymentDate.year(),
         month: paymentDate.month(),
         date: paymentDate.date(),
         hour: moment().hour(),
         minute: moment().minute(),
         second: moment().second(),
         millisecond: moment().millisecond()
         });
         var PaymentDate = moment(ReceivingData.PaymentDate, "DD-MM-YYYY")//.toDate();
         var PaymentDate = combinedDateTime.toDate();

      var InviteQuery = {};
      InviteQuery = {Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };

      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.Business, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.BuyerBusiness, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         PaymentManagement.PaymentSchema.findOne({ _id: ReceivingData.PaymentId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         PaymentManagement.PaymentSchema.findOne({ ActiveStatus: true, IfDeleted: false }, {}, { sort: { PaymentID_Unique: -1 } }).exec(),
         InviteManagement.InviteManagementSchema.find(InviteQuery, {}, {}).exec(),

      ]).then(Response => {
         var SellerDetails = Response[0];
         var BusinessDetails = Response[1];
         var BuyerDetails = Response[2];
         var BuyerBusinessDetails = Response[3];
         var PaymentDetails = Response[4];
         var LastPayment = Response[5];
         var InviteDetails = JSON.parse(JSON.stringify(Response[6]));

         var LastPayment_Reference = LastPayment !== null ? (LastPayment.PaymentID_Unique + 1) : 1;

         // var LastPayment_Reference = LastPayment !== null ? (LastPayment.PaymentID_Unique) : 1;
 
         // Due date

         var mGetPaymentDate = new Date(moment(ReceivingData.PaymentDate, "DD-MM-YYYY"));
         if (InviteDetails.length > 0) 
         {
            InviteDetails.map(ObjIn => {
               PaymentDueDate = moment(addDays(mGetPaymentDate, ObjIn.BuyerPaymentCycle));//.format("YYYY-MM-DD");  
            });
         }
         else
         {
            PaymentDueDate = PaymentDueDate;
         }
         var mSetRemainingAmount = 0;
         //Invoice Update 
         Invoice.map(obj => {
         // mSetRemainingAmount = obj.InvoiceAmount - obj.PaidCurrentCreditAmount - obj.InProgressAmount;//500 - 0 -300
         mSetRemainingAmount = obj.InvoiceAmount - obj.PaidCurrentCreditAmount - obj.InProgressAmount;//500 - 0 -300
            InvoiceManagement.InvoiceSchema.updateOne(
                { _id: obj.InvoiceId },
                {
                    $set: {
                        PaidORUnpaid: obj.PaidORUnpaid,
                        InvoiceNumber: obj.InvoiceNumber,
                        IfUsedTemporaryCredit: obj.IfUsedTemporaryCredit,
                        IfUsedPaidTemporaryCredit: obj.IfUsedPaidTemporaryCredit,
                        InvoiceAmount: obj.InvoiceAmount,
                        InvoiceDate: obj.InvoiceDate,
                        RemainingAmount: mSetRemainingAmount,
                        InProgressAmount: obj.InProgressAmount,
                        CurrentCreditAmount: obj.CurrentCreditAmount,
                        UsedCurrentCreditAmount: obj.UsedCurrentCreditAmount,
                        PaidCurrentCreditAmount: obj.PaidCurrentCreditAmount,
                        TemporaryCreditAmount: obj.TemporaryCreditAmount,
                        UsedTemporaryCreditAmount: obj.UsedTemporaryCreditAmount,
                        PaidTemporaryCreditAmount: obj.PaidTemporaryCreditAmount
                    }
                }
            ).exec()
            .then(result => {
               //  console.log("Update successful:", result);
            })
            .catch(error => {
                console.error("Error updating document:", error);
            });
        });
        
        
        
        
       
         
         if (SellerDetails !== null && BuyerBusinessDetails !== null && BusinessDetails !== null &&  BuyerDetails !== null) {
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
                     const Create_Payment = new PaymentManagement.PaymentSchema({
                        Seller: Seller,
                        Business: ReceivingData.Business,
                        Buyer: Buyer,
                        BuyerBusiness: ReceivingData.BuyerBusiness,
                        PaymentID: 'PAY-' + LastPayment_Reference.toString().padStart(3, '0'),
                        PaymentID_Unique: LastPayment_Reference,
                        InvoiceDetails: Invoice,
                        PaymentDate: PaymentDate,
                        PaymentDueDate: PaymentDueDate,
                        PaymentAmount: ReceivingData.PaymentAmount || 0 ,
                        PaymentMode: ReceivingData.PaymentMode,
                        Remarks: ReceivingData.Remarks || '',
                        Payment_Status: 'Pending',
                        PaymentAttachments: ReceivingData.PaymentAttachments || [],
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
                              PaymentManagement.PaymentSchema.updateOne({ _id: result_2._id }, { PaymentAttachments: PaymentArr }).exec();
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
               PaymentDetails.Buyer = Buyer;
               PaymentDetails.BuyerBusiness = ReceivingData.BuyerBusiness;
               PaymentDetails.InvoiceDetails = Invoice;
               PaymentDetails.PaymentDate = PaymentDate;
               PaymentDetails.Remarks = ReceivingData.Remarks || '';
               PaymentDetails.Payment_Status = ReceivingData.Payment_Status || 'Closed';
               PaymentDetails.PaymentAttachments = ReceivingData.PaymentAttachments || [];
               PaymentDetails.PaymentMode = ReceivingData.PaymentMode;
               PaymentDetails.PaymentDueDate = PaymentDueDate;
               PaymentDetails.save((err, result) => {
                  if (err) {
                     ErrorHandling.ErrorLogCreation(req, 'Payment Update Error', 'Payment.Controller -> Payment_Update', JSON.stringify(err));
                     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to create the Invoice!.", Error: err });
                  } else {
                     if (result.PaymentAttachments.length !== 0) {
                        var PaymentArr = [];
                        var PaymentAttachments = result.PaymentAttachments;
                        PaymentAttachments = PaymentAttachments.map(Obj => {
                           if (Obj.fileName !== '') {
                              const path = 'Uploads/Payment/' + Obj._id + '.png';
                              fsRemove.unlink(path, (err) => { });
                           }
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
                        PaymentManagement.PaymentSchema.updateOne({ _id: result._id }, { PaymentAttachments: PaymentArr }).exec();
                     }
                     res.status(200).send({ Status: true, Response: result, Message: 'Payment SuccessFully Updated' });
                  }
               });
            }
         } else {
            res.status(400).send({ Status: false, Message: "Some Occurred Error" });
         }
      }).catch(Error => {
         ErrorHandling.ErrorLogCreation(req, 'SellerDetails InvoiceDetails BusinessDetails BranchDetails BuyerDetails Error', 'InvoiceManagement.Controller -> Some occurred Error', JSON.stringify(Error));
         res.status(417).send({ Status: false, Message: "Some occurred Error!.", Error: Error });
      });
   }
};


// Payment List With Advanced Filters
exports.PaymentListWithAdvancedFilters = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(function (err, result) {
         if (err) {
            ErrorHandling.ErrorLogCreation(req, 'Customer Details Getting Error', 'InvoiceManagement.Controller -> Customer Details Finding Error', JSON.stringify(err));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Customer Details!.", Error: err });
         } else {
            if (result !== null) {
               var PaymentQuery = {};
               var UsersBranchArr = [];
               var DisputedQuery = {};
               var AcceptedQuery = {};
               var OpenQuery = {};
               if (ReceivingData.CustomerCategory === 'Seller') {
                  if (result.CustomerType === 'Owner') {
                     PaymentQuery = { Seller: ReceivingData.CustomerId, Payment_Status: '', ActiveStatus: true, IfDeleted: false };
                     DisputedQuery = { Seller: ReceivingData.CustomerId, Payment_Status: 'Disputed', ActiveStatus: true, IfDeleted: false };
                     AcceptedQuery = { Seller: ReceivingData.CustomerId, Payment_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                     OpenQuery = { Seller: ReceivingData.CustomerId, Payment_Status: 'Pending', ActiveStatus: true, IfDeleted: false };
                  } else if (result.CustomerType === 'User') {
                     if (result.BusinessAndBranches.length > 0) {
                        result.BusinessAndBranches.map(Obj => {
                           if (Obj.Branches.length > 0) {
                              Obj.Branches.map(obj => {
                                 UsersBranchArr.push(mongoose.Types.ObjectId(obj));
                              });
                           }
                        });
                     }
                     PaymentQuery = { Branch: { $in: UsersBranchArr }, Payment_Status: '', ActiveStatus: true, IfDeleted: false };
                     DisputedQuery = { Branch: { $in: UsersBranchArr }, Payment_Status: 'Disputed', ActiveStatus: true, IfDeleted: false };
                     AcceptedQuery = { Branch: { $in: UsersBranchArr }, Payment_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                     OpenQuery = { Branch: { $in: UsersBranchArr }, Payment_Status: 'Pending', ActiveStatus: true, IfDeleted: false };
                  }
               } else if (ReceivingData.CustomerCategory === 'Buyer') {
                  if (result.CustomerType === 'Owner') {
                     PaymentQuery = { Buyer: ReceivingData.CustomerId, Payment_Status: '', ActiveStatus: true, IfDeleted: false };
                     DisputedQuery = { Buyer: ReceivingData.CustomerId, Payment_Status: 'Disputed', ActiveStatus: true, IfDeleted: false };
                     AcceptedQuery = { Buyer: ReceivingData.CustomerId, Payment_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                     OpenQuery = { Buyer: ReceivingData.CustomerId, Payment_Status: 'Pending', ActiveStatus: true, IfDeleted: false };
                  } else if (result.CustomerType === 'User') {
                     if (result.BusinessAndBranches.length > 0) {
                        result.BusinessAndBranches.map(Obj => {
                           if (Obj.Branches.length > 0) {
                              Obj.Branches.map(obj => {
                                 UsersBranchArr.push(mongoose.Types.ObjectId(obj));
                              });
                           }
                        });
                     }
                     PaymentQuery = { BuyerBranch: { $in: UsersBranchArr }, Payment_Status: '', ActiveStatus: true, IfDeleted: false };
                     DisputedQuery = { BuyerBranch: { $in: UsersBranchArr }, Payment_Status: 'Disputed', ActiveStatus: true, IfDeleted: false };
                     AcceptedQuery = { BuyerBranch: { $in: UsersBranchArr }, Payment_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                     OpenQuery = { BuyerBranch: { $in: UsersBranchArr }, Payment_Status: 'Pending', ActiveStatus: true, IfDeleted: false };
                  }
               }

               Promise.all([
                  PaymentManagement.PaymentSchema.countDocuments(DisputedQuery),
                  PaymentManagement.PaymentSchema.countDocuments(AcceptedQuery),
                  PaymentManagement.PaymentSchema.countDocuments(OpenQuery),
               ]).then(Response => {
                  var DisputedDetails = JSON.parse(JSON.stringify(Response[0]));
                  var AcceptedDetails = JSON.parse(JSON.stringify(Response[1]));
                  var PendingDetails = JSON.parse(JSON.stringify(Response[2]));
                  var PaymentTitle = ReceivingData.Payment_Status;
                  PaymentQuery.Payment_Status = ReceivingData.Payment_Status;
                  if (DisputedDetails > 0 && PaymentTitle === '') {
                     PaymentTitle = 'Disputed';
                     PaymentQuery.Payment_Status = 'Disputed';
                  } else if (PendingDetails > 0 && PaymentTitle === '') {
                     PaymentTitle = 'Pending';
                     PaymentQuery.Payment_Status = 'Pending';
                  } else if (AcceptedDetails > 0 && PaymentTitle === '') {
                     PaymentTitle = 'Accept';
                     PaymentQuery.Payment_Status = 'Accept';
                  }

                  if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object') {
                     if (ReceivingData.FilterQuery.Business !== '') {
                        PaymentQuery['Business'] = mongoose.Types.ObjectId(ReceivingData.FilterQuery.Business);
                     }

                     if (ReceivingData.FilterQuery.Branch !== '') {
                        PaymentQuery['Branch'] = mongoose.Types.ObjectId(ReceivingData.FilterQuery.Branch);
                     }

                     if (ReceivingData.FilterQuery.Seller !== '') {
                        PaymentQuery['Seller'] = mongoose.Types.ObjectId(ReceivingData.FilterQuery.Seller);
                     }

                     if (ReceivingData.FilterQuery.Buyer !== '') {
                        PaymentQuery['Buyer'] = mongoose.Types.ObjectId(ReceivingData.FilterQuery.Buyer);
                     }

                     if (ReceivingData.FilterQuery.BuyerBusiness !== '') {
                        PaymentQuery['BuyerBusiness'] = mongoose.Types.ObjectId(ReceivingData.FilterQuery.BuyerBusiness);
                     }

                     if (ReceivingData.FilterQuery.BuyerBranch !== '') {
                        PaymentQuery['BuyerBranch'] = mongoose.Types.ObjectId(ReceivingData.FilterQuery.BuyerBranch);
                     }

                     if (ReceivingData.FilterQuery.PaymentFrom !== '' && ReceivingData.FilterQuery.PaymentTo === '') {
                        ReceivingData.FilterQuery.PaymentFrom = moment(ReceivingData.FilterQuery.PaymentFrom, "DD-MM-YYYY").toDate();
                        var startOfDay = new Date(ReceivingData.FilterQuery.PaymentFrom.setHours(0, 0, 0, 0));
                        var endOfDay = new Date(ReceivingData.FilterQuery.PaymentFrom.setHours(23, 59, 59, 999));
                        PaymentQuery['$and'] = [{ ['PaymentDate']: { $gte: startOfDay } }, { ['PaymentDate']: { $lte: endOfDay } }];
                     }

                     if (ReceivingData.FilterQuery.PaymentFrom !== '' && ReceivingData.FilterQuery.PaymentTo !== '') {
                        ReceivingData.FilterQuery.PaymentFrom = moment(ReceivingData.FilterQuery.PaymentFrom, "DD-MM-YYYY").toDate();
                        ReceivingData.FilterQuery.PaymentTo = moment(ReceivingData.FilterQuery.PaymentTo, "DD-MM-YYYY").toDate();
                        var startOfDay = new Date(ReceivingData.FilterQuery.PaymentFrom.setHours(0, 0, 0, 0));
                        var endOfDay = new Date(ReceivingData.FilterQuery.PaymentTo.setHours(23, 59, 59, 999));
                        PaymentQuery['$and'] = [{ ['PaymentDate']: { $gte: startOfDay } }, { ['PaymentDate']: { $lte: endOfDay } }];
                     }
                  }
                  PaymentManagement.PaymentSchema
                     .aggregate([
                        { $match: PaymentQuery },
                        {
                           $lookup: {
                              from: "Business",
                              let: { "business": "$Business" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                                 { $project: { "BusinessName": 1 } }
                              ],
                              as: 'Business'
                           }
                        },
                        { $unwind: "$Business" },
                        {
                           $lookup: {
                              from: "Branch",
                              let: { "branch": "$Branch" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$branch", "$_id"] } } },
                                 { $project: { "BranchName": 1 } }
                              ],
                              as: 'Branch'
                           }
                        },
                        { $unwind: "$Branch" },
                        {
                           $lookup: {
                              from: "Customers",
                              let: { "seller": "$Seller" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$seller", "$_id"] } } },
                                 { $project: { "ContactName": 1 } }
                              ],
                              as: 'Seller'
                           }
                        },
                        { $unwind: "$Seller" },
                        {
                           $lookup: {
                              from: "Business",
                              let: { "buyerBusiness": "$BuyerBusiness" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$buyerBusiness", "$_id"] } } },
                                 { $project: { "BusinessName": 1 } }
                              ],
                              as: 'BuyerBusiness'
                           }
                        },
                        { $unwind: "$BuyerBusiness" },
                        {
                           $lookup: {
                              from: "Branch",
                              let: { "buyerBranch": "$BuyerBranch" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$buyerBranch", "$_id"] } } },
                                 { $project: { "BranchName": 1 } }
                              ],
                              as: 'BuyerBranch'
                           }
                        },
                        { $unwind: "$BuyerBranch" },
                        {
                           $lookup: {
                              from: "Customers",
                              let: { "buyer": "$Buyer" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$buyer", "$_id"] } } },
                                 { $project: { "ContactName": 1 } }
                              ],
                              as: 'Buyer'
                           }
                        },
                        { $unwind: "$Buyer" },
                        { $unwind: "$InvoiceDetails" },
                        {
                           $lookup: {
                              from: "Invoice",
                              let: { "invoiceId": "$InvoiceDetails.InvoiceId" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$invoiceId", "$_id"] } } },
                                 { $project: { "InvoiceNumber": 1, "InvoiceAmount": 1, "RemainingAmount": 1 } }
                              ],
                              as: 'InvoiceDetails.InvoiceId'
                           }
                        },
                        { $unwind: "$InvoiceDetails.InvoiceId" },
                        {
                           $group: {
                              _id: "$_id",
                              Business: { "$first": '$Business' },
                              Branch: { "$first": '$Branch' },
                              Seller: { "$first": '$Seller' },
                              BuyerBusiness: { "$first": "$BuyerBusiness" },
                              BuyerBranch: { "$first": '$BuyerBranch' },
                              Buyer: { "$first": '$Buyer' },
                              PaymentID: { "$first": '$PaymentID' },
                              PaymentDate: { "$first": '$PaymentDate' },
                              PaymentMode: { "$first": '$PaymentMode' },
                              PaymentAmount: { "$first": '$PaymentAmount' },
                              Remarks: { "$first": '$Remarks' },
                              Payment_Status: { "$first": '$Payment_Status' },
                              PaymentAttachments: { "$first": '$PaymentAttachments' },
                              DisputedRemarks: { "$first": '$DisputedRemarks' },
                              InvoiceDetails: {
                                 $push: {
                                    _id: '$InvoiceDetails._id',
                                    InvoiceId: '$InvoiceDetails.InvoiceId',
                                    InvoiceAmount: '$InvoiceDetails.InvoiceAmount',
                                    PaidORUnpaid: '$InvoiceDetails.PaidORUnpaid'
                                 }
                              },
                              ActiveStatus: { "$first": '$ActiveStatus' },
                              IfDeleted: { "$first": '$IfDeleted' },
                              createdAt: { "$first": '$createdAt' },
                           }
                        },
                     ]).exec((ErrorRes, ResponseRes) => {
                        if (ErrorRes) {
                           ErrorHandling.ErrorLogCreation(req, 'Invoice Details Getting Error', 'InvoiceManagement.Controller -> Invoice Details Error', JSON.stringify(ErrorRes));
                           res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Invoice!.", Error: ErrorRes });
                        } else {
                           ResponseRes = JSON.parse(JSON.stringify(ResponseRes));
                           if (PaymentTitle === '') {
                              res.status(200).send({ Status: true, Message: 'Payments Details', PaymentTitle: 'Pending', Response: [] });
                           } else {
                              if (PaymentTitle === 'Accept' || PaymentTitle === 'Pending') {
                                 ResponseRes = ResponseRes.map(Obj => {
                                    Obj.PaymentProcess = '';
                                    if (Obj.InvoiceDetails.length > 0) {
                                       Obj.InvoiceDetails.map(obj => {
                                          const ReduceInvoiceAmount = obj.InvoiceId.RemainingAmount - obj.InvoiceAmount;
                                          if (ReduceInvoiceAmount > 0) {
                                             Obj.PaymentProcess = 'Partial_Payment';
                                          } else {
                                             Obj.PaymentProcess = 'Completed';
                                          }
                                       });
                                    }   
                                    Obj.PaymentDate = moment(new Date(Obj.PaymentDate)).format("YYYY-MM-DD");
                                    return Obj;
                                 });
                              } else {
                                 ResponseRes = ResponseRes.map(Obj => {
                                    Obj.PaymentDate = moment(new Date(Obj.PaymentDate)).format("YYYY-MM-DD");
                                    return Obj;
                                 });
                              }
                              res.status(200).send({ Status: true, Message: 'Payments Details', PaymentTitle: PaymentTitle, Response: ResponseRes });
                           }                           
                        }
                     });
               }).catch(Error => {
                  ErrorHandling.ErrorLogCreation(req, 'Invoice Details Getting Error', 'InvoiceManagement.Controller -> InvoiceListWithAdvancedFilter', JSON.stringify(Error));
                  res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Invoice!.", Error: Error });
               });
            } else {
               res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
            }
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
      PaymentManagement.PaymentSchema.findOne({_id: ReceivingData.PaymentId,ActiveStatus: true,IfDeleted: false}, {}, {})
         .populate({ path: "BuyerBusiness", select: ['FirstName','LastName', "BusinessCreditLimit", "AvailableCreditLimit"] })
         .populate({ path: "Buyer", select: ["ContactName", "Mobile", "Email", "CustomerCategory"] })
         .populate({ path: "Seller", select: ["ContactName", "Mobile", "Email", "CustomerCategory"] })
         .populate({ path: "Business", select: ['FirstName','LastName', "BusinessCreditLimit", "AvailableCreditLimit"] })
         .populate({ path: "InvoiceDetails.InvoiceId", select: ["InvoiceStatus", "InvoiceAmount", "InvoiceDate", "InvoiceNumber", "DisputedRemarks", "AcceptRemarks", "InvoiceDescription"] }).exec(function (err, result) {
            if (err) {
               ErrorHandling.ErrorLogCreation(req, 'PaymentDetails Getting Error', 'PaymentManagement.Controller -> PaymentDetails', JSON.stringify(err));
               res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Payment!.", Error: err });
            } else {
               if (result !== null) {
                  result = JSON.parse(JSON.stringify(result));
                  result.InvoiceDetails.map(obj => {;
                     obj.InvoiceId.InvoiceDate = moment(new Date(obj.InvoiceId.InvoiceDate)).format("YYYY-MM-DD");
                  });
                  result.PaymentDate = moment(new Date(result.PaymentDate)).format("YYYY-MM-DD");
                  result.PaymentDueDate = moment(new Date(result.PaymentDueDate)).format("YYYY-MM-DD");
                  res.status(200).send({ Status: true, Message: 'Payment Details', Response: result });
               } else {
                  res.status(400).send({ Status: false, Message: "Invalid Payment ID !" });
               }
            }
         });
   }
};

   
// Seller or Owner Update the Buyer's Payment Request    

exports.BuyerPayment_Approve = async function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
       return res.status(400).send({ Status: false, Message: "CustomerId can not be empty" });
   } else if (!ReceivingData.PaymentId || ReceivingData.PaymentId === '') {
       return res.status(400).send({ Status: false, Message: "PaymentId can not be empty" });
   } else if (!ReceivingData.Payment_Status || ReceivingData.Payment_Status === '') {
       return res.status(400).send({ Status: false, Message: "Payment Status can not be empty" });
   }

   ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
   ReceivingData.PaymentId = mongoose.Types.ObjectId(ReceivingData.PaymentId);

   try {
       const result_Res = await PaymentManagement.PaymentSchema.findOne({ "_id": ReceivingData.PaymentId }).exec();
       if (!result_Res) {
           return res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!" });
       }

       var { InvoiceDetails } = result_Res;
       if (!InvoiceDetails || InvoiceDetails.length === 0) {
           return res.status(417).send({ Http_Code: 417, Status: false, Message: "Invalid Invoice Details!" });
       }

       const InvoiceArr = InvoiceDetails.map(Obj => mongoose.Types.ObjectId(Obj.InvoiceId));
       const [invoiceResponse, customerResponse] = await Promise.all([
           InvoiceManagement.InvoiceSchema.find({ "_id": { $in: InvoiceArr } })
               .populate({ path: 'Buyer', select: ['ContactName', 'Firebase_Token', 'Mobile'] })
               .populate({ path: 'Buyer', select: ["ContactName", "Firebase_Token"] })
               .populate({ path: 'Business', select: ['FirstName', 'LastName', 'BusinessCreditLimit', 'AvailableCreditLimit'] })
               .populate({ path: 'BuyerBusiness', select: ['FirstName', 'LastName', 'BusinessCreditLimit', 'AvailableCreditLimit'] })
               .exec(),
           CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false })
               .exec(),
       ]);

       var InvoiceDetails = JSON.parse(JSON.stringify(invoiceResponse));
       const CustomerDetails = JSON.parse(JSON.stringify(customerResponse));

       if (CustomerDetails && InvoiceDetails.length) {
           const Seller = CustomerDetails.CustomerType === 'Owner' ? mongoose.Types.ObjectId(CustomerDetails._id) : mongoose.Types.ObjectId(CustomerDetails.Owner);

           let totalTempInProgressAmount = 0;
           let totalInProgressAmount = 0;
           let IfUsedTemporaryCredit = false;
           const invoicePromises = InvoiceDetails.map(async (invoice) => {
           
               if (invoice.IfUsedTemporaryCredit) {
                   IfUsedTemporaryCredit = invoice.IfUsedTemporaryCredit;
                   totalTempInProgressAmount += invoice.InProgressAmount;
               } else {
                  IfUsedTemporaryCredit = false;
                   totalInProgressAmount += invoice.InProgressAmount;
               }

               
               // Update invite management schema
               if (invoice.IfUsedTemporaryCredit != true) {
                  // Inside the loop where you update invite and business amounts
                  const inviteResult = await InviteManagement.InviteManagementSchema.find({

                       Seller: invoice.Seller,
                       Business: invoice.Business._id,
                       Buyer: invoice.Buyer._id,
                       BuyerBusiness: invoice.BuyerBusiness._id,
                       Invite_Status: 'Accept'
                  }).exec();


                   if (inviteResult.length !== null) {

                     inviteResult.forEach(async resultObj => {
                         try {
                             let mSetAvailableLimit = 0;
                 
                             if (invoice.IfUsedTemporaryCredit != true) {
                            mSetAvailableLimit = resultObj.AvailableLimit + totalInProgressAmount;
                              
                              await InviteManagement.InviteManagementSchema.updateOne({
                                 Seller: invoice.Seller,
                                 Business: invoice.Business._id,
                                 Buyer: invoice.Buyer._id,
                                 BuyerBusiness: invoice.BuyerBusiness._id,
                                 Invite_Status: 'Accept'
                              }, 
                                 { $set: { AvailableLimit: mSetAvailableLimit } }
                           ).exec();
                              

                                 BusinessAndBranchManagement.BusinessSchema.updateOne(
                                    { _id: invoice.BuyerBusiness._id },
                                    { $set: { AvailableCreditLimit: mSetAvailableLimit } }
                                ).exec();
                             }
                         } catch (error) {
                             console.error('Error updating invite:', error);
                             // Handle or log the error as needed
                         }
                     });

                    
                 }
               }

               // Update temporary credit schema
               const result3 = await TemporaryManagement.CreditSchema.find({
                   Seller: invoice.Seller,
                   Business: invoice.Business._id,
                   Buyer: invoice.Buyer._id,
                   BuyerBusiness: invoice.BuyerBusiness._id,
                   Request_Status: 'Accept'
               });

               if (result3.length !== 0 && invoice.IfUsedTemporaryCredit) {
                   let ValidityDate = new Date();
                   let TodayDate = new Date();
                   TodayDate.setHours(0, 0, 0, 0);
                   let tempSetAvail = 0;

                   result3.forEach(resultObj => {
                       ValidityDate = new Date(resultObj.updatedAt);
                       ValidityDate.setDate(ValidityDate.getDate() + resultObj.ApprovedPeriod);
                       ValidityDate.setHours(0, 0, 0, 0);
                       tempSetAvail = resultObj.AvailableLimit;
                   });

                   if (ValidityDate >= TodayDate) {
                       tempSetAvail += totalTempInProgressAmount;

                       await TemporaryManagement.CreditSchema.updateOne({
                           Seller: invoice.Seller,
                           Business: invoice.Business._id,
                           Buyer: invoice.Buyer._id,
                           BuyerBusiness: invoice.BuyerBusiness._id,
                           Request_Status: 'Accept'
                       }, {
                           AvailableLimit: tempSetAvail,
                           RepaymentLimit: tempSetAvail
                       });
                   } else {
                       return res.status(200).json({ Status: false, Message: 'Your temporary amount has expired!' });
                   }
               }
               
               // Update Invoice
               let mPaidAmount = invoice.PaidAmount + invoice.InProgressAmount;
               let mInProgressAmount = 0;
               let mPaidTemporaryCreditAmount = 0;
               let mUsedTemporaryCreditAmount = 0;
               let mRemainingUsedCurrentCreditAmount = 0;
               let mPaidCurrentCreditAmount = 0;
               let mUsedCurrentCreditAmount = 0;
               let mTemporaryCreditAmountUsed = invoice.UsedTemporaryCreditAmount;
               let IfUsedPaidTemporaryCredit = true;

               if (invoice.IfUsedTemporaryCredit) {
                   if (invoice.InProgressAmount > invoice.UsedTemporaryCreditAmount) {
                       mUsedTemporaryCreditAmount = 0;
                       IfUsedPaidTemporaryCredit = false;
                       mPaidTemporaryCreditAmount = invoice.UsedTemporaryCreditAmount;
                       mRemainingUsedCurrentCreditAmount = invoice.InProgressAmount - invoice.UsedTemporaryCreditAmount;
                       mPaidTemporaryCreditAmount += invoice.PaidTemporaryCreditAmount;
                   } else {
                       IfUsedPaidTemporaryCredit = true;
                       mPaidTemporaryCreditAmount = invoice.InProgressAmount;
                       mUsedTemporaryCreditAmount = invoice.TemporaryCreditAmount - mPaidTemporaryCreditAmount;
                       mPaidTemporaryCreditAmount += invoice.PaidTemporaryCreditAmount;
                   }

                   if (mRemainingUsedCurrentCreditAmount > invoice.UsedCurrentCreditAmount) {
                       IfUsedPaidTemporaryCredit = false;
                       mUsedCurrentCreditAmount = mRemainingUsedCurrentCreditAmount - invoice.UsedCurrentCreditAmount;
                       mPaidCurrentCreditAmount = invoice.UsedCurrentCreditAmount - mUsedCurrentCreditAmount;
                       mPaidCurrentCreditAmount += invoice.PaidCurrentCreditAmount;
                   } else {
                       IfUsedPaidTemporaryCredit = false;
                       mUsedCurrentCreditAmount = invoice.UsedCurrentCreditAmount - mRemainingUsedCurrentCreditAmount;
                       mPaidCurrentCreditAmount = invoice.UsedCurrentCreditAmount - mUsedCurrentCreditAmount;
                       mPaidCurrentCreditAmount += invoice.PaidCurrentCreditAmount;
                   }
               } else {
                   IfUsedPaidTemporaryCredit = false;
                   mUsedTemporaryCreditAmount = invoice.UsedTemporaryCreditAmount;
                   mPaidTemporaryCreditAmount = invoice.PaidTemporaryCreditAmount;

                   if (invoice.InProgressAmount > invoice.UsedCurrentCreditAmount) {
                       mUsedCurrentCreditAmount = invoice.InProgressAmount - invoice.UsedCurrentCreditAmount;
                       mPaidCurrentCreditAmount = invoice.UsedCurrentCreditAmount - mUsedCurrentCreditAmount;
                       mPaidCurrentCreditAmount += invoice.PaidCurrentCreditAmount;
                   } else {
                       mUsedCurrentCreditAmount = invoice.UsedCurrentCreditAmount - invoice.InProgressAmount;
                       mPaidCurrentCreditAmount = invoice.UsedCurrentCreditAmount - mUsedCurrentCreditAmount;
                       mPaidCurrentCreditAmount += invoice.PaidCurrentCreditAmount;
                   }
               }
              
               // Update Invoice
               await InvoiceManagement.InvoiceSchema.findByIdAndUpdate(invoice._id, {
                   PaidAmount: mPaidAmount,
                   InProgressAmount: mInProgressAmount,
                   UsedCurrentCreditAmount: mUsedCurrentCreditAmount,
                   PaidCurrentCreditAmount: mPaidCurrentCreditAmount,
                   UsedTemporaryCreditAmount: mUsedTemporaryCreditAmount,
                   PaidTemporaryCreditAmount: mPaidTemporaryCreditAmount,
                   PaidORUnpaid: invoice.PaidORUnpaid,
                   IfUsedPaidTemporaryCredit: IfUsedPaidTemporaryCredit
               }, { new: true });

           });
           
           await Promise.all(invoicePromises);
        
           // Update Payment Status
           const paymentUpdateResult = await PaymentManagement.PaymentSchema.updateOne(
               { "_id": ReceivingData.PaymentId },
               {
                   $set: {
                       "Payment_Status": ReceivingData.Payment_Status,
                       "Payment_ApprovedBy": Seller,
                       "IfSellerApprove": true,
                       "IfSellerNotify": true,
                   }
               }
           ).exec();

           if (paymentUpdateResult.err) {
               throw paymentUpdateResult.err;
           }

           // Process notifications and send FCM
           const notificationPromises = InvoiceDetails.map(async (invoice) => {
               const CreateNotification = new NotificationManagement.NotificationSchema({
                   User: null,
                   Business: mongoose.Types.ObjectId(invoice.BuyerBusiness._id),
                   Notification_Type: 'BuyerPaymentAccepted',
                   Message: `Your Payment from ${invoice.Business.FirstName} ${invoice.Business.LastName} is still pending for your acceptance. Please click here to review & accept. Please note if you fail to accept this before tomorrow it will marked as accepted automatically.`,
                   Message_Received: true,
                   Message_Viewed: false,
                   ActiveStatus: true,
                   IfDeleted: false,
               });
               await CreateNotification.save();

               // Send FCM
               const payload = {
                   notification: {
                       title: 'Hundi-Team',
                       body: `Your invoice from ${invoice.Business.FirstName} ${invoice.Business.LastName} is still pending for your acceptance. Please click here to review & accept. Please note if you fail to accept this before tomorrow it will marked as accepted automatically.`,
                       sound: 'notify_tone.mp3'
                   },
                   data: {
                       Customer: invoice.Buyer._id,
                       notification_type: 'BuyerPaymentAccepted',
                       click_action: 'FCM_PLUGIN_ACTIVITY',
                   }
               };
               return FCM_App.messaging().sendToDevice(invoice.Buyer.Firebase_Token, payload, options);
           });
           await Promise.all(notificationPromises);

           res.status(200).send({ Status: true, Message: "Invoice Status Updated Successfully" });
       } else {
           res.status(417).send({ Http_Code: 417, Status: false, Message: "Invalid Customer or Invoice Details!" });
       }
   } catch (error) {
       console.error('Error:', error);
       ErrorHandling.ErrorLogCreation(req, 'Error in updating invoice', 'Invoice.Controller -> updateInvoice', JSON.stringify(error));
       res.status(500).json({ Status: false, Message: 'An error occurred while updating invoice', Error: error });
   }
};






// Accept Payment List for User
exports.PaymentStatusVise_List = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
      res.status(400).send({ Status: false, Message: "BuyerBusiness can not be empty" });
   } else if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
      res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
   } else {
      ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
      ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);

      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var CustomerDetails = Response[0];

         if (CustomerDetails !== null) {
            var Buyer;

            if (CustomerDetails.CustomerType === 'Owner') {
               Buyer = mongoose.Types.ObjectId(CustomerDetails._id);
            } else if (CustomerDetails.CustomerType === 'User') {
               Buyer = mongoose.Types.ObjectId(CustomerDetails.Owner);
            }
            PaymentManagement.PaymentSchema.find({
               Buyer: Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, ActiveStatus: true,
               IfDeleted: false,
            }, {}, {}).exec(function (err, result) {
               if (err) {
                  ErrorHandling.ErrorLogCreation(req, 'PaymentDetails Getting Error', 'PaymentManagement.Controller -> PaymentDetails', JSON.stringify(err));
                  res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Payment!.", Error: err });
               } else {
                  if (result.length !== 0) {
                     res.status(200).send({ Status: true, Message: 'Payment Details', Response: result });
                  } else {
                     res.status(200).send({ Status: true, Message: "Payment Details!", Response: result });
                  }
               }
            });
         } else {
            res.status(400).send({ Status: false, Message: "Invalid Buyer Details!" });
         }
      }).catch(Error => {
         ErrorHandling.ErrorLogCreation(req, 'Finding the Buyer details Getting Error', 'PaymentManagement.Controller -> PaymentStatusVise_List', JSON.stringify(Error));
         res.status(417).send({ Status: false, Message: "Invalid Payment Details!." });
      });
   }
};


// Seller Payment List 
exports.SellerPaymentList = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Business || ReceivingData.Business === '') {
      res.status(400).send({ Status: false, Message: "Business can not be empty" });
   } else if (!ReceivingData.Seller || ReceivingData.Seller === '') {
      res.status(400).send({ Status: false, Message: "Seller can not be empty" });
   } else {
      ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
      ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var CustomerDetails = Response[0];
         if (CustomerDetails !== null) {
            var Seller;

            if (CustomerDetails.CustomerType === 'Owner') {
               Seller = mongoose.Types.ObjectId(CustomerDetails._id);
            } else if (CustomerDetails.CustomerType === 'User') {
               Seller = mongoose.Types.ObjectId(CustomerDetails.Owner);
            }
            PaymentManagement.PaymentSchema.find({
               Seller: Seller,
               Business: ReceivingData.Business,
               ActiveStatus: true,
               IfDeleted: false,
            }, {}, {}).
               populate({ path: "BuyerBusiness", select: ['FirstName','LastName', "BusinessCreditLimit", "AvailableCreditLimit"] }).
               populate({ path: "Buyer", select: ["ContactName", "Mobile", "Email", "CustomerCategory"] }).
               populate({ path: "Seller", select: ["ContactName", "Mobile", "Email", "CustomerCategory"] }).
               populate({ path: "InvoiceDetails.InvoiceId", select: ["InvoiceStatus", "InvoiceDate", "RemainingAmount"] }).exec(function (err, result) {
                  if (err) {
                     ErrorHandling.ErrorLogCreation(req, 'PaymentDetails Getting Error', 'PaymentManagement.Controller -> PaymentDetails', JSON.stringify(err));
                     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Payment!.", Error: err });
                  } else {
                     if (result.length !== 0) {
                        result = JSON.parse(JSON.stringify(result));
                        result = result.map(Obj => {
                           var InvoiceArr = [];
                           Obj.InvoiceDetails.map(ObjB => {
                              ObjB.InvoiceId.InvoiceDate = moment(new Date(ObjB.InvoiceId.InvoiceDate)).format("YYYY-MM-DD");
                              if (ObjB.InvoiceId.InvoiceStatus === 'Accept') {
                                 if (ObjB.InvoiceId.RemainingAmount > 0) {
                                    ObjB.WaitForPayment = true;
                                 } else {
                                    ObjB.WaitForPayment = false;
                                 }
                                 InvoiceArr.push(ObjB);
                                 return ObjB;
                              }
                           });
                           delete Obj.InvoiceDetails;
                           Obj.InvoiceDetail = InvoiceArr;
                           Obj.PaymentDate = moment(new Date(Obj.PaymentDate)).format("YYYY-MM-DD");
                           return Obj;
                        });
                        res.status(200).send({ Status: true, Message: 'Payment Details', Response: result });
                     } else {
                        res.status(400).send({ Status: true, Message: "Payment Details!", Response: result });
                     }
                  }
               });
         } else {
            res.status(417).send({ Status: false, Message: "Invalid Seller Details!." });
         }
      }).catch(Error => {
         ErrorHandling.ErrorLogCreation(req, 'Finding the Seller details Getting Error', 'PaymentManagement.Controller -> SellerPaymentList', JSON.stringify(Error));
         res.status(417).send({ Status: false, Message: "Some Occurred Error!." });
      });
   }
};

// BuyerPaymentList
exports.BuyerPaymentList = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Business || ReceivingData.Business === '') {
      res.status(400).send({ Status: false, Message: "Business can not be empty" });
   } else if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
      res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
   } else {
      ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
      ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var CustomerDetails = Response[0];

         if (CustomerDetails !== null) {
            var Buyer;

            if (CustomerDetails.CustomerType === 'Owner') {
               Buyer = mongoose.Types.ObjectId(CustomerDetails._id);
            } else if (CustomerDetails.CustomerType === 'User') {
               Buyer = mongoose.Types.ObjectId(CustomerDetails.Owner);
            }
            PaymentManagement.PaymentSchema.find({
               Buyer: Buyer,
               BuyerBusiness: ReceivingData.Business,
               ActiveStatus: true,
               IfDeleted: false,
            }, {}, {}).
               populate({ path: "BuyerBusiness", select:['FirstName','LastName', "BusinessCreditLimit", "AvailableCreditLimit"] }).
               populate({ path: "Buyer", select: ["ContactName", "Mobile", "Email", "CustomerCategory"] }).
               populate({ path: "Seller", select: ["ContactName", "Mobile", "Email", "CustomerCategory"] }).
               populate({ path: "InvoiceDetails.InvoiceId", select: ["InvoiceStatus", "InvoiceDate", "RemainingAmount"] }).exec(function (err, result) {
                  if (err) {
                     ErrorHandling.ErrorLogCreation(req, 'PaymentDetails Getting Error', 'PaymentManagement.Controller -> PaymentDetails', JSON.stringify(err));
                     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Payment!.", Error: err });
                  } else {
                     if (result.length !== 0) {
                        result = JSON.parse(JSON.stringify(result));
                        result = result.map(Obj => {
                           var InvoiceArr = [];
                           Obj.InvoiceDetails.map(ObjB => {
                              ObjB.InvoiceId.InvoiceDate = moment(new Date(ObjB.InvoiceId.InvoiceDate)).format("YYYY-MM-DD");
                              if (ObjB.InvoiceId.InvoiceStatus === 'Accept') {
                                 if (ObjB.InvoiceId.RemainingAmount > 0) {
                                    ObjB.WaitForPayment = true;
                                 } else {
                                    ObjB.WaitForPayment = false;
                                 }
                                 InvoiceArr.push(ObjB);
                                 return ObjB;
                              }
                           });
                           delete Obj.InvoiceDetails;
                           Obj.InvoiceDetail = InvoiceArr;
                           Obj.PaymentDate = moment(new Date(Obj.PaymentDate)).format("YYYY-MM-DD");
                           return Obj;
                        });
                        res.status(200).send({ Status: true, Message: 'Payment Details', Response: result });
                     } else {
                        res.status(400).send({ Status: true, Message: "Payment Details!", Response: result });
                     }
                  }
               });
         } else {
            res.status(417).send({ Status: false, Message: "Invalid Buyer Details!." });
         }
      }).catch(Error => {
         ErrorHandling.ErrorLogCreation(req, 'Finding the Buyer details Getting Error', 'PaymentManagement.Controller -> BuyerPaymentList', JSON.stringify(Error));
         res.status(417).send({ Status: false, Message: "Some Occurred Error!." });
      });
   }
};


exports.SellerPayment_DisputeList = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
      res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
   } else if (!ReceivingData.Business || ReceivingData.Business === '') {
      res.status(400).send({ Status: false, Message: "Business can not be empty" });
   } else if (!ReceivingData.Seller || ReceivingData.Seller === '') {
      res.status(400).send({ Status: false, Message: "Business can not be empty" });
   } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
      res.status(400).send({ Status: false, Message: "Business can not be empty" });
   } else {

      ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
      ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
      ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
      ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var CustomerDetails = Response[0];

         if (CustomerDetails !== null) {
            var Buyer;

            if (CustomerDetails.CustomerType === 'Owner') {
               Buyer = mongoose.Types.ObjectId(CustomerDetails._id);
            } else if (CustomerDetails.CustomerType === 'User') {
               Buyer = mongoose.Types.ObjectId(CustomerDetails.Owner);
            }

         } else {

         }

      }).catch(Error => {

      })
      PaymentManagement.PaymentSchema.find({
         Buyer: ReceivingData.Buyer,
         Seller: ReceivingData.Seller,
         BuyerBusiness: ReceivingData.BuyerBusiness,
         Business: ReceivingData.Business,
         Payment_Status: 'Disputed', ActiveStatus: true
      }, {}, {})
         .populate({ path: 'Business', select:  ['FirstName','LastName', 'BusinessCreditLimit', 'AvailableCreditLimit'] })
         .populate({ path: 'BuyerBusiness', select: ['FirstName','LastName', 'BusinessCreditLimit', 'AvailableCreditLimit'] })
         .populate({ path: 'Buyer', select: ['ContactName'] }).exec((err, result) => {
            if (err) {
               ErrorHandling.ErrorLogCreation(req, 'Payment List Getting Error', 'PaymentManagement.Controller -> BuyerPayment_AcceptList', JSON.stringify(err));
               res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Invoice!.", Error: err });
            } else {
               res.status(200).send({ Status: true, Response: result, Message: 'Seller Disputed Invoice List' });
            }
         });
   }
};

// Buyer Payment Disputed
exports.BuyerPayment_Disputed = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "CustomerId can not be empty" });
   } else if (!ReceivingData.PaymentId || ReceivingData.PaymentId === '') {
      res.status(400).send({ Status: false, Message: "PaymentId can not be empty" });
   } else if (!ReceivingData.Payment_Status || ReceivingData.Payment_Status === '') {
      res.status(400).send({ Status: false, Message: "Payment Status can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      ReceivingData.PaymentId = mongoose.Types.ObjectId(ReceivingData.PaymentId);
      PaymentManagement.PaymentSchema.findOne({ "_id": ReceivingData.PaymentId }, {}, {}).exec((err_Res, result_Res) => {
         if (err_Res) {
            res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Delivery Person Details!.", Error: err_Res });
         } else {
            if (result_Res !== null) {
               var InvoiceArr = [];
               Invoice = [];
               result_Res.InvoiceDetails.map(Obj => {
                  InvoiceArr.push(mongoose.Types.ObjectId(Obj.InvoiceId));


                  Invoice.push({
                     'InvoiceId': mongoose.Types.ObjectId(Obj.InvoiceId),
                     'PaidORUnpaid': Obj.PaidORUnpaid,
                     'InvoiceNumber': Obj.InvoiceNumber,
                     'IfUsedTemporaryCredit': Obj.IfUsedTemporaryCredit,
                     'IfUsedPaidTemporaryCredit':Obj.IfUsedPaidTemporaryCredit,
                     'InvoiceAmount': Obj.InvoiceAmount,
                     'InvoiceDate': Obj.InvoiceDate,
                     'InProgressAmount': Obj.RemainingAmount,
                     'RemainingAmount': Obj.InProgressAmount,
                     'CurrentCreditAmount': Obj.CurrentCreditAmount,
                     'UsedCurrentCreditAmount': Obj.UsedCurrentCreditAmount,
                     'PaidCurrentCreditAmount': Obj.PaidCurrentCreditAmount,
                     'TemporaryCreditAmount': Obj.TemporaryCreditAmount,
                     'UsedTemporaryCreditAmount': Obj.UsedTemporaryCreditAmount,
                     'PaidTemporaryCreditAmount': Obj.PaidTemporaryCreditAmount
                  });

                  PaymentManagement.PaymentSchema.updateOne(

                     { "_id": ReceivingData.PaymentId },
                     {
                        $set: {
                           InvoiceDetails: Invoice,
                           
                        }
                     }
                  ).exec();
               });
               Promise.all([
                  InvoiceManagement.InvoiceSchema.find({ "_id": { $in: InvoiceArr } }, {}, {}).
                     populate({ path: 'Buyer', select: ['ContactName', 'Firebase_Token'] }).populate({ path: 'Buyer', select: ["ContactName", "Firebase_Token"] }).
                     populate({ path: 'Business', select: ['FirstName','LastName'] }).populate({ path: 'BuyerBusiness', select: ['FirstName','LastName'] }).exec(),
                  CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
               ]).then(Response => {
                  var InvoiceDetails = JSON.parse(JSON.stringify(Response[0]));
                  var CustomerDetails = JSON.parse(JSON.stringify(Response[1]));
                  if (CustomerDetails !== null && InvoiceDetails.length !== 0) {
                     PaymentManagement.PaymentSchema.updateOne(
                        { "_id": ReceivingData.PaymentId },
                        {
                           $set: {
                              "Payment_Status": ReceivingData.Payment_Status,
                              "Payment_ApprovedBy": ReceivingData.CustomerId,
                              "Remarks": ReceivingData.Remarks,
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
                                    body: 'Seller Business Name : ' + Obj.Business.FirstName +''+ Obj.Business.LastName + ' disputed your payment on invoice ' + ' Invoice Number: ' + Obj.InvoiceNumber + ' Payment Amount: ' + result_Res.PaymentAmount + '. Click here to review the same ',
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
                                    body: 'Seller Business Name : ' + Obj.Business.FirstName +''+ Obj.Business.LastName + ' disputed your payment on invoice ' + ' Invoice Number: ' + Obj.InvoiceNumber + ' Payment Amount: ' + result_Res.PaymentAmount + '. Click here to review the same. Please note today is the due date on invoice Invoice ID:' + Obj.InvoiceNumber + '  If you fail to review and complete this today, that invoice will show up as overdue',
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
                                 Business: Obj.BuyerBusiness._id,
                                 Notification_Type: 'BuyerPaymentDisputed',
                                 Message: 'Seller Business Name : ' + Obj.Business.FirstName +''+ Obj.Business.LastName + ' disputed your payment on invoice ' + ' Invoice Number: ' + Obj.InvoiceNumber + ' Payment Amount: ' + result_Res.PaymentAmount + '. Click here to review the same ',
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
                     PaymentManagement.PaymentSchema.find({ Seller: ReceivingData.Seller, Payment_Status: "Pending" }, {}, {}).exec(),
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
                           // const BranchDetailsArr = BranchDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                           // if (BranchDetailsArr.length > 0) {
                           //    Obj.Branches = BranchDetailsArr;
                           //    Obj.Branches = JSON.parse(JSON.stringify(Obj.Branches));
                           //    Obj.Branches.map(ObjB => {
                           //       ObjB.ExtraUnitizedCreditLimit = 0;
                           //       ObjB.CreditBalanceExists = false;
                           //       ObjB.UserDetails = [];
                           //       ObjB.TotalPaymentAmount = 0;
                           //       const InvoiceDetailsBranchArr = InvoicePendingDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Branch)) === JSON.parse(JSON.stringify(ObjB._id)));
                           //       const InvoiceAcceptDetailsBranchArr = PendingPaymentDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Branch)) === JSON.parse(JSON.stringify(ObjB._id)));
                           //       ObjB.InvoiceCount = InvoiceDetailsBranchArr.length;
                           //       ObjB.PaymentCount = InvoiceAcceptDetailsBranchArr.length;
                           //       const InvoiceDetailsBranchArray = InvoiceDetails.filter(obj1 => obj1.Branch === ObjB._id);
                           //       if (InvoiceDetailsBranchArray.length > 0) {
                           //          var InvoiceAmount = 0;
                           //          InvoiceDetailsBranchArray.map(obj => {
                           //             InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.AvailableAmount);
                           //          });

                           //          if (InvoiceAmount > 0) {
                           //             ObjB.TotalPaymentAmount = InvoiceAmount.toFixed(2);
                           //             ObjB.TotalPaymentAmount = parseFloat(ObjB.TotalPaymentAmount);

                           //             ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit) - parseFloat(InvoiceAmount);
                           //             if (ObjB.AvailableCreditLimit > 0) {
                           //                ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                           //             } else {
                           //                ObjB.ExtraUnitizedCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                           //                ObjB.ExtraUnitizedCreditLimit = ObjB.ExtraUnitizedCreditLimit.toFixed(2);
                           //                ObjB.ExtraUnitizedCreditLimit = parseFloat(ObjB.ExtraUnitizedCreditLimit);
                           //                ObjB.CreditBalanceExists = true;
                           //                ObjB.AvailableCreditLimit = 0;
                           //             }
                           //             ObjB.AvailableCreditLimit = ObjB.AvailableCreditLimit.toFixed(2);
                           //             ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                           //          }
                           //       }
                           //       return ObjB;
                           //    });
                           // } else {
                           //    Obj.Branches = [];
                           // }
                           // const BranchDetailsArrArr = BranchDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                           // var BranchCreditLimit = 0;
                           // if (BranchDetailsArrArr.length > 0) {
                           //    BranchDetailsArrArr.map(obj => {
                           //       BranchCreditLimit = parseFloat(BranchCreditLimit) + parseFloat(obj.AvailableCreditLimit);
                           //    });
                           //    if (BranchCreditLimit > 0) {
                           //       Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) - parseFloat(BranchCreditLimit);
                           //       if (Obj.AvailableCreditLimit > 0) {
                           //          Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                           //       } else {
                           //          Obj.AvailableCreditLimit = 0;
                           //       }
                           //       Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                           //       Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                           //    }
                           // }
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
                        // Obj.Branches.map(obj => {
                        //    BuyerBranchArray.push(mongoose.Types.ObjectId(obj));
                        // });
                     });
                  }

                  Promise.all([
                     BusinessAndBranchManagement.BusinessSchema.find({ _id: { $in: BuyerBusinessArray }, IfSeller: true, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     // BusinessAndBranchManagement.BranchSchema.find({ _id: { $in: BuyerBranchArray }, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     InvoiceManagement.InvoiceSchema.find({ Business: { $in: BuyerBusinessArray }, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     InvoiceManagement.InvoiceSchema.find({ Business: { $in: BuyerBusinessArray }, ActiveStatus: true, InvoiceStatus: 'Pending', IfDeleted: false }, {}, {}).exec(),
                     PaymentManagement.PaymentSchema.find({ Business: { $in: BuyerBranchArray }, Payment_Status: "Pending" }, {}, {}).exec(),
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
                           // const BranchDetailsArr = BranchDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                           // if (BranchDetailsArr.length > 0) {
                           //    Obj.Branches = BranchDetailsArr;
                           //    Obj.Branches = JSON.parse(JSON.stringify(Obj.Branches));
                           //    Obj.Branches.map(ObjB => {
                           //       ObjB.ExtraUnitizedCreditLimit = 0;
                           //       ObjB.CreditBalanceExists = false;
                           //       ObjB.UserDetails = [];
                           //       ObjB.TotalPaymentAmount = 0;
                           //       const InvoiceDetailsBranchArr = InvoicePendingDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Branch)) === JSON.parse(JSON.stringify(ObjB._id)));
                           //       const InvoiceAcceptDetailsBranchArr = PendingPaymentDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Branch)) === JSON.parse(JSON.stringify(ObjB._id)));
                           //       ObjB.InvoiceCount = InvoiceDetailsBranchArr.length;
                           //       ObjB.PaymentCount = InvoiceAcceptDetailsBranchArr.length;
                           //       const InvoiceDetailsBranchArray = InvoiceDetails.filter(obj1 => obj1.Branch === ObjB._id);
                           //       if (InvoiceDetailsBranchArray.length > 0) {
                           //          var InvoiceAmount = 0;
                           //          InvoiceDetailsBranchArray.map(obj => {
                           //             InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.AvailableAmount);
                           //          });
                           //          if (InvoiceAmount > 0) {
                           //             ObjB.TotalPaymentAmount = InvoiceAmount.toFixed(2);
                           //             ObjB.TotalPaymentAmount = parseFloat(ObjB.TotalPaymentAmount);
                           //             ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit) - parseFloat(InvoiceAmount);
                           //             if (ObjB.AvailableCreditLimit > 0) {
                           //                ObjB.AvailableCreditLimit = Math.abs(ObjB.AvailableCreditLimit);
                           //             } else {
                           //                ObjB.ExtraUnitizedCreditLimit = -Math.abs(ObjB.ExtraUnitizedCreditLimit);
                           //                ObjB.ExtraUnitizedCreditLimit = ObjB.ExtraUnitizedCreditLimit.toFixed(2);
                           //                ObjB.ExtraUnitizedCreditLimit = parseFloat(ObjB.ExtraUnitizedCreditLimit);
                           //                ObjB.CreditBalanceExists = true;
                           //                ObjB.AvailableCreditLimit = 0;
                           //             }
                           //             ObjB.AvailableCreditLimit = ObjB.AvailableCreditLimit.toFixed(2);
                           //             ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                           //          }
                           //       }
                           //       return ObjB;
                           //    });
                           // } else {
                           //    Obj.Branches = [];
                           // }
                           // const BranchDetailsArrArr = BranchDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                           // var BranchCreditLimit = 0;
                           // if (BranchDetailsArrArr.length > 0) {
                           //    BranchDetailsArrArr.map(obj => {
                           //       BranchCreditLimit = parseFloat(BranchCreditLimit) + parseFloat(obj.AvailableCreditLimit);
                           //    });
                           //    if (BranchCreditLimit > 0) {
                           //       Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) - parseFloat(BranchCreditLimit);
                           //       if (Obj.AvailableCreditLimit > 0) {
                           //          Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                           //       } else {
                           //          Obj.AvailableCreditLimit = 0;
                           //       }
                           //       Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                           //       Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                           //    }
                           // }
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
                     // BusinessAndBranchManagement.BranchSchema.find({ Customer: ReceivingData.Buyer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     InviteManagement.InviteManagementSchema.find({ Buyer: ReceivingData.Buyer, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     TemporaryManagement.CreditSchema.find({ Buyer: ReceivingData.Buyer, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     InvoiceManagement.InvoiceSchema.find({ Buyer: ReceivingData.Buyer, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     InvoiceManagement.InvoiceSchema.find({ Buyer: ReceivingData.Buyer, ActiveStatus: true, InvoiceStatus: 'Pending', IfDeleted: false }, {}, {}).exec(),
                     PaymentManagement.PaymentSchema.find({ Buyer: ReceivingData.Buyer, Payment_Status: "Pending" }, {}, {}).exec(),
                     InvoiceManagement.InvoiceSchema.find({ Buyer: ReceivingData.Buyer, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                  ]).then(ResponseOU => {
                     var BusinessDetails = JSON.parse(JSON.stringify(ResponseOU[0]));
                     // var BranchDetails = JSON.parse(JSON.stringify(ResponseOU[1]));
                     var InviteDetails = JSON.parse(JSON.stringify(ResponseOU[1]));
                     var TemporaryDetails = JSON.parse(JSON.stringify(ResponseOU[2]));
                     var InvoiceDetails = JSON.parse(JSON.stringify(ResponseOU[3]));
                     var InvoicePendingDetails = JSON.parse(JSON.stringify(ResponseOU[4]));
                     var PendingPaymentDetails = JSON.parse(JSON.stringify(ResponseOU[5]));
                     var InvoiceAcceptList = JSON.parse(JSON.stringify(ResponseOU[6]));
                     if (BusinessDetails.length > 0) {
                        BusinessDetails.map(Obj => {
                           Obj.ExtraUnitizedCreditLimit = 0;
                           Obj.CreditBalanceExists = false;
                           // const BranchDetailsArr = BranchDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                           // if (BranchDetailsArr.length > 0) {
                           //    Obj.Branches = BranchDetailsArr;
                           //    Obj.Branches = JSON.parse(JSON.stringify(Obj.Branches));
                           //    Obj.Branches.map(ObjB => {
                           //       ObjB.ExtraUnitizedCreditLimit = 0;
                           //       ObjB.CreditBalanceExists = false;
                           //       ObjB.UserDetails = [];
                           //       ObjB.TotalPaymentAmount = 0;
                           //       const InvoiceDetailsBranchArr = InvoicePendingDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.BuyerBranch)) === JSON.parse(JSON.stringify(ObjB._id)));
                           //       const InvoiceAcceptDetailsBranchArr = InvoiceAcceptList.filter(obj1 => JSON.parse(JSON.stringify(obj1.BuyerBranch)) === JSON.parse(JSON.stringify(ObjB._id)));

                           //       ObjB.InvoiceCount = InvoiceDetailsBranchArr.length;
                           //       ObjB.PaymentCount = InvoiceAcceptDetailsBranchArr.length;
                           //       const TemporaryDetailsBranchArr = TemporaryDetails.filter(obj1 => obj1.BuyerBranch === ObjB._id);
                           //       if (TemporaryDetailsBranchArr.length > 0) {
                           //          var BranchValidityDate = new Date();
                           //          var BranchTodayDate = new Date();
                           //          TemporaryDetailsBranchArr.map(obj => {
                           //             BranchValidityDate = new Date(obj.updatedAt);
                           //             BranchValidityDate = new Date(BranchValidityDate.setDate(BranchValidityDate.getDate() + obj.ApprovedPeriod));
                           //             if (BranchValidityDate.valueOf() >= BranchTodayDate.valueOf()) {
                           //                ObjB.BranchCreditLimit = parseFloat(ObjB.BranchCreditLimit) + parseFloat(obj.ApproveLimit);
                           //                ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit) + parseFloat(obj.ApproveLimit);
                           //             }
                           //          });
                           //       }

                           //       const InviteDetailsBranchArr = InviteDetails.filter(obj1 => obj1.BuyerBranch === ObjB._id);
                           //       if (InviteDetailsBranchArr.length > 0) {
                           //          var BranchValidityInviteDate = new Date();
                           //          var BranchTodayInviteDate = new Date();
                           //          InviteDetailsBranchArr.map(obj => {
                           //             ObjB.BranchCreditLimit = parseFloat(ObjB.BranchCreditLimit) + parseFloat(obj.AvailableLimit);
                           //             ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit) + parseFloat(obj.AvailableLimit);
                           //          });
                           //       }

                           //       const InvoiceDetailsBranchArray = InvoiceDetails.filter(obj1 => obj1.BuyerBranch === ObjB._id);
                           //       if (InvoiceDetailsBranchArray.length > 0) {
                           //          var BranchInvoiceAmount = 0;
                           //          InvoiceDetailsBranchArray.map(obj => {
                           //             BranchInvoiceAmount = parseFloat(BranchInvoiceAmount) + parseFloat(obj.AvailableAmount);
                           //          });

                           //          if (BranchInvoiceAmount > 0) {
                           //             ObjB.TotalPaymentAmount = BranchInvoiceAmount.toFixed(2);
                           //             ObjB.TotalPaymentAmount = parseFloat(ObjB.TotalPaymentAmount);
                           //             ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit) - parseFloat(BranchInvoiceAmount);
                           //             if (ObjB.AvailableCreditLimit > 0) {
                           //                ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                           //             } else {
                           //                ObjB.ExtraUnitizedCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                           //                ObjB.ExtraUnitizedCreditLimit = ObjB.ExtraUnitizedCreditLimit.toFixed(2);
                           //                ObjB.ExtraUnitizedCreditLimit = parseFloat(ObjB.ExtraUnitizedCreditLimit);
                           //                ObjB.CreditBalanceExists = true;
                           //                ObjB.AvailableCreditLimit = 0;
                           //             }
                           //             ObjB.AvailableCreditLimit = ObjB.AvailableCreditLimit.toFixed(2);
                           //             ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                           //          }
                           //       }
                           //       return ObjB;
                           //    });
                           // } else {
                           //    Obj.Branches = [];
                           // }

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
                        // Obj.Branches.map(obj => {
                        //    BuyerBranchArray.push(mongoose.Types.ObjectId(obj));
                        // });
                     });
                  }

                  Promise.all([
                     BusinessAndBranchManagement.BusinessSchema.find({ _id: { $in: BuyerBusinessArray }, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     // BusinessAndBranchManagement.BranchSchema.find({ _id: { $in: BuyerBusinessArray }, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     InviteManagement.InviteManagementSchema.find({ BuyerBusiness: { $in: BuyerBusinessArray }, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     TemporaryManagement.CreditSchema.find({ BuyerBusiness: { $in: BuyerBusinessArray }, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     InvoiceManagement.InvoiceSchema.find({ BuyerBusiness: { $in: BuyerBusinessArray }, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     InvoiceManagement.InvoiceSchema.find({ BuyerBusiness: { $in: BuyerBusinessArray }, ActiveStatus: true, InvoiceStatus: 'Pending', IfDeleted: false }, {}, {}).exec(),
                     PaymentManagement.PaymentSchema.find({ BuyerBusiness: { $in: BuyerBusinessArray }, Payment_Status: "Pending" }, {}, {}).exec(),
                     InvoiceManagement.InvoiceSchema.find({ BuyerBusiness: { $in: BuyerBusinessArray }, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                  ]).then(ResponseOU => {
                     var BusinessDetails = JSON.parse(JSON.stringify(ResponseOU[0]));
                     // var BranchDetails = JSON.parse(JSON.stringify(ResponseOU[1]));
                     var InviteDetails = JSON.parse(JSON.stringify(ResponseOU[1]));
                     var TemporaryDetails = JSON.parse(JSON.stringify(ResponseOU[2]));
                     var InvoiceDetails = JSON.parse(JSON.stringify(ResponseOU[3]));
                     var InvoicePendingDetails = JSON.parse(JSON.stringify(ResponseOU[4]));
                     var PendingPaymentDetails = JSON.parse(JSON.stringify(ResponseOU[5]));
                     var InvoiceAcceptList = JSON.parse(JSON.stringify(ResponseOU[6]));
                     if (BusinessDetails.length > 0) {
                        BusinessDetails.map(Obj => {
                           Obj.ExtraUnitizedCreditLimit = 0;
                           Obj.CreditBalanceExists = false;
                           // const BranchDetailsArr = BranchDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                           // if (BranchDetailsArr.length > 0) {
                           //    Obj.Branches = BranchDetailsArr;
                           //    Obj.Branches = JSON.parse(JSON.stringify(Obj.Branches));
                           //    Obj.Branches.map(ObjB => {
                           //       ObjB.ExtraUnitizedCreditLimit = 0;
                           //       ObjB.CreditBalanceExists = false;
                           //       ObjB.UserDetails = [];
                           //       ObjB.TotalPaymentAmount = 0;
                           //       const InvoiceDetailsBranchArr = InvoicePendingDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.BuyerBranch)) === JSON.parse(JSON.stringify(ObjB._id)));
                           //       const InvoiceAcceptBranchArr = InvoiceAcceptList.filter(obj1 => JSON.parse(JSON.stringify(obj1.BuyerBranch)) === JSON.parse(JSON.stringify(ObjB._id)));
                           //       ObjB.InvoiceCount = InvoiceDetailsBranchArr.length;
                           //       ObjB.PaymentCount = InvoiceAcceptBranchArr.length;
                           //       const TemporaryDetailsBranchArr = TemporaryDetails.filter(obj1 => obj1.BuyerBranch === ObjB._id);
                           //       if (TemporaryDetailsBranchArr.length > 0) {
                           //          var BranchValidityDate = new Date();
                           //          var BranchTodayDate = new Date();
                           //          TemporaryDetailsBranchArr.map(obj => {
                           //             BranchValidityDate = new Date(obj.updatedAt);
                           //             BranchValidityDate = new Date(BranchValidityDate.setDate(BranchValidityDate.getDate() + obj.ApprovedPeriod));
                           //             if (BranchValidityDate.valueOf() >= BranchTodayDate.valueOf()) {
                           //                ObjB.BranchCreditLimit = parseFloat(ObjB.BranchCreditLimit) + parseFloat(obj.ApproveLimit);
                           //                ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit) + parseFloat(obj.ApproveLimit);
                           //             }
                           //          });
                           //       }

                           //       const InviteDetailsBranchArr = InviteDetails.filter(obj1 => obj1.BuyerBranch === ObjB._id);
                           //       if (InviteDetailsBranchArr.length > 0) {
                           //          var BranchValidityInviteDate = new Date();
                           //          var BranchTodayInviteDate = new Date();
                           //          InviteDetailsBranchArr.map(obj => {
                           //             //   BranchValidityInviteDate = new Date(obj.updatedAt);
                           //             //   BranchValidityInviteDate = new Date(BranchValidityInviteDate.setDate(BranchValidityInviteDate.getDate() + obj.BuyerPaymentCycle));
                           //             // if (BranchValidityInviteDate.valueOf() >= BranchTodayInviteDate.valueOf()) {
                           //             ObjB.BranchCreditLimit = parseFloat(ObjB.BranchCreditLimit) + parseFloat(obj.AvailableLimit);
                           //             ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit) + parseFloat(obj.AvailableLimit);
                           //             //  }
                           //          });
                           //       }

                           //       const InvoiceDetailsBranchArray = InvoiceDetails.filter(obj1 => obj1.BuyerBranch === ObjB._id);
                           //       if (InvoiceDetailsBranchArray.length > 0) {
                           //          var BranchInvoiceAmount = 0;
                           //          InvoiceDetailsBranchArray.map(obj => {
                           //             BranchInvoiceAmount = parseFloat(BranchInvoiceAmount) + parseFloat(obj.AvailableAmount);
                           //          });

                           //          if (BranchInvoiceAmount > 0) {
                           //             ObjB.TotalPaymentAmount = BranchInvoiceAmount.toFixed(2);
                           //             ObjB.TotalPaymentAmount = parseFloat(ObjB.TotalPaymentAmount);
                           //             ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit) - parseFloat(BranchInvoiceAmount);
                           //             if (ObjB.AvailableCreditLimit > 0) {
                           //                ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                           //             } else {
                           //                ObjB.ExtraUnitizedCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                           //                ObjB.ExtraUnitizedCreditLimit = ObjB.ExtraUnitizedCreditLimit.toFixed(2);
                           //                ObjB.ExtraUnitizedCreditLimit = parseFloat(ObjB.ExtraUnitizedCreditLimit);
                           //                ObjB.CreditBalanceExists = true;
                           //                ObjB.AvailableCreditLimit = 0;
                           //             }
                           //             ObjB.AvailableCreditLimit = ObjB.AvailableCreditLimit.toFixed(2);
                           //             ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                           //          }
                           //       }
                           //       return ObjB;
                           //    });
                           // } else {
                           //    Obj.Branches = [];
                           // }

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


// Seller or Owner Update the Buyer's Payment Request    
exports.Web_BuyerPayment_Approve = function (req, res) {
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
      PaymentManagement.PaymentSchema.findOne({ "_id": { $in: PaymentArray } }, {}, {}).exec((err_Res, result_Res) => {
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
                     populate({ path: 'Business', select: ['FirstName','LastName'] }).populate({ path: 'BuyerBusiness', select: ['FirstName','LastName']}).exec(),
                     // populate({ path: 'BuyerBranch', select: 'BranchName' }).populate({ path: 'Branch', select: 'BranchName' }).exec(),
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
                     if (InvoiceDetails != null) {
                        
                        InvoiceDetails.forEach(element => {

                           
                           // var BuyBusinessCreditLimit = 0;
                           var BuyAvailableCreditLimit = 0;
                   
                           // BuyBusinessCreditLimit = element.BuyerBusiness.BusinessCreditLimit - element.InProgressAmount;
                           BuyAvailableCreditLimit = element.BuyerBusiness.AvailableCreditLimit - element.InProgressAmount;

                           BusinessAndBranchManagement.BusinessSchema.updateOne(
                              { _id: element.BuyerBusiness },
                              {
                                $set: {
                    
                                 //  BusinessCreditLimit: BuyBusinessCreditLimit,
                                  AvailableCreditLimit: BuyAvailableCreditLimit
                                }
                              }
                            ).exec();

                              // var SelBusinessCreditLimit = 0;
                           var SelAvailableCreditLimit = 0;

                           //  SelBusinessCreditLimit = element.Business.BusinessCreditLimit + element.InProgressAmount;
                            SelAvailableCreditLimit = element.Business.AvailableCreditLimit + element.InProgressAmount;

                            BusinessAndBranchManagement.BusinessSchema.updateOne(
                               { _id: element.Business },
                               {
                                 $set: {
                     
                                 //   BusinessCreditLimit: SelBusinessCreditLimit,
                                   AvailableCreditLimit: SelAvailableCreditLimit
                                 }
                               }
                             ).exec();


                        });
                        
                     
                     }
                     PaymentManagement.PaymentSchema.updateOne(
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
                                 Message: 'Your Payment from ' + Obj.Business.FirstName +' '+Obj.Business.LastName + ' is still pending for your acceptance. Please click here to review & accept. Please note if you fail to accept this before tomorrow it will marked as accepted automatically.',
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
                                    body: 'Your invoice from ' + Obj.Business.FirstName +' '+Obj.Business.LastName + ' is still pending for your acceptance. Please click here to review & accept. Please note if you fail to accept this before tomorrow it will marked as accepted automatically.',
                                    sound: 'notify_tone.mp3'
                                 },
                                 data: {
                                    Customer: Obj.Buyer._id,
                                    notification_type: 'BuyerPaymentAccepted',
                                    click_action: 'FCM_PLUGIN_ACTIVITY',
                                 }
                              };
                              var SmsMessage = 'Your invoice from ' + Obj.Business.FirstName +' '+Obj.Business.LastName + ' is still pending for your acceptance. Please click here to review & accept. Please note if you fail to accept this before tomorrow it will marked as accepted automatically.';
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
                           res.status(200).send({ Status: true, Message: "Payment Status Approved SuccessFully", });

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



// Buyer Payment Disputed
exports.Web_BuyerPayment_Disputed = function (req, res) {
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
      PaymentManagement.PaymentSchema.findOne({ "_id": { $in: PaymentArray } }, {}, {}).exec((err_Res, result_Res) => {
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
                     populate({ path: 'Business', select: ['FirstName','LastName']}).populate({ path: 'BuyerBusiness', select: ['FirstName','LastName'] }).exec(),
                  CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
               ]).then(Response => {
                  var InvoiceDetails = JSON.parse(JSON.stringify(Response[0]));
                  var CustomerDetails = JSON.parse(JSON.stringify(Response[1]));
                  if (CustomerDetails !== null && InvoiceDetails.length !== 0) {
                     PaymentManagement.PaymentSchema.updateOne(
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
                                    body: 'Seller Business Name : ' + Obj.Business.FirstName + ' ' + Obj.Business.LastName  + ' disputed your payment on invoice ' + ' Invoice Number: ' + Obj.InvoiceNumber + ' Payment Amount: ' + result_Res.PaymentAmount + '. Click here to review the same ',
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
                                    body: 'Seller Business Name : ' + Obj.Business.FirstName + ' ' + Obj.Business.LastName + ' disputed your payment on invoice ' + ' Invoice Number: ' + Obj.InvoiceNumber + ' Payment Amount: ' + result_Res.PaymentAmount + '. Click here to review the same. Please note today is the due date on invoice Invoice ID:' + Obj.InvoiceNumber + '  If you fail to review and complete this today, that invoice will show up as overdue',
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
                                 Message: 'Seller Business Name : ' + Obj.Business.FirstName + ' ' + Obj.Business.LastName + ' disputed your payment on invoice ' + ' Invoice Number: ' + Obj.InvoiceNumber + ' Payment Amount: ' + result_Res.PaymentAmount + '. Click here to review the same ',
                                 Message_Received: true,
                                 Message_Viewed: false,
                                 ActiveStatus: true,
                                 IfDeleted: false,
                              });
                              CreateNotification.save();
                           });
                           res.status(200).send({ Status: true, Message: "Payment Disputed SuccessFully", });

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


// Buyer Accepted Invoice List
exports.BuyerInvoice_AcceptList = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
      res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
   } else if (!ReceivingData.Business || ReceivingData.Business === '') {
      res.status(400).send({ Status: false, Message: "Business can not be empty" });
   } else if (!ReceivingData.Seller || ReceivingData.Seller === '') {
      res.status(400).send({ Status: false, Message: "Business can not be empty" });
   } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
      res.status(400).send({ Status: false, Message: "Business can not be empty" });
   } else {
      ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
      ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
      ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
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
                  Business: ReceivingData.Business,
                  IfBuyerNotify: true,
                  IfBuyerApprove: true,
                  PaidORUnpaid: "Unpaid",
                  InvoiceStatus: 'Accept', ActiveStatus: true
               }, {}, {})
                  .populate({ path: 'Business', select: ['FirstName','LastName', 'BusinessCreditLimit', 'AvailableCreditLimit'] })
                  .populate({ path: 'BuyerBusiness', select: ['FirstName','LastName', 'BusinessCreditLimit', 'AvailableCreditLimit'] })
                  .populate({ path: 'Buyer', select: ['ContactName'] }).exec(),
               PaymentManagement.PaymentSchema.find({
                  Buyer: Buyer,
                  Seller: Seller,
                  BuyerBusiness: ReceivingData.BuyerBusiness,
                  Business: ReceivingData.Business,
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
exports.Web_PaymentCreate = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Seller || ReceivingData.Seller === '') {
      res.status(400).send({ Status: false, Message: "Seller can not be empty" });
   } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
      res.status(400).send({ Status: false, Message: "BuyerBusiness can not be empty" });
   } else if (!ReceivingData.Business || ReceivingData.Business === '') {
      res.status(400).send({ Status: false, Message: "Seller Business can not be empty" });
   } else if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
      res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
   } else if (!ReceivingData.PaymentDate || ReceivingData.PaymentDate === '') {
      res.status(400).send({ Status: false, Message: "PaymentDate  can not be empty" });
   } else if (!ReceivingData.PaymentMode || ReceivingData.PaymentMode === '') {
      res.status(400).send({ Status: false, Message: "PaymentMode can not be empty" });
   } else {

      ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
      ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
      ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
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
               'PaidORUnpaid': Obj.PaidORUnpaid,
               'InvoiceNumber': Obj.InvoiceNumber,
               'IfUsedTemporaryCredit': Obj.IfUsedTemporaryCredit,
               'IfUsedPaidTemporaryCredit':Obj.IfUsedPaidTemporaryCredit,
               'InvoiceAmount': Obj.InvoiceAmount,
               'InvoiceDate': Obj.InvoiceDate,
               'RemainingAmount': Obj.RemainingAmount,
               'InProgressAmount': Obj.InProgressAmount,
               'CurrentCreditAmount': Obj.CurrentCreditAmount,
               'UsedCurrentCreditAmount': Obj.UsedCurrentCreditAmount,
               'PaidCurrentCreditAmount': Obj.PaidCurrentCreditAmount,
               'TemporaryCreditAmount': Obj.TemporaryCreditAmount,
               'UsedTemporaryCreditAmount': Obj.UsedTemporaryCreditAmount,
               'PaidTemporaryCreditAmount': Obj.PaidTemporaryCreditAmount
         
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
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.BuyerBusiness, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         PaymentManagement.PaymentSchema.findOne({ ActiveStatus: true, IfDeleted: false }, {}, { sort: { PaymentID: -1 } }).exec(),
         InvoiceManagement.InvoiceSchema.find({ _id: { $in: InvoiceArr }, InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var SellerDetails = Response[0];
         var BusinessDetails = Response[1];
         var BuyerDetails = Response[2];
         var BuyerBusinessDetails = Response[3];
         var LastPayment = Response[4];
         var InvoiceDetails = Response[5];
         if (SellerDetails !== null && InvoiceDetails.length !== 0 && BusinessDetails !== null &&  BuyerDetails !== null && BuyerBusinessDetails !== null) {
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
            const Create_Payment = new PaymentManagement.PaymentSchema({
               Seller: Seller,
               Business: ReceivingData.Business,
               Buyer: Buyer,
               BuyerBusiness: ReceivingData.BuyerBusiness,
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
               PaymentManagement.PaymentSchema
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
                  PaymentManagement.PaymentSchema.countDocuments(FindQuery).exec()
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
            var BusinessArr = [];
            BusinessArr.push(ReceivingData.BuyerBusiness);
            if (BuyerDetails.CustomerType === 'Owner') {
               Buyer = mongoose.Types.ObjectId(BuyerDetails._id);
               FindQuery = { Buyer: Buyer, BuyerBusiness: ReceivingData.BuyerBusiness,Payment_Status: "Accept" };
            } else if (BuyerDetails.CustomerType === 'User') {
               Buyer = mongoose.Types.ObjectId(BuyerDetails.Owner);
               if (BuyerDetails.BusinessAndBranches.length !== 0) {
                  BuyerDetails.BusinessAndBranches.map(Obj => {
                     // Obj.Branches.map(obj => {
                        BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                     // });
                  });
               }
               FindQuery = { Buyer: Buyer, BuyerBusiness: { $in: BusinessArr }, Payment_Status: "Accept" };
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
               PaymentManagement.PaymentSchema
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
                  PaymentManagement.PaymentSchema.countDocuments(FindQuery).exec()
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
               PaymentManagement.PaymentSchema
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
                  PaymentManagement.PaymentSchema.countDocuments(FindQuery).exec()
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
               PaymentManagement.PaymentSchema
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
               PaymentManagement.PaymentSchema.countDocuments(FindQuery).exec()
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

//Seller Payment Accept List
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
               PaymentManagement.PaymentSchema
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
               PaymentManagement.PaymentSchema.countDocuments(FindQuery).exec()
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

// Seller Disputed PaymentList
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
               PaymentManagement.PaymentSchema
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
               PaymentManagement.PaymentSchema.countDocuments(FindQuery).exec()
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
function addDays(date, days) {
   var result = new Date(date);
  
   result.setDate(result.getDate() + days);
   return result;
 }