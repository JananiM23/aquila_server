module.exports = function (app) {
   var Controller = require('../../Controllers/Admin/industryManagement.controller');

   app.post('/Admin_API/IndustryManagement/Create', Controller.Industry_Create);
   app.post('/Admin_API/IndustryManagement/List', Controller.All_Industry_List);
   app.post('/Admin_API/IndustryManagement/Edit', Controller.IndustryDetails_Edit);
   app.post('/Admin_API/IndustryManagement/Update', Controller.IndustryDetails_Update);
   app.post('/Admin_API/IndustryManagement/InActive', Controller.IndustryInActiveStatus);
   app.post('/Admin_API/IndustryManagement/Active', Controller.IndustryActiveStatus);
    
};