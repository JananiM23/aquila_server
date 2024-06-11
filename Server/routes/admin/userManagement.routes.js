module.exports = function (app) {   
    
    var Controller = require('../../Controllers/Admin/userManagement.controller');
    app.post('/Admin_API/UserManagement/Create', Controller.User_Create);
    app.post('/Admin_API/UserManagement/List', Controller.Users_List);
    app.post('/Admin_API/UserManagement/Update', Controller.User_Update);
    app.post('/Admin_API/UserManagement/InActive', Controller.User_Inactive);
    app.post('/Admin_API/UserManagement/Active', Controller.User_Active);
    app.post('/Admin_API/UserManagement/Login', Controller.AquilaUser_Login);

    // Notification routes
    app.post('/Admin_API/UserManagement/Notifications_List', Controller.All_Notifications_List);
    app.post('/Admin_API/UserManagement/Notification_Counts', Controller.Notification_Counts);
    app.post('/Admin_API/UserManagement/DeleteAllRead', Controller.DeleteAllReadNotifications);
    app.post('/Admin_API/UserManagement/MarkAllAsRead', Controller.MarkAllAsReadNotifications);
    app.post('/Admin_API/UserManagement/Read_Notification', Controller.Read_Notification);
     
 };