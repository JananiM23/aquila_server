var mongoose = require('mongoose');
var CustomersManagement = require('../../Models/CustomerManagement.model');
var BusinessAndBranchManagement = require('./../../Models/BusinessAndBranchManagement.model');
var InvoiceManagement = require('../../Models/InvoiceManagement.model');
var PaymentManagement = require('../../Models/PaymentManagement.model');
var InviteManagement = require('../../Models/Invite_Management.model');
var IndustryManagement = require('../../Models/industryManagement.model');
var TemporaryManagement = require('../../Models/TemporaryCredit.model');
var ErrorHandling = require('../../Handling/ErrorHandling').ErrorHandling;
var moment = require('moment');


// Create Business And Branch for Initial Config
exports.SellerCreateBusinessAndBranch = function (req, res) {
    var ReceivingData = req.body;
 
    if (!ReceivingData.Customer || ReceivingData.Customer === '') {
       res.status(400).send({ Status: false, Message: "Customer can not be empty" });
    } else if (!ReceivingData.BusinessName || ReceivingData.BusinessName === '') {
       res.status(400).send({ Status: false, Message: "Business Name can not be empty" });
    } else if (!ReceivingData.Industry || ReceivingData.Industry === '') {
       res.status(400).send({ Status: false, Message: "Industry can not be empty" });
    } else if (!ReceivingData.BusinessCreditLimit || ReceivingData.BusinessCreditLimit === '') {
       res.status(400).send({ Status: false, Message: "Business Credit Limit can not be empty" });
    // } else if (!ReceivingData.BranchName || ReceivingData.BranchName === '') {
    //    res.status(400).send({ Status: false, Message: "Branch Name can not be empty" });
    } else if (!ReceivingData.Mobile || ReceivingData.Mobile === '') {
       res.status(400).send({ Status: false, Message: "Mobile can not be empty" });
    // } else if (!ReceivingData.BranchCreditLimit || ReceivingData.BranchCreditLimit === '') {
    //    res.status(400).send({ Status: false, Message: "Branch Credit Limit can not be empty" });
    } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
       res.status(400).send({ Status: false, Message: "CustomerCategory Limit can not be empty" });
    } else {
       ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
       Promise.all([
          CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer, CustomerType: 'Owner', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
       ]).then(ResponseRes => {
          if (ResponseRes[0] !== null) {
             const Business = mongoose.Types.ObjectId();
             const Branch = mongoose.Types.ObjectId();
             ReceivingData.Industry = mongoose.Types.ObjectId(ReceivingData.Industry);         
             const Create_Business = new BusinessAndBranchManagement.BusinessSchema({
                _id: Business,
                Customer: ReceivingData.Customer,
                FirstName: ReceivingData.FirstName,
                LastName: ReceivingData.LastName,
                Industry: ReceivingData.Industry,
                BusinessCreditLimit: ReceivingData.BusinessCreditLimit,
                AvailableCreditLimit: ReceivingData.BusinessCreditLimit || 0,
                UserAssigned: false,
                IfBuyer: false,
                IfSeller: true,
                PrimaryBranch: Branch,
                ActiveStatus: true,
                IfDeleted: false
             });
            //  const Create_Branch = new BusinessAndBranchManagement.BranchSchema({
            //     _id: Branch,
            //     Customer: ReceivingData.Customer,
            //     Business: Business,
            //     BranchName: ReceivingData.BranchName,
            //     Mobile: ReceivingData.Mobile,
            //     Address: ReceivingData.Address,
            //     RegistrationId: ReceivingData.RegistrationId,
            //     GSTIN: ReceivingData.GSTIN,
            //     BranchCreditLimit: ReceivingData.BranchCreditLimit,
            //     AvailableCreditLimit: ReceivingData.BranchCreditLimit || 0,
            //     UserAssigned: false,
            //     ActiveStatus: true,
            //     IfDeleted: false
            //  });
             Promise.all([
                Create_Business.save(),
                // Create_Branch.save(),
             ]).then(response => {
                res.status(200).send({ Status: true, Response: response, Message: 'Business Successfully Created' });
             }).catch(error => {
                BusinessAndBranchManagement.BusinessSchema.deleteOne({ _id: Business }).exec();
                // BusinessAndBranchManagement.BranchSchema.deleteOne({ _id: Branch }).exec();
                ErrorHandling.ErrorLogCreation(req, 'Business And Branch Create Error', 'BusinessAndBranchManagement.Controller -> CreateBusinessAndBranch', JSON.stringify(error));
                res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to create the Business And Branch!.", Error: error });
             });
          } else {
             res.status(200).send({ Status: false, Message: "Only Owner to Create Business" });
          }
       }).catch(Error => {
          res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to create the Business!.", Error: Error });
       });
    }
};

exports.BuyerCreateBusinessAndBranch = function (req, res) {
    var ReceivingData = req.body;
 
    if (!ReceivingData.Customer || ReceivingData.Customer === '') {
       res.status(400).send({ Status: false, Message: "Customer can not be empty" });
    } else if (!ReceivingData.BusinessName || ReceivingData.BusinessName === '') {
       res.status(400).send({ Status: false, Message: "Business Name can not be empty" });
    } else if (!ReceivingData.Industry || ReceivingData.Industry === '') {
       res.status(400).send({ Status: false, Message: "Industry can not be empty" });
    // } else if (!ReceivingData.BranchName || ReceivingData.BranchName === '') {
    //    res.status(400).send({ Status: false, Message: "Branch Name can not be empty" });
    } else if (!ReceivingData.Mobile || ReceivingData.Mobile === '') {
       res.status(400).send({ Status: false, Message: "Mobile can not be empty" });
    } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
       res.status(400).send({ Status: false, Message: "CustomerCategory Limit can not be empty" });
    } else {
       ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
       Promise.all([
          CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer, CustomerType: 'Owner', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
       ]).then(ResponseRes => {
          if (ResponseRes[0] !== null) {
             const Business = mongoose.Types.ObjectId();
             const Branch = mongoose.Types.ObjectId();
             ReceivingData.Industry = mongoose.Types.ObjectId(ReceivingData.Industry);          
             const Create_Business = new BusinessAndBranchManagement.BusinessSchema({
                _id: Business,
                Customer: ReceivingData.Customer,
                FirstName: ReceivingData.FirstName,
                LastName: ReceivingData.LastName,
                Industry: ReceivingData.Industry,
                BusinessCreditLimit: 0,
                AvailableCreditLimit: 0,
                UserAssigned: false,
                IfBuyer: true,
                IfSeller: false,
                // PrimaryBranch: Branch,
                ActiveStatus: true,
                IfDeleted: false
             });
            //  const Create_Branch = new BusinessAndBranchManagement.BranchSchema({
            //     _id: Branch,
            //     Customer: ReceivingData.Customer,
            //     Business: Business,
            //     BranchName: ReceivingData.BranchName,
            //     Mobile: ReceivingData.Mobile,
            //     Address: ReceivingData.Address,
            //     RegistrationId: ReceivingData.RegistrationId,
            //     GSTIN: ReceivingData.GSTIN,
            //     BranchCreditLimit: 0,
            //     AvailableCreditLimit: 0,
            //     UserAssigned: false,
            //     ActiveStatus: true,
            //     IfDeleted: false
            //  });
             Promise.all([
                Create_Business.save(),
                // Create_Branch.save(),
             ]).then(response => {
                res.status(200).send({ Status: true, Response: response, Message: 'Business And Branch Successfully Created' });
             }).catch(error => {
                BusinessAndBranchManagement.BusinessSchema.deleteOne({ _id: Business }).exec();
                // BusinessAndBranchManagement.BranchSchema.deleteOne({ _id: Branch }).exec();
                ErrorHandling.ErrorLogCreation(req, 'Business And Branch Create Error', 'BusinessAndBranchManagement.Controller -> CreateBusinessAndBranch', JSON.stringify(error));
                res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to create the Business!.", Error: error });
             });
          } else {
             res.status(200).send({ Status: false, Message: "Only Owner to Create Business" });
          }
       }).catch(Error => {
          res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to create the Business!.", Error: Error });
       });
    }
 };

// Add Branch
exports.SellerAddBranch = function (req, res) {
    var ReceivingData = req.body;
 
    if (!ReceivingData.Customer || ReceivingData.Customer === '') {
       res.status(400).send({ Status: false, Message: "Customer can not be empty" });
    } else if (!ReceivingData.Business || ReceivingData.Business === '') {
       res.status(400).send({ Status: false, Message: "Business can not be empty" });
    } else if (!ReceivingData.BranchName || ReceivingData.BranchName === '') {
       res.status(400).send({ Status: false, Message: "Branch Name can not be empty" });
    } else if (!ReceivingData.Mobile || ReceivingData.Mobile === '') {
       res.status(400).send({ Status: false, Message: "Mobile can not be empty" });
    } else if (!ReceivingData.BranchCreditLimit || ReceivingData.BranchCreditLimit === '') {
       res.status(400).send({ Status: false, Message: "Branch Credit Limit can not be empty" });
    } else {
       ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
       ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
       Promise.all([
          CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer, CustomerType: 'Owner', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
       ]).then(ResponseRes => {
          if (ResponseRes[0] !== null) {
             const Create_Branch = new BusinessAndBranchManagement.BranchSchema({
                Customer: ReceivingData.Customer,
                Business: ReceivingData.Business,
                BranchName: ReceivingData.BranchName,
                Mobile: ReceivingData.Mobile,
                Address: ReceivingData.Address,
                RegistrationId: ReceivingData.RegistrationId,
                GSTIN: ReceivingData.GSTIN,
                BranchCreditLimit: ReceivingData.BranchCreditLimit,
                AvailableCreditLimit: ReceivingData.BranchCreditLimit || 0,
                UserAssigned: false,
                ActiveStatus: true,
                IfDeleted: false
             });
             Create_Branch.save((err, result) => {
                if (err) {
                   ErrorHandling.ErrorLogCreation(req, 'Branch Create Error', 'BusinessAndBranchManagement.Controller -> AddBranch', JSON.stringify(err));
                   res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to create the Branch!.", Error: err });
                } else {
                   res.status(200).send({ Status: true, Response: result, Message: 'Branch Added Successfully' });
                }
             });
          } else {
             res.status(200).send({ Status: false, Message: "Only Owner to Create Business" });
          }
       }).catch(Error => {
          res.status(417).send({ Status: false, Message: 'Some Occurred Error' });
       });
    }
};

// Add Branch
exports.BuyerAddBranch = function (req, res) {
    var ReceivingData = req.body;
 
    if (!ReceivingData.Customer || ReceivingData.Customer === '') {
       res.status(400).send({ Status: false, Message: "Customer can not be empty" });
    } else if (!ReceivingData.Business || ReceivingData.Business === '') {
       res.status(400).send({ Status: false, Message: "Business can not be empty" });
    } else if (!ReceivingData.BranchName || ReceivingData.BranchName === '') {
       res.status(400).send({ Status: false, Message: "Branch Name can not be empty" });
    } else if (!ReceivingData.Mobile || ReceivingData.Mobile === '') {
       res.status(400).send({ Status: false, Message: "Mobile can not be empty" });
    } else {
       ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
       ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
       Promise.all([
          CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer, CustomerType: 'Owner', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
       ]).then(ResponseRes => {
          if (ResponseRes[0] !== null) {
             const Create_Branch = new BusinessAndBranchManagement.BranchSchema({
                Customer: ReceivingData.Customer,
                Business: ReceivingData.Business,
                BranchName: ReceivingData.BranchName,
                Mobile: ReceivingData.Mobile,
                Address: ReceivingData.Address,
                RegistrationId: ReceivingData.RegistrationId,
                GSTIN: ReceivingData.GSTIN,
                BranchCreditLimit: 0,
                AvailableCreditLimit: 0,
                UserAssigned: false,
                ActiveStatus: true,
                IfDeleted: false
             });
             Create_Branch.save((err, result) => {
                if (err) {
                   ErrorHandling.ErrorLogCreation(req, 'Branch Create Error', 'BusinessAndBranchManagement.Controller -> AddBranch', JSON.stringify(err));
                   res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to create the Branch!.", Error: err });
                } else {
                   res.status(200).send({ Status: true, Response: result, Message: 'Branch Added Successfully' });
                }
             });
          } else {
             res.status(200).send({ Status: false, Message: "Only Owner to Create Business" });
          }
       }).catch(Error => {
          res.status(417).send({ Status: false, Message: 'Some Occurred Error' });
       });
    }
 };

// SellerBusiness_List
exports.SellerBusiness_List = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.Customer || ReceivingData.Customer === '') {
        res.status(400).send({ Status: false, Message: "Customer can not be empty" });
    } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customern Category can not be empty" });
  } else
     {
        ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
        Promise.all([
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer,$or: [{ CustomerCategory: ReceivingData.CustomerCategory }, { CustomerCategory: 'BothBuyerAndSeller' }] }, {}, {}).exec(),
        ]).then(Response => {
            var CustomerDetails = Response[0];
            var BusinessArr = [];
            if (CustomerDetails !== null) {
                if (CustomerDetails.CustomerType === 'Owner') {
                    const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
                    const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
                    var ShortOrder = { createdAt: -1 };
                    var ShortKey = ReceivingData.ShortKey;
                    var ShortCondition = ReceivingData.ShortCondition;
                    if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                        ShortOrder = {};
                        ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
                    }

                    // var FindQuery = { 'IfDeleted': false, Customer: ReceivingData.Customer, IfSeller: true, IfBuyer: false };

                    if (ReceivingData.CustomerCategory === 'Seller') {
                      var FindQuery = { 'IfDeleted': false, Customer: ReceivingData.Customer, IfSeller: true, IfBuyer: false };
                   } else if (ReceivingData.CustomerCategory === 'Buyer') {
                    var FindQuery = { 'IfDeleted': false, Customer: ReceivingData.Customer, IfSeller: false, IfBuyer: true };
                   }

                    if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object' && ReceivingData.FilterQuery !== null && ReceivingData.FilterQuery.length > 0) {
                      
                        ReceivingData.FilterQuery.map(obj => {
                            if (obj.Type === 'String') {
                                FindQuery[obj.DBName] = { $regex: new RegExp(".*" + obj.Value + ".*", "i") };
                            }
                            if (obj.Type === 'Select') {
                                FindQuery[obj.DBName] = obj.Value;
                            }
                            if (obj.Type === 'Date') {
                                if (FindQuery[obj.DBName] === undefined) {
                                    FindQuery[obj.DBName] = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                                } else {
                                    const DBName = obj.DBName;
                                    const AndQuery = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                                    FindQuery['$and'] = [{ [DBName]: FindQuery[obj.DBName] }, { [DBName]: AndQuery }];
                                }
                            }
                            if (obj.Type === 'Object') {
                                FindQuery[obj.DBName] = mongoose.Types.ObjectId(obj.Value._id);
                            }
                        });
                    }
                    Promise.all([
                        BusinessAndBranchManagement.BusinessSchema
                            .aggregate([
                                { $match: FindQuery },
                                {
                                    $lookup: {
                                        from: "IndustryManagement",
                                        let: { "industry": "$Industry" },
                                        pipeline: [
                                            { $match: { $expr: { $eq: ["$$industry", "$_id"] } } },
                                            { $project: { "Industry_Name": 1 } }
                                        ],
                                        as: 'Industries'
                                    }
                                },
                                { $unwind: { path: "$Industries", preserveNullAndEmptyArrays: true } },
                         
                                { $addFields: { BusinessNameSort: { $toLower: "$FirstName" } } },


                                {
                                    $project: {
                                        Industries: 1,
                                        FirstName: 1,
                                        LastName: 1,
                                        BusinessCreditLimit: 1,
                                        AvailableCreditLimit: 1,
                                        PDFFiles: 1,
                                        UserAssigned: 1,
                                        Customer: 1,
                                        ActiveStatus: 1,
                                        IfDeleted: 1,
                                        createdAt: 1,
                                        updatedAt: 1
                                    }
                                },
                                { $sort: ShortOrder },
                                { $skip: Skip_Count },
                                { $limit: Limit_Count }
                            ]).exec(),
                        BusinessAndBranchManagement.BusinessSchema.countDocuments(FindQuery).exec()
                       ]).then(result => {
                        var BusinessDetails = JSON.parse(JSON.stringify(result[0]));
                        var BusinessCount = JSON.parse(JSON.stringify(result[1]));
                        if (BusinessDetails.length > 0) {
                            BusinessDetails.map(Obj => {
                                Obj.ExtraUnitizedCreditLimit = 0;
                                Obj.CreditBalanceExists = false;
                                if (Obj.AvailableCreditLimit > 0) {
                                    Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                } else {
                                    Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                    Obj.ExtraUnitizedCreditLimit = Obj.ExtraUnitizedCreditLimit.toFixed(2);
                                    Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.ExtraUnitizedCreditLimit);
                                    Obj.CreditBalanceExists = true;
                                    Obj.AvailableCreditLimit = 0;
                                }
                                Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                                Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                return Obj;
                            });
                        }
                        res.status(200).send({ Status: true, Response: BusinessDetails, SubResponse: BusinessCount });
                    }).catch(Error => {
                        ErrorHandling.ErrorLogCreation(req, 'Customer Find error', 'CustomerManagement -> All Customer List', JSON.stringify(Error));
                        res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
                    });
                } else if (CustomerDetails.CustomerType === 'User') {
                    if (CustomerDetails.BusinessAndBranches.length !== 0) {
                        CustomerDetails.BusinessAndBranches.map(Obj => {
                            BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                        });
                    }
                    ReceivingData.Customer = mongoose.Types.ObjectId(CustomerDetails.Owner);
                    const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
                    const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
                    var ShortOrder = { createdAt: -1 };
                    var ShortKey = ReceivingData.ShortKey;
                    var ShortCondition = ReceivingData.ShortCondition;
                    if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                        ShortOrder = {};
                        ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
                    }

                    // var FindQuery = { 'IfDeleted': false, _id: { $in: BusinessArr }, IfSeller: true, IfBuyer: false };
                    if (ReceivingData.CustomerCategory === 'Seller') {
                      var FindQuery = { 'IfDeleted': false, _id: { $in: BusinessArr }, IfSeller: true, IfBuyer: false };
                   } else if (ReceivingData.CustomerCategory === 'Buyer') {
                    var FindQuery = { 'IfDeleted': false, _id: { $in: BusinessArr }, IfSeller: false, IfBuyer: true };
                   }

                    if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object' && ReceivingData.FilterQuery !== null && ReceivingData.FilterQuery.length > 0) {
                        ReceivingData.FilterQuery.map(obj => {
                            if (obj.Type === 'String') {
                                FindQuery[obj.DBName] = { $regex: new RegExp(".*" + obj.Value + ".*", "i") };
                            }
                            if (obj.Type === 'Select') {
                                FindQuery[obj.DBName] = obj.Value;
                            }
                            if (obj.Type === 'Date') {
                                if (FindQuery[obj.DBName] === undefined) {
                                    FindQuery[obj.DBName] = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                                } else {
                                    const DBName = obj.DBName;
                                    const AndQuery = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                                    FindQuery['$and'] = [{ [DBName]: FindQuery[obj.DBName] }, { [DBName]: AndQuery }];
                                }
                            }
                            if (obj.Type === 'Object') {
                                FindQuery[obj.DBName] = mongoose.Types.ObjectId(obj.Value._id);
                            }
                        });
                    }
                    Promise.all([
                        BusinessAndBranchManagement.BusinessSchema
                            .aggregate([
                                { $match: FindQuery },
                                {
                                    $lookup: {
                                        from: "IndustryManagement",
                                        let: { "industry": "$Industry" },
                                        pipeline: [
                                            { $match: { $expr: { $eq: ["$$industry", "$_id"] } } },
                                            { $project: { "Industry_Name": 1 } }
                                        ],
                                        as: 'Industries'
                                    }
                                },
                                { $unwind: { path: "$Industries", preserveNullAndEmptyArrays: true } },
                                { $addFields: { BusinessNameSort: { $toLower: "$FirstName" } } },
                                {
                                    $project: {
                                        Industries: 1,
                                        FirstName: 1,
                                        LastName: 1,
                                        BusinessCreditLimit: 1,
                                        AvailableCreditLimit: 1,
                                        UserAssigned: 1,
                                        Customer: 1,
                                        ActiveStatus: 1,
                                        IfDeleted: 1,
                                        createdAt: 1,
                                        updatedAt: 1
                                    }
                                },
                                { $sort: ShortOrder },
                                { $skip: Skip_Count },
                                { $limit: Limit_Count }
                            ]).exec(),
                        BusinessAndBranchManagement.BusinessSchema.countDocuments(FindQuery).exec(),
                       ]).then(result => {
                        var BusinessDetails = JSON.parse(JSON.stringify(result[0]));
                        var BusinessCount = JSON.parse(JSON.stringify(result[1]));
                        if (BusinessDetails.length > 0) {
                            BusinessDetails.map(Obj => {
                                Obj.ExtraUnitizedCreditLimit = 0;
                                Obj.CreditBalanceExists = false;
                                var BranchCreditLimit = 0;
                                 if (Obj.AvailableCreditLimit > 0) {
                                    Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                } else {
                                    Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                    Obj.ExtraUnitizedCreditLimit = Obj.ExtraUnitizedCreditLimit.toFixed(2);
                                    Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.ExtraUnitizedCreditLimit);
                                    Obj.CreditBalanceExists = true;
                                    Obj.AvailableCreditLimit = 0;
                                }
                                Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                                Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                return Obj;
                            });
                        }
                        res.status(200).send({ Status: true, Response: BusinessDetails, SubResponse: BusinessCount });
                    }).catch(Error => {
                        ErrorHandling.ErrorLogCreation(req, 'Customer Find error', 'CustomerManagement -> All Customer List', JSON.stringify(Error));
                        res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
                    });
                }
            } else {
                res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
            }
        }).catch(Error => {
            res.status(400).send({ Status: false, Message: "Some Occurred Error" });
        });
    }
};

