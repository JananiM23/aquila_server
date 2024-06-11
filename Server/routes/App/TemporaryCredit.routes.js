module.exports = function (app) {
    var Controller = require('../../Controllers/App/TemporaryCredit.controller');
 
    app.post('/APP_API/CreditManagement/TempCreditCreate', Controller.TempCreditCreate);  
    app.post('/APP_API/CreditManagement/CreditRequest_Update', Controller.CreditRequest_Update); 
    app.post('/APP_API/CreditManagement/BuyerRequest_List', Controller.BuyerRequest_List); 
    app.post('/APP_API/CreditManagement/SellerRequest_List', Controller.SellerRequest_List); 
    app.post('/APP_API/CreditManagement/Buyer_BusinessList', Controller.Buyer_BusinessList); 


    //WEB
    app.post('/APP_API/CreditManagement/TemporaryRequestList', Controller.TemporaryRequestList); 
    app.post('/APP_API/CreditManagement/Buyer_TemporaryRequest_List', Controller.Buyer_TemporaryRequest_List); 


         
};