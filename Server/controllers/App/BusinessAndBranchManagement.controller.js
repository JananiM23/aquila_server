var mongoose = require('mongoose');
var moment = require('moment');
var CustomersManagement = require('../../Models/CustomerManagement.model');
var BusinessAndBranchManagement = require('./../../Models/BusinessAndBranchManagement.model');
var InvoiceManagement = require('../../Models/InvoiceManagement.model');
var PaymentManagement = require('../../Models/PaymentManagement.model');
var InviteManagement = require('../../Models/Invite_Management.model');
var TemporaryManagement = require('../../Models/TemporaryCredit.model');
var IndustryManagement = require('../../Models/industryManagement.model');
var ErrorHandling = require('../../Handling/ErrorHandling').ErrorHandling;
const InvoiceManagementModel = require('../../Models/InvoiceManagement.model');


// Create a Seller Business
exports.CreateBusiness = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "Customer can not be empty" });
   } else if (!ReceivingData.FirstName || ReceivingData.FirstName === '') {
      res.status(400).send({ Status: false, Message: "First name can not be empty" });
      //   } else if (!ReceivingData.LastName || ReceivingData.LastName === '') {
      // res.status(400).send({ Status: false, Message: "Last name can not be empty" });
   } else if (!ReceivingData.Mobile || ReceivingData.Mobile === '') {
      res.status(400).send({ Status: false, Message: "Mobile Number can not be empty" });
   } else if (!ReceivingData.Industry || ReceivingData.Industry === '') {
      res.status(400).send({ Status: false, Message: "Industry can not be empty" });
   } else if (!ReceivingData.BusinessCreditLimit || ReceivingData.BusinessCreditLimit === '') {
      res.status(400).send({ Status: false, Message: "Business credit Limit can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer category Limit can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, CustomerType: 'Owner', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(ResponseRes => {
         if (ResponseRes[0] !== null) {
            const Business = mongoose.Types.ObjectId();
            ReceivingData.Industry = mongoose.Types.ObjectId(ReceivingData.Industry);
            var BusinessAvailableCreditLimit = 0;
            if (ReceivingData.BusinessCreditLimit > 0 && ReceivingData.CustomerCategory === 'Seller') {
               BusinessAvailableCreditLimit = Number(ReceivingData.BusinessCreditLimit);
               BusinessAvailableCreditLimit = BusinessAvailableCreditLimit.toFixed(2);
               BusinessAvailableCreditLimit = parseFloat(BusinessAvailableCreditLimit);
            }

            const Create_Business = new BusinessAndBranchManagement.BusinessSchema({
               _id: Business,
               Customer: ReceivingData.CustomerId,
               FirstName: ReceivingData.FirstName,
               LastName: ReceivingData.LastName,
               Mobile:ReceivingData.Mobile,
               Industry: ReceivingData.Industry,
               BusinessCreditLimit: ReceivingData.BusinessCreditLimit,
               AvailableCreditLimit: BusinessAvailableCreditLimit,
               UserAssigned: false,
               IfBuyer: ReceivingData.CustomerCategory === 'Buyer' ? true : false,
               IfSeller: ReceivingData.CustomerCategory === 'Seller' ? true : false,
               PDFFiles: [],
               ActiveStatus: true,
               IfDeleted: false
            });
           
            Promise.all([
               // Create_Business.save(),
               BusinessAndBranchManagement.BusinessSchema.find({ActiveStatus:true,IfDeleted:false,Mobile:ReceivingData.Mobile},{},{}).exec()
            ]).then(response => {
                     var BusinessDetails = JSON.parse(JSON.stringify(response[0]));
                     var RFirstName = String(ReceivingData.FirstName);
                     var RLastName = String(ReceivingData.LastName);
                     var DFirstName;
                     var DLastName;
               
                     var isDuplicate = false;

                     BusinessDetails.forEach(obj => {
                        var DFirstName = obj.FirstName;
                        var DLastName = obj.LastName;
                  
                        if (ReceivingData.Mobile === obj.Mobile) {
                           if (RFirstName === DFirstName && RLastName === DLastName) {
                              isDuplicate = true;
                           }
                        }
                     });

                     if (isDuplicate) {
                        res.status(200).send({ Status: true, Message: 'Mobile number already registered for this business name' });
                     } else {
                        Create_Business.save()
                           .then(() => {
                              res.status(200).send({ Status: true,Response:Create_Business, Message: 'Business successfully created' });
                           })
                           .catch(error => {
                              BusinessAndBranchManagement.BusinessSchema.deleteOne({ _id: Business }).exec();
                              ErrorHandling.ErrorLogCreation(req, 'Business create error', 'BusinessAndBranchManagement.controller -> CreateBusinessAndBranch', JSON.stringify(error));
                              res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to create the business!.", Error: JSON.stringify(error) });
                           });
                     }
                     
            })   
         } else {
            res.status(200).send({ Status: false, Message: "Invalid owner details, unable to create the business" });
         }
      }).catch(error => {
         res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to create the business!.", Error: JSON.stringify(error) });
      });
   }
};


// User Creation Business List
exports.BusinessDetailsList = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "Customer can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer category can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      var IfSeller = false;
      var IfBuyer = false;

      if (ReceivingData.CustomerCategory === 'Seller') {
         IfSeller = true;
      } else if (ReceivingData.CustomerCategory === 'Buyer') {
         IfBuyer = true;
      }
      Promise.all([
         BusinessAndBranchManagement.BusinessSchema.find({ Customer: ReceivingData.CustomerId, IfSeller: IfSeller, IfBuyer: IfBuyer, ActiveStatus: true, IfDeleted: false }, {}, {})
            .populate({ path: "Customer", select: ["ContactName", "Mobile", "Email", "CustomerCategory", "CustomerType"] })
            .populate({ path: "Industry", select: ["Industry_Name", "Status"] }).exec(),
      ]).then(Response => {
         var BusinessDetails = JSON.parse(JSON.stringify(Response[0]));
         if (BusinessDetails.length !== 0) {
            BusinessDetails = BusinessDetails.map(Obj => {
               Obj.UserAssigned = true
               return Obj;  
            });
            res.status(200).send({ Status: true, Response: BusinessDetails, Message: 'Business list' });
         } else {
            res.status(200).send({ Status: true, Response: [], Message: 'Business list' });
         }
      }).catch(error => {
         ErrorHandling.ErrorLogCreation(req, 'Business simple list getting error', 'BusinessAndBranchManagement.Controller -> BusinessAndBranches_DetailsList', JSON.stringify(error));
         res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get business!.", Error: error });
      });
   }
};


//Invite_BusinessDetailsList
exports.Invite_BusinessDetailsList = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "Customer can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer category can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      var IfSeller = false;
      var IfBuyer = false;

      if (ReceivingData.CustomerCategory === 'Seller') {
         IfSeller = true;
      } else if (ReceivingData.CustomerCategory === 'Buyer') {
         IfBuyer = true;
      }
      Promise.all([
         BusinessAndBranchManagement.BusinessSchema.find({ Customer: ReceivingData.CustomerId, IfSeller: IfSeller, IfBuyer: IfBuyer, ActiveStatus: true, IfDeleted: false }, {}, {})
             .populate({ path: "Customer", select: ["ContactName", "Mobile", "Email", "CustomerCategory", "CustomerType"] })
             .populate({ path: "Industry", select: ["Industry_Name", "Status"] }).exec(),
         InviteManagement.InviteManagementSchema.find({
             InvitedBy: ReceivingData.CustomerId,
             $or: [{ Invite_Status: 'Pending_Approval' }, { Invite_Status: 'Pending' }],
             ActiveStatus: true, IfDeleted: false
         }, {}, {}).exec()
     ]).then(Response => {
         var BusinessDetails = JSON.parse(JSON.stringify(Response[0]));
         var InvitedDetails = JSON.parse(JSON.stringify(Response[1]));

         if (BusinessDetails.length > 0) {
         BusinessDetails.map(business=>{
            InvitedDetails.map(Invite =>{
               if (business._id === Invite.Business) {
                     var X = business.AvailableCreditLimit - Invite.BuyerCreditLimit;
                     business.AvailableCreditLimit = X;
               } else {
                  var X = business.AvailableCreditLimit;
                  business.AvailableCreditLimit = X;
               }
             

                // Check if AvailableCreditLimit is 0 and send a response
   //      if (business.AvailableCreditLimit > Invite.BuyerCreditLimit) {
   //       res.status(200).send({ Status: true, Message: 'Sorry Businees Available Limit Lesser than the Invite Amount !' });
   //   }
   })
         })
      } 
         if (BusinessDetails.length > 0) {
             BusinessDetails = BusinessDetails.map(Obj => {
                     Obj.UserAssigned = true;
                 return Obj;
             });
             res.status(200).send({ Status: true, Response: BusinessDetails, Message: 'Business list' });
         } else {
             res.status(200).send({ Status: true, Response: [], Message: 'Business list' });
         }
     }).catch(error => {
         ErrorHandling.ErrorLogCreation(req, 'Business simple list getting error', 'BusinessAndBranchManagement.Controller -> BusinessAndBranches_DetailsList', JSON.stringify(error));
         res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get business!.", Error: error });
     });
   }
};


