var mongoose = require('mongoose');
var IndustryManagement = require('../../Models/industryManagement.model');
var BusinessManagement = require('../../Models/BusinessAndBranchManagement.model');
var ErrorHandling = require('./../../Handling/ErrorHandling').ErrorHandling;
var UserManagement = require('./../../Models/userManagement.model');


// Create for Industry
exports.Industry_Create = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.Industry_Name || ReceivingData.Industry_Name === '') {
        res.status(400).send({ Status: false, Message: "Industry Name can not be empty" });
    } else if (!ReceivingData.User || ReceivingData.User === '' || ReceivingData.User === null) {
        res.status(400).send({ Status: false, Message: "User Details can not be empty" });
    } else {
        UserManagement.UserManagementSchema.findOne({ _id: ReceivingData.User, Active_Status: true, If_Deleted: false }, {}, {}, function (err, result) {
            if (err) {
                ErrorHandling.ErrorLogCreation(req, 'User Find error', 'UserManagement -> UserDetails', JSON.stringify(err));
                res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find the User Management!.", Error: err });
            } else {
                if (result !== null || result === null) {
                    const Create_Industry = new IndustryManagement.IndustrySchema({
                        Industry_Name: ReceivingData.Industry_Name,
                        Status: ReceivingData.Status || 'InActive',
                        User: ReceivingData.User || null,
                        Active_Status: true,
                        If_Deleted: false
                    });
                    Create_Industry.save(function (err_1, result_1) {
                        if (err) {
                            ErrorHandling.ErrorLogCreation(req, 'Industry Create Error', 'IndustryManagement -> Industry_Create', JSON.stringify(err_1));
                            res.status(417).send({ Status: false, Message: "Some error occurred while Creating the Industry!.", Error: err_1 });
                        } else {
                            res.status(200).send({ Status: true, Response: result_1 });
                        }
                    });

                } else {
                    res.status(417).send({ Status: false, Message: 'Invalid User Details' });
                }
            }
        });
    }
};


// Industry List
exports.All_Industry_List = function (req, res) {
    var ReceivingData = req.body;
        
    if (!ReceivingData.User || ReceivingData.User === '' || ReceivingData.User === null) {
        res.status(400).send({ Status: false, Message: "User Details can not be empty" });
    } else {
        UserManagement.UserManagementSchema.findOne({ _id: ReceivingData.User, Active_Status: true, If_Deleted: false }, {}, {}, function (err, result) {
            if (err) {
                res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find the User Management!.", Error: err });
            } else {
                if (result !== null || result === null) {
                    const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
                    const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
                    var ShortOrder = { createdAt: -1 };
                    var ShortKey = ReceivingData.ShortKey;
                    var ShortCondition = ReceivingData.ShortCondition;
                    if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                        ShortOrder = {};
                        ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
                    }
                    var FindQuery = { 'If_Deleted': false };
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
                        IndustryManagement.IndustrySchema
                            .aggregate([
                                { $match: FindQuery },
                                { $addFields: { Industry_NameSort: { $toLower: "$Industry_Name" } } },
                                { $addFields: { StatusSort: { $toLower: "$Status" } } },
                                {
                                    $project: {
                                        Industry_Name: 1,
                                        Status: 1,
                                        Active_Status: 1,
                                        If_Deleted: 1,
                                        createdAt: 1,
                                        updatedAt: 1
                                    }
                                },
                                { $sort: ShortOrder },
                                { $skip: Skip_Count },
                                { $limit: Limit_Count }
                            ]).exec(),
                        IndustryManagement.IndustrySchema.countDocuments(FindQuery).exec()
                    ]).then(result => {
                        res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
                    }).catch(err => {
                        ErrorHandling.ErrorLogCreation(req, 'Industry List Error', 'IndustryManagement -> Industry_List', JSON.stringify(err));
                        res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Industry Name list!." });
                    });

                } else {
                    res.status(417).send({ Status: false, Message: 'Invalid User Details' });
                }
            }
        });
    }

};


// Industry Details Edit

exports.IndustryDetails_Edit = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.IndustryId || ReceivingData.IndustryId === '') {
        res.status(417).send({ Status: false, Message: "Industry Details can not be empty" });
    } else {
        ReceivingData.IndustryId = mongoose.Types.ObjectId(ReceivingData.IndustryId);
        IndustryManagement.IndustrySchema.findOne({
            _id: ReceivingData.IndustryId,
            Active_Status: true,
            If_Deleted: false,
        }, {}, {}).exec(function (err, result) {
            if (err) {
                ErrorHandling.ErrorLogCreation(req, 'Industry Edit Error', 'IndustryManagement -> Industry_Edit', JSON.stringify(err));
                res.status(417).send({ Status: false, Message: "Some error occurred while Find the Industry Details!.", Error: err });
            } else {
                if (result !== null) {
                    res.status(200).send({ Status: true, Response: result });
                } else {
                    res.status(400).send({ Status: false, Message: "Invalid Industry Details!" });
                }
            }
        });
    }
};


// Industry Details Update

