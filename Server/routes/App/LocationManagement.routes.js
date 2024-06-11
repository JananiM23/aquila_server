module.exports = function (app) {
    var Controller = require('../../Controllers/App/LocationManagement.controller');
 
    app.post('/APP_API/LocationManagement/StateList', Controller.StateList);
 };