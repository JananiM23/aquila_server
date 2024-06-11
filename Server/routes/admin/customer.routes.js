module.exports = function (app) {
    var Controller = require('../../Controllers/Admin/customer.controller');
 
    app.post('/Admin_API/CustomerManagement/List', Controller.All_Customers_List);
    app.post('/Admin_API/CustomerManagement/OwnerOfUsersList', Controller.All_OwnerOfUsers_List);
    app.post('/Admin_API/CustomerManagement/AllOwnerAndUserOfBusinessList', Controller.AllOwnerAndUserOfBusinessList);
    app.post('/Admin_API/CustomerManagement/InvoiceManagementList', Controller.InvoiceManagementList);
    app.post('/Admin_API/CustomerManagement/PaymentHistoryList', Controller.PaymentHistoryList);
    app.post('/Admin_API/CustomerManagement/View', Controller.Customer_view);
    app.post('/Admin_API/CustomerManagement/CustomerBlock', Controller.CustomerBlock);
    app.post('/Admin_API/CustomerManagement/CustomerUnBlock', Controller.CustomerUnBlock);
    app.post('/Admin_API/CustomerManagement/CustomerDetailsUpdate', Controller.CustomerDetailsUpdate);    
    app.post('/Admin_API/CustomerManagement/State_List', Controller.StateList);   
    app.post('/Admin_API/CustomerManagement/PaymentDetails', Controller.PaymentDetails);   
    app.post('/Admin_API/CustomerManagement/Business_Update', Controller.Business_Update); 
    app.post('/Admin_API/CustomerManagement/OwnerList', Controller.OwnerList);    
    app.post('/Admin_API/CustomerManagement/UserList', Controller.UserList);    
    app.post('/Admin_API/CustomerManagement/BusinessList', Controller.BusinessList); 

   
    //pending 
    app.post('/Admin_API/CustomerManagement/BuyerMonthlyReports', Controller.BuyerMonthlyReports);
    app.post('/Admin_API/CustomerManagement/SellerMonthlyReports', Controller.SellerMonthlyReports);
    app.post('/Admin_API/CustomerManagement/BuyerBusinessMonthlyReports', Controller.BuyerBusinessMonthlyReports);
    app.post('/Admin_API/CustomerManagement/SellerBusinessMonthlyReports', Controller.SellerBusinessMonthlyReports);    

     //branch   
     app.post('/Admin_API/CustomerManagement/AllOwnerAndUserAndBusinessOfBranchList', Controller.AllOwnerAndUserAndBusinessOfBranchList);
     app.post('/Admin_API/CustomerManagement/BranchList', Controller.BranchList);    
     app.post('/Admin_API/CustomerManagement/Branch_Update', Controller.Branch_Update);   
     app.post('/Admin_API/CustomerManagement/BranchDetails_Update', Controller.BranchDetails_Update); 
     app.post('/Admin_API/CustomerManagement/UserBranchList', Controller.UserBranchList);
 
 };