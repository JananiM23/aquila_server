module.exports = function (app) {
    var Controller = require('../../Controllers/Web/TemporaryCredit.controller');     
    app.post('/Web_API/TemporaryManagement/TempCreditCreate', Controller.TempCreditCreate);
    app.post('/Web_API/TemporaryManagement/TemporaryRequestList', Controller.TemporaryRequestList);
    app.post('/Web_API/TemporaryManagement/BuyerBusiness_List', Controller.BuyerBusiness_List);
    app.post('/Web_API/TemporaryManagement/BuyerBranchesOfBusiness_List', Controller.BuyerBranchesOfBusiness_List);
    app.post('/Web_API/TemporaryManagement/CreditRequest_Update', Controller.CreditRequest_Update);  
    app.post('/Web_API/TemporaryManagement/SellerAgainstBusinessSimpleList', Controller.SellerAgainstBusinessSimpleList);
    app.post('/Web_API/TemporaryManagement/SellerAndBusinessAgainstBranchSimpleList', Controller.SellerAndBusinessAgainstBranchSimpleList);     
 };