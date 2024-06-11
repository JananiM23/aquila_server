module.exports = function (app) {
    var Controller = require('../../Controllers/Web/BusinessAndBranches.controller');
 
    app.post('/WEB_API/BusinessAndBranchManagement/SellerCreateBusinessAndBranch', Controller.SellerCreateBusinessAndBranch);
    app.post('/WEB_API/BusinessAndBranchManagement/BuyerCreateBusinessAndBranch', Controller.BuyerCreateBusinessAndBranch);
    app.post('/WEB_API/BusinessAndBranchManagement/SellerAddBranch', Controller.SellerAddBranch);
    app.post('/WEB_API/BusinessAndBranchManagement/BuyerAddBranch', Controller.BuyerAddBranch);
    app.post('/WEB_API/BusinessAndBranchManagement/IndustrySimpleList', Controller.IndustrySimpleList);
    app.post('/WEB_API/BusinessAndBranchManagement/PrimaryBranchSimpleList', Controller.PrimaryBranchSimpleList);
    app.post('/WEB_API/BusinessAndBranchManagement/BusinessAndBranchUpdate', Controller.BusinessAndBranchUpdate); 
    app.post('/WEB_API/BusinessAndBranchManagement/BranchDetailsUpdate', Controller.BranchDetailsUpdate); 
    app.post('/WEB_API/BusinessAndBranchManagement/BuyerBusinessMonthlyReports', Controller.BuyerBusinessMonthlyReports); 
    app.post('/WEB_API/BusinessAndBranchManagement/SellerBusinessMonthlyReports', Controller.SellerBusinessMonthlyReports); 
    
    app.post('/WEB_API/BusinessAndBranchManagement/SellerBusiness_List', Controller.SellerBusiness_List);     
    app.post('/WEB_API/BusinessAndBranchManagement/BuyerBusiness_List', Controller.BuyerBusiness_List);     
    app.post('/WEB_API/BusinessAndBranchManagement/SellerBranchesOfBusiness_List', Controller.SellerBranchesOfBusiness_List);
    app.post('/WEB_API/BusinessAndBranchManagement/BuyerBranchesOfBusiness_List', Controller.BuyerBranchesOfBusiness_List);
 };