module.exports = function (app) {
   var Controller = require('../../controllers/App/Common.controller');

   app.post('/APP_API/CommonManagement/MobileOTP', Controller.MobileOTP);   
   app.post('/APP_API/CommonManagement/GenerateOTP', Controller.GenerateOTP);
   app.post('/APP_API/CommonManagement/VerifyOTP', Controller.VerifyOTP);
   app.post('/APP_API/CommonManagement/MobileNumberVerification', Controller.MobileNumberVerification);
   app.post('/APP_API/CommonManagement/SimpleIndustriesList', Controller.SimpleIndustriesList);
   app.post('/APP_API/CommonManagement/StatusVerify', Controller.StatusVerify);
   app.post('/APP_API/CommonManagement/Login', Controller.Login);   
   app.post('/APP_API/CommonManagement/LogOut', Controller.LogOut);
   app.post('/APP_API/CommonManagement/All_Notifications_List', Controller.All_Notifications_List);
   app.post('/APP_API/CommonManagement/Notification_Viewed_Update', Controller.Notification_Viewed_Update);
   app.post('/APP_API/CommonManagement/Viewed_Notifications_Delete', Controller.Viewed_Notifications_Delete);
   app.post('/APP_API/CommonManagement/QRCodeScanning', Controller.QRCodeScanning);

   app.post('/APP_API/CommonManagement/DeviceDeRegister', Controller.DeviceDeRegister);

   app.post('/APP_API/CommonManagement/Read_All_Notifications_List', Controller.Read_All_Notifications_List);
   app.post('/APP_API/CommonManagement/Delete_All_Notifications_List', Controller.Delete_All_Notifications_List);

   app.post('/APP_API/CommonManagement/CustomerWebLogin', Controller.CustomerWebLogin);
   app.post('/APP_API/CommonManagement/WebStatusVerify', Controller.WebStatusVerify);
};