module.exports = function (app) {
    var Controller = require('../../Controllers/App/SupportManagement.controller');
 
    app.post('/APP_API/SupportManagement/CustomerSupport_Create', Controller.CustomerSupport_Create);
    app.post('/APP_API/SupportManagement/CustomerSupport_Detail', Controller.CustomerSupport_Detail);
    app.post('/APP_API/SupportManagement/CustomerSupport_Reply', Controller.CustomerSupport_Reply);
    app.post('/APP_API/SupportManagement/CustomerSupport_List', Controller.CustomerSupport_List);
    
        //WEB
    app.post('/APP_API/SupportManagement/CustomerSupportDetail_List', Controller.CustomerSupportDetail_List);


 };