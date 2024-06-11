var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Business Management Schema
var BusinessSchema = mongoose.Schema({
   Customer: { type: Schema.Types.ObjectId, ref: 'Customers' },
   UserAssigned: { type: Boolean },
   IfBuyer: { type: Boolean },
   IfSeller: { type: Boolean },
   FirstName: { type: String },
   LastName: { type: String },
   Mobile: { type: String },
   Industry: { type: Schema.Types.ObjectId, ref: 'Industry' },
   BusinessCreditLimit: { type: Number },
   AvailableCreditLimit: { type: Number },
   // PrimaryBranch: { type: Schema.Types.ObjectId, ref: 'Branch' },
   PDFFiles: [{ type: String }],
   ActiveStatus: { type: Boolean },
   IfDeleted: { type: Boolean },
}, { timestamps: true });
var VarBusinessSchema = mongoose.model('Business', BusinessSchema, 'Business');

// Branch Management Schema
// var BranchSchema = mongoose.Schema({
//    Customer: { type: Schema.Types.ObjectId, ref: 'Customers' },
//    Business: { type: Schema.Types.ObjectId, ref: 'Business' },
//    BranchName: { type: String },
//    Mobile: { type: String },
//    Address: { type: String },
//    RegistrationId: { type: String },
//    GSTIN: { type: String },
//    BranchCreditLimit: { type: Number },
//    AvailableCreditLimit: { type: Number },
//    UserAssigned: { type: Boolean },
//    ActiveStatus: { type: Boolean },
//    IfDeleted: { type: Boolean }
// }, { timestamps: true });
// var VarBranchSchema = mongoose.model('Branch', BranchSchema, 'Branch');

module.exports = {
   BusinessSchema: VarBusinessSchema,
   // BranchSchema: VarBranchSchema
};