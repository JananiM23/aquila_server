module.exports = function (app) {
    var Controller = require('../../Controllers/Web/Payment.controller');
    
    app.post('/Web_API/PaymentManagement/Seller_PaymentCount', Controller.Seller_PaymentCount);
    app.post('/Web_API/PaymentManagement/Buyer_PaymentCount', Controller.Buyer_PaymentCount);
    app.post('/Web_API/PaymentManagement/BuyerAgainstSellerList', Controller.BuyerAgainstSellerList);
    app.post('/Web_API/PaymentManagement/SellerAgainstBusinessList', Controller.SellerAgainstBusinessList);
    app.post('/Web_API/PaymentManagement/SellerAgainstBranchList', Controller.SellerAgainstBranchList);
    app.post('/Web_API/PaymentManagement/BuyerPendingPayment_List', Controller.BuyerPendingPayment_List);
    app.post('/Web_API/PaymentManagement/BuyerAcceptPayment_List', Controller.BuyerAcceptPayment_List);
    app.post('/Web_API/PaymentManagement/BuyerDisputedPayment_List', Controller.BuyerDisputedPayment_List);
    app.post('/Web_API/PaymentManagement/SellerPendingPayment_List', Controller.SellerPendingPayment_List);
    app.post('/Web_API/PaymentManagement/SellerAcceptPayment_List', Controller.SellerAcceptPayment_List);
    app.post('/Web_API/PaymentManagement/SellerDisputedPayment_List', Controller.SellerDisputedPayment_List);
    app.post('/Web_API/PaymentManagement/PaymentDetails', Controller.PaymentDetails);
    app.post('/Web_API/PaymentManagement/BuyerInvoice_AcceptList', Controller.BuyerInvoice_AcceptList);
    app.post('/Web_API/PaymentManagement/BuyerPayment_Approve', Controller.BuyerPayment_Approve);
    app.post('/Web_API/PaymentManagement/BuyerPayment_Disputed', Controller.BuyerPayment_Disputed);
    app.post('/Web_API/PaymentManagement/PaymentCreate', Controller.PaymentCreate);
    app.post('/Web_API/PaymentManagement/PaymentDetailsUpdate', Controller.PaymentDetailsUpdate);
};