// BuyerBusiness_List
exports.BuyerBusiness_List = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.Customer || ReceivingData.Customer === '') {
        res.status(400).send({ Status: false, Message: "Customer can not be empty" });
    } else {
        ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
        Promise.all([
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer }, {}, {}).exec(),
        ]).then(Response => {
            var CustomerDetails = Response[0];
            var BusinessArr = [];
            if (CustomerDetails !== null) {
                if (CustomerDetails.CustomerType === 'Owner') {
                    const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
                    const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
                    var ShortOrder = { createdAt: -1 };
                    var ShortKey = ReceivingData.ShortKey;
                    var ShortCondition = ReceivingData.ShortCondition;
                    if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                        ShortOrder = {};
                        ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
                    }

                    var FindQuery = FindQuery = { 'IfDeleted': false, Customer: ReceivingData.Customer, IfSeller: false, IfBuyer: true };

                    if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object' && ReceivingData.FilterQuery !== null && ReceivingData.FilterQuery.length > 0) {
                        ReceivingData.FilterQuery.map(obj => {
                            if (obj.Type === 'String') {
                                FindQuery[obj.DBName] = { $regex: new RegExp(".*" + obj.Value + ".*", "i") };
                            }
                            if (obj.Type === 'Select') {
                                FindQuery[obj.DBName] = obj.Value;
                            }
                            if (obj.Type === 'Date') {
                                if (FindQuery[obj.DBName] === undefined) {
                                    FindQuery[obj.DBName] = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                                } else {
                                    const DBName = obj.DBName;
                                    const AndQuery = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                                    FindQuery['$and'] = [{ [DBName]: FindQuery[obj.DBName] }, { [DBName]: AndQuery }];
                                }
                            }
                            if (obj.Type === 'Object') {
                                FindQuery[obj.DBName] = mongoose.Types.ObjectId(obj.Value._id);
                            }
                        });
                    }
                    Promise.all([
                        BusinessAndBranchManagement.BusinessSchema
                            .aggregate([
                                { $match: FindQuery },
                                {
                                    $lookup: {
                                        from: "IndustryManagement",
                                        let: { "industry": "$Industry" },
                                        pipeline: [
                                            { $match: { $expr: { $eq: ["$$industry", "$_id"] } } },
                                            { $project: { "Industry_Name": 1 } }
                                        ],
                                        as: 'Industries'
                                    }
                                },
                                { $unwind: { path: "$Industries", preserveNullAndEmptyArrays: true } },
                                {
                                    $lookup: {
                                        from: "Branch",
                                        let: { "primaryBranch": "$PrimaryBranch" },
                                        pipeline: [
                                            { $match: { $expr: { $eq: ["$$primaryBranch", "$_id"] } } },
                                            { $project: { "BranchName": 1 } }
                                        ],
                                        as: 'PrimaryBranches'
                                    }
                                },
                                { $unwind: { path: "$PrimaryBranches", preserveNullAndEmptyArrays: true } },
                                { $addFields: { BusinessNameSort: { $toLower: "$BusinessName" } } },


                                {
                                    $project: {
                                        Industries: 1,
                                        BusinessName: 1,
                                        BusinessCreditLimit: 1,
                                        AvailableCreditLimit: 1,
                                        PDFFiles: 1,
                                        UserAssigned: 1,
                                        Customer: 1,
                                        PrimaryBranches: 1,
                                        ActiveStatus: 1,
                                        IfDeleted: 1,
                                        createdAt: 1,
                                        updatedAt: 1
                                    }
                                },
                                { $sort: ShortOrder },
                                { $skip: Skip_Count },
                                { $limit: Limit_Count }
                            ]).exec(),
                        BusinessAndBranchManagement.BusinessSchema.countDocuments(FindQuery).exec(),
                        InviteManagement.InviteManagementSchema.find({ Buyer: ReceivingData.Customer, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                        TemporaryManagement.CreditSchema.find({ Buyer: ReceivingData.Customer, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                        InvoiceManagement.InvoiceSchema.find({ Buyer: ReceivingData.Customer, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                    ]).then(result => {
                        var BusinessDetails = JSON.parse(JSON.stringify(result[0]));
                        var BusinessCount = JSON.parse(JSON.stringify(result[1]));
                        var InviteDetails = JSON.parse(JSON.stringify(result[2]));
                        var TemporaryDetails = JSON.parse(JSON.stringify(result[3]));
                        var InvoiceDetails = JSON.parse(JSON.stringify(result[4]));
                        if (BusinessDetails.length > 0) {
                            BusinessDetails.map(Obj => {
                                Obj.ExtraUnitizedCreditLimit = 0;
                                Obj.CreditBalanceExists = false;
                                const result1Arr = TemporaryDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                                if (result1Arr.length > 0) {
                                    var ValidityDate = new Date();
                                    var TodayDate = new Date();
                                    result1Arr.map(obj => {
                                        ValidityDate = new Date(obj.updatedAt);
                                        ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + obj.ApprovedPeriod));
                                        if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                                            Obj.BusinessCreditLimit = parseFloat(Obj.BusinessCreditLimit) + parseFloat(obj.ApproveLimit);
                                            Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.ApproveLimit);
                                        }
                                    });
                                }

                                const result2Arr = InviteDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                                if (result2Arr.length > 0) {
                                    result2Arr.map(obj => {
                                        Obj.BusinessCreditLimit = parseFloat(Obj.BusinessCreditLimit) + parseFloat(obj.AvailableLimit);
                                        Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.AvailableLimit);
                                    });
                                }

                                const result3Arr = InvoiceDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);

                                if (result3Arr.length > 0) {
                                    var InvoiceAmount = 0;
                                    var InvoiceAmount = 0;
                                    result3Arr.map(obj => {
                                        InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.AvailableAmount);
                                    });
                                    if (InvoiceAmount > 0) {
                                        Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) - parseFloat(InvoiceAmount);
                                        if (Obj.AvailableCreditLimit > 0) {
                                            Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                        } else {
                                            Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                            Obj.CreditBalanceExists = true;
                                            Obj.AvailableCreditLimit = 0;
                                        }
                                    }
                                    Obj.ExtraUnitizedCreditLimit = Obj.ExtraUnitizedCreditLimit.toFixed(2);
                                    Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.ExtraUnitizedCreditLimit);
                                    Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                                    Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                }
                                return Obj;
                            });
                        }
                        res.status(200).send({ Status: true, Response: BusinessDetails, SubResponse: BusinessCount });
                    }).catch(Error => {
                        ErrorHandling.ErrorLogCreation(req, 'Customer Find error', 'CustomerManagement -> All Customer List', JSON.stringify(Error));
                        res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
                    });
                } else if (CustomerDetails.CustomerType === 'User') {
                    if (CustomerDetails.BusinessAndBranches.length !== 0) {
                        CustomerDetails.BusinessAndBranches.map(Obj => {
                            BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                        });
                    }
                    const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
                    const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
                    var ShortOrder = { createdAt: -1 };
                    var ShortKey = ReceivingData.ShortKey;
                    var ShortCondition = ReceivingData.ShortCondition;
                    if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                        ShortOrder = {};
                        ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
                    }

                    var FindQuery = FindQuery = { 'IfDeleted': false, _id: { $in: BusinessArr }, IfSeller: false, IfBuyer: true };

                    if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object' && ReceivingData.FilterQuery !== null && ReceivingData.FilterQuery.length > 0) {
                        ReceivingData.FilterQuery.map(obj => {
                            if (obj.Type === 'String') {
                                FindQuery[obj.DBName] = { $regex: new RegExp(".*" + obj.Value + ".*", "i") };
                            }
                            if (obj.Type === 'Select') {
                                FindQuery[obj.DBName] = obj.Value;
                            }
                            if (obj.Type === 'Date') {
                                if (FindQuery[obj.DBName] === undefined) {
                                    FindQuery[obj.DBName] = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                                } else {
                                    const DBName = obj.DBName;
                                    const AndQuery = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                                    FindQuery['$and'] = [{ [DBName]: FindQuery[obj.DBName] }, { [DBName]: AndQuery }];
                                }
                            }
                            if (obj.Type === 'Object') {
                                FindQuery[obj.DBName] = mongoose.Types.ObjectId(obj.Value._id);
                            }
                        });
                    }
                    Promise.all([
                        BusinessAndBranchManagement.BusinessSchema
                            .aggregate([
                                { $match: FindQuery },
                                {
                                    $lookup: {
                                        from: "IndustryManagement",
                                        let: { "industry": "$Industry" },
                                        pipeline: [
                                            { $match: { $expr: { $eq: ["$$industry", "$_id"] } } },
                                            { $project: { "Industry_Name": 1 } }
                                        ],
                                        as: 'Industries'
                                    }
                                },
                                { $unwind: { path: "$Industries", preserveNullAndEmptyArrays: true } },
                                {
                                    $lookup: {
                                        from: "Branch",
                                        let: { "primaryBranch": "$PrimaryBranch" },
                                        pipeline: [
                                            { $match: { $expr: { $eq: ["$$primaryBranch", "$_id"] } } },
                                            { $project: { "BranchName": 1 } }
                                        ],
                                        as: 'PrimaryBranches'
                                    }
                                },
                                { $unwind: { path: "$PrimaryBranches", preserveNullAndEmptyArrays: true } },
                                { $addFields: { BusinessNameSort: { $toLower: "$BusinessName" } } },


                                {
                                    $project: {
                                        Industries: 1,
                                        BusinessName: 1,
                                        BusinessCreditLimit: 1,
                                        AvailableCreditLimit: 1,
                                        UserAssigned: 1,
                                        Customer: 1,
                                        PrimaryBranches: 1,
                                        ActiveStatus: 1,
                                        IfDeleted: 1,
                                        createdAt: 1,
                                        updatedAt: 1
                                    }
                                },
                                { $sort: ShortOrder },
                                { $skip: Skip_Count },
                                { $limit: Limit_Count }
                            ]).exec(),
                        BusinessAndBranchManagement.BusinessSchema.countDocuments(FindQuery).exec(),
                        InviteManagement.InviteManagementSchema.find({ BuyerBusiness: { $in: BusinessArr }, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                        TemporaryManagement.CreditSchema.find({ BuyerBusiness: { $in: BusinessArr }, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                        InvoiceManagement.InvoiceSchema.find({ BuyerBusiness: { $in: BusinessArr }, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                    ]).then(result => {
                        var BusinessDetails = JSON.parse(JSON.stringify(result[0]));
                        var BusinessCount = JSON.parse(JSON.stringify(result[1]));
                        var InviteDetails = JSON.parse(JSON.stringify(result[2]));
                        var TemporaryDetails = JSON.parse(JSON.stringify(result[3]));
                        var InvoiceDetails = JSON.parse(JSON.stringify(result[4]));
                        if (BusinessDetails.length > 0) {
                            BusinessDetails.map(Obj => {
                                Obj.ExtraUnitizedCreditLimit = 0;
                                Obj.CreditBalanceExists = false;
                                const result1Arr = TemporaryDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                                if (result1Arr.length > 0) {
                                    var ValidityDate = new Date();
                                    var TodayDate = new Date();
                                    result1Arr.map(obj => {
                                        ValidityDate = new Date(obj.updatedAt);
                                        ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + obj.ApprovedPeriod));
                                        if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                                            Obj.BusinessCreditLimit = parseFloat(Obj.BusinessCreditLimit) + parseFloat(obj.ApproveLimit);
                                            Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.ApproveLimit);
                                        }
                                    });
                                }

                                const result2Arr = InviteDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                                if (result2Arr.length > 0) {
                                    result2Arr.map(obj => {
                                        Obj.BusinessCreditLimit = parseFloat(Obj.BusinessCreditLimit) + parseFloat(obj.AvailableLimit);
                                        Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.AvailableLimit);
                                    });
                                }

                                const result3Arr = InvoiceDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);

                                if (result3Arr.length > 0) {
                                    var InvoiceAmount = 0;
                                    var InvoiceAmount = 0;
                                    result3Arr.map(obj => {
                                        InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.AvailableAmount);
                                    });
                                    if (InvoiceAmount > 0) {
                                        Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) - parseFloat(InvoiceAmount);
                                        if (Obj.AvailableCreditLimit > 0) {
                                            Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                        } else {
                                            Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                            Obj.CreditBalanceExists = true;
                                            Obj.AvailableCreditLimit = 0;
                                        }
                                    }
                                    Obj.ExtraUnitizedCreditLimit = Obj.ExtraUnitizedCreditLimit.toFixed(2);
                                    Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.ExtraUnitizedCreditLimit);
                                    Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                                    Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                }
                                return Obj;
                            });
                        }
                        res.status(200).send({ Status: true, Response: BusinessDetails, SubResponse: BusinessCount });
                    }).catch(Error => {
                        ErrorHandling.ErrorLogCreation(req, 'Customer Find error', 'CustomerManagement -> All Customer List', JSON.stringify(Error));
                        res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
                    });
                }
            } else {
                res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
            }
        }).catch(Error => {
            res.status(400).send({ Status: false, Message: "Some Occurred Error" });
        });
    }
};

