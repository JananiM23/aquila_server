var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CreditSchema = mongoose.Schema({
    Seller: { type: Schema.Types.ObjectId, ref:'Customers'}, 
    Buyer: { type: Schema.Types.ObjectId, ref:'Customers'}, 
    RequestLimit: { type: Number}, 
    ApproveLimit: { type: Number}, 
    AvailableLimit: { type: Number},
    RepaymentLimit: { type: Number}, 
    BuyerBusiness: { type: Schema.Types.ObjectId, ref:'Business'},
    // BuyerBranch: { type: Schema.Types.ObjectId, ref:'Branch'},
    Business: { type: Schema.Types.ObjectId, ref:'Business'},
    // Branch: { type: Schema.Types.ObjectId, ref:'Branch'},
    RequestPeriod: { type: Number},
    ApprovedPeriod: { type: Number},
    SellerRemarks: { type: String},
    BuyerRemarks: { type: String }, 
    ApprovedDate: { type: Date },
    Request_Status: { type: String }, // Pending, Open, Approved, Accept, Reject
    PaymentType: { type: String }, // Online, Cheque, Cash
    ApprovedBy: { type: Schema.Types.ObjectId, ref:'Customers'},  
    ActiveStatus: { type: Boolean },
    IfDeleted: { type: Boolean }
},
    { timestamps: true }
);


var VarCreditSchema = mongoose.model('Credit', CreditSchema, 'TemporaryCredit');

module.exports = {
    CreditSchema: VarCreditSchema
};