var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PaymentSchema = mongoose.Schema({
    Seller: { type: Schema.Types.ObjectId, ref:'Customers'},     
    Business: { type: Schema.Types.ObjectId, ref:'Business'}, 
    // Branch: { type: Schema.Types.ObjectId, ref:'Branch'},
    Buyer: { type: Schema.Types.ObjectId, ref:'Customers'}, 
    BuyerBusiness: { type: Schema.Types.ObjectId, ref:'Business'}, 
    // BuyerBranch: { type: Schema.Types.ObjectId, ref:'Branch'}, 
    InvoiceDetails: [{
        InvoiceId: { type: Schema.Types.ObjectId, ref:'Invoice'},
        PaidORUnpaid: { type: String }, // Paid, UnPaid
        InvoiceNumber: { type: String },
		  InvoiceAmount: { type: Number },
        RemainingAmount: { type: Number },
        InProgressAmount: { type: Number },
        PaidAmount: { type: Number },
        InvoiceDate: { type: Date },
        IfUsedTemporaryCredit: { type: Boolean},
        CurrentCreditAmount: { type: Number },
        UsedCurrentCreditAmount: { type: Number },
        PaidCurrentCreditAmount: { type: Number },
        TemporaryCreditAmount: { type: Number },
        UsedTemporaryCreditAmount: { type: Number },
        PaidTemporaryCreditAmount: { type: Number }
    }],
    PaymentID_Unique: { type: Number},
    PaymentID: {
        type: String,
        unique: true
     },
    PaymentAmount: { type: Number },
    PaymentMode: { type: String}, // Cheque, Cash
    PaymentDate: { type: Date },
    PaymentDueDate: { type: Date },
    Remarks: { type: String }, 
    Payment_Status: { type: String }, // Pending, Open, Approved, Accept, Disputed, Buyer_Accept
    IfSellerApprove : { type : Boolean },
    IfSellerNotify: { type: Boolean},
    DisputedRemarks : { type: String },
    Payment_ApprovedBy: { type: Schema.Types.ObjectId, ref:'Customers'},
    PaymentAttachments: [{
        fileName: { type: String },
        fileType: { type: String }
    }],
    ActiveStatus: { type: Boolean },
    IfDeleted: { type: Boolean }
},
    { timestamps: true }
);


var VarPaymentSchema = mongoose.model('Payment', PaymentSchema, 'PaymentManagement');

module.exports = {
    PaymentSchema: VarPaymentSchema
};