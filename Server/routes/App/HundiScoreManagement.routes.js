module.exports = function (app) {
    var Controller = require('../../Controllers/App/HundiScoreManagement.controller');
    
    app.post('/APP_API/HundiScoreManagement/CustomerDashBoard', Controller.CustomerDashBoard);
    app.post('/APP_API/HundiScoreManagement/SellerAndBusinessAndBranchAgainstBuyerScore', Controller.SellerAndBusinessAndBranchAgainstBuyerScore);
    app.post('/APP_API/HundiScoreManagement/BuyerAndBusinessAndBranchAgainstSellerScore', Controller.BuyerAndBusinessAndBranchAgainstSellerScore);
    app.post('/APP_API/HundiScoreManagement/FilterSellerAndBusinessAndBranchAgainstBuyerScore', Controller.FilterSellerAndBusinessAndBranchAgainstBuyerScore);
    app.post('/APP_API/HundiScoreManagement/FilterBuyerAndBusinessAndBranchAgainstSellerScore', Controller.FilterBuyerAndBusinessAndBranchAgainstSellerScore);    
    app.post('/APP_API/HundiScoreManagement/HundiScoreIndividualBuyerDetails', Controller.HundiScoreIndividualBuyerDetails);
    app.post('/APP_API/HundiScoreManagement/TopFiveHundiScore', Controller.TopFiveHundiScore);
    app.post('/APP_API/HundiScoreManagement/HundiScoreIndividualSellerDetails', Controller.HundiScoreIndividualSellerDetails);
    app.post('/APP_API/HundiScoreManagement/HundiScoreIndividualBuyerBranchDetails', Controller.HundiScoreIndividualBuyerBranchDetails);
    app.post('/APP_API/HundiScoreManagement/HundiScoreIndividualSellerBranchDetails', Controller.HundiScoreIndividualSellerBranchDetails);
    app.post('/APP_API/HundiScoreManagement/ConnectedCustomerWithAdvancedFilter', Controller.ConnectedCustomerWithAdvancedFilter);

 };