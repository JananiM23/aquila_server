module.exports = function (app) {
    var Controller = require('../../Controllers/Web/Invite.controller');
 
    app.post('/Web_API/InviteManagement/Verify_Mobile', Controller.Verify_Mobile);
    app.post('/Web_API/InviteManagement/SellerAndBuyerBusinessList', Controller.SellerAndBuyerBusinessList);
    app.post('/Web_API/InviteManagement/SellerBusiness_List', Controller.SellerBusiness_List);
    app.post('/Web_API/InviteManagement/SellerBranchesOfBusiness_List', Controller.SellerBranchesOfBusiness_List);
    app.post('/Web_API/InviteManagement/SellerAndBuyerBranchList', Controller.SellerAndBuyerBranchList);
    app.post('/Web_API/InviteManagement/SellerSendInvite', Controller.SellerSendInvite);
    app.post('/Web_API/InviteManagement/SellerInvite_PendingList', Controller.SellerInvite_PendingList);
    app.post('/Web_API/InviteManagement/SellerInvite_AcceptList', Controller.SellerInvite_AcceptList);
    app.post('/Web_API/InviteManagement/SellerInvite_RejectList', Controller.SellerInvite_RejectList);
    app.post('/Web_API/InviteManagement/Invite_Reject', Controller.Invite_Reject);
    app.post('/Web_API/InviteManagement/SellerInvite_StatusUpdate', Controller.SellerInvite_StatusUpdate);
    app.post('/Web_API/InviteManagement/InvitedSeller_InviteList', Controller.InvitedSeller_InviteList);
    app.post('/Web_API/InviteManagement/InvitedBuyer_InviteList', Controller.InvitedBuyer_InviteList);
    app.post('/Web_API/InviteManagement/BuyerInvite_StatusUpdate', Controller.BuyerInvite_StatusUpdate);
    app.post('/Web_API/InviteManagement/BuyerInvite_PendingList', Controller.BuyerInvite_PendingList);
    app.post('/Web_API/InviteManagement/BuyerInvite_RejectList', Controller.BuyerInvite_RejectList);
    app.post('/Web_API/InviteManagement/BuyerInvite_AcceptList', Controller.BuyerInvite_AcceptList); 
    app.post('/Web_API/InviteManagement/BuyerBusiness_List', Controller.BuyerBusiness_List); 
    app.post('/Web_API/InviteManagement/BuyerBranchesOfBusiness_List', Controller.BuyerBranchesOfBusiness_List);   
    app.post('/Web_API/InviteManagement/BuyerSendInvite', Controller.BuyerSendInvite);
    app.post('/Web_API/InviteManagement/SellerUpdateToBuyerCreditLimit', Controller.SellerUpdateToBuyerCreditLimit);
    
    // app.post('/Web_API/InviteManagement/SendInvite', Controller.SendInvite);
    
    // app.post('/Web_API/InviteManagement/BranchesOfBusiness_List', Controller.BranchesOfBusiness_List);
    // app.post('/Web_API/InviteManagement/SellerInvite_PendingList', Controller.SellerInvite_PendingList);
    // app.post('/Web_API/InviteManagement/InvitedBuyer_PendingList', Controller.InvitedBuyer_PendingList);
    // app.post('/Web_API/InviteManagement/InvitedSeller_PendingList', Controller.InvitedSeller_PendingList);
    
    
    // app.post('/Web_API/InviteManagement/BuyerInvite_PendingList', Controller.BuyerInvite_PendingList);
    
    
    // app.post('/Web_API/InviteManagement/AllInvitedList', Controller.AllInvitedList);
    // app.post('/Web_API/InviteManagement/Invite_StatusUpdate', Controller.Invite_StatusUpdate);
};