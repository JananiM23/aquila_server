module.exports = function (app) {
    var Controller = require('../../Controllers/Web/Registration.controller'); 
    
    app.post('/Web_API/CustomerManagement/OwnerRegister', Controller.OwnerRegister); 
    app.post('/Web_API/CustomerManagement/OwnerDetails', Controller.OwnerDetails);  
    app.post('/Web_API/CustomerManagement/OwnerDetailsUpdate', Controller.OwnerDetailsUpdate);
    app.post('/Web_API/CustomerManagement/OwnerCreateUser', Controller.OwnerCreateUser); 
    app.post('/Web_API/CustomerManagement/UserDetails', Controller.UserDetails);  
    app.post('/Web_API/CustomerManagement/UserDetailsUpdate', Controller.UserDetailsUpdate);
    app.post('/Web_API/CustomerManagement/StateList', Controller.StateList);
    app.post('/Web_API/CustomerManagement/OwnerOfUsersList', Controller.OwnerOfUsersList);  
    app.post('/WEB_API/CustomerManagement/BusinessUnAssigned', Controller.BusinessUnAssigned);
    app.post('/WEB_API/CustomerManagement/BranchUnAssigned', Controller.BranchUnAssigned);
    app.post('/WEB_API/CustomerManagement/MobileOTP', Controller.MobileOTP);    
    app.post('/WEB_API/CustomerManagement/StatusVerify', Controller.StatusVerify);
    app.post('/WEB_API/CustomerManagement/CustomerWebLogin', Controller.Login);
    app.post('/WEB_API/CustomerManagement/BusinessAndBranches_DetailsList', Controller.BusinessAndBranches_DetailsList);
    app.post('/WEB_API/CustomerManagement/CustomerProfileDetails', Controller.CustomerProfileDetails); 
    
    app.post('/WEB_API/CustomerManagement/All_Notifications_List', Controller.All_Notifications_List); 
    app.post('/WEB_API/CustomerManagement/DeleteAllReadNotifications', Controller.DeleteAllReadNotifications);
    app.post('/WEB_API/CustomerManagement/MarkAllAsReadNotifications', Controller.MarkAllAsReadNotifications);           
    app.post('/WEB_API/CustomerManagement/Notification_Counts', Controller.Notification_Counts);  
                 
 };