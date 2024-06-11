module.exports = function (app) {
    var Controller = require('../../Controllers/Web/supportManagement.controller'); 
    app.post('/Web_API/supportManagement/CustomerSupport_Create', Controller.CustomerSupport_Create);     
    app.post('/Web_API/supportManagement/CustomerSupport_Detail', Controller.CustomerSupport_Detail);
    app.post('/Web_API/supportManagement/CustomerSupport_Reply', Controller.CustomerSupport_Reply);        
 };