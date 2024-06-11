var UserModel = require('./../../Models/userManagement.model');
var ErrorHandling = require('./../../Handling/ErrorHandling').ErrorHandling;
var NotificationModel = require('../../Models/notification_management.model');
var CryptoJS = require("crypto-js");
var crypto = require("crypto");
var parser = require('ua-parser-js');
var mongoose = require('mongoose');

// User Name Async Validate -----------------------------------------------
exports.User_AsyncValidate = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.User_Name || ReceivingData.User_Name === '') {
        res.status(400).send({ Status: false, Message: "User Name can not be empty" });
    } else {
        UserModel.UserManagementSchema.findOne({ 'User_Name': { $regex: new RegExp("^" + ReceivingData.User_Name + "$", "i") } }, {}, {}, function (err, result) {
            if (err) {
                ErrorHandling.ErrorLogCreation(req, 'User Name Error', 'UserManagement -> UserName_AsyncValidate', JSON.stringify(err));
                res.status(417).send({ status: false, Message: "Some error occurred while Find the User Name!." });
            } else {
                if (result !== null) {
                    res.status(200).send({ Status: true, Available: false });
                } else {
                    res.status(200).send({ Status: true, Available: true });
                }
            }
        });
    }
};

// User Login
exports.AquilaUser_Login = function (req, res) {
    var ReceivingData = req.body;
    var today = new Date();
    today.setHours(today.getHours() - 2);
    UserModel.LoginHistorySchema.updateMany(
        { LastActive: { $lte: today }, Active_Status: true, If_Deleted: false },
        { $set: { Active_Status: false } }
    ).exec();

    if (!ReceivingData.User_Name || ReceivingData.User_Name === '') {
        res.status(400).send({ Status: false, Message: "User Name can not be empty" });
    } else if (!ReceivingData.User_Password || ReceivingData.User_Password === '') {
        res.status(400).send({ Status: false, Message: "User Password can not be empty" });
    } else {
        Promise.all([
            UserModel.UserManagementSchema
                .findOne({
                    'UserName': { $regex: new RegExp("^" + ReceivingData.User_Name + "$", "i") },
                    'Password': ReceivingData.User_Password,
                    'Active_Status': true,
                    'If_Deleted': false
                }, { Password: 0 }, {})
                .exec()
        ]).then(Response => {
            var UserDetails = JSON.parse(JSON.stringify(Response[0]));
            if (UserDetails !== null) {
                if (UserDetails.User_Status === 'Activated') {
                    var RandomToken = crypto.randomBytes(32).toString("hex");
                    var UserData = JSON.parse(JSON.stringify(UserDetails));
                    UserData.Token = RandomToken;
                    var UserHash = CryptoJS.SHA512(JSON.stringify(UserData)).toString(CryptoJS.enc.Hex);
                    var Ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
                    var DeviceInfo = parser(req.headers['user-agent']);
                    var LoginFrom = JSON.stringify({
                        Ip: Ip,
                        Request_From_Origin: req.headers.origin,
                        Request_From: req.headers.referer,
                        Request_Url: req.url,
                        Request_Body: req.body,
                        If_Get: req.params,
                        Device_Info: DeviceInfo,
                    });
                    var LoginHistory = new UserModel.LoginHistorySchema({
                        User: UserDetails._id,
                        LoginToken: RandomToken,
                        Hash: UserHash,
                        LastActive: new Date(),
                        LoginFrom: LoginFrom,
                        Active_Status: true,
                        If_Deleted: false,
                    });
                    LoginHistory.save((err_2, result_2) => {
                        if (err_2) {
                            ErrorHandling.ErrorLogCreation(req, 'User Login Create Error', 'UserLoginManagement -> UserLogin_Create', JSON.stringify(err_2));
                            res.status(417).send({ Status: false, Message: "Some error occurred while Validate Update the User Details!" });
                        } else {
                            var ReturnResponse = CryptoJS.AES.encrypt(JSON.stringify(UserDetails), RandomToken.slice(3, 10)).toString();
                            res.status(200).send({ Status: true, Key: RandomToken, Response: ReturnResponse });
                        }
                    });
                } else {
                    res.status(200).send({ Status: false, Message: "Your Account has Deactivated or Removed!" });
                }
            } else {
                res.status(200).send({ Status: false, Message: "Invalid Customer Details!" });
            }
        }).catch(Error => {
            // console.log(Error);
            ErrorHandling.ErrorLogCreation(req, 'User Login Error', 'UserManagement -> User_Login', JSON.stringify(Error));
            res.status(417).send({ Status: false, Message: "Some error occurred while Validate The User Details!." });
        });
    }
};

