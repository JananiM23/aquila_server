var SupportManagement = require('../../Models/SupportManagement.model');
var CustomerManagement = require('../../Models/CustomerManagement.model');
var NotificationModel = require('../../Models/notification_management.model');
var ErrorHandling = require('../../Handling/ErrorHandling').ErrorHandling;
var mongoose = require('mongoose');
var moment = require('moment');



// CustomerSupport_List ------------------------------------------ 
exports.CustomerSupport_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(200).send({ Status: false, Message: "Customer Details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      SupportManagement.SupportManagementSchema.find({ CustomerId: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, { Support_Title: 1, Support_Status: 1, Support_key: 1, createdAt: 1 }, {})
         .exec((err, result) => {
            if (err) {
               ErrorHandling.ErrorLogCreation(req, 'SupportManagement List Error', 'SupportManagement.Controller -> SupportManagementList', JSON.stringify(err));
               res.status(417).send({ Status: false, Message: "Some error occurred while Creating the Support Management!.", Error: err });
            } else {
               if (result.length !== 0) {
                  result = JSON.parse(JSON.stringify(result));
                  result.map(Obj => {
                     Obj.createdAt =  moment(new Date(Obj.createdAt)).format("DD MMM YYYY hh:mm a");
                     return Obj;
                  }); 
                  res.status(200).send({ Status: true, Message: 'CustomerSupport List', Response: result });
               }else {
                  res.status(200).send({ Status: true, Message: 'CustomerSupport List', Response: result });
               }
            }
         });
   }
};

// CustomerSupport Create ------------------------------------------ 
exports.CustomerSupport_Create = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(200).send({ Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.SupportTitle || ReceivingData.SupportTitle === '') {
      res.status(200).send({ Status: false, Message: "Support Title Details can not be empty" });
   } else if (!ReceivingData.Message || ReceivingData.Message === '') {
      res.status(200).send({ Status: false, Message: "Customer Message can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Promise.all([
         CustomerManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }).exec(),
      ]).then(Response => {
         if (Response[0] !== null) {
            // Support Details Unique Generator
            SupportManagement.SupportManagementSchema.findOne({}, {}, { 'sort': { createdAt: -1 } }, function (err, result) {
               if (err) {
                  ErrorHandling.ErrorLogCreation(req, 'SupportManagement Details Error', 'SupportManagement.Controller -> SupportManagementDetails', JSON.stringify(err));
                  res.status(417).send({ Status: false, Message: "Some error occurred while Find the Support!.", Error: err });
               } else {
                  var Unique_key = result !== null ? (result.Support_Unique_key + 1) : 1;
                  var Unique_KeyValue = 'Support-' + (Unique_key.toString()).padStart(4, 0);

                  const Create_SupportManagement = new SupportManagement.SupportManagementSchema({
                     CustomerId: ReceivingData.CustomerId,
                     Support_key: Unique_KeyValue,
                     Support_Unique_key: Unique_key,
                     Support_Title: ReceivingData.SupportTitle,
                     Support_Status: 'Open', // Open , Closed
                     LastConversation: 'Customer',
                     ClosedDate: null,
                     Support_Details: [{
                        Message_by: Response[0].ContactName,
                        Message: ReceivingData.Message,
                        Date: new Date(),
                        User: null
                     }],
                     ActiveStatus: true,
                     IfDeleted: false
                  });
                  Create_SupportManagement.save(function (err_1, result_1) {
                     if (err_1) {
                        ErrorHandling.ErrorLogCreation(req, 'SupportManagement Create Error', 'SupportManagement.Controller -> SupportManagementCreate', JSON.stringify(err));
                        res.status(417).send({ Status: false, Message: "Some error occurred while Creating the Support Management!.", Error: err_1 });
                     } else {
                        const CreateNotification = new NotificationModel.NotificationSchema({
                           User: null,
                           Business: null,
                           Notification_Type: 'SupportCreate',
                           Message: 'New Support raised the this Customer Name' + Response[0].ContactName + ' Support Title Name: ' + ReceivingData.SupportTitle,
                           Message_Received: true,
                           Message_Viewed: false,
                           ActiveStatus: true,
                           IfDeleted: false,
                        });
                        CreateNotification.save();
                        res.status(200).send({ Status: true, Message: 'CustomerSupport Created', Response: result_1 });

                     }
                  });
               }
            });
         } else {
            res.status(417).send({ Status: false, Message: "Invalid Customer Details", });
         }
      }).catch(Error => {
         ErrorHandling.ErrorLogCreation(req, 'Customer Details Error', 'SupportManagement.Controller -> CustomerDetails', JSON.stringify(Error));
         res.status(417).send({ Status: false, Message: "Some error occurred.", });
      });
   }
};


