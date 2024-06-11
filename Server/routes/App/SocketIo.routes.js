module.exports = function (app) {
    var Controller = require('../../Controllers/App/SocketIo.controller'); 
    app.post('/APP_API/SocketManagement/QRCodeScanning', Controller.QRCodeScanning); 
 };