exports.IndustryDetails_Update = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.User || ReceivingData.User === '') {
        res.status(417).send({ Status: false, Message: "User Details can not be empty" });
    } else if (!ReceivingData.IndustryId || ReceivingData.IndustryId === '') {
        res.status(417).send({ Status: false, Message: "Industry Details can not be empty" });
    } else {
        ReceivingData.IndustryId = mongoose.Types.ObjectId(ReceivingData.IndustryId);
        Promise.all([
            UserManagement.UserManagementSchema.findOne({ _id: ReceivingData.User, User_Role: 'Super_Admin' }, {}, {}).exec(),
            IndustryManagement.IndustrySchema.findOne({ _id: ReceivingData.IndustryId, Active_Status: true, If_Deleted: false }, {}, {}).exec(),
        ]).then(Response => {
            var UserDetails = Response[0];
            var IndustryDetails = Response[1];
            if (IndustryDetails !== null && UserDetails !== null) {
                IndustryDetails.Industry_Name = ReceivingData.Industry_Name;
                IndustryDetails.save(function (err, result) {
                    if (err) {
                        ErrorHandling.ErrorLogCreation(req, 'Industry Update Error', 'IndustryManagement -> Industry_Update', JSON.stringify(err));
                        res.status(417).send({ Status: false, Message: "Some error occurred while Creating the Industry Management!.", Error: err });
                    } else {
                        res.status(200).send({ Status: true, Response: result });
                    }
                });
            } else {
                res.status(400).send({ Status: false, Message: "Some Occurred Error!" });
            }
        }).catch(Error => {
            res.status(400).send({ Status: false, Message: "Some Occurred Error!" });
        });
    }
};


//  Industry Active Status

exports.IndustryActiveStatus = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.User || ReceivingData.User === '') {
        res.status(400).send({ Status: false, Message: "User Details can not be empty" });
    } else if (!ReceivingData.IndustryId || ReceivingData.IndustryId === '') {
        res.status(400).send({ Status: false, Message: "Industry Details can not be empty" });
    } else {
        ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
        ReceivingData.IndustryId = mongoose.Types.ObjectId(ReceivingData.IndustryId);
        UserManagement.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {})
            .exec(function (err, result) {
                if (err) {
                    res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
                } else {
                    if (result !== null) {
                        IndustryManagement.IndustrySchema.findOne({ _id: ReceivingData.IndustryId, Active_Status: true, If_Deleted: false }, {}, {})
                            .exec(function (err_1, result_1) {
                                if (err_1) {
                                    ErrorHandling.ErrorLogCreation(req, 'Industry Active Error', 'IndustryManagement -> Industry_Active', JSON.stringify(err));
                                    res.status(417).send({ Status: false, Message: "Some error occurred while Find The Industry Details!.", Error: err_1 });
                                } else {
                                    if (result_1 !== null) {
                                        IndustryManagement.IndustrySchema.updateOne({ _id: result_1._id }, { $set: { Status: ReceivingData.Status } }).exec(function (err_1, result_2) {
                                            if (err_1) {
                                                ErrorHandling.ErrorLogCreation(req, 'Industry Details Error', 'IndustryManagement -> IndustryDetails', JSON.stringify(err_1));
                                                res.status(417).send({ Status: false, Message: "Some error occurred while Find The Industry Details!.", Error: err_1 });
                                            } else {
                                                res.status(200).send({ Status: true, Message: "SuccessFully Updated for Industry Status", });
                                            }
                                        });
                                    } else {
                                        res.status(417).send({ Status: false, Message: 'Invalid Industry Details' });
                                    }
                                }
                            });
                    } else {
                        res.status(417).send({ Status: false, Message: 'Invalid User Details' });
                    }
                }
            });
    }
};


//  Industry InActive Status

exports.IndustryInActiveStatus = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.User || ReceivingData.User === '') {
        res.status(400).send({ Status: false, Message: "User Details can not be empty" });
    } else if (!ReceivingData.IndustryId || ReceivingData.IndustryId === '') {
        res.status(400).send({ Status: false, Message: "Industry Details can not be empty" });
    } else {
        ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
        ReceivingData.IndustryId = mongoose.Types.ObjectId(ReceivingData.IndustryId);

        Promise.all([
            UserManagement.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {}).exec(),
            IndustryManagement.IndustrySchema.findOne({ _id: ReceivingData.IndustryId, Active_Status: true, If_Deleted: false }, {}, {}).exec(),
            BusinessManagement.BusinessSchema.find({Industry: ReceivingData.IndustryId, ActiveStatus: true, IfDeleted: false}, {}, {}).exec(),                
        ]).then(Response => {
            var UserDetails = Response[0];
            var IndustryDetails = Response[1];
            if (UserDetails !== null && IndustryDetails !== null) {
                if (Response[2].length === 0) {
                    IndustryManagement.IndustrySchema.updateOne({ _id: ReceivingData.IndustryId }, { $set: { Status: ReceivingData.Status } }).exec(function (err_1, result_2) {
                        if (err_1) {
                            res.status(417).send({ Status: false, Message: "Some error occurred while Find The Industry Details!.", Error: err_1 });
                        } else {
                            res.status(200).send({ Status: true, Message: "SuccessFully Updated for Industry Status", });
                        }
                    });
                } else {
                    res.status(200).send({ Status: false, Message: "This Industry connected to Business", });
                }
                
            } else {
                res.status(417).send({ Status: false, Message: "Invalid User Details OR Industry Details!." });
            }
        }).catch(Error => {
            res.status(417).send({ Status: false, Message: "Some Occurred Error!.", Error: Error });
        });       
    }
};