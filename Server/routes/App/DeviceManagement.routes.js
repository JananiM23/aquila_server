module.exports = function (app) {
    var Controller = require('../../Controllers/App/DeviceManagement.controller');
 
    app.post('/APP_API/DeviceManagement/DeviceCreate', Controller.CreateDevice);
    app.post('/APP_API/DeviceManagement/DeviceStatus_Update', Controller.DeviceStatus_Update);
    
};