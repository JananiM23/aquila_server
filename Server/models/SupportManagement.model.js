var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var SupportManagementSchema = mongoose.Schema({
    CustomerId: { type: Schema.Types.ObjectId, ref: 'Customers' },
    Support_key: { type: String },
    Support_Unique_key: { type: Number },
    Support_Title: {  type: String},
    Support_Status: { type: String }, // Open , Closed
    LastConversation: { type: String }, // Customer, Admin
    ClosedDate: { type: Date }, // Admin Support Closed Date    
    Support_Details: [{
        Message_by: { type: String }, // User, Customer
        Message: { type: String },
        Date: { type: Date },
        User: { type: Schema.Types.ObjectId, ref: 'User' }
    }],
    ActiveStatus: { type: Boolean, required: true },
    IfDeleted: { type: Boolean, required: true },
},
    { timestamps: true }
);
var varSupportManagementSchema = mongoose.model('Support', SupportManagementSchema, 'SupportManagement');

module.exports = {
    SupportManagementSchema: varSupportManagementSchema   
};
