var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Invoice Management Schema
var InvoiceSchema = mongoose.Schema({
   Seller: { type: Schema.Types.ObjectId, ref: 'Customers' },
   Business:{ type: Schema.Types.ObjectId, ref: 'Business' },
   // Branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
   Buyer: { type: Schema.Types.ObjectId, ref: 'Customers' },
   BuyerBusiness:{ type: Schema.Types.ObjectId, ref: 'Business' },
   // BuyerBranch: { type: Schema.Types.ObjectId, ref: 'Branch' },
   InvoiceNumber: { type: String },
   InvoiceDate : { type: Date },
   InvoiceDueDate : { type: Date },
   ApprovedDate : { type: Date },
   IfBuyerApprove: { type: Boolean },
   IfBuyerNotify: { type: Boolean },   
   InvoiceStatus: { type: String }, // Pending, Disputed, Partial, Closed, Accept
	InvoiceAmount: { type: Number },
	PaidAmount: { type: Number },
   RemainingAmount: { type: Number },
	InProgressAmount: { type: Number },
   CurrentCreditAmount: { type: Number},
   UsedCurrentCreditAmount: { type: Number },
   PaidCurrentCreditAmount: { type: Number },
	IfUsedTemporaryCredit: { type: Boolean },
   IfUsedPaidTemporaryCredit: { type: Boolean },
   TemporaryRequestId: { type: String },
   TemporaryCreditAmount: { type: Number },
   UsedTemporaryCreditAmount: { type: Number },
   PaidTemporaryCreditAmount: { type: Number },
   InvoiceDescription: { type: String },
   Remarks: { type: String },
	DisputedParentID: { type: Schema.Types.ObjectId, ref: 'Invoice' },
   DisputedRemarks: { type: String },
   ResendRemarks: { type: String },
   AcceptRemarks: { type: String },
   PaidORUnpaid: { type: String },
   PaymentStatus: { type: String }, // WaitForPayment, PartialPayment, PaymentCompleted
   
   InvoiceAttachments: [{
      fileName: { type: String },
      fileType: { type: String }
   }],
   ActiveStatus: { type: Boolean},
   IfDeleted: { type: Boolean}
}, { timestamps: true });
var VarInvoiceSchema = mongoose.model('Invoice', InvoiceSchema, 'Invoice');


module.exports = {
   InvoiceSchema: VarInvoiceSchema
};