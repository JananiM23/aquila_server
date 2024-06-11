module.exports = function (app) {
  var Controller = require("../../Controllers/App/BusinessAndBranchManagement.controller");
  
  app.post("/APP_API/BusinessAndBranchManagement/CreateBusiness",Controller.CreateBusiness);
  app.post("/APP_API/BusinessAndBranchManagement/BusinessDetailsList",Controller.BusinessDetailsList);
  app.post("/APP_API/BusinessAndBranchManagement/Invite_BusinessDetailsList",Controller.Invite_BusinessDetailsList);
  app.post("/APP_API/BusinessAndBranchManagement/FilteredBusinessDetailsList",Controller.FilteredBusinessDetailsList);
  app.post("/APP_API/BusinessAndBranchManagement/UsersBusinessAndBranches_List",Controller.UsersBusinessAndBranches_List);
  app.post("/APP_API/BusinessAndBranchManagement/UsersBusinessAndUsersList",Controller.UsersBusinessAndUsersList);
  app.post("/APP_API/BusinessAndBranchManagement/BusinessUpdate",Controller.BusinessUpdate);
  app.post("/APP_API/BusinessAndBranchManagement/MyBusinessList",Controller.MyBusinessList);
  app.post("/APP_API/BusinessAndBranchManagement/SellerBusinessDeletebtn",Controller.SellerBusinessDeletebtn);
  app.post('/APP_API/BusinessAndBranchManagement/BusinessOfUsersList', Controller.BusinessOfUsersList);
  app.post('/APP_API/BusinessAndBranchManagement/BusinessAgainstUsersLists', Controller.BusinessAgainstUsersLists);
   // Seller Whole Business Delete
   app.post('/APP_API/BusinessAndBranchManagement/SellerWholeBusinessDelete', Controller.SellerWholeBusinessDelete);
   //Buyer Whole Business Delete
   app.post('/APP_API/BusinessAndBranchManagement/BuyerWholeBusinessDelete', Controller.BuyerWholeBusinessDelete);

   app.post('/APP_API/BusinessAndBranchManagement/IndustrySimpleList', Controller.IndustrySimpleList);
  
};