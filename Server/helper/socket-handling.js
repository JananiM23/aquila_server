var SocketAndQRModel = require('../Models/SocketAndQRManagement.model');
var ErrorHandling = require('./../Handling/ErrorHandling').ErrorHandling;

exports.SocketRegister = function (socket, token) {
   if (token !== null && token !== '' && token !== 'null' && token !== undefined) {
      SocketAndQRModel.SocketSchema.findOne({ QRToken: token, SocketConnection: true, ActiveStatus: true, IfDeleted: false })
         .exec(function (err, res) {
            if (err) {
               ErrorHandling.ErrorLogCreation('Socket IO Connection Error', 'Socket And QR Find Details Error', 'SocketRegister -> SocketAndQRDetails', JSON.stringify(err));
            } else {
              if (res === null) {
                  const CreateSocketIO = new SocketAndQRModel.SocketSchema({
                     SocketId: socket.id,
                     QRToken: token,
                     SocketConnection: true,
                     StartDate: new Date(),
                     LoginId: null,
                     EndDate: null,
                     ActiveStatus: true,
                     IfDeleted: false
                  });
                  CreateSocketIO.save(function (Err, result1) {
                     if (Err) {
                        socket.emit('Alert', 'Socket And QR Create Failed!');
                     } else {
                        socket.emit('Success', 'Socket And QR Code Created');
                     }
                  });
               } else {
                  SocketAndQRModel.SocketSchema.updateOne(
                     { QRToken: token, ActiveStatus: true, IfDeleted: false },
                     { $set: { SocketId: socket.id } }
                  ).exec(function (err1, res1) {
                     if (err1) {
                        socket.emit('Alert', 'Socket Update Failed!');
                     } else {
                        socket.emit('Success', 'Socket And QR Code Updated');
                     }
                  });
               }
            }
         });
   } else {
      socket.emit('Alert', 'Dot`t Try This Type of Hacking!');
   }
};


exports.SocketRegisterDeActive = function (socket) {
   const SocketId = socket.id;
   SocketAndQRModel.SocketSchema.updateOne(
      { SocketId: SocketId, ActiveStatus: true, IfDeleted: false },
      { $set: { EndDate: new Date(), SocketConnection: false, ActiveStatus: false, IfDeleted: true } }
   ).exec();
};


exports.SocketPassingData = function (socket, data) {   
   socket.emit('Alert', data);
};


