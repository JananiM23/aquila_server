module.exports = function (app) {   
    
    var Controller = require('../../Controllers/Admin/SupportManagement.controller');
    app.post('/Admin_API/SupportManagement/User_Update_Support', Controller.User_Update_For_CustomerSupport);
    app.post('/Admin_API/SupportManagement/All_SupportManagement_List', Controller.All_SupportManagement_List);
    app.post('/Admin_API/SupportManagement/Customer_Support_Closed', Controller.Customer_Support_Closed);
    app.post('/Admin_API/SupportManagement/SupportKeyAndSupport_Title_List', Controller.SupportKeyAndSupport_Title_List);    
    app.post('/Admin_API/SupportManagement/FilteredCustomer_List', Controller.FilteredCustomer_List);


    app.post('/Admin_API/SupportManagement/SendNotification', Controller.SendNotification);
 }; 