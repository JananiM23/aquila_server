var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Customer Management Schema
var CustomerSchema = mongoose.Schema({
   ContactName: { type: String },
   Mobile: { type: String },
   Email: { type: String },
   State: { type: Schema.Types.ObjectId, ref: 'Global_State'},
   CustomerCategory: { type: String }, // Seller, Buyer, BothSellerBuyer
   CustomerType: { type: String }, // Owner, User
   ReferralCode: {
      type: String,
      //unique: true
   },
   Referral_Unique:  { type: Number }, 
   IfUserBusiness: { type: Boolean },
   BusinessAndBranches: [{
      // Business: [{type: Schema.Types.ObjectId, ref: 'Business'}]
      Business: {type: Schema.Types.ObjectId, ref: 'Business'}
      // Branches: [{ type: Schema.Types.ObjectId, ref: 'Branch'}]
   }],
   HundiScore: { type: Number },
   // IfUserBranch: { type: Boolean },
   IfSellerUserPaymentApprove: { type: Boolean }, // Alter Native Seller User Payment Approve
   IfBuyerUserInvoiceApprove: { type: Boolean }, // Alter Native Buyer User Invoice Approve
   Owner: { type: Schema.Types.ObjectId, ref: 'Customers' },
   Firebase_Token: {type : String },
   Device_Id: {type : String},
   Device_Type: { type: String },
   File_Name: {type : String},
   LoginPin: { type: Number },
   OTP: { type: Number },
   ActiveStatus: { type: Boolean },
   IfDeleted: { type: Boolean }
}, { timestamps: true });
var VarCustomerSchema = mongoose.model('Customers', CustomerSchema, 'Customers');

module.exports = {
   CustomerSchema: VarCustomerSchema
};