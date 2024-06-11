var mongoose = require('mongoose');
var Schema = mongoose.Schema;
// User Management Schema
var UserManagementSchema = mongoose.Schema({  
    Name: { type: String },
    UserName: { type: String, unique: true },
    Password: { type: String },
    Phone: { type: String },
    Email: {type: String},
    Gender: {type: String},
    User_Role: { type: String }, // Super_Admin, Admin     
    User_Status: { type: String}, // Active, Inactive
    ApprovedBy_User: {type: Schema.Types.ObjectId, ref: 'User'},    
    Active_Status: { type : Boolean },
    If_Deleted: { type : Boolean },
    },
    { timestamps: true }
);


var VarUser = mongoose.model('User', UserManagementSchema, 'Aquila_User');

// User LoginHistory Schema 
var LoginHistorySchema = mongoose.Schema({
    User: { type: Schema.Types.ObjectId, ref: 'User' },
    LoginToken: { type: String },
    Hash: { type: String },
    LastActive: { type: Date },
    LoginFrom: { type: String },
    Active_Status: { type : Boolean },
    If_Deleted: { type : Boolean },
    },
    { timestamps: true }
 );
 
 var VarLoginHistory = mongoose.model('Login_History', LoginHistorySchema, 'Aquila_Login_History');
 

module.exports = {
   UserManagementSchema : VarUser,
   LoginHistorySchema: VarLoginHistory
};
