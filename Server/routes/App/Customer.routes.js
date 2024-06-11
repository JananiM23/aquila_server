const {authorize} = require('../../_middleware/authorize')

module.exports = function (app) {
    var Controller = require('../../Controllers/App/Customer.controller');
 
    app.post('/APP_API/CustomerManagement/OwnerRegister', Controller.OwnerRegister);
    app.post('/APP_API/CustomerManagement/OwnerRegisterMobile', authorize(), Controller.OwnerRegisterMobile);
    app.post('/APP_API/CustomerManagement/OwnerWebRegister', Controller.OwnerWebRegister);
    app.post('/APP_API/CustomerManagement/CustomerDetails', Controller.CustomerDetails);
    app.post('/APP_API/CustomerManagement/Customer_Details', Controller.Customer_Details);
    app.post('/APP_API/CustomerManagement/SwitchTo_BothBuyerAndSeller', Controller.SwitchTo_BothBuyerAndSeller);    
    app.post('/APP_API/CustomerManagement/CustomerDetailsUpdate', Controller.CustomerDetailsUpdate);
    app.post('/APP_API/CustomerManagement/UserUpdated', Controller.UserUpdated);
    app.post('/APP_API/CustomerManagement/User_Create', Controller.User_Create);
    app.post('/APP_API/CustomerManagement/OwnerAgainstUserList', Controller.OwnerAgainstUserList);
    app.post('/APP_API/CustomerManagement/IOS_User_Create', Controller.IOS_User_Create);
    app.post('/APP_API/CustomerManagement/IOS_UserUpdated', Controller.IOS_UserUpdated);
    app.post('/APP_API/CustomerManagement/UserDelete', Controller.UserDelete);
    app.post('/APP_API/CustomerManagement/CustomerProfileUpload', Controller.CustomerProfileUpload); 
    app.post('/APP_API/CustomerManagement/MonthlyReports', Controller.MonthlyReports); 

    app.post('/APP_API/CustomerManagement/OwnerDetailsUpdate', Controller.OwnerDetailsUpdate);

    app.post("/APP_API/CustomerManagement/MyBusinessList",Controller.MyBusinessList);

    //For Web
    app.post('/APP_API/CustomerManagement/MobileOTP', Controller.MobileOTP); 
    app.post('/APP_API/CustomerManagement/OwnerOfUsersList', Controller.OwnerOfUsersList); 
    app.post('/APP_API/CustomerManagement/StateList', Controller.StateList);
    app.get('/APP_API/CustomerManagement/StateListMobile', authorize(), Controller.StateListMobile);

};