// SellerBranchesOfBusiness_List
exports.SellerBranchesOfBusiness_List = function (req, res) {
  var ReceivingData = req.body;
  if (!ReceivingData.Customer || ReceivingData.Customer === '') {
      res.status(400).send({ Status: false, Message: "Customer can not be empty" });
  } else if (!ReceivingData.Business || ReceivingData.Business === '') {
      res.status(400).send({ Status: false, Message: "Business can not be empty" });
  } else {
      ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
      ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);

      Promise.all([
          CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer }, {}, {}).exec(),
      ]).then(Response => {
          var CustomerDetails = Response[0];
          var BranchArr = [];
          if (CustomerDetails !== null) {
              if (CustomerDetails.CustomerType === 'Owner') {
                  const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
                  const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
                  var ShortOrder = { createdAt: -1 };
                  var ShortKey = ReceivingData.ShortKey;
                  var ShortCondition = ReceivingData.ShortCondition;
                  if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                      ShortOrder = {};
                      ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
                  }
                  var FindQuery = { 'IfDeleted': false, Customer: ReceivingData.Customer, Business: ReceivingData.Business };

                  if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object' && ReceivingData.FilterQuery !== null && ReceivingData.FilterQuery.length > 0) {
                      ReceivingData.FilterQuery.map(obj => {
                          if (obj.Type === 'String') {
                              FindQuery[obj.DBName] = { $regex: new RegExp(".*" + obj.Value + ".*", "i") };
                          }
                          if (obj.Type === 'Select') {
                              FindQuery[obj.DBName] = obj.Value;
                          }
                          if (obj.Type === 'Date') {
                              if (FindQuery[obj.DBName] === undefined) {
                                  FindQuery[obj.DBName] = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                              } else {
                                  const DBName = obj.DBName;
                                  const AndQuery = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                                  FindQuery['$and'] = [{ [DBName]: FindQuery[obj.DBName] }, { [DBName]: AndQuery }];
                              }
                          }
                          if (obj.Type === 'Object') {
                              FindQuery[obj.DBName] = mongoose.Types.ObjectId(obj.Value._id);
                          }
                      });
                  }
                  Promise.all([
                      BusinessAndBranchManagement.BranchSchema
                          .aggregate([
                              { $match: FindQuery },                               
                              { $addFields: { BusinessNameSort: { $toLower: "$BusinessName" } } },
                              { $addFields: { MobileSort: { $toLower: "$Mobile" } } },
                              { $addFields: { RegistrationIdSort: { $toLower: "$RegistrationId" } } },
                              { $addFields: { GSTINSort: { $toLower: "$GSTIN" } } },
                              {
                                  $project: {
                                      BranchName: 1,
                                      Mobile: 1,
                                      BranchCreditLimit: 1,
                                      Business: 1,
                                      AvailableCreditLimit: 1,
                                      UserAssigned: 1,
                                      Address: 1,
                                      RegistrationId: 1,
                                      GSTIN: 1,
                                      ActiveStatus: 1,
                                      IfDeleted: 1,
                                      createdAt: 1,
                                      updatedAt: 1
                                  }
                              },
                              { $sort: ShortOrder },
                              { $skip: Skip_Count },
                              { $limit: Limit_Count }
                          ]).exec(),
              
                      BusinessAndBranchManagement.BranchSchema.countDocuments(FindQuery).exec(),
                      InvoiceManagement.InvoiceSchema.find({ Seller: ReceivingData.Customer, BuyerBusiness: ReceivingData.Business, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                      InviteManagement.InviteManagementSchema.find({ Seller: ReceivingData.Customer, SellerBusiness: ReceivingData.Business, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                      TemporaryManagement.CreditSchema.find({ Seller: ReceivingData.Customer, BuyerBusiness: ReceivingData.Business, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                  ]).then(result => {
                      var BranchDetails = JSON.parse(JSON.stringify(result[0]));
                      var BranchCount = JSON.parse(JSON.stringify(result[1]));
                      var InvoiceDetails = JSON.parse(JSON.stringify(result[2]));
                      var InviteDetails = JSON.parse(JSON.stringify(result[3]));
                      var TemporaryDetails = JSON.parse(JSON.stringify(result[4]));
                      if (BranchDetails.length !== 0) {
                          BranchDetails.map(Obj => {
                              Obj.ExtraUnitizedCreditLimit = 0;
                              Obj.CreditBalanceExists = false;
                              const result1Arr = TemporaryDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
                              if (result1Arr.length > 0) {
                                  var ValidityDate = new Date();
                                  var TodayDate = new Date();
                                  result1Arr.map(obj => {
                                      ValidityDate = new Date(obj.updatedAt);
                                      ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + obj.ApprovedPeriod));
                                      if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                                          Obj.BranchCreditLimit = parseFloat(Obj.BranchCreditLimit) + parseFloat(obj.ApproveLimit);
                                          Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.ApproveLimit);
                                      }
                                  });
                              }

                              const result2Arr = InviteDetails.filter(obj1 => obj1.Branch === Obj._id);
                              if (result2Arr.length > 0) {
                                  result2Arr.map(obj => {
                                      Obj.BranchCreditLimit = parseFloat(Obj.BranchCreditLimit) + parseFloat(obj.AvailableLimit);
                                      Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.AvailableLimit);
                                  });
                              }

                              const result3Arr = InvoiceDetails.filter(obj1 => obj1.Branch === Obj._id);

                              if (result3Arr.length > 0) {
                                  var InvoiceAmount = 0;
                                  result3Arr.map(obj => {
                                      InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.AvailableAmount);
                                  });
                                  if (InvoiceAmount > 0) {
                                      Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) - parseFloat(InvoiceAmount);
                                      if (Obj.AvailableCreditLimit > 0) {
                                          Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                      } else {
                                          Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                          Obj.CreditBalanceExists = true;
                                          Obj.AvailableCreditLimit = 0;
                                      }
                                  }
                              }

                              Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                              Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                              Obj.ExtraUnitizedCreditLimit = Obj.ExtraUnitizedCreditLimit.toFixed(2);
                              Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.ExtraUnitizedCreditLimit);
                              return Obj;
                          });
                      }
                      res.status(200).send({ Status: true, Response: BranchDetails, SubResponse: BranchCount });
                  }).catch(Error => {
                      ErrorHandling.ErrorLogCreation(req, 'Customer Find error', 'CustomerManagement -> All Customer List', JSON.stringify(Error));
                      res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
                  });
              } else if (CustomerDetails.CustomerType === 'User') {
                  if (CustomerDetails.BusinessAndBranches.length !== 0) {
                      CustomerDetails.BusinessAndBranches.map(Obj => {
                          Obj.Branches.map(obj => {
                              BranchArr.push(mongoose.Types.ObjectId(obj));
                          });
                      });
                  }

                  const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
                  const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
                  var ShortOrder = { createdAt: -1 };
                  var ShortKey = ReceivingData.ShortKey;
                  var ShortCondition = ReceivingData.ShortCondition;
                  if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                      ShortOrder = {};
                      ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
                  }
                  var FindQuery = { 'IfDeleted': false, _id: { $in: BranchArr }, Business: ReceivingData.Business };

                  if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object' && ReceivingData.FilterQuery !== null && ReceivingData.FilterQuery.length > 0) {
                      ReceivingData.FilterQuery.map(obj => {
                          if (obj.Type === 'String') {
                              FindQuery[obj.DBName] = { $regex: new RegExp(".*" + obj.Value + ".*", "i") };
                          }
                          if (obj.Type === 'Select') {
                              FindQuery[obj.DBName] = obj.Value;
                          }
                          if (obj.Type === 'Date') {
                              if (FindQuery[obj.DBName] === undefined) {
                                  FindQuery[obj.DBName] = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                              } else {
                                  const DBName = obj.DBName;
                                  const AndQuery = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                                  FindQuery['$and'] = [{ [DBName]: FindQuery[obj.DBName] }, { [DBName]: AndQuery }];
                              }
                          }
                          if (obj.Type === 'Object') {
                              FindQuery[obj.DBName] = mongoose.Types.ObjectId(obj.Value._id);
                          }
                      });
                  }
                  Promise.all([
                      BusinessAndBranchManagement.BranchSchema
                          .aggregate([
                              { $match: FindQuery },
                              { $addFields: { BusinessNameSort: { $toLower: "$BusinessName" } } },
                              { $addFields: { MobileSort: { $toLower: "$Mobile" } } },
                              { $addFields: { RegistrationIdSort: { $toLower: "$RegistrationId" } } },
                              { $addFields: { GSTINSort: { $toLower: "$GSTIN" } } },
                              {
                                  $project: {
                                      BranchName: 1,
                                      Mobile: 1,
                                      BranchCreditLimit: 1,
                                      Business: 1,
                                      AvailableCreditLimit: 1,
                                      UserAssigned: 1,
                                      Address: 1,
                                      RegistrationId: 1,
                                      GSTIN: 1,
                                      ActiveStatus: 1,
                                      IfDeleted: 1,
                                      createdAt: 1,
                                      updatedAt: 1
                                  }
                              },
                              { $sort: ShortOrder },
                              { $skip: Skip_Count },
                              { $limit: Limit_Count }
                          ]).exec(),
                      BusinessAndBranchManagement.BranchSchema.countDocuments(FindQuery).exec(),
                      InvoiceManagement.InvoiceSchema.find({ Branch : { $in: BranchArr }, BuyerBusiness: ReceivingData.Business, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                      InviteManagement.InviteManagementSchema.find({ Branch: { $in: BranchArr }, BuyerBusiness: ReceivingData.Business, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                      TemporaryManagement.CreditSchema.find({ Branch:  { $in: BranchArr }, BuyerBusiness: ReceivingData.Business, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                  ]).then(result => {
              
                      var BranchDetails = JSON.parse(JSON.stringify(result[0]));
          
                      var BranchCount = JSON.parse(JSON.stringify(result[1]));
                      var InvoiceDetails = JSON.parse(JSON.stringify(result[2]));
                      var InviteDetails = JSON.parse(JSON.stringify(result[3]));
                      var TemporaryDetails = JSON.parse(JSON.stringify(result[4]));
                      if (BranchDetails.length !== 0) {
                          BranchDetails.map(Obj => {
                              Obj.ExtraUnitizedCreditLimit = 0;
                              Obj.CreditBalanceExists = false;
                              const result1Arr = TemporaryDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
                              if (result1Arr.length > 0) {
                                  var ValidityDate = new Date();
                                  var TodayDate = new Date();
                                  result1Arr.map(obj => {
                                      ValidityDate = new Date(obj.updatedAt);
                                      ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + obj.ApprovedPeriod));
                                      if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                                          Obj.BranchCreditLimit = parseFloat(Obj.BranchCreditLimit) + parseFloat(obj.ApproveLimit);
                                          Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.ApproveLimit);
                                      }
                                  });
                              }

                              const result2Arr = InviteDetails.filter(obj1 => obj1.Branch === Obj._id);
                              if (result2Arr.length > 0) {
                                  result2Arr.map(obj => {
                                      Obj.BranchCreditLimit = parseFloat(Obj.BranchCreditLimit) + parseFloat(obj.AvailableLimit);
                                      Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.AvailableLimit);
                                  });
                              }

                              const result3Arr = InvoiceDetails.filter(obj1 => obj1.Branch === Obj._id);

                              if (result3Arr.length > 0) {
                                  var InvoiceAmount = 0;
                                  result3Arr.map(obj => {
                                      InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.AvailableAmount);
                                  });
                                  if (InvoiceAmount > 0) {
                                      Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) - parseFloat(InvoiceAmount);
                                      if (Obj.AvailableCreditLimit > 0) {
                                          Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                      } else {
                                          Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                          Obj.CreditBalanceExists = true;
                                          Obj.AvailableCreditLimit = 0;
                                      }
                                  }
                              }

                              Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                              Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                              Obj.ExtraUnitizedCreditLimit = Obj.ExtraUnitizedCreditLimit.toFixed(2);
                              Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.ExtraUnitizedCreditLimit);
                              return Obj;
                          });
                      }
                      res.status(200).send({ Status: true, Response: BranchDetails, SubResponse: BranchCount });
                  }).catch(Error => {
                      ErrorHandling.ErrorLogCreation(req, 'Customer Find error', 'CustomerManagement -> All Customer List', JSON.stringify(Error));
                      res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
                  });
              }
          } else {
              res.status(417).send({ Status: false, Message: 'Invalid Customer Details' });
          }
      }).catch(Response => {
          res.status(417).send({ Status: false, Message: "Some errors Error." });
          ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessAndBranchManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
      });
  }
 
};

// BuyerBranchesOfBusiness_List
exports.BuyerBranchesOfBusiness_List = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.Customer || ReceivingData.Customer === '') {
        res.status(400).send({ Status: false, Message: "Customer can not be empty" });
    } else if (!ReceivingData.Business || ReceivingData.Business === '') {
        res.status(400).send({ Status: false, Message: "Business can not be empty" });
    } else {
        ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
        ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);

        Promise.all([
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer }, {}, {}).exec(),
        ]).then(Response => {
            var CustomerDetails = Response[0];
            var BranchArr = [];
            if (CustomerDetails !== null) {
                if (CustomerDetails.CustomerType === 'Owner') {
                    const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
                    const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
                    var ShortOrder = { createdAt: -1 };
                    var ShortKey = ReceivingData.ShortKey;
                    var ShortCondition = ReceivingData.ShortCondition;
                    if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                        ShortOrder = {};
                        ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
                    }
                    var FindQuery = { 'IfDeleted': false, Customer: ReceivingData.Customer, Business: ReceivingData.Business };

                    if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object' && ReceivingData.FilterQuery !== null && ReceivingData.FilterQuery.length > 0) {
                        ReceivingData.FilterQuery.map(obj => {
                            if (obj.Type === 'String') {
                                FindQuery[obj.DBName] = { $regex: new RegExp(".*" + obj.Value + ".*", "i") };
                            }
                            if (obj.Type === 'Select') {
                                FindQuery[obj.DBName] = obj.Value;
                            }
                            if (obj.Type === 'Date') {
                                if (FindQuery[obj.DBName] === undefined) {
                                    FindQuery[obj.DBName] = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                                } else {
                                    const DBName = obj.DBName;
                                    const AndQuery = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                                    FindQuery['$and'] = [{ [DBName]: FindQuery[obj.DBName] }, { [DBName]: AndQuery }];
                                }
                            }
                            if (obj.Type === 'Object') {
                                FindQuery[obj.DBName] = mongoose.Types.ObjectId(obj.Value._id);
                            }
                        });
                    }
                    Promise.all([
                        BusinessAndBranchManagement.BranchSchema
                            .aggregate([
                                { $match: FindQuery },                               
                                { $addFields: { BusinessNameSort: { $toLower: "$BusinessName" } } },
                                { $addFields: { MobileSort: { $toLower: "$Mobile" } } },
                                { $addFields: { RegistrationIdSort: { $toLower: "$RegistrationId" } } },
                                { $addFields: { GSTINSort: { $toLower: "$GSTIN" } } },
                                {
                                    $project: {
                                        BranchName: 1,
                                        Mobile: 1,
                                        BranchCreditLimit: 1,
                                        Business: 1,
                                        AvailableCreditLimit: 1,
                                        UserAssigned: 1,
                                        Address: 1,
                                        RegistrationId: 1,
                                        GSTIN: 1,
                                        ActiveStatus: 1,
                                        IfDeleted: 1,
                                        createdAt: 1,
                                        updatedAt: 1
                                    }
                                },
                                { $sort: ShortOrder },
                                { $skip: Skip_Count },
                                { $limit: Limit_Count }
                            ]).exec(),
                
                        BusinessAndBranchManagement.BranchSchema.countDocuments(FindQuery).exec(),
                        InvoiceManagement.InvoiceSchema.find({ Buyer: ReceivingData.Customer, BuyerBusiness: ReceivingData.Business, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                        InviteManagement.InviteManagementSchema.find({ Buyer: ReceivingData.Customer, BuyerBusiness: ReceivingData.Business, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                        TemporaryManagement.CreditSchema.find({ Buyer: ReceivingData.Customer, BuyerBusiness: ReceivingData.Business, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                    ]).then(result => {
                        var BranchDetails = JSON.parse(JSON.stringify(result[0]));
        
                        var BranchCount = JSON.parse(JSON.stringify(result[1]));
                        var InvoiceDetails = JSON.parse(JSON.stringify(result[2]));
                        var InviteDetails = JSON.parse(JSON.stringify(result[3]));
                        var TemporaryDetails = JSON.parse(JSON.stringify(result[4]));
                        if (BranchDetails.length !== 0) {
                            BranchDetails.map(Obj => {
                                Obj.ExtraUnitizedCreditLimit = 0;
                                Obj.CreditBalanceExists = false;
                                const result1Arr = TemporaryDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
                                if (result1Arr.length > 0) {
                                    var ValidityDate = new Date();
                                    var TodayDate = new Date();
                                    result1Arr.map(obj => {
                                        ValidityDate = new Date(obj.updatedAt);
                                        ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + obj.ApprovedPeriod));
                                        if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                                            Obj.BranchCreditLimit = parseFloat(Obj.BranchCreditLimit) + parseFloat(obj.ApproveLimit);
                                            Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.ApproveLimit);
                                        }
                                    });
                                }

                                const result2Arr = InviteDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
                                if (result2Arr.length > 0) {
                                    result2Arr.map(obj => {
                                        Obj.BranchCreditLimit = parseFloat(Obj.BranchCreditLimit) + parseFloat(obj.AvailableLimit);
                                        Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.AvailableLimit);
                                    });
                                }

                                const result3Arr = InvoiceDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);

                                if (result3Arr.length > 0) {
                                    var InvoiceAmount = 0;
                                    result3Arr.map(obj => {
                                        InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.AvailableAmount);
                                    });
                                    if (InvoiceAmount > 0) {
                                        Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) - parseFloat(InvoiceAmount);
                                        if (Obj.AvailableCreditLimit > 0) {
                                            Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                        } else {
                                            Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                            Obj.CreditBalanceExists = true;
                                            Obj.AvailableCreditLimit = 0;
                                        }
                                    }
                                }

                                Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                                Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                Obj.ExtraUnitizedCreditLimit = Obj.ExtraUnitizedCreditLimit.toFixed(2);
                                Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.ExtraUnitizedCreditLimit);
                                return Obj;
                            });
                        }
                        res.status(200).send({ Status: true, Response: BranchDetails, SubResponse: BranchCount });
                    }).catch(Error => {
                        ErrorHandling.ErrorLogCreation(req, 'Customer Find error', 'CustomerManagement -> All Customer List', JSON.stringify(Error));
                        res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
                    });
                } else if (CustomerDetails.CustomerType === 'User') {
                    if (CustomerDetails.BusinessAndBranches.length !== 0) {
                        CustomerDetails.BusinessAndBranches.map(Obj => {
                            Obj.Branches.map(obj => {
                                BranchArr.push(mongoose.Types.ObjectId(obj));
                            });
                        });
                    }

                    const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
                    const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
                    var ShortOrder = { createdAt: -1 };
                    var ShortKey = ReceivingData.ShortKey;
                    var ShortCondition = ReceivingData.ShortCondition;
                    if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                        ShortOrder = {};
                        ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
                    }
                    var FindQuery = { 'IfDeleted': false, _id: { $in: BranchArr }, Business: ReceivingData.Business };

                    if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object' && ReceivingData.FilterQuery !== null && ReceivingData.FilterQuery.length > 0) {
                        ReceivingData.FilterQuery.map(obj => {
                            if (obj.Type === 'String') {
                                FindQuery[obj.DBName] = { $regex: new RegExp(".*" + obj.Value + ".*", "i") };
                            }
                            if (obj.Type === 'Select') {
                                FindQuery[obj.DBName] = obj.Value;
                            }
                            if (obj.Type === 'Date') {
                                if (FindQuery[obj.DBName] === undefined) {
                                    FindQuery[obj.DBName] = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                                } else {
                                    const DBName = obj.DBName;
                                    const AndQuery = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                                    FindQuery['$and'] = [{ [DBName]: FindQuery[obj.DBName] }, { [DBName]: AndQuery }];
                                }
                            }
                            if (obj.Type === 'Object') {
                                FindQuery[obj.DBName] = mongoose.Types.ObjectId(obj.Value._id);
                            }
                        });
                    }
                    Promise.all([
                        BusinessAndBranchManagement.BranchSchema
                            .aggregate([
                                { $match: FindQuery },
                                { $addFields: { BusinessNameSort: { $toLower: "$BusinessName" } } },
                                { $addFields: { MobileSort: { $toLower: "$Mobile" } } },
                                { $addFields: { RegistrationIdSort: { $toLower: "$RegistrationId" } } },
                                { $addFields: { GSTINSort: { $toLower: "$GSTIN" } } },
                                {
                                    $project: {
                                        BranchName: 1,
                                        Mobile: 1,
                                        BranchCreditLimit: 1,
                                        Business: 1,
                                        AvailableCreditLimit: 1,
                                        UserAssigned: 1,
                                        Address: 1,
                                        RegistrationId: 1,
                                        GSTIN: 1,
                                        ActiveStatus: 1,
                                        IfDeleted: 1,
                                        createdAt: 1,
                                        updatedAt: 1
                                    }
                                },
                                { $sort: ShortOrder },
                                { $skip: Skip_Count },
                                { $limit: Limit_Count }
                            ]).exec(),
                        BusinessAndBranchManagement.BranchSchema.countDocuments(FindQuery).exec(),
                        InvoiceManagement.InvoiceSchema.find({ BuyerBranch: { $in: BranchArr }, BuyerBusiness: ReceivingData.Business, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                        InviteManagement.InviteManagementSchema.find({ BuyerBranch: { $in: BranchArr }, BuyerBusiness: ReceivingData.Business, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                        TemporaryManagement.CreditSchema.find({ BuyerBranch: { $in: BranchArr }, BuyerBusiness: ReceivingData.Business, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                    ]).then(result => {
                    
                        var BranchDetails = JSON.parse(JSON.stringify(result[0]));
                    
                        var BranchCount = JSON.parse(JSON.stringify(result[1]));
                        var InvoiceDetails = JSON.parse(JSON.stringify(result[2]));
                        var InviteDetails = JSON.parse(JSON.stringify(result[3]));
                        var TemporaryDetails = JSON.parse(JSON.stringify(result[4]));
                        if (BranchDetails.length !== 0) {
                            BranchDetails.map(Obj => {
                                Obj.ExtraUnitizedCreditLimit = 0;
                                Obj.CreditBalanceExists = false;
                                const result1Arr = TemporaryDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
                                if (result1Arr.length > 0) {
                                    var ValidityDate = new Date();
                                    var TodayDate = new Date();
                                    result1Arr.map(obj => {
                                        ValidityDate = new Date(obj.updatedAt);
                                        ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + obj.ApprovedPeriod));
                                        if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                                            Obj.BranchCreditLimit = parseFloat(Obj.BranchCreditLimit) + parseFloat(obj.ApproveLimit);
                                            Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.ApproveLimit);
                                        }
                                    });
                                }

                                const result2Arr = InviteDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
                                if (result2Arr.length > 0) {
                                    result2Arr.map(obj => {
                                        Obj.BranchCreditLimit = parseFloat(Obj.BranchCreditLimit) + parseFloat(obj.AvailableLimit);
                                        Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.AvailableLimit);
                                    });
                                }

                                const result3Arr = InvoiceDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);

                                if (result3Arr.length > 0) {
                                    var InvoiceAmount = 0;
                                    result3Arr.map(obj => {
                                        InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.AvailableAmount);
                                    });
                                    if (InvoiceAmount > 0) {
                                        Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) - parseFloat(InvoiceAmount);
                                        if (Obj.AvailableCreditLimit > 0) {
                                            Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                        } else {
                                            Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                            Obj.CreditBalanceExists = true;
                                            Obj.AvailableCreditLimit = 0;
                                        }
                                    }
                                }

                                Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                                Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                Obj.ExtraUnitizedCreditLimit = Obj.ExtraUnitizedCreditLimit.toFixed(2);
                                Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.ExtraUnitizedCreditLimit);
                                return Obj;
                            });
                        }
                        res.status(200).send({ Status: true, Response: BranchDetails, SubResponse: BranchCount });
                    }).catch(Error => {
                        ErrorHandling.ErrorLogCreation(req, 'Customer Find error', 'CustomerManagement -> All Customer List', JSON.stringify(Error));
                        res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
                    });
                }
            } else {
                res.status(417).send({ Status: false, Message: 'Invalid Customer Details' });
            }
        }).catch(Response => {
            res.status(417).send({ Status: false, Message: "Some errors Error." });
            ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessAndBranchManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
        });
    }
};


