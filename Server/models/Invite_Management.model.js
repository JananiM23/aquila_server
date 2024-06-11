var mongoose = require('mongoose');
var Schema = mongoose.Schema;
// Invite Management  Schema
var InviteManagementSchema = mongoose.Schema({
    Mobile: { type: String },
    ContactName: { type: String },
    Email: { type: String },
    Buyer: { type: Schema.Types.ObjectId, ref:'Customers'},
    BuyerBusiness: { type: Schema.Types.ObjectId, ref:'Business'},
    // BuyerBranch: { type: Schema.Types.ObjectId, ref:'Branch'},
    Seller: { type: Schema.Types.ObjectId, ref:'Customers'}, 
    Business: { type: Schema.Types.ObjectId, ref:'Business'},
    // Branch: { type: Schema.Types.ObjectId, ref:'Branch'},
    ReferralCode:  {
        type: String,
        unique: true
    },
    Referral_Unique:  { type: Number }, 
    IfUser: { type: Boolean },
    InvitedUser: { type: Schema.Types.ObjectId, ref:'Customers'},
    Invite_Status: { type: String }, // Pending_Approval, Accept, Reject
    InviteType: { type: String },
    IfSeller: { type: String },
    IfBuyer: { type: String },
    BuyerCreditLimit: { type: Number },
    BuyerPaymentType: { type: String },
    BuyerPaymentCycle: { type: Number },
    AvailableLimit: { type: Number },
    InvitedBy: { type: Schema.Types.ObjectId, ref:'Customers'},
    InviteProcess: { type: String }, // Pending, Completed
    ModeInvite: { type: String }, // Direct, Mobile
    InviteCategory: { type: String }, // Seller, Buyer
    ActiveStatus: { type: Boolean },
    IfDeleted: { type: Boolean }    
},
    { timestamps: true }
);

var VarInviteManagementSchema = mongoose.model('InviteModel', InviteManagementSchema, 'InviteManagements');

module.exports = {
    InviteManagementSchema: VarInviteManagementSchema,
};