//FilteredBusinessDetailsList
exports.FilteredBusinessDetailsList = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
       res.status(400).send({ Status: false, Message: "Customer can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
     res.status(400).send({ Status: false, Message: "Customern Category can not be empty" });
 } else{
   ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.CustomerId);

   Promise.all([
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer,$or: [{ CustomerCategory: ReceivingData.CustomerCategory }, { CustomerCategory: 'BothBuyerAndSeller' }] }, {}, {}).exec(),
   ]).then(Response => {
      var CustomerDetails = Response[0];
      // console.log(CustomerDetails,'CustomerDetails');
      var BusinessArr = [];
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

         if (ReceivingData.CustomerCategory === 'Seller') {
            var FindQuery = { 'IfDeleted': false, Customer: ReceivingData.Customer, IfSeller: true, IfBuyer: false };
         } else if (ReceivingData.CustomerCategory === 'Buyer') {
          var FindQuery = { 'IfDeleted': false, Customer: ReceivingData.Customer, IfSeller: false, IfBuyer: true };
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
        var InvoiceQuery = {};
      //   var FindQuery = {};
        var BranchFindQuery = {};
        var BusinessFindQuery = {};
        var TemporaryQuery = {};
        var InviteQuery = {};
        var InvoicePendingListQuery = {};
        if (ReceivingData.CustomerCategory === 'Seller') {
         if (CustomerDetails.CustomerType === 'Owner') {
            InvoiceQuery = { Seller: ReceivingData.Customer, PaidORUnpaid: "Unpaid",InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
            // FindQuery = { Customer: ReceivingData.Customer, IfSeller: true, IfBuyer: false, ActiveStatus: true, IfDeleted: false };
            InviteQuery = { Seller: ReceivingData.Customer, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
            TemporaryQuery = { Seller: ReceivingData.Customer, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
         } else if (CustomerDetails.CustomerType === 'User') {
            if (CustomerDetails.BusinessAndBranches.length > 0) {
               CustomerDetails.BusinessAndBranches.map(Obj => {
                  BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
               });
            }
            // FindQuery = { _id: { $in: BusinessArr }, IfSeller: true, IfBuyer: false, ActiveStatus: true, IfDeleted: false };
            InvoiceQuery = { Business: { $in: BusinessArr }, PaidORUnpaid: "Unpaid",InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
            TemporaryQuery = { Business: { $in: BusinessArr }, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
            InviteQuery = { Business: { $in: BusinessArr }, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
            BusinessFindQuery = { _id: { $in: BusinessArr },  ActiveStatus: true, IfDeleted: false };

         }

      } else if (ReceivingData.CustomerCategory === 'Buyer') {
         if (CustomerDetails.CustomerType === 'Owner') {
            InvoiceQuery = { Buyer: ReceivingData.Customer, PaidORUnpaid: "Unpaid",InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
            InvoicePendingListQuery =  { Buyer: ReceivingData.Customer,  InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
            // FindQuery = { Customer: ReceivingData.Customer, IfSeller: false, IfBuyer: true, ActiveStatus: true, IfDeleted: false };
            TemporaryQuery = { Buyer: ReceivingData.Customer, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
            InviteQuery = { Buyer: ReceivingData.Customer, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
         } else if (CustomerDetails.CustomerType === 'User') {
            if (CustomerDetails.BusinessAndBranches.length > 0) {
               CustomerDetails.BusinessAndBranches.map(Obj => {
                  BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
               });
            }
            InvoiceQuery = { BuyerBusiness: { $in: BusinessArr },PaidORUnpaid: "Unpaid", InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
            InvoicePendingListQuery = { BuyerBusiness: { $in: BusinessArr }, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
            // FindQuery = { _id: { $in: BusinessArr }, IfSeller: false, IfBuyer: true, ActiveStatus: true, IfDeleted: false };
            TemporaryQuery = { BuyerBusiness: { $in: BusinessArr }, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
            InviteQuery = { BuyerBusiness: { $in: BusinessArr }, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
            BusinessFindQuery = { _id: { $in: BusinessArr },  ActiveStatus: true, IfDeleted: false };
         }
      }

      Promise.all([
         BusinessAndBranchManagement.BusinessSchema.aggregate([
             { $match: FindQuery },
             { $sort: ShortOrder },
             { $skip: Skip_Count },
             { $limit: Limit_Count },
             {
               $lookup: {
                 from: 'IndustryManagement', // Name of the Industry collection
                 localField: 'Industry', // Field in BusinessSchema
                 foreignField: '_id', // Field in IndustrySchema
                 as: 'IndustryData', // Alias for the joined data
               },
             },
             {
               $unwind: "$IndustryData"
             },
             
         ]).exec(),
         BusinessAndBranchManagement.BusinessSchema.countDocuments(FindQuery)
         .exec(),
         InvoiceManagementModel.InvoiceSchema.find(InvoiceQuery, {}, {}).exec(),
         TemporaryManagement.CreditSchema.find(TemporaryQuery, {}, {}).exec(),
         InviteManagement.InviteManagementSchema.find(InviteQuery, {}, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.find(BusinessFindQuery, {}, {})
         .exec(),
         InvoiceManagementModel.InvoiceSchema.find(InvoicePendingListQuery, {}, {}).exec(),
      ]).then(ResponseRes => {
            
               var BusinessDetails = JSON.parse(JSON.stringify(ResponseRes[0]));
               var BusinessCount = JSON.parse(JSON.stringify(ResponseRes[1]));
               var InvoiceDetails = JSON.parse(JSON.stringify(ResponseRes[2]));
               var TemporaryDetails = JSON.parse(JSON.stringify(ResponseRes[3]));
               var InviteDetails = JSON.parse(JSON.stringify(ResponseRes[4]));
               var BusinessDetailLists = JSON.parse(JSON.stringify(ResponseRes[5]));
               var InvoicePendingList = JSON.parse(JSON.stringify(ResponseRes[6]));
     
          // Seller Business Available Credit balance check
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

              


                  // Need to test
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
                     //   var mInvoiceDate = moment(obj.InvoiceDueDate)

                     //    if(mInvoiceDate.valueOf() < TodayDate.valueOf())
                     //    {
                     //       OverDueAmount = parseFloat(OverDueAmount) + parseFloat(obj.InvoiceAmount);
                           
                     //    }
                     //    else if(mInvoiceDate.valueOf() > TodayDate.valueOf())
                     //    {
                     //       UpComingAmount = parseFloat(UpComingAmount) + parseFloat(obj.InvoiceAmount);
                          
                          
                     //    }
                     //    else if(mInvoiceDate.valueOf() === TodayDate.valueOf())
                     //    {
                     //       DueTodayAmount = parseFloat(DueTodayAmount) + parseFloat(obj.InvoiceAmount);
                          
                     //    }
                       
                        // Parse invoice due date
                     var mInvoiceDate = moment(obj.InvoiceDueDate).startOf('day'); // Consider using moment to ensure consistent date comparison

                     // Compare due date with today's date
                     if (mInvoiceDate.isBefore(TodayDate, 'day')) {
                           OverDueAmount += parseFloat(obj.RemainingAmount);
                     } else if (mInvoiceDate.isAfter(TodayDate, 'day')) {
                           UpComingAmount += parseFloat(obj.RemainingAmount);
                     } else if (mInvoiceDate.isSame(TodayDate, 'day')) {
                           DueTodayAmount += parseFloat(obj.RemainingAmount);
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
                 // Get the full names and convert them to lowercase
                  let nameA = (a.FirstName + " " + a.LastName).toLowerCase();
                  let nameB = (b.FirstName + " " + b.LastName).toLowerCase();
                
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

             
             // Sort the array using the comparison function
             BusinessDetails.sort(compareNames);

          res.status(200).send({ Status: true, Message: "My Business List!!!.", Response: BusinessDetails,SubResponse: BusinessCount});
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

// User Creation Business List
exports.UsersBusinessAndBranches_List = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "Customer can not be empty" });
   } else if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer category can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      var IfSeller = false;
      var IfBuyer = false;

      if (ReceivingData.CustomerCategory === 'Seller') {
         IfSeller = true;
      } else if (ReceivingData.CustomerCategory === 'Buyer') {
         IfBuyer = true;
      }
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.User, ActiveStatus: true, IfDeleted: false }, {}, {})
      .exec((err, result) => {
         if (err) {
            ErrorHandling.ErrorLogCreation(req, 'Business simple list getting error', 'BusinessAndBranchManagement.Controller -> BusinessAndBranches_DetailsList', JSON.stringify(error));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get business!.", Error: error });
         } else {
            result = JSON.parse(JSON.stringify(result)); // User  fetcheed
            var UserBusinessArr = [];
            if (result !== null) {
             
               result.BusinessAndBranches.map(Obj => {
                      UserBusinessArr.push(Obj.Business);
               });
            }
            Promise.all([
               BusinessAndBranchManagement.BusinessSchema.find({ Customer: ReceivingData.CustomerId,IfSeller: IfSeller, IfBuyer: IfBuyer, ActiveStatus: true, IfDeleted: false }, {}, {})
                  .populate({ path: "Customer", select: ["ContactName", "Mobile", "Email", "CustomerCategory", "CustomerType"] })
                  .populate({ path: "Industry", select: ["Industry_Name", "Status"] }).exec(),
              
            ]).then(Response => {
               var BusinessDetails = JSON.parse(JSON.stringify(Response[0]));
                  const BusinessConfirmArr = BusinessDetails.map(obj1 => 
                  {
                     
                     UserBusinessArr.map(idd =>{
                     if (obj1._id === idd) {
                       obj1.is_business=true;
                     }
                     // else if(obj1._id != idd){
                     //    obj1.is_business=false;
                     // }
                     })
                     return obj1;
                  }); 


               if (BusinessDetails.length !== 0) {
                  res.status(200).send({ Status: true, Response: BusinessDetails, Message: 'Business list' });
               } else {
                  res.status(200).send({ Status: true, Response: [], Message: 'Business list' });
               }
            }).catch(error => {
               ErrorHandling.ErrorLogCreation(req, 'Business simple list getting error', 'BusinessAndBranchManagement.Controller -> BusinessAndBranches_DetailsList', JSON.stringify(error));
               res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get business!.", Error: error });
            });
         }
      });

   }
};


//UsersBusinessAndUsersList
exports.UsersBusinessAndUsersList = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "Customer can not be empty" });
   } else if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer category can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      var IfSeller = false;
      var IfBuyer = false;

      if (ReceivingData.CustomerCategory === 'Seller') {
         IfSeller = true;
      } else if (ReceivingData.CustomerCategory === 'Buyer') {
         IfBuyer = true;
      }
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.User, ActiveStatus: true, IfDeleted: false }, {}, {})
      .exec((err, result) => {
         if (err) {
            ErrorHandling.ErrorLogCreation(req, 'Business and branches simple list getting error', 'BusinessAndBranchManagement.Controller -> BusinessAndBranches_DetailsList', JSON.stringify(error));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get business and branches!.", Error: error });
         } else {
            result = JSON.parse(JSON.stringify(result));
           
            Promise.all([
               BusinessAndBranchManagement.BusinessSchema.find({ Customer: ReceivingData.CustomerId, IfSeller: IfSeller, IfBuyer: IfBuyer, ActiveStatus: true, IfDeleted: false }, {}, {})
                  .populate({ path: "Customer", select: ["ContactName", "Mobile", "Email", "CustomerCategory", "CustomerType","IfUserBusiness"] })
                  .populate({ path: "Industry", select: ["Industry_Name", "Status"] }).exec(),
            ]).then(Response => {
               var BusinessDetails = JSON.parse(JSON.stringify(Response[0]));
               if (BusinessDetails.length !== 0) {
                  res.status(200).send({ Status: true, Response: BusinessDetails, Message: 'Business list' });
               } else {
                  res.status(200).send({ Status: true, Response: [], Message: 'Business list' });
               }
            }).catch(error => {
               ErrorHandling.ErrorLogCreation(req, 'Business simple list getting error', 'BusinessAndBranchManagement.Controller -> BusinessAndBranches_DetailsList', JSON.stringify(error));
               res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get business!.", Error: error });
            });
         }
      });

   }
};



// Business Update
exports.BusinessUpdate = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "Customer can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer category can not be empty" });
   } else if (!ReceivingData.BusinessId || ReceivingData.BusinessId === '') {
      res.status(400).send({ Status: false, Message: "Business details can not be empty" });
   } else if (!ReceivingData.FirstName || ReceivingData.FirstName === '') {
      res.status(400).send({ Status: false, Message: "First name can not be empty" });
        } else if (!ReceivingData.LastName || ReceivingData.LastName === '') {
      res.status(400).send({ Status: false, Message: "Last name can not be empty" });
   } else if (!ReceivingData.Industry || ReceivingData.Industry === '') {
      res.status(400).send({ Status: false, Message: "Industry can not be empty" });
   } else if (!ReceivingData.BusinessCreditLimit || ReceivingData.BusinessCreditLimit === '') {
      res.status(400).send({ Status: false, Message: "Business credit limit can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      ReceivingData.BusinessId = mongoose.Types.ObjectId(ReceivingData.BusinessId);
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, $or: [{ CustomerCategory: ReceivingData.CustomerCategory }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.BusinessId, Customer: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var CustomerDetails = JSON.parse(JSON.stringify(Response[0]));
         var BusinessDetails = JSON.parse(JSON.stringify(Response[1]));
         if (CustomerDetails !== null && BusinessDetails !== null ) {
            var BusinessCreditLimit = BusinessDetails.BusinessCreditLimit;
            var AvailableBusinessCreditLimit = BusinessDetails.AvailableCreditLimit;
          
            if (Number(ReceivingData.BusinessCreditLimit) !== BusinessDetails.BusinessCreditLimit) {
               BusinessCreditLimit = Number(BusinessDetails.BusinessCreditLimit) + Number(ReceivingData.BusinessCreditLimit);
               // AvailableBusinessCreditLimit = Math.abs((BusinessDetails.BusinessCreditLimit - Number(ReceivingData.BusinessCreditLimit)) - BusinessDetails.AvailableCreditLimit);
               AvailableBusinessCreditLimit = Number(BusinessDetails.AvailableCreditLimit) + Number(ReceivingData.BusinessCreditLimit);
            }
            
            BusinessAndBranchManagement.BusinessSchema.updateOne({ _id: ReceivingData.BusinessId },
               {
                  $set: {
                     FirstName: ReceivingData.FirstName,
                     LastName: ReceivingData.LastName,
                     Industry: ReceivingData.Industry,
                     BusinessCreditLimit: BusinessCreditLimit,
                     AvailableCreditLimit: AvailableBusinessCreditLimit
                  }
               }).exec(function (err_2, result_2) {
                  if (err_2) {
                     res.status(417).send({ Status: false, Message: "Some error occurred while update the business details!.", Error: JSON.stringify(err_2) });
                  } else {
                     res.status(200).send({ Status: true, Message: "Business details successfully updated!." });
                  }
               });
         } else {
            res.status(417).send({ Status: false, Message: "Invalid customer details!." });
         }
      }).catch(error => {
         ErrorHandling.ErrorLogCreation(req, 'Business details find getting error', 'BusinessAndBranchManagement.controller -> BusinessUpdate', JSON.stringify(error));
         res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business!.", Error: JSON.stringify(error) });
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
               InvoiceManagementModel.InvoiceSchema.find(InvoiceQuery, {}, {}).exec(),
               TemporaryManagement.CreditSchema.find(TemporaryQuery, {}, {}).exec(),
               InviteManagement.InviteManagementSchema.find(InviteQuery, {}, {}).exec(),
               BusinessAndBranchManagement.BusinessSchema.find(BusinessFindQuery, {}, {}).exec(),
               InvoiceManagementModel.InvoiceSchema.find(InvoicePendingListQuery, {}, {}).exec(),
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

                     
                     // Need to test 

                     // const result2Arr = InviteDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id && Obj.IfBuyer);
                   
                     // if (result2Arr.length > 0) {
                     //    result2Arr.map(obj => {
                     //       if (CustomerDetails.CustomerCategory === 'Seller') {
                     //          Obj.BusinessCreditLimit = parseFloat(Obj.BusinessCreditLimit) + parseFloat(obj.AvailableLimit);
                     //          Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.AvailableLimit);
                     //       }
                     //       else if (CustomerDetails.CustomerCategory === 'Buyer') {
                     //          BusinessDetails.map(ObjBusiness => {
                     //             if(CustomerDetails.CustomerType === 'User' && ObjBusiness._id === obj.BuyerBusiness) {
                     //             var mInvoiceAmount = 0;
                     //             InvoicePendingList.map(ObjIn1 => {
                     //                if(obj.BuyerBusiness === ObjIn1.BuyerBusiness && obj.Business === ObjIn1.Business) {
                     //                   if(ObjIn1.InvoiceStatus === 'Pending')
                     //                   {
                     //                      mInvoiceAmount = mInvoiceAmount + ObjIn1.UsedCurrentCreditAmount ;  
                     //                   }
                     //                }
                     //              });
                     //             Obj.BusinessCreditLimit = parseFloat(Obj.BusinessCreditLimit) + parseFloat(obj.BuyerCreditLimit);
                     //             Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.AvailableLimit) + parseFloat(mInvoiceAmount);
                     //          } else if(CustomerDetails.CustomerType === 'Owner' && ObjBusiness._id === obj.BuyerBusiness) {
                     //             var mInvoiceAmount = 0;
                     //             InvoicePendingList.map(ObjIn1 => {
                     //                if(obj.BuyerBusiness === ObjIn1.BuyerBusiness && obj.Business === ObjIn1.Business) {
                     //                   if(ObjIn1.InvoiceStatus === 'Pending')
                     //                   {
                     //                      mInvoiceAmount = mInvoiceAmount + ObjIn1.UsedCurrentCreditAmount ;  
                     //                   }
                     //                }
                     //              });
                     //             Obj.BusinessCreditLimit = parseFloat(Obj.BusinessCreditLimit) + parseFloat(obj.BuyerCreditLimit);
                     //             Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.AvailableLimit) + parseFloat(mInvoiceAmount);
                     //          }
                     //          });
                     //       }
                     //    });
                     // }


                     // Need to test
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
                        //   var mInvoiceDate = moment(obj.InvoiceDueDate)

                        //    if(mInvoiceDate.valueOf() < TodayDate.valueOf())
                        //    {
                        //       OverDueAmount = parseFloat(OverDueAmount) + parseFloat(obj.InvoiceAmount);
                              
                        //    }
                        //    else if(mInvoiceDate.valueOf() > TodayDate.valueOf())
                        //    {
                        //       UpComingAmount = parseFloat(UpComingAmount) + parseFloat(obj.InvoiceAmount);
                             
                             
                        //    }
                        //    else if(mInvoiceDate.valueOf() === TodayDate.valueOf())
                        //    {
                        //       DueTodayAmount = parseFloat(DueTodayAmount) + parseFloat(obj.InvoiceAmount);
                             
                        //    }
                          
                           // Parse invoice due date
                        var mInvoiceDate = moment(obj.InvoiceDueDate).startOf('day'); // Consider using moment to ensure consistent date comparison

                        // Compare due date with today's date
                        if (mInvoiceDate.isBefore(TodayDate, 'day')) {
                              OverDueAmount += parseFloat(obj.RemainingAmount);
                        } else if (mInvoiceDate.isAfter(TodayDate, 'day')) {
                              UpComingAmount += parseFloat(obj.RemainingAmount);
                        } else if (mInvoiceDate.isSame(TodayDate, 'day')) {
                              DueTodayAmount += parseFloat(obj.RemainingAmount);
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
                    // Get the full names and convert them to lowercase
                     let nameA = (a.FirstName + " " + a.LastName).toLowerCase();
                     let nameB = (b.FirstName + " " + b.LastName).toLowerCase();
                   
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


//Business Of Branches List
// exports.BusinessOfBranchesList = function (req, res) {
//    var ReceivingData = req.body;
//    if (!ReceivingData.Customer || ReceivingData.Customer === '') {
//       res.status(400).send({ Status: false, Message: "Customer can not be empty" });
//    } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
//       res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
//    } else if (!ReceivingData.Business || ReceivingData.Business === '') {
//       res.status(400).send({ Status: false, Message: "Business Details can not be empty" });
//    } else {
//       ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
//       ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
//       Promise.all([
//          CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer }, {}, {}).exec(),
//       ]).then(Response => {
//          // console.log(Response,"Responseee");
//          var CustomerDetails = Response[0];
//          // console.log(CustomerDetails,'cusssss');
//          var BranchArr = [];
//          if (CustomerDetails !== null) {
//             var InvoiceQuery = {};
//             var FindQuery = {};
//             var TemporaryQuery = {};
//             var InviteQuery = {};
//             var InvoicePendingListQuery = {};
//             if (ReceivingData.CustomerCategory === 'Seller') {
//                if (CustomerDetails.CustomerType === 'Owner') {
//                // console.log('Yes he/She is a Seller Owner');
//                   InvoiceQuery = { Seller: ReceivingData.Customer, Business: ReceivingData.Business,PaidORUnpaid: "Unpaid", InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
//                   FindQuery = { Customer: ReceivingData.Customer, Business: ReceivingData.Business, ActiveStatus: true, IfDeleted: false };
//                   InviteQuery = { Seller: ReceivingData.Customer, Business: ReceivingData.Business, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
//                   TemporaryQuery = { Seller: ReceivingData.Customer, Business: ReceivingData.Business, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
//                // console.log(InvoiceQuery,'InvoiceQuery');
//                // console.log(FindQuery,'FindQuery');
//                // console.log(InviteQuery,'InviteQuery');
//                // console.log(TemporaryQuery,'TemporaryQuery');
//                } else if (CustomerDetails.CustomerType === 'User') {
//                   if (CustomerDetails.BusinessAndBranches.length > 0) {
//                      CustomerDetails.BusinessAndBranches.map(Obj => {
//                         if (Obj.Branches.length > 0) {
//                            Obj.Branches.map(obj => {
//                               BranchArr.push(mongoose.Types.ObjectId(obj));
//                            });
//                         }
//                      });
//                   }
//                   TemporaryQuery = { Branch: { $in: BranchArr }, Business: ReceivingData.Business, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
//                   InvoiceQuery = { Branch: { $in: BranchArr },PaidORUnpaid: "Unpaid", Business: ReceivingData.Business, InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
//                   FindQuery = { _id: { $in: BranchArr }, Business: ReceivingData.Business, ActiveStatus: true, IfDeleted: false };
//                   InviteQuery = { Branch: { $in: BranchArr }, Business: ReceivingData.Business, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
//                }

//             } else if (ReceivingData.CustomerCategory === 'Buyer') {
//                if (CustomerDetails.CustomerType === 'Owner') {
//                // console.log('Yes he/She is a Buyer Owner');
//                   InvoiceQuery = { Buyer: ReceivingData.Customer,PaidORUnpaid: "Unpaid", BuyerBusiness: ReceivingData.Business, InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
//                   InvoicePendingListQuery =  { Buyer: ReceivingData.Customer,  InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
//                   FindQuery = { Customer: ReceivingData.Customer, Business: ReceivingData.Business, ActiveStatus: true, IfDeleted: false };
//                   TemporaryQuery = { Buyer: ReceivingData.Customer, BuyerBusiness: ReceivingData.Business, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
//                   InviteQuery = { Buyer: ReceivingData.Customer, BuyerBusiness: ReceivingData.Business, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
//                } else if (CustomerDetails.CustomerType === 'User') {
//                // console.log('Yes he/She is a Buyer User');
//                   if (CustomerDetails.BusinessAndBranches.length > 0) {
//                      CustomerDetails.BusinessAndBranches.map(Obj => {
//                         if (Obj.Branches.length > 0) {
//                            Obj.Branches.map(obj => {
//                               BranchArr.push(mongoose.Types.ObjectId(obj));
//                            });
//                         }
//                      });
//                   }
//                   InvoiceQuery = { BuyerBranch: { $in: BranchArr },PaidORUnpaid: "Unpaid", BuyerBusiness: ReceivingData.Business, InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
//                   InvoicePendingListQuery =   { BuyerBranch: { $in: BranchArr }, BuyerBusiness: ReceivingData.Business, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
//                   FindQuery = { _id: { $in: BranchArr }, Business: ReceivingData.Business, ActiveStatus: true, IfDeleted: false };
//                   TemporaryQuery = { BuyerBranch: { $in: BranchArr }, BuyerBusiness: ReceivingData.Business, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
//                   InviteQuery = { BuyerBranch: { $in: BranchArr }, BuyerBusiness: ReceivingData.Business, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
//                }
//             }
//             Promise.all([
//                BusinessAndBranchManagement.BranchSchema.find(FindQuery, {}, {})
//                .populate({path: 'Business', select: 'BusinessCreditLimit'}).exec(),
//                InvoiceManagementModel.InvoiceSchema.find(InvoiceQuery, {}, {}).exec(),
//                TemporaryManagement.CreditSchema.find(TemporaryQuery, {}, {}).exec(),
//                InviteManagement.InviteManagementSchema.find(InviteQuery, {}, {}).exec(),
//                InvoiceManagementModel.InvoiceSchema.find(InvoicePendingListQuery, {}, {}).exec(),
//             ]).then(ResponseRes => {
//                // console.log(ResponseRes,'ResponseResResponseRes');
//                var BusinessDetails = JSON.parse(JSON.stringify(ResponseRes[0]));
//                var InvoiceDetails = JSON.parse(JSON.stringify(ResponseRes[1]));
//                var TemporaryDetails = ResponseRes[2];
//                var InviteDetails = JSON.parse(JSON.stringify(ResponseRes[3]));
//                var InvoicePendingList = JSON.parse(JSON.stringify(ResponseRes[4]));

//                // Seller Business Available Credit balance check
//                if (BusinessDetails.length > 0) {
//                   BusinessDetails.map(Obj => {
//                      // console.log(Obj,'BObj');
//                      Obj.OverDueAmount = 0;
//                      Obj.AvailableTemporaryCreditLimit = 0;
//                      Obj.TotalTemporaryCreditLimit = 0;
//                      Obj.DueTodayAmount = 0;
//                      Obj.UpComingAmount = 0;
//                      Obj.BusinessCreditLimit = Obj.Business.BusinessCreditLimit;
//                      Obj.Business = Obj.Business._id;
//                      var TodayDate = new Date();
//                      TodayDate = new Date(TodayDate.setHours(0, 0, 0, 0));
//                      const result1Arr = TemporaryDetails.filter(obj1 => obj1.BuyerBranch === Obj._id || obj1.Branch === Obj._id);
//                      // console.log(result1Arr,'result1Arr');
//                      if (result1Arr.length > 0) {
//                         var ValidityDate = new Date();
//                         result1Arr.map(obj => {
//                            ValidityDate = new Date(obj.updatedAt);
//                            ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + obj.ApprovedPeriod));
//                            ValidityDate = new Date(ValidityDate.setHours(0, 0, 0, 0));
//                            if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
//                               Obj.TotalTemporaryCreditLimit = parseFloat(Obj.TotalTemporaryCreditLimit) + parseFloat(obj.ApproveLimit);
//                               Obj.AvailableTemporaryCreditLimit = parseFloat(Obj.AvailableTemporaryCreditLimit) + parseFloat(obj.ApproveLimit);
//                            }
//                         });
//                      }
                    
//                      const result2Arr = InviteDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
//                      var mBranchCreditLimit = 0;
//                      var mAvailableCreditLimit = 0;
//                      if (result2Arr.length > 0) {
//                         result2Arr.map(obj => {
//                               //Obj.BranchCreditLimit = parseFloat(Obj.BranchCreditLimit) + parseFloat(obj.AvailableLimit);
//                              // Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.AvailableLimit);
//                            if (ReceivingData.CustomerCategory === 'Seller') {
//                               mBranchCreditLimit = parseFloat(mBranchCreditLimit) + parseFloat(obj.BuyerCreditLimit);
//                               mAvailableCreditLimit =  parseFloat(mAvailableCreditLimit) + parseFloat(obj.AvailableLimit);
//                               // console.log(mBranchCreditLimit,'mBranchCreditLimit');
//                               // console.log(mAvailableCreditLimit,'mAvailableCreditLimit');
//                            }
//                            else if (ReceivingData.CustomerCategory === 'Buyer') {
                             
//                               var mInvoiceAmount = 0;
//                               InvoicePendingList.map(ObjIn1 => {
//                                  if(obj.BuyerBusiness === ObjIn1.BuyerBusiness && obj.BuyerBranch === ObjIn1.BuyerBranch && obj.Business === ObjIn1.Business && obj.Branch === ObjIn1.Branch)
//                                  {
//                                     if(ObjIn1.InvoiceStatus === 'Pending')
//                                     {
//                                        mInvoiceAmount = mInvoiceAmount + ObjIn1.UsedCurrentCreditAmount ;  
//                                     }
//                                  }
//                                });
//                                mBranchCreditLimit = parseFloat(mBranchCreditLimit) + parseFloat(obj.BuyerCreditLimit);
//                                mAvailableCreditLimit = parseFloat(mAvailableCreditLimit) + parseFloat(obj.AvailableLimit) + parseFloat(mInvoiceAmount);
//                            }
                             
//                         });

//                               Obj.BranchCreditLimit =  parseFloat(mBranchCreditLimit);
//                               Obj.AvailableCreditLimit =  parseFloat(mAvailableCreditLimit);
//                      }

//                       var result4Arr = []; 
//                       var resultInviteArr = []; 
//                      if (ReceivingData.CustomerCategory === 'Seller') 
//                      {
//                          result4Arr = InvoiceDetails.filter(obj1 => (obj1.Branch === Obj._id) && (obj1.Business === Obj.Business));
//                          resultInviteArr = InviteDetails.filter(obj1 => obj1.Branch === Obj._id);
//                      }
//                      else if (ReceivingData.CustomerCategory === 'Buyer') 
//                      {
//                           result4Arr = InvoiceDetails.filter(obj1 => (obj1.BuyerBranch === Obj._id) && (obj1.BuyerBusiness === Obj.Business));
                       
//                           resultInviteArr = InviteDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
//                      }

//                      if (result4Arr.length > 0) {
//                         var InvoiceAmount = 0;
//                         var OverDueAmount = 0;
//                         var DueTodayAmount = 0;
//                         var UpComingAmount = 0;

//                         //const result2Arr = InviteDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
//                         if (resultInviteArr.length > 0) {
                           
//                            result4Arr.map(obj => {
//                               InvoiceAmount = parseFloat(obj.RemainingAmount) ;//+ parseFloat(obj.AvailableAmount);
   
//                               var mInvoiceDate = moment(obj.InvoiceDueDate)
   
//                               if(mInvoiceDate.valueOf() < TodayDate.valueOf())
//                               {
//                                 OverDueAmount = parseFloat(OverDueAmount) + parseFloat(obj.InvoiceAmount);
//                               }
//                               else if(mInvoiceDate.valueOf() > TodayDate.valueOf())
//                               {
//                                  UpComingAmount = parseFloat(UpComingAmount) + parseFloat(obj.InvoiceAmount);
//                               }
//                               else if(mInvoiceDate.valueOf() === TodayDate.valueOf())
//                               {
//                                  DueTodayAmount = parseFloat(DueTodayAmount) + parseFloat(obj.InvoiceAmount);
//                               }
//                            });

//                         }

                        

//                         Obj.OverDueAmount = OverDueAmount.toFixed(2);
//                         Obj.OverDueAmount = parseFloat(Obj.OverDueAmount);
//                         Obj.UpComingAmount = UpComingAmount.toFixed(2);
//                         Obj.UpComingAmount = parseFloat(Obj.UpComingAmount);
//                         Obj.DueTodayAmount = DueTodayAmount.toFixed(2);
//                         Obj.DueTodayAmount = parseFloat(Obj.DueTodayAmount);

//                          //  OverDueDate = new Date(obj.InvoiceDate);
//                         //   DueTodayDate = new Date(obj.InvoiceDate);

//                            // const InviteDetailsArr = InviteDetails.filter(obj1 => (obj1.Business === obj.Business && obj1.Seller === obj.Seller && obj1.Branch === obj.Branch) ||
//                            //    (obj1.BuyerBusiness === obj.BuyerBusiness && obj1.Buyer === obj.Buyer && obj1.BuyerBranch === obj.BuyerBranch));
//                            // if (InviteDetailsArr.length > 0) {
//                            //    InviteDetailsArr.map(objInvite => {
//                            //       OverDueDate = new Date(OverDueDate.setDate(OverDueDate.getDate() + objInvite.BuyerPaymentCycle + 1));
//                            //       DueTodayDate = new Date(DueTodayDate.setDate(DueTodayDate.getDate() + objInvite.BuyerPaymentCycle));
//                            //    });
//                            //    OverDueDate = new Date(OverDueDate.setHours(0, 0, 0, 0));
//                            //    if (OverDueDate.valueOf() < TodayDate.valueOf()) {
//                            //       OverDueAmount = parseFloat(OverDueAmount) + parseFloat(obj.AvailableAmount);
//                            //    }
//                            //    if (DueTodayDate.toLocaleDateString() === TodayDate.toLocaleDateString()) {
//                            //       DueTodayAmount = parseFloat(DueTodayAmount) + parseFloat(obj.AvailableAmount);
//                            //    }
//                            // }

                           

//                         // Obj.OverDueAmount = Obj.OverDueAmount.toFixed(2);
//                         // Obj.OverDueAmount = parseFloat(Obj.OverDueAmount);
//                         // Obj.UpComingAmount = InvoiceAmount.toFixed(2);
//                         // Obj.UpComingAmount = parseFloat(Obj.UpComingAmount);
//                         // Obj.DueTodayAmount = DueTodayAmount.toFixed(2);
//                         // Obj.DueTodayAmount = parseFloat(Obj.DueTodayAmount);

//                         // if (Obj.OverDueAmount > 0 || Obj.DueTodayAmount > 0) {
//                         //    Obj.UpComingAmount = Obj.UpComingAmount - (Obj.DueTodayAmount + Obj.OverDueAmount);
//                         //    if (Obj.UpComingAmount > 0) {
//                         //       Obj.UpComingAmount = Obj.UpComingAmount.toFixed(2);
//                         //       Obj.UpComingAmount = parseFloat(Obj.UpComingAmount);
//                         //    } else {
//                         //       Obj.UpComingAmount = 0;
//                         //    }
//                         // }


//                         if (InvoiceAmount > 0 && ReceivingData.CustomerCategory === 'Buyer') {
//                            Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) ;//- parseFloat(InvoiceAmount);
//                            if (Obj.AvailableCreditLimit > 0) {
//                               Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
//                            } else {
//                               if (Obj.AvailableCreditLimit < 0) {
//                                  Obj.AvailableTemporaryCreditLimit = parseFloat(Obj.AvailableTemporaryCreditLimit) + parseFloat(Obj.AvailableCreditLimit);
//                                  if (Obj.AvailableTemporaryCreditLimit > 0) {
//                                     Obj.AvailableTemporaryCreditLimit = parseFloat(Obj.AvailableTemporaryCreditLimit);
//                                  } else {
//                                     Obj.AvailableTemporaryCreditLimit = 0;
//                                  }
//                               }
//                               Obj.AvailableCreditLimit = 0;
//                            }
//                         }
//                      }
//                      return Obj;
//                   });
//                }
//                res.status(200).send({ Status: true, Message: "Business Of Branches List!!!.", Response: BusinessDetails });

//             }).catch(ErrorRes => {
//                ErrorHandling.ErrorLogCreation(req, 'Business And Invoice, Invite, Temporary List Getting Error', 'BusinessAndBranchManagement.Controller -> BusinessOfBranchesList', JSON.stringify(ErrorRes));
//                res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business And Invoice, Invite, Temporary!.", Error: ErrorRes });
//             });

//          } else {
//             res.status(400).send({ Status: false, Message: "Invalid Customer Details!." });
//          }
//       }).catch(Error => {
//          ErrorHandling.ErrorLogCreation(req, 'Business And Invoice, Invite, Temporary List Getting Error', 'BusinessAndBranchManagement.Controller -> BusinessOfBranchesList', JSON.stringify(Error));
//          res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business And Invoice, Invite, Temporary!.", Error: Error });
//       });
//    }
// };

// Seller Business Delete
exports.SellerWholeBusinessDelete = function (req, res) {
  var ReceivingData = req.body;
   if (!ReceivingData.Customer || ReceivingData.Customer === '') {
      res.status(400).send({ Status: false, Message: "Customer can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
   } else if (!ReceivingData.BusinessId || ReceivingData.BusinessId === '') {
      res.status(400).send({ Status: false, Message: "Business Details can not be empty" });
   } else {
      ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
      ReceivingData.BusinessId = mongoose.Types.ObjectId(ReceivingData.BusinessId);
     
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer, $or: [{ CustomerCategory: ReceivingData.CustomerCategory }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
          InvoiceManagement.InvoiceSchema.find({ Business: ReceivingData.BusinessId, Seller: ReceivingData.Customer,PaidORUnpaid: 'UnPaid',ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         InviteManagement.InviteManagementSchema.find({ Business: ReceivingData.BusinessId, Seller: ReceivingData.Customer,ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         PaymentManagement.PaymentSchema.find({ Business: ReceivingData.BusinessId, Seller: ReceivingData.Customer,ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         CustomersManagement.CustomerSchema.find({ Owner: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.find({ Customer: ReceivingData.Customer, _id: ReceivingData.BusinessId,ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        BusinessAndBranchManagement.BusinessSchema.find({ _id: ReceivingData.BusinessId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      
      ]).then(Response => {
         var CustomerDetails = JSON.parse(JSON.stringify(Response[0]));
         var InvoiceDetails = JSON.parse(JSON.stringify(Response[1]));
         var InviteDetails = JSON.parse(JSON.stringify(Response[2]));
         var PaymentDetails = JSON.parse(JSON.stringify(Response[3]));
         var UserDetails = JSON.parse(JSON.stringify(Response[4]));
         var BusinessDetails = JSON.parse(JSON.stringify(Response[5]));
         var MainBusinessDetails = JSON.parse(JSON.stringify(Response[6]));
         var UserBusiness = [];
         if (UserDetails.length > 0) {
            UserDetails.map(Obj => {
               Obj.BusinessAndBranches.map(obj => {
                  UserBusiness.push(obj.Business);
               });
            });
         }
           
         var MainArr = [];
         var BusinessCreditAmount = 0;
         if (CustomerDetails !== null) {
   
            BusinessDetails = BusinessDetails.filter(obj => {
               BusinessCreditLimit = parseFloat(obj.BusinessCreditLimit);
               const BusinessDetailsArr = InvoiceDetails.filter(obj1 => obj1.Business === obj._id && obj1.ActiveStatus === true);
               return BusinessDetailsArr.length > 0 ? true : false;
            });
            
     

            MainArr = BusinessDetails;
            BusinessDetails = BusinessDetails.filter(obj => {
               const BusinessDetailsArr = InviteDetails.filter(obj1 => obj1.Business === obj._id && obj1.ActiveStatus === true);
               return BusinessDetailsArr.length > 0 ? true : false;
            });

      
            MainArr = MainArr.concat(BusinessDetails);
            BusinessDetails = BusinessDetails.filter(obj => {
               const BusinessDetailsArr = PaymentDetails.filter(obj1 => obj1.Business === obj._id && obj1.ActiveStatus === true);
               return BusinessDetailsArr.length > 0 ? true : false;
            });


            MainArr = MainArr.concat(BusinessDetails);
            BusinessDetails = BusinessDetails.filter(obj => {
               const BusinessDetailsArr = UserBusiness.filter(obj1 => JSON.parse(JSON.stringify(obj1)) === JSON.parse(JSON.stringify(obj._id)));
               return BusinessDetailsArr.length > 0 ? true : false;
            });
              
            MainArr = MainArr.concat(BusinessDetails);
            if (MainArr.length >= 0) {   
               BusinessAndBranchManagement.BusinessSchema.updateOne(
                  { "_id": ReceivingData.BusinessId },
                  {
                     $set: {
                        "ActiveStatus": false,
                        "IfDeleted": true,
                     }
                  }
               ).exec();
               if (BusinessDetails.length > 0) {
                  BusinessAndBranchManagement.BusinessSchema.updateOne(
                     { "_id": ReceivingData.BusinessId, IfSeller: true },
                     {
                        $set: {
                           "ActiveStatus": false,
                           "IfDeleted": true,
                        }
                     }
                  ).exec();
               }
               // if (PrimaryBranchDetails !== null) {
               //    const PrimaryBranchDetailsArr = PrimaryBranchAdd.filter(obj1 => obj1._id !== PrimaryBranchDetails.PrimaryBranch);
               //    if (PrimaryBranchDetailsArr.length > 0) {
               //       BusinessAndBranchManagement.BusinessSchema.updateOne(
               //          { "_id": ReceivingData.BusinessId, IfSeller: true },
               //          {
               //             $set: {
               //                PrimaryBranch: PrimaryBranchDetailsArr[0]._id
               //             }
               //          }
               //       ).exec();
               //    }
               // }

               // if (MainBusinessDetails !== null) {

                  // MainBusinessDetails.map(Obj => { 
                  
                    
                    // var MainBusinessAvailableCreditLimit = parseFloat(MainBusinessDetails.AvailableCreditLimit) + parseFloat(BranchCreditAmount);
                  // var MainBusinessAvailableCreditLimit = Number(Obj.AvailableCreditLimit) + Number(BusinessCreditAmount);
                  
                 // Number(ReceivingData.BusinessCreditLimit) - Number(ReceivingData.BranchCreditLimit);
                  // BusinessAndBranchManagement.BusinessSchema.updateOne(
                  //    { "_id": ReceivingData.BusinessId, IfSeller: true },
                  //    {
                  //       $set: {
                  //          AvailableCreditLimit: MainBusinessAvailableCreditLimit
                  //       }
                  //    }
                  // ).exec();

                  //  });

                 
               // }
               res.status(200).send({ Status: true, Message: "Business SuccessFully Deleted!." });
            } else {
               res.status(200).send({ Status: false, Message: "This business cannot be deleted as it is connected to other business or has made transactions like invoice and payment or has users assigned to it." });
            }
         } else {
            res.status(400).send({ Status: false, Message: "Invalid Customer Details!." });
         }
      }).catch(Error => {
         
         ErrorHandling.ErrorLogCreation(req, 'Seller Business Details Find Getting Error', 'SellerBusinessDelete.Controller -> SellerBusinessDelete', JSON.stringify(Error));
         res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business and Branches!.", Error: Error });
      });
   }
};

// Buyer Business Delete
exports.BuyerWholeBusinessDelete = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Customer || ReceivingData.Customer === '') {
      res.status(400).send({ Status: false, Message: "Customer can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
   } else if (!ReceivingData.BusinessId || ReceivingData.BusinessId === '') {
      res.status(400).send({ Status: false, Message: "Business Details can not be empty" });
   } else {
      ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
      ReceivingData.BusinessId = mongoose.Types.ObjectId(ReceivingData.BusinessId);
      Promise.all([
   
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer, $or: [{ CustomerCategory: ReceivingData.CustomerCategory }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      InvoiceManagement.InvoiceSchema.find({ BuyerBusiness: ReceivingData.BusinessId, Buyer: ReceivingData.Customer, PaidORUnpaid: 'UnPaid', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      InviteManagement.InviteManagementSchema.find({ BuyerBusiness: ReceivingData.BusinessId, Buyer: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      PaymentManagement.PaymentSchema.find({ BuyerBusiness: ReceivingData.BusinessId, Buyer: ReceivingData.Customer,Payment_Status:'Pending',ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      CustomersManagement.CustomerSchema.find({ Owner: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      BusinessAndBranchManagement.BusinessSchema.find({ Customer: ReceivingData.Customer, _id: ReceivingData.BusinessId,ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
     
   ]).then(Response => {
         var CustomerDetails = JSON.parse(JSON.stringify(Response[0]));
         var InvoiceDetails = JSON.parse(JSON.stringify(Response[1]));
         var InviteDetails = JSON.parse(JSON.stringify(Response[2]));
         var PaymentDetails = JSON.parse(JSON.stringify(Response[3]));
         var UserDetails = JSON.parse(JSON.stringify(Response[4]));
         var BusinessDetails = JSON.parse(JSON.stringify(Response[5]));
         var UserBusiness = [];
         if (UserDetails.length > 0) {
            UserDetails.map(Obj => {
               Obj.BusinessAndBranches.map(obj => {
                  UserBusiness.push(obj.Business)
               });
            });
         }
         
         var MainArr = [];
         if (CustomerDetails !== null) {
            BusinessDetails = BusinessDetails.filter(obj => {
               
               const BusinessDetailsArr = InvoiceDetails.filter(obj1 => obj1.BuyerBusiness === obj._id && obj1.ActiveStatus === true);
               return BusinessDetailsArr.length > 0 ? true : false;

            });
            MainArr = BusinessDetails;
            BusinessDetails = BusinessDetails.filter(obj => {
               const BusinessDetailsArr = InviteDetails.filter(obj1 => obj1.BuyerBusiness === obj._id && obj1.ActiveStatus === true);
               return BusinessDetailsArr.length > 0 ? true : false;
            });
            MainArr = MainArr.concat(BusinessDetails);
            BusinessDetails = BusinessDetails.filter(obj => {
               
               const BusinessDetailsArr = PaymentDetails.filter(obj1 => obj1.BuyerBusiness === obj._id && obj1.ActiveStatus === true);
               return BusinessDetailsArr.length > 0 ? true : false;
            });
            
            MainArr = MainArr.concat(BusinessDetails);
            BusinessDetails = BusinessDetails.filter(obj => {
               const BusinessDetailsArr = UserBusiness.filter(obj1 => JSON.parse(JSON.stringify(obj1)) === JSON.parse(JSON.stringify(obj._id)));
               return BusinessDetailsArr.length > 0 ? true : false;
            });
            MainArr = MainArr.concat(BusinessDetails);
    
            if (MainArr.length === 0) {
                  BusinessAndBranchManagement.BusinessSchema.updateOne(
                     { "_id": ReceivingData.BusinessId, IfBuyer: true},
                     {
                        $set: {
                           "ActiveStatus": false,
                           "IfDeleted": true,
                        }
                     }
                  ).exec();
               
               res.status(200).send({ Status: true, Message: "Business SuccessFully Deleted!." });
            } else {
               res.status(200).send({ Status: false, Message: "This Business cannot be deleted as it is connected to other business or has made transactions like invoice and payment or has users assigned to it." });
            }
         } else {
            res.status(400).send({ Status: false, Message: "Invalid Customer Details!." });
         }
      }).catch(Error => {
         ErrorHandling.ErrorLogCreation(req, 'Seller Business Details Find Getting Error', 'SellerBusinessDelete.Controller -> SellerBusinessDelete', JSON.stringify(Error));
         res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business and Branches!.", Error: Error });
      });
   }
};

//SellerBusinessDeletebtn
exports.SellerBusinessDeletebtn = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Customer || ReceivingData.Customer === '') {
      res.status(400).send({ Status: false, Message: "Customer can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
   } else if (!ReceivingData.BusinessId || ReceivingData.BusinessId === '') {
      res.status(400).send({ Status: false, Message: "Business Details can not be empty" });
   } else {
      ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
      ReceivingData.BusinessId = mongoose.Types.ObjectId(ReceivingData.BusinessId);


        if (ReceivingData.CustomerCategory === 'Seller') {
         Promise.all([
            InvoiceManagement.InvoiceSchema.find({Business:ReceivingData.BusinessId,ActiveStatus:true,IfDeleted:false},{},{}).exec(),
            PaymentManagement.PaymentSchema.find({Business:ReceivingData.BusinessId, ActiveStatus:true,IfDeleted:false},{},{}).exec(),
         ]).then(Response =>{
            var InvoiceDetails = JSON.parse(JSON.stringify(Response[0]));
            var PaymentDetails = JSON.parse(JSON.stringify(Response[1]));

            var TotalInvoiceAmount = 0
            if (InvoiceDetails != null && InvoiceDetails.length > 0) {
            InvoiceDetails.forEach(element => {
             var RemainingAmount = element.RemainingAmount;
             TotalInvoiceAmount += RemainingAmount;
            });
            const is_button = InvoiceDetails.every(Obj => Obj.PaidORUnpaid === 'Paid');
            const is_Paybutton = PaymentDetails.every(Obj => Obj.Payment_Status === 'Accept');
            if (is_button && is_Paybutton) {
               res.status(200).send({ Status: is_button, Message: "All the Invoices are Paid!" });
            } else {
               res.status(200).send({ Status: false, Message: `Sorry there are Invoices Unpaid!`, TotalInvoiceAmount });
            }
         } else {
            res.status(200).send({ Status: true, Message: "No Invoices Found!",TotalInvoiceAmount });
         }
         })
        } else if (ReceivingData.CustomerCategory === 'Buyer'){
         Promise.all([
            InvoiceManagement.InvoiceSchema.find({BuyerBusiness:ReceivingData.BusinessId,ActiveStatus:true,IfDeleted:false},{},{}).exec(),
            PaymentManagement.PaymentSchema.find({BuyerBusiness:ReceivingData.BusinessId, ActiveStatus:true,IfDeleted:false},{},{}).exec(),
         ]).then(Response =>{
            var InvoiceDetails = JSON.parse(JSON.stringify(Response[0]));
            var PaymentDetails = JSON.parse(JSON.stringify(Response[1]));
               
               var TotalInvoiceAmount = 0
               if (InvoiceDetails != null && InvoiceDetails.length > 0) {
               InvoiceDetails.forEach(element => {
                var RemainingAmount = element.RemainingAmount;
                TotalInvoiceAmount += RemainingAmount;
               });
               const is_button = InvoiceDetails.every(Obj => Obj.PaidORUnpaid === 'Paid');
               const is_Paybutton = PaymentDetails.every(Obj => Obj.Payment_Status === 'Accept');
               if (is_button && is_Paybutton) {
                  res.status(200).send({ Status: is_button, Message: "All the Invoices are Paid!" });
               } else {
                  res.status(200).send({ Status: false, Message: `Sorry there are Invoices Unpaid!`, TotalInvoiceAmount });
               }
            } else {
               res.status(200).send({ Status: true, Message: "No Invoices Found!",TotalInvoiceAmount });
            }
         })
        }
   }
};


exports.SellerBusinessDelete = function(req,res){
   var ReceivingData = req.body;
   if (!ReceivingData.Customer || ReceivingData.Customer === '') {
      res.status(400).send({ Status: false, Message: "Customer can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
   } else if (!ReceivingData.BusinessId || ReceivingData.BusinessId === '') {
      res.status(400).send({ Status: false, Message: "Business Details can not be empty" });
   } else {
      ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
      ReceivingData.BusinessId = mongoose.Types.ObjectId(ReceivingData.BusinessId);
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer, $or: [{ CustomerCategory: ReceivingData.CustomerCategory }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BranchSchema.find({ Customer: ReceivingData.Customer, Business: ReceivingData.BusinessId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         InvoiceManagement.InvoiceSchema.find({ Business: ReceivingData.BusinessId, Seller: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         InviteManagement.InviteManagementSchema.find({ Business: ReceivingData.BusinessId, Seller: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         PaymentManagement.PaymentSchema.find({ Business: ReceivingData.BusinessId, Seller: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         CustomersManagement.CustomerSchema.find({ Owner: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BranchSchema.find({ Customer: ReceivingData.Customer, Business: ReceivingData.BusinessId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.findOne({ Customer: ReceivingData.Customer, _id: ReceivingData.BusinessId,  ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BranchSchema.find({ Customer: ReceivingData.Customer, Business: ReceivingData.BusinessId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.find({ _id: ReceivingData.BusinessId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var CustomerDetails = JSON.parse(JSON.stringify(Response[0]));
         var BranchDetails = JSON.parse(JSON.stringify(Response[1]));
         var InvoiceDetails = JSON.parse(JSON.stringify(Response[2]));
         var InviteDetails = JSON.parse(JSON.stringify(Response[3]));
         var PaymentDetails = JSON.parse(JSON.stringify(Response[4]));
         var UserDetails = JSON.parse(JSON.stringify(Response[5]));
         var BusinessDetails = JSON.parse(JSON.stringify(Response[6]));
         var PrimaryBranchDetails = JSON.parse(JSON.stringify(Response[7]));
         var PrimaryBranchAdd = JSON.parse(JSON.stringify(Response[8]));
         var MainBusinessDetails = JSON.parse(JSON.stringify(Response[9]));
         var UserBranch = [];
         if (UserDetails.length > 0) {
            UserDetails.map(Obj => {
               Obj.BusinessAndBranches.map(obj => {
                  obj.Branches.map(obj1 => {
                     UserBranch.push(obj1);
                  });
               });
            });
         }
         var MainArr = [];
         var BranchCreditAmount = 0;
         if (CustomerDetails !== null) {
            BranchDetails = BranchDetails.filter(obj => {
               BranchCreditAmount = parseFloat(obj.BranchCreditLimit);
               const BranchDetailsArr = InvoiceDetails.filter(obj1 => obj1.Branch === obj._id && obj1.ActiveStatus === true);
               return BranchDetailsArr.length > 0 ? true : false;
            });
            MainArr = BranchDetails;
            BranchDetails = BranchDetails.filter(obj => {
               const BranchDetailsArr = InviteDetails.filter(obj1 => obj1.Branch === obj._id && obj1.ActiveStatus === true);
               return BranchDetailsArr.length > 0 ? true : false;
            });
            MainArr = MainArr.concat(BranchDetails);
            BranchDetails = BranchDetails.filter(obj => {
               const BranchDetailsArr = PaymentDetails.filter(obj1 => obj1.Branch === obj._id && obj1.ActiveStatus === true);
               return BranchDetailsArr.length > 0 ? true : false;
            });
            MainArr = MainArr.concat(BranchDetails);
            BranchDetails = BranchDetails.filter(obj => {
               const BranchDetailsArr = UserBranch.filter(obj1 => JSON.parse(JSON.stringify(obj1)) === JSON.parse(JSON.stringify(obj._id)));
               return BranchDetailsArr.length > 0 ? true : false;
            });
            MainArr = MainArr.concat(BranchDetails);
            if (MainArr.length === 0) {
               BusinessAndBranchManagement.BusinessSchema.updateOne(
                  { "_id": ReceivingData.BusinessId },
                  {
                     $set: {
                        "ActiveStatus": false,
                        "IfDeleted": true,
                     }
                  }
               ).exec();
               if (BusinessDetails.length === 1) {
                  BusinessAndBranchManagement.BusinessSchema.updateOne(
                     { "_id": ReceivingData.BusinessId, IfSeller: true },
                     {
                        $set: {
                           "ActiveStatus": false,
                           "IfDeleted": true,
                        }
                     }
                  ).exec();
               }
               if (PrimaryBranchDetails !== null) {
                  const PrimaryBranchDetailsArr = PrimaryBranchAdd.filter(obj1 => obj1._id !== PrimaryBranchDetails.PrimaryBranch);
                  if (PrimaryBranchDetailsArr.length > 0) {
                     BusinessAndBranchManagement.BusinessSchema.updateOne(
                        { "_id": ReceivingData.BusinessId, IfSeller: true },
                        {
                           $set: {
                              PrimaryBranch: PrimaryBranchDetailsArr[0]._id
                           }
                        }
                     ).exec();
                  }
               }

               if (MainBusinessDetails !== null) {

                  MainBusinessDetails.map(Obj => { 
                     
                  
                  var MainBusinessAvailableCreditLimit = Number(Obj.AvailableCreditLimit) + Number(BranchCreditAmount);
                  
                  BusinessAndBranchManagement.BusinessSchema.updateOne(
                     { "_id": ReceivingData.BusinessId, IfSeller: true },
                     {
                        $set: {
                           AvailableCreditLimit: MainBusinessAvailableCreditLimit
                        }
                     }
                  ).exec();

                   });

                 
               }
               res.status(200).send({ Status: true, Message: "Business SuccessFully Deleted!." });
            } else {
               res.status(200).send({ Status: false, Message: "This Business cannot be deleted as it is connected to other branches or has made transactions like invoice and payment or has users assigned to it." });
            }
         } else {
            res.status(400).send({ Status: false, Message: "Invalid Customer Details!." });
         }
      }).catch(Error => {
         ErrorHandling.ErrorLogCreation(req, 'Seller Business Details Find Getting Error', 'SellerBusinessDelete.Controller -> SellerBusinessDelete', JSON.stringify(Error));
         res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business and Branches!.", Error: Error });
      });
   }
} 

//Buyer Business Delete
exports.BuyerBusinessDelete = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Customer || ReceivingData.Customer === '') {
      res.status(400).send({ Status: false, Message: "Customer can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
   } else if (!ReceivingData.BusinessId || ReceivingData.BusinessId === '') {
      res.status(400).send({ Status: false, Message: "Business Details can not be empty" });
   } else {
      ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
      ReceivingData.BusinessId = mongoose.Types.ObjectId(ReceivingData.BusinessId);
      Promise.all([
         CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer, $or: [{ CustomerCategory: ReceivingData.CustomerCategory }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BranchSchema.find({ Customer: ReceivingData.Customer, Business: ReceivingData.BusinessId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         InvoiceManagement.InvoiceSchema.find({ BuyerBusiness: ReceivingData.BusinessId, Buyer: ReceivingData.Customer, BuyerBranch: ReceivingData.BranchId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         InviteManagement.InviteManagementSchema.find({ BuyerBusiness: ReceivingData.BusinessId, Buyer: ReceivingData.Customer, BuyerBranch: ReceivingData.BranchId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         PaymentManagement.PaymentSchema.find({ BuyerBusiness: ReceivingData.BusinessId, Buyer: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         CustomersManagement.CustomerSchema.find({ Owner: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BranchSchema.find({ Customer: ReceivingData.Customer, Business: ReceivingData.BusinessId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BusinessSchema.findOne({ Customer: ReceivingData.Customer, _id: ReceivingData.BusinessId,ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
         BusinessAndBranchManagement.BranchSchema.find({ Customer: ReceivingData.Customer, Business: ReceivingData.BusinessId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var CustomerDetails = JSON.parse(JSON.stringify(Response[0]));
         var BranchDetails = JSON.parse(JSON.stringify(Response[1]));
         var InvoiceDetails = JSON.parse(JSON.stringify(Response[2]));
         var InviteDetails = JSON.parse(JSON.stringify(Response[3]));
         var PaymentDetails = JSON.parse(JSON.stringify(Response[4]));
         var UserDetails = JSON.parse(JSON.stringify(Response[5]));
         var BusinessDetails = JSON.parse(JSON.stringify(Response[6]));
         var PrimaryBranchDetails = JSON.parse(JSON.stringify(Response[7]));
         var PrimaryBranchAdd = JSON.parse(JSON.stringify(Response[8]));
         var UserBranch = [];
         if (UserDetails.length > 0) {
            UserDetails.map(Obj => {
               Obj.BusinessAndBranches.map(obj => {
                  obj.Branches.map(obj1 => {
                     UserBranch.push(obj1);
                  });
               });
            });
         }
         var MainArr = [];
         if (CustomerDetails !== null) {
            BranchDetails = BranchDetails.filter(obj => {
               const BranchDetailsArr = InvoiceDetails.filter(obj1 => obj1.BuyerBranch === obj._id && obj1.ActiveStatus === true);
               return BranchDetailsArr.length > 0 ? true : false;

            });
            MainArr = BranchDetails;
            BranchDetails = BranchDetails.filter(obj => {
               const BranchDetailsArr = InviteDetails.filter(obj1 => obj1.BuyerBranch === obj._id && obj1.ActiveStatus === true);
               return BranchDetailsArr.length > 0 ? true : false;
            });
            MainArr = MainArr.concat(BranchDetails);
            BranchDetails = BranchDetails.filter(obj => {
               
               const BranchDetailsArr = PaymentDetails.filter(obj1 => obj1.BuyerBranch === obj._id && obj1.ActiveStatus === true);
               return BranchDetailsArr.length > 0 ? true : false;
            });
            MainArr = MainArr.concat(BranchDetails);
            BranchDetails = BranchDetails.filter(obj => {
               const BranchDetailsArr = UserBranch.filter(obj1 => JSON.parse(JSON.stringify(obj1)) === JSON.parse(JSON.stringify(obj._id)));
               return BranchDetailsArr.length > 0 ? true : false;
            });
            MainArr = MainArr.concat(BranchDetails);
            if (MainArr.length === 0) {
               BusinessAndBranchManagement.BusinessSchema.updateOne(
                  { "_id": ReceivingData.BusinessId },
                  {
                     $set: {
                        "ActiveStatus": false,
                        "IfDeleted": true,
                     }
                  }
               ).exec();
               if (BusinessDetails.length === 1) {
                  BusinessAndBranchManagement.BusinessSchema.updateOne(
                     { "_id": ReceivingData.BusinessId, IfSeller: true },
                     {
                        $set: {
                           "ActiveStatus": false,
                           "IfDeleted": true,
                        }
                     }
                  ).exec();
               }
               if (PrimaryBranchDetails !== null) {
                  const PrimaryBranchDetailsArr = PrimaryBranchAdd.filter(obj1 => obj1._id !== PrimaryBranchDetails.PrimaryBranch);
                  if (PrimaryBranchDetailsArr.length > 0) {
                     BusinessAndBranchManagement.BusinessSchema.updateOne(
                        { "_id": ReceivingData.BusinessId, IfSeller: true },
                        {
                           $set: {
                              PrimaryBranch: PrimaryBranchDetailsArr[0]._id
                           }
                        }
                     ).exec();
                  }
               }
               res.status(200).send({ Status: true, Message: "Business SuccessFully Deleted!." });
            } else {
               res.status(200).send({ Status: false, Message: "This Business cannot be deleted as it is connected to other branches or has made transactions like invoice and payment or has users assigned to it." });
            }
         } else {
            res.status(400).send({ Status: false, Message: "Invalid Customer Details!." });
         }
      }).catch(Error => {
         ErrorHandling.ErrorLogCreation(req, 'Seller Business Details Find Getting Error', 'SellerBusinessDelete.Controller -> SellerBusinessDelete', JSON.stringify(err));
         res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business and Branches!.", Error: err });
      });
   }
};
 
//BusinessUsersList
exports.BusinessAgainstUsersLists = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Business || ReceivingData.Business === '') {
      res.status(400).send({ Status: false, Message: "Business Details can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer Category Details can not be empty" });
   } else {
      ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
      Promise.all([
         CustomersManagement.CustomerSchema.aggregate(
            [
               {
                 $unwind: "$BusinessAndBranches"
               },
               {
                 $unwind: "$BusinessAndBranches.Branches"
             
               },
               {
                 $project: {
                   _id: 1,
                      businessId:"$BusinessAndBranches.Business",
                      ContactName:1,
                      CustomerCategory:1
                 }
               },
               {
             $match:{
                businessId:ReceivingData.Business,
                CustomerCategory:ReceivingData.CustomerCategory
             }	
             }
             ]
         )
      ]).then(Response => {
         var Result = Response;
            res.status(200).send({ Status: true, Message: "Business Of Branches List!!!.", Response: Result[0]});
      }).catch(Error => {
         ErrorHandling.ErrorLogCreation(req, 'Business And Invoice, Invite, Temporary List Getting Error', 'BusinessAndBranchManagement.Controller -> BusinessOfBranchesList', JSON.stringify(Error));
         res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business And Invoice, Invite, Temporary!.", Error: Error });
      });
   }
}



 //BusinessOfBranchUsersList
exports.BusinessOfUsersList = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Business || ReceivingData.Business === '') {
      res.status(400).send({ Status: false, Message: "Business Details can not be empty" });
   } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer Category Details can not be empty" });
   } else {
      ReceivingData.CustomerCategory = ReceivingData.CustomerCategory;
      ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
      Promise.all([
         CustomersManagement.CustomerSchema.aggregate(
            [
               {
                 $unwind: "$BusinessAndBranches"
               },
               {
                 $unwind: "$BusinessAndBranches.Business"
             
               },
               {
                 $project: {
                     _id: 1,
                      businessId:"$BusinessAndBranches.Business",
                      ContactName:1,
                      CustomerCategory:1
                 }
               },
               {
             $match:{
                businessId:ReceivingData.Business,
                CustomerCategory:ReceivingData.CustomerCategory
             }	
             }
             ]
         )
      ]).then(Response => {
         var Result = JSON.parse(JSON.stringify(Response));
         // Assuming your array of objects is stored in a variable called data
        var final =  Result[0].sort((a, b) => {
               // Convert the names to lowercase for case-insensitive comparison
               let nameA = a.ContactName.toLowerCase();
               let nameB = b.ContactName.toLowerCase();
               // Return -1, 0, or 1 depending on the lexicographic order of the names
               if (nameA < nameB) {
               return -1;
               }
               if (nameA > nameB) {
               return 1;
               }
               return 0;
            });
 
            res.status(200).send({ Status: true, Message: "Business Of Users List!!!.", Response: final});
      }).catch(Error => {
         ErrorHandling.ErrorLogCreation(req, 'Business And Invoice, Invite, Temporary List Getting Error', 'BusinessAndBranchManagement.Controller -> BusinessOfBranchesList', JSON.stringify(Error));
         res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business And Invoice, Invite, Temporary!.", Error: Error });
      });
   }
}

exports.IndustrySimpleList = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Owner || ReceivingData.Owner === '') {
       res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
       ReceivingData.Owner = mongoose.Types.ObjectId(ReceivingData.Owner);
       IndustryManagement.IndustrySchema.find({ Status: 'Activated' }, {}, {}, function (err, result) {
           if (err) {
               ErrorHandling.ErrorLogCreation(req, 'Industry Find error', 'BusinessManagement -> IndustrySimpleList', JSON.stringify(err));
               res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find the User Management!.", Error: err });
           } else {
               res.status(200).send({ Status: true, Response: result, Message: "Industries" });
           }
       });
   }
};
