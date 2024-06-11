module.exports = function (app) {
    var Controller = require('../../Controllers/App/InvoiceManagement.controller');
 
    app.post('/APP_API/InvoiceManagement/InvoiceCreate', Controller.InvoiceCreate);
    app.post('/APP_API/InvoiceManagement/CheckInvoiceNumberDuplicate', Controller.CheckInvoiceNumberDuplicate);
    app.post('/APP_API/InvoiceManagement/InvoiceCreateMultiple', Controller.InvoiceCreateMultiple);
    app.post('/APP_API/InvoiceManagement/CompleteInvoiceList', Controller.CompleteInvoiceList);
    app.post('/APP_API/InvoiceManagement/InvoiceDetails', Controller.InvoiceDetails);
    app.post('/APP_API/InvoiceManagement/Invoice_SimpleList', Controller.Invoice_SimpleList);
    app.post('/APP_API/InvoiceManagement/InvoiceDetailsUpdate', Controller.InvoiceDetailsUpdate);
    app.post('/APP_API/InvoiceManagement/InvoiceBusinessAndBranch_List', Controller.InvoiceBusinessAndBranch_List);
    app.post('/APP_API/InvoiceManagement/InvoiceBusiness_List', Controller.InvoiceBusiness_List);
    app.post('/APP_API/InvoiceManagement/InvoiceBranch_List', Controller.InvoiceBranch_List); //Not used
    app.post('/APP_API/InvoiceManagement/BuyerInvoice_PendingList', Controller.BuyerInvoice_PendingList);
    app.post('/APP_API/InvoiceManagement/BuyerInvoice_AcceptList', Controller.BuyerInvoice_AcceptList);
    app.post('/APP_API/InvoiceManagement/BuyerInvoice_DisputeList', Controller.BuyerInvoice_DisputeList);
    app.post('/APP_API/InvoiceManagement/Seller_InvoiceCount', Controller.Seller_InvoiceCount);
    app.post('/APP_API/InvoiceManagement/Buyer_InvoiceCount', Controller.Buyer_InvoiceCount);    
    app.post('/APP_API/InvoiceManagement/BuyerInvoice_List', Controller.BuyerInvoice_List);
    app.post('/APP_API/InvoiceManagement/SellerInvoice_List', Controller.SellerInvoice_List);
    app.post('/APP_API/InvoiceManagement/BuyerInvoice_Dispute', Controller.BuyerInvoice_Dispute);    
    app.post('/APP_API/InvoiceManagement/BuyerInvoice_Accept', Controller.BuyerInvoice_Accept); 
    app.post('/APP_API/InvoiceManagement/InvoiceListWithAdvancedFilter', Controller.InvoiceListWithAdvancedFilter);  

    //Web BuyerInvoice Accept
    app.post('/APP_API/InvoiceManagement/Web_BuyerInvoice_Accept', Controller.Web_BuyerInvoice_Accept);
    
    //Web BuyerInvoice Dispute
    app.post('/APP_API/InvoiceManagement/Web_BuyerInvoice_Dispute', Controller.Web_BuyerInvoice_Dispute);


    //Below Listed API's Are Used In Web APP
    app.post('/APP_API/InvoiceManagement/BuyerPendingInvoice_List', Controller.BuyerPendingInvoice_List);
    app.post('/APP_API/InvoiceManagement/BuyerAcceptInvoice_List', Controller.BuyerAcceptInvoice_List);
    app.post('/APP_API/InvoiceManagement/BuyerDisputedInvoice_List', Controller.BuyerDisputedInvoice_List);
    app.post('/APP_API/InvoiceManagement/SellerPendingInvoice_List', Controller.SellerPendingInvoice_List);
    app.post('/APP_API/InvoiceManagement/SellerAcceptInvoice_List', Controller.SellerAcceptInvoice_List);
    app.post('/APP_API/InvoiceManagement/SellerDisputedInvoice_List', Controller.SellerDisputedInvoice_List);
};