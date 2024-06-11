var mongoose = require('mongoose');
var ErrorHandling = require('../../Handling/ErrorHandling').ErrorHandling;
var LoginHistory = require('../../Models/login_system.model');
var SocketAndQRModel = require('../../Models/SocketAndQRManagement.model');
var express = require('express');
var app = express();
var Socket = require('../../../Server/helper/socket-handling');


// QR Code Scanning
exports.QRCodeScanning = function (req, res) {   
    var ReceivingData = req.body;
    if (!ReceivingData.QRToken || ReceivingData.QRToken === '') {
       res.status(400).send({ Status: false, Message: "QR Token can not be empty" });
    } else if (!ReceivingData.LoginId || ReceivingData.LoginId === '') {
       res.status(400).send({ Status: false, Message: "Login ID can not be empty" });
    } else {
       ReceivingData.LoginId = mongoose.Types.ObjectId(ReceivingData.LoginId);
       SocketAndQRModel.SocketSchema.findOne({ QRToken: ReceivingData.QRToken, SocketConnection: true, ActiveStatus: true, IfDeleted: false }, {}).exec((err, result) => {
          if (err) {
             ErrorHandling.ErrorLogCreation(req, 'QRCode Details Find Error', 'Common.Controller -> QRCodeScanning', JSON.stringify(err));
             res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to complete this QR Code Scanning Error!.", Error: err });
          } else {
             if (result !== null) {
                LoginHistory.LoginHistorySchema.findOne({ _id: ReceivingData.LoginId, LoginFrom: 'APP', ActiveStatus: true, IfDeleted: false }, {}).exec((err1, result1) => {
                   if (err1) {
                      ErrorHandling.ErrorLogCreation(req, 'Mobile Number Find Error', 'Common.Controller -> QRCode Scanning', JSON.stringify(err1));
                      res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to verify this mobile number!", Error: err1 });
                   } else {
                      if (result1 !== null) {
                         result.LoginId = result1._id;
                         result.save();
                         const SocketId = result.SocketId;
                         const QRToken = result.QRToken;                        
                         io.sockets.in(req.body.random).emit('msg', { msg: result });                                                     
                         res.status(200).send({ Status: true, Message: '' });
                      } else {
                         res.status(200).send({ Status: false, Message: 'Invalid Login Details' });
                      }
                   }
                });
             } else {
                res.status(200).send({ Status: false, Message: 'Invalid QR Code Details' });
             }
          }
       });
    }
 };


exports.requestChat = function(req, res) {
   io.emit('request', { msg: 'Chat Request from Admin' });
   res.send({Status: true});
};

exports.chat = function(req, res) {
   io.sockets.in(req.body.random).emit('msg', { msg: req.body.msg });
   res.send({Status: true});
};