module.exports = function (app) {
    var Controller = require('../../Controllers/App/Payment.controller');
 
    app.post('/APP_API/PaymentManagement/PaymentCreate', Controller.PaymentCreate);
    app.post('/APP_API/PaymentManagement/CompletePaymentList', Controller.CompletePaymentList);
    app.post('/APP_API/PaymentManagement/PaymentDetailsUpdate', Controller.PaymentDetailsUpdate);
    app.post('/APP_API/PaymentManagement/PaymentDetails', Controller.PaymentDetails);
    app.post('/APP_API/PaymentManagement/BuyerPayment_Approve', Controller.BuyerPayment_Approve);
    app.post('/APP_API/PaymentManagement/PaymentStatusVise_List', Controller.PaymentStatusVise_List);
    app.post('/APP_API/PaymentManagement/SellerPaymentList', Controller.SellerPaymentList);
    app.post('/APP_API/PaymentManagement/BuyerPaymentList', Controller.BuyerPaymentList);
    app.post('/APP_API/PaymentManagement/SellerPayment_DisputeList', Controller.SellerPayment_DisputeList);
    app.post('/APP_API/PaymentManagement/BuyerPayment_Disputed', Controller.BuyerPayment_Disputed);

    //Not Used
    app.post('/APP_API/PaymentManagement/PaymentListWithAdvancedFilters', Controller.PaymentListWithAdvancedFilters);  
    
    //web
    app.post('/APP_API/PaymentManagement/Seller_PaymentCount', Controller.Seller_PaymentCount);
    app.post('/APP_API/PaymentManagement/Buyer_PaymentCount', Controller.Buyer_PaymentCount);
    app.post('/APP_API/PaymentManagement/Web_BuyerPayment_Approve', Controller.Web_BuyerPayment_Approve);
    app.post('/APP_API/PaymentManagement/Web_BuyerPayment_Disputed', Controller.Web_BuyerPayment_Disputed);
    app.post('/APP_API/PaymentManagement/BuyerInvoice_AcceptList', Controller.BuyerInvoice_AcceptList);
    app.post('/APP_API/PaymentManagement/Web_PaymentCreate', Controller.Web_PaymentCreate);
    app.post('/APP_API/PaymentManagement/BuyerPendingPayment_List', Controller.BuyerPendingPayment_List);
    app.post('/APP_API/PaymentManagement/BuyerAcceptPayment_List', Controller.BuyerAcceptPayment_List);
    app.post('/APP_API/PaymentManagement/BuyerDisputedPayment_List', Controller.BuyerDisputedPayment_List);
    app.post('/APP_API/PaymentManagement/SellerPendingPayment_List', Controller.SellerPendingPayment_List);
    app.post('/APP_API/PaymentManagement/SellerAcceptPayment_List', Controller.SellerAcceptPayment_List);
    app.post('/APP_API/PaymentManagement/SellerDisputedPayment_List', Controller.SellerDisputedPayment_List);
};