// Industry Simple List
exports.IndustrySimpleList = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.Owner || ReceivingData.Owner === '') {
        res.status(400).send({ Status: false, Message: "User Details can not be empty" });
    } else {
        ReceivingData.Owner = mongoose.Types.ObjectId(ReceivingData.Owner);
        IndustryManagement.IndustrySchema.find({ Status: 'Activated' }, {}, {}, function (err, result) {
            if (err) {
                ErrorHandling.ErrorLogCreation(req, 'Industry Find error', 'BusinessManagement -> IndustrySimpleList', JSON.stringify(err));
                res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find the User Management!.", Error: err });
            } else {
                res.status(200).send({ Status: true, Response: result, Message: "Industries" });
            }
        });
    }
};

// PrimaryBranchSimpleList 
exports.PrimaryBranchSimpleList = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.Owner || ReceivingData.Owner === '') {
        res.status(400).send({ Status: false, Message: "User Details can not be empty" });
    } else {
        ReceivingData.Owner = mongoose.Types.ObjectId(ReceivingData.Owner);
        BusinessAndBranchManagement.BusinessSchema.find({ Customer: ReceivingData.Owner }, {}, {}, function (err, result) {
            if (err) {
                ErrorHandling.ErrorLogCreation(req, 'Primary Find error', 'BusinessManagement -> PrimaryBranchSimpleList', JSON.stringify(err));
                res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find the User Management!.", Error: err });
            } else {
                if (result.length !== 0) {
                    var PrimaryBranchArr = [];
                    result.map(Obj => {
                        PrimaryBranchArr.push(Obj.PrimaryBranch);
                    });
                    BusinessAndBranchManagement.BranchSchema.find({ _id: { $in: PrimaryBranchArr } }, {}, {}, function (err1, result1) {
                        if (err1) {
                            ErrorHandling.ErrorLogCreation(req, 'Primary Find error', 'BusinessManagement -> PrimaryBranchSimpleList', JSON.stringify(err1));
                            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find the User Management!.", Error: err1 });
                        } else {
                            res.status(200).send({ Status: true, Response: result1, Message: "PrimaryBranches" });
                        }
                    });
                } else {
                    res.status(200).send({ Status: true, Response: [], Message: "PrimaryBranches" });
                }
            }
        });
    }
};