// User Create ---------------------------------------------
exports.User_Create = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.User || ReceivingData.User === '') {
        res.status(400).send({ Status: false, Message: "Admin Details can not be empty" });
    } else if (!ReceivingData.UserName || ReceivingData.UserName === '') {
        res.status(400).send({ Status: false, Message: "User Name can not be empty" });
    } else if (!ReceivingData.Password || ReceivingData.Password === '') {
        res.status(400).send({ Status: false, Message: "Password  can not be empty" });
    } else {
        ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
        UserModel.UserManagementSchema.findOne({ _id: ReceivingData.User, User_Role: 'Super_Admin' }, {}, {}, function (err, result) {
            if (err) {
                ErrorHandling.ErrorLogCreation(req, 'AquilaUser Login Error', 'UserManagement -> AquilaUser_Create', JSON.stringify(err));
                res.status(417).send({ Status: false, Message: "Super Admin Only can create User!.", Error: err });
            } else {
                UserModel.UserManagementSchema.findOne({}, {}, { 'sort': { createdAt: -1 } }, function (err_1, result_1) {
                    if (err_1) {
                        res.status(417).send({ Status: false, Message: "Some error occurred while Find the User!.", Error: err_1 });
                    } else {
                        const Create_User = new UserModel.UserManagementSchema({
                            Name: ReceivingData.Name || '',
                            UserName: ReceivingData.UserName || '',
                            Password: ReceivingData.Password || '',
                            Phone: ReceivingData.Phone || '',
                            Email: ReceivingData.Email || '',
                            Gender: ReceivingData.Gender,
                            User_Role: ReceivingData.User_Role || '',
                            User_Status: ReceivingData.User_Status || 'Activated',
                            ApprovedBy_User: ReceivingData.User || null,
                            Active_Status: true,
                            If_Deleted: false
                        });
                        Create_User.save(function (err_2, result_2) {
                            if (err_2) {
                                ErrorHandling.ErrorLogCreation(req, 'User Create Error', 'UserManagement -> User_Create', JSON.stringify(err_2));
                                res.status(417).send({ Status: false, Message: "Some error occurred while Creating the User Management!.", Error: err_2 });
                            } else {
                                res.status(200).send({ Status: true, Response: result_2 });
                            }
                        });

                    }
                });

            }
        });
    }
};

// All User View List
exports.Users_List = function (req, res) {
    var ReceivingData = req.body;

    UserModel.UserManagementSchema.findOne({ Active_Status: true, If_Deleted: false, User_Role: 'Super_Admin' }, {}, {}, function (err, result) {
        if (err) {
            ErrorHandling.ErrorLogCreation(req, 'User List Error', 'UserManagement -> User_List', JSON.stringify(err));
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find the User Management!.", Error: err });
        } else {
            if (result !== null) {

                const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
                const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
                var ShortOrder = { createdAt: -1 };
                var ShortKey = ReceivingData.ShortKey;
                var ShortCondition = ReceivingData.ShortCondition;
                var FindQuery = { 'If_Deleted': false };
                if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                    ShortOrder = {};
                    ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
                }
                if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object' && ReceivingData.FilterQuery !== null && ReceivingData.FilterQuery.length > 0) {
                    ReceivingData.FilterQuery.map(obj => {
                        if (obj.Type === 'String') {
                            FindQuery[obj.DBName] = { $regex: new RegExp(".*" + obj.Value + ".*", "i") };
                        }
                        if (obj.Type === 'Number') {
                            FindQuery[obj.DBName] = parseInt(obj.Value, 10);
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
                    });
                }
                Promise.all([
                    UserModel.UserManagementSchema
                        .aggregate([
                            { $match: FindQuery },
                            { $addFields: { NameSort: { $toLower: "$Name" } } },
                            { $addFields: { UserName: { $toLower: "$UserName" } } },
                            { $addFields: { User_RoleSort: { $toLower: "$User_Role" } } },
                            { $addFields: { User_StatusSort: { $toLower: "$User_Status" } } },
                            {
                                $project: {
                                    Phone: 1,
                                    Name: 1,
                                    Active_Status: 1,
                                    Password: 1,
                                    Email: 1,
                                    Gender: 1,
                                    UserName: 1,
                                    User_Role: 1,
                                    User_Status: 1,
                                    createdAt: 1,
                                    updatedAt: 1
                                }
                            },
                            { $sort: ShortOrder },
                            { $skip: Skip_Count },
                            { $limit: Limit_Count }
                        ]).exec(),
                    UserModel.UserManagementSchema.countDocuments(FindQuery).exec()
                ]).then(result => {
                    res.status(200).send({ Http_Code: 200, Status: true, Response: result[0], Message: "Aquila Users List", SubResponse: result[1] });
                }).catch(err => {
                    ErrorHandling.ErrorLogCreation(req, 'User List Error', 'UserManagement -> User_List', JSON.stringify(err));
                    res.status(417).send({ Http_Code: 417, Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Delivery Lines list!." });
                });
            } else {
                res.status(200).send({ Http_Code: 400, Status: true, Message: 'Invalid User Details' });
            }
        }
    });

};

// User Update ---------------------------------------------
exports.User_Update = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.User || ReceivingData.User === '') {
        res.status(400).send({ Status: false, Message: "User Details can not be empty" });
    } else {
        UserModel.UserManagementSchema.updateOne(
            { "_id": mongoose.Types.ObjectId(ReceivingData.User) },
            {
                $set: {
                    "Name": ReceivingData.Name,
                    "UserName": ReceivingData.UserName,
                    "Password": ReceivingData.Password,
                    "Phone": ReceivingData.Phone,
                    "User_Role": ReceivingData.User_Role,
                    'Email': ReceivingData.Email,
                    "Gender": ReceivingData.Gender,
                }
            }
        ).exec(function (err, result) {
            if (err) {
                ErrorHandling.ErrorLogCreation(req, 'User Update Error', 'UserManagement -> User_Update', JSON.stringify(err));
                res.status(417).send({ Status: false, Message: "Some error occurred while Updating the User details!.", Error: err });
            } else {
                UserModel.UserManagementSchema.findOne({ "_id": mongoose.Types.ObjectId(ReceivingData.UserId) }, {}, {}, function (err_1, result_1) {
                    if (err_1) {
                        ErrorHandling.ErrorLogCreation(req, 'User Details Error', 'UserManagement -> User_Details', JSON.stringify(err_1));
                        res.status(417).send({ Status: false, Message: "Some error occurred while Find User Details!.", Error: err_1 });
                    } else {
                        res.status(200).send({ Status: true, Response: result_1 });
                    }
                });
            }
        });
    }
};

