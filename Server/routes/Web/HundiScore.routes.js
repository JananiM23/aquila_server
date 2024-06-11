module.exports = function (app) {
    var Controller = require('../../Controllers/Web/HundiScore.controller');     
    app.post('/Web_API/HundiScoreManagement/SellerOwnerDashboard', Controller.SellerOwnerDashboard);
    app.post('/Web_API/HundiScoreManagement/SellerUserDashboard', Controller.SellerUserDashboard);
    app.post('/Web_API/HundiScoreManagement/BuyerOwnerDashboard', Controller.BuyerOwnerDashboard);
    app.post('/Web_API/HundiScoreManagement/BuyerUserDashboard', Controller.BuyerUserDashboard);
    app.post('/Web_API/HundiScoreManagement/FilterSellerAndBusinessAndBranchAgainstBuyerScore', Controller.FilterSellerAndBusinessAndBranchAgainstBuyerScore); 
    app.post('/Web_API/HundiScoreManagement/FilterBuyerAndBusinessAndBranchAgainstSellerScore', Controller.FilterBuyerAndBusinessAndBranchAgainstSellerScore);
    app.post('/Web_API/HundiScoreManagement/SellerAndBusinessAndBranchAgainstBuyerScore', Controller.SellerAndBusinessAndBranchAgainstBuyerScore);
    app.post('/Web_API/HundiScoreManagement/BuyerAndBusinessAndBranchAgainstSellerScore', Controller.BuyerAndBusinessAndBranchAgainstSellerScore);            
    app.post('/Web_API/HundiScoreManagement/HundiScoreIndividualSellerDetails', Controller.HundiScoreIndividualSellerDetails);            
    app.post('/Web_API/HundiScoreManagement/HundiScoreIndividualBuyerDetails', Controller.HundiScoreIndividualBuyerDetails);            
    app.post('/Web_API/HundiScoreManagement/HundiScoreIndividualSellerBranchDetails', Controller.HundiScoreIndividualSellerBranchDetails);            
    app.post('/Web_API/HundiScoreManagement/HundiScoreIndividualBuyerBranchDetails', Controller.HundiScoreIndividualBuyerBranchDetails);            
 };