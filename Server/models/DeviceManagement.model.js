var mongoose = require('mongoose');
var Schema = mongoose.Schema;
// Device Schema 
var DeviceSchema = mongoose.Schema({
    Customer: { type: Schema.Types.ObjectId, ref:'Customers'}, 
    AccountStatus: { type: String }, // Old , New 
    CustomerStatus: { type: String }, // Register, Install
    CustomerType: { type: String }, // Owner, User
    Device_Id: { type: Schema.Types.ObjectId, ref:'Device'},
    Device_Type: { type: String},
    Firebase_Token: { type: String}, 
    LastActive: { type: Date}, 
    ActiveStatus: { type: Boolean },
    IfDeleted: { type: Boolean }
},
    { timestamps: true }
);


var VarDeviceSchema = mongoose.model('Device', DeviceSchema, 'DeviceManagement');


module.exports = {
    DeviceSchema: VarDeviceSchema,
};