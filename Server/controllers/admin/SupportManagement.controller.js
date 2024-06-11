
var User_Management = require('../../Models/userManagement.model');
var SupportManagement = require('../../Models/SupportManagement.model');
var CustomerManagement = require('../../Models/CustomerManagement.model');
var mongoose = require('mongoose');
var moment = require('moment');
var ErrorHandling = require('../../Handling/ErrorHandling').ErrorHandling;
var NotificationModel = require('../../Models/notification_management.model');
var FCM_App = require('../../../Config/fcm_config').CustomerNotify;

var options = {
  priority: 'high',
  timeToLive: 60 * 60 * 24
};

// Customer SupportManagement updated---------------------------
exports.User_Update_For_CustomerSupport = function (req, res) {
  var ReceivingData = req.body;

  if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
    res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
  } else if (!ReceivingData.User || ReceivingData.User === '') {
    res.status(400).send({ Status: false, Message: "User Details can not be empty" });
  } else if (!ReceivingData.Message || ReceivingData.Message === '') {
    res.status(400).send({ Status: false, Message: "User support can not be empty" });
  } else if (!ReceivingData.SupportId || ReceivingData.SupportId === '') {
    res.status(400).send({ Status: false, Message: "Support Details can not be empty" });
  } else {
    ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
    ReceivingData.SupportId = mongoose.Types.ObjectId(ReceivingData.SupportId);
    ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
    User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {}, function (err, result) {
      if (err) {
        ErrorHandling.ErrorLogCreation(req, 'UserManagement Details Error', 'SupportManagement.Controller -> UserManagementDetails', JSON.stringify(err));
        res.status(417).send({ Status: false, Message: "Some error occurred while Find the User Management!.", Error: err });
      } else {
        if (result !== null) {
          Promise.all([
            SupportManagement.SupportManagementSchema.findOne({ _id: ReceivingData.SupportId, CustomerId: ReceivingData.CustomerId, Support_Status: "Open", ActiveStatus: true, IfDeleted: false }, {}, {}).
              populate({ path: "CustomerId", select: ["Firebase_Token"] }).exec()
          ]).then(Response => {
            var SupportDetailsValue = JSON.parse(JSON.stringify(Response[0]));
            var SupportDetails = SupportDetailsValue.Support_Details;
            SupportDetails.push({
              Message_by: 'Admin',
              Message: ReceivingData.Message,
              Date: new Date(),
              User: ReceivingData.User
            });
            SupportManagement.SupportManagementSchema.updateOne({ _id: ReceivingData.SupportId, Support_Status: "Open", },
              {
                $set: {
                  Support_Details: SupportDetails,
                  LastConversation: 'Admin'
                }
              }).exec();
            var CustomerFCMToken = [SupportDetailsValue.CustomerId.Firebase_Token];  

            var payload = {
              notification: {
                title: 'Hundi-Team',
                body: 'This Support Title: ' + SupportDetailsValue.Support_Title + ' reply to Admin',
                sound: 'notify_tone.mp3'
              },
              data: {
                Customer: ReceivingData.CustomerId,
                notification_type: 'SupportNotification',
                click_action: 'FCM_PLUGIN_ACTIVITY',
              }
            };
            if (CustomerFCMToken.length > 0) {
              FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
            }
            res.status(200).send({ Status: true, Message: "Successfully Update for Customer Support!" });
          }).catch(errorResponse => {
            ErrorHandling.ErrorLogCreation(req, 'SupportManagement Details Error', 'SupportManagement.Controller -> SupportManagementDetails', JSON.stringify(errorResponse));
            res.status(400).send({ Status: false, Message: "Invalid Customer Details!" });
          });
        } else {
          res.status(400).send({ Status: false, Message: "Invalid User Details!" });
        }
      }
    });
  }
};