// CustomerSupport_Reply  ------------------------------------------ 
exports.CustomerSupport_Reply = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.SupportId || ReceivingData.SupportId === '') {
      res.status(200).send({ Status: false, Message: "Support Details can not be empty" });
   } else if (!ReceivingData.Message || ReceivingData.Message === '') {
      res.status(200).send({ Status: false, Message: "Customer Message can not be empty" });
   } else {
      ReceivingData.SupportId = mongoose.Types.ObjectId(ReceivingData.SupportId);
      Promise.all([
         SupportManagement.SupportManagementSchema.findOne({ _id: ReceivingData.SupportId, ActiveStatus: true, IfDeleted: false })
         .populate({path: 'CustomerId', select: ['ContactName']}).exec(),
      ]).then(Response => {
         var SupportDetails = Response[0];
         if (SupportDetails !== null) {
            var SupportArr = JSON.parse(JSON.stringify(SupportDetails.Support_Details));
            SupportArr.push({
               Message_by: SupportDetails.CustomerId.ContactName,
               Message: ReceivingData.Message,
               Date: new Date(),
               User: null
            });
            SupportManagement.SupportManagementSchema
               .updateOne({_id: ReceivingData.SupportId, CustomerId: ReceivingData.CustomerId }, { $set: { LastConversation: 'Customer', Support_Details: SupportArr } }).exec((err, result) => {
                  if (err) {
                     ErrorHandling.ErrorLogCreation(req, 'Support Details Update Error', 'SupportManagement.Controller -> SupportDetailsUpdate', JSON.stringify(err));
                     res.status(417).send({ Status: false, Message: "Some error occurred while Update the Support Management!.", Error: err });
                  } else {
                     const CreateNotification = new NotificationModel.NotificationSchema({
                        User: null,
                        Business: null,
                        Notification_Type: 'SupportCustomerReply',
                        Message: SupportDetails.Support_Title + ' Same support issues Customer some need to clarification',
                        Message_Received: true,
                        Message_Viewed: false,
                        ActiveStatus: true,
                        IfDeleted: false,
                     });
                     CreateNotification.save();
                     res.status(200).send({ Status: true, Message: "Successfully Update for Customer Support!" });
                  }
               });
         } else {
            res.status(417).send({ Status: false, Message: "Invalid Support Details", });
         }
      }).catch(Error => {
         ErrorHandling.ErrorLogCreation(req, 'Support Details Error', 'SupportManagement.Controller -> SupportDetails', JSON.stringify(Error));
         res.status(417).send({ Status: false, Message: "Some error occurred.", });
      });
   }
};

// CustomerSupport_Details ------------------------------------------ 
exports.CustomerSupport_Detail = function (req, res) {
   var ReceivingData = req.body;
   
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(200).send({ Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.SupportId || ReceivingData.SupportId === '') {
      res.status(200).send({ Status: false, Message: "Support Details can not be empty" });
   } else {
      ReceivingData.SupportId = mongoose.Types.ObjectId(ReceivingData.SupportId);
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      SupportManagement.SupportManagementSchema.findOne({ _id: ReceivingData.SupportId, CustomerId: ReceivingData.CustomerId }, { Support_Title: 1, Support_Status: 1, Support_key: 1, Support_Details: 1 }, {})
         .exec((err, result) => {
            if (err) {
               ErrorHandling.ErrorLogCreation(req, 'Support Details Error', 'SupportManagement.Controller -> SupportDetails', JSON.stringify(err));
               res.status(417).send({ Status: false, Message: "Some error occurred while Creating the Support Management!.", Error: err });
            } else {
               if (result !== null) {
                  result = JSON.parse(JSON.stringify(result));
                  result.Support_Details = result.Support_Details.map(obj => {
                     obj.Date = moment(new Date(obj.Date)).format("DD MMM YYYY hh:mm a");
                     return obj;
                  });
                  res.status(200).send({ Status: true, Message: 'CustomerSupport Details', Response: result });
               } else {
                  res.status(200).send({ Status: false, Message: 'Invalid Support Details' });
               }

            }
         });
   }
};

//Customer Support Detail List
exports.CustomerSupportDetail_List = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
       res.status(200).send({ Status: false, Message: "Customer Details can not be empty" });
   } else {        
       ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
       Promise.all([
           CustomerManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
       ]).then(Response => {
           var OwnerDetails = Response[0];
           if (OwnerDetails !== null) {
               const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
               const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
               var ShortOrder = { createdAt: -1 };
               var ShortKey = ReceivingData.ShortKey;
               var ShortCondition = ReceivingData.ShortCondition;
               if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                   ShortOrder = {};
                   ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
               }
               var FindQuery = { CustomerId: ReceivingData.CustomerId, Support_Status: 'Open' };
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
                   SupportManagement.SupportManagementSchema
                       .aggregate([
                           { $match: FindQuery },
                           {
                               $project: {
                                   Support_key: 1,
                                   Support_Title: 1,
                                   Support_Details: 1,
                                   createdAt: 1,
                                   ActiveStatus: 1,
                                   IfDeleted: 1,
                               }
                           },
                           { $sort: ShortOrder },
                           { $skip: Skip_Count },
                           { $limit: Limit_Count }
                       ]).exec(),
                   SupportManagement.SupportManagementSchema.countDocuments(FindQuery).exec(),
               ]).then(result => {
                   var SupportDetails = JSON.parse(JSON.stringify(result[0]));
                   SupportDetails = JSON.parse(JSON.stringify(SupportDetails));
                   if (SupportDetails.length > 0) {
                       SupportDetails.map(Obj => {
                           Obj.Support_Details = Obj.Support_Details.map(obj => {
                               obj.Date = moment(new Date(obj.Date)).format("DD/MM/YYYY hh:mm a");
                               return obj;
                           });
                           return Obj;
                       });
                      
                   }
                   res.status(200).send({ Status: true, Message: "Support Details", Response: SupportDetails, SubResponse: result[1] });
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