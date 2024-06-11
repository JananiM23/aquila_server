module.exports = function (app) {
    var Controller = require('../../Controllers/App/InviteManagement.controller');
 
    app.post('/APP_API/InviteManagements/VerifyCustomer_Mobile', Controller.VerifyCustomer_Mobile);
    app.post('/APP_API/InviteManagements/SellerSendInvite', Controller.SellerSendInvite);
    app.post('/APP_API/InviteManagements/BuyerSendInvite', Controller.BuyerSendInvite);
    app.post('/APP_API/InviteManagements/BuyerInvite_StatusUpdate', Controller.BuyerInvite_StatusUpdate);
    app.post('/APP_API/InviteManagements/SellerInvite_StatusUpdate', Controller.SellerInvite_StatusUpdate);
    app.post('/APP_API/InviteManagements/SellerAndBuyerBusinessList', Controller.SellerAndBuyerBusinessList);
    // app.post('/APP_API/InviteManagements/SellerAndBuyerBranchList', Controller.SellerAndBuyerBranchList);
    app.post('/APP_API/InviteManagements/SellerAgainstBuyerList', Controller.SellerAgainstBuyerList);
    app.post('/APP_API/InviteManagements/SellerAgainstBusinessList', Controller.SellerAgainstBusinessList);
    // app.post('/APP_API/InviteManagements/SellerAgainstBranchList', Controller.SellerAgainstBranchList);
    app.post('/APP_API/InviteManagements/BuyerAgainstSellerList', Controller.BuyerAgainstSellerList);
    app.post('/APP_API/InviteManagements/BuyerAgainstBusinessList', Controller.BuyerAgainstBusinessList);
    app.post('/APP_API/InviteManagements/BuyerAgainstBranchList', Controller.BuyerAgainstBranchList);    
    app.post('/APP_API/InviteManagements/Invite_Reject', Controller.Invite_Reject);
    app.post('/APP_API/InviteManagements/BuyerAgainstSellerSimpleList', Controller.BuyerAgainstSellerSimpleList);
    app.post('/APP_API/InviteManagements/SellerAgainstBusinessSimpleList', Controller.SellerAgainstBusinessSimpleList);
    // app.post('/APP_API/InviteManagements/SellerAndBusinessAgainstBranchSimpleList', Controller.SellerAndBusinessAgainstBranchSimpleList);
    app.post('/APP_API/InviteManagements/SellerUpdateToBuyerCreditLimit', Controller.SellerUpdateToBuyerCreditLimit);
    app.post('/APP_API/InviteManagements/SellerAndBuyerInviteList', Controller.SellerAndBuyerInviteList);        
    app.post('/APP_API/InviteManagements/VerifyReferralCode', Controller.VerifyReferralCode);
    app.post('/APP_API/InviteManagements/SellerIncreaseCreditLimit', Controller.SellerIncreaseCreditLimit);

    app.post('/APP_API/InviteManagements/SellerBusiness_List', Controller.SellerBusiness_List);
    app.post('/APP_API/InviteManagements/BuyerBusiness_List', Controller.BuyerBusiness_List);
    app.post('/APP_API/InviteManagements/SellerInvite_PendingList', Controller.SellerInvite_PendingList);
    app.post('/APP_API/InviteManagements/SellerInvite_AcceptList', Controller.SellerInvite_AcceptList);
    app.post('/APP_API/InviteManagements/SellerInvite_RejectList', Controller.SellerInvite_RejectList);
    app.post('/APP_API/InviteManagements/InvitedSeller_InviteList', Controller.InvitedSeller_InviteList);
    app.post('/APP_API/InviteManagements/Verify_Mobile', Controller.Verify_Mobile);
};