exports.BusinessAndBranchUpdate = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.Customer || ReceivingData.Customer === '') {
        res.status(400).send({ Status: false, Message: "Customer can not be empty" });
    } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
        res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
    } else if (!ReceivingData.BusinessId || ReceivingData.BusinessId === '') {
        res.status(400).send({ Status: false, Message: "Business Details can not be empty" });
    } else if (!ReceivingData.BusinessCreditLimit || ReceivingData.BusinessCreditLimit === '') {
        res.status(400).send({ Status: false, Message: "Business Credit Limit Details can not be empty" });
    } else {
        ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
        ReceivingData.BusinessId = mongoose.Types.ObjectId(ReceivingData.BusinessId);
        if (ReceivingData.CustomerCategory === 'Seller') {
            Promise.all([
                CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer, $or: [{ CustomerCategory: ReceivingData.CustomerCategory }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.BusinessId, Customer: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                InvoiceManagement.InvoiceSchema.find({ Business: ReceivingData.BusinessId, Seller: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            ]).then(Response => {
                var CustomerDetails = JSON.parse(JSON.stringify(Response[0]));
                var BusinessDetails = JSON.parse(JSON.stringify(Response[1]));
                var InvoiceDetails = JSON.parse(JSON.stringify(Response[2]));

                if (CustomerDetails !== null && BusinessDetails !== null) {
                    var InvoiceAmount = 0;
                    if (InvoiceDetails.length > 0) {
                        InvoiceDetails.map(Obj => {
                            InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(Obj.AvailableAmount);
                        });
                    }
                    var FullCreditLimitBusinessUnitized = parseFloat(BusinessDetails.AvailableCreditLimit) - parseFloat(InvoiceAmount);
                    if (FullCreditLimitBusinessUnitized < 0) {
                        FullCreditLimitBusinessUnitized = 0;
                    }
                    if (Number(ReceivingData.BusinessCreditLimit) >= FullCreditLimitBusinessUnitized) {
                        BusinessAndBranchManagement.BusinessSchema.updateOne({ _id: ReceivingData.BusinessId },
                            {
                                $set: {
                                    BusinessName: ReceivingData.BusinessName,
                                    Industry: ReceivingData.Industry,
                                    BusinessCreditLimit: ReceivingData.BusinessCreditLimit,
                                    AvailableCreditLimit: ReceivingData.BusinessCreditLimit
                                }
                            }).exec(function (err_2, result_2) {
                                if (err_2) {
                                    res.status(417).send({ Status: false, Message: "Some error occurred while Find The Business Details!.", Error: err_2 });
                                } else {
                                    BusinessAndBranchManagement.BusinessSchema.find({ _id: ReceivingData.BusinessId, ActiveStatus: true, IfDeleted: false }, {}, {})
                                        .populate({ path: "Industry", select: ["Industry_Name"] }).populate({ path: "PrimaryBranch", select: ["BranchName"] }).exec((ErrorBusiness, ResponseBusiness) => {
                                            ResponseBusiness = JSON.parse(JSON.stringify(ResponseBusiness));
                                            ResponseBusiness.map(Obj => {
                                                Obj.Industries = Obj.Industry;
                                                Obj.PrimaryBranches = Obj.PrimaryBranch;
                                                delete Obj.Industry;
                                                delete Obj.PrimaryBranch;
                                                return Obj;
                                            });
                                            res.status(200).send({ Status: true, Message: "Business SuccessFully Updated!.", Response: ResponseBusiness[0] });
                                        });
                                }
                            });
                    } else {
                        res.status(200).send({ Status: false, Message: "Enter the value should be greater than Business Credit Amount!." });
                    }

                } else {
                    res.status(417).send({ Status: false, Message: "Invalid Customer Details!." });
                }
            }).catch(Error => {
                ErrorHandling.ErrorLogCreation(req, 'Seller Business Details Find Getting Error', 'SellerBusinessAndBranchUpdate.Controller -> SellerBusinessAndBranchUpdate', JSON.stringify(Error));
                res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business and Branches!.", Error: Error });
            });
        } else if (ReceivingData.CustomerCategory === 'Buyer') {
            Promise.all([
                CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer, $or: [{ CustomerCategory: ReceivingData.CustomerCategory }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.BusinessId, Customer: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            ]).then(Response => {
                var CustomerDetails = JSON.parse(JSON.stringify(Response[0]));
                var BusinessDetails = JSON.parse(JSON.stringify(Response[1]));
                if (CustomerDetails !== null && BusinessDetails !== null) {
                    BusinessAndBranchManagement.BusinessSchema.updateOne({ _id: ReceivingData.BusinessId },
                        {
                            $set: {
                                BusinessName: ReceivingData.BusinessName,
                                Industry: ReceivingData.Industry,
                            }
                        }).exec(function (err_2, result_2) {
                            if (err_2) {
                                res.status(417).send({ Status: false, Message: "Some error occurred while Find The Business Details!.", Error: err_2 });
                            } else {
                                BusinessAndBranchManagement.BusinessSchema.find({ _id: ReceivingData.BusinessId, ActiveStatus: true, IfDeleted: false }, {}, {})
                                    .populate({ path: "Industry", select: ["Industry_Name"] }).populate({ path: "PrimaryBranch", select: ["BranchName"] }).exec((ErrorBusiness, ResponseBusiness) => {
                                        ResponseBusiness = JSON.parse(JSON.stringify(ResponseBusiness));
                                        ResponseBusiness.map(Obj => {
                                            Obj.Industries = Obj.Industry;
                                            Obj.PrimaryBranches = Obj.PrimaryBranch;
                                            delete Obj.Industry;
                                            delete Obj.PrimaryBranch;
                                            return Obj;
                                        });
                                        res.status(200).send({ Status: true, Message: "Business SuccessFully Updated!.", Response: ResponseBusiness[0] });
                                    });
                            }
                        });
                } else {
                    res.status(417).send({ Status: false, Message: "Invalid Customer Details!." });
                }
            }).catch(Error => {
                ErrorHandling.ErrorLogCreation(req, 'Seller Business Details Find Getting Error', 'SellerBusinessAndBranchUpdate.Controller -> SellerBusinessAndBranchUpdate', JSON.stringify(Error));
                res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business and Branches!.", Error: Error });
            });
        }
    }
};

exports.BranchDetailsUpdate = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.Customer || ReceivingData.Customer === '') {
        res.status(400).send({ Status: false, Message: "Customer can not be empty" });
    } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
        res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
    } else if (!ReceivingData.BranchId || ReceivingData.BranchId === '') {
        res.status(400).send({ Status: false, Message: "Branch Details can not be empty" });
    } else if (!ReceivingData.BranchCreditLimit || ReceivingData.BranchCreditLimit === '') {
        res.status(400).send({ Status: false, Message: "Branch Credit Limit Details can not be empty" });
    } else if (!ReceivingData.BusinessId || ReceivingData.BusinessId === '') {
        res.status(400).send({ Status: false, Message: "Business Details can not be empty" });
    } else {
        ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
        ReceivingData.BranchId = mongoose.Types.ObjectId(ReceivingData.BranchId);
        ReceivingData.BusinessId = mongoose.Types.ObjectId(ReceivingData.BusinessId);
        if (ReceivingData.CustomerCategory === 'Seller') {
            Promise.all([
                CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer, $or: [{ CustomerCategory: ReceivingData.CustomerCategory }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                BusinessAndBranchManagement.BranchSchema.findOne({ _id: ReceivingData.BranchId, Business: ReceivingData.BusinessId, Customer: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                InvoiceManagement.InvoiceSchema.find({ Branch: ReceivingData.BranchId, Business: ReceivingData.BusinessId, Seller: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            ]).then(Response => {
                var CustomerDetails = JSON.parse(JSON.stringify(Response[0]));
                var BranchDetails = JSON.parse(JSON.stringify(Response[1]));
                var InvoiceDetails = JSON.parse(JSON.stringify(Response[2]));

                if (CustomerDetails !== null && BranchDetails !== null) {
                        BusinessAndBranchManagement.BranchSchema.updateOne({ _id: ReceivingData.BranchId },
                            {
                                $set: {
                                    BranchName: ReceivingData.BranchName,
                                    Mobile: ReceivingData.Mobile,
                                    GSTIN: ReceivingData.GSTIN,
                                    RegistrationId: ReceivingData.RegistrationId,
                                    BranchCreditLimit: ReceivingData.BranchCreditLimit,
                                    AvailableCreditLimit: ReceivingData.BranchCreditLimit,
                                    Address: ReceivingData.Address
                                }
                            }).exec(function (err_2, result_2) {
                                if (err_2) {
                                    res.status(417).send({ Status: false, Message: "Some error occurred while Find The Business Details!.", Error: err_2 });
                                } else {
                                    BusinessAndBranchManagement.BranchSchema.findOne({ _id: ReceivingData.BranchId, ActiveStatus: true, IfDeleted: false }, {}, {})
                                        .exec((ErrorBranch, ResponseBranch) => {
                                            res.status(200).send({ Status: true, Message: "Branch SuccessFully Updated!.", Response: ResponseBranch });
                                        });
                                }
                            });
                } else {
                    res.status(417).send({ Status: false, Message: "Invalid Customer Details!." });
                }
            }).catch(Error => {
                ErrorHandling.ErrorLogCreation(req, 'Seller Business Details Find Getting Error', 'SellerBusinessAndBranchUpdate.Controller -> SellerBusinessAndBranchUpdate', JSON.stringify(Error));
                res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business and Branches!.", Error: Error });
            });
        } else if (ReceivingData.CustomerCategory === 'Buyer') {
            Promise.all([
                CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer, $or: [{ CustomerCategory: ReceivingData.CustomerCategory }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                BusinessAndBranchManagement.BranchSchema.findOne({ _id: ReceivingData.BranchId, Business: ReceivingData.BusinessId, Customer: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            ]).then(Response => {
                var CustomerDetails = JSON.parse(JSON.stringify(Response[0]));
                var BranchDetails = JSON.parse(JSON.stringify(Response[1]));
                if (CustomerDetails !== null && BranchDetails !== null) {
                    BusinessAndBranchManagement.BranchSchema.updateOne({ _id: ReceivingData.BranchId },
                        {
                            $set: {
                                BranchName: ReceivingData.BranchName,
                                Mobile: ReceivingData.Mobile,
                                RegistrationId: ReceivingData.RegistrationId,
                                GSTIN: ReceivingData.GSTIN,                                
                                Address: ReceivingData.Address
                            }
                        }).exec(function (err_2, result_2) {
                            if (err_2) {
                                res.status(417).send({ Status: false, Message: "Some error occurred while Find The Business Details!.", Error: err_2 });
                            } else {
                                BusinessAndBranchManagement.BranchSchema.find({ _id: ReceivingData.BranchId, ActiveStatus: true, IfDeleted: false }, {}, {})
                                    .exec((ErrorBusiness, ResponseBusiness) => {                                       
                                        res.status(200).send({ Status: true, Message: "Business SuccessFully Updated!.", Response: ResponseBusiness[0] });
                                    });
                            }
                        });
                } else {
                    res.status(417).send({ Status: false, Message: "Invalid Customer Details!." });
                }
            }).catch(Error => {
                ErrorHandling.ErrorLogCreation(req, 'Seller Business Details Find Getting Error', 'SellerBusinessAndBranchUpdate.Controller -> SellerBusinessAndBranchUpdate', JSON.stringify(Error));
                res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business and Branches!.", Error: Error });
            });
        }
    }
};


exports.SellerBusinessDelete = function (req, res) {
  var ReceivingData = req.body;
  if (!ReceivingData.Customer || ReceivingData.Customer === '') {
     res.status(400).send({ Status: false, Message: "Customer can not be empty" });
  } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
     res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
  } else if (!ReceivingData.BusinessId || ReceivingData.BusinessId === '') {
     res.status(400).send({ Status: false, Message: "Business Details can not be empty" });
  } else if (!ReceivingData.BranchId || ReceivingData.BranchId === '') {
     res.status(400).send({ Status: false, Message: "Business Details can not be empty" });
  } else {
     ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
     ReceivingData.BusinessId = mongoose.Types.ObjectId(ReceivingData.BusinessId);
     ReceivingData.BranchId = mongoose.Types.ObjectId(ReceivingData.BranchId);
     Promise.all([
        CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer, $or: [{ CustomerCategory: ReceivingData.CustomerCategory }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        BusinessAndBranchManagement.BranchSchema.find({ _id: ReceivingData.BranchId, Customer: ReceivingData.Customer, Business: ReceivingData.BusinessId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        InvoiceManagement.InvoiceSchema.find({ Business: ReceivingData.BusinessId, Seller: ReceivingData.Customer, Branch: ReceivingData.BranchId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        InviteManagement.InviteManagementSchema.find({ Business: ReceivingData.BusinessId, Seller: ReceivingData.Customer, Branch: ReceivingData.BranchId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        PaymentManagement.PaymentSchema.find({ Business: ReceivingData.BusinessId, Seller: ReceivingData.Customer, Branch: ReceivingData.BranchId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        CustomersManagement.CustomerSchema.find({ Owner: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        BusinessAndBranchManagement.BranchSchema.find({ Customer: ReceivingData.Customer, Business: ReceivingData.BusinessId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        BusinessAndBranchManagement.BusinessSchema.findOne({ Customer: ReceivingData.Customer, _id: ReceivingData.BusinessId, PrimaryBranch: ReceivingData.BranchId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        BusinessAndBranchManagement.BranchSchema.find({ Customer: ReceivingData.Customer, Business: ReceivingData.BusinessId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
     ]).then(Response => {
        var CustomerDetails = JSON.parse(JSON.stringify(Response[0]));
        var BranchDetails = JSON.parse(JSON.stringify(Response[1]));
        var InvoiceDetails = JSON.parse(JSON.stringify(Response[2]));
        var InviteDetails = JSON.parse(JSON.stringify(Response[3]));
        var PaymentDetails = JSON.parse(JSON.stringify(Response[4]));
        var UserDetails = JSON.parse(JSON.stringify(Response[5]));
        var BusinessDetails = JSON.parse(JSON.stringify(Response[6]));
        var PrimaryBranchDetails = JSON.parse(JSON.stringify(Response[7]));
        var PrimaryBranchAdd = JSON.parse(JSON.stringify(Response[8]));
        var UserBranch = [];
        if (UserDetails.length > 0) {
           UserDetails.map(Obj => {
              Obj.BusinessAndBranches.map(obj => {
                 obj.Branches.map(obj1 => {
                    UserBranch.push(obj1);
                 });
              });
           });
        }
        var MainArr = [];
        if (CustomerDetails !== null) {
           BranchDetails = BranchDetails.filter(obj => {
              const BranchDetailsArr = InvoiceDetails.filter(obj1 => obj1.Branch === obj._id && obj1.ActiveStatus === true);
              return BranchDetailsArr.length > 0 ? true : false;
           });
           MainArr = BranchDetails;
           BranchDetails = BranchDetails.filter(obj => {
              const BranchDetailsArr = InviteDetails.filter(obj1 => obj1.Branch === obj._id && obj1.ActiveStatus === true);
              return BranchDetailsArr.length > 0 ? true : false;
           });
           MainArr = MainArr.concat(BranchDetails);
           BranchDetails = BranchDetails.filter(obj => {
              const BranchDetailsArr = PaymentDetails.filter(obj1 => obj1.Branch === obj._id && obj1.ActiveStatus === true);
              return BranchDetailsArr.length > 0 ? true : false;
           });
           MainArr = MainArr.concat(BranchDetails);
           BranchDetails = BranchDetails.filter(obj => {
              const BranchDetailsArr = UserBranch.filter(obj1 => JSON.parse(JSON.stringify(obj1)) === JSON.parse(JSON.stringify(obj._id)));
              return BranchDetailsArr.length > 0 ? true : false;
           });
           MainArr = MainArr.concat(BranchDetails);
           if (MainArr.length === 0) {
              BusinessAndBranchManagement.BranchSchema.updateOne(
                 { "_id": ReceivingData.BranchId },
                 {
                    $set: {
                       "ActiveStatus": false,
                       "IfDeleted": true,
                    }
                 }
              ).exec();
              if (BusinessDetails.length === 1) {
                 BusinessAndBranchManagement.BusinessSchema.updateOne(
                    { "_id": ReceivingData.BusinessId, IfSeller: true },
                    {
                       $set: {
                          "ActiveStatus": false,
                          "IfDeleted": true,
                       }
                    }
                 ).exec();
              }
              if (PrimaryBranchDetails !== null) {
                 const PrimaryBranchDetailsArr = PrimaryBranchAdd.filter(obj1 => obj1._id !== PrimaryBranchDetails.PrimaryBranch);
                 if (PrimaryBranchDetailsArr.length > 0) {
                    BusinessAndBranchManagement.BusinessSchema.updateOne(
                       { "_id": ReceivingData.BusinessId, IfSeller: true },
                       {
                          $set: {
                             PrimaryBranch: PrimaryBranchDetailsArr[0]._id
                          }
                       }
                    ).exec();
                 }
              }
              res.status(200).send({ Status: true, Message: "Business SuccessFully Deleted!." });
           } else {
              res.status(200).send({ Status: false, Message: "This Branch Connected to Invoice or Payment or Invite and User Assign!!! Once All connectivity clear After the delete Branch." });
           }
        } else {
           res.status(400).send({ Status: false, Message: "Invalid Customer Details!." });
        }
     }).catch(Error => {
        ErrorHandling.ErrorLogCreation(req, 'Seller Business Details Find Getting Error', 'SellerBusinessDelete.Controller -> SellerBusinessDelete', JSON.stringify(err));
        res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business and Branches!.", Error: err });
     });
  }
};



exports.BuyerBusinessMonthlyReports = function (req, res) {
    var ReceivingData = req.body;
    ReceivingData.BusinessId = mongoose.Types.ObjectId(ReceivingData.BusinessId);
    var date = new Date();
    var firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    var lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    firstDay = new Date(firstDay.setHours(0, 0, 0, 0));
    lastDay = new Date(lastDay.setHours(23, 59, 59, 999));
    Promise.all([
      BusinessAndBranchManagement.BusinessSchema.find({_id: ReceivingData.BusinessId, ActiveStatus: true, IfDeleted: false }, {}, {}).
        // populate({ path: 'Customer', select: 'File_Name' })
        exec(),
      InvoiceManagement.InvoiceSchema.find({$and: [{ InvoiceDate: { $gte: firstDay } }, { InvoiceDate: { $lte: lastDay } }], InvoiceStatus: 'Accept', PaidORUnpaid: 'Paid', ActiveStatus: true, IfDeleted: false }, {}, {}).
        // populate({ path: 'Branch', select: 'BranchName' })
        exec(),
      InvoiceManagement.InvoiceSchema.find({$and: [{ InvoiceDate: { $gte: firstDay } }, { InvoiceDate: { $lte: lastDay } }], InvoiceStatus: 'Accept', PaidORUnpaid: 'Unpaid', ActiveStatus: true, IfDeleted: false }, {}, {}).
        // populate({ path: 'Branch', select: 'BranchName' })
        exec(),
      PaymentManagement.PaymentSchema.find({$and: [{ PaymentDate: { $gte: firstDay } }, { PaymentDate: { $lte: lastDay } }], Payment_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).
        // populate({ path: 'Branch', select: 'BranchName' })
        exec(),
      BusinessAndBranchManagement.BranchSchema.find({ ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      InviteManagement.InviteManagementSchema.find({ Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).populate({ path: 'Branch', select: ['BranchName'] }).exec(),
    ]).then(Response => {
      var BusinessDetails = JSON.parse(JSON.stringify(Response[0]));
      var InvoiceAcceptDetails = JSON.parse(JSON.stringify(Response[1]));
      var OpenInvoiceDetails = JSON.parse(JSON.stringify(Response[2]));
      var PaymentDetails = JSON.parse(JSON.stringify(Response[3]));
      var BranchDetails = JSON.parse(JSON.stringify(Response[4]));
      var InviteDetails = JSON.parse(JSON.stringify(Response[5]));
      if (BusinessDetails.length !== 0) {
        var TodayDate = new Date();
        var MonthlyReports = [];
        BusinessDetails.map(Obj => {
          var rePort = {
            _id: Obj._id,
            BusinessName: Obj.BusinessName,
            File_Name: Obj.Customer.File_Name,
            createdAt: Obj.createdAt,
            PDFFiles: Obj.PDFFiles,
            TopBranches: [],
            BranchDetails: [],
            MonthlyCalendar: []
          };
          // Monthly Calendar View Details
          const BuyerPaymentArr = PaymentDetails.filter(objNew => objNew.BuyerBusiness === Obj._id);
          if (BuyerPaymentArr.length > 0) {
            BuyerPaymentArr.map(ObjIn => {
              rePort.MonthlyCalendar.push({
                'Date': ObjIn.PaymentDate,
                'PaymentAmount': ObjIn.PaymentAmount,
              });
            });
          }
  
          const BuyerBranchArr = BranchDetails.filter(objNew => objNew.Business === Obj._id);
  
          if (BuyerBranchArr.length > 0) {
            BuyerBranchArr.map(ObjBranch => {
              var BranchDetailsObject = {
                BranchName: '',
                BranchWiseDetails: {
                  InVoiceReceivedDetails: 0,
                  InVoiceReceivedCount: 0,
                  PaymentModeDetails: 0,
                  PaymentModeCount: 0,
                  OverDueAmount: 0,
                  OverDueAmountCount: 0,
                  OpenInvoiceAmount: 0,
                  OpenInvoiceCount: 0,
                },
                MonthlyInvoices: [],
                MonthlyPayments: [],
                OutStandingInvoice: [],
                SellerSnapShot: []
              };
  
              var TopBranchesObject = {
                BranchName: '',
                InvoiceAmount: 0,
                PaymentAmount: 0,
                OpenInvoiceAmount: 0,
                OverDueAmount: 0,
              };
  
              var SellerSnapShots = {
                _id: '',
                BranchName: '',
                CreditLimit: 0,
                InvoiceAmount: 0,
                PaymentAmount: 0,
                OutstandingAmount: 0,
                OverDueAmount: 0
              };
  
              // Seller Snapshot
              const SellerSnapShotArr = InviteDetails.filter(objNew => objNew.BuyerBranch === ObjBranch._id);
              var SellerSnapshotDate = new Date();
              var SellerSnapShotPaymentCycle = 0;
              if (SellerSnapShotArr.length > 0) {
                SellerSnapShotArr.map(ObjInvite => {
                  SellerSnapShots._id = ObjInvite.Branch._id;
                  SellerSnapShots.BranchName = ObjInvite.Branch.BranchName;
                  SellerSnapShots.CreditLimit = parseFloat(SellerSnapShots.CreditLimit) + parseFloat(ObjInvite.AvailableLimit);
                  SellerSnapShotPaymentCycle = parseFloat(ObjInvite.BuyerPaymentCycle);
                  const SellerSnapShotInvoiceArr = InvoiceAcceptDetails.filter(objNew => objNew.Branch._id === SellerSnapShots._id);
                  if (SellerSnapShotInvoiceArr.length > 0) {
                    SellerSnapShotInvoiceArr.map(ObjInvoice => {
                      SellerSnapShots.InvoiceAmount = parseFloat(SellerSnapShots.InvoiceAmount) + parseFloat(ObjInvoice.InvoiceAmount);
                    });
                  }
  
                  const SellerSnapShotArr = PaymentDetails.filter(objNew => objNew.Branch._id === SellerSnapShots._id);
                  if (SellerSnapShotArr.length > 0) {
                    SellerSnapShotArr.map(ObjPayment => {
                      SellerSnapShots.PaymentAmount = parseFloat(SellerSnapShots.PaymentAmount) + parseFloat(ObjPayment.PaymentAmount);
                    });
                  }
  
                  const SellersnapShotOpenInvoiceArr = OpenInvoiceDetails.filter(objNew => JSON.parse(JSON.stringify(objNew.Branch._id)) === JSON.parse(JSON.stringify(SellerSnapShots._id)));
                  if (SellersnapShotOpenInvoiceArr.length > 0) {
                    SellersnapShotOpenInvoiceArr.map(ObjOpenInvoice => {
                      SellerSnapShots.OutstandingAmount = parseFloat(SellerSnapShots.OutstandingAmount) + parseFloat(ObjOpenInvoice.AvailableAmount);
                      SellerSnapshotDate = new Date(ObjOpenInvoice.InvoiceDate);
                      SellerSnapshotDate = new Date(SellerSnapshotDate.setDate(SellerSnapshotDate.getDate() + SellerSnapShotPaymentCycle + 1));
                      if (SellerSnapshotDate.valueOf() < TodayDate.valueOf()) {
                        SellerSnapShots.OverDueAmount = parseFloat(SellerSnapShots.OverDueAmount) + parseFloat(ObjInvoice.AvailableAmount);
                      }
                    });
                  }
                });
              }
              SellerSnapShots.CreditLimit = SellerSnapShots.CreditLimit.toFixed(2);
              SellerSnapShots.CreditLimit = parseFloat(SellerSnapShots.CreditLimit);
              SellerSnapShots.InvoiceAmount = SellerSnapShots.InvoiceAmount.toFixed(2);
              SellerSnapShots.InvoiceAmount = parseFloat(SellerSnapShots.InvoiceAmount);
              SellerSnapShots.OverDueAmount = SellerSnapShots.OverDueAmount.toFixed(2);
              SellerSnapShots.OverDueAmount = parseFloat(SellerSnapShots.OverDueAmount);
              SellerSnapShots.PaymentAmount = SellerSnapShots.PaymentAmount.toFixed(2);
              SellerSnapShots.PaymentAmount = parseFloat(SellerSnapShots.PaymentAmount);
              SellerSnapShots.OutstandingAmount = SellerSnapShots.OutstandingAmount.toFixed(2);
              SellerSnapShots.OutstandingAmount = parseFloat(SellerSnapShots.OutstandingAmount);
              BranchDetailsObject.SellerSnapShot.push(SellerSnapShots);
              //
              var InvoiceOverDueDate = new Date();
              TopBranchesObject.BranchName = ObjBranch.BranchName;
              BranchDetailsObject.BranchName = ObjBranch.BranchName;
  
              const BuyerInvoiceArr = InvoiceAcceptDetails.filter(objNew => objNew.BuyerBranch === ObjBranch._id);
              BranchDetailsObject.BranchWiseDetails.InVoiceReceivedCount = BuyerInvoiceArr.length;
              if (BuyerInvoiceArr.length > 0) {
                BuyerInvoiceArr.map(ObjIn => {
                  InvoiceOverDueDate = new Date(ObjIn.InvoiceDate);
                  BranchDetailsObject.BranchWiseDetails.InVoiceReceivedDetails = parseFloat(BranchDetailsObject.BranchWiseDetails.InVoiceReceivedDetails) + parseFloat(ObjIn.InvoiceAmount);
                  TopBranchesObject.InvoiceAmount = parseFloat(TopBranchesObject.InvoiceAmount) + parseFloat(ObjIn.InvoiceAmount);              
                  const BuyerAcceptInviteDetailsArr = InviteDetails.filter(objNew => objNew.BuyerBranch === ObjIn.BuyerBranch);
                  if (BuyerAcceptInviteDetailsArr.length > 0) {
                    BuyerAcceptInviteDetailsArr.map(objOverDate => {
                      InvoiceOverDueDate = new Date(InvoiceOverDueDate.setDate(InvoiceOverDueDate.getDate() + objOverDate.BuyerPaymentCycle));
                    });
                  }
                  BranchDetailsObject.MonthlyInvoices.push({
                    'Date': moment(new Date(ObjIn.InvoiceDate)).format("DD-MM-YYYY"),
                    'SellerBranch': ObjIn.Branch.BranchName,
                    'InvoiceID': ObjIn.InvoiceNumber,
                    "InvoiceAmount": ObjIn.InvoiceAmount,
                    "DueDate": moment(new Date(InvoiceOverDueDate)).format("DD-MM-YYYY")
                  });
                });
              } 
  
              TopBranchesObject.InvoiceAmount = TopBranchesObject.InvoiceAmount.toFixed(2);
              TopBranchesObject.InvoiceAmount = parseFloat(TopBranchesObject.InvoiceAmount);
              BranchDetailsObject.BranchWiseDetails.InVoiceReceivedDetails = BranchDetailsObject.BranchWiseDetails.InVoiceReceivedDetails.toFixed(2);
              BranchDetailsObject.BranchWiseDetails.InVoiceReceivedDetails = parseFloat(BranchDetailsObject.BranchWiseDetails.InVoiceReceivedDetails);
              var OverDueArray = [];
              var OpenOverDueDate = new Date();
              const OpenInvoiceDetailsArr = OpenInvoiceDetails.filter(objNew => objNew.BuyerBranch === ObjBranch._id);
              BranchDetailsObject.BranchWiseDetails.OpenInvoiceCount = OpenInvoiceDetailsArr.length;
              if (OpenInvoiceDetailsArr.length > 0) {
                OpenInvoiceDetailsArr.map(ObjIn => {
                  OpenOverDueDate = new Date(ObjIn.InvoiceDate);
                  TopBranchesObject.OpenInvoiceAmount = parseFloat(TopBranchesObject.OpenInvoiceAmount) + parseFloat(ObjIn.AvailableAmount);
                  BranchDetailsObject.BranchWiseDetails.OpenInvoiceAmount = parseFloat(BranchDetailsObject.BranchWiseDetails.OpenInvoiceAmount) + parseFloat(ObjIn.AvailableAmount);         
                  TopBranchesObject.OpenInvoiceAmount = TopBranchesObject.OpenInvoiceAmount.toFixed(2);
                  TopBranchesObject.OpenInvoiceAmount = parseFloat(TopBranchesObject.OpenInvoiceAmount);
                  const BuyerInviteDetailsArr = InviteDetails.filter(objNew => objNew.BuyerBranch === ObjIn.BuyerBranch);
                  if (BuyerInviteDetailsArr.length > 0) {
                    BuyerInviteDetailsArr.map(objOverDate => {
                      OpenOverDueDate = new Date(OpenOverDueDate.setDate(OpenOverDueDate.getDate() + objOverDate.BuyerPaymentCycle + 1));
                      if (OpenOverDueDate.valueOf() < TodayDate.valueOf()) {
                        BranchDetailsObject.BranchWiseDetails.OverDueAmount = parseFloat(BranchDetailsObject.BranchWiseDetails.OverDueAmount) + parseFloat(ObjIn.AvailableAmount);
                        OverDueArray.push(ObjIn);
                        TopBranchesObject.OverDueAmount = parseFloat(TopBranchesObject.OverDueAmount) + parseFloat(ObjIn.AvailableAmount);
                      }
                      BranchDetailsObject.BranchWiseDetails.OverDueAmountCount = OverDueArray.length;
                      TopBranchesObject.OverDueAmount = TopBranchesObject.OverDueAmount.toFixed(2);
                      TopBranchesObject.OverDueAmount = parseFloat(TopBranchesObject.OverDueAmount);
                    });
                  }
  
                  BranchDetailsObject.OutStandingInvoice.push({
                    'Date': moment(new Date(ObjIn.InvoiceDate)).format("DD-MM-YYYY"),
                    'SellerBranch': ObjIn.Branch.BranchName,
                    'InvoiceID': ObjIn.InvoiceNumber,
                    "InvoiceAmount": ObjIn.InvoiceAmount,
                    "DueDate": moment(new Date(OpenOverDueDate)).format("DD-MM-YYYY")
                  });
                });
              }
  
              var PaymentOverDueDate = new Date();
              const BuyerPaymentDetailsArr = PaymentDetails.filter(objNew => objNew.BuyerBranch === ObjBranch._id);
              BranchDetailsObject.BranchWiseDetails.PaymentModeCount = BuyerPaymentDetailsArr.length;
              if (BuyerPaymentDetailsArr.length > 0) {
                BuyerPaymentDetailsArr.map(ObjIn => {
                  const OpenToPaidForInvoice = OpenInvoiceDetails.filter(objNew => objNew.BuyerBranch === ObjIn.BuyerBranch);
                  if (OpenToPaidForInvoice.length > 0) {
                    OpenToPaidForInvoice.map(ObjPay => {
                      PaymentOverDueDate = new Date(ObjPay.InvoiceDate);
                    });
                  }
                  const BuyerInviteDetailsArr = InviteDetails.filter(objNew => objNew.BuyerBranch === ObjIn.BuyerBranch);
                  if (BuyerInviteDetailsArr.length > 0) {
                    BuyerInviteDetailsArr.map(objOverDate => {
                      PaymentOverDueDate = new Date(PaymentOverDueDate.setDate(PaymentOverDueDate.getDate() + objOverDate.BuyerPaymentCycle));
                    });
                  }
                  TopBranchesObject.PaymentAmount = parseFloat(TopBranchesObject.PaymentAmount) + parseFloat(ObjIn.PaymentAmount);
                  BranchDetailsObject.BranchWiseDetails.PaymentModeDetails = parseFloat(BranchDetailsObject.BranchWiseDetails.PaymentModeDetails) + parseFloat(ObjIn.PaymentAmount);
    
                  TopBranchesObject.PaymentAmount = TopBranchesObject.PaymentAmount.toFixed(2);
                  TopBranchesObject.PaymentAmount = parseFloat(TopBranchesObject.PaymentAmount);
                  BranchDetailsObject.MonthlyPayments.push({
                    'Date': moment(new Date(ObjIn.PaymentDate)).format("DD-MM-YYYY"),
                    'SellerBranch': ObjIn.Branch.BranchName,
                    'PaymentID': ObjIn.PaymentID,
                    'PaymentAmount': ObjIn.PaymentAmount,
                    'DueDate': moment(new Date(PaymentOverDueDate)).format("DD-MM-YYYY")
                  });
                });
              }
              rePort.TopBranches.push(TopBranchesObject);
              rePort.BranchDetails.push(BranchDetailsObject);
            });
          }
  
          MonthlyReports.push(rePort);
        });
        MonthlyReports = MonthlyReports.map(Objb => {
          Objb.TotalInvoiceAmount = 0;
          Objb.TotalPaymentAmount = 0;
          Objb.TotalOpenInvoiceAmount = 0;
          Objb.TotalOverDueAmount = 0;
          Objb.TotalPaymentsAmount = 0;
          if (Objb.MonthlyCalendar.length > 0) {
            Objb.MonthlyCalendar.map(Obj => {
              Obj.Date = new Date(Obj.Date);
              Obj.GetDate = Obj.Date.getDate();
              return Obj;
            });
          }
          Objb.TopBranches.map(ObjTop => {
            if (ObjTop.InvoiceAmount > 0) {
              Objb.TotalInvoiceAmount = parseFloat(Objb.TotalInvoiceAmount) + parseFloat(ObjTop.InvoiceAmount);
              Objb.TotalInvoiceAmount = Objb.TotalInvoiceAmount.toFixed(2);
              Objb.TotalInvoiceAmount = parseFloat(Objb.TotalInvoiceAmount);
            }
            if (ObjTop.PaymentAmount > 0) {
              Objb.TotalPaymentAmount = parseFloat(Objb.TotalPaymentAmount) + parseFloat(ObjTop.PaymentAmount);
              Objb.TotalPaymentAmount = Objb.TotalPaymentAmount.toFixed(2);
              Objb.TotalPaymentAmount = parseFloat(Objb.TotalPaymentAmount);
            }
      
            if (ObjTop.OpenInvoiceAmount > 0) {
              Objb.TotalOpenInvoiceAmount = parseFloat(Objb.TotalOpenInvoiceAmount) + parseFloat(ObjTop.OpenInvoiceAmount);
              Objb.TotalOpenInvoiceAmount = Objb.TotalOpenInvoiceAmount.toFixed(2);
              Objb.TotalOpenInvoiceAmount = parseFloat(Objb.TotalOpenInvoiceAmount);
            }
            if (ObjTop.OverDueAmount > 0) {
              Objb.TotalOverDueAmount = parseFloat(Objb.TotalOverDueAmount) + parseFloat(ObjTop.OverDueAmount);
              Objb.TotalOverDueAmount = Objb.TotalOverDueAmount.toFixed(2);
              Objb.TotalOverDueAmount = parseFloat(Objb.TotalOverDueAmount);
            }
            //  return ObjTop;
          });
          Objb.BranchDetails.map(Obj => {
            Obj.TotalMonthlyInvoices = 0;
            Obj.TotalMonthlyPayments = 0;
            Obj.TotalOutstandingInvoice = 0;
            Obj.SellerSnapShotsTotalInvoiceAmount = 0;
            Obj.SellerSnapShotsPaymentAmount = 0;
            Obj.SellerSnapShotsOutstanding = 0;
            Obj.SellerSnapShotsOverdueAmount = 0;
            if (Obj.InvoiceAmount > 0) {
              Obj.TotalInvoiceAmount = parseFloat(Obj.TotalInvoiceAmount) + parseFloat(Obj.InvoiceAmount);
              Obj.TotalInvoiceAmount = Obj.TotalInvoiceAmount.toFixed(2);
              Obj.TotalInvoiceAmount = parseFloat(Obj.TotalInvoiceAmount);
            }
            if (Obj.PaymentAmount > 0) {
              Obj.TotalPaymentAmount = parseFloat(Obj.TotalPaymentAmount) + parseFloat(Obj.PaymentAmount);
              Obj.TotalPaymentAmount = Obj.TotalPaymentAmount.toFixed(2);
              Obj.TotalPaymentAmount = parseFloat(Obj.TotalPaymentAmount);
            }
      
            if (Obj.OpenInvoiceAmount > 0) {
              Obj.TotalOpenInvoiceAmount = parseFloat(Obj.TotalOpenInvoiceAmount) + parseFloat(Obj.OpenInvoiceAmount);
              Obj.TotalOpenInvoiceAmount = Obj.TotalOpenInvoiceAmount.toFixed(2);
              Obj.TotalOpenInvoiceAmount = parseFloat(Obj.TotalOpenInvoiceAmount);
            }
            if (Obj.OverDueAmount > 0) {
              Obj.TotalOverDueAmount = parseFloat(Obj.TotalOverDueAmount) + parseFloat(Obj.OverDueAmount);
              Obj.TotalOverDueAmount = Obj.TotalOverDueAmount.toFixed(2);
              Obj.TotalOverDueAmount = parseFloat(Obj.TotalOverDueAmount);
            }
      
            Obj.MonthlyInvoices.map(objIn => {
              if (objIn.InvoiceAmount > 0) {
                Obj.TotalMonthlyInvoices = parseFloat(Obj.TotalMonthlyInvoices) + parseFloat(objIn.InvoiceAmount);
                Obj.TotalMonthlyInvoices = Obj.TotalMonthlyInvoices.toFixed(2);
                Obj.TotalMonthlyInvoices = parseFloat(Obj.TotalMonthlyInvoices);
              }
            });
            Obj.MonthlyPayments.map(objPay => {
              if (objPay.PaymentAmount > 0) {
                Obj.TotalMonthlyPayments = parseFloat(Obj.TotalMonthlyPayments) + parseFloat(objPay.PaymentAmount);
                Obj.TotalMonthlyPayments = Obj.TotalMonthlyPayments.toFixed(2);
                Obj.TotalMonthlyPayments = parseFloat(Obj.TotalMonthlyPayments);
                Objb.TotalPaymentsAmount = parseFloat(Objb.TotalPaymentsAmount) + parseFloat(objPay.PaymentAmount);
                Objb.TotalPaymentsAmount = Objb.TotalPaymentsAmount.toFixed(2);
                Objb.TotalPaymentsAmount = parseFloat(Objb.TotalPaymentsAmount);
              }
            });
            Obj.OutStandingInvoice.map(objOut => {
              if (objOut.InvoiceAmount > 0) {
                Obj.TotalOutstandingInvoice = parseFloat(Obj.TotalOutstandingInvoice) + parseFloat(objOut.InvoiceAmount);
                Obj.TotalOutstandingInvoice = Obj.TotalOutstandingInvoice.toFixed(2);
                Obj.TotalOutstandingInvoice = parseFloat(Obj.TotalOutstandingInvoice);
              }
            });
      
            Obj.SellerSnapShot.map(ObjSeller => {
              if (ObjSeller.InvoiceAmount > 0) {
                Obj.SellerSnapShotsTotalInvoiceAmount = parseFloat(Obj.SellerSnapShotsTotalInvoiceAmount) + parseFloat(ObjSeller.InvoiceAmount);
                Obj.SellerSnapShotsTotalInvoiceAmount = Obj.SellerSnapShotsTotalInvoiceAmount.toFixed(2);
                Obj.SellerSnapShotsTotalInvoiceAmount = parseFloat(Obj.SellerSnapShotsTotalInvoiceAmount);
              }
      
              if (ObjSeller.PaymentAmount > 0) {
                Obj.SellerSnapShotsPaymentAmount = parseFloat(Obj.SellerSnapShotsPaymentAmount) + parseFloat(ObjSeller.PaymentAmount);
                Obj.SellerSnapShotsPaymentAmount = Obj.SellerSnapShotsPaymentAmount.toFixed(2);
                Obj.SellerSnapShotsPaymentAmount = parseFloat(Obj.SellerSnapShotsPaymentAmount);
              }
      
              if (ObjSeller.OutstandingAmount > 0) {
                Obj.SellerSnapShotsOutstanding = parseFloat(Obj.SellerSnapShotsOutstanding) + parseFloat(ObjSeller.OutstandingAmount);
                Obj.SellerSnapShotsOutstanding = Obj.SellerSnapShotsOutstanding.toFixed(2);
                Obj.SellerSnapShotsOutstanding = parseFloat(Obj.SellerSnapShotsOutstanding);
              }
      
              if (ObjSeller.OverDueAmount > 0) {
                Obj.SellerSnapShotsOverdueAmount = parseFloat(Obj.SellerSnapShotsOverdueAmount) + parseFloat(ObjSeller.OverDueAmount);
                Obj.SellerSnapShotsOverdueAmount = Obj.SellerSnapShotsOverdueAmount.toFixed(2);
                Obj.SellerSnapShotsOverdueAmount = parseFloat(Obj.SellerSnapShotsOverdueAmount);
              }            
            });
            return Obj;
          });
      
          const d = new Date();
          var dt = new Date();
          var month = dt.getMonth();
          var year = dt.getFullYear();
      
          dt = new Date(year, month, 01);
      
          var first_day = dt.getDay();
          dt.setMonth(month + 1, 0);
          var last_date = dt.getDate();
          var dy = 0;
          var Days1 = [];
          var Days2 = [];
          var Days3 = [];
          var Days4 = [];
          var Days5 = [];
          var Days6 = [];
          for (o = 0; o <= 41; o++) {
            if ((o >= first_day) && (dy <= last_date)) {
              dy = dy + 1;
              if (dy <= last_date) {
                var PaymentTotalAmount = 0;
                if (Days1.length !== 7) {
                  const DayAndAmountArr = Objb.MonthlyCalendar.filter(objNew => JSON.parse(JSON.stringify(objNew.GetDate)) === JSON.parse(JSON.stringify(dy)));
                  if (Days1.length === 0) {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days1.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days1.push({ Day: dy, Amount: null });
                    }
                  } else if (Days1.length === 6) {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days1.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days1.push({ Day: dy, Amount: null });
                    }
                  } else {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days1.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days1.push({ Day: dy, Amount: null });
                    }
                  }
      
                } else if (Days2.length !== 7) {
                  const DayAndAmountArr = Objb.MonthlyCalendar.filter(objNew => JSON.parse(JSON.stringify(objNew.GetDate)) === JSON.parse(JSON.stringify(dy)));
      
                  if (Days2.length === 0) {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days2.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days2.push({ Day: dy, Amount: null });
                    }
                  } else if (Days2.length === 6) {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days2.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days2.push({ Day: dy, Amount: null });
                    }
                  } else {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days2.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days2.push({ Day: dy, Amount: null });
                    }
                  }
                } else if (Days3.length !== 7) {
                  const DayAndAmountArr = Objb.MonthlyCalendar.filter(objNew => JSON.parse(JSON.stringify(objNew.GetDate)) === JSON.parse(JSON.stringify(dy)));
                  if (Days3.length === 0) {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days3.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days3.push({ Day: dy, Amount: null });
                    }
                  } else if (Days3.length === 6) {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days3.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days3.push({ Day: dy, Amount: null });
                    }
                  } else {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days3.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days3.push({ Day: dy, Amount: null });
                    }
                  }
                } else if (Days4.length !== 7) {
                  const DayAndAmountArr = Objb.MonthlyCalendar.filter(objNew => JSON.parse(JSON.stringify(objNew.GetDate)) === JSON.parse(JSON.stringify(dy)));
                  if (Days4.length === 0) {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days4.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days4.push({ Day: dy, Amount: null });
                    }
                  } else if (Days4.length === 6) {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days4.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days4.push({ Day: dy, Amount: null });
                    }
                  } else {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days4.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days4.push({ Day: dy, Amount: null });
      
                    }
                  }
                } else if (Days5.length !== 7) {
                  const DayAndAmountArr = Objb.MonthlyCalendar.filter(objNew => JSON.parse(JSON.stringify(objNew.GetDate)) === JSON.parse(JSON.stringify(dy)));
                  if (Days5.length === 0) {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days5.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days5.push({ Day: dy, Amount: null });
                    }
                  } else if (Days5.length === 6) {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days5.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days5.push({ Day: dy, Amount: null });
                    }
                  } else {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days5.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days5.push({ Day: dy, Amount: null });
                    }
                  }
                } else if (Days6.length !== 7) {
                  const DayAndAmountArr = Objb.MonthlyCalendar.filter(objNew => JSON.parse(JSON.stringify(objNew.GetDate)) === JSON.parse(JSON.stringify(dy)));
                  if (Days6.length === 0) {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days6.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days6.push({ Day: dy, Amount: null });
                    }
                  } else if (Days6.length === 6) {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days6.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days6.push({ Day: dy, Amount: null });
      
                    }
                  } else {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days6.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days6.push({ Day: dy, Amount: null });
                    }
                  }
                }
              }
            } else {
              if (Days1.length !== 7) {
                if (Days1.length === 0) {
                  Days1.push({ Day: '*', Amount: null });
                } else if (Days1.length === 6) {
                  Days1.push({ Day: '*', Amount: null });
                } else {
                  Days1.push({ Day: '*', Amount: null });
                }
              } else if (Days2.length !== 7) {
                if (Days2.length === 0) {
                  Days2.push({ Day: '*', Amount: null });
                } else if (Days2.length === 6) {
                  Days2.push({ Day: '*', Amount: null });
                } else {
                  Days2.push({ Day: '*', Amount: null });
                }
              } else if (Days3.length !== 7) {
                if (Days3.length === 0) {
                  Days3.push({ Day: '*', Amount: null });
                } else if (Days3.length === 6) {
                  Days3.push({ Day: '*', Amount: null });
                } else {
                  Days3.push({ Day: '*', Amount: null });
                }
              } else if (Days4.length !== 7) {
                if (Days4.length === 0) {
                  Days4.push({ Day: '*', Amount: null });
                } else if (Days4.length === 6) {
                  Days4.push({ Day: '*', Amount: null });
                } else {
                  Days4.push({ Day: '*', Amount: null });
                }
              } else if (Days5.length !== 7) {
                if (Days5.length === 0) {
                  Days5.push({ Day: '*', Amount: null });
                } else if (Days5.length === 6) {
                  Days5.push({ Day: '*', Amount: null });
                } else {
                  Days5.push({ Day: '*', Amount: null });
                }
              } else if (Days6.length !== 7) {
                if (Days6.length === 0) {
                  Days6.push({ Day: '*', Amount: null });
                } else if (Days6.length === 6) {
                  Days6.push({ Day: '*', Amount: null });
                } else {
                  Days6.push({ Day: '*', Amount: null });
                }
              }
            }
          }
          const ExtraDays4 = Days4.findIndex(day => day > last_date);
          if (ExtraDays4 >= 0) {
            Days4 = Days4.slice(0, ExtraDays4);
          }
      
          const ExtraDays5 = Days5.findIndex(day => day > last_date);
          if (ExtraDays5 >= 0) {
            Days5 = Days5.slice(0, ExtraDays5);
          }
      
          const ExtraDays6 = Days6.findIndex(day => day > last_date);
          if (ExtraDays6 >= 0) {
            Days6 = Days6.slice(0, ExtraDays6);
          }
      
          if (Days4.length === 1) {
            if (Days4.length !== 7) {
              Days4.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null }
              );
            }
          } else if (Days4.length === 2) {
            if (Days4.length !== 7) {
              Days4.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null }
              );
            }
          } else if (Days4.length === 3) {
            if (Days4.length !== 7) {
              Days4.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null }
              );
            }
          } else if (Days4.length === 4) {
            if (Days4.length !== 7) {
              Days4.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null }
              );
            }
          } else if (Days4.length === 5) {
            if (Days4.length !== 7) {
              Days4.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null }
              );
            }
          } else if (Days4.length === 6) {
            if (Days4.length !== 7) {
              Days4.push(
                { Day: '*', Amount: null }
              );
            }
          }
      
          if (Days5.length === 1) {
            if (Days5.length !== 7) {
              Days5.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null }
              );
            }
          } else if (Days5.length === 2) {
            if (Days5.length !== 7) {
              Days5.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
              );
            }
          } else if (Days5.length === 3) {
            if (Days5.length !== 7) {
              Days5.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
              );
            }
          } else if (Days5.length === 4) {
            if (Days5.length !== 7) {
              Days5.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
              );
            }
          } else if (Days5.length === 5) {
            if (Days5.length !== 7) {
              Days5.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null });
            }
          } else if (Days5.length === 6) {
            if (Days5.length !== 7) {
              Days5.push(
                { Day: '*', Amount: null });
            }
          } else if (Days5.length === 0) {
            Days5.push(
              { Day: '*', Amount: null },
              { Day: '*', Amount: null },
              { Day: '*', Amount: null },
              { Day: '*', Amount: null },
              { Day: '*', Amount: null },
              { Day: '*', Amount: null },
              { Day: '*', Amount: null });
          }
      
          if (Days6.length === 0) {
            Days6.push(
              { Day: '*', Amount: null },
              { Day: '*', Amount: null },
              { Day: '*', Amount: null },
              { Day: '*', Amount: null },
              { Day: '*', Amount: null },
              { Day: '*', Amount: null },
              { Day: '*', Amount: null },
            );
          } else if (Days6.length === 1) {
            if (Days6.length !== 7) {
              Days6.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null });
            }
          } else if (Days6.length === 2) {
            if (Days6.length !== 7) {
              Days6.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null });
            }
          } else if (Days6.length === 3) {
            if (Days6.length !== 7) {
              Days6.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null });
            }
          } else if (Days6.length === 4) {
            if (Days6.length !== 7) {
              Days6.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null });
            }
          } else if (Days6.length === 5) {
            if (Days6.length !== 7) {
              Days6.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null });
            }
          } else if (Days6.length === 6) {
            if (Days6.length !== 7) {
              Days6.push({ Day: '*', Amount: null });
            }
          }
      
      
          Objb.Days1 = Days1;
          Objb.Days2 = Days2;
          Objb.Days3 = Days3;
          Objb.Days4 = Days4;
          Objb.Days5 = Days5;
          Objb.Days6 = Days6;
          return Objb;
        });
          res.status(200).send({ Status: true, Message: 'Business Details', Response: MonthlyReports });
  
      } else {
        res.status(400).send({ Status: false, Message: "Invalid Customer Details!" });
      }
    }).catch (Error => {
      // console.log(Error);
    res.status(400).send({ Status: false, Message: "Some Occurred Error!", Error: Error });
  });
  };

