var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var SocketSchema = mongoose.Schema({
    SocketId: { type: String },
    QRToken: { type: String },
    SocketConnection: { type: Boolean },
    LoginId: { type: Schema.Types.ObjectId, ref: 'Login_History' },
    StartDate: { type: Date },
    EndDate: { type: Date },
    ActiveStatus: { type: Boolean },
    IfDeleted: { type: Boolean }
},
    { timestamps: true }
);


var VarSocketSchema = mongoose.model('SocketAndQR', SocketSchema, 'SocketAndQRManagement');

module.exports = {
    SocketSchema: VarSocketSchema
};