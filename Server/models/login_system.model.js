var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Login System
var LoginHistorySchema = mongoose.Schema({
   User: { type: Schema.Types.ObjectId, ref: 'Customers' },
   Mobile: {type: String},         
   LastActive: { type: Date },
   LoginFrom: { type: String },
   Password: { type: String },
   ContactName: { type: String },
   CustomerCategory: { type: String },
   CustomerType: { type: String },
   Firebase_Token: {type : String },
   Device_Id: {type : String},
   Device_Type: { type: String },      
   ActiveStatus: { type : Boolean },
   IfDeleted: { type : Boolean },
   },
   { timestamps: true }
);

var VarLoginHistory = mongoose.model('Login_App_History', LoginHistorySchema, 'AquilaAPP_Login_History');

module.exports = {
   LoginHistorySchema : VarLoginHistory
};