exports.SellerBusinessMonthlyReports = function (req, res) {
    var ReceivingData = req.body;
    var date = new Date();
    var firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    var lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    firstDay = new Date(firstDay.setHours(0, 0, 0, 0));
    lastDay = new Date(lastDay.setHours(23, 59, 59, 999));
    ReceivingData.BusinessId = mongoose.Types.ObjectId(ReceivingData.BusinessId); 
    Promise.all([
    BusinessAndBranchManagement.BusinessSchema.find({_id: ReceivingData.BusinessId, ActiveStatus: true, IfDeleted: false }, {}, {}).
      populate({ path: 'Customer', select: 'File_Name' }).exec(),
    InvoiceManagement.InvoiceSchema.find({$and: [{ InvoiceDate: { $gte: firstDay } }, { InvoiceDate: { $lte: lastDay } }], InvoiceStatus: 'Accept', PaidORUnpaid: 'Paid', ActiveStatus: true, IfDeleted: false }, {}, {}).
        populate({ path: 'BuyerBranch', select: 'BranchName' }).exec(),
    InvoiceManagement.InvoiceSchema.find({$and: [{ InvoiceDate: { $gte: firstDay } }, { InvoiceDate: { $lte: lastDay } }], InvoiceStatus: 'Accept', PaidORUnpaid: 'Unpaid', ActiveStatus: true, IfDeleted: false }, {}, {}).
        populate({ path: 'BuyerBranch', select: 'BranchName' }).exec(),
    PaymentManagement.PaymentSchema.find({$and: [{ PaymentDate: { $gte: firstDay } }, { PaymentDate: { $lte: lastDay } }], Payment_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).
        populate({ path: 'BuyerBranch', select: 'BranchName' }).exec(),
    BusinessAndBranchManagement.BranchSchema.find({ ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
    InviteManagement.InviteManagementSchema.find({ Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).populate({ path: 'BuyerBranch', select: ['BranchName'] }).exec(),
    ]).then(Response => {
      var BusinessDetails = JSON.parse(JSON.stringify(Response[0]));
      var InvoiceAcceptDetails = JSON.parse(JSON.stringify(Response[1]));
      var OpenInvoiceDetails = JSON.parse(JSON.stringify(Response[2]));
      var PaymentDetails = JSON.parse(JSON.stringify(Response[3]));
      var BranchDetails = JSON.parse(JSON.stringify(Response[4]));
      var InviteDetails = JSON.parse(JSON.stringify(Response[5]));
      if (BusinessDetails.length !== 0) {
        var TodayDate = new Date();
        var MonthlyReports = [];
        BusinessDetails.map(Obj => {
          var rePort = {
            _id: Obj._id,
            BusinessName: Obj.BusinessName,
            File_Name: Obj.Customer.File_Name,
            createdAt: Obj.createdAt,
            PDFFiles: Obj.PDFFiles,
            TopBranches: [],
            BranchDetails: [],
            MonthlyCalendar: []
          };
          // Monthly Calendar View Details
          const BuyerPaymentArr = PaymentDetails.filter(objNew => objNew.Business === Obj._id);
          if (BuyerPaymentArr.length > 0) {
            BuyerPaymentArr.map(ObjIn => {
              rePort.MonthlyCalendar.push({
                'Date': ObjIn.PaymentDate,
                'PaymentAmount': ObjIn.PaymentAmount,
              });
            });
          }
  
          const BuyerBranchArr = BranchDetails.filter(objNew => objNew.Business === Obj._id);
  
          if (BuyerBranchArr.length > 0) {
            BuyerBranchArr.map(ObjBranch => {
              var BranchDetailsObject = {
                BranchName: '',
                BranchWiseDetails: {
                  InVoiceReceivedDetails: 0,
                  InVoiceReceivedCount: 0,
                  PaymentModeDetails: 0,
                  PaymentModeCount: 0,
                  OverDueAmount: 0,
                  OverDueAmountCount: 0,
                  OpenInvoiceAmount: 0,
                  OpenInvoiceCount: 0,
                },
                MonthlyInvoices: [],
                MonthlyPayments: [],
                OutStandingInvoice: [],
                SellerSnapShot: []
              };
  
              var TopBranchesObject = {
                BranchName: '',
                InvoiceAmount: 0,
                PaymentAmount: 0,
                OpenInvoiceAmount: 0,
                OverDueAmount: 0,
              };
  
              var SellerSnapShots = {
                _id: '',
                BranchName: '',
                CreditLimit: 0,
                InvoiceAmount: 0,
                PaymentAmount: 0,
                OutstandingAmount: 0,
                OverDueAmount: 0
              };
  
              // Seller Snapshot
              const SellerSnapShotArr = InviteDetails.filter(objNew => objNew.Branch === ObjBranch._id);
              var SellerSnapshotDate = new Date();
              var SellerSnapShotPaymentCycle = 0;
              if (SellerSnapShotArr.length > 0) {
                SellerSnapShotArr.map(ObjInvite => {
                  SellerSnapShots._id = ObjInvite.BuyerBranch._id;
                  SellerSnapShots.BranchName = ObjInvite.BuyerBranch.BranchName;
                  SellerSnapShots.CreditLimit = parseFloat(SellerSnapShots.CreditLimit) + parseFloat(ObjInvite.AvailableLimit);
                  SellerSnapShotPaymentCycle = parseFloat(ObjInvite.BuyerPaymentCycle);
                  const SellerSnapShotInvoiceArr = InvoiceAcceptDetails.filter(objNew => objNew.BuyerBranch._id === SellerSnapShots._id);
                  if (SellerSnapShotInvoiceArr.length > 0) {
                    SellerSnapShotInvoiceArr.map(ObjInvoice => {
                      SellerSnapShots.InvoiceAmount = parseFloat(SellerSnapShots.InvoiceAmount) + parseFloat(ObjInvoice.InvoiceAmount);
                    });
                  }
  
                  const SellerSnapShotArr = PaymentDetails.filter(objNew => objNew.BuyerBranch._id === SellerSnapShots._id);
                  if (SellerSnapShotArr.length > 0) {
                    SellerSnapShotArr.map(ObjPayment => {
                      SellerSnapShots.PaymentAmount = parseFloat(SellerSnapShots.PaymentAmount) + parseFloat(ObjPayment.PaymentAmount);
                    });
                  }
  
                  const SellersnapShotOpenInvoiceArr = OpenInvoiceDetails.filter(objNew => JSON.parse(JSON.stringify(objNew.BuyerBranch._id)) === JSON.parse(JSON.stringify(SellerSnapShots._id)));
                  if (SellersnapShotOpenInvoiceArr.length > 0) {
                    SellersnapShotOpenInvoiceArr.map(ObjOpenInvoice => {
                      SellerSnapShots.OutstandingAmount = parseFloat(SellerSnapShots.OutstandingAmount) + parseFloat(ObjOpenInvoice.AvailableAmount);
                      SellerSnapshotDate = new Date(ObjOpenInvoice.InvoiceDate);
                      SellerSnapshotDate = new Date(SellerSnapshotDate.setDate(SellerSnapshotDate.getDate() + SellerSnapShotPaymentCycle + 1));
                      if (SellerSnapshotDate.valueOf() < TodayDate.valueOf()) {
                        SellerSnapShots.OverDueAmount = parseFloat(SellerSnapShots.OverDueAmount) + parseFloat(ObjOpenInvoice.AvailableAmount);
                      }
                    });
                  }
                });
              }
              SellerSnapShots.CreditLimit = SellerSnapShots.CreditLimit.toFixed(2);
              SellerSnapShots.CreditLimit = parseFloat(SellerSnapShots.CreditLimit);
              SellerSnapShots.InvoiceAmount = SellerSnapShots.InvoiceAmount.toFixed(2);
              SellerSnapShots.InvoiceAmount = parseFloat(SellerSnapShots.InvoiceAmount);
              SellerSnapShots.OverDueAmount = SellerSnapShots.OverDueAmount.toFixed(2);
              SellerSnapShots.OverDueAmount = parseFloat(SellerSnapShots.OverDueAmount);
              SellerSnapShots.PaymentAmount = SellerSnapShots.PaymentAmount.toFixed(2);
              SellerSnapShots.PaymentAmount = parseFloat(SellerSnapShots.PaymentAmount);
              SellerSnapShots.OutstandingAmount = SellerSnapShots.OutstandingAmount.toFixed(2);
              SellerSnapShots.OutstandingAmount = parseFloat(SellerSnapShots.OutstandingAmount);
              BranchDetailsObject.SellerSnapShot.push(SellerSnapShots);
              //
              var InvoiceOverDueDate = new Date();
              TopBranchesObject.BranchName = ObjBranch.BranchName;
              BranchDetailsObject.BranchName = ObjBranch.BranchName;
  
              const BuyerInvoiceArr = InvoiceAcceptDetails.filter(objNew => objNew.Branch === ObjBranch._id);
              BranchDetailsObject.BranchWiseDetails.InVoiceReceivedCount = BuyerInvoiceArr.length;
              if (BuyerInvoiceArr.length > 0) {
                BuyerInvoiceArr.map(ObjIn => {
                  InvoiceOverDueDate = new Date(ObjIn.InvoiceDate);
                  BranchDetailsObject.BranchWiseDetails.InVoiceReceivedDetails = parseFloat(BranchDetailsObject.BranchWiseDetails.InVoiceReceivedDetails) + parseFloat(ObjIn.InvoiceAmount);
                  TopBranchesObject.InvoiceAmount = parseFloat(TopBranchesObject.InvoiceAmount) + parseFloat(ObjIn.InvoiceAmount);              
                  const BuyerAcceptInviteDetailsArr = InviteDetails.filter(objNew => objNew.Branch === ObjIn.Branch);
                  if (BuyerAcceptInviteDetailsArr.length > 0) {
                    BuyerAcceptInviteDetailsArr.map(objOverDate => {
                      InvoiceOverDueDate = new Date(InvoiceOverDueDate.setDate(InvoiceOverDueDate.getDate() + objOverDate.BuyerPaymentCycle));
                    });
                  }
                  BranchDetailsObject.MonthlyInvoices.push({
                    'Date': moment(new Date(ObjIn.InvoiceDate)).format("DD-MM-YYYY"),
                    'SellerBranch': ObjIn.BuyerBranch.BranchName,
                    'InvoiceID': ObjIn.InvoiceNumber,
                    "InvoiceAmount": ObjIn.InvoiceAmount,
                    "DueDate": moment(new Date(InvoiceOverDueDate)).format("DD-MM-YYYY")
                  });
                });
              } 
  
              TopBranchesObject.InvoiceAmount = TopBranchesObject.InvoiceAmount.toFixed(2);
              TopBranchesObject.InvoiceAmount = parseFloat(TopBranchesObject.InvoiceAmount);
              BranchDetailsObject.BranchWiseDetails.InVoiceReceivedDetails = BranchDetailsObject.BranchWiseDetails.InVoiceReceivedDetails.toFixed(2);
              BranchDetailsObject.BranchWiseDetails.InVoiceReceivedDetails = parseFloat(BranchDetailsObject.BranchWiseDetails.InVoiceReceivedDetails);
              var OverDueArray = [];
              var OpenOverDueDate = new Date();
              const OpenInvoiceDetailsArr = OpenInvoiceDetails.filter(objNew => objNew.Branch === ObjBranch._id);
              BranchDetailsObject.BranchWiseDetails.OpenInvoiceCount = OpenInvoiceDetailsArr.length;
              if (OpenInvoiceDetailsArr.length > 0) {
                OpenInvoiceDetailsArr.map(ObjIn => {
                  OpenOverDueDate = new Date(ObjIn.InvoiceDate);
                  TopBranchesObject.OpenInvoiceAmount = parseFloat(TopBranchesObject.OpenInvoiceAmount) + parseFloat(ObjIn.AvailableAmount);
                  BranchDetailsObject.BranchWiseDetails.OpenInvoiceAmount = parseFloat(BranchDetailsObject.BranchWiseDetails.OpenInvoiceAmount) + parseFloat(ObjIn.AvailableAmount);         
                  TopBranchesObject.OpenInvoiceAmount = TopBranchesObject.OpenInvoiceAmount.toFixed(2);
                  TopBranchesObject.OpenInvoiceAmount = parseFloat(TopBranchesObject.OpenInvoiceAmount);
                  const BuyerInviteDetailsArr = InviteDetails.filter(objNew => objNew.Branch === ObjIn.Branch);
                  if (BuyerInviteDetailsArr.length > 0) {
                    BuyerInviteDetailsArr.map(objOverDate => {
                      OpenOverDueDate = new Date(OpenOverDueDate.setDate(OpenOverDueDate.getDate() + objOverDate.BuyerPaymentCycle + 1));
                      if (OpenOverDueDate.valueOf() < TodayDate.valueOf()) {
                        BranchDetailsObject.BranchWiseDetails.OverDueAmount = parseFloat(BranchDetailsObject.BranchWiseDetails.OverDueAmount) + parseFloat(ObjIn.AvailableAmount);
                        OverDueArray.push(ObjIn);
                        TopBranchesObject.OverDueAmount = parseFloat(TopBranchesObject.OverDueAmount) + parseFloat(ObjIn.AvailableAmount);
                      }
                      BranchDetailsObject.BranchWiseDetails.OverDueAmountCount = OverDueArray.length;
                      TopBranchesObject.OverDueAmount = TopBranchesObject.OverDueAmount.toFixed(2);
                      TopBranchesObject.OverDueAmount = parseFloat(TopBranchesObject.OverDueAmount);
                    });
                  }
  
                  BranchDetailsObject.OutStandingInvoice.push({
                    'Date': moment(new Date(ObjIn.InvoiceDate)).format("DD-MM-YYYY"),
                    'SellerBranch': ObjIn.BuyerBranch.BranchName,
                    'InvoiceID': ObjIn.InvoiceNumber,
                    "InvoiceAmount": ObjIn.InvoiceAmount,
                    "DueDate": moment(new Date(OpenOverDueDate)).format("DD-MM-YYYY")
                  });
                });
              }
  
              var PaymentOverDueDate = new Date();
              const BuyerPaymentDetailsArr = PaymentDetails.filter(objNew => objNew.Branch === ObjBranch._id);
              BranchDetailsObject.BranchWiseDetails.PaymentModeCount = BuyerPaymentDetailsArr.length;
              if (BuyerPaymentDetailsArr.length > 0) {
                BuyerPaymentDetailsArr.map(ObjIn => {
                  const OpenToPaidForInvoice = OpenInvoiceDetails.filter(objNew => objNew.Branch === ObjIn.Branch);
                  if (OpenToPaidForInvoice.length > 0) {
                    OpenToPaidForInvoice.map(ObjPay => {
                      PaymentOverDueDate = new Date(ObjPay.InvoiceDate);
                    });
                  }
                  const BuyerInviteDetailsArr = InviteDetails.filter(objNew => objNew.Branch === ObjIn.Branch);
                  if (BuyerInviteDetailsArr.length > 0) {
                    BuyerInviteDetailsArr.map(objOverDate => {
                      PaymentOverDueDate = new Date(PaymentOverDueDate.setDate(PaymentOverDueDate.getDate() + objOverDate.BuyerPaymentCycle));
                    });
                  }
                  TopBranchesObject.PaymentAmount = parseFloat(TopBranchesObject.PaymentAmount) + parseFloat(ObjIn.PaymentAmount);
                  BranchDetailsObject.BranchWiseDetails.PaymentModeDetails = parseFloat(BranchDetailsObject.BranchWiseDetails.PaymentModeDetails) + parseFloat(ObjIn.PaymentAmount);
    
                  TopBranchesObject.PaymentAmount = TopBranchesObject.PaymentAmount.toFixed(2);
                  TopBranchesObject.PaymentAmount = parseFloat(TopBranchesObject.PaymentAmount);
                  BranchDetailsObject.MonthlyPayments.push({
                    'Date': moment(new Date(ObjIn.PaymentDate)).format("DD-MM-YYYY"),
                    'SellerBranch': ObjIn.BuyerBranch.BranchName,
                    'PaymentID': ObjIn.PaymentID,
                    'PaymentAmount': ObjIn.PaymentAmount,
                    'DueDate': moment(new Date(PaymentOverDueDate)).format("DD-MM-YYYY")
                  });
                });
              }
              rePort.TopBranches.push(TopBranchesObject);
              rePort.BranchDetails.push(BranchDetailsObject);
            });
          }
  
          MonthlyReports.push(rePort);
        });
        MonthlyReports = MonthlyReports.map(Objb => {
          Objb.TotalInvoiceAmount = 0;
          Objb.TotalPaymentAmount = 0;
          Objb.TotalOpenInvoiceAmount = 0;
          Objb.TotalOverDueAmount = 0;
          Objb.TotalPaymentsAmount = 0;
          if (Objb.MonthlyCalendar.length > 0) {
            Objb.MonthlyCalendar.map(Obj => {
              Obj.Date = new Date(Obj.Date);
              Obj.GetDate = Obj.Date.getDate();
              return Obj;
            });
          }
          Objb.TopBranches.map(ObjTop => {
            if (ObjTop.InvoiceAmount > 0) {
              Objb.TotalInvoiceAmount = parseFloat(Objb.TotalInvoiceAmount) + parseFloat(ObjTop.InvoiceAmount);
              Objb.TotalInvoiceAmount = Objb.TotalInvoiceAmount.toFixed(2);
              Objb.TotalInvoiceAmount = parseFloat(Objb.TotalInvoiceAmount);
            }
            if (ObjTop.PaymentAmount > 0) {
              Objb.TotalPaymentAmount = parseFloat(Objb.TotalPaymentAmount) + parseFloat(ObjTop.PaymentAmount);
              Objb.TotalPaymentAmount = Objb.TotalPaymentAmount.toFixed(2);
              Objb.TotalPaymentAmount = parseFloat(Objb.TotalPaymentAmount);
            }
      
            if (ObjTop.OpenInvoiceAmount > 0) {
              Objb.TotalOpenInvoiceAmount = parseFloat(Objb.TotalOpenInvoiceAmount) + parseFloat(ObjTop.OpenInvoiceAmount);
              Objb.TotalOpenInvoiceAmount = Objb.TotalOpenInvoiceAmount.toFixed(2);
              Objb.TotalOpenInvoiceAmount = parseFloat(Objb.TotalOpenInvoiceAmount);
            }
            if (ObjTop.OverDueAmount > 0) {
              Objb.TotalOverDueAmount = parseFloat(Objb.TotalOverDueAmount) + parseFloat(ObjTop.OverDueAmount);
              Objb.TotalOverDueAmount = Objb.TotalOverDueAmount.toFixed(2);
              Objb.TotalOverDueAmount = parseFloat(Objb.TotalOverDueAmount);
            }
            //  return ObjTop;
          });
          Objb.BranchDetails.map(Obj => {
            Obj.TotalMonthlyInvoices = 0;
            Obj.TotalMonthlyPayments = 0;
            Obj.TotalOutstandingInvoice = 0;
            Obj.SellerSnapShotsTotalInvoiceAmount = 0;
            Obj.SellerSnapShotsPaymentAmount = 0;
            Obj.SellerSnapShotsOutstanding = 0;
            Obj.SellerSnapShotsOverdueAmount = 0;
            if (Obj.InvoiceAmount > 0) {
              Obj.TotalInvoiceAmount = parseFloat(Obj.TotalInvoiceAmount) + parseFloat(Obj.InvoiceAmount);
              Obj.TotalInvoiceAmount = Obj.TotalInvoiceAmount.toFixed(2);
              Obj.TotalInvoiceAmount = parseFloat(Obj.TotalInvoiceAmount);
            }
            if (Obj.PaymentAmount > 0) {
              Obj.TotalPaymentAmount = parseFloat(Obj.TotalPaymentAmount) + parseFloat(Obj.PaymentAmount);
              Obj.TotalPaymentAmount = Obj.TotalPaymentAmount.toFixed(2);
              Obj.TotalPaymentAmount = parseFloat(Obj.TotalPaymentAmount);
            }
      
            if (Obj.OpenInvoiceAmount > 0) {
              Obj.TotalOpenInvoiceAmount = parseFloat(Obj.TotalOpenInvoiceAmount) + parseFloat(Obj.OpenInvoiceAmount);
              Obj.TotalOpenInvoiceAmount = Obj.TotalOpenInvoiceAmount.toFixed(2);
              Obj.TotalOpenInvoiceAmount = parseFloat(Obj.TotalOpenInvoiceAmount);
            }
            if (Obj.OverDueAmount > 0) {
              Obj.TotalOverDueAmount = parseFloat(Obj.TotalOverDueAmount) + parseFloat(Obj.OverDueAmount);
              Obj.TotalOverDueAmount = Obj.TotalOverDueAmount.toFixed(2);
              Obj.TotalOverDueAmount = parseFloat(Obj.TotalOverDueAmount);
            }
      
            Obj.MonthlyInvoices.map(objIn => {
              if (objIn.InvoiceAmount > 0) {
                Obj.TotalMonthlyInvoices = parseFloat(Obj.TotalMonthlyInvoices) + parseFloat(objIn.InvoiceAmount);
                Obj.TotalMonthlyInvoices = Obj.TotalMonthlyInvoices.toFixed(2);
                Obj.TotalMonthlyInvoices = parseFloat(Obj.TotalMonthlyInvoices);
              }
            });
            Obj.MonthlyPayments.map(objPay => {
              if (objPay.PaymentAmount > 0) {
                Obj.TotalMonthlyPayments = parseFloat(Obj.TotalMonthlyPayments) + parseFloat(objPay.PaymentAmount);
                Obj.TotalMonthlyPayments = Obj.TotalMonthlyPayments.toFixed(2);
                Obj.TotalMonthlyPayments = parseFloat(Obj.TotalMonthlyPayments);
                Objb.TotalPaymentsAmount = parseFloat(Objb.TotalPaymentsAmount) + parseFloat(objPay.PaymentAmount);
                Objb.TotalPaymentsAmount = Objb.TotalPaymentsAmount.toFixed(2);
                Objb.TotalPaymentsAmount = parseFloat(Objb.TotalPaymentsAmount);
              }
            });
            Obj.OutStandingInvoice.map(objOut => {
              if (objOut.InvoiceAmount > 0) {
                Obj.TotalOutstandingInvoice = parseFloat(Obj.TotalOutstandingInvoice) + parseFloat(objOut.InvoiceAmount);
                Obj.TotalOutstandingInvoice = Obj.TotalOutstandingInvoice.toFixed(2);
                Obj.TotalOutstandingInvoice = parseFloat(Obj.TotalOutstandingInvoice);
              }
            });
      
            Obj.SellerSnapShot.map(ObjSeller => {
              if (ObjSeller.InvoiceAmount > 0) {
                Obj.SellerSnapShotsTotalInvoiceAmount = parseFloat(Obj.SellerSnapShotsTotalInvoiceAmount) + parseFloat(ObjSeller.InvoiceAmount);
                Obj.SellerSnapShotsTotalInvoiceAmount = Obj.SellerSnapShotsTotalInvoiceAmount.toFixed(2);
                Obj.SellerSnapShotsTotalInvoiceAmount = parseFloat(Obj.SellerSnapShotsTotalInvoiceAmount);
              }
      
              if (ObjSeller.PaymentAmount > 0) {
                Obj.SellerSnapShotsPaymentAmount = parseFloat(Obj.SellerSnapShotsPaymentAmount) + parseFloat(ObjSeller.PaymentAmount);
                Obj.SellerSnapShotsPaymentAmount = Obj.SellerSnapShotsPaymentAmount.toFixed(2);
                Obj.SellerSnapShotsPaymentAmount = parseFloat(Obj.SellerSnapShotsPaymentAmount);
              }
      
              if (ObjSeller.OutstandingAmount > 0) {
                Obj.SellerSnapShotsOutstanding = parseFloat(Obj.SellerSnapShotsOutstanding) + parseFloat(ObjSeller.OutstandingAmount);
                Obj.SellerSnapShotsOutstanding = Obj.SellerSnapShotsOutstanding.toFixed(2);
                Obj.SellerSnapShotsOutstanding = parseFloat(Obj.SellerSnapShotsOutstanding);
              }
      
              if (ObjSeller.OverDueAmount > 0) {
                Obj.SellerSnapShotsOverdueAmount = parseFloat(Obj.SellerSnapShotsOverdueAmount) + parseFloat(ObjSeller.OverDueAmount);
                Obj.SellerSnapShotsOverdueAmount = Obj.SellerSnapShotsOverdueAmount.toFixed(2);
                Obj.SellerSnapShotsOverdueAmount = parseFloat(Obj.SellerSnapShotsOverdueAmount);
              }            
            });
            return Obj;
          });
      
          const d = new Date();
          var dt = new Date();
          var month = dt.getMonth();
          var year = dt.getFullYear();
      
          dt = new Date(year, month, 01);
      
          var first_day = dt.getDay();
          dt.setMonth(month + 1, 0);
          var last_date = dt.getDate();
          var dy = 0;
          var Days1 = [];
          var Days2 = [];
          var Days3 = [];
          var Days4 = [];
          var Days5 = [];
          var Days6 = [];
          for (o = 0; o <= 41; o++) {
            if ((o >= first_day) && (dy <= last_date)) {
              dy = dy + 1;
              if (dy <= last_date) {
                var PaymentTotalAmount = 0;
                if (Days1.length !== 7) {
                  const DayAndAmountArr = Objb.MonthlyCalendar.filter(objNew => JSON.parse(JSON.stringify(objNew.GetDate)) === JSON.parse(JSON.stringify(dy)));
                  if (Days1.length === 0) {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days1.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days1.push({ Day: dy, Amount: null });
                    }
                  } else if (Days1.length === 6) {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days1.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days1.push({ Day: dy, Amount: null });
                    }
                  } else {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days1.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days1.push({ Day: dy, Amount: null });
                    }
                  }
      
                } else if (Days2.length !== 7) {
                  const DayAndAmountArr = Objb.MonthlyCalendar.filter(objNew => JSON.parse(JSON.stringify(objNew.GetDate)) === JSON.parse(JSON.stringify(dy)));
      
                  if (Days2.length === 0) {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days2.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days2.push({ Day: dy, Amount: null });
                    }
                  } else if (Days2.length === 6) {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days2.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days2.push({ Day: dy, Amount: null });
                    }
                  } else {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days2.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days2.push({ Day: dy, Amount: null });
                    }
                  }
                } else if (Days3.length !== 7) {
                  const DayAndAmountArr = Objb.MonthlyCalendar.filter(objNew => JSON.parse(JSON.stringify(objNew.GetDate)) === JSON.parse(JSON.stringify(dy)));
                  if (Days3.length === 0) {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days3.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days3.push({ Day: dy, Amount: null });
                    }
                  } else if (Days3.length === 6) {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days3.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days3.push({ Day: dy, Amount: null });
                    }
                  } else {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days3.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days3.push({ Day: dy, Amount: null });
                    }
                  }
                } else if (Days4.length !== 7) {
                  const DayAndAmountArr = Objb.MonthlyCalendar.filter(objNew => JSON.parse(JSON.stringify(objNew.GetDate)) === JSON.parse(JSON.stringify(dy)));
                  if (Days4.length === 0) {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days4.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days4.push({ Day: dy, Amount: null });
                    }
                  } else if (Days4.length === 6) {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days4.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days4.push({ Day: dy, Amount: null });
                    }
                  } else {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days4.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days4.push({ Day: dy, Amount: null });
      
                    }
                  }
                } else if (Days5.length !== 7) {
                  const DayAndAmountArr = Objb.MonthlyCalendar.filter(objNew => JSON.parse(JSON.stringify(objNew.GetDate)) === JSON.parse(JSON.stringify(dy)));
                  if (Days5.length === 0) {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days5.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days5.push({ Day: dy, Amount: null });
                    }
                  } else if (Days5.length === 6) {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days5.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days5.push({ Day: dy, Amount: null });
                    }
                  } else {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days5.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days5.push({ Day: dy, Amount: null });
                    }
                  }
                } else if (Days6.length !== 7) {
                  const DayAndAmountArr = Objb.MonthlyCalendar.filter(objNew => JSON.parse(JSON.stringify(objNew.GetDate)) === JSON.parse(JSON.stringify(dy)));
                  if (Days6.length === 0) {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days6.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days6.push({ Day: dy, Amount: null });
                    }
                  } else if (Days6.length === 6) {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days6.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days6.push({ Day: dy, Amount: null });
      
                    }
                  } else {
                    if (DayAndAmountArr.length > 0) {
                      DayAndAmountArr.map(Obj => {
                        PaymentTotalAmount = parseFloat(PaymentTotalAmount) + parseFloat(Obj.PaymentAmount);
                      });
                      PaymentTotalAmount = PaymentTotalAmount.toFixed(2);
                      PaymentTotalAmount = parseFloat(PaymentTotalAmount);
                      Days6.push({ Day: dy, Amount: PaymentTotalAmount });
                    } else {
                      Days6.push({ Day: dy, Amount: null });
                    }
                  }
                }
              }
            } else {
              if (Days1.length !== 7) {
                if (Days1.length === 0) {
                  Days1.push({ Day: '*', Amount: null });
                } else if (Days1.length === 6) {
                  Days1.push({ Day: '*', Amount: null });
                } else {
                  Days1.push({ Day: '*', Amount: null });
                }
              } else if (Days2.length !== 7) {
                if (Days2.length === 0) {
                  Days2.push({ Day: '*', Amount: null });
                } else if (Days2.length === 6) {
                  Days2.push({ Day: '*', Amount: null });
                } else {
                  Days2.push({ Day: '*', Amount: null });
                }
              } else if (Days3.length !== 7) {
                if (Days3.length === 0) {
                  Days3.push({ Day: '*', Amount: null });
                } else if (Days3.length === 6) {
                  Days3.push({ Day: '*', Amount: null });
                } else {
                  Days3.push({ Day: '*', Amount: null });
                }
              } else if (Days4.length !== 7) {
                if (Days4.length === 0) {
                  Days4.push({ Day: '*', Amount: null });
                } else if (Days4.length === 6) {
                  Days4.push({ Day: '*', Amount: null });
                } else {
                  Days4.push({ Day: '*', Amount: null });
                }
              } else if (Days5.length !== 7) {
                if (Days5.length === 0) {
                  Days5.push({ Day: '*', Amount: null });
                } else if (Days5.length === 6) {
                  Days5.push({ Day: '*', Amount: null });
                } else {
                  Days5.push({ Day: '*', Amount: null });
                }
              } else if (Days6.length !== 7) {
                if (Days6.length === 0) {
                  Days6.push({ Day: '*', Amount: null });
                } else if (Days6.length === 6) {
                  Days6.push({ Day: '*', Amount: null });
                } else {
                  Days6.push({ Day: '*', Amount: null });
                }
              }
            }
          }
          const ExtraDays4 = Days4.findIndex(day => day > last_date);
          if (ExtraDays4 >= 0) {
            Days4 = Days4.slice(0, ExtraDays4);
          }
      
          const ExtraDays5 = Days5.findIndex(day => day > last_date);
          if (ExtraDays5 >= 0) {
            Days5 = Days5.slice(0, ExtraDays5);
          }
      
          const ExtraDays6 = Days6.findIndex(day => day > last_date);
          if (ExtraDays6 >= 0) {
            Days6 = Days6.slice(0, ExtraDays6);
          }
      
          if (Days4.length === 1) {
            if (Days4.length !== 7) {
              Days4.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null }
              );
            }
          } else if (Days4.length === 2) {
            if (Days4.length !== 7) {
              Days4.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null }
              );
            }
          } else if (Days4.length === 3) {
            if (Days4.length !== 7) {
              Days4.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null }
              );
            }
          } else if (Days4.length === 4) {
            if (Days4.length !== 7) {
              Days4.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null }
              );
            }
          } else if (Days4.length === 5) {
            if (Days4.length !== 7) {
              Days4.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null }
              );
            }
          } else if (Days4.length === 6) {
            if (Days4.length !== 7) {
              Days4.push(
                { Day: '*', Amount: null }
              );
            }
          }
      
          if (Days5.length === 1) {
            if (Days5.length !== 7) {
              Days5.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null }
              );
            }
          } else if (Days5.length === 2) {
            if (Days5.length !== 7) {
              Days5.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
              );
            }
          } else if (Days5.length === 3) {
            if (Days5.length !== 7) {
              Days5.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
              );
            }
          } else if (Days5.length === 4) {
            if (Days5.length !== 7) {
              Days5.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
              );
            }
          } else if (Days5.length === 5) {
            if (Days5.length !== 7) {
              Days5.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null });
            }
          } else if (Days5.length === 6) {
            if (Days5.length !== 7) {
              Days5.push(
                { Day: '*', Amount: null });
            }
          } else if (Days5.length === 0) {
            Days5.push(
              { Day: '*', Amount: null },
              { Day: '*', Amount: null },
              { Day: '*', Amount: null },
              { Day: '*', Amount: null },
              { Day: '*', Amount: null },
              { Day: '*', Amount: null },
              { Day: '*', Amount: null });
          }
      
          if (Days6.length === 0) {
            Days6.push(
              { Day: '*', Amount: null },
              { Day: '*', Amount: null },
              { Day: '*', Amount: null },
              { Day: '*', Amount: null },
              { Day: '*', Amount: null },
              { Day: '*', Amount: null },
              { Day: '*', Amount: null },
            );
          } else if (Days6.length === 1) {
            if (Days6.length !== 7) {
              Days6.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null });
            }
          } else if (Days6.length === 2) {
            if (Days6.length !== 7) {
              Days6.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null });
            }
          } else if (Days6.length === 3) {
            if (Days6.length !== 7) {
              Days6.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null });
            }
          } else if (Days6.length === 4) {
            if (Days6.length !== 7) {
              Days6.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null },
                { Day: '*', Amount: null });
            }
          } else if (Days6.length === 5) {
            if (Days6.length !== 7) {
              Days6.push(
                { Day: '*', Amount: null },
                { Day: '*', Amount: null });
            }
          } else if (Days6.length === 6) {
            if (Days6.length !== 7) {
              Days6.push({ Day: '*', Amount: null });
            }
          }
      
      
          Objb.Days1 = Days1;
          Objb.Days2 = Days2;
          Objb.Days3 = Days3;
          Objb.Days4 = Days4;
          Objb.Days5 = Days5;
          Objb.Days6 = Days6;
          return Objb;
        });
          res.status(200).send({ Status: true, Message: 'Business Details', Response: MonthlyReports });
  
      } else {
        res.status(400).send({ Status: false, Message: "Invalid Customer Details!" });
      }
    }).catch (Error => {
      // console.log(Error);
    res.status(400).send({ Status: false, Message: "Some Occurred Error!", Error: Error });
  });
  };
 
































