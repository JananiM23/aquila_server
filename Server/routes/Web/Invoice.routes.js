module.exports = function (app) {
    var Controller = require('../../Controllers/Web/Invoice.controller');
 
    app.post('/Web_API/InvoiceManagement/BuyerPendingInvoice_List', Controller.BuyerPendingInvoice_List);
    app.post('/Web_API/InvoiceManagement/BuyerAcceptInvoice_List', Controller.BuyerAcceptInvoice_List);
    app.post('/Web_API/InvoiceManagement/BuyerDisputedInvoice_List', Controller.BuyerDisputedInvoice_List);
    app.post('/Web_API/InvoiceManagement/SellerPendingInvoice_List', Controller.SellerPendingInvoice_List);
    app.post('/Web_API/InvoiceManagement/SellerAcceptInvoice_List', Controller.SellerAcceptInvoice_List);
    app.post('/Web_API/InvoiceManagement/SellerDisputedInvoice_List', Controller.SellerDisputedInvoice_List);
    app.post('/Web_API/InvoiceManagement/Buyer_InvoiceCount', Controller.Buyer_InvoiceCount); 
    app.post('/Web_API/InvoiceManagement/Seller_InvoiceCount', Controller.Seller_InvoiceCount);
    app.post('/Web_API/InvoiceManagement/SellerAgainstBuyerList', Controller.SellerAgainstBuyerList); 
    app.post('/Web_API/InvoiceManagement/BuyerAgainstBusinessList', Controller.BuyerAgainstBusinessList);
    app.post('/Web_API/InvoiceManagement/BuyerAgainstBranchList', Controller.BuyerAgainstBranchList);
    app.post('/Web_API/InvoiceManagement/InvoiceCreate', Controller.InvoiceCreate);
    app.post('/Web_API/InvoiceManagement/InvoiceDetailsUpdate', Controller.InvoiceDetailsUpdate);
    app.post('/Web_API/InvoiceManagement/BuyerInvoice_Dispute', Controller.BuyerInvoice_Dispute);
    app.post('/Web_API/InvoiceManagement/BuyerInvoice_Accept', Controller.BuyerInvoice_Accept);
    
    // app.post('/Web_API/InvoiceManagement/BuyerAgainstSellerList', Controller.BuyerAgainstSellerList);
    // app.post('/Web_API/InvoiceManagement/BuyerBranchAgainstSellerList', Controller.BuyerBranchAgainstSellerList);
    // app.post('/Web_API/InvoiceManagement/MyBusiness_List', Controller.MyBusiness_List);
    // app.post('/Web_API/InvoiceManagement/BranchesOfBusiness_List', Controller.BranchesOfBusiness_List);
    
};