// User Active
exports.User_Active = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.User || ReceivingData.User === '') {
        res.status(400).send({ Status: false, Message: "Super Admin Details can not be empty" });
    } else if (!ReceivingData.UserId || ReceivingData.UserId === '') {
        res.status(400).send({ Status: false, Message: "UserId Details can not be empty" });
    } else if (!ReceivingData.User_Status || ReceivingData.User_Status === '') {
        res.status(400).send({ Status: false, Message: "User Status can not be empty" });
    } else {
        ReceivingData.UserId = mongoose.Types.ObjectId(ReceivingData.UserId);
        ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);

        UserModel.UserManagementSchema.findOne({ _id: ReceivingData.User, User_Role: 'Super_Admin' }, {}, {})
            .exec(function (err, result) {
                if (err) {
                    ErrorHandling.ErrorLogCreation(req, 'User Active Error', 'UserManagement -> User_Active', JSON.stringify(err));
                    res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
                } else {
                    if (result !== null) {
                        UserModel.UserManagementSchema.findOne({ _id: ReceivingData.UserId }, {}, {})
                            .exec(function (err_1, result_1) {
                                if (err_1) {
                                    ErrorHandling.ErrorLogCreation(req, 'User Details Error', 'UserManagement -> User_Details', JSON.stringify(err_1));
                                    res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err_1 });
                                } else {
                                    if (result_1 !== null) {
                                        UserModel.UserManagementSchema.updateOne({ _id: ReceivingData.UserId },
                                            {
                                                $set: {
                                                    User_Status: ReceivingData.User_Status,
                                                    ApprovedBy_User: ReceivingData.User,
                                                }
                                            }).exec();
                                        res.status(200).send({ Status: true, Message: 'User Account has been Activated' });

                                    } else {
                                        res.status(417).send({ Status: false, Message: 'Invalid User Details' });
                                    }
                                }
                            });
                    }
                }
            });


    }
};

// User Inactive
exports.User_Inactive = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.User || ReceivingData.User === '') {
        res.status(400).send({ Status: false, Message: "Super Admin Details can not be empty" });
    } else if (!ReceivingData.UserId || ReceivingData.UserId === '') {
        res.status(400).send({ Status: false, Message: "UserId Details can not be empty" });
    } else if (!ReceivingData.User_Status || ReceivingData.User_Status === '') {
        res.status(400).send({ Status: false, Message: "User Status can not be empty" });
    } else {
        ReceivingData.UserId = mongoose.Types.ObjectId(ReceivingData.UserId);
        ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);

        UserModel.UserManagementSchema.findOne({ _id: ReceivingData.User, User_Role: 'Super_Admin' }, {}, {})
            .exec(function (err, result) {
                if (err) {
                    ErrorHandling.ErrorLogCreation(req, 'User InActive Error', 'UserManagement -> User_InActive', JSON.stringify(err));
                    res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
                } else {
                    if (result !== null) {
                        UserModel.UserManagementSchema.findOne({ _id: ReceivingData.UserId }, {}, {})
                            .exec(function (err_1, result_1) {
                                if (err_1) {
                                    ErrorHandling.ErrorLogCreation(req, 'User Active Error', 'UserManagement -> User_Active', JSON.stringify(err_1));
                                    res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err_1 });
                                } else {
                                    if (result_1 !== null) {
                                        UserModel.UserManagementSchema.updateOne({ _id: ReceivingData.UserId },
                                            {
                                                $set: {
                                                    User_Status: ReceivingData.User_Status,
                                                    ApprovedBy_User: ReceivingData.User,
                                                }
                                            }).exec();
                                        res.status(200).send({ Status: true, Message: 'User Account has been Activated' });

                                    } else {
                                        res.status(417).send({ Status: false, Message: 'Invalid User Details' });
                                    }
                                }
                            });
                    }
                }
            });


    }
};