// SupportManagement List --------------------------------------
exports.All_SupportManagement_List = function (req, res) {
  var ReceivingData = req.body;

  if (!ReceivingData.User || ReceivingData.User === '') {
    res.status(400).send({ Status: false, Message: "User Details can not be empty" });
  } else {
    User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User, Active_Status: true, If_Deleted: false }, {}, {}, function (err, result) {
      if (err) {
        res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find the User Management!.", Error: err });
      } else {
        if (result !== null) {
          const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
          const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
          var ShortOrder = { createdAt: -1 };
          var ShortKey = ReceivingData.ShortKey;
          var ShortCondition = ReceivingData.ShortCondition;
          var FindQuery = { 'IfDeleted': false };
          if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
            ShortOrder = {};
            ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
          }
          if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object' && ReceivingData.FilterQuery !== null && ReceivingData.FilterQuery.length > 0) {
            ReceivingData.FilterQuery.map(obj => {
              if (obj.Type === 'String') {
                FindQuery[obj.DBName] = { $regex: new RegExp(".*" + obj.Value + ".*", "i") };
              }
              if (obj.Type === 'Number') {
                FindQuery[obj.DBName] = parseInt(obj.Value, 10);
              }
              if (obj.Type === 'Object') {
                FindQuery[obj.DBName] = mongoose.Types.ObjectId(obj.Value._id);
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
            });
          }
          Promise.all([
            SupportManagement.SupportManagementSchema
              .aggregate([
                { $match: FindQuery },
                {
                  $lookup: {
                    from: "Customers",
                    let: { "customer": "$CustomerId" },
                    pipeline: [
                      { $match: { $expr: { $eq: ["$$customer", "$_id"] } } },
                      { $project: { "ContactName": 1, "Mobile": 1, "Email": 1, "CustomerCategory": 1 } }
                    ],
                    as: 'Customer'
                  }
                },
                { $unwind: { path: "$Customer", preserveNullAndEmptyArrays: true } },
                { $addFields: { ContactName: { $toLower: "$Customer.ContactName" } } },
                { $addFields: { CustomerCategory: { $toLower: "$Customer.CustomerCategory" } } },
                { $addFields: { Support_Title: { $toLower: "$Support_Title" } } },
                { $addFields: { Support_key: { $toLower: "$Support_key" } } },
                { $project: { Support_Details: 1, ClosedDate: 1, LastConversation: 1, ContactName: 1, CustomerCategory: 1, Support_Title: 1, Support_key: 1, Customer: 1, Support_Status: 1, createdAt: 1 } },
                { $sort: ShortOrder },
                { $skip: Skip_Count },
                { $limit: Limit_Count }
              ]).exec(),
            SupportManagement.SupportManagementSchema.countDocuments(FindQuery).exec()
          ]).then(result => {
            res.status(200).send({ Status: true, Message: 'Customer Support Management List', Response: result[0], SubResponse: result[1] });
          }).catch(err => {
            ErrorHandling.ErrorLogCreation(req, 'SupportManagement List Error', 'SupportManagement.Controller -> SupportManagementList', JSON.stringify(errorResponse));
            res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Contact Us Management list!." });
          });
        } else {
          res.status(200).send({ Status: true, Message: 'Invalid User Details' });
        }
      }
    });
  }

};

// Customer support Closed -----------------------------------
exports.Customer_Support_Closed = function (req, res) {
  var ReceivingData = req.body;
  if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
    res.status(400).send({ Status: false, Message: "CustomerId Details can not be empty" });
  } else if (!ReceivingData.SupportId || ReceivingData.SupportId === '') {
    res.status(400).send({ Status: false, Message: "SupportId Details can not be empty" });
  } else {
    ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
    ReceivingData.SupportId = mongoose.Types.ObjectId(ReceivingData.SupportId);
    SupportManagement.SupportManagementSchema.findOne({ CustomerId: ReceivingData.CustomerId, _id: ReceivingData.SupportId, ActiveStatus: true, IfDeleted: false }, {}, {})
      .populate({ path: "CustomerId", select: ["Firebase_Token"] }).exec((err, result) => {
        if (err) {
          ErrorHandling.ErrorLogCreation(req, 'SupportManagement Details Error', 'SupportManagement.Controller -> SupportManagementDetails', JSON.stringify(err));
          res.status(417).send({ Status: false, Message: "Some error occurred while Find the Customer Management!.", Error: err });
        } else {
          if (result !== null) {
            result = JSON.parse(JSON.stringify(result));
            SupportManagement.SupportManagementSchema.updateOne({ _id: ReceivingData.SupportId },
              {
                $set: {
                  Support_Status: "Closed",
                  ClosedDate: new Date()
                }
              }).exec();
            var CustomerFCMToken = [result.CustomerId.Firebase_Token];
            const CreateNotification = new NotificationModel.NotificationSchema({
              User: null,
              CustomerID: ReceivingData.CustomerId,
              Notification_Type: 'SupportAdminClosed',
              Message: 'This Support Title: ' + result.Support_Title + ' Closed the Admin',
              Message_Received: true,
              Message_Viewed: false,
              ActiveStatus: true,
              IfDeleted: false,
            });
            CreateNotification.save();
            var payload = {
              notification: {
                title: 'Hundi-Team',
                body: 'This Support Title: ' + result.Support_Title + ' Closed the Admin',
                sound: 'notify_tone.mp3'
              },
              data: {
                Customer: ReceivingData.CustomerId,
                notification_type: 'SupportNotification',
                click_action: 'FCM_PLUGIN_ACTIVITY',
              }
            };
            if (CustomerFCMToken.length > 0) {
              FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
            }
            res.status(200).send({ Status: true, Message: "Successfully Update for Customer Support!" });
          } else {
            res.status(400).send({ Status: false, Message: "Invalid Customer Details!" });
          }
        }
      });
  }
};


