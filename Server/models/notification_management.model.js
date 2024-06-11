var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var NotificationSchema = mongoose.Schema({
   User: { type: Schema.Types.ObjectId, ref: 'User' },
  //  Branch: { type: Schema.Types.ObjectId, ref: 'Branch' },   
   Business: { type: Schema.Types.ObjectId, ref: 'Business' },   
   Notification_Type: {type: String}, // SellerRequestSend, SellerRequestAccepted, SellerInvoiceCreated, SellerInvoiceAccept, SupportAdminReply, SupportAdminClosed, SellerInvoiceDisputed, SellerChangedInvite        
   Message: { type: String },
   Message_Received: { type : Boolean , required : true },
   Message_Viewed: { type : Boolean , required : true },
   ActiveStatus: { type : Boolean , required : true },
   IfDeleted: { type : Boolean , required : true },
   },
   { timestamps: true }
);


var VarNotificationDetails = mongoose.model('Notification_Details', NotificationSchema, 'Notification_Details');

 module.exports = {
   NotificationSchema : VarNotificationDetails
 };