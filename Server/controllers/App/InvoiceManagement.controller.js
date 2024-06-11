var mongoose = require('mongoose');
var CustomersManagement = require('../../Models/CustomerManagement.model');
var ErrorHandling = require('../../Handling/ErrorHandling').ErrorHandling;
var BusinessAndBranchManagement = require('../../Models/BusinessAndBranchManagement.model');
var InvoiceManagement = require('../../Models/InvoiceManagement.model');
var moment = require('moment');
var NotificationManagement = require('../../Models/notification_management.model');
var PaymentModel = require('../../Models/PaymentManagement.model');
var InviteManagement = require('../../Models/Invite_Management.model');
var TemporaryManagement = require('../../Models/TemporaryCredit.model');
var FCM_App = require('../../../Config/fcm_config').CustomerNotify;
const fsRemove = require('fs');

var options = {
   priority: 'high',
   timeToLive: 60 * 60 * 24
};
var fs = require('fs-extra');
const { log } = require('console');

// Invoice Create
exports.InvoiceCreate = async function (req, res) {
 try {
   var ReceivingData = req.body;
   ReceivingData.forEach(element =>{

      if (!element.Seller || element.Seller === '') {
         res.status(400).send({ Status: false, Message: "Seller can not be empty" });
      } else if (!element.Business || element.Business === '') {
         res.status(400).send({ Status: false, Message: "Business can not be empty" });
      } else if (!element.Buyer || element.Buyer === '') {
         res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
      } else if (!element.BuyerBusiness || element.BuyerBusiness === '') {
         res.status(400).send({ Status: false, Message: "Buyer Business can not be empty" });
      } else if (!element.InvoiceNumber || element.InvoiceNumber === '') {
         res.status(400).send({ Status: false, Message: "Invoice Number can not be empty" });
      } else if (!element.CurrentCreditAmount || element.CurrentCreditAmount === '') {
         res.status(400).send({ Status: false, Message: "Current Credit Amount can not be empty" });
      } else if (!element.TemporaryCreditAmount || element.TemporaryCreditAmount === '') {
         res.status(400).send({ Status: false, Message: "Temporary Credit Amount can not be empty" });
      } else {
         ReceivingData.Seller = mongoose.Types.ObjectId(element.Seller);
         ReceivingData.Business = mongoose.Types.ObjectId(element.Business);
         ReceivingData.Buyer = mongoose.Types.ObjectId(element.Buyer);
         ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(element.BuyerBusiness);
         ReceivingData.InvoiceNumber = element.InvoiceNumber;
         ReceivingData.InvoiceDate = element.InvoiceDate;
         ReceivingData.CurrentCreditAmount = element.CurrentCreditAmount;
         ReceivingData.TemporaryCreditAmount = element.TemporaryCreditAmount;

         const invoiceDate = moment(element.InvoiceDate, "DD-MM-YYYY");
         
         const combinedDateTime = moment().set({
         year: invoiceDate.year(),
         month: invoiceDate.month(),
         date: invoiceDate.date(),
         hour: moment().hour(),
         minute: moment().minute(),
         second: moment().second(),
         millisecond: moment().millisecond()
         });

                      
         // console.log(combinedDateTime.toDate(), "combinedDateTime");

         var InvoiceDates = moment(element.InvoiceDate, "DD-MM-YYYY")//.toDate();
         var InvoiceDates = combinedDateTime.toDate();
         var InvoiceDueDates = moment(element.InvoiceDate, "DD-MM-YYYY").toDate();
         var SellerBranchArr = [element.Business];
         var BuyerBranchArr = [element.BuyerBusiness];

         var InviteQuery = {};
         var OpenInvoiceQuery = {};
         InviteQuery = { Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
         OpenInvoiceQuery = {Seller:element.Seller,Business: element.Business,Buyer:element.Buyer,BuyerBusiness:element.BuyerBusiness,IfUsedPaidTemporaryCredit:false,InvoiceStatus:"Pending",ActiveStatus: true, IfDeleted: false}
         Promise.all([
         
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {})
            .populate({ path: "Owner", select: ["Mobile", "Firebase_Token"] }).exec(),
         BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.Business, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, $or: [{ CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.BuyerBusiness, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         CustomersManagement.CustomerSchema.find({ "BusinessAndBranches.Business": { $in: SellerBranchArr }, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         CustomersManagement.CustomerSchema.find({ "BusinessAndBranches.Business": { $in: BuyerBranchArr }, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         InviteManagement.InviteManagementSchema.find(InviteQuery, {}, {}).exec(), 
         TemporaryManagement.CreditSchema.find({ Seller: ReceivingData.Seller,Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness,Business: ReceivingData.Business, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         InvoiceManagement.InvoiceSchema.find(OpenInvoiceQuery,{},{}).exec()
         ]).then(Response => {
            
            var SellerDetails = JSON.parse(JSON.stringify(Response[0]));
            var BusinessDetails = JSON.parse(JSON.stringify(Response[1]));
            var BuyerDetails = JSON.parse(JSON.stringify(Response[2]));
            var BuyerBusinessDetails = JSON.parse(JSON.stringify(Response[3]));
            var SellerUserDetails = JSON.parse(JSON.stringify(Response[4]));
            var BuyerUserDetails = JSON.parse(JSON.stringify(Response[5]));
            var InviteDetails = JSON.parse(JSON.stringify(Response[6]));
            var TemporaryDetails = JSON.parse(JSON.stringify(Response[7]));
            var mGetInvoiceDate = new Date(moment(InvoiceDates, "DD-MM-YYYY"));
            var OpenInvoiceDetails = JSON.parse(JSON.stringify(Response[8]));
             // Initialize total invoice amount
             let totalInvoiceAmount = 0;
            if (OpenInvoiceDetails !== null) {
               // Iterate over each object and sum up the InvoiceAmount
               OpenInvoiceDetails.forEach(invoice => {
                  totalInvoiceAmount += invoice.InvoiceAmount;
                  });
            }

            if (InviteDetails.length > 0) 
            {
               InviteDetails.map(ObjIn => {
                  InvoiceDueDates = moment(addDays(mGetInvoiceDate, ObjIn.BuyerPaymentCycle));//.format("YYYY-MM-DD");  
               });
            }
            else
            {
               InvoiceDueDates = InvoiceDueDates;
            }
     
            if (SellerDetails !== null && BusinessDetails !== null  && BuyerDetails !== null && BuyerBusinessDetails !== null ) {
               var Seller;
               var Buyer;
               var CustomerFCMToken = [];
               var SellerNotificationArr = [];
               var BuyerNotificationArr = [];
               if (SellerDetails.CustomerType === 'Owner') {
                  Seller = mongoose.Types.ObjectId(SellerDetails._id);
                  if (SellerUserDetails.length !== 0) {
                     SellerUserDetails.map(Obj => {
                        CustomerFCMToken.push(Obj.Firebase_Token);
                        SellerNotificationArr.push({
                           _id: mongoose.Types.ObjectId(Obj._id),
                           Mobile: Obj.Mobile
                        });
                     });
                  }
               } else if (SellerDetails.CustomerType === 'User') {
                  Seller = mongoose.Types.ObjectId(SellerDetails.Owner._id);
                  CustomerFCMToken.push(SellerDetails.Owner.Firebase_Token);
                  SellerNotificationArr.push({
                     _id: mongoose.Types.ObjectId(SellerDetails.Owner._id),
                     Mobile: SellerDetails.Owner.Mobile
                  });
               }
     
               var BuyerFCMToken = [];
               if (BuyerDetails.CustomerType === 'Owner') {
                  Buyer = mongoose.Types.ObjectId(BuyerDetails._id);
                  BuyerFCMToken.push(BuyerDetails.Firebase_Token);
                  BuyerNotificationArr.push({
                     _id: mongoose.Types.ObjectId(BuyerDetails._id),
                     Mobile: BuyerDetails.Mobile
                  });
               } else if (BuyerDetails.CustomerType === 'User') {
                  Buyer = mongoose.Types.ObjectId(BuyerDetails.Owner);
                  BuyerFCMToken.push(BuyerDetails.Firebase_Token);
               }
     
     
               if (BuyerUserDetails.length !== 0) {
                  BuyerUserDetails.map(Obj => {
                     BuyerFCMToken.push(Obj.Firebase_Token);
                     BuyerNotificationArr.push({
                        _id: mongoose.Types.ObjectId(Obj._id),
                        Mobile: Obj.Mobile
                     });
                  });
               }
               const Create_Invoice = new InvoiceManagement.InvoiceSchema({
                  Seller: Seller,
                  Business: element.Business,
                  Buyer: Buyer,
                  BuyerBusiness: element.BuyerBusiness,
                  // InvoiceNumber: element.InvoiceNumber,
                  InvoiceNumber:element.InvoiceNumber.toString(),//.padStart(2, '0'),
                  InvoiceDueDate: InvoiceDueDates || null,
                  InvoiceDate: InvoiceDates || null,
                  ApprovedDate: null,
                  IfBuyerApprove: false,
                  IfBuyerNotify: false,
                  InvoiceStatus: element.InvoiceStatus || 'Pending',
                  CurrentCreditAmount: element.CurrentCreditAmount || 0,
                  UsedCurrentCreditAmount: 0,
                  PaidCurrentCreditAmount: 0,
                  TemporaryCreditAmount:  element.TemporaryCreditAmount || 0,
                  UsedTemporaryCreditAmount: 0,
                  PaidTemporaryCreditAmount: 0,
                  InvoiceAmount: element.InvoiceAmount || 0,
                  RemainingAmount: element.InvoiceAmount || 0,
                  PaidAmount: 0,
                  InProgressAmount: 0,
                  IfUsedTemporaryCredit: false,
                  IfUsedPaidTemporaryCredit: false,
                  TemporaryRequestId: '',
                  InvoiceDescription: element.InvoiceDescription,
                  Remarks: element.Remarks,
                  DisputedRemarks: '',
                  ResendRemarks: '',
                  AcceptRemarks: '',
                  PaidORUnpaid: "Unpaid",
                  InvoiceAttachments: element.InvoiceAttachments || [],
                  ActiveStatus: true,
                  IfDeleted: false
               });
              
               Create_Invoice.save((err, result) => {
                  
                  if (err) {
                     ErrorHandling.ErrorLogCreation(req, 'Invoice Create Error', 'InvoiceManagement.Controller -> Invoice_Create', JSON.stringify(err));
                     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to create the Invoice!.", Error: err });
                  } else {
                     result = JSON.parse(JSON.stringify(result));
     
                     if (result.InvoiceAttachments.length !== 0) {
                        var InvoiceArr = [];
                        var InvoiceAttachments = result.InvoiceAttachments;
                        InvoiceAttachments = InvoiceAttachments.map(Obj => {
                           var InvoiceObj = {
                              _id: String,
                              fileName: String,
                              fileType: String
                           };
                           var reportData = Obj.fileName.replace(/^data:[a-z]+\/[a-z]+;base64,/, "").trim();
                           var buff = Buffer.from(reportData, 'base64');
                           const fineName = 'Uploads/Invoice/' + Obj._id + '.png';
                           InvoiceObj._id = Obj._id;
                           InvoiceObj.fileName = Obj._id + '.png';
                           InvoiceObj.fileType = Obj.fileType;
                           fs.writeFileSync(fineName, buff);
                           InvoiceArr.push(InvoiceObj);
                        });
                        InvoiceManagement.InvoiceSchema.updateOne({ _id: result._id }, { InvoiceAttachments: InvoiceArr }).exec();
                     }
                     var InviteQuery = {};
                     InviteQuery = { BuyerBusiness: mongoose.Types.ObjectId(BuyerBusinessDetails._id),Business: element.Business, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                     Promise.all([ 
                        InviteManagement.InviteManagementSchema.find(InviteQuery, {}, {}).exec()
                     ]).then(Response => { 
                        var InviteDetails = JSON.parse(JSON.stringify(Response[0])); 
                        
                        if (InviteDetails.length > 0) {
                           InviteDetails.map(ObjIn => {
                              var ChecktotalOpenIvoiceAmounts = 0;
                              if(Number(ObjIn.AvailableLimit) >= totalInvoiceAmount) {
                                 ChecktotalOpenIvoiceAmounts = Number(ObjIn.AvailableLimit) - totalInvoiceAmount;
                              } else if( totalInvoiceAmount >= Number(ObjIn.AvailableLimit)) {
                                 ChecktotalOpenIvoiceAmounts = totalInvoiceAmount - Number(ObjIn.AvailableLimit);
                              }
                              if(ChecktotalOpenIvoiceAmounts > 0) {
                                 var InviteAvailCredit = (ChecktotalOpenIvoiceAmounts - element.InvoiceAmount);
                                 // InviteManagement.InviteManagementSchema.updateOne({ BuyerBusiness: mongoose.Types.ObjectId(BuyerBusinessDetails._id),Business: element.Business, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false}, {$set: { AvailableLimit: InviteAvailCredit }}).exec();
                                 InvoiceManagement.InvoiceSchema.updateOne({ _id: result._id },{ $set: { IfUsedTemporaryCredit: false,IfUsedPaidTemporaryCredit: false,CurrentCreditAmount : ChecktotalOpenIvoiceAmounts,UsedCurrentCreditAmount: element.InvoiceAmount }}).exec();
                              } else {
                                    //  if (TemporaryDetails.length > 0) { 
                                    //    var BranchValidityDate = new Date();
                                    //    var BranchTodayDate = new Date();
                                    //    TemporaryDetails.map(obj => {
                                    //       BranchValidityDate = new Date(obj.updatedAt);
                                    //       BranchValidityDate = new Date(BranchValidityDate.setDate(BranchValidityDate.getDate() + obj.ApprovedPeriod));
                                    //       if (BranchValidityDate.valueOf() >= BranchTodayDate.valueOf()) {
                                    //          var CalTemporaryAmount =  (element.InvoiceAmount - ObjIn.AvailableLimit);
                                    //          var RemainingTemporaryAmount =  (obj.AvailableLimit - CalTemporaryAmount);
                                    //          var RemainingAvailableAmount =  (element.InvoiceAmount - CalTemporaryAmount)
                                    //          InviteManagement.InviteManagementSchema.updateOne({ BuyerBusiness: mongoose.Types.ObjectId(BuyerBusinessDetails._id),Business: element.Business,Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false}, {$set: { AvailableLimit: 0 }}).exec();
                                    //          TemporaryManagement.CreditSchema.updateOne({ Seller: element.Seller,Buyer: element.Buyer, BuyerBusiness: element.BuyerBusiness, Business: element.Business,  Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false}, {$set: { AvailableLimit: RemainingTemporaryAmount }}).exec();
                                    //          InvoiceManagement.InvoiceSchema.updateOne({ _id: result._id },{ $set: 
                                    //             { 
                                    //                IfUsedTemporaryCredit: true,
                                    //                IfUsedPaidTemporaryCredit: true, 
                                    //                UsedTemporaryCreditAmount : CalTemporaryAmount, 
                                    //                CurrentCreditAmount : ObjIn.AvailableLimit, 
                                                   
                                    //                UsedCurrentCreditAmount : RemainingAvailableAmount, 
                                    //                TemporaryRequestId: obj._id,
                                    //                TemporaryCreditAmount : obj.ApproveLimit
                                    //             }}).exec();
                                    //       }
                                    //    });
                                    // }    
                                    if (TemporaryDetails.length > 0) {
                                       var BranchValidityDate = new Date();
                                       var BranchTodayDate = new Date();
                                       TemporaryDetails.map(obj => {
                                          BranchValidityDate = new Date(obj.updatedAt);
                                          BranchValidityDate = new Date(BranchValidityDate.setDate(BranchValidityDate.getDate() + obj.ApprovedPeriod));
                                          if (BranchValidityDate.valueOf() >= BranchTodayDate.valueOf()) {
                                             var beforeCalTemporaryAmount =0;
                                             if (element.InvoiceAmount >= ObjIn.AvailableLimit) {
                                                beforeCalTemporaryAmount = element.InvoiceAmount - ChecktotalOpenIvoiceAmounts
                                             } else if (ObjIn.AvailableLimit >= element.InvoiceAmount) {
                                                beforeCalTemporaryAmount = ObjIn.AvailableLimit - ChecktotalOpenIvoiceAmounts
                                             }
                                             var CalTemporaryAmount =  (element.InvoiceAmount - ChecktotalOpenIvoiceAmounts);
                                             var RemainingTemporaryAmount =  (obj.AvailableLimit - CalTemporaryAmount);
                                             var RemainingAvailableAmount =  (element.InvoiceAmount - CalTemporaryAmount)
                                             // InviteManagement.InviteManagementSchema.updateOne({ BuyerBusiness: mongoose.Types.ObjectId(BuyerBusinessDetails._id),Business: element.Business,Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false}, {$set: { AvailableLimit: 0 }}).exec();
                                             // TemporaryManagement.CreditSchema.updateOne({ Seller: element.Seller,Buyer: element.Buyer, BuyerBusiness: element.BuyerBusiness, Business: element.Business,  Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false}, {$set: { AvailableLimit: RemainingTemporaryAmount }}).exec();
                                             InvoiceManagement.InvoiceSchema.updateOne({ _id: result._id },{ $set: 
                                                { 
                                                   IfUsedTemporaryCredit: true,
                                                   IfUsedPaidTemporaryCredit: true, 
                                                   UsedTemporaryCreditAmount : CalTemporaryAmount, 
                                                   CurrentCreditAmount : ChecktotalOpenIvoiceAmounts, 
                                                   
                                                   UsedCurrentCreditAmount : RemainingAvailableAmount, 
                                                   TemporaryRequestId: obj._id,
                                                   TemporaryCreditAmount : obj.ApproveLimit
                                                }}).exec();
                                          }
                                       });
                                    }   
                              }
                           });
                        }
                     }).catch(Error => {
                        ErrorHandling.ErrorLogCreation(req, 'Invoice And Payment, Invite Details getting Error', 'HundiScore.Controller -> CustomerDashBoard', JSON.stringify(Error));
                        res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
                     });
     
     
                     // Seller Owner and User Notification
                     var payload = {
                        notification: {
                           title: 'Hundi-Team',
                           body: SellerDetails.ContactName + ' created an invoice for ' + BuyerBusinessDetails.FirstName +''+ BuyerBusinessDetails.LastName + ' ' + 'Invoice ID - ' + result.InvoiceNumber + ' Amount - Rs.' + result.InvoiceAmount + ' Click here to view the same.',
                           sound: 'notify_tone.mp3'
                        },
                        data: {
                           Customer: SellerDetails._id,
                           notification_type: 'SellerInvoiceCreated',
                           click_action: 'FCM_PLUGIN_ACTIVITY',
                        }
                     };
                     if (CustomerFCMToken.length > 0) {
                        FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
                     }
     
     
                     const SellerBranchNotification = new NotificationManagement.NotificationSchema({
                        User: null,
                        Business: result.Business,
                        Notification_Type: 'SellerInvoiceCreated',
                        Message: SellerDetails.ContactName + ' created an invoice for ' + BuyerBusinessDetails.FirstName +''+ BuyerBusinessDetails.LastName + ' ' + 'Invoice ID - ' + result.InvoiceNumber + ' Amount - Rs.' + result.InvoiceAmount + ' Click here to view the same.',
                        Message_Received: true,
                        Message_Viewed: false,
                        ActiveStatus: true,
                        IfDeleted: false,
                     });
                     SellerBranchNotification.save();
     
     
                     // Buyer Owner and User Notification
                     var BuyerPayload = {
                        notification: {
                           title: 'Hundi-Team',
                           body: BusinessDetails.BusinessName + ' created an invoice for ' + BuyerBusinessDetails.FirstName +''+ BuyerBusinessDetails.LastName + ' ' + 'Invoice ID - ' + result.InvoiceNumber + ' Amount - Rs.' + result.InvoiceAmount + ' You can view the invoice here.',
                           sound: 'notify_tone.mp3'
                        },
                        data: {
                           Customer: BuyerDetails._id,
                           notification_type: 'BuyerInvoiceCreated',
                           click_action: 'FCM_PLUGIN_ACTIVITY',
                        }
                     };
                     if (BuyerFCMToken.length > 0) {
                        FCM_App.messaging().sendToDevice(BuyerFCMToken, BuyerPayload, options).then((NotifyRes) => { });
                     }
                     const BuyerBranchNotification = new NotificationManagement.NotificationSchema({
                        User: null,
                        Business: result.BuyerBusiness,
                        Notification_Type: 'BuyerInvoiceCreated',
                        Message: BusinessDetails.FirstName + ''+BusinessDetails.LastName + ' created an invoice for ' + BuyerBusinessDetails.FirstName +''+ BuyerBusinessDetails.LastName + ' ' +'Invoice ID - ' + result.InvoiceNumber + ' Amount - Rs.' + result.InvoiceAmount + ' You can view the invoice here.',
                        Message_Received: true,
                        Message_Viewed: false,
                        ActiveStatus: true,
                        IfDeleted: false,
                     });
                     BuyerBranchNotification.save();
                     // res.status(200).send({ Status: true, Message: "Invoice Successfully Created" });
                  }
                  // res.status(200).send({ Status: true, Message: "Invoice Successfully Created" });

               });
               res.status(200).send({ Status: true, Message: "Invoice Successfully Created" });

            } else {
               res.status(400).send({ Status: false, Message: "Some Occurred Error" });
            }
         }).catch(Error => {
            // console.log(Error);
            ErrorHandling.ErrorLogCreation(req, 'Invoice Error', 'InvoiceManagement.Controller -> Some occurred Error', JSON.stringify(Error));
            // res.status(417).send({ Status: false, Message: "Some occurred Error!.", Error: Error });
         });

      }
   
   })
            // res.status(417).send({ Status: false, Message: "Some occurred Error!.", Error: Error });

 } catch (error) {
   // console.error(error);
   ErrorHandling.ErrorLogCreation(req, 'Invoice Error  -- Internal Server Error', 'InvoiceManagement.Controller -> Some occurred Error', JSON.stringify(error));
   res.status(500).send({ Status: false, Message: "Internal Server Error" });
 }
 };


// Invoice Create Duplicate
exports.CheckInvoiceNumberDuplicate = async function (req, res) {
   var ReceivingData = req.body;
   
    if (!ReceivingData.Seller || ReceivingData.Seller === '') {
       res.status(400).send({ Status: false, Message: "Seller can not be empty" });
    } else if (!ReceivingData.Business || ReceivingData.Business === '') {
       res.status(400).send({ Status: false, Message: "Business can not be empty" });
    } else if (!ReceivingData.InvoiceNumber || ReceivingData.InvoiceNumber === '') {
       res.status(400).send({ Status: false, Message: "Invoice Number can not be empty" });
    } else {
       ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
       ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);

       Promise.all([
         InvoiceManagement.InvoiceSchema.find({ InvoiceNumber: ReceivingData.InvoiceNumber, Business : ReceivingData.Business },{},{}).exec()
       ]).then(Response => {
         var InvoiceDetails = JSON.parse(JSON.stringify(Response[0]));
            if (InvoiceDetails !== null && InvoiceDetails.length > 0 ) {
               InvoiceDetails.forEach((element)=>{

                  var SellerRecieve = JSON.stringify(ReceivingData.Seller);
                  var SellerExist = JSON.stringify(element.Seller);
                  var BusinessRecieve = JSON.stringify(ReceivingData.Business);
                  var BusinessExist = JSON.stringify(element.Business);
                 if (element.InvoiceNumber === ReceivingData.InvoiceNumber && SellerRecieve === SellerExist && BusinessRecieve === BusinessExist) {
                        res.status(200).send({ Status: true, Message: "Invoice Number Already Exist!" }) 
                  }
               })
            } else {
               res.status(200).send({ Status: true, Message: "Invoice Number Not Found!" }) 
            }

       }).catch(Error => {
          ErrorHandling.ErrorLogCreation(req, 'Invoice Error', 'InvoiceManagement.Controller -> Some occurred Error', JSON.stringify(Error));
          res.status(417).send({ Status: false, Message: "Some occurred Error!.", Error: Error });
       });
    }
 };

// Invoice Create Multiple
exports.InvoiceCreateMultiple = async function (req, res) {
   var ReceivingData = req.body;
   var ExistInvoicenoList;
   const findInvoiceByNumber = async () => {
      try {
        ExistInvoicenoList = await InvoiceManagement.InvoiceSchema.findOne({ InvoiceNumber: ReceivingData.InvoiceNumber, Business : ReceivingData.Business }).exec();
      } catch (error) {
       res.status(400).send({ Status: false, Message: "Invoice Number Already Exists!" ,Error:error});
      }
    };
    await findInvoiceByNumber();
   

    if (!ReceivingData.Seller || ReceivingData.Seller === '') {
       res.status(400).send({ Status: false, Message: "Seller can not be empty" });
    } else if (!ReceivingData.Business || ReceivingData.Business === '') {
       res.status(400).send({ Status: false, Message: "Business can not be empty" });
    } else if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
       res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
    } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
       res.status(400).send({ Status: false, Message: "Buyer Business can not be empty" });
    } else if (!ReceivingData.InvoiceNumber || ReceivingData.InvoiceNumber === '') {
       res.status(400).send({ Status: false, Message: "Invoice Number can not be empty" });
      } else if (ExistInvoicenoList !== null) {
         res.status(400).send({ Status: false, Message: "Invoice Number already exist" });
    } else if (!ReceivingData.CurrentCreditAmount || ReceivingData.CurrentCreditAmount === '') {
       res.status(400).send({ Status: false, Message: "Current Credit Amount can not be empty" });
    } else if (!ReceivingData.TemporaryCreditAmount || ReceivingData.TemporaryCreditAmount === '') {
       res.status(400).send({ Status: false, Message: "Temporary Credit Amount can not be empty" });
    } else {
       ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
       ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
       ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
       ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
       var InvoiceDates = moment(ReceivingData.InvoiceDate, "DD-MM-YYYY").toDate();
       var InvoiceDueDates = moment(ReceivingData.InvoiceDate, "DD-MM-YYYY").toDate();
       var SellerBranchArr = [ReceivingData.Business];
       var BuyerBranchArr = [ReceivingData.BuyerBusiness];
 
       var InviteQuery = {};
       InviteQuery = { Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
 
       Promise.all([
          CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {})
          .populate({ path: "Owner", select: ["Mobile", "Firebase_Token"] }).exec(),
       BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.Business, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
       CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, $or: [{ CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
       BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.BuyerBusiness, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
       CustomersManagement.CustomerSchema.find({ "BusinessAndBranches.Business": { $in: SellerBranchArr }, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
       CustomersManagement.CustomerSchema.find({ "BusinessAndBranches.Business": { $in: BuyerBranchArr }, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
       InviteManagement.InviteManagementSchema.find(InviteQuery, {}, {}).exec(), 
       TemporaryManagement.CreditSchema.find({ Seller: ReceivingData.Seller,Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness,Business: ReceivingData.Business, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
 
    
       ]).then(Response => {
          var SellerDetails = JSON.parse(JSON.stringify(Response[0]));
          var BusinessDetails = JSON.parse(JSON.stringify(Response[1]));
          var BuyerDetails = JSON.parse(JSON.stringify(Response[2]));
          var BuyerBusinessDetails = JSON.parse(JSON.stringify(Response[3]));
          var SellerUserDetails = JSON.parse(JSON.stringify(Response[4]));
          var BuyerUserDetails = JSON.parse(JSON.stringify(Response[5]));
          var InviteDetails = JSON.parse(JSON.stringify(Response[6]));
          var TemporaryDetails = JSON.parse(JSON.stringify(Response[7]));
          
 
          var mGetInvoiceDate = new Date(moment(ReceivingData.InvoiceDate, "DD-MM-YYYY"));
       
          if (InviteDetails.length > 0) 
          {
             InviteDetails.map(ObjIn => {
                InvoiceDueDates = moment(addDays(mGetInvoiceDate, ObjIn.BuyerPaymentCycle));//.format("YYYY-MM-DD");  
             });
          }
          else
          {
             InvoiceDueDates = InvoiceDueDates;
          }
 
             if (SellerDetails !== null && BusinessDetails !== null  && BuyerDetails !== null && BuyerBusinessDetails !== null ) {
             var Seller;
             var Buyer;
             var CustomerFCMToken = [];
             var SellerNotificationArr = [];
             var BuyerNotificationArr = [];
             if (SellerDetails.CustomerType === 'Owner') {
                Seller = mongoose.Types.ObjectId(SellerDetails._id);
                if (SellerUserDetails.length !== 0) {
                   SellerUserDetails.map(Obj => {
                      CustomerFCMToken.push(Obj.Firebase_Token);
                      SellerNotificationArr.push({
                         _id: mongoose.Types.ObjectId(Obj._id),
                         Mobile: Obj.Mobile
                      });
                   });
                }
             } else if (SellerDetails.CustomerType === 'User') {
                Seller = mongoose.Types.ObjectId(SellerDetails.Owner._id);
                CustomerFCMToken.push(SellerDetails.Owner.Firebase_Token);
                SellerNotificationArr.push({
                   _id: mongoose.Types.ObjectId(SellerDetails.Owner._id),
                   Mobile: SellerDetails.Owner.Mobile
                });
             }
 
             var BuyerFCMToken = [];
             if (BuyerDetails.CustomerType === 'Owner') {
                Buyer = mongoose.Types.ObjectId(BuyerDetails._id);
                BuyerFCMToken.push(BuyerDetails.Firebase_Token);
                BuyerNotificationArr.push({
                   _id: mongoose.Types.ObjectId(BuyerDetails._id),
                   Mobile: BuyerDetails.Mobile
                });
             } else if (BuyerDetails.CustomerType === 'User') {
                Buyer = mongoose.Types.ObjectId(BuyerDetails.Owner);
                BuyerFCMToken.push(BuyerDetails.Firebase_Token);
             }
 
 
             if (BuyerUserDetails.length !== 0) {
                BuyerUserDetails.map(Obj => {
                   BuyerFCMToken.push(Obj.Firebase_Token);
                   BuyerNotificationArr.push({
                      _id: mongoose.Types.ObjectId(Obj._id),
                      Mobile: Obj.Mobile
                   });
                });
             }
 
 
             const Create_Invoice = new InvoiceManagement.InvoiceSchema({
                Seller: Seller,
                Business: ReceivingData.Business,
                Buyer: Buyer,
                BuyerBusiness: ReceivingData.BuyerBusiness,
                InvoiceNumber: ReceivingData.InvoiceNumber,
                InvoiceDueDate: InvoiceDueDates || null,
                InvoiceDate: InvoiceDates || null,
                ApprovedDate: null,
                IfBuyerApprove: false,
                IfBuyerNotify: false,
                InvoiceStatus: ReceivingData.InvoiceStatus || 'Pending',
                CurrentCreditAmount: ReceivingData.CurrentCreditAmount || 0,
                UsedCurrentCreditAmount: 0,
                PaidCurrentCreditAmount: 0,
                TemporaryCreditAmount:  ReceivingData.TemporaryCreditAmount || 0,
                UsedTemporaryCreditAmount: 0,
                PaidTemporaryCreditAmount: 0,
                InvoiceAmount: ReceivingData.InvoiceAmount || 0,
                RemainingAmount: ReceivingData.InvoiceAmount || 0,
                PaidAmount: 0,
                InProgressAmount: 0,
                IfUsedTemporaryCredit: false,
                IfUsedPaidTemporaryCredit: false,
                TemporaryRequestId: '',
                InvoiceDescription: ReceivingData.InvoiceDescription,
                Remarks: ReceivingData.Remarks,
                DisputedRemarks: '',
                ResendRemarks: '',
                AcceptRemarks: '',
                PaidORUnpaid: "Unpaid",
                InvoiceAttachments: ReceivingData.InvoiceAttachments || [],
                ActiveStatus: true,
                IfDeleted: false
             });
             Create_Invoice.save((err, result) => {
                if (err) {
                   ErrorHandling.ErrorLogCreation(req, 'Invoice Create Error', 'InvoiceManagement.Controller -> Invoice_Create', JSON.stringify(err));
                   res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to create the Invoice!.", Error: err });
                } else {
                   result = JSON.parse(JSON.stringify(result));
 
                   if (result.InvoiceAttachments.length !== 0) {
                      var InvoiceArr = [];
                      var InvoiceAttachments = result.InvoiceAttachments;
                      InvoiceAttachments = InvoiceAttachments.map(Obj => {
                         var InvoiceObj = {
                            _id: String,
                            fileName: String,
                            fileType: String
                         };
                         var reportData = Obj.fileName.replace(/^data:[a-z]+\/[a-z]+;base64,/, "").trim();
                         var buff = Buffer.from(reportData, 'base64');
                         const fineName = 'Uploads/Invoice/' + Obj._id + '.png';
                         InvoiceObj._id = Obj._id;
                         InvoiceObj.fileName = Obj._id + '.png';
                         InvoiceObj.fileType = Obj.fileType;
                         fs.writeFileSync(fineName, buff);
                         InvoiceArr.push(InvoiceObj);
                      });
                      InvoiceManagement.InvoiceSchema.updateOne({ _id: result._id }, { InvoiceAttachments: InvoiceArr }).exec();
                   }
 
                
                   var InviteQuery = {};
                   InviteQuery = { BuyerBusiness: mongoose.Types.ObjectId(BuyerBusinessDetails._id),Business: ReceivingData.Business, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                   Promise.all([ 
                      InviteManagement.InviteManagementSchema.find(InviteQuery, {}, {}).exec(), 
                   ]).then(Response => { 
                      var InviteDetails = JSON.parse(JSON.stringify(Response[0])); 
                      if (InviteDetails.length > 0) {
                         InviteDetails.map(ObjIn => {
                            if(Number(ObjIn.AvailableLimit) > Number(ReceivingData.InvoiceAmount)) {
                               var InviteAvailCredit = (ObjIn.AvailableLimit - ReceivingData.InvoiceAmount);
                               InviteManagement.InviteManagementSchema.updateOne({ BuyerBusiness: mongoose.Types.ObjectId(BuyerBusinessDetails._id),Business: ReceivingData.Business, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false}, {$set: { AvailableLimit: InviteAvailCredit }}).exec();
                               InvoiceManagement.InvoiceSchema.updateOne({ _id: result._id },{ $set: { IfUsedTemporaryCredit: false,IfUsedPaidTemporaryCredit: false,CurrentCreditAmount : ObjIn.AvailableLimit,UsedCurrentCreditAmount: ReceivingData.InvoiceAmount }}).exec();
                            } else {
                                   if (TemporaryDetails.length > 0) {
                                     var BranchValidityDate = new Date();
                                     var BranchTodayDate = new Date();
                                     TemporaryDetails.map(obj => {
                                        BranchValidityDate = new Date(obj.updatedAt);
                                        BranchValidityDate = new Date(BranchValidityDate.setDate(BranchValidityDate.getDate() + obj.ApprovedPeriod));
                                        if (BranchValidityDate.valueOf() >= BranchTodayDate.valueOf()) {
                                           var CalTemporaryAmount =  (ReceivingData.InvoiceAmount - ObjIn.AvailableLimit);
                                           var RemainingTemporaryAmount =  (obj.AvailableLimit - CalTemporaryAmount);
                                           var RemainingAvailableAmount =  (ReceivingData.InvoiceAmount - CalTemporaryAmount)
                                           InviteManagement.InviteManagementSchema.updateOne({ BuyerBusiness: mongoose.Types.ObjectId(BuyerBusinessDetails._id),Business: ReceivingData.Business,Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false}, {$set: { AvailableLimit: 0 }}).exec();
                                           TemporaryManagement.CreditSchema.updateOne({ Seller: ReceivingData.Seller,Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, Business: ReceivingData.Business,  Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false}, {$set: { AvailableLimit: RemainingTemporaryAmount }}).exec();
                                           InvoiceManagement.InvoiceSchema.updateOne({ _id: result._id },{ $set: { IfUsedTemporaryCredit: true,IfUsedPaidTemporaryCredit: true, UsedTemporaryCreditAmount : CalTemporaryAmount, CurrentCreditAmount : ObjIn.AvailableLimit, UsedCurrentCreditAmount : RemainingAvailableAmount, TemporaryRequestId: obj._id,TemporaryCreditAmount : obj.ApproveLimit}}).exec();
                                        }
                                     });
                                  }    
                            }
                         });
                      }
                   }).catch(Error => {
                      ErrorHandling.ErrorLogCreation(req, 'Invoice And Payment, Invite Details getting Error', 'HundiScore.Controller -> CustomerDashBoard', JSON.stringify(Error));
                      res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
                   });
 
 
                   // Seller Owner and User Notification
                   var payload = {
                      notification: {
                         title: 'Hundi-Team',
                         body: SellerDetails.ContactName + ' created an invoice for ' + BuyerBusinessDetails.BusinessName + ' ' + 'Invoice ID - ' + result.InvoiceNumber + ' Amount - Rs.' + result.InvoiceAmount + ' Click here to view the same.',
                         sound: 'notify_tone.mp3'
                      },
                      data: {
                         Customer: SellerDetails._id,
                         notification_type: 'SellerInvoiceCreated',
                         click_action: 'FCM_PLUGIN_ACTIVITY',
                      }
                   };
                   if (CustomerFCMToken.length > 0) {
                      FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
                   }
 
 
                   const SellerBranchNotification = new NotificationManagement.NotificationSchema({
                      User: null,
                      Business: result.Business,
                      Notification_Type: 'SellerInvoiceCreated',
                      Message: SellerDetails.ContactName + ' created an invoice for ' + BuyerBusinessDetails.FirstName +''+ LastName  + ' ' + 'Invoice ID - ' + result.InvoiceNumber + ' Amount - Rs.' + result.InvoiceAmount + ' Click here to view the same.',
                      Message_Received: true,
                      Message_Viewed: false,
                      ActiveStatus: true,
                      IfDeleted: false,
                   });
                   SellerBranchNotification.save();
 
 
                   // Buyer Owner and User Notification
                   var BuyerPayload = {
                      notification: {
                         title: 'Hundi-Team',
                         body: BusinessDetails.FirstName +''+ BusinessDetails.LastName  + ' created an invoice for ' + BuyerBusinessDetails.FirstName +''+ BuyerBusinessDetails.LastName  + ' ' + 'Invoice ID - ' + result.InvoiceNumber + ' Amount - Rs.' + result.InvoiceAmount + ' You can view the invoice here.',
                         sound: 'notify_tone.mp3'
                      },
                      data: {
                         Customer: BuyerDetails._id,
                         notification_type: 'BuyerInvoiceCreated',
                         click_action: 'FCM_PLUGIN_ACTIVITY',
                      }
                   };
                   if (BuyerFCMToken.length > 0) {
                      FCM_App.messaging().sendToDevice(BuyerFCMToken, BuyerPayload, options).then((NotifyRes) => { });
                   }
                   const BuyerBranchNotification = new NotificationManagement.NotificationSchema({
                      User: null,
                      Business: result.BuyerBusiness,
                      Notification_Type: 'BuyerInvoiceCreated',
                      Message: BusinessDetails.FirstName +''+ BusinessDetails.LastName  + ' created an invoice for ' + BuyerBusinessDetails.FirstName +''+ BuyerBusinessDetails.LastName  + ' ' +'Invoice ID - ' + result.InvoiceNumber + ' Amount - Rs.' + result.InvoiceAmount + ' You can view the invoice here.',
                      Message_Received: true,
                      Message_Viewed: false,
                      ActiveStatus: true,
                      IfDeleted: false,
                   });
                   BuyerBranchNotification.save();
                   res.status(200).send({ Status: true, Message: "Invoice Successfully Created" });
                }
             });
          } else {
             res.status(400).send({ Status: false, Message: "Some Occurred Error" });
          }
       }).catch(Error => {
          ErrorHandling.ErrorLogCreation(req, 'Invoice Error', 'InvoiceManagement.Controller -> Some occurred Error', JSON.stringify(Error));
          res.status(417).send({ Status: false, Message: "Some occurred Error!.", Error: Error });
       });
    }
 };

// Invoice Details Update
exports.InvoiceDetailsUpdate = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Seller || ReceivingData.Seller === '') {
      res.status(400).send({ Status: false, Message: "Seller can not be empty" });
   } else if (!ReceivingData.Business || ReceivingData.Business === '') {
      res.status(400).send({ Status: false, Message: "Business can not be empty" });
   } else if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
      res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
   } else if (!ReceivingData.Invoice || ReceivingData.Invoice === '') {
      res.status(400).send({ Status: false, Message: "Invoice can not be empty" });
   } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
      res.status(400).send({ Status: false, Message: "Invoice can not be empty" });
   } else if (!ReceivingData.InvoiceStatus || ReceivingData.InvoiceStatus === '') {
      res.status(400).send({ Status: false, Message: "Invoice Status can not be empty" });
   } else if (!ReceivingData.CurrentCreditAmount || ReceivingData.CurrentCreditAmount === '') {
      res.status(400).send({ Status: false, Message: "Current Credit Amount can not be empty" });
   } else if (!ReceivingData.TemporaryCreditAmount || ReceivingData.TemporaryCreditAmount === '') {
      res.status(400).send({ Status: false, Message: "Temporary Credit Amount can not be empty" });
   } else {
      ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
      ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
      ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
      ReceivingData.Invoice = mongoose.Types.ObjectId(ReceivingData.Invoice);
      ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
      var InvoiceDates = moment(ReceivingData.InvoiceDate, "DD-MM-YYYY").toDate();
      var InvoiceDueDates = moment(ReceivingData.InvoiceDate, "DD-MM-YYYY").toDate();

      var InviteQuery = {};
      InviteQuery = { Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };


      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.Business, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.BuyerBusiness, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         InvoiceManagement.InvoiceSchema.findOne({ _id: ReceivingData.Invoice, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         InviteManagement.InviteManagementSchema.find(InviteQuery, {}, {}).exec(),
         TemporaryManagement.CreditSchema.find({ Seller: ReceivingData.Seller,Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness,Business: ReceivingData.Business,  Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         InvoiceManagement.InvoiceSchema.find({ Seller: ReceivingData.Seller,Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness,Business: ReceivingData.Business,  ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
     
     
      ]).then(Response => {
         var SellerDetails = Response[0];
         var BusinessDetails = Response[1];
         var BuyerDetails = Response[2];
         var BuyerBusinessDetails = Response[3];
         var InvoiceDetails = Response[4];
         var InviteDetails = JSON.parse(JSON.stringify(Response[5]));
         var TemporaryDetails = JSON.parse(JSON.stringify(Response[6]));
          var InvoiceAmountDetails = JSON.parse(JSON.stringify(Response[7]));

         var mGetInvoiceDate = new Date(moment(ReceivingData.InvoiceDate, "DD-MM-YYYY"));
      
         if (InviteDetails.length > 0) {
            InviteDetails.map(ObjIn => {
               InvoiceDueDates = moment(addDays(mGetInvoiceDate, ObjIn.BuyerPaymentCycle));//.format("YYYY-MM-DD");  
               
            });
         }

            if (SellerDetails !== null && BusinessDetails !== null  && BuyerDetails !== null && BuyerBusinessDetails !== null ) {
            
            var InvoiceAttachments = [];
            if (ReceivingData.InvoiceAttachments === null) {
               InvoiceAttachments = [];
            } else {
               ReceivingData.InvoiceAttachments.map(obj => {
                  InvoiceAttachments.push(obj);
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
            if (ReceivingData.InvoiceStatus === "Disputed") {
               InvoiceDetails.InvoiceStatus = 'Closed';
               InvoiceDetails.ActiveStatus = false;
               InvoiceDetails.IfDeleted = true;
               InvoiceDetails.DisputedParentID = InvoiceDetails._id;
               InvoiceDetails.save((err, result) => {
                  if (err) {
                     ErrorHandling.ErrorLogCreation(req, 'Invoice Update Error', 'InvoiceManagement.Controller -> Invoice_Update', JSON.stringify(err));
                     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to create the Invoice!.", Error: err });
                  } else {
               
                     const Create_Invoice = new InvoiceManagement.InvoiceSchema({
                        
                        Seller: Seller,
                        Business: ReceivingData.Business,
                        Buyer: Buyer,
                        BuyerBusiness: ReceivingData.BuyerBusiness,
                        InvoiceNumber: ReceivingData.InvoiceNumber,
                        InvoiceDueDate: InvoiceDueDates || null,
                        InvoiceDate: InvoiceDates || null,
                        ApprovedDate: null,
                        IfBuyerApprove: false,
                        IfBuyerNotify: false,
                        InvoiceStatus: 'Pending',
                        CurrentCreditAmount: ReceivingData.CurrentCreditAmount || 0,
                        UsedCurrentCreditAmount: 0,
                        PaidCurrentCreditAmount: 0,
                        TemporaryCreditAmount:  ReceivingData.TemporaryCreditAmount || 0,
                        UsedTemporaryCreditAmount: 0,
                        PaidTemporaryCreditAmount: 0,
                        InvoiceAmount: ReceivingData.InvoiceAmount || 0,
                        RemainingAmount: ReceivingData.InvoiceAmount || 0,
                        PaidAmount: 0,
                        InProgressAmount: 0,
                        IfUsedTemporaryCredit: false,
                        IfUsedPaidTemporaryCredit: false,
                        TemporaryRequestId: '',
                        InvoiceDescription: ReceivingData.InvoiceDescription,
                        Remarks: ReceivingData.Remarks,
                        DisputedRemarks: '',
                        ResendRemarks: '',
                        AcceptRemarks: '',
                        PaidORUnpaid: "Unpaid",
                        InvoiceAttachments: ReceivingData.InvoiceAttachments || [],
                        ActiveStatus: true,
                        IfDeleted: false
                     });
                     Create_Invoice.save((errNew, resultNew) => {
                      
                        if (errNew) {
                           ErrorHandling.ErrorLogCreation(req, 'Invoice Create Error', 'InvoiceManagement.Controller -> Invoice_Create', JSON.stringify(errNew));
                           res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to create the Invoice!.", Error: errNew });
                        } else {
                           resultNew = JSON.parse(JSON.stringify(resultNew));

                           if (resultNew.InvoiceAttachments.length !== 0) {
                              var InvoiceArr = [];
                              var InvoiceAttachments = resultNew.InvoiceAttachments;
                              InvoiceAttachments = InvoiceAttachments.map(Obj => {
                                 var InvoiceObj = {
                                    _id: String,
                                    fileName: String,
                                    fileType: String
                                 };
                                 var reportData = Obj.fileName.replace(/^data:[a-z]+\/[a-z]+;base64,/, "").trim();
                                 var buff = Buffer.from(reportData, 'base64');
                                 const fineName = 'Uploads/Invoice/' + Obj._id + '.png';
                                 InvoiceObj._id = Obj._id;
                                 InvoiceObj.fileName = Obj._id + '.png';
                                 InvoiceObj.fileType = Obj.fileType;
                                 fs.writeFileSync(fineName, buff);
                                 InvoiceArr.push(InvoiceObj);
                              });
                              InvoiceManagement.InvoiceSchema.updateOne({ _id: resultNew._id }, { InvoiceAttachments: InvoiceArr }).exec();
                           }
         
                           var InviteQuery = {};
                   InviteQuery = { BuyerBusiness: mongoose.Types.ObjectId(BuyerBusinessDetails._id),Business: ReceivingData.Business, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                           
                           Promise.all([ 
                              InviteManagement.InviteManagementSchema.find(InviteQuery, {}, {}).exec(), 
                           ]).then(Response => { 
                              var InviteDetails = JSON.parse(JSON.stringify(Response[0])); 
                              if (InviteDetails.length > 0) {
                                 InviteDetails.map(ObjIn => {
                                    if(Number(ObjIn.AvailableLimit) > Number(ReceivingData.InvoiceAmount)) {
                                       var InviteAvailCredit = (ObjIn.AvailableLimit - ReceivingData.InvoiceAmount);
                                     
                                       // InviteManagement.InviteManagementSchema.updateOne({ BuyerBusiness: mongoose.Types.ObjectId(BuyerBusinessDetails._id),Business: ReceivingData.Business, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false}, {$set: { AvailableLimit: InviteAvailCredit }}).exec();
                                       InvoiceManagement.InvoiceSchema.updateOne({ _id: result._id },{ $set: { IfUsedTemporaryCredit: false,IfUsedPaidTemporaryCredit: false,CurrentCreditAmount : ObjIn.AvailableLimit,UsedCurrentCreditAmount: ReceivingData.InvoiceAmount }}).exec();
                                   
                                  
                                    } else {
                                           if (TemporaryDetails.length > 0) {
                                             var BranchValidityDate = new Date();
                                             var BranchTodayDate = new Date();
                                             TemporaryDetails.map(obj => {
                                                BranchValidityDate = new Date(obj.updatedAt);
                                                BranchValidityDate = new Date(BranchValidityDate.setDate(BranchValidityDate.getDate() + obj.ApprovedPeriod));
                                                if (BranchValidityDate.valueOf() >= BranchTodayDate.valueOf()) {
                                                   var CalTemporaryAmount =  (ReceivingData.InvoiceAmount - ObjIn.AvailableLimit); //100 -0 = 100
                                                   var RemainingTemporaryAmount =  (obj.AvailableLimit - CalTemporaryAmount);//200
                                                   var RemainingAvailableAmount =  (ReceivingData.InvoiceAmount - CalTemporaryAmount)
                                                
                                                   // InviteManagement.InviteManagementSchema.updateOne({ BuyerBusiness: mongoose.Types.ObjectId(BuyerBusinessDetails._id),Business: ReceivingData.Business,Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false}, {$set: { AvailableLimit: 0 }}).exec();
                                                   // TemporaryManagement.CreditSchema.updateOne({ Seller: ReceivingData.Seller,Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, Business: ReceivingData.Business,  Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false}, {$set: { AvailableLimit: RemainingTemporaryAmount }}).exec();
                                                   // InvoiceManagement.InvoiceSchema.updateOne({ _id: result._id },{ $set: { IfUsedTemporaryCredit: true,IfUsedPaidTemporaryCredit: true, UsedTemporaryCreditAmount : CalTemporaryAmount, CurrentCreditAmount : ObjIn.AvailableLimit, UsedCurrentCreditAmount : RemainingAvailableAmount, TemporaryRequestId: obj._id,TemporaryCreditAmount : obj.ApproveLimit}}).exec();
                                                   InviteManagement.InviteManagementSchema.updateOne({ BuyerBusiness: mongoose.Types.ObjectId(BuyerBusinessDetails._id),Business: ReceivingData.Business,Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false}).exec();
                                                   TemporaryManagement.CreditSchema.updateOne({ Seller: ReceivingData.Seller,Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, Business: ReceivingData.Business,  Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false}).exec();
                                                   InvoiceManagement.InvoiceSchema.updateOne({ _id: result._id },{ $set: { IfUsedTemporaryCredit: true,IfUsedPaidTemporaryCredit: true, UsedTemporaryCreditAmount : CalTemporaryAmount, CurrentCreditAmount : ObjIn.AvailableLimit, UsedCurrentCreditAmount : RemainingAvailableAmount, TemporaryRequestId: obj._id,TemporaryCreditAmount : obj.ApproveLimit}}).exec();
                                              
                                                }
                                             });
                                          }    
                                    }
                                 });
                              }
                           }).catch(Error => {
                              ErrorHandling.ErrorLogCreation(req, 'Invoice And Payment, Invite Details getting Error', 'HundiScore.Controller -> CustomerDashBoard', JSON.stringify(Error));
                              res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
                           });
         

                           // Seller/Buyer Credit Limit reduce
                           if (InvoiceDetails.InvoiceAmount !== ReceivingData.InvoiceAmount) {
                              // var BranchAvailCredit = InvoiceDetails.InvoiceAmount > ReceivingData.InvoiceAmount ? BranchDetails.AvailableCreditLimit - (InvoiceDetails.InvoiceAmount - ReceivingData.InvoiceAmount) : 
                              //                         InvoiceDetails.InvoiceAmount < ReceivingData.InvoiceAmount ? (ReceivingData.InvoiceAmount - InvoiceDetails.InvoiceAmount) + BranchDetails.AvailableCreditLimit : BranchDetails.AvailableCreditLimit ;
                              // var BuyerBranchAvailCredit = InvoiceDetails.InvoiceAmount > ReceivingData.InvoiceAmount ? BuyerBranchDetails.AvailableCreditLimit - (InvoiceDetails.InvoiceAmount - ReceivingData.InvoiceAmount) : 
                              //                         InvoiceDetails.InvoiceAmount < ReceivingData.InvoiceAmount ? (ReceivingData.InvoiceAmount - InvoiceDetails.InvoiceAmount) + BuyerBranchDetails.AvailableCreditLimit : BuyerBranchDetails.AvailableCreditLimit ;
                              // BusinessAndBranchManagement.BranchSchema.updateOne({ _id: BranchDetails._id}, { $set: { AvailableCreditLimit: BranchAvailCredit }}).exec();
                              // BusinessAndBranchManagement.BranchSchema.updateOne({ _id: BuyerBranchDetails._id}, {$set: { AvailableCreditLimit: BuyerBranchAvailCredit }}).exec();                              
                           

                              var BusinessAvailCredit = InvoiceDetails.InvoiceAmount > ReceivingData.InvoiceAmount ? BusinessDetails.AvailableCreditLimit - (InvoiceDetails.InvoiceAmount - ReceivingData.InvoiceAmount) : 
                              InvoiceDetails.InvoiceAmount < ReceivingData.InvoiceAmount ? (ReceivingData.InvoiceAmount - InvoiceDetails.InvoiceAmount) + BusinessDetails.AvailableCreditLimit : BusinessDetails.AvailableCreditLimit ;
                              var BuyerBusinessAvailCredit = InvoiceDetails.InvoiceAmount > ReceivingData.InvoiceAmount ? BuyerBusinessDetails.AvailableCreditLimit - (InvoiceDetails.InvoiceAmount - ReceivingData.InvoiceAmount) : 
                              InvoiceDetails.InvoiceAmount < ReceivingData.InvoiceAmount ? (ReceivingData.InvoiceAmount - InvoiceDetails.InvoiceAmount) + BuyerBusinessDetails.AvailableCreditLimit : BuyerBusinessDetails.AvailableCreditLimit ;
                              // BusinessAndBranchManagement.BranchSchema.updateOne({ _id: BusinessDetails._id}, { $set: { AvailableCreditLimit:BusinessAvailCredit  }}).exec();
                              // BusinessAndBranchManagement.BusinessSchema.updateOne({ _id: BuyerBusinessDetails._id}, {$set: { AvailableCreditLimit: BuyerBusinessAvailCredit }}).exec();                              
   
                           }

                           var CustomerFCMToken = [];
                           CustomerFCMToken.push(BuyerDetails.Firebase_Token);
                           var payload = {
                              notification: {
                                 title: 'Hundi-Team',
                                 body: SellerDetails.ContactName + ' updated an invoice for ' + BuyerBusinessDetails.FirstName +''+ BuyerBusinessDetails.LastName  + ' ' +  'Invoice ID - ' + result.InvoiceNumber + ' Amount - Rs.' + result.InvoiceAmount + ' Click here to view the same.',
                                 sound: 'notify_tone.mp3'
                              },
                              data: {
                                 Customer: BuyerDetails._id,
                                 notification_type: 'SellerInvoiceCreated',
                                 click_action: 'FCM_PLUGIN_ACTIVITY',
                              }
                           };
                           if (CustomerFCMToken.length > 0) {
                              FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
                           }

                           const CreateNotification = new NotificationManagement.NotificationSchema({
                              User: null,
                              // CustomerID: resultNew.Branch,
                              CustomerID: resultNew.Business,
                              Notification_Type: 'BuyerInvoiceCreated',
                              Message: SellerDetails.ContactName + ' updated an invoice for ' + BuyerBusinessDetails.FirstName +''+ BuyerBusinessDetails.LastName  + ' ' + 'Invoice ID - ' + result.InvoiceNumber + ' Amount - Rs.' + result.InvoiceAmount + ' Click here to view the same.',
                              Message_Received: true,
                              Message_Viewed: false,
                              ActiveStatus: true,
                              IfDeleted: false,
                           });
                           CreateNotification.save();
                           res.status(200).send({ Status: true, Message: "Invoice Successfully Updated" });

                        }
                     });
                  }
               });
            } else {

               var OldInvoiceAmount = InvoiceDetails.InvoiceAmount;
               var OldInvoiceStatus = InvoiceDetails.InvoiceStatus;
               InvoiceDetails.Seller = Seller;
               InvoiceDetails.Business = ReceivingData.Business;
               InvoiceDetails.Buyer = Buyer;
               InvoiceDetails.BuyerBusiness = ReceivingData.BuyerBusiness;
               InvoiceDetails.InvoiceNumber = ReceivingData.InvoiceNumber;
               InvoiceDetails.InvoiceDate = moment(ReceivingData.InvoiceDate, "DD-MM-YYYY").toDate();
               InvoiceDetails.InvoiceDueDate = InvoiceDueDates;
               InvoiceDetails.InvoiceStatus = ReceivingData.InvoiceStatus;
               // if(ReceivingData.IfSellerIncreaseCreditLimit == true)
               // {
               //    InvoiceDetails.CurrentCreditAmount = Number(InvoiceDetails.CurrentCreditAmount) + Number(ReceivingData.SellerIncreasedCreditLimit);
               // } 
               InvoiceDetails.InvoiceAmount = ReceivingData.InvoiceAmount || 0;
               InvoiceDetails.RemainingAmount = ReceivingData.InvoiceAmount || 0;              
               InvoiceDetails.InvoiceAttachments = InvoiceAttachments || [];
               InvoiceDetails.InvoiceDescription = ReceivingData.InvoiceDescription;

               InvoiceDetails.save((err, result) => {
                  if (err) {
                     ErrorHandling.ErrorLogCreation(req, 'Invoice Update Error', 'InvoiceManagement.Controller -> Invoice_Update', JSON.stringify(err));
                     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to create the Invoice!.", Error: err });
                  } else {
                     if (InvoiceDetails.InvoiceAttachments.length !== 0) {
                        var InvoiceArr = [];
                        var InvoiceAttachments = InvoiceDetails.InvoiceAttachments;
                        InvoiceAttachments = InvoiceAttachments.map(Obj => {
                           var InvoiceObj = {
                              _id: String,
                              fileName: String,
                              fileType: String
                           };
                           var reportData = Obj.fileName.replace(/^data:[a-z]+\/[a-z]+;base64,/, "").trim();
                           var buff = Buffer.from(reportData, 'base64');
                           const fineName = 'Uploads/Invoice/' + Obj._id + '.png';
                           InvoiceObj._id = Obj._id;
                           InvoiceObj.fileName = Obj._id + '.png';
                           InvoiceObj.fileType = Obj.fileType;
                           fs.writeFileSync(fineName, buff);
                           InvoiceArr.push(InvoiceObj);
                        });
                        InvoiceManagement.InvoiceSchema.updateOne({ _id: result._id }, { InvoiceAttachments: InvoiceArr }).exec();
                     }
                     var InviteQuery = {};
                     var TempQuery = {};
                     // InviteQuery = {Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                     InviteQuery = {Seller: ReceivingData.Seller,Buyer: ReceivingData.Buyer, 
                        BuyerBusiness: ReceivingData.BuyerBusiness,Business: ReceivingData.Business,Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                     if(InvoiceDetails.TemporaryRequestId === '') {
                        TempQuery = { _id:mongoose.Types.ObjectId(0),  Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                     }else {
                        TempQuery = { _id:InvoiceDetails.TemporaryRequestId,  Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                     }
                     Promise.all([ 
                        InviteManagement.InviteManagementSchema.find(InviteQuery, {}, {}).exec(), 
                        TemporaryManagement.CreditSchema.find(TempQuery, {}, {}).exec(),
                     ]).then(Response => { 
                        var InviteDetails = JSON.parse(JSON.stringify(Response[0])); 
                        var TemporaryDetails = JSON.parse(JSON.stringify(Response[1])); 
                        if (InviteDetails.length > 0) {
                           InviteDetails.map(ObjIn => {
                              // var InviteAvailCredit = (ObjIn.AvailableLimit + InvoiceDetails.UsedCurrentCreditAmount);
                              // InviteManagement.InviteManagementSchema.updateOne({ BuyerBusiness: InvoiceDetails.BuyerBusiness._id,Business: InvoiceDetails.Business._id}, {$set: { AvailableLimit: InviteAvailCredit }})
                              InviteManagement.InviteManagementSchema.updateOne({ BuyerBusiness: InvoiceDetails.BuyerBusiness._id,Business: InvoiceDetails.Business._id})
                              .exec(function (err_1, result_1) {
                                 if (err_1) {
                                    ErrorHandling.ErrorLogCreation(req, 'Industry Details Error', 'IndustryManagement -> IndustryDetails', JSON.stringify(err_1));
                                  //  res.status(417).send({ Status: false, Message: "Some error occurred while Find The Industry Details!.", Error: err_1 });
                                }
                                else
                                {
                                 InvoiceManagement.InvoiceSchema.updateOne({"_id": { $in: InvoiceArr }}, {$set: { UsedCurrentCreditAmount : 0, UsedTemporaryCreditAmount : 0 }}).exec();
                                 if (TemporaryDetails.length > 0) {
                                    var BranchValidityDate = new Date();
                                    var BranchTodayDate = new Date();
                                    TemporaryDetails.map(obj => {
                                       BranchValidityDate = new Date(obj.updatedAt);
                                       BranchValidityDate = new Date(BranchValidityDate.setDate(BranchValidityDate.getDate() + obj.ApprovedPeriod));
                                       if (BranchValidityDate.valueOf() >= BranchTodayDate.valueOf()) {
                                          var TemporaryAmountCredit = (obj.AvailableLimit + InvoiceDetails.UsedTemporaryCreditAmount); //200 + 100
                                          // TemporaryManagement.CreditSchema.updateOne({_id:InvoiceDetails.TemporaryRequestId, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false}, {$set: { AvailableLimit: TemporaryAmountCredit }})
                                          TemporaryManagement.CreditSchema.updateOne({_id:InvoiceDetails.TemporaryRequestId, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false})
                                          .exec(function (err_1, result_2) {
                                             if(InvoiceDetails.TemporaryRequestId === '') {
                                                TempQuery = {Seller: ReceivingData.Seller,Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness,Business: ReceivingData.Business, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false};
                                             }else {
                                                TempQuery = { _id:InvoiceDetails.TemporaryRequestId,  Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                                               
                                             
                                             }
                                             Promise.all([ 
                                                InviteManagement.InviteManagementSchema.find(InviteQuery, {}, {}).exec(), 
                                                TemporaryManagement.CreditSchema.find(TempQuery, {}, {}).exec(),
                                             ]).then(Response => { 
                                                var AfterInviteDetails = JSON.parse(JSON.stringify(Response[0])); 
                                                var AfterTemporaryDetails = JSON.parse(JSON.stringify(Response[1])); 
                                               
                                                if (AfterInviteDetails.length > 0) {
                                                   AfterInviteDetails.map(ObjIn => {
                                                      // console.log(ObjIn,'ObjInObjIn');
                                                      if(Number(ObjIn.AvailableLimit) >= Number(ReceivingData.InvoiceAmount)) {
                                                         // var InviteAvailCredit = (ObjIn.AvailableLimit - ReceivingData.InvoiceAmount);
                                                         // InviteManagement.InviteManagementSchema.updateOne({ Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false}, {$set: { AvailableLimit: InviteAvailCredit }}).exec();
                                                         InviteManagement.InviteManagementSchema.updateOne({ Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false}).exec();
                                                        
                                                        InvoiceManagement.InvoiceSchema.updateOne({ _id: result._id },
                                                         {
                                                            $set: {
                                                               IfUsedTemporaryCredit: false,
                                                               IfUsedPaidTemporaryCredit:false,
                                                               CurrentCreditAmount: ObjIn.AvailableLimit,
                                                               UsedCurrentCreditAmount: ReceivingData.InvoiceAmount,
                                                               UsedTemporaryCreditAmount: 0,
                                                               TemporaryRequestId: '',
                                                               TemporaryCreditAmount: obj.ApproveLimit
                                             
                                                            }
                                                         }).exec();
                                                      } else {
                                                             if (AfterTemporaryDetails.length > 0) {
                                                               var BranchValidityDate = new Date();
                                                               var BranchTodayDate = new Date();
                                                               AfterTemporaryDetails.map(obj => {
                                                                       
                                                                  BranchValidityDate = new Date(obj.updatedAt);
                                                                  BranchValidityDate = new Date(BranchValidityDate.setDate(BranchValidityDate.getDate() + obj.ApprovedPeriod));
                                                                  if (BranchValidityDate.valueOf() >= BranchTodayDate.valueOf()) {
                                                                     var CalTemporaryAmount =  (ReceivingData.InvoiceAmount - ObjIn.AvailableLimit); //200 - 0 = 0
                                                                     var RemainingTemporaryAmount =  (obj.AvailableLimit - CalTemporaryAmount);//200 
                                                                     var RemainingAvailableAmount =  (ReceivingData.InvoiceAmount - CalTemporaryAmount) //200 -200
                                                                     
                                                                     // InviteManagement.InviteManagementSchema.updateOne({ BuyerBusiness: mongoose.Types.ObjectId(BuyerBusinessDetails._id),Business: ReceivingData.Business,Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false}, {$set: { AvailableLimit: 0 }}).exec();
                                                                     // InviteManagement.InviteManagementSchema.updateOne({ BuyerBusiness: mongoose.Types.ObjectId(BuyerBusinessDetails._id),Business: ReceivingData.Business,Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false}, {$set: { AvailableLimit: 0 }}).exec();
                                                                     // TemporaryManagement.CreditSchema.updateOne({ Seller: ReceivingData.Seller,Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, Business: ReceivingData.Business,  Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false}, {$set: { AvailableLimit: RemainingTemporaryAmount }}).exec();
                                                                     // InvoiceManagement.InvoiceSchema.updateMany({ _id: result._id },{ $set: { IfUsedTemporaryCredit: true,IfUsedPaidTemporaryCredit:true, UsedTemporaryCreditAmount : CalTemporaryAmount, CurrentCreditAmount : ObjIn.AvailableLimit, UsedCurrentCreditAmount : RemainingAvailableAmount, TemporaryRequestId: obj._id,TemporaryCreditAmount : obj.ApproveLimit}}).exec();
                                                                 
                                                                     InviteManagement.InviteManagementSchema.updateOne({ BuyerBusiness: mongoose.Types.ObjectId(BuyerBusinessDetails._id),Business: ReceivingData.Business,Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false}).exec();
                                                                     // TemporaryManagement.CreditSchema.updateOne({ Seller: ReceivingData.Seller,Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, Business: ReceivingData.Business,  Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false}).exec();
                                                                     InvoiceManagement.InvoiceSchema.updateMany({ _id: result._id },{ $set: { IfUsedTemporaryCredit: true,IfUsedPaidTemporaryCredit:true, UsedTemporaryCreditAmount : CalTemporaryAmount, CurrentCreditAmount : ObjIn.AvailableLimit, UsedCurrentCreditAmount : RemainingAvailableAmount, TemporaryRequestId: obj._id,TemporaryCreditAmount : obj.ApproveLimit}}).exec();
                                                                 

                                                                  }
                                                               });
                                                            }    
                                                      }
                                                   });
                                                }
                                             }).catch(Error => {
                                                ErrorHandling.ErrorLogCreation(req, 'Invoice And Payment, Invite Details getting Error', 'HundiScore.Controller -> CustomerDashBoard', JSON.stringify(Error));
                                              //  res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
                                             });
                                          });
                                         
                                       }
                                    });
                                 }
                                 else
                                 {
                                    if(InvoiceDetails.TemporaryRequestId === '') {
                                       TempQuery = {Seller: ReceivingData.Seller,Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness,Business: ReceivingData.Business, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false};
                                    }else {
                                       TempQuery = { _id:InvoiceDetails.TemporaryRequestId,  Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                                    }
                                    Promise.all([ 
                                       InviteManagement.InviteManagementSchema.find(InviteQuery, {}, {}).exec(), 
                                       TemporaryManagement.CreditSchema.find(TempQuery, {}, {}).exec(),
                                    ]).then(Response => { 
                                       var AfterInviteDetails = JSON.parse(JSON.stringify(Response[0])); 
                                       var AfterTemporaryDetails = JSON.parse(JSON.stringify(Response[1])); 
                                       if (AfterInviteDetails.length > 0) {
                                          AfterInviteDetails.map(ObjIn => {
                                             if(Number(ObjIn.AvailableLimit) >= Number(ReceivingData.InvoiceAmount)) {
                                                var InviteAvailCredit = (ObjIn.AvailableLimit - ReceivingData.InvoiceAmount);
                                                // InviteManagement.InviteManagementSchema.updateOne({Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false}, {$set: { AvailableLimit: InviteAvailCredit }}).exec();
                                                InviteManagement.InviteManagementSchema.updateOne({Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false}).exec();
                                                InvoiceManagement.InvoiceSchema.updateOne({ _id: result._id },
                                                {
                                                   $set: {
                                                      IfUsedTemporaryCredit: false,
                                                      IfUsedPaidTemporaryCredit: false,
                                                      CurrentCreditAmount: ObjIn.AvailableLimit,
                                                      UsedCurrentCreditAmount: ReceivingData.InvoiceAmount,
                                                      UsedTemporaryCreditAmount: 0,
                                                      TemporaryRequestId: ''
                                                   }
                                                }).exec();
                                             } else {
                                                    if (AfterTemporaryDetails.length > 0) {
                                                      var BranchValidityDate = new Date();
                                                      var BranchTodayDate = new Date();
                                                      AfterTemporaryDetails.map(obj => {
                                                         BranchValidityDate = new Date(obj.updatedAt);
                                                         BranchValidityDate = new Date(BranchValidityDate.setDate(BranchValidityDate.getDate() + obj.ApprovedPeriod));
                                                         if (BranchValidityDate.valueOf() >= BranchTodayDate.valueOf()) {
                                                            var CalTemporaryAmount =  (ReceivingData.InvoiceAmount - ObjIn.AvailableLimit);
                                                            var RemainingTemporaryAmount =  (obj.AvailableLimit - CalTemporaryAmount);
                                                            var RemainingAvailableAmount =  (ReceivingData.InvoiceAmount - CalTemporaryAmount)
                                                          
                                                            // InviteManagement.InviteManagementSchema.updateOne({ BuyerBusiness: mongoose.Types.ObjectId(BuyerBusinessDetails._id),Business: ReceivingData.Business,Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false}, {$set: { AvailableLimit: 0 }}).exec();
                                                            // InviteManagement.InviteManagementSchema.updateOne({ BuyerBusiness: mongoose.Types.ObjectId(BuyerBusinessDetails._id),Business: ReceivingData.Business,Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false}).exec();
                                                            // TemporaryManagement.CreditSchema.updateOne({ Seller: ReceivingData.Seller,Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, Business: ReceivingData.Business,  Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false}, {$set: { AvailableLimit: RemainingTemporaryAmount }}).exec();
                                                            // InvoiceManagement.InvoiceSchema.updateMany({ _id: result._id },{ $set: { IfUsedTemporaryCredit: true,IfUsedPaidTemporaryCredit: true, UsedTemporaryCreditAmount : CalTemporaryAmount, CurrentCreditAmount : ObjIn.AvailableLimit, UsedCurrentCreditAmount : RemainingAvailableAmount, TemporaryRequestId: obj._id,TemporaryCreditAmount : obj.ApproveLimit}}).exec();
                     
                                                            InviteManagement.InviteManagementSchema.updateOne({ BuyerBusiness: mongoose.Types.ObjectId(BuyerBusinessDetails._id),Business: ReceivingData.Business,Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false}).exec();
                                                            // TemporaryManagement.CreditSchema.updateOne({ Seller: ReceivingData.Seller,Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, Business: ReceivingData.Business,  Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false}).exec();
                                                            InvoiceManagement.InvoiceSchema.updateMany({ _id: result._id },{ $set: { IfUsedTemporaryCredit: true,IfUsedPaidTemporaryCredit: true, UsedTemporaryCreditAmount : CalTemporaryAmount, CurrentCreditAmount : ObjIn.AvailableLimit, UsedCurrentCreditAmount : RemainingAvailableAmount, TemporaryRequestId: obj._id,TemporaryCreditAmount : obj.ApproveLimit}}).exec();
                     
                                                         }
                                                      });
                                                   }
                                             }
                                          });
                                       }
                                    }).catch(Error => {
                                       ErrorHandling.ErrorLogCreation(req, 'Invoice And Payment, Invite Details getting Error', 'HundiScore.Controller -> CustomerDashBoard', JSON.stringify(Error));
                                     //  res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
                                    });
                                 }
                                }
                              });
                           });
                        }

                     }).catch(Error => {
                        ErrorHandling.ErrorLogCreation(req, 'Invoice And Payment, Invite Details getting Error', 'HundiScore.Controller -> CustomerDashBoard', JSON.stringify(Error));
                      //  res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
                     });
                        

                     // Seller/Buyer Credit Limit reduce
                     // if (InvoiceDetails !== ReceivingData.InvoiceAmount) {
                     //  //  var BranchAvailCredit = OldInvoiceAmount > ReceivingData.InvoiceAmount ? BranchDetails.AvailableCreditLimit - (OldInvoiceAmount - ReceivingData.InvoiceAmount) : 
                     //                            OldInvoiceAmount < ReceivingData.InvoiceAmount ? (ReceivingData.InvoiceAmount - OldInvoiceAmount) + BranchDetails.AvailableCreditLimit : BranchDetails.AvailableCreditLimit ;
                     //    var BuyerBranchAvailCredit = OldInvoiceAmount > ReceivingData.InvoiceAmount ? BuyerBranchDetails.AvailableCreditLimit - (OldInvoiceAmount - ReceivingData.InvoiceAmount) : 
                     //                                  OldInvoiceAmount < ReceivingData.InvoiceAmount ? (ReceivingData.InvoiceAmount - OldInvoiceAmount) + BuyerBranchDetails.AvailableCreditLimit : BuyerBranchDetails.AvailableCreditLimit ;
                     //  //  BusinessAndBranchManagement.BranchSchema.updateOne({ _id: BranchDetails._id}, { $set: { AvailableCreditLimit: BranchAvailCredit }}).exec();
                     //    BusinessAndBranchManagement.BranchSchema.updateOne({ _id: BuyerBranchDetails._id}, {$set: { AvailableCreditLimit: BuyerBranchAvailCredit }}).exec();                              
                     // }

                     if (InvoiceDetails !== ReceivingData.InvoiceAmount) {
                         var BusinessAvailCredit = OldInvoiceAmount > ReceivingData.InvoiceAmount ? BusinessDetails.AvailableCreditLimit - (OldInvoiceAmount - ReceivingData.InvoiceAmount) : 
                                                  OldInvoiceAmount < ReceivingData.InvoiceAmount ? (ReceivingData.InvoiceAmount - OldInvoiceAmount) + BusinessDetails.AvailableCreditLimit : BusinessDetails.AvailableCreditLimit ;
                          var BuyerBusinessAvailCredit = OldInvoiceAmount > ReceivingData.InvoiceAmount ? BuyerBusinessDetails.AvailableCreditLimit - (OldInvoiceAmount - ReceivingData.InvoiceAmount) : 
                                                        OldInvoiceAmount < ReceivingData.InvoiceAmount ? (ReceivingData.InvoiceAmount - OldInvoiceAmount) + BuyerBusinessDetails.AvailableCreditLimit : BuyerBusinessDetails.AvailableCreditLimit ;
                        //  BusinessAndBranchManagement.BranchSchema.updateOne({ _id: BusinessDetails._id}, { $set: { AvailableCreditLimit: BusinessAvailCredit }}).exec();
                        //   BusinessAndBranchManagement.BusinessSchema.updateOne({ _id: BuyerBusinessDetails._id}, {$set: { AvailableCreditLimit: BuyerBusinessAvailCredit }}).exec();                              
                        //   BusinessAndBranchManagement.BusinessSchema.updateOne({ _id: BuyerBusinessDetails._id}, {$set: { AvailableCreditLimit: BuyerBusinessAvailCredit }}).exec(); 
                       }


                     res.status(200).send({ Status: true, Response: result, Message: 'Invoice Update Successfully' });
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

// Invoice List
exports.CompleteInvoiceList = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(function (err, result) {
         if (err) {
            ErrorHandling.ErrorLogCreation(req, 'Customer Details Getting Error', 'InvoiceManagement.Controller -> Customer Details Finding Error', JSON.stringify(err));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Customer Details!.", Error: err });
         } else {
            var customerDetails = JSON.parse(JSON.stringify(result));
            if (result !== null) {
               ReceivingData.PageNumber = ReceivingData.PageNumber !== 0 && ReceivingData.PageNumber !== '' ? ReceivingData.PageNumber : 1;
               var Limit = 25 ;
               var Skip = (ReceivingData.PageNumber - 1) * Limit;
               var mainQuery = { IfDeleted: false, ActiveStatus: true };
               var SubQueryOne = { IfDeleted: false, ActiveStatus: true, InvoiceStatus: "Pending" };
               var SubQueryTwo = { IfDeleted: false, ActiveStatus: true, InvoiceStatus: "Accept" };
               var SubQueryThree = { IfDeleted: false, ActiveStatus: true, InvoiceStatus: "Disputed"};

               // User Branches Restriction
               if (customerDetails.CustomerType === 'User' &&
                  ((ReceivingData.CustomerCategory === 'Seller') ||
                     (ReceivingData.CustomerCategory === 'Buyer'))) {
                  const userBusiness = [];
                  const businessKey = ReceivingData.CustomerCategory === 'Seller' ? 'Business' : 'BuyerBusiness';
                
                       
                   customerDetails.BusinessAndBranches.map(Obj => { 
                        userBusiness.push(mongoose.Types.ObjectId(Obj.Business));
                   });
               
                  // mainQuery[businessKey] =   { $in: userBusiness };
                  mainQuery[businessKey] =  userBusiness;
                  SubQueryOne[businessKey] = { $in: userBusiness };
                  SubQueryTwo[businessKey] = { $in: userBusiness };
                  SubQueryThree[businessKey] = { $in: userBusiness };

                 
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
                  // mainQuery.Buyer = mongoose.Types.ObjectId(ReceivingData.FilterQuery.Buyer);
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
                 from: new Date(new Date(todayRange.from).setDate(new Date(todayRange.from).getDate() - 1)),
                 to: new Date(new Date(todayRange.to).setDate(new Date(todayRange.to).getDate() - 1)),
               };
               const tomorrowRange = {
                  from: new Date(new Date(todayRange.from).setDate(new Date(todayRange.from).getDate() + 1)),
                  to: new Date(new Date(todayRange.to).setDate(new Date(todayRange.to).getDate() + 1)),
               };
               const upcomingRange = {
                  from: new Date(new Date(todayRange.from).setDate(new Date(todayRange.from).getDate() + 1)),
                  to: null,
               };
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
                              DateRange === 'Tomorrow' ? tomorrowRange.from :
                              DateRange === 'AllUpcoming' ? upcomingRange.from :
                              DateRange === 'AllPrevious' ? previousRange.from :
                              DateRange === 'CurrentWeek' ? currentWeekRange.from :
                              DateRange === 'LastWeek' ? lastWeekRange.from :
                              DateRange === 'CurrentMonth' ? currentMonthRange.from :
                              DateRange === 'LastMonth' ? lastMonthRange.from :
                              DateRange === 'Custom' ? customRange.from : null ;
                              
               var ToDate = 
                              // DateRange === 'Today' ? todayRange.to : 
                              DateRange === 'Yesterday' ? yesterdayRange.to :
                              DateRange === 'Tomorrow' ? tomorrowRange.to :
                              DateRange === 'AllUpcoming' ? upcomingRange.to :
                              DateRange === 'AllPrevious' ? previousRange.to :
                              DateRange === 'CurrentWeek' ? currentWeekRange.to :
                              DateRange === 'LastWeek' ? lastWeekRange.to :
                              DateRange === 'CurrentMonth' ? currentMonthRange.to :
                              DateRange === 'LastMonth' ? lastMonthRange.to :
                              DateRange === 'Custom' ? customRange.to : null ;

                              
               // Filter Status
               if (ReceivingData.FilterQuery.StatusType === 'OverDue') {
                  ToDate = new Date(new Date(todayRange.to).setDate(new Date(todayRange.to).getDate() - 1));
                  if ( FromDate !== null && new Date(FromDate).valueOf() > new Date(ToDate).valueOf()  ) {
                     FromDate = new Date(new Date(todayRange.from).setDate(new Date(todayRange.from).getDate() - 1));
                  }
               }
               if (ReceivingData.FilterQuery.StatusType === 'Upcoming') {
                  FromDate = new Date(new Date(todayRange.from).setDate(new Date(todayRange.from).getDate() + 1));
                  if ( ToDate !== null && new Date(ToDate).valueOf() <= new Date(FromDate).valueOf()  ) {
                     ToDate = new Date(new Date(todayRange.to).setDate(new Date(todayRange.to).getDate() + 1));
                  }
               }

               if (ReceivingData.FilterQuery.StatusType === 'DueToday') {
                  FromDate = todayRange.from;
                  ToDate = todayRange.to;
               }
                  
             
               // Final Date Filter
               if (FromDate !== null || ToDate !== null) {
                  if (FromDate === null || FromDate === null) {
                     mainQuery.InvoiceDate = ToDate === null ? {$gte: FromDate} : FromDate === null ? {$lte: ToDate} : null;
                     
                     SubQueryOne.InvoiceDate = mainQuery.InvoiceDate;
                     SubQueryTwo.InvoiceDate = mainQuery.InvoiceDate;
                     SubQueryThree.InvoiceDate = mainQuery.InvoiceDate;
                  } else 
                  {
                     if (ToDate === null) 
                     {
                        mainQuery["$and"] = [{InvoiceDate: {$gte: FromDate} }];
                        SubQueryOne["$and"] = [{InvoiceDate: {$gte: FromDate} }];
                        SubQueryTwo["$and"] = [{InvoiceDate: {$gte: FromDate} }];
                        SubQueryThree["$and"] = [{InvoiceDate: {$gte: FromDate} }];
                     }
                     
                     else
                     {
                        mainQuery["$and"] = [{InvoiceDate: {$gte: FromDate} }, {InvoiceDate: {$lte: ToDate} }];
                        SubQueryOne["$and"] = [{InvoiceDate: {$gte: FromDate} }, {InvoiceDate: {$lte: ToDate} }];
                        SubQueryTwo["$and"] = [{InvoiceDate: {$gte: FromDate} }, {InvoiceDate: {$lte: ToDate} }];
                        SubQueryThree["$and"] = [{InvoiceDate: {$gte: FromDate} }, {InvoiceDate: {$lte: ToDate} }];
                     }
                    
                  }
               }
               
               
               // Search Key
               if (ReceivingData.FilterQuery.SearchKey !== '') {
                  mainQuery.InvoiceNumber = { $regex: new RegExp(".*" + ReceivingData.FilterQuery.SearchKey + ".*", "i") };
               }
              
               Promise.all([
                  InvoiceManagement.InvoiceSchema.countDocuments(SubQueryOne).exec(),
                  InvoiceManagement.InvoiceSchema.countDocuments(SubQueryTwo).exec(),
                  InvoiceManagement.InvoiceSchema.countDocuments(SubQueryThree).exec()
               ]).then(response => {
                  var OpenCount = response[0];
                  var AcceptCount = response[1];
                  var DisputeCount = response[2];
                 
                  if (ReceivingData.InvoiceType === '') {
                     if (ReceivingData.CustomerCategory === 'Seller') {
                        
                        ReceivingData.InvoiceType = DisputeCount > 0 ? "Disputed" : OpenCount > 0 ? "Pending" :  "Accept";
                     } else {
                        ReceivingData.InvoiceType = OpenCount > 0 ? "Pending" : DisputeCount> 0 ? "Disputed" :  "Accept";
                     }
                  }
                  mainQuery.InvoiceStatus = ReceivingData.InvoiceType;
                  
                  Promise.all([
                     InvoiceManagement.InvoiceSchema
                     .find(mainQuery, {}, {skip: Skip, limit: Limit,sort: { createdAt: -1 }})
                     .populate({ path: 'Seller', select: ['ContactName'] })
                     .populate({ path: 'Business', select: ['FirstName','LastName'] })
                    
                     .populate({ path: 'BuyerBusiness', select: ['FirstName','LastName'] })
                    
                     .populate({ path: 'Buyer', select: ['ContactName'] }).exec(),
                     InvoiceManagement.InvoiceSchema.countDocuments(mainQuery).exec()
                  ]).then(responseNew => {
                    
                     responseNew[0] = JSON.parse(JSON.stringify(responseNew[0]));
                     responseNew[0] = responseNew[0].map(Obj => {
               
                        // var PaymentProcess = Obj.PaidAmount === Obj.InvoiceAmount ? 'PaymentCompleted' : Obj.InvoiceAmount === (Obj.RemainingAmount + Obj.InProgressAmount) ? 'WaitForPayment' : 'PartialPayment';
                        var PaymentProcess = Obj.PaidAmount === Obj.InvoiceAmount ? 'PaymentCompleted' 
                        : Obj.InvoiceAmount === (Obj.RemainingAmount + Obj.InProgressAmount) && Obj.PaidORUnpaid === 'Paid' ?  'WaitForPaymentApproval':
                         Obj.InvoiceAmount === (Obj.RemainingAmount + Obj.InProgressAmount) ? 'WaitForPayment' : 'PartialPayment';
                        Obj.PaymentStatus = Obj.PaymentStatus !== undefined ? Obj.PaymentStatus : PaymentProcess;
                        
                        var invDate = new Date(Obj.InvoiceDueDate).valueOf();
                        var conFrom = todayRange.from.valueOf();
                        var conTo = todayRange.to.valueOf();
                        var InvoiceStatus = (invDate >= conFrom && invDate <= conTo) && PaymentProcess !== 'PaymentCompleted' ? 'DueToday' : (invDate > conTo && PaymentProcess !== 'PaymentCompleted') ? 'Upcoming' : (invDate < conFrom && PaymentProcess !== 'PaymentCompleted')  ? 'OverDue' : '';
                        Obj.StatusType = InvoiceStatus;
                        return Obj;
                     });

                     responseNew[0] = responseNew[0].map(Obj => {
                        Obj.InvoiceDueDate = moment(new Date(Obj.InvoiceDueDate)).format("YYYY-MM-DD");
                        Obj.InvoiceDate = moment(new Date(Obj.InvoiceDate)).format("YYYY-MM-DD");
                        Obj.ApprovedDate = Obj.ApprovedDate !== undefined && Obj.ApprovedDate !== null ? moment(new Date(Obj.ApprovedDate)).format("YYYY-MM-DD") : '';
                        Obj.createdAt = moment(new Date(Obj.createdAt))//.format("YYYY-MM-DD");
                        return Obj;
                     });

                     
                        const sortedInvoiceList = responseNew[0].sort((a, b) => {
                        const dateA = new Date(a.createdAt);
                        const dateB = new Date(b.createdAt);

                        // Sort in descending order
                        return dateB - dateA;
                     });

                     const Response = {
                        // InvoiceList: responseNew[0].sort((a, b) => new Date(b.InvoiceDate) - new Date(a.InvoiceDate)),
                        InvoiceList:sortedInvoiceList,
                        ActiveCount: responseNew[1],
                        OpenCount: OpenCount,
                        AcceptCount: AcceptCount,
                        DisputeCount: DisputeCount,
                        NoOfPages: responseNew[1] > Limit ? Math.ceil(responseNew[1] / Limit) : 1,
                        ActiveTab: ReceivingData.InvoiceType
                     };
                     res.status(200).send({ Status: true, Response: Response, Message: 'Invoice List' });
                  }).catch(error => {
                     ErrorHandling.ErrorLogCreation(req, 'Invoice List Getting Error', 'InvoiceManagement.Controller -> Invoice_SimpleList', JSON.stringify(error));
                     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Invoices!.", Error: JSON.stringify(error) });
                  });
               }).catch(error => {
                  ErrorHandling.ErrorLogCreation(req, 'Invoice List Getting Error', 'InvoiceManagement.Controller -> Invoice_SimpleList', JSON.stringify(error));
                  res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Invoices!.", Error: JSON.stringify(error) });
               });
            } else {
               res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
            }
         }
      });
   }
};




// Invoice List With Advanced Filter 
exports.InvoiceListWithAdvancedFilter = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(function (err, result) {
    
         if (err) {
            ErrorHandling.ErrorLogCreation(req, 'Customer Details Getting Error', 'InvoiceManagement.Controller -> Customer Details Finding Error', JSON.stringify(err));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Customer Details!.", Error: err });
         } else {
            if (result !== null) {
               var InvoiceQuery = {};
               var InviteQuery = {};
               var UsersBusinessArr = [];
               var DisputedQuery = {};
               var AcceptedQuery = {};
               var OpenQuery = {};
               if (ReceivingData.CustomerCategory === 'Seller') {
                  if (result.CustomerType === 'Owner') {
                     InvoiceQuery = { Seller: ReceivingData.CustomerId, InvoiceStatus: '', ActiveStatus: true, IfDeleted: false };
                     InviteQuery = { Seller: ReceivingData.CustomerId, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                     DisputedQuery = { Seller: ReceivingData.CustomerId, InvoiceStatus: 'Disputed', ActiveStatus: true, IfDeleted: false };
                     AcceptedQuery = { Seller: ReceivingData.CustomerId, InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false };
                     OpenQuery = { Seller: ReceivingData.CustomerId, InvoiceStatus: 'Pending', ActiveStatus: true, IfDeleted: false };
                  } else if (result.CustomerType === 'User') {
                     if (result.BusinessAndBranches.length > 0) {
                        result.BusinessAndBranches.map(Obj => {
                           if (Obj != null || Obj != 0) {
                              UsersBusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                        }
                        });
                     }

                     InvoiceQuery = { Business: { $in: UsersBusinessArr }, InvoiceStatus: '', ActiveStatus: true, IfDeleted: false };
                     InviteQuery = { Business: { $in: UsersBusinessArr }, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                     DisputedQuery = { Business: { $in: UsersBusinessArr }, InvoiceStatus: 'Disputed', ActiveStatus: true, IfDeleted: false };
                     AcceptedQuery = { Business: { $in: UsersBusinessArr }, InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false };
                     OpenQuery = { Business: { $in: UsersBusinessArr }, InvoiceStatus: 'Pending', ActiveStatus: true, IfDeleted: false };
                  }
               } else if (ReceivingData.CustomerCategory === 'Buyer') {
                  if (result.CustomerType === 'Owner') {
                     InvoiceQuery = { Buyer: ReceivingData.CustomerId, InvoiceStatus: '', ActiveStatus: true, IfDeleted: false };
                     InviteQuery = { Buyer: ReceivingData.CustomerId, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                     DisputedQuery = { Buyer: ReceivingData.CustomerId, InvoiceStatus: 'Disputed', ActiveStatus: true, IfDeleted: false };
                     AcceptedQuery = { Buyer: ReceivingData.CustomerId, InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false };
                     OpenQuery = { Buyer: ReceivingData.CustomerId, InvoiceStatus: 'Pending', ActiveStatus: true, IfDeleted: false };
                  } else if (result.CustomerType === 'User') {
                     if (result.BusinessAndBranches.length > 0) {
                        result.BusinessAndBranches.map(Obj => {

                           if (Obj != null || Obj != 0) {
                                 UsersBusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                           }
                        });
                     }
 
                     InvoiceQuery = { Business: { $in: UsersBusinessArr }, InvoiceStatus: '', ActiveStatus: true, IfDeleted: false };
                     InviteQuery = { Business: { $in: UsersBusinessArr }, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                     DisputedQuery = { Business: { $in: UsersBusinessArr }, InvoiceStatus: 'Disputed', ActiveStatus: true, IfDeleted: false };
                     AcceptedQuery = { Business: { $in: UsersBusinessArr }, InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false };
                     OpenQuery = { Business: { $in: UsersBusinessArr }, InvoiceStatus: 'Pending', ActiveStatus: true, IfDeleted: false };
                  }
               }

               Promise.all([
                  InvoiceManagement.InvoiceSchema.countDocuments(DisputedQuery),
                  InvoiceManagement.InvoiceSchema.countDocuments(AcceptedQuery),
                  InvoiceManagement.InvoiceSchema.countDocuments(OpenQuery),
                  InviteManagement.InviteManagementSchema.find(InviteQuery, {}, {}).exec()
               ]).then(Response => {
                  var DisputedDetails = JSON.parse(JSON.stringify(Response[0]));
                  var AcceptedDetails = JSON.parse(JSON.stringify(Response[1]));
                  var PendingDetails = JSON.parse(JSON.stringify(Response[2]));
                  var InviteDetails = JSON.parse(JSON.stringify(Response[3]));
                  var InvoiceTitle = ReceivingData.InvoiceStatus;
                  InvoiceQuery.InvoiceStatus = ReceivingData.InvoiceStatus;

                  if (DisputedDetails > 0 && InvoiceTitle === '') {
                    
                     InvoiceTitle = 'Disputed';
                     InvoiceQuery.InvoiceStatus = 'Disputed';
                  } else if (PendingDetails > 0 && InvoiceTitle === '') {
                     InvoiceTitle = 'Pending';
                   
                     InvoiceQuery.InvoiceStatus = 'Pending';
                  } else if (AcceptedDetails > 0 && InvoiceTitle === '') {
                 

                     InvoiceTitle = 'Accept';
                     InvoiceQuery.InvoiceStatus = 'Accept';
                  }

                  if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object') {
                     if (ReceivingData.FilterQuery.Business !== '') {
                        InvoiceQuery['Business'] = mongoose.Types.ObjectId(ReceivingData.FilterQuery.Business);
                     }


                     if (ReceivingData.FilterQuery.Seller !== '') {
                        InvoiceQuery['Seller'] = mongoose.Types.ObjectId(ReceivingData.FilterQuery.Seller);
                     }

                     if (ReceivingData.FilterQuery.Buyer !== '') {
                        InvoiceQuery['Buyer'] = mongoose.Types.ObjectId(ReceivingData.FilterQuery.Buyer);
                     }

                     if (ReceivingData.FilterQuery.BuyerBusiness !== '') {
                        InvoiceQuery['BuyerBusiness'] = mongoose.Types.ObjectId(ReceivingData.FilterQuery.BuyerBusiness);
                     }
               

                     /*************************>>>>Occcurs Here <<<<********************************* */
							var startOfDay = new Date(ReceivingData.FilterQuery.InvoiceFrom.setHours(0, 0, 0, 0));
							var endOfDay = new Date(ReceivingData.FilterQuery.InvoiceTo.setHours(23, 59, 59, 999));

                     if (ReceivingData.FilterQuery.InvoiceFrom !== '' && ReceivingData.FilterQuery.InvoiceTo === '') {
                        ReceivingData.FilterQuery.InvoiceFrom = moment(ReceivingData.FilterQuery.InvoiceFrom, "DD-MM-YYYY").toDate();
                        InvoiceQuery['$and'] = [{ ['InvoiceDate']: { $gte: startOfDay } }, { ['InvoiceDate']: { $lte: endOfDay } }];
                     }

                     if (ReceivingData.FilterQuery.InvoiceFrom !== '' && ReceivingData.FilterQuery.InvoiceTo !== '') {
                        ReceivingData.FilterQuery.InvoiceFrom = moment(ReceivingData.FilterQuery.InvoiceFrom, "DD-MM-YYYY").toDate();
                        ReceivingData.FilterQuery.InvoiceTo = moment(ReceivingData.FilterQuery.InvoiceTo, "DD-MM-YYYY").toDate();
                        InvoiceQuery['$and'] = [{ ['InvoiceDate']: { $gte: startOfDay } }, { ['InvoiceDate']: { $lte: endOfDay } }];
                     }
                     /*************************>>>> Occcurs Here <<<<********************************* */

                  }
                
                  InvoiceManagement.InvoiceSchema
                     .aggregate([
                        { $match: InvoiceQuery },
                        {
                           $lookup: {
                              from: "Business",
                              let: { "business": "$Business" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                                 { $project: { "FirstName": 1,"LastName": 1 } }
                              ],
                              as: 'Business'
                           }
                        },
                        { $unwind: "$Business" },
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
                                 { $project: { "FirstName": 1,"LastName": 1 } }
                              ],
                              as: 'BuyerBusiness'
                           }
                        },
                        { $unwind: "$BuyerBusiness" },
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
                        {
                           $project: {
                              Business: 1,
                              Seller: 1,
                              BuyerBusiness: 1,
                              Buyer: 1,
                              InvoiceNumber: 1,
                              InvoiceDate: 1,
                              InvoiceDueDate:1,
                              ApprovedDate: 1,
                              IfBuyerApprove: 1,
                              IfBuyerNotify: 1,
                              InvoiceStatus: 1,
                              CurrentCreditAmount: 1,
                              UsedCurrentCreditAmount: 1,
                              PaidCurrentCreditAmount: 1,
                              TemporaryCreditAmount:  1,
                              UsedTemporaryCreditAmount: 1,
                              PaidTemporaryCreditAmount: 1,
                              InvoiceAmount: 1,
                              RemainingAmount: 1,
                              PaidAmount: 1,
                              InProgressAmount: 1,
                              IfUsedTemporaryCredit: 1,
                              IfUsedPaidTemporaryCredit:1,
                              TemporaryRequestId: 1,
                              InvoiceDescription: 1,
                              Remarks: 1,
                              DisputedRemarks: 1,
                              ResendRemarks: 1,
                              AcceptRemarks: 1,
                              PaidORUnpaid: 1,
                              InvoiceAttachments: 1,
                              ActiveStatus: 1,
                              IfDeleted: 1,
                           }
                        },
                     ]).exec((ErrorRes, ResponseRes) => {
                        if (ErrorRes) {
                           ErrorHandling.ErrorLogCreation(req, 'Invoice Details Getting Error', 'InvoiceManagement.Controller -> Invoice Details Error', JSON.stringify(ErrorRes));
                           res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Invoice!.", Error: ErrorRes });
                        } else {
                           ResponseRes = JSON.parse(JSON.stringify(ResponseRes));
                           if (InvoiceTitle === '') {
                              res.status(200).send({ Status: true, Message: 'Invoice Details', InvoiceTitle: 'Pending', Response: [] });
                           } else {
                              var ResponseInvoice = [];
                              if (InvoiceTitle === 'Accept') {
                                 var TodayDate = new Date();
                                 TodayDate = new Date(TodayDate.setHours(0, 0, 0, 0));
                                 ResponseRes = ResponseRes.map(Obj => {
                                    var OverInvoiceDate = new Date(Obj.InvoiceDate);
                                    var DueTodayDate = new Date(Obj.InvoiceDate);
                                    Obj.PaymentTimeline = 'All';
                                    if (Obj.RemainingAmount > 0) {
                                       if (Obj.InvoiceAmount === Obj.RemainingAmount) {
                                          Obj.PaymentProcess = 'WaitForPayment';
                                       } else {
                                          Obj.PaymentProcess = 'PartialPayment';
                                       }
                                    } else {
                                       Obj.PaymentProcess = 'PaymentCompleted';
                                    }

                                    if (Obj.RemainingAmount > 0 && ReceivingData.PaymentTimeline !== 'All') {
                                       const InviteDetailsArr = InviteDetails.filter(obj =>
                                          (obj.Business === Obj.Business._id && obj.Seller === Obj.Seller._id) ||
                                          (obj.BuyerBusiness === Obj.BuyerBusiness._id && obj.Buyer === Obj.Buyer._id));

                                       if (InviteDetailsArr.length > 0) {
                                          InviteDetailsArr.map(obj => {
                                             OverInvoiceDate = new Date(OverInvoiceDate.setDate(OverInvoiceDate.getDate() + obj.BuyerPaymentCycle + 1));
                                             DueTodayDate = new Date(DueTodayDate.setDate(DueTodayDate.getDate() + obj.BuyerPaymentCycle));
                                          });
                                          // OverDue Invoice Details     
                                          if (OverInvoiceDate.valueOf() < TodayDate.valueOf()) {
                                             Obj.PaymentTimeline = 'OverDue';
                                          }

                                          // DueToday Invoice Details
                                          if (DueTodayDate.toLocaleDateString() === TodayDate.toLocaleDateString()) {
                                             Obj.PaymentTimeline = 'DueToday';
                                          }

                                          //UpComping Invoice Details
                                          if (DueTodayDate.toLocaleDateString() !== TodayDate.toLocaleDateString() && OverInvoiceDate.valueOf() > TodayDate.valueOf()) {
                                             Obj.PaymentTimeline = 'UpComing';
                                          }
                                       }
                                    }
                                    Obj.InvoiceDate = moment(new Date(Obj.InvoiceDate)).format("YYYY-MM-DD");
                                    return Obj;
                                 });
                                 ResponseRes.map(Obj => {
                                    if (Obj.PaymentTimeline === ReceivingData.PaymentTimeline) {
                                       ResponseInvoice.push(Obj);
                                    }
                                 });
                              } else {
                                 ResponseRes.map(Obj => {
                                    Obj.PaymentTimeline = '';
                                    Obj.PaymentProcess = 'Invoice' + InvoiceTitle;
                                    Obj.InvoiceDate = moment(new Date(Obj.InvoiceDate)).format("YYYY-MM-DD");
                                    ResponseInvoice.push(Obj);
                                 });
                              }
                              res.status(200).send({ Status: true, Message: 'Invoice Details', InvoiceTitle: InvoiceTitle, Response: ResponseInvoice });
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

// Invoice List 
exports.Invoice_SimpleList = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Seller || ReceivingData.Seller === '') {
      res.status(400).send({ Status: false, Message: "Customer can not be empty" });
   } else if (!ReceivingData.Business || ReceivingData.Business === '') {
      res.status(400).send({ Status: false, Message: "Business can not be empty" });
   } else {
      ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
      ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
      InvoiceManagement.InvoiceSchema.aggregate([
         { $match: { Seller: ReceivingData.Seller, Business: ReceivingData.Business} },
         { $project: { "InvoiceNumber": 1 } }
      ]).exec((err, result) => {
         if (err) {
            ErrorHandling.ErrorLogCreation(req, 'Invoice List Getting Error', 'InvoiceManagement.Controller -> Invoice_SimpleList', JSON.stringify(err));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Invoice!.", Error: err });
         } else {
            res.status(200).send({ Status: true, Response: result, Message: 'Invoice List' });
         }
      });
   }
};

// Invoice Details Edit API
exports.InvoiceDetails = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Invoice || ReceivingData.Invoice === '') {
      res.status(400).send({ Status: false, Message: "Invoice details can not be empty" });
   } else {
      ReceivingData.Invoice = mongoose.Types.ObjectId(ReceivingData.Invoice);
      InvoiceManagement.InvoiceSchema.findOne({
         _id: ReceivingData.Invoice,
         ActiveStatus: true,
         IfDeleted: false,
      }, {}, {})
         .populate({ path: 'Business', select: ['FirstName','LastName', 'BusinessCreditLimit', 'AvailableCreditLimit'] })
         .populate({ path: 'BuyerBusiness', select: ['FirstName','LastName', 'BusinessCreditLimit', 'AvailableCreditLimit'] })
         .populate({ path: 'Buyer', select: ['ContactName'] }).exec(function (err, result) {
           
            if (err) {
               ErrorHandling.ErrorLogCreation(req, 'Invoice Details Getting Error', 'InvoiceManagement.Controller -> Invoice_EditDetails', JSON.stringify(err));
               res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Invoice!.", Error: err });
            } else {
               var CheckInvoiceAmounts = 0;
               if (result !== null) {
                  Promise.all([
                     BusinessAndBranchManagement.BusinessSchema.find({_id:result.BuyerBusiness._id,ActiveStatus:true,IfDeleted:false},{},{}).exec(),
                     InvoiceManagement.InvoiceSchema.find({ _id: ReceivingData.Invoice,Buyer:result.Buyer._id,BuyerBusiness:result.BuyerBusiness._id,
                     ActiveStatus:true,IfDeleted:false},{},{}).exec(),
                        InviteManagement.InviteManagementSchema.find({Buyer: result.Buyer._id, BuyerBusiness:result.BuyerBusiness._id, Invite_Status: 'Accept',ActiveStatus:true,IfDeleted:false},{},{}).exec()
                     ]).then(Response => {
                     var BuyerBusinessDetails = JSON.parse(JSON.stringify(Response[0]));
                     var OpenInvoiceDetails = JSON.parse(JSON.stringify(Response[1]));
                     var InviteDetails = JSON.parse(JSON.stringify(Response[2]));
                        
                     if (BuyerBusinessDetails !== null && OpenInvoiceDetails !== null && InviteDetails !== null) {
                        var InviteAvailableAmount = 0;
                        var InvoiceTotalAmount = 0;
                        var IfUsedTemporaryCredit ;
                        
                        InviteDetails.map(obj=>{
                          InviteAvailableAmount = obj.AvailableLimit;
                        });

                        OpenInvoiceDetails.map(obbj=>{
                          InvoiceTotalAmount += obbj.InvoiceAmount;
                          IfUsedTemporaryCredit = obbj.IfUsedTemporaryCredit
                        });
                        
                        // if (InviteAvailableAmount > InvoiceTotalAmount && IfUsedTemporaryCredit === false) {
                        //    CheckInvoiceAmounts = InviteAvailableAmount -InvoiceTotalAmount;
                         
                        //  } else if (InviteAvailableAmount < InvoiceTotalAmount && IfUsedTemporaryCredit === false) {
                        //    CheckInvoiceAmounts = InvoiceTotalAmount - InviteAvailableAmount; 
                          
                        //  }

                         if (IfUsedTemporaryCredit === false) {
                           CheckInvoiceAmounts = InvoiceTotalAmount;
                         } 
                          if ( IfUsedTemporaryCredit === true) {
                           CheckInvoiceAmounts = InvoiceTotalAmount;
                         
                         } 
                      
                        //  if (InviteAvailableAmount > InvoiceTotalAmount && IfUsedTemporaryCredit === true) {
                        //    CheckInvoiceAmounts = InvoiceTotalAmount;
                         
                        //  } else if (InviteAvailableAmount < InvoiceTotalAmount && IfUsedTemporaryCredit === true) {
                        //    CheckInvoiceAmounts = InvoiceTotalAmount; 
                          
                        //  }
                      
                     }
                 
                  result = JSON.parse(JSON.stringify(result));
                  // result.BuyerBusiness.AvailableCreditLimit =  result.BuyerBusiness.AvailableCreditLimit - CheckInvoiceAmounts;
                  result.BuyerBusiness.AvailableCreditLimit = CheckInvoiceAmounts;
                  result.InvoiceDate = new Date(result.InvoiceDate);
                  result.InvoiceDate = moment(result.InvoiceDate).format('YYYY-MM-DD');``
                  result.InvoiceDueDate = moment(result.InvoiceDueDate).format('YYYY-MM-DD');
                  res.status(200).send({ Status: true, Message: 'Invoice Details', Response: result });
               });
               } else {
                  res.status(400).send({ Status: false, Message: "Invalid Invoice Details!" });
               }
            }
         });
   }
};



// Invoice Business And Branch Details 
exports.InvoiceBusinessAndBranch_List = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Seller || ReceivingData.Seller === '') {
      res.status(400).send({ Status: false, Message: "Seller can not be empty" });
   } else if (!ReceivingData.Business || ReceivingData.Business === '') {
      res.status(400).send({ Status: false, Message: "Business can not be empty" });
   } else {
      ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
      ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
      InvoiceManagement.InvoiceSchema.aggregate([
         { $match: { Seller: ReceivingData.Seller, ActiveStatus: true, IfDeleted: false } },
         {
            $lookup: {
               from: "Customers",
               let: { "seller": "$Seller" },
               pipeline: [
                  { $match: { $expr: { $eq: ["$$seller", "$_id"] } } },
                  { $project: { "ContactName": 1, "Mobile": 1, "Email": 1, "CustomerCategory": 1, "CustomerType": 1 } }
               ],
               as: 'SellerInfo'
            }
         },
         {
            $lookup: {
               from: "Business",
               let: { "business": ReceivingData.Business },
               pipeline: [
                  { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                  { $project: { "FirstName": 1,"LastName": 1, "BusinessCategory": 1, "Industry": 1, "BusinessCreditLimit": 1, "AvailableCreditLimit": 1 } }
               ],
               as: 'BusinessInfo'
            }
         },
         { $unwind: { path: "$BusinessInfo", preserveNullAndEmptyArrays: true } },
         {
            $lookup: {
               from: "IndustryManagement",
               let: { "industry": "$BusinessInfo.Industry" },
               pipeline: [
                  { $match: { $expr: { $eq: ["$$industry", "$_id"] } } },
                  { $project: { "Industry_Name": 1, "Status": 1 } }
               ],
               as: 'BusinessInfo.Industries'
            }
         },
         {
            $lookup: {
               from: "Customers",
               let: { "buyer": "$Buyer" },
               pipeline: [
                  { $match: { $expr: { $eq: ["$$buyer", "$_id"] } } },
                  { $project: { "ContactName": 1, "Mobile": 1, "Email": 1, "CustomerCategory": 1, "CustomerType": 1 } }
               ],
               as: 'BuyerInfo'
            }
         },
         {
            $project: {
               "SellerInfo": 1,
               "BusinessInfo": 1,
               "BuyerInfo": 1,
               "InvoiceNumber": 1,
               "InvoiceDate": 1,
               "InvoiceAmount": 1,
               "InvoiceDescription": 1,
               "InvoiceAttachments": 1
            }
         }
      ]).exec((err, result) => {
         if (err) {
            ErrorHandling.ErrorLogCreation(req, 'InvoiceBusiness List Getting Error', 'InvoiceManagement.Controller -> InvoiceBusinessAndBranch_DetailsList', JSON.stringify(err));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Invoice!.", Error: err });
         } else {
            res.status(200).send({ Status: true, Response: result, Message: 'InvoiceBusiness List' });
         }
      });
   }
};

// InvoiceBusiness Details 
exports.InvoiceBusiness_List = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Seller || ReceivingData.Seller === '') {
      res.status(400).send({ Status: false, Message: "Seller can not be empty" });
   } else if (!ReceivingData.Business || ReceivingData.Business === '') {
      res.status(400).send({ Status: false, Message: "Business can not be empty" });
   } else {
      ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
      ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
      InvoiceManagement.InvoiceSchema.aggregate([
         { $match: { Seller: ReceivingData.Seller, ActiveStatus: true, IfDeleted: false } },
         {
            $lookup: {
               from: "Customers",
               let: { "seller": "$Seller" },
               pipeline: [
                  { $match: { $expr: { $eq: ["$$seller", "$_id"] } } },
                  { $project: { "ContactName": 1, "Mobile": 1, "Email": 1, "CustomerCategory": 1, "CustomerType": 1 } }
               ],
               as: 'SellerInfo'
            }
         },
         {
            $lookup: {
               from: "Business",
               let: { "business": ReceivingData.Business },
               pipeline: [
                  { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                  { $project: { "FirstName": 1,"LastName": 1, "industry": 1, "BusinessCategory": 1, "BusinessCreditLimit": 1, "AvailableCreditLimit": 1 } }
               ],
               as: 'BusinessInfo'
            }
         },
         { $unwind: { path: "$BusinessInfo", preserveNullAndEmptyArrays: true } },
         {
            $lookup: {
               from: "IndustryManagement",
               let: { "industry": "$BusinessInfo.Industry" },
               pipeline: [
                  { $match: { $expr: { $eq: ["$$industry", "$_id"] } } },
                  { $project: { "Industry_Name": 1, "Status": 1 } }
               ],
               as: 'BusinessInfo.Industries'
            }
         },
         {
            $lookup: {
               from: "Customers",
               let: { "buyer": "$Buyer" },
               pipeline: [
                  { $match: { $expr: { $eq: ["$$buyer", "$_id"] } } },
                  { $project: { "ContactName": 1, "Mobile": 1, "Email": 1, "CustomerCategory": 1, "CustomerType": 1 } }
               ],
               as: 'BuyerInfo'
            }
         },
         {
            $project: {
               "SellerInfo": 1,
               "BusinessInfo": 1,
               "BuyerInfo": 1,
               "InvoiceNumber": 1,
               "InvoiceDate": 1,
               "InvoiceAmount": 1,
               "InvoiceDescription": 1,
               "InvoiceAttachments": 1
            }
         }
      ]).exec((err, result) => {
         if (err) {
            ErrorHandling.ErrorLogCreation(req, 'InvoiceBusiness List Getting Error', 'InvoiceManagement.Controller -> InvoiceBusiness_DetailsList', JSON.stringify(err));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Invoice!.", Error: err });
         } else {
            res.status(200).send({ Status: true, Response: result, Message: 'InvoiceBusiness List' });
         }
      });
   }
};

// InvoiceBranch List
exports.InvoiceBranch_List = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Seller || ReceivingData.Seller === '') {
      res.status(400).send({ Status: false, Message: "Seller can not be empty" });
   } else if (!ReceivingData.Branch || ReceivingData.Branch === '') {
      res.status(400).send({ Status: false, Message: "Branch can not be empty" });
   } else {
      ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
      ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);
      InvoiceManagement.InvoiceSchema.aggregate([
         { $match: { Seller: ReceivingData.Seller, ActiveStatus: true, IfDeleted: false } },
         {
            $lookup: {
               from: "Customers",
               let: { "seller": "$Seller" },
               pipeline: [
                  { $match: { $expr: { $eq: ["$$seller", "$_id"] } } },
                  { $project: { "ContactName": 1, "Mobile": 1, "Email": 1, "CustomerCategory": 1, "CustomerType": 1 } }
               ],
               as: 'SellerInfo'
            }
         },
         {
            $lookup: {
               from: "Branch",
               let: { "branch": ReceivingData.Branch },
               pipeline: [
                  { $match: { $expr: { $eq: ["$$branch", "$_id"] } } },
                  { $project: { "BranchName": 1, "BranchCreditLimit": 1, "BrachCategory": 1, "Mobile": 1, "Address": 1, "RegistrationId": 1, "AvailableCreditLimit": 1, "GSTIN": 1 } }
               ],
               as: 'BranchInfo'
            }
         },
         {
            $lookup: {
               from: "Customers",
               let: { "buyer": "$Buyer" },
               pipeline: [
                  { $match: { $expr: { $eq: ["$$buyer", "$_id"] } } },
                  { $project: { "ContactName": 1, "Mobile": 1, "Email": 1, "CustomerCategory": 1, "CustomerType": 1 } }
               ],
               as: 'BuyerInfo'
            }
         },
         {
            $project: {
               "SellerInfo": 1,
               "BranchInfo": 1,
               "BuyerInfo": 1,
               "InvoiceNumber": 1,
               "InvoiceDate": 1,
               "InvoiceAmount": 1,
               "InvoiceDescription": 1,
               "InvoiceAttachments": 1
            }
         }
      ]).exec((err, result) => {
         if (err) {
            ErrorHandling.ErrorLogCreation(req, 'InvoiceBranch List Getting Error', 'InvoiceManagement.Controller -> InvoiceBranch_DetailsList', JSON.stringify(err));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Invoice!.", Error: err });
         } else {
            res.status(200).send({ Status: true, Response: result, Message: 'InvoiceBranch List' });
         }
      });
   }
};

// ********* Changes 3 API into One API *********
// Buyer Invoice List for Multi Select
exports.BuyerInvoice_PendingList = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Seller || ReceivingData.Seller === '') {
      res.status(400).send({ Status: false, Message: "Seller can not be empty" });
   } else if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
      res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
   } else if (!ReceivingData.Business || ReceivingData.Business === '') {
      res.status(400).send({ Status: false, Message: "Business can not be empty" });
   } else {
      ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
      ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
      ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);

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

            InvoiceManagement.InvoiceSchema.find({
               Seller: Seller, Buyer: Buyer, Business: ReceivingData.Business, InvoiceStatus: 'Pending', ActiveStatus: true
            }, {}, {})
               .populate({ path: 'Business', select: ['FirstName','LastName', 'BusinessCreditLimit', 'AvailableCreditLimit'] })
               .populate({ path: 'BuyerBusiness', select: ['FirstName','LastName', 'BusinessCreditLimit', 'AvailableCreditLimit'] })
               .populate({ path: 'Buyer', select: ['ContactName'] }).exec((err, result) => {
                  if (err) {
                     ErrorHandling.ErrorLogCreation(req, 'Invoice List Getting Error', 'InvoiceManagement.Controller -> BuyerInvoice_PendingList', JSON.stringify(err));
                     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Invoice!.", Error: err });
                  } else {
                     if (result.length > 0) {
                        result.map(Obj => {
                           Obj.InvoiceDate = new Date(Obj.InvoiceDate.toLocaleString());
                           return Obj;
                        });
                     }
                     res.status(200).send({ Status: true, Response: result, Message: 'Buyer Pending Invoice List' });
                  }
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
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
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
               PaymentModel.PaymentSchema.find({
                  Buyer: Buyer,
                  Seller: Seller,
                  BuyerBusiness: ReceivingData.BuyerBusiness,
                  Business: ReceivingData.Business,
                  $or: [{ Payment_Status: 'Pending' }, { Payment_Status: 'Disputed' }], ActiveStatus: true
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
                     const InvoiceWithPayment = InvoiceArr.filter(obj => 
                          
                        //parse string prob
                        // JSON.parse(JSON.stringify(obj.InvoiceId)) === JSON.parse(JSON.stringify(Obj._id)) 

                        //resolved as String method using JS
                        String(obj.InvoiceId) === String(Obj._id)
                        
                        );
                     
                     if (InvoiceWithPayment.length > 0) {
                        var PaidForInvoiceAmount = 0;
                        InvoiceWithPayment.map(obj => {
                          
                           PaidForInvoiceAmount = parseFloat(PaidForInvoiceAmount) + parseFloat(obj.InProgressAmount);  
             
                        });
                        var LessThanInvoiceAmount = parseFloat(Obj.InvoiceAmount) - parseFloat(PaidForInvoiceAmount);
                        // console.log(LessThanInvoiceAmount,'LessThanInvoiceAmountLessThanInvoiceAmount');
                        // Obj.RemainingAmount = LessThanInvoiceAmount;
                        if (Obj.RemainingAmount > 0) {
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

// Buyer Accepted Dispute List
exports.BuyerInvoice_DisputeList = function (req, res) {
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
         BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.BuyerBusiness, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      
      ]).then(Response => {

         var SellerDetails = Response[0];
         var BusinessDetails = Response[1];
         var BuyerDetails = Response[2];
         var BuyerBusinessDetails = Response[3];
         var BuyerBusinessArr = [ReceivingData.BuyerBusiness];
         var SellerBusinessArr = [ReceivingData.SellerBusiness];

         if (SellerDetails !== null && BusinessDetails !== null && BuyerDetails !== null) {
            var Seller;
            var Buyer;
            // if (SellerDetails.CustomerType === 'Owner') {
            //    Seller = mongoose.Types.ObjectId(SellerDetails._id);
            // } else if (SellerDetails.CustomerType === 'User') {
            //    Seller = mongoose.Types.ObjectId(SellerDetails.Owner);
            //    if (SellerDetails.BusinessAndBranches !== 0) {
            //       SellerDetails.BusinessAndBranches.map(Obj => {
            //          Obj.Branches.map(obj => {
            //             SellerBranchArr.push(mongoose.Types.ObjectId(obj));
            //          });
            //       });
            //    }
            // }

            if (SellerDetails.CustomerType === 'Owner') {
               Seller = mongoose.Types.ObjectId(SellerDetails._id);
            } else if (SellerDetails.CustomerType === 'User') {
               Seller = mongoose.Types.ObjectId(SellerDetails.Owner);
               if (SellerDetails.BusinessAndBranches !== 0) {
                  SellerDetails.BusinessAndBranches.map(Obj => {
                     Obj.Business.map(obj => {
                        SellerBusinessArr.push(mongoose.Types.ObjectId(obj));
                     });
                  });
               }
            }
   

            // if (BuyerDetails.CustomerType === 'Owner') {
            //    Buyer = mongoose.Types.ObjectId(BuyerDetails._id);
            // } else if (BuyerDetails.CustomerType === 'User') {
            //    Buyer = mongoose.Types.ObjectId(BuyerDetails.Owner);
            //    if (BuyerDetails.BusinessAndBranches !== 0) {
            //       BuyerDetails.BusinessAndBranches.map(Obj => {
            //          Obj.Branches.map(obj => {
            //             BuyerBranchArr.push(mongoose.Types.ObjectId(obj));
            //          });
            //       });
            //    }
            // }

            if (BuyerDetails.CustomerType === 'Owner') {
               Buyer = mongoose.Types.ObjectId(BuyerDetails._id);
            } else if (BuyerDetails.CustomerType === 'User') {
               Buyer = mongoose.Types.ObjectId(BuyerDetails.Owner);
               if (BuyerDetails.BusinessAndBranches !== 0) {
                  BuyerDetails.BusinessAndBranches.map(Obj => {
                     Obj.Business.map(obj => {
                        BuyerBusinessArr.push(mongoose.Types.ObjectId(obj));
                     });
                  });
               }
            }

            InvoiceManagement.InvoiceSchema.find({

               Buyer: Buyer,
               Seller: Seller,
               BuyerBusiness: ReceivingData.BuyerBusiness,
               Business: ReceivingData.Business,
               InvoiceStatus: 'Disputed', ActiveStatus: true
            }, {}, {})
               .populate({ path: 'Business', select: ['FirstName','LastName', 'BusinessCreditLimit', 'AvailableCreditLimit'] })
               .populate({ path: 'BuyerBusiness', select: ['FirstName','LastName', 'BusinessCreditLimit', 'AvailableCreditLimit'] })
               .populate({ path: 'Buyer', select: ['ContactName'] }).exec((err, result) => {
                  if (err) {
                     ErrorHandling.ErrorLogCreation(req, 'Invoice List Getting Error', 'InvoiceManagement.Controller -> BuyerInvoice_DisputedList', JSON.stringify(err));
                     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Invoice!.", Error: err });
                  } else {
                     if (result.length > 0) {
                        result = JSON.parse(JSON.stringify(result));
                        result = result.map(Obj => {
                           Obj.InvoiceDate = moment(new Date(Obj.InvoiceDate)).format("YYYY-MM-DD");
                           return Obj;
                        });
                     }
                     res.status(200).send({ Status: true, Response: result, Message: 'Buyer Disputed Invoice List' });
                  }
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

// ********* Changes 3 API into One API END *********


// Seller Business And Branches Invoice List for Seller 
exports.Seller_InvoiceCount = function (req, res) {
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
                     InvoiceManagement.InvoiceSchema.find({ Seller: ReceivingData.Seller, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     InvoiceManagement.InvoiceSchema.find({ Seller: ReceivingData.Seller, ActiveStatus: true, InvoiceStatus: 'Pending', IfDeleted: false }, {}, {}).exec(),
                     PaymentModel.PaymentSchema.find({ Seller: ReceivingData.Seller, Payment_Status: "Pending" }, {}, {}).exec(),
                
                  ]).then(ResponseOU => {
                     var BusinessDetails = JSON.parse(JSON.stringify(ResponseOU[0]));
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
                           //       ObjB.TotalInvoiceAmount = 0;
                           //       ObjB.TotalPaymentAmount = 0;
                           //       ObjB.UserDetails = [];
                           //       const InvoiceDetailsBranchArr = InvoicePendingDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Branch)) === JSON.parse(JSON.stringify(ObjB._id)));
                           //       const InvoiceAcceptDetailsBranchArr = PendingPaymentDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Branch)) === JSON.parse(JSON.stringify(ObjB._id)));
                           //       ObjB.InvoiceCount = InvoiceDetailsBranchArr.length;
                           //       ObjB.PaymentCount = InvoiceAcceptDetailsBranchArr.length;
                           //       const InvoiceDetailsBranchArray = InvoiceDetails.filter(obj1 => obj1.Branch === ObjB._id);
                           //       if (InvoiceDetailsBranchArray.length > 0) {
                           //          var InvoiceAmount = 0;
                           //          InvoiceDetailsBranchArray.map(obj => {
                           //             InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.RemainingAmount);
                           //          });
                           //          ObjB.TotalInvoiceAmount = parseFloat(InvoiceAmount);
                           //          ObjB.TotalInvoiceAmount = ObjB.TotalInvoiceAmount.toFixed(2);
                           //          ObjB.TotalInvoiceAmount = parseFloat(ObjB.TotalInvoiceAmount);
                           //          ObjB.TotalPaymentAmount = parseFloat(InvoiceAmount);
                           //          ObjB.TotalPaymentAmount = ObjB.TotalPaymentAmount.toFixed(2);
                           //          ObjB.TotalPaymentAmount = parseFloat(ObjB.TotalPaymentAmount);
                           //       }

                           //       const PaymentBranchArray = PendingPaymentDetails.filter(obj1 => obj1.Branch === ObjB._id);
                           //       if (PaymentBranchArray.length > 0) {
                           //          var PaymentAmount = 0;
                           //          PaymentBranchArray.map(obj => {
                           //             PaymentAmount = parseFloat(PaymentAmount) + parseFloat(obj.PaymentAmount);
                           //          });
                           //          // ObjB.TotalPaymentAmount = parseFloat(PaymentAmount);
                           //          //  ObjB.TotalPaymentAmount = ObjB.TotalPaymentAmount.toFixed(2);
                           //          //  ObjB.TotalPaymentAmount = parseFloat(ObjB.TotalPaymentAmount);                                                                                         
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
                        
                     });
                  }

                  Promise.all([
                     BusinessAndBranchManagement.BusinessSchema.find({ _id: { $in: BuyerBusinessArray }, IfSeller: true, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     InvoiceManagement.InvoiceSchema.find({ PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     InvoiceManagement.InvoiceSchema.find({ ActiveStatus: true, InvoiceStatus: 'Pending', IfDeleted: false }, {}, {}).exec(),
                     PaymentModel.PaymentSchema.find({ Payment_Status: "Pending" }, {}, {}).exec(),
                 
                  ]).then(ResponseOU => {
                     var BusinessDetails = JSON.parse(JSON.stringify(ResponseOU[0]));
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
                           //       ObjB.TotalInvoiceAmount = 0;
                           //       ObjB.TotalPaymentAmount = 0;
                           //       const InvoiceDetailsBranchArr = InvoicePendingDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Branch)) === JSON.parse(JSON.stringify(ObjB._id)));
                           //       const InvoiceAcceptDetailsBranchArr = PendingPaymentDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Branch)) === JSON.parse(JSON.stringify(ObjB._id)));
                           //       ObjB.InvoiceCount = InvoiceDetailsBranchArr.length;
                           //       ObjB.PaymentCount = InvoiceAcceptDetailsBranchArr.length;
                           //       const InvoiceDetailsBranchArray = InvoiceDetails.filter(obj1 => obj1.Branch === ObjB._id);
                           //       if (InvoiceDetailsBranchArray.length > 0) {
                           //          var InvoiceAmount = 0;
                           //          InvoiceDetailsBranchArray.map(obj => {
                           //             InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.RemainingAmount);
                           //          });
                           //          ObjB.TotalInvoiceAmount = parseFloat(InvoiceAmount);
                           //          ObjB.TotalInvoiceAmount = ObjB.TotalInvoiceAmount.toFixed(2);
                           //          ObjB.TotalInvoiceAmount = parseFloat(ObjB.TotalInvoiceAmount);
                           //          ObjB.TotalPaymentAmount = parseFloat(InvoiceAmount);
                           //          ObjB.TotalPaymentAmount = ObjB.TotalPaymentAmount.toFixed(2);
                           //          ObjB.TotalPaymentAmount = parseFloat(ObjB.TotalPaymentAmount);
                           //       }

                           //       const PaymentBranchArray = PendingPaymentDetails.filter(obj1 => obj1.Branch === ObjB._id);
                           //       if (PaymentBranchArray.length > 0) {
                           //          var PaymentAmount = 0;
                           //          PaymentBranchArray.map(obj => {
                           //             PaymentAmount = parseFloat(PaymentAmount) + parseFloat(obj.PaymentAmount);
                           //          });
                           //          // ObjB.TotalPaymentAmount = parseFloat(PaymentAmount);
                           //          // ObjB.TotalPaymentAmount = ObjB.TotalPaymentAmount.toFixed(2);
                           //          // ObjB.TotalPaymentAmount = parseFloat(ObjB.TotalPaymentAmount);
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

exports.Buyer_InvoiceCount = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
      res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
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
                     InviteManagement.InviteManagementSchema.find({ Buyer: ReceivingData.Buyer, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     TemporaryManagement.CreditSchema.find({ Buyer: ReceivingData.Buyer, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     InvoiceManagement.InvoiceSchema.find({ Buyer: ReceivingData.Buyer, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     InvoiceManagement.InvoiceSchema.find({ Buyer: ReceivingData.Buyer, ActiveStatus: true, InvoiceStatus: 'Pending', IfDeleted: false }, {}, {}).exec(),
                     PaymentModel.PaymentSchema.find({ Buyer: ReceivingData.Buyer, Payment_Status: "Pending" }, {}, {}).exec(),
                     InvoiceManagement.InvoiceSchema.find({ Buyer: ReceivingData.Buyer, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),

                  ]).then(ResponseOU => {
                     var BusinessDetails = JSON.parse(JSON.stringify(ResponseOU[0]));
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
                           //       const InvoiceDetailsBranchArr = InvoicePendingDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.BuyerBranch)) === JSON.parse(JSON.stringify(ObjB._id)));
                           //       const InvoiceAcceptDetailsBranchArr = InvoiceAcceptList.filter(obj1 => JSON.parse(JSON.stringify(obj1.BuyerBranch)) === JSON.parse(JSON.stringify(ObjB._id)));

                           //       ObjB.InvoiceCount = InvoiceDetailsBranchArr.length;
                           //       ObjB.PaymentCount = InvoiceAcceptDetailsBranchArr.length;
                           //       ObjB.TotalInvoiceAmount = 0;
                           //       ObjB.TotalPaymentAmount = 0;
                           //       const InvoiceDetailsBranchArray = InvoiceDetails.filter(obj1 => obj1.BuyerBranch === ObjB._id);
                           //       if (InvoiceDetailsBranchArray.length > 0) {
                           //          var InvoiceAmount = 0;
                           //          InvoiceDetailsBranchArray.map(obj => {
                           //             InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.RemainingAmount);
                           //          });
                           //          ObjB.TotalInvoiceAmount = parseFloat(InvoiceAmount);
                           //          ObjB.TotalInvoiceAmount = ObjB.TotalInvoiceAmount.toFixed(2);
                           //          ObjB.TotalInvoiceAmount = parseFloat(ObjB.TotalInvoiceAmount);
                           //          ObjB.TotalPaymentAmount = parseFloat(InvoiceAmount);
                           //          ObjB.TotalPaymentAmount = ObjB.TotalPaymentAmount.toFixed(2);
                           //          ObjB.TotalPaymentAmount = parseFloat(ObjB.TotalPaymentAmount);
                           //       }

                           //       const PaymentBranchArray = PendingPaymentDetails.filter(obj1 => obj1.BuyerBranch === ObjB._id);
                           //       if (PaymentBranchArray.length > 0) {
                           //          var PaymentAmount = 0;
                           //          PaymentBranchArray.map(obj => {
                           //             PaymentAmount = parseFloat(PaymentAmount) + parseFloat(obj.PaymentAmount);
                           //          });
                           //          // ObjB.TotalPaymentAmount = parseFloat(PaymentAmount);
                           //          // ObjB.TotalPaymentAmount = ObjB.TotalPaymentAmount.toFixed(2);
                           //          // ObjB.TotalPaymentAmount = parseFloat(ObjB.TotalPaymentAmount);                                                                                         
                           //       }
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
                           //          InviteDetailsBranchArr.map(obj => {
                           //             ObjB.BranchCreditLimit = parseFloat(ObjB.BranchCreditLimit) + parseFloat(obj.AvailableLimit);
                           //             ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit) + parseFloat(obj.AvailableLimit);

                           //          });
                           //       }

                           //       const InvoiceDetailsBranchArray1 = InvoiceDetails.filter(obj1 => obj1.BuyerBranch === ObjB._id);
                           //       if (InvoiceDetailsBranchArray1.length > 0) {
                           //          var BranchInvoiceAmount = 0;
                           //          InvoiceDetailsBranchArray1.map(obj => {
                           //             BranchInvoiceAmount = parseFloat(BranchInvoiceAmount) + parseFloat(obj.RemainingAmount);
                           //          });

                           //          if (BranchInvoiceAmount > 0) {
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
                  if (result.BusinessAndBranches.length > 0) {
                     result.BusinessAndBranches.map(Obj => {
                        BuyerBusinessArray.push(mongoose.Types.ObjectId(Obj.Business));
                     });
                  }

                  Promise.all([
                     BusinessAndBranchManagement.BusinessSchema.find({ _id: { $in: BuyerBusinessArray }, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     InviteManagement.InviteManagementSchema.find({ Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     TemporaryManagement.CreditSchema.find({  Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     InvoiceManagement.InvoiceSchema.find({  PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                     InvoiceManagement.InvoiceSchema.find({  ActiveStatus: true, InvoiceStatus: 'Pending', IfDeleted: false }, {}, {}).exec(),
                     PaymentModel.PaymentSchema.find({ Payment_Status: "Pending" }, {}, {}).exec(),
                     InvoiceManagement.InvoiceSchema.find({  PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                 

                  ]).then(ResponseOU => {
                     var BusinessDetails = JSON.parse(JSON.stringify(ResponseOU[0]));
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
                           //       ObjB.TotalInvoiceAmount = 0;
                           //       ObjB.TotalPaymentAmount = 0;
                           //       const InvoiceDetailsBranchArr = InvoicePendingDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.BuyerBranch)) === JSON.parse(JSON.stringify(ObjB._id)));
                           //       const InvoiceAcceptBranchArr = InvoiceAcceptList.filter(obj1 => JSON.parse(JSON.stringify(obj1.BuyerBranch)) === JSON.parse(JSON.stringify(ObjB._id)));
                           //       ObjB.InvoiceCount = InvoiceDetailsBranchArr.length;
                           //       ObjB.PaymentCount = InvoiceAcceptBranchArr.length;
                           //       const InvoiceDetailsBranchArray1 = InvoiceDetails.filter(obj1 => obj1.BuyerBranch === ObjB._id);
                           //       if (InvoiceDetailsBranchArray1.length > 0) {
                           //          var InvoiceAmount = 0;
                           //          InvoiceDetailsBranchArray1.map(obj => {
                           //             InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.RemainingAmount);
                           //          });
                           //          ObjB.TotalInvoiceAmount = parseFloat(InvoiceAmount);
                           //          ObjB.TotalInvoiceAmount = ObjB.TotalInvoiceAmount.toFixed(2);
                           //          ObjB.TotalInvoiceAmount = parseFloat(ObjB.TotalInvoiceAmount);
                           //          ObjB.TotalPaymentAmount = parseFloat(InvoiceAmount);
                           //          ObjB.TotalPaymentAmount = ObjB.TotalPaymentAmount.toFixed(2);
                           //          ObjB.TotalPaymentAmount = parseFloat(ObjB.TotalPaymentAmount);
                           //       }

                           //       const PaymentBranchArray = PendingPaymentDetails.filter(obj1 => obj1.BuyerBranch === ObjB._id);
                           //       if (PaymentBranchArray.length > 0) {
                           //          var PaymentAmount = 0;
                           //          PaymentBranchArray.map(obj => {
                           //             PaymentAmount = parseFloat(PaymentAmount) + parseFloat(obj.PaymentAmount);
                           //          });
                           //          // ObjB.TotalPaymentAmount = parseFloat(PaymentAmount);
                           //          // ObjB.TotalPaymentAmount = ObjB.TotalPaymentAmount.toFixed(2);
                           //          // ObjB.TotalPaymentAmount = parseFloat(ObjB.TotalPaymentAmount);                                                                                         
                           //       }
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
                           //             BranchInvoiceAmount = parseFloat(BranchInvoiceAmount) + parseFloat(obj.RemainingAmount);
                           //          });

                           //          if (BranchInvoiceAmount > 0) {
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


// Buyer All Invoice List 
exports.BuyerInvoice_List = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
      res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
   } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
      res.status(400).send({ Status: false, Message: "Buyer Business can not be empty" });
   } else {
      ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
      ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);

      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.BuyerBusiness, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var BuyerDetails = Response[0];
         var BusinessDetails = Response[1];

            if (BuyerDetails !== null && BusinessDetails !== null) {
            var Buyer;
            var InvoiceQuery = {};
            if (BuyerDetails.CustomerType === 'Owner') {
               Buyer = mongoose.Types.ObjectId(BuyerDetails._id);
               InvoiceQuery = { Buyer: Buyer, BuyerBusiness: ReceivingData.BuyerBusiness };
            } else if (BuyerDetails.CustomerType === 'User') {
               Buyer = mongoose.Types.ObjectId(BuyerDetails.Owner);
               if (BuyerDetails.BusinessAndBranches.length !== 0) {
                  BuyerDetails.BusinessAndBranches.map(Obj => {
                     // Obj.Branches.map(obj => {
                     //    BranchArr.push(mongoose.Types.ObjectId(obj));
                     // });
                  });
               }
               InvoiceQuery = { Buyer: Buyer };
            }

            InvoiceManagement.InvoiceSchema.find(InvoiceQuery, {}, {})
               .populate({ path: 'Buyer', select: ['ContactName'] })
               .populate({ path: 'Seller', select: ['ContactName', 'Mobile', 'CustomerCategory'] })
               .populate({ path: 'Business', select: ['FirstName','LastName', 'BusinessCreditLimit', 'AvailableCreditLimit'] }).exec((err, result) => {
                  if (err) {
                     ErrorHandling.ErrorLogCreation(req, 'Invoice List Getting Error', 'InvoiceManagement.Controller -> BuyerInvoice_List', JSON.stringify(err));
                     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Invoice!.", Error: err });
                  } else {
                     if (result.length > 0) {
                        result = JSON.parse(JSON.stringify(result));
                        result = result.map(Obj => {
                           Obj.InvoiceDate = moment(new Date(Obj.InvoiceDate)).format("YYYY-MM-DD");
                           return Obj;
                        });
                     }
                     res.status(200).send({ Status: true, Response: result, Message: 'Buyer All Invoice List' });
                  }
               });
         } else {
            res.status(400).send({ Status: false, Message: 'Invalid Customer Details' });
         }
      }).catch(Error => {
         ErrorHandling.ErrorLogCreation(req, 'Invoice List Getting Error', 'InvoiceManagement.Controller -> BuyerInvoice_List', JSON.stringify(Error));
         res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Invoice!.", Error: Error });
      });
   }
};

// Seller All Invoice List 
exports.SellerInvoice_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Seller || ReceivingData.Seller === '') {
      res.status(400).send({ Status: false, Message: "Seller can not be empty" });
   } else if (!ReceivingData.Business || ReceivingData.Business === '') {
      res.status(400).send({ Status: false, Message: "Business can not be empty" });
   } else {
      ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
      ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);

      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.Business, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var SellerDetails = Response[0];
         var BusinessDetails = Response[1];

          if (SellerDetails !== null && BusinessDetails !== null ) {
            var Seller;
            var InvoiceQuery = {};
            if (SellerDetails.CustomerType === 'Owner') {
               Seller = mongoose.Types.ObjectId(SellerDetails._id);
               InvoiceQuery = { Seller: Seller, Business: ReceivingData.Business};
            } else if (SellerDetails.CustomerType === 'User') {
               Seller = mongoose.Types.ObjectId(SellerDetails.Owner);

               if (SellerDetails.BusinessAndBranches.length !== 0) {
                  SellerDetails.BusinessAndBranches.map(Obj => {
                    //  Obj.Branches.map(obj => {
                    //     BranchArr.push(mongoose.Types.ObjectId(obj));
                    //  });
                  });
               }
               InvoiceQuery = { Seller: Seller};
            }


            InvoiceManagement.InvoiceSchema.find(InvoiceQuery, {}, {})
               .populate({ path: 'Buyer', select: ['ContactName'] })
               .populate({ path: 'Seller', select: ['ContactName', 'Mobile', 'CustomerCategory'] })
               .populate({ path: 'Business', select: ['FirstName','LastName', 'BusinessCreditLimit', 'AvailableCreditLimit'] }).exec((err, result) => {
                  if (err) {
                     ErrorHandling.ErrorLogCreation(req, 'Invoice List Getting Error', 'InvoiceManagement.Controller -> BuyerInvoice_List', JSON.stringify(err));
                     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Invoice!.", Error: err });
                  } else {
                     result = JSON.parse(JSON.stringify(result));
                     if (result.length > 0) {
                        result = result.map(Obj => {
                           Obj.InvoiceDate = moment(new Date(Obj.InvoiceDate)).format("YYYY-MM-DD");
                           return Obj;
                        });
                     }
                     res.status(200).send({ Status: true, Response: result, Message: 'Seller All Invoice List' });
                  }
               });
         } else {
            res.status(400).send({ Status: false, Message: 'Invalid Customer Details' });
         }
      }).catch(Error => {
         ErrorHandling.ErrorLogCreation(req, 'Invoice List Getting Error', 'InvoiceManagement.Controller -> BuyerInvoice_List', JSON.stringify(Error));
         res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Invoice!.", Error: Error });
      });
   }
};
// Buyer Dispute the Multiple Invoice
exports.BuyerInvoice_Dispute = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.InvoiceId || ReceivingData.InvoiceId === []) {
      res.status(400).send({ Status: false, Message: "InvoiceId can not be empty" });
   } else if (!ReceivingData.InvoiceStatus || ReceivingData.InvoiceStatus === '') {
      res.status(400).send({ Status: false, Message: "Invoice Status can not be empty" });
   } else if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
      res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
   } else {
      ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
      var InvoiceArr = [];
      ReceivingData.InvoiceId.map(Obj => {
         InvoiceArr.push(mongoose.Types.ObjectId(Obj._id));
      });

      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         InvoiceManagement.InvoiceSchema.find({ "_id": { $in: InvoiceArr } }, {}, {}).
            populate({ path: 'Seller', select: ['ContactName', 'Firebase_Token', "Mobile"] }).populate({ path: 'Buyer', select: ["ContactName", "Firebase_Token", "Mobile"] }).
            populate({ path: 'Business', select: ['FirstName','LastName'] }).populate({ path: 'BuyerBusiness', select: ['FirstName','LastName'] }),
         BusinessAndBranchManagement.BusinessSchema.find({ ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var CustomerDetails = JSON.parse(JSON.stringify(Response[0]));
         var InvoiceDetails = JSON.parse(JSON.stringify(Response[1]));
         var BusinessDetails = JSON.parse(JSON.stringify(Response[2]));
        
         if (CustomerDetails !== null && InvoiceDetails.length !== 0) {
            InvoiceManagement.InvoiceSchema.updateMany(
               { "_id": { $in: InvoiceArr } },

               {
                  $set: {
                     "InvoiceStatus": ReceivingData.InvoiceStatus,
                     "DisputedRemarks": ReceivingData.Remarks || '',
                  }
               }
            ).exec(function (err_1, result_1) {
               if (err_1) {
                  ErrorHandling.ErrorLogCreation(req, 'Invoice Details Update  Getting Error', 'InvoiceManagement.Controller -> BuyerInvoice_Dispute', JSON.stringify(err_1));
                  res.status(417).send({ Status: false, Message: "Some error occurred while Updating the Invoice Status!.", Error: err_1 });
               } else {
                  InvoiceDetails.map(Obj => {  
                  var InviteQuery = {};
                  var TempQuery = {};
                  InviteQuery = { BuyerBusiness: mongoose.Types.ObjectId(Obj.BuyerBusiness._id),Business: Obj.Business._id, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                  if(Obj.TemporaryRequestId === '') {
                     TempQuery = { _id:mongoose.Types.ObjectId(0),  Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                  }else {
                     TempQuery = { _id:Obj.TemporaryRequestId,  Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                  }
                  Promise.all([ 
                     InviteManagement.InviteManagementSchema.find(InviteQuery, {}, {}).exec(), 
                     TemporaryManagement.CreditSchema.find(TempQuery, {}, {}).exec(),
                  ]).then(Response => { 
                     var InviteDetails = JSON.parse(JSON.stringify(Response[0])); 
                     var TemporaryDetails = JSON.parse(JSON.stringify(Response[1]));
                    
                     if (InviteDetails.length > 0) {
                        InviteDetails.map(ObjIn => {
                           var InviteAvailCredit = (ObjIn.AvailableLimit + Obj.UsedCurrentCreditAmount);
                           // InviteManagement.InviteManagementSchema.updateOne({ BuyerBusiness: Obj.BuyerBusiness._id,Business: Obj.Business._id}, {$set: { AvailableLimit: InviteAvailCredit }}).exec();
                        });
                     }
                     if (TemporaryDetails.length > 0) {
                        var BranchValidityDate = new Date();
                        var BranchTodayDate = new Date();
                        TemporaryDetails.map(obj => {
                           BranchValidityDate = new Date(obj.updatedAt);
                           BranchValidityDate = new Date(BranchValidityDate.setDate(BranchValidityDate.getDate() + obj.ApprovedPeriod));
                           if (BranchValidityDate.valueOf() >= BranchTodayDate.valueOf()) {
                              var TemporaryAmountCredit = (obj.AvailableLimit + Obj.UsedTemporaryCreditAmount);
                              // TemporaryManagement.CreditSchema.updateOne({_id:Obj.TemporaryRequestId, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false}, {$set: { AvailableLimit: TemporaryAmountCredit }}).exec();
                              TemporaryManagement.CreditSchema.updateOne({_id:Obj.TemporaryRequestId, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false}).exec();
                             
                           }
                        });
                     }

                     InvoiceManagement.InvoiceSchema.updateOne({"_id": { $in: InvoiceArr }}, {$set: { UsedCurrentCreditAmount : 0, UsedTemporaryCreditAmount : 0 }}).exec();

                  }).catch(Error => {
                     ErrorHandling.ErrorLogCreation(req, 'Invoice And Payment, Invite Details getting Error', 'HundiScore.Controller -> CustomerDashBoard', JSON.stringify(Error));
                   //  res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
                  });
                     
                  });
                  
                  InvoiceDetails.map(Obj => {
                     const SellerBusinessArr = BusinessDetails.filter(obj1 => obj1._id === Obj.Business._id);
                     if (SellerBusinessArr.length > 0) {
                        var SellerUserNotification = [];
                        SellerBusinessArr.map(ObjB => {
                           SellerUserNotification.push(ObjB._id);
                           const CreateNotification = new NotificationManagement.NotificationSchema({
                              User: null,
                              Business: mongoose.Types.ObjectId(ObjB._id),
                              Notification_Type: 'SellerInvoiceDisputed',
                              Message: 'Buyer Business Name ' + Obj.BuyerBusiness.FirstName +''+ Obj.BuyerBusiness.LastName + ' disputed invoice Invoice ID ' + Obj.InvoiceNumber + ' Please click here to review and make any changes.',
                              Message_Received: true,
                              Message_Viewed: false,
                              ActiveStatus: true,
                              IfDeleted: false,
                           });
                           CreateNotification.save();
                        });
                        Promise.all([
                           CustomersManagement.CustomerSchema.find({ "BusinessAndBranches.Business": { $in: SellerUserNotification }, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                        ]).then(ResponseRes => {
                           var SellerUserDetails = JSON.parse(JSON.stringify(ResponseRes[0]));
                           if (SellerUserDetails.length > 0) {
                              SellerUserDetails.map(ObjS => {
                                 var SellerFCMToken = [];
                                 SellerFCMToken.push(ObjS.Firebase_Token);

                                 var BuyerPayload = {
                                    notification: {
                                       title: 'Hundi-Team',
                                       body: Obj.BuyerBusiness.FirstName +''+ Obj.BuyerBusiness.LastName + ' accepted your invoice ID ' + Obj.InvoiceNumber + ',' + ' Rs.' + Obj.InvoiceAmount + '. Click here to view the invoice.',
                                       sound: 'notify_tone.mp3'
                                    },
                                    data: {
                                       Customer: ObjS._id,
                                       notification_type: 'SellerInvoiceDisputed',
                                       click_action: 'FCM_PLUGIN_ACTIVITY',
                                    }
                                 };
                                 if (SellerFCMToken.length > 0) {
                                    FCM_App.messaging().sendToDevice(SellerFCMToken, BuyerPayload, options).then((NotifyRes) => { });
                                 }
                                 return ObjS;
                              });


                           }
                        });
                     }

                     var SellerOwnerFCMToken = [];
                     SellerOwnerFCMToken.push(Obj.Seller.Firebase_Token);
                     var BuyerPayloads = {
                        notification: {
                           title: 'Hundi-Team',
                           body: 'Buyer Business Name ' + Obj.BuyerBusiness.FirstName +''+ Obj.BuyerBusiness.LastName + ' disputed invoice Invoice ID ' + Obj.InvoiceNumber + ' Please click here to review and make any changes.',
                           sound: 'notify_tone.mp3'
                        },
                        data: {
                           Customer: Obj.Seller._id,
                           notification_type: 'SellerInvoiceDisputed',
                           click_action: 'FCM_PLUGIN_ACTIVITY',
                        }
                     };
                     if (SellerOwnerFCMToken.length > 0) {
                        FCM_App.messaging().sendToDevice(SellerOwnerFCMToken, BuyerPayloads, options).then((NotifyRes) => { });
                     }
                  });
                  InvoiceDetails.map(Obj => {
                     const SellerBusinessArr = BusinessDetails.filter(obj1 => obj1._id === Obj.BuyerBusiness._id);
                     if (SellerBusinessArr.length > 0) {
                        var SellerUserNotification = [];
                        SellerBusinessArr.map(ObjB => {
                           SellerUserNotification.push(ObjB._id);
                           const CreateNotification = new NotificationManagement.NotificationSchema({
                              User: null,
                              // Branch: ObjB._id,
                              Business: ObjB._id,
                              Notification_Type: 'BuyerInvoiceDisputed',
                              Message: 'Seller Business Name ' + Obj.Business.FirstName +''+ Obj.Business.LastName + ' responded to your invoice dispute on invoice Invoice ID ' + Obj.InvoiceNumber + ' Click here to view their response.',
                              Message_Received: true,
                              Message_Viewed: false,
                              ActiveStatus: true,
                              IfDeleted: false,
                           });
                           CreateNotification.save();
                        });
                        Promise.all([
                           CustomersManagement.CustomerSchema.find({ "BusinessAndBranches.Business": { $in: SellerUserNotification }, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                        ]).then(ResponseRes => {
                           var SellerUserDetails = JSON.parse(JSON.stringify(ResponseRes[0]));
                           if (SellerUserDetails.length > 0) {
                              SellerUserDetails.map(ObjS => {
                                 var SellerFCMToken = [];
                                 SellerFCMToken.push(ObjS.Firebase_Token);
                                 var BuyerPayload = {
                                    notification: {
                                       title: 'Hundi-Team',
                                       body: 'Seller Business Name ' + Obj.Business.FirstName +''+ Obj.Business.LastName + ' responded to your invoice dispute on invoice Invoice ID ' + Obj.InvoiceNumber + ' Click here to view their response.',
                                       sound: 'notify_tone.mp3'
                                    },
                                    data: {
                                       Customer: ObjS._id,
                                       notification_type: 'BuyerInvoiceDisputed',
                                       click_action: 'FCM_PLUGIN_ACTIVITY',
                                    }
                                 };
                                 if (SellerFCMToken.length > 0) {
                                    FCM_App.messaging().sendToDevice(SellerFCMToken, BuyerPayload, options).then((NotifyRes) => { });
                                 }
                                 return ObjS;
                              });
                           }
                        });
                     }

                     var SellerOwnerFCMToken = [];
                     SellerOwnerFCMToken.push(Obj.Buyer.Firebase_Token);
                     var BuyerPayloads = {
                        notification: {
                           title: 'Hundi-Team',
                           body: 'Seller Business Name ' + Obj.Business.FirstName +''+ Obj.Business.LastName + ' responded to your invoice dispute on invoice Invoice ID ' + Obj.InvoiceNumber + ' Click here to view their response.',
                           sound: 'notify_tone.mp3'
                        },
                        data: {
                           Customer: Obj.Buyer._id,
                           notification_type: 'BuyerInvoiceDisputed',
                           click_action: 'FCM_PLUGIN_ACTIVITY',
                        }
                     };
                     if (SellerOwnerFCMToken.length > 0) {
                        FCM_App.messaging().sendToDevice(SellerOwnerFCMToken, BuyerPayloads, options).then((NotifyRes) => { });
                     }
                  });
                  res.status(200).send({ Status: true, Message: "Invoice Successfully Disputed" });
               }
            });
         } else {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Invalid Customer Details!." });
         }

      }).catch(Error => {
         ErrorHandling.ErrorLogCreation(req, 'Finding the invoice details and customer details Getting Error', 'InvoiceManagement.Controller -> BuyerInvoice_Dispute', JSON.stringify(Error));
         res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Buyer Details!.", Error: Error });
      });
   }
};

// Buyer Invoice Accepted

exports.BuyerInvoice_Accept = async function (req, res) {
   try {
      const ReceivingData = req.body;

      if (!ReceivingData.InvoiceId || ReceivingData.InvoiceId.length === '') {
         return res.status(400).send({ Status: false, Message: "InvoiceId can not be empty" });
      }

      if (!ReceivingData.InvoiceStatus || ReceivingData.InvoiceStatus === '') {
         return res.status(400).send({ Status: false, Message: "Invoice Status can not be empty" });
      }

      if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
         return res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
      }

      const buyerId = mongoose.Types.ObjectId(ReceivingData.Buyer);
      const invoiceIds = ReceivingData.InvoiceId.map(obj => mongoose.Types.ObjectId(obj.id));

      const [customer, invoices, businesses, temporaryCredits] = await Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: buyerId, ActiveStatus: true, IfDeleted: false }),
         InvoiceManagement.InvoiceSchema.find({ "_id": { $in: invoiceIds } }).populate({ path: 'Seller', select: ['ContactName', "Mobile", 'Firebase_Token'] }).populate({ path: 'Buyer', select: ["ContactName", "Firebase_Token"] }).populate({ path: 'Business', select: ['FirstName','LastName','BusinessCreditLimit','AvailableCreditLimit'] }).populate({ path: 'BuyerBusiness', select: ['FirstName','LastName','BusinessCreditLimit','AvailableCreditLimit'] }),
         BusinessAndBranchManagement.BusinessSchema.find({ ActiveStatus: true, IfDeleted: false }),
         TemporaryManagement.CreditSchema.find({ Buyer: buyerId, ActiveStatus: true, IfDeleted: false })
      ]);

      if (!customer || invoices.length === 0) {
         return res.status(417).send({ Http_Code: 417, Status: false, Message: "Invalid Customer Details!." });
      }

      const CustomerDetails = JSON.parse(JSON.stringify(customer));
      const InvoiceDetails = JSON.parse(JSON.stringify(invoices));
      const BusinessDetails = JSON.parse(JSON.stringify(businesses));
      const TemporaryCreditDetails = JSON.parse(JSON.stringify(temporaryCredits));

      // Logic for processing invoices
      for (const invoice of InvoiceDetails) {
         // Update invoice status and details
         let updateQuery = {
            $set: {
               "InvoiceStatus": ReceivingData.InvoiceStatus || "Accept",
               "AcceptRemarks": ReceivingData.Remarks || '',
               "ApprovedDate": new Date(),
               "IfBuyerApprove": true,
               "IfBuyerNotify": true
            }
         };

         if (invoice.IfUsedPaidTemporaryCredit) {
            // Logic for handling invoices using temporary credit
            const tempCredit = TemporaryCreditDetails.find(tempCredit =>
               tempCredit.Buyer.toString() === invoice.Buyer._id.toString() &&
               tempCredit.BuyerBusiness.toString() === invoice.BuyerBusiness._id.toString() &&
               tempCredit.Seller.toString() === invoice.Seller._id.toString() &&
               tempCredit.Business.toString() === invoice.Business._id.toString()
            );

            if (tempCredit) {
               const ValidityDate = new Date(tempCredit.updatedAt);
               ValidityDate.setDate(ValidityDate.getDate() + tempCredit.ApprovedPeriod);

               if (ValidityDate >= new Date()) {
                  // Update invoice details
                  updateQuery.$set.CurrentCreditAmount = invoice.CurrentCreditAmount;
                  updateQuery.$set.TemporaryCreditAmount = invoice.TemporaryCreditAmount;
                  updateQuery.$set.UsedCurrentCreditAmount = invoice.UsedCurrentCreditAmount;
                  updateQuery.$set.ExtraUsedCreditAmount = invoice.ExtraUsedCreditAmount;

                  // Update invoice in database
                  await InvoiceManagement.InvoiceSchema.updateOne({ "_id": invoice._id }, updateQuery);

                  // Logic for updating credit limits
                  const BuytempAvailableCreditLimit = tempCredit.AvailableLimit - invoice.InvoiceAmount;
                  // Before executing the query, set the options to disable timestamps
                  TemporaryManagement.CreditSchema.schema.set('timestamps', false);
                  await TemporaryManagement.CreditSchema.updateOne(
                     { _id: invoice.TemporaryRequestId },
                     { $set: { AvailableLimit: BuytempAvailableCreditLimit } }
                  );
                  // After executing the query, set the options back to enable timestamps
                  TemporaryManagement.CreditSchema.schema.set('timestamps', true);
               } else {
                  // Handle expired temporary credit
                  return res.status(200).send({ Status: false, Message: "Temporary credit has expired." });
               }
            }
         } else {
            // Update invoice details for non-temporary credit invoices
            updateQuery.$set.CurrentCreditAmount = invoice.CurrentCreditAmount;
            updateQuery.$set.TemporaryCreditAmount = invoice.TemporaryCreditAmount;
            updateQuery.$set.UsedCurrentCreditAmount = invoice.UsedCurrentCreditAmount;
            updateQuery.$set.ExtraUsedCreditAmount = invoice.ExtraUsedCreditAmount;

            // Update invoice in database
            await InvoiceManagement.InvoiceSchema.updateOne({ "_id": invoice._id }, updateQuery);

            // Logic for updating credit limits
            // const BuyAvailableCreditLimit = invoice.BuyerBusiness.AvailableCreditLimit - invoice.InvoiceAmount
            let BuyAvailableCreditLimit = 0;
            if (invoice.BuyerBusiness.AvailableCreditLimit >= invoice.InvoiceAmount) {
                 BuyAvailableCreditLimit = invoice.BuyerBusiness.AvailableCreditLimit - invoice.InvoiceAmount;
            } else if(invoice.InvoiceAmount >= invoice.BuyerBusiness.AvailableCreditLimit){
               BuyAvailableCreditLimit = invoice.InvoiceAmount - invoice.BuyerBusiness.AvailableCreditLimit;
            }
            
            await BusinessAndBranchManagement.BusinessSchema.updateOne(
               { _id: invoice.BuyerBusiness },
               { $set: { AvailableCreditLimit: BuyAvailableCreditLimit } }
            );

            // Logic for updating the invite
            InviteManagement.InviteManagementSchema.find({
               Seller:invoice.Seller, Business: invoice.Business, 
               Buyer:invoice.Buyer, BuyerBusiness:invoice.BuyerBusiness,Invite_Status: 'Accept' }, {}, {})
              .exec(function (err, result) {
                 if (err) {
                  ErrorHandling.ErrorLogCreation(req, 'Invite Details Updating Amount', 'Invoice.Controller -> BuyerInvoiceAccept', JSON.stringify(err));
                  res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });                             
                 } else {
                     if (result !== null) {
                        let BuyInviteAvailableLimit = 0;
                       
                        result.map(oBj=>{
                           if (oBj.AvailableLimit > invoice.InvoiceAmount) {
                              BuyInviteAvailableLimit = oBj.AvailableLimit - invoice.InvoiceAmount;
                           } else if (invoice.InvoiceAmount > oBj.AvailableLimit) {
                              BuyInviteAvailableLimit = invoice.InvoiceAmount - oBj.AvailableLimit;
                           }
                        });
                     
                  
                     InviteManagement.InviteManagementSchema.updateOne(
                        {  "Seller":invoice.Seller, 
                           "Business": invoice.Business, 
                           "Buyer":invoice.Buyer, 
                           "BuyerBusiness":invoice.BuyerBusiness,
                           "Invite_Status": 'Accept' 
                        },
                        {
                           $set: {
                              "AvailableLimit": BuyInviteAvailableLimit,
                           }
                        }
                     ).exec();
                  }
                 }              
              });  
         }

         // Logic for sending notifications
      }
      InvoiceDetails.map(Obj => {
         const SellerBusinessArr = BusinessDetails.filter(obj1 => obj1._id === Obj.Business._id);
         if (SellerBusinessArr.length > 0) {
            var SellerUserNotification = [];
            SellerBusinessArr.map(ObjB => {
               SellerUserNotification.push(ObjB._id);
               const CreateNotification = new NotificationManagement.NotificationSchema({
                  User: null,
                  Business: ObjB._id,
                  Notification_Type: 'SellerInvoiceAccept',
                  Message: Obj.BuyerBusiness.FirstName +''+ Obj.BuyerBusiness.LastName + ' accepted your invoice ID ' + Obj.InvoiceNumber + ',' + ' Rs.' + Obj.InvoiceAmount + '. Click here to view the invoice.',
                  Message_Received: true,
                  Message_Viewed: false,
                  ActiveStatus: true,
                  IfDeleted: false,
               });
               CreateNotification.save();
            });
            Promise.all([
               CustomersManagement.CustomerSchema.find({ "BusinessAndBranches.Business": { $in: SellerUserNotification }, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            ]).then(ResponseRes => {
               var SellerUserDetails = JSON.parse(JSON.stringify(ResponseRes[0]));
               if (SellerUserDetails.length > 0) {
                  SellerUserDetails.map(ObjS => {
                     var SellerFCMToken = [];
                     SellerFCMToken.push(ObjS.Firebase_Token);
                     var BuyerPayload = {
                        notification: {
                           title: 'Hundi-Team',
                           body: Obj.BuyerBusiness.FirstName +''+ Obj.BuyerBusiness.LastName + ' accepted your invoice ID ' + Obj.InvoiceNumber + ',' + ' Rs.' + Obj.InvoiceAmount + '. Click here to view the invoice.',
                           sound: 'notify_tone.mp3'
                        },
                        data: {
                           Customer: ObjS._id,
                           notification_type: 'SellerInvoiceAccept',
                           click_action: 'FCM_PLUGIN_ACTIVITY',
                        }
                     };
                     if (SellerFCMToken.length > 0) {
                        FCM_App.messaging().sendToDevice(SellerFCMToken, BuyerPayload, options).then((NotifyRes) => { });
                     }
                     return ObjS;
                  });
               }
            });
         }

         var SellerOwnerFCMToken = [];
         SellerOwnerFCMToken.push(Obj.Seller.Firebase_Token);
         var BuyerPayloads = {
            notification: {
               title: 'Hundi-Team',
               body: Obj.BuyerBusiness.FirstName +''+ Obj.BuyerBusiness.LastName + ' accepted your invoice ID ' + Obj.InvoiceNumber + ',' + ' Rs.' + Obj.InvoiceAmount + '. Click here to view the invoice.',
               sound: 'notify_tone.mp3'
            },
            data: {
               Customer: Obj.Seller._id,
               notification_type: 'SellerInvoiceAccept',
               click_action: 'FCM_PLUGIN_ACTIVITY',
            }
         };
         if (SellerOwnerFCMToken.length > 0) {
            FCM_App.messaging().sendToDevice(SellerOwnerFCMToken, BuyerPayloads, options).then((NotifyRes) => { });
         }
      });

      res.status(200).send({ Status: true, Message: "Invoice Successfully Accepted" });
   } catch (error) {
      ErrorHandling.ErrorLogCreation(req, 'Finding the invoice details and customer details Getting Error', 'InvoiceManagement.Controller -> BuyerInvoice_Dispute', JSON.stringify(error));
      res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Buyer Details!.", Error: error });
   }
};



//Web Buyer Invoice Accept 
// Buyer Invoice Accepted

exports.Web_BuyerInvoice_Accept = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.WaitForApprovalArray || ReceivingData.WaitForApprovalArray === []) {
       res.status(400).send({ Status: false, Message: "InvoiceId can not be empty" });
   } else if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
       res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
   } else {
       ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
       var InvoiceArr = [];
       ReceivingData.WaitForApprovalArray.map(Obj => {
           InvoiceArr.push(mongoose.Types.ObjectId(Obj._id));
       });

       Promise.all([
           CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
           InvoiceManagement.InvoiceSchema.find({ "_id": { $in: InvoiceArr } }, {}, {}).
               populate({ path: 'Seller', select: ['ContactName', 'Firebase_Token'] }).populate({ path: 'Buyer', select: ["ContactName", "Firebase_Token"] }).
               populate({ path: 'Business', select: ['FirstName','LastName', 'BusinessCreditLimit', 'AvailableCreditLimit'] }).populate({ path: 'BuyerBusiness', select: ['FirstName','LastName', 'BusinessCreditLimit', 'AvailableCreditLimit'] }),
       ]).then(Response => {
           var CustomerDetails = JSON.parse(JSON.stringify(Response[0]));
           var InvoiceDetails = JSON.parse(JSON.stringify(Response[1]));
         //   console.log(CustomerDetails,'1111');
         //   console.log(InvoiceDetails,'222222'); 
         //   return;
           if (CustomerDetails !== null && InvoiceDetails.length !== 0) {
               var CreditUnitizedArr = [];
               InvoiceDetails.map(Obj => {
                   var EmptyInvoiceDetails = {
                       _id: mongoose.Types.ObjectId(Obj._id),
                       CurrentCreditAmount: Obj.CurrentCreditAmount,
                       TemporaryCreditAmount: Obj.TemporaryCreditAmount,
                       UsedCurrentCreditAmount: Obj.UsedCurrentCreditAmount,
                       ExtraUsedCreditAmount: Obj.ExtraUsedCreditAmount,
                       UsedTemporaryCreditAmount: Obj.UsedTemporaryCreditAmount
                   };

                   var UsedForCurrentCreditAmount = parseFloat(EmptyInvoiceDetails.CurrentCreditAmount) - parseFloat(Obj.AvailableAmount);

                   if (UsedForCurrentCreditAmount > 0) {
                       EmptyInvoiceDetails.UsedCurrentCreditAmount = Obj.AvailableAmount;
                   } else {
                       EmptyInvoiceDetails.UsedCurrentCreditAmount = EmptyInvoiceDetails.CurrentCreditAmount;
                       var UsedForTemporaryCreditAmount = parseFloat(EmptyInvoiceDetails.TemporaryCreditAmount) + parseFloat(UsedForCurrentCreditAmount);

                       if (UsedForTemporaryCreditAmount > 0) {
                           EmptyInvoiceDetails.UsedTemporaryCreditAmount = UsedForTemporaryCreditAmount;
                       } else {
                           EmptyInvoiceDetails.UsedTemporaryCreditAmount = EmptyInvoiceDetails.TemporaryCreditAmount
                       }
                   }

                   var TotalCurrentAndTemporaryCreditAmount = parseFloat(EmptyInvoiceDetails.CurrentCreditAmount) + parseFloat(EmptyInvoiceDetails.TemporaryCreditAmount);
                   var TotalForUsedCreditUnitized = parseFloat(TotalCurrentAndTemporaryCreditAmount) - parseFloat(Obj.AvailableAmount);
                   if (TotalForUsedCreditUnitized < 0) {
                       EmptyInvoiceDetails.ExtraUsedCreditAmount = TotalForUsedCreditUnitized;
                   }
                   CreditUnitizedArr.push(EmptyInvoiceDetails);
               });
               CreditUnitizedArr.map(Obj => {
                   InvoiceManagement.InvoiceSchema.updateOne(
                       { "_id": mongoose.Types.ObjectId(Obj._id) },
                       {
                           $set: {
                               "InvoiceStatus": "Accept",
                               "AcceptRemarks": ReceivingData.Remarks || '',
                               "CurrentCreditAmount": Obj.CurrentCreditAmount,
                               "TemporaryCreditAmount": Obj.TemporaryCreditAmount,
                               "UsedCurrentCreditAmount": Obj.UsedCurrentCreditAmount,
                               "UsedTemporaryCreditAmount": Obj.UsedTemporaryCreditAmount,
                               "ApprovedDate": new Date(),
                               "ExtraUsedCreditAmount": Obj.ExtraUsedCreditAmount,
                               "IfBuyerApprove": true,
                               "IfBuyerNotify": true,
                           }
                       }
                   ).exec();
                   return Obj;
               });
               res.status(200).send({ Status: true, Message: "Invoice Successfully Accepted" });

           } else {
               res.status(417).send({ Http_Code: 417, Status: false, Message: "Invalid Customer Details!." });
           }

       }).catch(Error => {
           ErrorHandling.ErrorLogCreation(req, 'Finding the invoice details and customer details Getting Error', 'InvoiceManagement.Controller -> BuyerInvoice_Dispute', JSON.stringify(Error));
           res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Buyer Details!.", Error: Error });
       });
   }
};




//Web Buyer Invoice Dispute 
// Buyer Invoice Accepted

// Buyer Dispute the Multiple Invoice
exports.Web_BuyerInvoice_Dispute = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.WaitForApprovalArray || ReceivingData.WaitForApprovalArray === []) {
       res.status(400).send({ Status: false, Message: "InvoiceId can not be empty" });
   } else if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
       res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
   } else {
       ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
       var InvoiceArr = [];
       ReceivingData.WaitForApprovalArray.map(Obj => {
           InvoiceArr.push(mongoose.Types.ObjectId(Obj._id));
       });

       Promise.all([
           CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
           InvoiceManagement.InvoiceSchema.find({ "_id": { $in: InvoiceArr } }, {}, {}).
               populate({ path: 'Seller', select: ['ContactName', 'Firebase_Token', "Mobile"] }).populate({ path: 'Buyer', select: ["ContactName", "Firebase_Token", "Mobile"] }).
               populate({ path: 'Business', select:  ['FirstName','LastName'] }).populate({ path: 'BuyerBusiness', select:  ['FirstName','LastName'] }),
       ]).then(Response => {
           var CustomerDetails = JSON.parse(JSON.stringify(Response[0]));
           var InvoiceDetails = JSON.parse(JSON.stringify(Response[1]));
           if (CustomerDetails !== null && InvoiceDetails.length !== 0) {
               InvoiceManagement.InvoiceSchema.updateMany(
                   { "_id": { $in: InvoiceArr } },

                   {
                       $set: {
                           "InvoiceStatus": 'Disputed',
                           "DisputedRemarks": ReceivingData.Remarks || '',
                       }
                   }
               ).exec(function (err_1, result_1) {
                   if (err_1) {
                       ErrorHandling.ErrorLogCreation(req, 'Invoice Details Update  Getting Error', 'InvoiceManagement.Controller -> BuyerInvoice_Dispute', JSON.stringify(err_1));
                       res.status(417).send({ Status: false, Message: "Some error occurred while Updating the Invoice Status!.", Error: err_1 });
                   } else {
                       InvoiceDetails.map(Obj => {
                           var CustomerFCMTokenSeller = [];
                           CustomerFCMTokenSeller.push(Obj.Seller.Firebase_Token);
                           var payload = {
                               notification: {
                                   title: 'Hundi-Team',
                                   body: 'Buyer Business Name ' + Obj.BuyerBusiness.FirstName+' '+Obj.BuyerBusiness.LastName + ' disputed invoice Invoice ID ' + Obj.InvoiceNumber + ' Please click here to review and make any changes.',
                                   sound: 'notify_tone.mp3'
                               },
                               data: {
                                   Customer: Obj.Seller._id,
                                   notification_type: 'SellerInvoiceDisputed',
                                   click_action: 'FCM_PLUGIN_ACTIVITY',
                               }
                           };
                           if (CustomerFCMTokenSeller.length > 0) {
                               FCM_App.messaging().sendToDevice(CustomerFCMTokenSeller, payload, options).then((NotifyRes) => { });
                           }

                           var SmsMessage = 'Buyer Business Name ' + Obj.BuyerBusiness.FirstName+' '+Obj.BuyerBusiness.LastName + ' disputed invoice Invoice ID ' + Obj.InvoiceNumber + ' Please click here to review and make any changes.';
                           const params = new URLSearchParams();
                           params.append('key', '25ECE50D1A3BD6');
                           params.append('msg', SmsMessage);
                           params.append('senderid', 'TXTDMO');
                           params.append('routeid', '3');
                           params.append('contacts', Obj.Seller.Mobile);

                           // axios.post('https://sms.textmysms.com/app/smsapi/index.php', params).then(function (response) {
                           //    callback(null, response.data);
                           //  }).catch(function (error) {
                           //    callback('Some Error for Seller Invite SMS!, Error: ' + error, null);
                           //  });
                           const CreateNotification = new NotificationManagement.NotificationSchema({
                               User: null,
                               CustomerID: Obj.Seller._id,
                               Notification_Type: 'SellerInvoiceDisputed',
                               Message: SmsMessage,
                               Message_Received: true,
                               Message_Viewed: false,
                               ActiveStatus: true,
                               IfDeleted: false,
                           });
                           CreateNotification.save();

                           var CustomerFCMTokenBuyer = [];
                           CustomerFCMTokenBuyer.push(Obj.Buyer.Firebase_Token);
                           var payload = {
                               notification: {
                                   title: 'Hundi-Team',
                                   body: 'Seller Business Name ' + Obj.Business.FirstName+' '+Obj.Business.LastName + ' responded to your invoice dispute on invoice ' + Obj.InvoiceNumber + '  Click here to view their response..',
                                   sound: 'notify_tone.mp3'
                               },
                               data: {
                                   Customer: Obj.Buyer._id,
                                   notification_type: 'BuyerInvoiceDisputed',
                                   click_action: 'FCM_PLUGIN_ACTIVITY',
                               }
                           };
                           if (CustomerFCMTokenBuyer.length > 0) {
                               FCM_App.messaging().sendToDevice(CustomerFCMTokenBuyer, payload, options).then((NotifyRes) => { });
                           }

                           var SmsMessage1 = 'Seller Business Name ' + Obj.Business.FirstName +' '+Obj.Business.LastName + ' responded to your invoice dispute on invoice ' + Obj.InvoiceNumber + '  Click here to view their response..';
                           const params1 = new URLSearchParams();
                           params1.append('key', '25ECE50D1A3BD6');
                           params1.append('msg', SmsMessage1);
                           params1.append('senderid', 'TXTDMO');
                           params1.append('routeid', '3');
                           params1.append('contacts', Obj.Buyer.Mobile);

                           // axios.post('https://sms.textmysms.com/app/smsapi/index.php', params1).then(function (response) {
                           //    callback(null, response.data);
                           //  }).catch(function (error) {
                           //    callback('Some Error for Seller Invite SMS!, Error: ' + error, null);
                           //  });

                           const CreateNotifications = new NotificationManagement.NotificationSchema({
                               User: null,
                               CustomerID: Obj.Buyer._id,
                               Notification_Type: 'SellerInvoiceDisputed',
                               Message: SmsMessage1,
                               Message_Received: true,
                               Message_Viewed: false,
                               ActiveStatus: true,
                               IfDeleted: false,
                           });
                           CreateNotifications.save();
                       });
                       res.status(200).send({ Status: true, Message: "Invoice Successfully Disputed" });
                   }
               });
           } else {
               res.status(417).send({ Http_Code: 417, Status: false, Message: "Invalid Customer Details!." });
           }

       }).catch(Error => {
           ErrorHandling.ErrorLogCreation(req, 'Finding the invoice details and customer details Getting Error', 'InvoiceManagement.Controller -> BuyerInvoice_Dispute', JSON.stringify(Error));
           res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Buyer Details!.", Error: Error });
       });
   }
};


// BuyerPendingInvoice_List
exports.BuyerPendingInvoice_List = function (req, res) {
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
                   FindQuery = { Buyer: Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, InvoiceStatus: "Pending" };
               } else if (BuyerDetails.CustomerType === 'User') {
                   Buyer = mongoose.Types.ObjectId(BuyerDetails.Owner);
                   if (BuyerDetails.BusinessAndBranches.length !== 0) {
                       BuyerDetails.BusinessAndBranches.map(Obj => {
                           // Obj.Business.map(obj => {
                               BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                           // });
                       });
                   }
                   FindQuery = { Buyer: Buyer, BuyerBusiness: { $in: BusinessArr }, InvoiceStatus: "Pending" };
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
                   InvoiceManagement.InvoiceSchema
                       .aggregate([
                           { $match: FindQuery },
                           {
                               $lookup: {
                                   from: "Business",
                                   let: { "business": "$Business" },
                                   pipeline: [
                                       { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                                       { $project: { "FirstName": 1,"LastName": 1 ,"BusinessCreditLimit":1,"AvailableCreditLimit":1} }
                                   ],
                                   as: 'Business'
                               }
                           },

                           {
                               $lookup: {
                                   from: "Business",
                                   let: { "buyerBusiness": "$BuyerBusiness" },
                                   pipeline: [
                                       { $match: { $expr: { $eq: ["$$buyerBusiness", "$_id"] } } },
                                       { $project: { "FirstName": 1,"LastName": 1 ,"BusinessCreditLimit":1,"AvailableCreditLimit":1} }
                                   ],
                                   as: 'BuyerBusiness'
                               }
                           },
                           { $unwind: { path: "$BuyerBusiness", preserveNullAndEmptyArrays: true } },
                           { $unwind: { path: "$Business", preserveNullAndEmptyArrays: true } },
                           // {
                           //     $lookup: {
                           //         from: "Branch",
                           //         let: { "branch": "$Branch" },
                           //         pipeline: [
                           //             { $match: { $expr: { $eq: ["$$branch", "$_id"] } } },
                           //             { $project: { "BranchName": 1 } }
                           //         ],
                           //         as: 'BranchInfo'
                           //     }
                           // },
                           // { $unwind: { path: "$BranchInfo", preserveNullAndEmptyArrays: true } },
                           // {
                           //     $lookup: {
                           //         from: "Branch",
                           //         let: { "buyerBranch": "$BuyerBranch" },
                           //         pipeline: [
                           //             { $match: { $expr: { $eq: ["$$buyerBranch", "$_id"] } } },
                           //             { $project: { "BranchName": 1 } }
                           //         ],
                           //         as: 'BuyerBranchInfo'
                           //     }
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
                               $project: {
                                   Business: 1,
                                   // BranchInfo: 1,
                                   buyer: 1,
                                   Seller: 1,
                                   // BuyerBranchInfo: 1,
                                   BuyerBusiness: 1,
                                   InvoiceDate: 1,
                                   InvoiceNumber: 1,
                                   PaidORUnpaid:1,
                                   PaidAmount:1,
                                   InvoiceAmount: 1,
                                   AvailableAmount: 1,
                                   InvoiceStatus: 1,
                                   RemainingAmount:1,
                                   InvoiceDescription: 1,
                                   CurrentCreditAmount: 1,
                                   TemporaryCreditAmount: 1,
                                   AcceptRemarks: 1,
                                   DisputedRemarks: 1,
                                   ResendRemarks: 1,
                                   InvoiceAttachments: 1,
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
                   InvoiceManagement.InvoiceSchema.countDocuments(FindQuery).exec()
               ]).then(result => {
                   res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
               }).catch(Error => {
                   ErrorHandling.ErrorLogCreation(req, 'Invoice Find error', 'InvoiceManagement -> All Invoice List', JSON.stringify(Error));
                   res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
               });
           } else {
               res.status(200).send({ Http_Code: 400, Status: false, Message: 'Invalid User Details' });
           }
       });
   }

};

// BuyerAcceptInvoice_List
exports.BuyerAcceptInvoice_List = function (req, res) {
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
                   FindQuery = { Buyer: Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, InvoiceStatus: "Accept" };
               } else if (BuyerDetails.CustomerType === 'User') {
                   Buyer = mongoose.Types.ObjectId(BuyerDetails.Owner);
                   if (BuyerDetails.BusinessAndBranches.length !== 0) {
                       BuyerDetails.BusinessAndBranches.map(Obj => {
                           // Obj.Branches.map(obj => {
                               BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                           // });
                       });
                   }
                   FindQuery = { Buyer: Buyer, BuyerBusiness: { $in: BusinessArr }, InvoiceStatus: "Accept" };
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
                   InvoiceManagement.InvoiceSchema
                       .aggregate([
                           { $match: FindQuery },
                           {
                               $lookup: {
                                   from: "Business",
                                   let: { "business": "$Business" },
                                   pipeline: [
                                       { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                                       { $project:  { "FirstName": 1,"LastName": 1 ,"BusinessCreditLimit":1,"AvailableCreditLimit":1} }
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
                                       { $project:  { "FirstName": 1,"LastName": 1 ,"BusinessCreditLimit":1,"AvailableCreditLimit":1} }
                                   ],
                                   as: 'BuyerBusiness'
                               }
                           },
                           { $unwind: { path: "$BuyerBusiness", preserveNullAndEmptyArrays: true } },
                           // {
                           //     $lookup: {
                           //         from: "Branch",
                           //         let: { "buyerBranch": "$BuyerBranch" },
                           //         pipeline: [
                           //             { $match: { $expr: { $eq: ["$$buyerBranch", "$_id"] } } },
                           //             { $project: { "BranchName": 1 } }
                           //         ],
                           //         as: 'BuyerBranchInfo'
                           //     }
                           // },
                           // { $unwind: { path: "$BuyerBranchInfo", preserveNullAndEmptyArrays: true } },
                           // {
                           //     $lookup: {
                           //         from: "Branch",
                           //         let: { "branch": "$Branch" },
                           //         pipeline: [
                           //             { $match: { $expr: { $eq: ["$$branch", "$_id"] } } },
                           //             { $project: { "BranchName": 1 } }
                           //         ],
                           //         as: 'BranchInfo'
                           //     }
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
                               $project: {
                                   Business: 1,
                                   // BranchInfo: 1,
                                   buyer: 1,
                                   Seller: 1,
                                   BuyerBusiness: 1,
                                   // BuyerBranchInfo: 1,
                                   InvoiceDate: 1,
                                   InvoiceNumber: 1,
                                   InvoiceAmount: 1,
                                   AvailableAmount: 1,
                                   InvoiceStatus: 1,
                                   PaidORUnpaid:1,
                                   PaidAmount:1,
                                   RemainingAmount:1,
                                   InvoiceDescription: 1,
                                   CurrentCreditAmount: 1,
                                   TemporaryCreditAmount: 1,
                                   AcceptRemarks: 1,
                                   DisputedRemarks: 1,
                                   ResendRemarks: 1,
                                   InvoiceAttachments: 1,
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
                   InvoiceManagement.InvoiceSchema.countDocuments(FindQuery).exec()
               ]).then(result => {
                   res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
               }).catch(Error => {
                   ErrorHandling.ErrorLogCreation(req, 'Invoice Find error', 'InvoiceManagement -> All Invoice List', JSON.stringify(Error));
                   res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
               });
           } else {
               res.status(200).send({ Http_Code: 400, Status: false, Message: 'Invalid User Details' });
           }
       });
   }

};


// BuyerDisputedInvoice_List
exports.BuyerDisputedInvoice_List = function (req, res) {
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
               var BusinessArr = [];
               BusinessArr.push(ReceivingData.BuyerBusiness);
               if (BuyerDetails.CustomerType === 'Owner') {
                   Buyer = mongoose.Types.ObjectId(BuyerDetails._id);
                   FindQuery = { Buyer: Buyer, BuyerBusiness: ReceivingData.BuyerBusiness,InvoiceStatus: "Disputed" };
               } else if (BuyerDetails.CustomerType === 'User') {
                   Buyer = mongoose.Types.ObjectId(BuyerDetails.Owner);
                   if (BuyerDetails.BusinessAndBranches.length !== 0) {
                       BuyerDetails.BusinessAndBranches.map(Obj => {
                           // Obj.Branches.map(obj => {
                               BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                           // });
                       });
                   }
                   FindQuery = { Buyer: Buyer, BuyerBusiness: { $in: BusinessArr }, InvoiceStatus: "Disputed" };
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
                   InvoiceManagement.InvoiceSchema
                       .aggregate([
                           { $match: FindQuery },
                           {
                               $lookup: {
                                   from: "Business",
                                   let: { "business": "$Business" },
                                   pipeline: [
                                       { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                                       { $project:  { "FirstName": 1,"LastName": 1 ,"BusinessCreditLimit":1,"AvailableCreditLimit":1} }
                                   ],
                                   as: 'Business'
                               }
                           },
                           { $unwind: { path: "$Business", preserveNullAndEmptyArrays: true } },
                           // {
                           //     $lookup: {
                           //         from: "Branch",
                           //         let: { "branch": "$Branch" },
                           //         pipeline: [
                           //             { $match: { $expr: { $eq: ["$$branch", "$_id"] } } },
                           //             { $project: { "BranchName": 1 } }
                           //         ],
                           //         as: 'BranchInfo'
                           //     }
                           // },
                           // { $unwind: { path: "$BranchInfo", preserveNullAndEmptyArrays: true } },
                           {
                               $lookup: {
                                   from: "Business",
                                   let: { "buyerBusiness": "$BuyerBusiness" },
                                   pipeline: [
                                       { $match: { $expr: { $eq: ["$$buyerBusiness", "$_id"] } } },
                                       { $project:  { "FirstName": 1,"LastName": 1 ,"BusinessCreditLimit":1,"AvailableCreditLimit":1} }
                                   ],
                                   as: 'BuyerBusiness'
                               }
                           },
                           { $unwind: { path: "$BuyerBusiness", preserveNullAndEmptyArrays: true } },
                           // {
                           //     $lookup: {
                           //         from: "Branch",
                           //         let: { "buyerBranch": "$BuyerBranch" },
                           //         pipeline: [
                           //             { $match: { $expr: { $eq: ["$$buyerBranch", "$_id"] } } },
                           //             { $project: { "BranchName": 1 } }
                           //         ],
                           //         as: 'BuyerBranchInfo'
                           //     }
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
                               $project: {
                                   Business: 1,
                                   // BranchInfo: 1,
                                   buyer: 1,
                                   BuyerBusiness: 1,
                                   // BuyerBranchInfo: 1,
                                   Seller: 1,
                                   InvoiceDate: 1,
                                   InvoiceNumber: 1,
                                   InvoiceAmount: 1,
                                   AvailableAmount: 1,
                                   RemainingAmount:1,
                                   PaidORUnpaid:1,
                                   InvoiceStatus: 1,
                                   InvoiceDescription: 1,
                                   CurrentCreditAmount: 1,
                                   TemporaryCreditAmount: 1,
                                   AcceptRemarks: 1,
                                   DisputedRemarks: 1,
                                   ResendRemarks: 1,
                                   InvoiceAttachments: 1,
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
                   InvoiceManagement.InvoiceSchema.countDocuments(FindQuery).exec()
               ]).then(result => {
                   res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
               }).catch(Error => {
                   ErrorHandling.ErrorLogCreation(req, 'Invoice Find error', 'InvoiceManagement -> All Invoice List', JSON.stringify(Error));
                   res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
               });
           } else {
               res.status(200).send({ Http_Code: 400, Status: false, Message: 'Invalid User Details' });
           }
       });
   }

};


// Seller All Invoice List 
exports.SellerPendingInvoice_List = function (req, res) {
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
                   FindQuery = { Seller: Seller, Business: ReceivingData.Business, InvoiceStatus: "Pending" };
               } else if (SellerDetails.CustomerType === 'User') {
                   Seller = mongoose.Types.ObjectId(SellerDetails.Owner);
                   if (SellerDetails.BusinessAndBranches.length !== 0) {
                       SellerDetails.BusinessAndBranches.map(Obj => {
                           // Obj.Branches.map(obj => {
                               BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                           // });
                       });
                   }
                   FindQuery = { Seller: Seller, Business: { $in: BusinessArr }, InvoiceStatus: "Pending" };
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
                   InvoiceManagement.InvoiceSchema
                       .aggregate([
                           { $match: FindQuery },
                           {
                               $lookup: {
                                   from: "Business",
                                   let: { "buyerBusiness": "$BuyerBusiness" },
                                   pipeline: [
                                       { $match: { $expr: { $eq: ["$$buyerBusiness", "$_id"] } } },
                                       { $project:  { "FirstName": 1,"LastName": 1 ,"BusinessCreditLimit":1,"AvailableCreditLimit":1} }
                                   ],
                                   as: 'BuyerBusiness'
                               }
                           },
                           { $unwind: { path: "$BuyerBusiness", preserveNullAndEmptyArrays: true } },
                           // {
                           //     $lookup: {
                           //         from: "Branch",
                           //         let: { "buyerBranch": "$BuyerBranch" },
                           //         pipeline: [
                           //             { $match: { $expr: { $eq: ["$$buyerBranch", "$_id"] } } },
                           //             { $project: { "BranchName": 1 } }
                           //         ],
                           //         as: 'BuyerBranchInfo'
                           //     }
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
                                       { $project:  { "FirstName": 1,"LastName": 1 ,"BusinessCreditLimit":1,"AvailableCreditLimit":1} }
                                   ],
                                   as: 'Business'
                               }
                           },
                           { $unwind: { path: "$Business", preserveNullAndEmptyArrays: true } },
                           // {
                           //     $lookup: {
                           //         from: "Branch",
                           //         let: { "branch": "$Branch" },
                           //         pipeline: [
                           //             { $match: { $expr: { $eq: ["$$branch", "$_id"] } } },
                           //             { $project: { "BranchName": 1 } }
                           //         ],
                           //         as: 'BranchInfo'
                           //     }
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
                                   InvoiceDate: 1,
                                   InvoiceAmount: 1,
                                   AvailableAmount: 1,
                                   InvoiceStatus: 1,
                                   RemainingAmount:1,
                                   InvoiceNumber: 1,
                                   PaidORUnpaid:1,
                                   InvoiceDescription: 1,
                                   CurrentCreditAmount: 1,
                                   TemporaryCreditAmount: 1,
                                   AcceptRemarks: 1,
                                   DisputedRemarks: 1,
                                   ResendRemarks: 1,
                                   InvoiceAttachments: 1,
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
                   InvoiceManagement.InvoiceSchema.countDocuments(FindQuery).exec()
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



// SellerAcceptInvoice_List
exports.SellerAcceptInvoice_List = function (req, res) {
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
               var BusinsArr = [];
               BusinsArr.push(ReceivingData.BuyerBusiness);
               if (SellerDetails.CustomerType === 'Owner') {
                   Seller = mongoose.Types.ObjectId(SellerDetails._id);
                   FindQuery = { Seller: Seller, Business: ReceivingData.Business,InvoiceStatus: "Accept" };
               } else if (SellerDetails.CustomerType === 'User') {
                   Seller = mongoose.Types.ObjectId(SellerDetails.Owner);

                   if (SellerDetails.BusinessAndBranches.length !== 0) {
                       SellerDetails.BusinessAndBranches.map(Obj => {
                           // Obj.Branches.map(obj => {
                               BusinsArr.push(mongoose.Types.ObjectId(Obj.Business));
                           // });
                       });
                   }
                   FindQuery = { Seller: Seller, Business: { $in: BusinsArr }, InvoiceStatus: "Accept" };
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
                   InvoiceManagement.InvoiceSchema
                       .aggregate([
                           { $match: FindQuery },
                           {
                               $lookup: {
                                   from: "Business",
                                   let: { "buyerBusiness": "$BuyerBusiness" },
                                   pipeline: [
                                       { $match: { $expr: { $eq: ["$$buyerBusiness", "$_id"] } } },
                                       { $project:  { "FirstName": 1,"LastName": 1 ,"BusinessCreditLimit":1,"AvailableCreditLimit":1} }
                                   ],
                                   as: 'BuyerBusiness'
                               }
                           },
                           { $unwind: { path: "$BuyerBusiness", preserveNullAndEmptyArrays: true } },
                           // {
                           //     $lookup: {
                           //         from: "Branch",
                           //         let: { "buyerBranch": "$BuyerBranch" },
                           //         pipeline: [
                           //             { $match: { $expr: { $eq: ["$$buyerBranch", "$_id"] } } },
                           //             { $project: { "BranchName": 1 } }
                           //         ],
                           //         as: 'BuyerBranchInfo'
                           //     }
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
                                       { $project:  { "FirstName": 1,"LastName": 1 ,"BusinessCreditLimit":1,"AvailableCreditLimit":1} }
                                   ],
                                   as: 'Business'
                               }
                           },
                           { $unwind: { path: "$Business", preserveNullAndEmptyArrays: true } },
                           // {
                           //     $lookup: {
                           //         from: "Branch",
                           //         let: { "branch": "$Branch" },
                           //         pipeline: [
                           //             { $match: { $expr: { $eq: ["$$branch", "$_id"] } } },
                           //             { $project: { "BranchName": 1 } }
                           //         ],
                           //         as: 'BranchInfo'
                           //     }
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
                                   InvoiceDate: 1,
                                   InvoiceAmount: 1,
                                   AvailableAmount: 1,
                                   InvoiceStatus: 1,
                                   InvoiceNumber: 1,
                                   RemainingAmount:1,
                                   InvoiceDescription: 1,
                                   PaidORUnpaid:1,
                                   PaidAmount:1,
                                   CurrentCreditAmount: 1,
                                   TemporaryCreditAmount: 1,
                                   AcceptRemarks: 1,
                                   DisputedRemarks: 1,
                                   ResendRemarks: 1,
                                   InvoiceAttachments: 1,
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
                   InvoiceManagement.InvoiceSchema.countDocuments(FindQuery).exec()
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


// SellerDisputedInvoice_List
exports.SellerDisputedInvoice_List = function (req, res) {
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
                   FindQuery = { Seller: Seller, Business: ReceivingData.Business,InvoiceStatus: "Disputed" };
               } else if (SellerDetails.CustomerType === 'User') {
                   Seller = mongoose.Types.ObjectId(SellerDetails.Owner);

                   if (SellerDetails.BusinessAndBranches.length !== 0) {
                       SellerDetails.BusinessAndBranches.map(Obj => {
                           // Obj.Branches.map(obj => {
                               BranchArr.push(mongoose.Types.ObjectId(Obj.Business));
                           // });
                       });
                   }
                   FindQuery = { Seller: Seller, Business: { $in: BusinessArr }, InvoiceStatus: "Disputed" };
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
                   InvoiceManagement.InvoiceSchema
                       .aggregate([
                           { $match: FindQuery },
                           {
                               $lookup: {
                                   from: "Business",
                                   let: { "buyerBusiness": "$BuyerBusiness" },
                                   pipeline: [
                                       { $match: { $expr: { $eq: ["$$buyerBusiness", "$_id"] } } },
                                       { $project:  { "FirstName": 1,"LastName": 1 ,"BusinessCreditLimit":1,"AvailableCreditLimit":1} }
                                   ],
                                   as: 'BuyerBusiness'
                               }
                           },
                           { $unwind: { path: "$BuyerBusiness", preserveNullAndEmptyArrays: true } },
                           // {
                           //     $lookup: {
                           //         from: "Branch",
                           //         let: { "buyerBranch": "$BuyerBranch" },
                           //         pipeline: [
                           //             { $match: { $expr: { $eq: ["$$buyerBranch", "$_id"] } } },
                           //             { $project: { "BranchName": 1 } }
                           //         ],
                           //         as: 'BuyerBranchInfo'
                           //     }
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
                                       { $project:  { "FirstName": 1,"LastName": 1 ,"BusinessCreditLimit":1,"AvailableCreditLimit":1} }
                                   ],
                                   as: 'Business'
                               }
                           },
                           { $unwind: { path: "$Business", preserveNullAndEmptyArrays: true } },
                           // {
                           //     $lookup: {
                           //         from: "Branch",
                           //         let: { "branch": "$Branch" },
                           //         pipeline: [
                           //             { $match: { $expr: { $eq: ["$$branch", "$_id"] } } },
                           //             { $project: { "BranchName": 1 } }
                           //         ],
                           //         as: 'BranchInfo'
                           //     }
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
                                   InvoiceDate: 1,
                                   InvoiceAmount: 1,
                                   AvailableAmount: 1,
                                   InvoiceStatus: 1,
                                   InvoiceNumber: 1,
                                   PaidORUnpaid:1,
                                   RemainingAmount:1,
                                   InvoiceDescription: 1,
                                   CurrentCreditAmount: 1,
                                   TemporaryCreditAmount: 1,
                                   AcceptRemarks: 1,
                                   DisputedRemarks: 1,
                                   ResendRemarks: 1,
                                   InvoiceAttachments: 1,
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
                   InvoiceManagement.InvoiceSchema.countDocuments(FindQuery).exec()
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