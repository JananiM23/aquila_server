var mongoose = require('mongoose');
var CustomersManagement = require('../../Models/CustomerManagement.model');
var BusinessManagement = require('../../Models/BusinessAndBranchManagement.model');
var ErrorHandling = require('../../Handling/ErrorHandling').ErrorHandling;
var CreditManagement = require('../../Models/TemporaryCredit.model');
var InvoiceManagement = require('../../Models/InvoiceManagement.model');
var InviteManagement = require('../../Models/Invite_Management.model');
var moment = require('moment');
var FCM_App = require('../../../Config/fcm_config').CustomerNotify;
var NotificationManagement = require('../../Models/notification_management.model');
var options = {
    priority: 'high',
    timeToLive: 60 * 60 * 24
 };

// Create Temporary Credit Request
exports.TempCreditCreate = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
        res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
    } else if (!ReceivingData.Seller || ReceivingData.Seller === '') {
        res.status(400).send({ Status: false, Message: "Seller can not be empty" });
    } else if (!ReceivingData.RequestLimit || ReceivingData.RequestLimit === '') {
        res.status(400).send({ Status: false, Message: "Request Amount limit can not be empty" });
    } else if (!ReceivingData.RequestPeriod || ReceivingData.RequestPeriod === '') {
        res.status(400).send({ Status: false, Message: "Request Period can not be empty" });
    } else if (!ReceivingData.BuyerBranch || ReceivingData.BuyerBranch === '') {
        res.status(400).send({ Status: false, Message: "Branch can not be empty" });
    } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
        res.status(400).send({ Status: false, Message: "Buyer Business can not be empty" });
    } else if (!ReceivingData.Business || ReceivingData.Business === '') {
        res.status(400).send({ Status: false, Message: "Business can not be empty" });
    } else if (!ReceivingData.Branch || ReceivingData.Branch === '') {
        res.status(400).send({ Status: false, Message: "Branch can not be empty" });
    } else {

        ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
        ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
        ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
        ReceivingData.BuyerBranch = mongoose.Types.ObjectId(ReceivingData.BuyerBranch);
        ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
        ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);
        Promise.all([
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, $or: [{ CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        ]).then(Response => {
            var CustomerDetails = Response[0];
            var SellerDetails = Response[1];
            if (CustomerDetails !== null && SellerDetails !== null) {
                if (CustomerDetails.CustomerType === 'Owner') {
                    ReceivingData.Buyer = mongoose.Types.ObjectId(CustomerDetails._id);
                } else if (CustomerDetails.CustomerType === 'User') {
                    ReceivingData.Buyer = mongoose.Types.ObjectId(CustomerDetails.Owner);
                }

                if (SellerDetails.CustomerType === 'Owner') {
                    ReceivingData.Seller = mongoose.Types.ObjectId(SellerDetails._id);
                } else if (SellerDetails.CustomerType === 'User') {
                    ReceivingData.Seller = mongoose.Types.ObjectId(SellerDetails.Owner);
                }
                Promise.all([
                    CreditManagement.CreditSchema.find({ Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, BuyerBranch: ReceivingData.BuyerBranch, Request_Status: "Accept", Seller: ReceivingData.Seller, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                    InvoiceManagement.InvoiceSchema.find({ Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, InvoiceStatus: "Accept", Seller: ReceivingData.Seller, BuyerBranch: ReceivingData.BuyerBranch, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                    CreditManagement.CreditSchema.find({ Buyer: ReceivingData.Buyer, Request_Status: "Pending", BuyerBusiness: ReceivingData.BuyerBusiness, Seller: ReceivingData.Seller, BuyerBranch: ReceivingData.BuyerBranch, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                    CreditManagement.CreditSchema.findOne({ Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, Seller: ReceivingData.Seller, BuyerBranch: ReceivingData.BuyerBranch, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                ]).then(ResponseRes => {
                    var TemporaryDetails = ResponseRes[0];
                    var InvoiceDetails = ResponseRes[1];
                    var PendingTemporaryDetails = ResponseRes[2];
                    var NewRequestTemporaryDetails = ResponseRes[3];
                    var ExpiryStatus = true;
                    var TempPaymentStatus = true;
                    var TempPendingStatus = true;
                    if (PendingTemporaryDetails.length !== 0 && NewRequestTemporaryDetails !== null) {
                        TempPendingStatus = false;
                    }

                    if (TemporaryDetails.length > 0 && NewRequestTemporaryDetails !== null) {
                        var TodayDate = new Date();
                        var ValidityDate = new Date();
                        TemporaryDetails.map(Obj => {
                            ValidityDate = new Date(Obj.updatedAt);
                            ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + Obj.ApprovedPeriod));
                            if (ValidityDate.valueOf() > TodayDate.valueOf()) {
                                ExpiryStatus = false;
                            }
                        });
                    }

                    if (InvoiceDetails.length > 0 && NewRequestTemporaryDetails !== null) {
                        var UsedForTemporaryAmount = 0;
                        InvoiceDetails.map(obj => {
                            UsedForTemporaryAmount = Math.round(UsedForTemporaryAmount + obj.AvailableAmount);
                        });
                        if (UsedForTemporaryAmount > 0) {
                            TempPaymentStatus = false;
                        } else {
                            ExpiryStatus = true;
                        }
                    }

                    if (ExpiryStatus === true && TempPaymentStatus === true && TempPendingStatus === true) {
                        const Create = new CreditManagement.CreditSchema({
                            Seller: ReceivingData.Seller,
                            Buyer: ReceivingData.Buyer,
                            BuyerBusiness: ReceivingData.BuyerBusiness,
                            BuyerBranch: ReceivingData.BuyerBranch,
                            RequestLimit: ReceivingData.RequestLimit || 0,
                            RequestPeriod: ReceivingData.RequestPeriod,
                            BuyerRemarks: ReceivingData.BuyerRemarks,
                            Business: ReceivingData.Business,
                            Branch: ReceivingData.Branch,
                            ApprovedDate: null,
                            SellerRemarks: '',
                            ApprovedPeriod: 0,
                            ApproveLimit: 0,
                            ApprovedBy: null,
                            Request_Status: 'Pending',
                            PaymentType: '',
                            ActiveStatus: true,
                            IfDeleted: false
                        });
                        Create.save(function (err_2, result_2) {
                            if (err_2) {
                                ErrorHandling.ErrorLogCreation(req, 'Temporary Credit Request Create Error', 'TemporaryManagement.Controller -> TempCredit_Request', JSON.stringify(err_2));
                                res.status(417).send({ Status: false, Message: "Some error occurred while Creating the Temporary Credit Request!.", Error: err_2 });
                            } else {
                                CreditManagement.CreditSchema.findOne({
                                    _id: result_2._id,
                                }, {}, {}).populate({ path: 'BuyerBusiness', select: ['BusinessName'] })
                                    .populate({ path: 'BuyerBranch', select: ['BranchName'] })
                                    .populate({ path: 'Buyer', select: ['ContactName'] })
                                    .populate({ path: 'Seller', select: ['Mobile', 'Firebase_Token'] }).exec(function (err, result) {
                                        if (err) {
                                            ErrorHandling.ErrorLogCreation(req, 'Temporary Management Getting Error', 'TemporaryManagement.Controller -> Request_List', JSON.stringify(err));
                                            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Payment!.", Error: err });
                                        } else {
                                            if (result !== null) {
                                                var SmsMessage = result.Buyer.ContactName + ', ' + result.BuyerBusiness.BusinessName + ', ' + result.BuyerBranch.BranchName + ' has requested temporary credit of Rs. ' + result.RequestLimit + ' for a period of ' + result.RequestPeriod + ' days- Team Hundi';
                                                var CustomerFCMToken = [];
                                                CustomerFCMToken.push(result.Seller.Firebase_Token);
                                                var payload = {
                                                    notification: {
                                                        title: 'Hundi-Team',
                                                        body: result.Buyer.ContactName + ', ' + result.BuyerBusiness.BusinessName + ', ' + result.BuyerBranch.BranchName + ' has requested temporary credit of Rs. ' + result.RequestLimit + ' for a period of ' + result.RequestPeriod + ' days- Team Hundi',
                                                        sound: 'notify_tone.mp3'
                                                    },
                                                    data: {
                                                        Customer: result.Seller._id,
                                                        notification_type: 'TemporaryNotification',
                                                        click_action: 'FCM_PLUGIN_ACTIVITY',
                                                    }
                                                };
                                                if (CustomerFCMToken.length > 0) {
                                                    FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
                                                }

                                                const CreateNotification = new NotificationManagement.NotificationSchema({
                                                    User: null,
                                                    CustomerID: result.Seller._id,
                                                    Notification_Type: 'BuyerTemporaryRequest',
                                                    Message: result.Buyer.ContactName + ', ' + result.BuyerBusiness.BusinessName + ', ' + result.BuyerBranch.BranchName + ' has requested temporary credit of Rs. ' + result.RequestLimit + ' for a period of ' + result.RequestPeriod + ' days- Team Hundi',
                                                    Message_Received: true,
                                                    Message_Viewed: false,
                                                    ActiveStatus: true,
                                                    IfDeleted: false,
                                                });
                                                CreateNotification.save();

                                                const params = new URLSearchParams();
                                                params.append('key', '25ECE50D1A3BD6');
                                                params.append('msg', SmsMessage);
                                                params.append('senderid', 'TXTDMO');
                                                params.append('routeid', '3');
                                                params.append('contacts', result.Seller.Mobile);

                                                // axios.post('https://sms.textmysms.com/app/smsapi/index.php', params).then(function (response) {
                                                //    callback(null, response.data);
                                                //  }).catch(function (error) {
                                                //    callback('Some Error for sending Buyer Invite SMS!, Error: ' + error, null);
                                                //  });
                                            }
                                        }
                                    });
                                res.status(200).send({ Status: true, Http_Code: 200, Response: result_2, Message: "Request Created SuccessFully" });
                            }
                        });
                    } else if (ExpiryStatus === true && TempPaymentStatus === false && TempPendingStatus === true) {
                        res.status(200).send({ Status: true, Http_Code: 201, Message: "Your payment is still pending.Please raise request once your payment is approved." });
                    } else if (ExpiryStatus === true && TempPaymentStatus === true && TempPendingStatus === false) {
                        res.status(200).send({ Status: true, Http_Code: 201, Message: "You either have a pending temp credit payment or your previous temp credit request is still waiting for seller approval." });
                    } else {
                        //Your temporary credit without expired date And Payment was still pending...Once payment And expired date completed after that please raised the temporary request!!!
                        res.status(200).send({ Status: true, Http_Code: 201, Message: "You either have a pending temp credit payment or your previous temp credit request is still waiting for seller approval." });
                    }

                }).catch(ErrorRes => {
                    ErrorHandling.ErrorLogCreation(req, 'Temporary Credit Request Create Error', 'TemporaryManagement.Controller -> TempCredit_Request', JSON.stringify(ErrorRes));
                    res.status(417).send({ Status: false, Message: "Some error occurred !....", Error: ErrorRes });
                });
            } else {
                res.status(417).send({ Status: false, Message: "Invalid Buyer Details Or Seller Details" });
            }
        }).catch(Error => {
            ErrorHandling.ErrorLogCreation(req, 'Temporary Credit Request Create Error', 'TemporaryManagement.Controller -> TempCredit_Request', JSON.stringify(Error));
            res.status(417).send({ Status: false, Message: "Some error occurred !...." });
        });

    }
};

// BuyerBusiness_List
exports.BuyerBusiness_List = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.Customer || ReceivingData.Customer === '') {
        res.status(400).send({ Status: false, Message: "Customer can not be empty" });
    } else if (!ReceivingData.Category || ReceivingData.Category === '') {
        res.status(400).send({ Status: false, Message: "Category can not be empty" });
    } else {
        ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
        Promise.all([
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer }, {}, {}).exec(),
        ]).then(Response => {
            var CustomerDetails = Response[0];
            var BusinessArr = [];
            if (CustomerDetails !== null) {
                if (CustomerDetails.CustomerType === 'Owner') {
                    BusinessManagement.BusinessSchema.find({ IsAssigned: true, IfBuyer: true, Customer: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false },
                        {
                            BusinessName: 1,
                            Customer: 1,
                            AvailableCreditLimit: 1,
                            BusinessCreditLimit: 1,
                            BusinessCategory: 1,
                            Industry: 1,
                        }).populate({ path: "Industry", select: ["Industry_Name"] }).exec((err, result1) => {
                            if (err) {
                                ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
                                res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
                            } else {
                                result1 = JSON.parse(JSON.stringify(result1));
                                res.status(200).send({ Status: true, Message: "My Business list", Response: result1 });
                            }
                        });
                } else if (CustomerDetails.CustomerType === 'User') {
                    if (CustomerDetails.BusinessAndBranches.length !== 0) {
                        CustomerDetails.BusinessAndBranches.map(Obj => {
                            BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                        });
                    }
                    BusinessManagement.BusinessSchema.find({ IsAssigned: true, IfBuyer: true, _id: { $in: BusinessArr }, ActiveStatus: true, IfDeleted: false },
                        {
                            BusinessName: 1,
                            Customer: 1,
                            AvailableCreditLimit: 1,
                            BusinessCreditLimit: 1,
                            BusinessCategory: 1,
                            Industry: 1,
                        }).populate({ path: "Industry", select: ["Industry_Name"] }).exec((err, result1) => {
                            if (err) {
                                ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
                                res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
                            } else {
                                result1 = JSON.parse(JSON.stringify(result1));
                                res.status(200).send({ Status: true, Message: "My Business list", Response: result1 });
                            }
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
                    BusinessManagement.BranchSchema.find({ IsAssigned: true, Customer: ReceivingData.Customer, Business: ReceivingData.Business, ActiveStatus: true, IfDeleted: false },
                        {
                            BranchName: 1,
                            Customer: 1,
                            BranchCreditLimit: 1,
                            BrachCategory: 1,
                            Mobile: 1,
                            Address: 1,
                            RegistrationId: 1,
                            AvailableCreditLimit: 1,
                            GSTIN: 1
                        }).populate({ path: "Customer", select: ["ContactName", "Mobile", "Email", "CustomerCategory", "CustomerType"] })
                        .populate({ path: "Business", select: ['BusinessCategory', "BusinessName", "BusinessCreditLimit", "AvailableCreditLimit"] }).exec((err, result) => {
                            if (err) {
                                ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessAndBranchManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
                                res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
                            } else {
                                result = JSON.parse(JSON.stringify(result));
                                res.status(200).send({ Status: true, Response: result, Message: 'Branches List' });
                            }
                        });
                } else if (CustomerDetails.CustomerType === 'User') {
                    if (CustomerDetails.BusinessAndBranches.length !== 0) {
                        CustomerDetails.BusinessAndBranches.map(Obj => {
                            Obj.Branches.map(obj => {
                                BranchArr.push(mongoose.Types.ObjectId(obj));
                            });
                        });
                    }
                    BusinessManagement.BranchSchema.find({ UserAssigned: true, IsAssigned: true, _id: { $in: BranchArr }, Business: ReceivingData.Business, ActiveStatus: true, IfDeleted: false },
                        {
                            BranchName: 1,
                            Customer: 1,
                            BranchCreditLimit: 1,
                            BrachCategory: 1,
                            Mobile: 1,
                            Address: 1,
                            RegistrationId: 1,
                            AvailableCreditLimit: 1,
                            GSTIN: 1
                        }).populate({ path: "Customer", select: ["ContactName", "Mobile", "Email", "CustomerCategory", "CustomerType"] })
                        .populate({ path: "Business", select: ['BusinessCategory', "BusinessName", "BusinessCreditLimit", "AvailableCreditLimit"] }).exec((err, result) => {
                            if (err) {
                                ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessAndBranchManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
                                res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
                            } else {
                                result = JSON.parse(JSON.stringify(result));
                                res.status(200).send({ Status: true, Response: result, Message: 'Branches List' });
                            }
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

// TemporaryRequestList 
exports.TemporaryRequestList = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
        res.status(400).send({ Status: false, Message: "User Details can not be empty" });
    } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
        res.status(400).send({ Status: false, Message: "User Details can not be empty" });
    } else {
        ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
        CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, CustomerType: 'Owner', ActiveStatus: true, IfDeleted: false }, {}, {}, function (err, result) {
            if (err) {
                ErrorHandling.ErrorLogCreation(req, 'User Find error', 'CustomerManagement -> UserDetails', JSON.stringify(err));
                res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find the User Management!.", Error: err });
            } else {
                if (result !== null) {
                    const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
                    const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
                    var ShortOrder = { createdAt: -1 };
                    var ShortKey = ReceivingData.ShortKey;
                    var ShortCondition = ReceivingData.ShortCondition;
                    if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                        ShortOrder = {};
                        ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
                    }
                    var FindQuery = {};
                    if (ReceivingData.CustomerCategory === 'Seller') {
                        FindQuery = { 
                            'IfDeleted': false,
                             Seller: ReceivingData.CustomerId };
                    } else if (ReceivingData.CustomerCategory === 'Buyer') {
                        ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
                        // ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);
                        FindQuery = { 
                            'IfDeleted': false,
                             Buyer: ReceivingData.CustomerId,
                             BuyerBusiness: ReceivingData.Business,
                            //  BuyerBranch: ReceivingData.Branch,
                                 };
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
                        CreditManagement.CreditSchema
                            .aggregate([
                                { $match: FindQuery },
                                {
                                    $lookup: {
                                        from: "Business",
                                        let: { "business": "$Business" },
                                        pipeline: [
                                            { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                                            { $project: { "BusinessName": 1 } }
                                        ],
                                        as: 'Business'
                                    }
                                },
                                { $unwind: { path: "$Business", preserveNullAndEmptyArrays: true } },
                                {
                                    $lookup: {
                                        from: "Business",
                                        let: { "buyerBusiness": "$BuyerBusiness" },
                                        pipeline: [
                                            { $match: { $expr: { $eq: ["$$buyerBusiness", "$_id"] } } },
                                            { $project: { "BusinessName": 1 } }
                                        ],
                                        as: 'BuyerBusiness'
                                    }
                                },
                                { $unwind: { path: "$BuyerBusiness", preserveNullAndEmptyArrays: true } },
                                // {
                                //     $lookup: {
                                //         from: "Branch",
                                //         let: { "branch": "$Branch" },
                                //         pipeline: [
                                //             { $match: { $expr: { $eq: ["$$branch", "$_id"] } } },
                                //             { $project: { "BranchName": 1, "AvailableCreditLimit": 1 } }
                                //         ],
                                //         as: 'BranchInfo'
                                //     }
                                // },
                                // { $unwind: { path: "$BranchInfo", preserveNullAndEmptyArrays: true } },
                                // {
                                //     $lookup: {
                                //         from: "Branch",
                                //         let: { "buyerBranch": "$BuyerBranch" },
                                //         pipeline: [
                                //             { $match: { $expr: { $eq: ["$$buyerBranch", "$_id"] } } },
                                //             { $project: { "BranchName": 1 } }
                                //         ],
                                //         as: 'BuyerBranchInfo'
                                //     }
                                // },
                                // { $unwind: { path: "$BuyerBranchInfo", preserveNullAndEmptyArrays: true } },
                                {
                                    $lookup: {
                                        from: "Customers",
                                        let: { "seller": "$Seller" },
                                        pipeline: [
                                            { $match: { $expr: { $eq: ["$$seller", "$_id"] } } },
                                            { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                                        ],
                                        as: 'Seller'
                                    }
                                },
                                { $unwind: { path: "$Seller", preserveNullAndEmptyArrays: true } },
                                {
                                    $lookup: {
                                        from: "Customers",
                                        let: { "buyer": "$Buyer" },
                                        pipeline: [
                                            { $match: { $expr: { $eq: ["$$buyer", "$_id"] } } },
                                            { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                                        ],
                                        as: 'Buyer'
                                    }
                                },
                                { $unwind: { path: "$Buyer", preserveNullAndEmptyArrays: true } },
                                {
                                    $project: {
                                        Business: 1,
                                        BuyerBusiness: 1,
                                        // BranchInfo: 1,
                                        // BuyerBranchInfo: 1,
                                        Seller: 1,
                                        Buyer: 1,
                                        ApprovedDate: 1,
                                        RequestLimit: 1,
                                        SellerRemarks: 1,
                                        ApprovedPeriod: 1,
                                        RequestPeriod: 1,
                                        ApproveLimit: 1,
                                        Request_Status: 1,
                                        PaymentType: 1,
                                        BuyerRemarks: 1,
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
                        CreditManagement.CreditSchema.countDocuments(FindQuery).exec()
                    ]).then(result => {
                        res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
                    }).catch(Error => {
                        ErrorHandling.ErrorLogCreation(req, 'Customer Find error', 'CustomerManagement -> All Customer List', JSON.stringify(Error));
                        res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
                    });
                } else {
                    res.status(200).send({ Http_Code: 400, Status: true, Message: 'Invalid User Details' });
                }
            }
        });
    }
};



// Seller Owner View the Credit Request Details
exports.CreditRequest_Update = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.Seller || ReceivingData.Seller === '') {
        res.status(400).send({ Status: false, Message: "Seller can not be empty" });
    } else if (!ReceivingData.RequestId || ReceivingData.RequestId === '') {
        res.status(400).send({ Status: false, Message: "RequestId can not be empty" });
    } else if (!ReceivingData.Request_Status || ReceivingData.Request_Status === '') {
        res.status(400).send({ Status: false, Message: "Request Status can not be empty" });
    } else if (!ReceivingData.SellerRemarks || ReceivingData.SellerRemarks === '') {
        res.status(400).send({ Status: false, Message: "Seller Remarks can not be empty" });
    } else if (!ReceivingData.ApproveLimit || ReceivingData.ApproveLimit === '') {
        res.status(400).send({ Status: false, Message: "Approve Limit can not be empty" });
    } else if (!ReceivingData.ApprovedPeriod || ReceivingData.ApprovedPeriod === '') {
        res.status(400).send({ Status: false, Message: "Approved Period can not be empty" });
    } else if (!ReceivingData.PaymentType || ReceivingData.PaymentType === '') {
        res.status(400).send({ Status: false, Message: "Payment Type can not be empty" });
    } else {
        ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
        ReceivingData.RequestId = mongoose.Types.ObjectId(ReceivingData.RequestId);
        CustomersManagement.CustomerSchema.find({ _id: ReceivingData.Seller, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec((err, result) => {
            if (err) {
                res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Delivery Person Details!.", Error: err });
            } else {
                if (result !== null) {
                    if (result.CustomerType === 'Owner') {
                        ReceivingData.Seller = mongoose.Types.ObjectId(result._id);
                    } else if (result.CustomerType === 'User') {
                        ReceivingData.Seller = mongoose.Types.ObjectId(result.Owner);
                    }
                    CreditManagement.CreditSchema.updateOne(
                        { "_id": ReceivingData.RequestId },
                        {
                            $set: {
                                "Request_Status": ReceivingData.Request_Status,
                                "ApprovedBy": ReceivingData.Seller,
                                "ApprovedDate": new Date(),
                                "SellerRemarks": ReceivingData.SellerRemarks,
                                "ApproveLimit": ReceivingData.ApproveLimit,
                                "ApprovedPeriod": ReceivingData.ApprovedPeriod,
                                "PaymentType": ReceivingData.PaymentType
                            }
                        }
                    ).exec(function (err_1, result_1) {
                        if (err_1) {
                            res.status(417).send({ Status: false, Message: "Some error occurred while Updating the Request Status!.", Error: err_1 });
                        } else {
                            CreditManagement.CreditSchema.findOne({ "_id": ReceivingData.RequestId }, {}, {})
                            .populate({ path: 'Seller', select: 'ContactName' })
                            .populate({ path: 'Business', select: 'BusinessName' })
                            .populate({ path: 'Branch', select: 'BranchName' })
                            .exec((err_2, result_2) => {
                                if (err_2) {
                                    res.status(417).send({ Status: false, Message: "Some error occurred while find Request!.", Error: err_2 });
                                } else {
                                    var BuyerBranchArr = [];
                                    BuyerBranchArr.push(result_2.BuyerBranch);
                                    Promise.all([
                                        CustomersManagement.CustomerSchema.findOne({ _id: result_2.Buyer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                                        CustomersManagement.CustomerSchema.find({ "BusinessAndBranches.Branches": { $in: BuyerBranchArr }, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                                    ]).then(Response => {
                                        var CustomerDetails = JSON.parse(JSON.stringify(Response[0]));
                                        var UserDetails = JSON.parse(JSON.stringify(Response[1]));
                                        if (CustomerDetails !== null) {
                                            var SmsMessage = result_2.Seller.ContactName + ', ' + result_2.Business.BusinessName + ', ' + result_2.Branch.BranchName + ' has approved your request of temporary credit of Rs.' + result_2.ApproveLimit + ' for a period of ' + result_2.ApprovedPeriod + ' days - Team Hundi';
                                            var CustomerFCMToken = [];
                                            CustomerFCMToken.push(CustomerDetails.Firebase_Token);
                                            var payload = {
                                                notification: {
                                                    title: 'Hundi-Team',
                                                    body: result_2.Seller.ContactName + ', ' + result_2.Business.BusinessName + ', ' + result_2.Branch.BranchName + ' has approved your request of temporary credit of Rs.' + result_2.ApproveLimit + ' for a period of ' + result_2.ApprovedPeriod + ' days - Team Hundi',
                                                    sound: 'notify_tone.mp3'
                                                },
                                                data: {
                                                    Customer: CustomerDetails._id,
                                                    notification_type: 'TemporaryNotification',
                                                    click_action: 'FCM_PLUGIN_ACTIVITY',
                                                }
                                            };
                                            if (CustomerFCMToken.length > 0) {
                                                FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
                                            }

                                            const CreateNotification = new NotificationManagement.NotificationSchema({
                                                User: null,
                                                CustomerID: CustomerDetails._id,
                                                Notification_Type: 'SellerTemporaryAccepted',
                                                Message: result_2.Seller.ContactName + ', ' + result_2.Business.BusinessName + ', ' + result_2.Branch.BranchName + ' has approved your request of temporary credit of Rs.' + result_2.ApproveLimit + ' for a period of ' + result_2.ApprovedPeriod + ' days - Team Hundi',
                                                Message_Received: true,
                                                Message_Viewed: false,
                                                ActiveStatus: true,
                                                IfDeleted: false,
                                            });
                                            CreateNotification.save();

                                            const params = new URLSearchParams();
                                            params.append('key', '25ECE50D1A3BD6');
                                            params.append('msg', SmsMessage);
                                            params.append('senderid', 'TXTDMO');
                                            params.append('routeid', '3');
                                            params.append('contacts', CustomerDetails.Mobile);

                                            // axios.post('https://sms.textmysms.com/app/smsapi/index.php', params).then(function (response) {
                                            //    callback(null, response.data);
                                            //  }).catch(function (error) {
                                            //    callback('Some Error for sending Buyer Invite SMS!, Error: ' + error, null);
                                            //  });
                                        }

                                        if (UserDetails.length > 0) {
                                            UserDetails.map(Obj => {
                                                var SmsMessage = result_2.Seller.ContactName + ', ' + result_2.Business.BusinessName + ', ' + result_2.Branch.BranchName + ' has approved your request of temporary credit of Rs.' + result_2.ApproveLimit + ' for a period of ' + result_2.ApprovedPeriod + ' days - Team Hundi';
                                                var CustomerFCMToken = [];
                                                CustomerFCMToken.push(CustomerDetails.Firebase_Token);
                                                var payload = {
                                                    notification: {
                                                        title: 'Hundi-Team',
                                                        body: result_2.Seller.ContactName + ', ' + result_2.Business.BusinessName + ', ' + result_2.Branch.BranchName + ' has approved your request of temporary credit of Rs.' + result_2.ApproveLimit + ' for a period of ' + result_2.ApprovedPeriod + ' days - Team Hundi',
                                                        sound: 'notify_tone.mp3'
                                                    },
                                                    data: {
                                                        Customer: Obj._id,
                                                        notification_type: 'TemporaryNotification',
                                                        click_action: 'FCM_PLUGIN_ACTIVITY',
                                                    }
                                                };
                                                if (CustomerFCMToken.length > 0) {
                                                    FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
                                                }

                                                const CreateNotification = new NotificationManagement.NotificationSchema({
                                                    User: null,
                                                    CustomerID: Obj._id,
                                                    Notification_Type: 'SellerTemporaryAccepted',
                                                    Message: result_2.Seller.ContactName + ', ' + result_2.Business.BusinessName + ', ' + result_2.Branch.BranchName + ' has approved your request of temporary credit of Rs.' + result_2.ApproveLimit + ' for a period of ' + result_2.ApprovedPeriod + ' days - Team Hundi',
                                                    Message_Received: true,
                                                    Message_Viewed: false,
                                                    ActiveStatus: true,
                                                    IfDeleted: false,
                                                });
                                                CreateNotification.save();

                                                const params = new URLSearchParams();
                                                params.append('key', '25ECE50D1A3BD6');
                                                params.append('msg', SmsMessage);
                                                params.append('senderid', 'TXTDMO');
                                                params.append('routeid', '3');
                                                params.append('contacts', Obj.Mobile);

                                                // axios.post('https://sms.textmysms.com/app/smsapi/index.php', params).then(function (response) {
                                                //    callback(null, response.data);
                                                //  }).catch(function (error) {
                                                //    callback('Some Error for sending Buyer Invite SMS!, Error: ' + error, null);
                                                //  });
                                            });
                                        }
                                        res.status(200).send({ Status: true, Response: result_2 });
                                    }).catch(Error => {
                                        res.status(417).send({ Status: false, Message: "Some Occurred Error!." });
                                    });
                                }
                            });                          
                        }
                    });
                } else {
                    res.status(417).send({ Status: false, Message: "Invalid Seller Details!." });
                }
            }
        });
    }
};


exports.SellerAgainstBusinessSimpleList = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.Seller || ReceivingData.Seller === '') {
        res.status(400).send({ Status: false, Message: "Seller can not be empty" });
    } else if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
        res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
    } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
        res.status(400).send({ Status: false, Message: "Buyer Business can not be empty" });
    } else if (!ReceivingData.BuyerBranch || ReceivingData.BuyerBranch === '') {
        res.status(400).send({ Status: false, Message: "Buyer Branch can not be empty" });
    } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
        res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
    } else {
        ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
        ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
        ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
        ReceivingData.BuyerBranch = mongoose.Types.ObjectId(ReceivingData.BuyerBranch);
        CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer }, {}, {}).exec((error, result) => {
            if (error) {
                ErrorHandling.ErrorLogCreation(req, 'Buyer Details List Error', 'InviteManagement.Controller -> BuyerAgainstBusinessList', JSON.stringify(error));
                res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: error });
            } else {
                if (result !== null) {
                    if (result.CustomerType === 'Owner') {
                        ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
                    } else if (result.CustomerType === 'User') {
                        ReceivingData.Buyer = mongoose.Types.ObjectId(result.Owner);
                    }
                    Promise.all([
                        InviteManagement.InviteManagementSchema.find({ Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, BuyerBranch: ReceivingData.BuyerBranch, Seller: ReceivingData.Seller, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {})
                            .populate({ path: "Business", select: ["BusinessName"] }).exec(),
                    ]).then(Response => {
                        var SellerBusinessDetails = JSON.parse(JSON.stringify(Response[0]));
                        if (SellerBusinessDetails.length !== 0) {
                            var BusinessDetails = [];
                            SellerBusinessDetails.map(Obj => {
                                BusinessDetails.push(Obj.Business);
                            });
                            res.status(200).send({ Status: true, Message: 'Your Business List', Response: BusinessDetails });
                        } else {
                            res.status(200).send({ Status: true, Message: "Seller Against Business Simple list", Response: [] });
                        }
                    }).catch(Error => {
                        ErrorHandling.ErrorLogCreation(req, 'Invite Details List Error', 'InviteManagement.Controller -> SellerAgainstBusinessSimpleList', JSON.stringify(Error));
                        res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
                    });
                } else {
                    res.status(417).send({ Status: false, Message: "Invalid Customer details!." });
                }
            }
        });
    }
};

exports.SellerAndBusinessAgainstBranchSimpleList = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.Seller || ReceivingData.Seller === '') {
        res.status(400).send({ Status: false, Message: "Seller can not be empty" });
    } else if (!ReceivingData.Business || ReceivingData.Business === '') {
        res.status(400).send({ Status: false, Message: "Business can not be empty" });
    } else if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
        res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
    } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
        res.status(400).send({ Status: false, Message: "Buyer Business can not be empty" });
    } else if (!ReceivingData.BuyerBranch || ReceivingData.BuyerBranch === '') {
        res.status(400).send({ Status: false, Message: "Buyer Branch can not be empty" });
    } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
        res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
    } else {
        ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
        ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
        ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
        ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
        ReceivingData.BuyerBranch = mongoose.Types.ObjectId(ReceivingData.BuyerBranch);
        CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer }, {}, {}).exec((error, result) => {
            if (error) {
                ErrorHandling.ErrorLogCreation(req, 'Buyer Details List Error', 'InviteManagement.Controller -> BuyerAgainstBusinessList', JSON.stringify(error));
                res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: error });
            } else {
                if (result !== null) {
                    if (result.CustomerType === 'Owner') {
                        ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
                    } else if (result.CustomerType === 'User') {
                        ReceivingData.Buyer = mongoose.Types.ObjectId(result.Owner);
                    }
                    Promise.all([
                        InviteManagement.InviteManagementSchema.find({ Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, BuyerBranch: ReceivingData.BuyerBranch, Seller: ReceivingData.Seller, Business: ReceivingData.Business, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {})
                            .populate({ path: "Branch", select: ["BranchName"] }).exec(),
                    ]).then(Response => {
                        var SellerBranchDetails = JSON.parse(JSON.stringify(Response[0]));
                        if (SellerBranchDetails.length !== 0) {
                            var BranchDetails = [];
                            SellerBranchDetails.map(Obj => {
                                BranchDetails.push(Obj.Branch);
                            });
                            res.status(200).send({ Status: true, Message: 'Your Branch List', Response: BranchDetails });
                        } else {
                            res.status(200).send({ Status: true, Message: "Seller And Business Against Branch Simple list", Response: [] });
                        }
                    }).catch(Error => {
                        ErrorHandling.ErrorLogCreation(req, 'Invite Details List Error', 'InviteManagement.Controller -> SellerAndBusinessAgainstBranchSimpleList', JSON.stringify(Error));
                        res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
                    });
                } else {
                    res.status(417).send({ Status: false, Message: "Invalid Customer details!." });
                }
            }
        });
    }
};