// SupportKey and Support_Title List ---------------------

exports.SupportKeyAndSupport_Title_List = function (req, res) {
  var ReceivingData = req.body;
  if (!ReceivingData.User || ReceivingData.User === '') {
    res.status(200).send({ Status: false, Message: "Customer Details can not be empty" });
  } else {
    ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
    SupportManagement.SupportManagementSchema.find({ ActiveStatus: true, IfDeleted: false }, { Support_Title: 1, Support_Status: 1, Support_key: 1 }, {})
      .exec((err, result) => {
        if (err) {
          ErrorHandling.ErrorLogCreation(req, 'SupportKey And Support_Title List Error', 'SupportManagement.Controller -> SupportManagementList', JSON.stringify(err));
          res.status(417).send({ Status: false, Message: "Some error occurred while Creating the Support Management!.", Error: err });
        } else {
          res.status(200).send({ Status: true, Message: 'SupportKey And SupportTitle List', Response: result });
        }
      });
  }
};


exports.FilteredCustomer_List = function (req, res) {
  var ReceivingData = req.body;

  if (!ReceivingData.User || ReceivingData.User === '') {
    res.status(400).send({ Status: false, Message: "User Details can not be empty" });
  } else {
    ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
    CustomerManagement.CustomerSchema.find({ ActiveStatus: true, IfDeleted: false }, { ContactName: 1, Mobile: 1, Email: 1, CustomerCategory: 1 }, { 'short': { createdAt: -1 } })
      .exec((err, result) => {
        if (err) {
          ErrorHandling.ErrorLogCreation(req, 'Filter Customer List Error', 'SupportManagement.Controller -> FilterCustomer_List', JSON.stringify(err));
          res.status(417).send({ Status: false, Message: "Some error occurred while Find the Customer Name !.", Error: err });
        } else {
          res.status(200).send({ Status: true, Response: result });
        }
      });
  }
};



// Sample Push Notification for all Customers

/*
###############################################################
NOTE :
METHOD: 1
 With this API We can Send bulk messages and we can use cron to recieve the messages each message 
 will recieved in app for every second and Evey min and so on..

 METHOD: 2
 We have to use Fire base Key For integrating the Push Notoifications.
*/
exports.SendNotification = function (req, res) {
  var ReceivingData = req.body;
  if (!ReceivingData.User || ReceivingData.User === '') {
    res.status(400).send({ Status: false, Message: "User Details cannot be empty" });
  } else {
    CustomerManagement.CustomerSchema.find({ ActiveStatus: true, IfDeleted: false }, { ContactName: 1, Mobile: 1, Email: 1, CustomerCategory: 1 })
      .exec((err, response) => {
        if (err) {
          res.status(500).send({ Status: false, Message: "Error occurred while fetching customers",Error:err });
        } else {
          if (response.length !== 0) {
            var notifications = [];
            response.forEach(customer => {
              var createNotification = new NotificationModel.NotificationSchema({
                User: null,
                Business: null,
                Notification_Type: 'Push Notification',
                Message: `New Push Notification for Customer Name: ${customer.ContactName}, Push Notification Title: ${ReceivingData.SupportTitle}`,
                Message_Received: true,
                Message_Viewed: false,
                ActiveStatus: true,
                IfDeleted: false,
              });
              notifications.push(createNotification);
            });

            NotificationModel.NotificationSchema.insertMany(notifications, (err_1, result_1) => {
              if (err_1) {
                res.status(500).send({ Status: false, Message: "Error occurred while saving notifications",Error:err_1 });
              } else {
                res.status(200).send({ Status: true,Message: "Sent Messages Bulkly for all customers", Response: result_1 });
              }
            });
          } else {
            res.status(404).send({ Status: false, Message: "No active customers found" });
          }
        }
      });
  }
}