// All Notifications List
exports.All_Notifications_List = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.User || ReceivingData.User === '') {
        res.status(400).send({ Status: false, Message: "User Details can not be empty" });
    } else {
        ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
        NotificationModel.NotificationSchema.find({
            $or: [{Notification_Type: "SupportCreate"}, {Notification_Type: "SupportCustomerReply"}],
            ActiveStatus: true, IfDeleted: false
        }, {}, { 'sort': { createdAt: -1 } })
            .exec(function (err, result) {
                if (err) {
                    res.status(417).send({ Status: false, Message: "Some error occurred while Find The Notification Details!.", Error: err });
                } else {
                    var Notification_Ids = [];
                    result.map(obj => {
                        Notification_Ids.push(obj._id);
                    });
                    NotificationModel.NotificationSchema.updateMany({ _id: { $in: Notification_Ids } }, { $set: { Message_Received: true } }).exec();
                    res.status(200).send({ Status: true, Response: result });
                }
            });
    }
};


//Notification Counts
exports.Notification_Counts = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.User || ReceivingData.User === '') {
        res.status(400).send({ Status: false, Message: "User Details can not be empty" });
    } else {
        NotificationModel.NotificationSchema.countDocuments({
            $or: [{Notification_Type: "SupportCreate"}, {Notification_Type: "SupportCustomerReply"}],
            Message_Viewed: false,
            ActiveStatus: true,
            IfDeleted: false
        }).exec((err, result) => {
            if (err) {
                res.status(417).send({ Status: false, Message: "Some error occurred while Find The Notification Details!.", Error: err });
            } else {
                res.status(200).send({ Status: true, Response: result });
            }
        });
    }
};


// Delete All Read Notifications
exports.DeleteAllReadNotifications = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.User || ReceivingData.User === '') {
        res.status(400).send({ Status: false, Message: "User Details can not be empty" });
    } else {
        ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
        NotificationModel.NotificationSchema.updateMany({
            $or: [{Notification_Type: "SupportCreate"}, {Notification_Type: "SupportCustomerReply"}],
            Message_Viewed: true,
            ActiveStatus: true, IfDeleted: false
        }, { $set: { IfDeleted: true } })
            .exec(function (err, result) {
                if (err) {
                    res.status(417).send({ Status: false, Message: "Some error occurred while Find The Notification Details!.", Error: err });
                } else {
                    res.status(200).send({ Status: true, Message: "Successfully Update for Notification", Response: result });
                }
            });
    }
};



// Mark All As Read Notifications
exports.MarkAllAsReadNotifications = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.User || ReceivingData.User === '') {
        res.status(400).send({ Status: false, Message: "User Details can not be empty" });
    } else {
        ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
        NotificationModel.NotificationSchema.updateMany({
            $or: [{Notification_Type: "SupportCreate"}, {Notification_Type: "SupportCustomerReply"}],
            ActiveStatus: true, IfDeleted: false
        }, { $set: { Message_Viewed: true } })
            .exec(function (err, result) {
                if (err) {
                    res.status(417).send({ Status: false, Message: "Some error occurred while Find The Notification Details!.", Error: err });
                } else {
                    res.status(200).send({ Status: true, Message: "SuccessFully Mark All As Read Notification", Response: result });
                }
            });
    }
};


exports.Read_Notification = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.User || ReceivingData.User === '') {
        res.status(400).send({ Status: false, Message: "User Details can not be empty" });
    } else if (!ReceivingData.Notification || ReceivingData.Notification === '') {
        res.status(400).send({ Status: false, Message: "Notification Details can not be empty" });
    } else {
        ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
        NotificationModel.NotificationSchema.updateOne({
            _id: mongoose.Types.ObjectId(ReceivingData.Notification),
            ActiveStatus: true, IfDeleted: false
        }, { $set: { Message_Viewed: true } })
            .exec(function (err, result) {
                if (err) {
                    res.status(417).send({ Status: false, Message: "Some error occurred while Find The Notification Details!.", Error: err });
                } else {
                    res.status(200).send({ Status: true, Message: "SuccessFully Read Notification" });
                }
            });
    }
};

