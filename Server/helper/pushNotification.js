var CustomerManagement = require('./../Models/CustomerManagement.model');
var InvoiceManagement = require('./../Models/InvoiceManagement.model');
var PaymentManagement = require('./../Models/PaymentManagement.model');
var TemporaryManagement = require('./../Models/TemporaryCredit.model');
var InviteManagement = require('./../Models/Invite_Management.model');
var BusinessAndBranchManagement = require('./../Models/BusinessAndBranchManagement.model');
var mongoose = require('mongoose');
var FCM_App = require('../../Config/fcm_config').CustomerNotify;
var CronJob = require('cron').CronJob;

var PushNotification = {
    PaymentReminderFunction: function (req, res) {
        var PaymentReminder = new CronJob('* * 10 * * *', function () {
            Promise.all([
                InvoiceManagement.InvoiceSchema.find({ PaidORUnpaid: "Unpaid", InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false }, {}, {})
                    .populate({ path: "Business", select: ["FirstName","LastName"] })
                    .populate({ path: "Buyer", select: ["Firebase_Token", "Device_Id", "Device_Type"] })
                    .populate({ path: "Seller", select: ["Firebase_Token", "Device_Id", "Device_Type"] })
                    .populate({ path: "BuyerBusiness", select: ["FirstName","LastName"] }).exec(),
                InviteManagement.InviteManagementSchema.find({ Invite_Status: "Accept" }, {}, {}).exec(),
            ]).then(Response => {
                var InvoiceDetails = JSON.parse(JSON.stringify(Response[0]));
                var InviteDetails = JSON.parse(JSON.stringify(Response[1]));
                var OverDueInvoiceArr = [];
                var MoreThanThreeDays = [];
                if (InvoiceDetails.length !== 0) {
                    InvoiceDetails.map(Obj => {
                        var InvoiceDate = new Date();
                        var TodayDate = new Date();
                        var InvoiceInDueThreeDays = new Date();
                        InvoiceDate = new Date(Obj.updatedAt);
                        InvoiceInDueThreeDays = new Date(Obj.updatedAt);
                        const InviteDetailsArr = InviteDetails.filter(obj1 => obj1.BuyerBranch === Obj.BuyerBranch._id);
                        if (InviteDetailsArr.length > 0) {
                            var ValidityDate = new Date();
                            InviteDetailsArr.map(ObjIn => {
                                ValidityDate = new Date(ObjIn.updatedAt);
                                ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + ObjIn.BuyerPaymentCycle - 1));
                                InvoiceDate = new Date(InvoiceDate.setDate(InvoiceDate.getDate() + ObjIn.BuyerPaymentCycle - 1));
                                InvoiceInDueThreeDays = new Date(InvoiceInDueThreeDays.setDate(InvoiceInDueThreeDays.getDate() + ObjIn.BuyerPaymentCycle) + 3 - 1);
                            });
                        }
                        if (InvoiceDate.valueOf() <= TodayDate.valueOf()) {
                            OverDueInvoiceArr.push(Obj);
                        }

                        if (InvoiceInDueThreeDays.valueOf() === TodayDate.valueOf()) {
                            MoreThanThreeDays.push(Obj);
                        }
                    });

                    if (OverDueInvoiceArr.length !== 0 && MoreThanThreeDays === 0) {
                        OverDueInvoiceArr = JSON.parse(JSON.stringify(OverDueInvoiceArr));

                        Promise.all(
                            OverDueInvoiceArr.map(Obj => {
                                CustomerManagement.CustomerSchema.find({ _id: Obj.Buyer._id, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                                    CustomerManagement.CustomerSchema.find({ Owner: Obj.Buyer._id, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                                    CustomerManagement.CustomerSchema.find({ _id: Obj.Seller._id, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                                    CustomerManagement.CustomerSchema.find({ Owner: Obj.Seller._id, ActiveStatus: true, IfDeleted: false }, {}, {}).exec()
                            })
                        ).then(ResponseNotification => {
                            var BuyerOwnerDetails = JSON.parse(JSON.stringify(ResponseNotification[0]));
                            var BuyerUserDetails = JSON.parse(JSON.stringify(ResponseNotification[1]));
                            var SellerOwnerDetails = JSON.parse(JSON.stringify(ResponseNotification[2]));
                            var SellerUserDetails = JSON.parse(JSON.stringify(ResponseNotification[3]));
                            var BuyerCustomerFCMToken = [];
                            var SellerCustomerFCMToken = [];

                            if (BuyerOwnerDetails.length > 0) {
                                BuyerOwnerDetails.map(Obj => {
                                    BuyerCustomerFCMToken.push(Obj.Firebase_Token);
                                });
                            }
                            if (BuyerUserDetails.length > 0) {
                                BuyerUserDetails.map(Obj => {
                                    BuyerCustomerFCMToken.push(Obj.Firebase_Token);
                                });
                            }


                            if (SellerOwnerDetails.length > 0) {
                                SellerOwnerDetails.map(Obj => {
                                    SellerCustomerFCMToken.push(Obj.Firebase_Token);
                                });
                            }
                            if (SellerUserDetails.length > 0) {
                                SellerUserDetails.map(Obj => {
                                    SellerCustomerFCMToken.push(Obj.Firebase_Token);
                                });
                            }

                            OverDueInvoiceArr.map(Obj => {
                                var BuyerPayload = {
                                    notification: {
                                        title: 'Hundi-Team',
                                        body: 'Your invoice from Seller Business: ' + Obj.Business.FirstName+' '+Obj.Business.LastName + ',  Invoice: ' + Obj.InvoiceNumber + ', Rs. ' + Obj.AvailableAmount + ' is due in one week. Click here to register payment',
                                        sound: 'notify_tone.mp3'
                                    },
                                    data: {
                                        Customer: Obj.Buyer._id,
                                        notification_type: 'InvoiceNotification',
                                        click_action: 'FCM_PLUGIN_ACTIVITY',
                                    }
                                };

                                var SellerPayload = {
                                    notification: {
                                        title: 'Hundi-Team',
                                        body: 'Your invoice from Buyer Business: ' + Obj.BuyerBusiness.FirstName+'  '+Obj.BuyerBusiness.LastName + ',  Invoice: ' + Obj.InvoiceNumber + ', Rs. ' + Obj.AvailableAmount + ' is due in one week. Click here to register payment',
                                        sound: 'notify_tone.mp3'
                                    },
                                    data: {
                                        Customer: Obj.Seller._id,
                                        notification_type: 'InvoiceNotification',
                                        click_action: 'FCM_PLUGIN_ACTIVITY',
                                    }
                                };

                                if (BuyerCustomerFCMToken.length > 0) {
                                    FCM_App.messaging().sendToDevice(BuyerCustomerFCMToken, BuyerPayload, options).then((NotifyRes) => { });
                                }

                                if (SellerCustomerFCMToken.length > 0) {
                                    FCM_App.messaging().sendToDevice(SellerCustomerFCMToken, SellerPayload, options).then((NotifyRes) => { });
                                }
                            });
                        }).catch(ErrorNotification => { });
                    } else if (OverDueInvoiceArr.length !== 0 && MoreThanThreeDays !== 0) {
                        OverDueInvoiceArr = JSON.parse(JSON.stringify(OverDueInvoiceArr));
                        Promise.all(
                            OverDueInvoiceArr.map(Obj => {
                                CustomerManagement.CustomerSchema.find({ _id: Obj.Buyer._id, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                                    CustomerManagement.CustomerSchema.find({ Owner: Obj.Buyer._id, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                                    CustomerManagement.CustomerSchema.find({ _id: Obj.Seller._id, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                                    CustomerManagement.CustomerSchema.find({ Owner: Obj.Seller._id, ActiveStatus: true, IfDeleted: false }, {}, {}).exec()
                            })
                        ).then(ResponseNotification => {
                            var BuyerOwnerDetails = JSON.parse(JSON.stringify(ResponseNotification[0]));
                            var BuyerUserDetails = JSON.parse(JSON.stringify(ResponseNotification[1]));
                            var SellerOwnerDetails = JSON.parse(JSON.stringify(ResponseNotification[2]));
                            var SellerUserDetails = JSON.parse(JSON.stringify(ResponseNotification[3]));
                            var BuyerCustomerFCMToken = [];
                            var SellerCustomerFCMToken = [];

                            if (BuyerOwnerDetails.length > 0) {
                                BuyerOwnerDetails.map(Obj => {
                                    BuyerCustomerFCMToken.push(Obj.Firebase_Token);
                                });
                            }
                            if (BuyerUserDetails.length > 0) {
                                BuyerUserDetails.map(Obj => {
                                    BuyerCustomerFCMToken.push(Obj.Firebase_Token);
                                });
                            }


                            if (SellerOwnerDetails.length > 0) {
                                SellerOwnerDetails.map(Obj => {
                                    SellerCustomerFCMToken.push(Obj.Firebase_Token);
                                });
                            }
                            if (SellerUserDetails.length > 0) {
                                SellerUserDetails.map(Obj => {
                                    SellerCustomerFCMToken.push(Obj.Firebase_Token);
                                });
                            }

                            OverDueInvoiceArr.map(Obj => {
                                var BuyerPayload = {
                                    notification: {
                                        title: 'Hundi-Team',
                                        body: 'Your invoice from Seller Business: ' + Obj.Business.BusinessName +' '+Obj.Business.LastName + ',  Invoice: ' + Obj.InvoiceNumber + ', Rs. ' + Obj.AvailableAmount + ' is due in 3 days. Click here to register payment',
                                        sound: 'notify_tone.mp3'
                                    },
                                    data: {
                                        Customer: Obj.Buyer._id,
                                        notification_type: 'InvoiceNotification',
                                        click_action: 'FCM_PLUGIN_ACTIVITY',
                                    }
                                };

                                var SellerPayload = {
                                    notification: {
                                        title: 'Hundi-Team',
                                        body: 'Your invoice from Buyer Business: ' + Obj.BuyerBusiness.BusinessName +' '+Obj.BuyerBusiness.LastName +',  Invoice: ' + Obj.InvoiceNumber + ', Rs. ' + Obj.AvailableAmount + ' is due in 3 days. Click here to register payment',
                                        sound: 'notify_tone.mp3'
                                    },
                                    data: {
                                        Customer: Obj.Seller._id,
                                        notification_type: 'InvoiceNotification',
                                        click_action: 'FCM_PLUGIN_ACTIVITY',
                                    }
                                };

                                if (BuyerCustomerFCMToken.length > 0) {
                                    FCM_App.messaging().sendToDevice(BuyerCustomerFCMToken, BuyerPayload, options).then((NotifyRes) => { });
                                }

                                if (SellerCustomerFCMToken.length > 0) {
                                    FCM_App.messaging().sendToDevice(SellerCustomerFCMToken, SellerPayload, options).then((NotifyRes) => { });
                                }
                            });
                        }).catch(ErrorNotification => { });
                    }
                }
            }).catch(Error => console.log(Error));
        });
        PaymentReminder.start();
    },

    MondayNotificationFunction: function (req, res) {
        var MondayNotification = new CronJob('* * 12 * * 1', function () {
            Promise.all([
                InvoiceManagement.InvoiceSchema.find({ PaidORUnpaid: "Unpaid", InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false }, {}, {}).
                    populate({ path: "Business", select: ["FirstName","LastName"] }).populate({ path: "Buyer", select: ["Firebase_Token", "Device_Id", "Device_Type"] }).exec(),
                InviteManagement.InviteManagementSchema.find({ Invite_Status: "Accept" }, {}, {}).exec(),
            ]).then(Response => {
                var InvoiceDetails = JSON.parse(JSON.stringify(Response[0]));
                var InviteDetails = JSON.parse(JSON.stringify(Response[1]));
                var OverDueInvoiceArr = [];
                if (InvoiceDetails.length !== 0) {
                    InvoiceDetails.map(Obj => {
                        var InvoiceDate = new Date();
                        var TodayDate = new Date();
                        InvoiceDate = new Date(Obj.updatedAt);
                        const InviteDetailsArr = InviteDetails.filter(obj1 => obj1.BuyerBranch === Obj.BuyerBranch);
                        if (InviteDetailsArr.length > 0) {
                            var ValidityDate = new Date();
                            InviteDetailsArr.map(ObjIn => {
                                ValidityDate = new Date(ObjIn.updatedAt);
                                ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + ObjIn.BuyerPaymentCycle - 1));
                                InvoiceDate = new Date(InvoiceDate.setDate(InvoiceDate.getDate() + ObjIn.BuyerPaymentCycle - 1));
                                InvoiceDate = new Date(InvoiceDate.setDate(InvoiceDate.getDate() - 1));
                            });
                        }
                        if (InvoiceDate.valueOf() <= TodayDate.valueOf()) {
                            OverDueInvoiceArr.push(Obj);
                        }
                    });

                    if (OverDueInvoiceArr.length !== 0) {
                        OverDueInvoiceArr = JSON.parse(JSON.stringify(OverDueInvoiceArr));
                        Promise.all(
                            OverDueInvoiceArr.map(Obj => {
                                CustomerManagement.CustomerSchema.find({ _id: Obj.Buyer._id, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                                    CustomerManagement.CustomerSchema.find({ Owner: Obj.Buyer._id, ActiveStatus: true, IfDeleted: false }, {}, {}).exec()
                            })
                        ).then(ResponseNotification => {
                            var OwnerDetails = JSON.parse(JSON.stringify(ResponseNotification[0]));
                            var UserDetails = JSON.parse(JSON.stringify(ResponseNotification[1]));
                            var CustomerFCMToken = [];
                            if (OwnerDetails.length > 0) {
                                OwnerDetails.map(Obj => {
                                    CustomerFCMToken.push(Obj.Firebase_Token);
                                });
                            }
                            if (UserDetails.length > 0) {
                                UserDetails.map(Obj => {
                                    CustomerFCMToken.push(Obj.Firebase_Token);
                                });
                            }

                            OverDueInvoiceArr.map(Obj => {
                                var payload = {
                                    notification: {
                                        title: 'Hundi-Team',
                                        body: 'You still have overdue invoices in your account. Please make payment & register the same at the earliest to your avoid negative impact to your credit score. Click here to view overdue invoices.',
                                        sound: 'notify_tone.mp3'
                                    },
                                    data: {
                                        Customer: Obj.Buyer._id,
                                        notification_type: 'InvoiceNotification',
                                        click_action: 'FCM_PLUGIN_ACTIVITY',
                                    }
                                };
                                if (CustomerFCMToken.length > 0) {
                                    FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
                                }
                            });
                        }).catch(ErrorNotification => { });
                    }
                }
            }).catch(Error => console.log(Error));
        });
        MondayNotification.start();
    },

    BuyerCreditLimitUnitizedFunction: function (req, res) {
        var BuyerCreditLimitUnitized = new CronJob('* * 10 * * *', function () {
            Promise.all([
                InvoiceManagement.InvoiceSchema.find({ PaidORUnpaid: "Unpaid", InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false }, {}, {}).
                    populate({ path: "BuyerBusiness", select: ["BusinessName"] }).populate({ path: "BuyerBranch", select: ["BranchName"] }).exec(),
                InviteManagement.InviteManagementSchema.find({ Invite_Status: "Accept" }, {}, {}).exec(),
                CustomerManagement.CustomerSchema.find({ CustomerType: 'Owner', $or: [{ CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                TemporaryManagement.CreditSchema.find({ Request_Status: "Accept", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            ]).then(Response => {
                var InvoiceDetails = JSON.parse(JSON.stringify(Response[0]));
                var InviteDetails = JSON.parse(JSON.stringify(Response[1]));
                var CustomerDetails = JSON.parse(JSON.stringify(Response[2]));
                var CustomerTemporary = JSON.parse(JSON.stringify(Response[2]))
                var OutStandingPayment = [];
                if (CustomerDetails.length !== 0) {
                    CustomerDetails.map(ObjC => {
                        var Customer = {
                            _id: ObjC._id,
                            Firebase_Token: ObjC.Firebase_Token,
                            BusinessName: String,
                            BranchName: String,
                            Device_Type: ObjC.Device_Type,
                            InvoiceAmount: 0,
                            CreditLimit: 0,
                            BuyerBranch: ''
                        };
                        var InvoiceAmount = 0;
                        const InvoiceDetailsArr = InvoiceDetails.filter(obj1 => obj1.Buyer === ObjC._id);
                        if (InvoiceDetailsArr.length > 0) {
                            InvoiceDetails.map(Obj => {
                                InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(Obj.AvailableAmount);
                                Customer.BusinessName = Obj.BuyerBusiness.BusinessName;
                                Customer.BranchName = Obj.BuyerBranch.BranchName;
                                Customer.BuyerBranch = Obj.BuyerBranch._id;
                            });
                        }

                        Customer.InvoiceAmount = InvoiceAmount;

                        var TodayDate = new Date();
                        var RespectiveCreditLimit = 0;
                        const InviteDetailsArr = InviteDetails.filter(obj1 => obj1.Buyer === ObjC._id);
                        if (InviteDetailsArr.length > 0) {
                            var ValidityDate = new Date();
                            InviteDetailsArr.map(ObjIn => {
                                ValidityDate = new Date(ObjIn.updatedAt);
                                ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + ObjIn.BuyerPaymentCycle));
                                if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                                    RespectiveCreditLimit = parseFloat(RespectiveCreditLimit) + parseFloat(ObjIn.AvailableLimit);
                                }

                            });
                        }
                        const CustomerTemporaryArr = CustomerTemporary.filter(obj1 => obj1.Buyer === ObjC._id);
                        if (CustomerTemporaryArr.length > 0) {
                            var TemporaryValidityDate = new Date();
                            CustomerTemporaryArr.map(ObjIn => {
                                TemporaryValidityDate = new Date(ObjIn.updatedAt);
                                TemporaryValidityDate = new Date(TemporaryValidityDate.setDate(TemporaryValidityDate.getDate() + ObjIn.ApprovedPeriod));
                                if (TemporaryValidityDate.valueOf() >= TodayDate.valueOf()) {
                                    RespectiveCreditLimit = parseFloat(RespectiveCreditLimit) + parseFloat(ObjIn.ApproveLimit);
                                }

                            });
                        }

                        var CreditLimitUtilized = parseFloat(InvoiceAmount) / parseFloat(RespectiveCreditLimit) * 100;
                        if (!isNaN(CreditLimitUtilized) && CreditLimitUtilized !== Infinity && CreditLimitUtilized > 0) {
                            if (120 > CreditLimitUtilized) {
                                OutStandingPayment.push(Customer);
                            }
                        }
                    });
                    OutStandingPayment = JSON.parse(JSON.stringify(OutStandingPayment));
                    if (OutStandingPayment.length > 0) {

                    }
                    var OwnerArr = [mongoose.Types.ObjectId(Obj._id)];
                    var UserAgainstDetails = [mongoose.Types.ObjectId(Obj.BuyerBranch)];
                    Promise.all([
                            CustomerManagement.CustomerSchema.find({ _id: { $in: OwnerArr}, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),                            
                            CustomersManagement.CustomerSchema.find({ "BusinessAndBranches.Branches": { $in: UserAgainstDetails }, CustomerType: 'User', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),                       
                    ]).then(ResponseNotification => {
                        var OwnerDetails = JSON.parse(JSON.stringify(ResponseNotification[0]));
                        var UserDetails = JSON.parse(JSON.stringify(ResponseNotification[1]));
                        var CustomerFCMToken = [];
                        if (OwnerDetails.length > 0) {
                            OwnerDetails.map(Obj => {
                                CustomerFCMToken.push(Obj.Firebase_Token);
                            });
                        }
                        if (UserDetails.length > 0) {
                            UserDetails.map(Obj => {
                                CustomerFCMToken.push(Obj.Firebase_Token);
                            });
                        }

                        if (OutStandingPayment.length > 0) {
                            OutStandingPayment.map(Obj => {
                                var payload = {
                                    notification: {
                                        title: 'Hundi-Team',
                                        body: 'Total outstanding ' + ' (Amount Rs.' + Obj.InvoiceAmount + ') on Business Name: ' + Obj.BusinessName + ' Branch Name:' + Obj.BranchName + ' is more than 80% of the credit limit (Rs.xxxx). Please make payments to facilitate additional credit purchases, if required',
                                        sound: 'notify_tone.mp3'
                                    },
                                    data: {
                                        Customer: Obj._id,
                                        notification_type: 'CreditLimitNotification',
                                        click_action: 'FCM_PLUGIN_ACTIVITY',
                                    }
                                };
                                if (CustomerFCMToken.length > 0) {
                                    FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
                                }
                            });

                        }
                    }).catch(ErrorResponse => console.log(ErrorResponse));
                }
            }).catch(Error => console.log(Error));
        });
        BuyerCreditLimitUnitized.start();
    },

    SellerCreditLimitUnitizedFunction: function (req, res) {
        var SellerCreditLimitUnitized = new CronJob('* * 10 * * *', function () {
            Promise.all([
                InvoiceManagement.InvoiceSchema.find({ PaidORUnpaid: "Unpaid", InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false }, {}, {}).
                    populate({ path: "Business", select: ["BusinessName"] }).populate({ path: "Branch", select: ["BranchName"] }).exec(),
                BusinessAndBranchManagement.BranchSchema.find({ ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            ]).then(Response => {
                var InvoiceDetails = JSON.parse(JSON.stringify(Response[0]));
                var BranchDetails = JSON.parse(JSON.stringify(Response[1]));
                var BuyerId = [];
                if (InvoiceDetails.length > 0) {
                    InvoiceDetails.map(Obj => {
                        BuyerId.push(Obj.Buyer);
                    });
                }
                CustomerManagement.CustomerSchema.find({ _id: { $in: BuyerId }, $or: [{ CustomerCategory: "Buyer" }, { CustomerCategory: 'BothBuyerAndSeller' }] }, {}, {}).exec((ErrorRes, CustomerDetails) => {
                    var OutStandingPayment = [];
                    if (CustomerDetails.length !== 0) {
                        CustomerDetails.map(ObjC => {
                            var Customer = {
                                _id: ObjC._id,
                                Firebase_Token: ObjC.Firebase_Token,
                                BusinessName: String,
                                BranchName: String,
                                Device_Type: ObjC.Device_Type,
                                InvoiceAmount: 0,
                                CreditLimit: 0
                            };
                            var InvoiceAmount = 0;
                            const InvoiceDetailsArr = InvoiceDetails.filter(obj1 => obj1.Seller === ObjC._id);
                            if (InvoiceDetailsArr.length > 0) {
                                InvoiceDetails.map(Obj => {
                                    InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(Obj.AvailableAmount);
                                    Customer.BusinessName = Obj.Business.BusinessName;
                                    Customer.BranchName = Obj.Branch.BranchName;
                                });
                            }
                            Customer.InvoiceAmount = InvoiceAmount;
                            var RespectiveCreditLimit = 0;
                            const BranchDetailsArr = BranchDetails.filter(obj1 => obj1.Customer === ObjC._id);
                            if (BranchDetailsArr.length > 0) {
                                BranchDetailsArr.map(Obj => {
                                    RespectiveCreditLimit = parseFloat(RespectiveCreditLimit) + parseFloat(Obj.AvailableCreditLimit);
                                });
                            }
    
                            var CreditLimitUtilized = parseFloat(InvoiceAmount) / parseFloat(RespectiveCreditLimit) * 100;
                            if (!isNaN(CreditLimitUtilized) && CreditLimitUtilized !== Infinity && CreditLimitUtilized > 0) {
                                if (120 > CreditLimitUtilized) {
                                    OutStandingPayment.push(Customer);
                                }
                            }
                        });
    
                        if (OutStandingPayment.length > 0) {
                            OutStandingPayment = JSON.parse(JSON.stringify(OutStandingPayment));
                            OutStandingPayment.map(Obj => {
                                var CustomerFCMToken = [];
                                CustomerFCMToken.push(Obj.Firebase_Token);
                                var payload = {
                                    notification: {
                                        title: 'Hundi-Team',
                                        body: 'Total outstanding ' + ' (Amount Rs.' + Obj.InvoiceAmount + ') on Business Name: ' + Obj.BusinessName + ' Branch Name:' + Obj.BranchName + ' is more than 80% of the credit limit.',
                                        sound: 'notify_tone.mp3'
                                    },
                                    data: {
                                        Customer: Obj._id,
                                        notification_type: 'CreditLimitNotification',
                                        click_action: 'FCM_PLUGIN_ACTIVITY',
                                    }
                                };
                                if (CustomerFCMToken.length > 0) {
                                    FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
                                }
                            });
    
                        }
                    }
                });              
            }).catch(Error => {console.log(Error);});
        });
        SellerCreditLimitUnitized.start();
    },

    TopFiveHundiScoreFunction: function (req, res) {
        var TopFiveHundiScore = new CronJob('* * 10 * * *', function () {
            Promise.all([
                InvoiceManagement.InvoiceSchema.find({ PaidORUnpaid: "Unpaid", InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                TemporaryManagement.CreditSchema.find({ Request_Status: "Accept", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                InviteManagement.InviteManagementSchema.find({ Invite_Status: "Accept" }, {}, {}).exec(),
                TemporaryManagement.CreditSchema.find({ Request_Status: "Pending", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                PaymentManagement.PaymentSchema.find({ Payment_Status: "Pending" }, {}, {}).exec(),
                InvoiceManagement.InvoiceSchema.find({ InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            ]).then(Response => {
                var BuyerInvoice = JSON.parse(JSON.stringify(Response[0]));
                var TemporaryActiveDetails = JSON.parse(JSON.stringify(Response[1]));
                var InviteDetails = JSON.parse(JSON.stringify(Response[2]));
                var TemporaryPendingDetails = JSON.parse(JSON.stringify(Response[3]));
                var BuyerPendingPayment = JSON.parse(JSON.stringify(Response[4]));
                var BuyerPendingInvoice = JSON.parse(JSON.stringify(Response[5]));
                var BusinessArray = [];
                var BranchArray = [];
                var BuyerId = [];
                var SellerBusinessArray = [];
                var SellerId = [];
                var BusinessId = [];
                var BranchId = [];
                if (InviteDetails.length > 0) {
                    InviteDetails.map(Obj => {
                        BuyerId.push(Obj.Buyer);
                        SellerId.push(mongoose.Types.ObjectId(Obj.Seller));
                        BusinessId.push(mongoose.Types.ObjectId(Obj.BuyerBusiness));
                        BranchId.push(mongoose.Types.ObjectId(Obj.BuyerBranch));
                    });
                }
                const findRequiredData = new Promise((resolve, reject) => {
                    Promise.all([
                        BusinessAndBranchManagement.BusinessSchema.find({ _id: { $in: BusinessId } }, {}, {}).exec(),
                        BusinessAndBranchManagement.BranchSchema.find({ _id: { $in: BranchId } }, {}, {}).exec(),
                        BusinessAndBranchManagement.BusinessSchema.find({ Customer: { $in: SellerId } }, {}, {}).exec(),
                        CustomerManagement.CustomerSchema.find({ _id: { $in: BuyerId }, $or: [{ CustomerCategory: "Buyer" }, { CustomerCategory: 'BothBuyerAndSeller' }] }, {}, {}).exec()
                    ]).then((responseNew) => {
                        BusinessArray = JSON.parse(JSON.stringify(responseNew[0]));
                        BranchArray = JSON.parse(JSON.stringify(responseNew[1]));
                        SellerBusinessArray = JSON.parse(JSON.stringify(responseNew[2]));
                        var ResponseRes = JSON.parse(JSON.stringify(responseNew[3]));
                        resolve(ResponseRes);
                    }).catch(errorNew => {
                        reject(errorNew);
                    });
                });

                const LoadMainFun = () => {
                    if (BuyerId.length !== 0 && SellerId.length !== 0) {
                        findRequiredData.then(responseNew => {
                            var HundiScoreArr = [];
                            var ResponseRes = responseNew;
                            ResponseRes.map(ObjM => {
                                var HundiScore = {
                                    _id: String,
                                    ContactName: String,
                                    Mobile: String,
                                    CustomerCategory: String,
                                    Business: [],
                                    OverDueAmount: 0,
                                    HundiScoreRelatedOverDuePoint: 0,
                                    CreditUnitizedPoint: 0,
                                    TemporaryCreditPoint: 0,
                                    DelayPaymentPoint: 0,
                                    CreditLimit: 0,
                                    ExtraUnitizedCreditLimit: 0,
                                    InvoiceAmount: 0,
                                    AvailableCreditLimit: 0,
                                    PendingInvoiceCount: 0,
                                    DueTodayAmount: 0,
                                    OutStandingPayments: 0,
                                    UpComingAmount: 0,
                                    HundiScore: Number,
                                    BusinessVolumeIndicator: String,
                                    HundiScoreStatus: ''
                                };
                                HundiScore._id = ObjM._id;
                                HundiScore.ContactName = ObjM.ContactName;
                                HundiScore.Mobile = ObjM.Mobile;
                                HundiScore.CustomerCategory = ObjM.CustomerCategory;

                                var TodayDate1 = new Date();
                                var RespectiveCreditLimit1 = 0;
                                if (BranchArray.length > 0) {
                                    BranchArray.map(ObjS => {
                                        if (InviteDetails.length > 0) {
                                            const InviteDetailsArray1 = InviteDetails.filter(obj1 => ObjS._id === obj1.BuyerBranch && obj1.Buyer === ObjM._id);
                                            if (InviteDetailsArray1.length > 0) {
                                                var ValidityDate = new Date();
                                                InviteDetailsArray1.map(ObjIn => {
                                                    ValidityDate = new Date(ObjIn.updatedAt);
                                                    //  ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + ObjIn.BuyerPaymentCycle));
                                                    //  if (ValidityDate.valueOf() >= TodayDate1.valueOf()) {
                                                    RespectiveCreditLimit1 = parseFloat(RespectiveCreditLimit1) + parseFloat(ObjIn.AvailableLimit);
                                                    //  }
                                                });
                                            }
                                        }
                                        if (TemporaryActiveDetails.length > 0) {
                                            const TemporaryActiveDetailsArray1 = TemporaryActiveDetails.filter(obj1 => ObjS._id === obj1.BuyerBranch && obj1.Buyer === ObjM._id);
                                            if (TemporaryActiveDetailsArray1.length > 0) {
                                                var TemporaryValidityDate = new Date();
                                                TemporaryActiveDetailsArray1.map(ObjIn => {
                                                    TemporaryValidityDate = new Date(ObjIn.updatedAt);
                                                    TemporaryValidityDate = new Date(TemporaryValidityDate.setDate(TemporaryValidityDate.getDate() + ObjIn.ApprovedPeriod));
                                                    if (TemporaryValidityDate.valueOf() >= TodayDate1.valueOf()) {
                                                        RespectiveCreditLimit1 = parseFloat(RespectiveCreditLimit1) + parseFloat(ObjIn.ApproveLimit);
                                                    }
                                                });
                                            }
                                        }
                                    });
                                }

                                HundiScore.CreditLimit = RespectiveCreditLimit1;
                                HundiScore.CreditLimit = HundiScore.CreditLimit.toFixed(2);
                                HundiScore.CreditLimit = parseFloat(HundiScore.CreditLimit);
                                HundiScore.AvailableCreditLimit = RespectiveCreditLimit1;
                                HundiScore.AvailableCreditLimit = HundiScore.AvailableCreditLimit.toFixed(2);
                                HundiScore.AvailableCreditLimit = parseFloat(HundiScore.AvailableCreditLimit);
                                var OverDueInvoiceArr = [];
                                if (BuyerInvoice.length !== 0) {
                                    const BuyerInvoiceArray = BuyerInvoice.filter(obj1 => obj1.Buyer === ObjM._id);
                                    if (BuyerInvoiceArray.length > 0) {
                                        BuyerInvoiceArray.map(Obj => {
                                            var EmptyInvoicesAndInvite = {
                                                Invoice: [],
                                                Invite: []
                                            };
                                            var InvoiceDate = new Date();
                                            var TodayDate = new Date();
                                            InvoiceDate = new Date(Obj.InvoiceDate);
                                            const InviteDetailsArr = InviteDetails.filter(obj1 => obj1.BuyerBranch === Obj.BuyerBranch && obj1.BuyerBusiness === Obj.BuyerBusiness && obj1.Buyer === ObjM._id);
                                            if (InviteDetailsArr.length > 0) {
                                                var ValidityDate = new Date();
                                                InviteDetailsArr.map(ObjIn => {
                                                    ValidityDate = new Date(ObjIn.updatedAt);
                                                    ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + ObjIn.BuyerPaymentCycle));
                                                    InvoiceDate = new Date(InvoiceDate.setDate(InvoiceDate.getDate() + ObjIn.BuyerPaymentCycle));
                                                    if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                                                        EmptyInvoicesAndInvite.Invite.push(ObjIn);
                                                    }

                                                });
                                            }
                                            if (InvoiceDate.valueOf() < TodayDate.valueOf()) {
                                                EmptyInvoicesAndInvite.Invoice.push(Obj);
                                            }
                                            OverDueInvoiceArr.push(EmptyInvoicesAndInvite);
                                        });
                                    }
                                }
                                var RespectiveOverDueAmount = 0;
                                var RespectiveCreditLimit = 0;
                                OverDueInvoiceArr.map(Obj => {
                                    if (Obj.Invoice.length !== 0) {
                                        Obj.Invoice.map(obj => {
                                            RespectiveOverDueAmount = parseFloat(RespectiveOverDueAmount) + parseFloat(obj.AvailableAmount);
                                        });
                                    }

                                    if (Obj.Invite.length !== 0) {
                                        Obj.Invite.map(obj => {
                                            RespectiveCreditLimit = parseFloat(RespectiveCreditLimit) + parseFloat(obj.AvailableLimit);
                                        });
                                    }
                                    var RespectiveOverDueAndCreditAmount = 0;
                                    RespectiveOverDueAndCreditAmount = parseFloat(RespectiveOverDueAmount) / parseFloat(RespectiveCreditLimit1);
                                    if (RespectiveOverDueAndCreditAmount > 1 && RespectiveOverDueAndCreditAmount !== Infinity && !isNaN(RespectiveOverDueAndCreditAmount)) {
                                        HundiScore.HundiScoreRelatedOverDuePoint = 40;
                                    } else {
                                        if (!isNaN(RespectiveOverDueAndCreditAmount) && RespectiveOverDueAndCreditAmount !== Infinity) {
                                            HundiScore.HundiScoreRelatedOverDuePoint = parseFloat(30) * parseFloat(RespectiveOverDueAndCreditAmount);
                                        }

                                    }
                                });
                                var InvoiceAmount = 0;
                                if (BuyerInvoice.length !== 0) {
                                    const BuyerInvoiceArr = BuyerInvoice.filter(obj1 => obj1.Buyer === ObjM._id);
                                    if (BuyerInvoiceArr.length > 0) {
                                        BuyerInvoiceArr.map(Obj => {
                                            InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(Obj.AvailableAmount);
                                        });
                                    }
                                }
                                HundiScore.InvoiceAmount = InvoiceAmount;
                                HundiScore.UpComingAmount = InvoiceAmount;
                                var InvoiceRespectiveCreditAmount = parseFloat(InvoiceAmount) - parseFloat(RespectiveCreditLimit1);
                                if (InvoiceRespectiveCreditAmount > 0) {
                                    HundiScore.ExtraUnitizedCreditLimit = -Math.abs(InvoiceRespectiveCreditAmount);
                                    HundiScore.ExtraUnitizedCreditLimit = HundiScore.ExtraUnitizedCreditLimit.toFixed(2);
                                    HundiScore.ExtraUnitizedCreditLimit = parseFloat(HundiScore.ExtraUnitizedCreditLimit);
                                    HundiScore.AvailableCreditLimit = 0;
                                } else {
                                    if (InvoiceRespectiveCreditAmount < 0) {
                                        HundiScore.AvailableCreditLimit = Math.abs(InvoiceRespectiveCreditAmount);
                                        HundiScore.AvailableCreditLimit = HundiScore.AvailableCreditLimit.toFixed(2);
                                        HundiScore.AvailableCreditLimit = parseFloat(HundiScore.AvailableCreditLimit)
                                    }

                                }

                                var TotalRespectiveOverDueAmount = parseFloat(RespectiveOverDueAmount);
                                if (TotalRespectiveOverDueAmount > 0) {
                                    HundiScore.OverDueAmount = TotalRespectiveOverDueAmount;
                                    HundiScore.OverDueAmount = HundiScore.OverDueAmount.toFixed(2);
                                    HundiScore.OverDueAmount = parseFloat(HundiScore.OverDueAmount);
                                } else {
                                    HundiScore.OverDueAmount = 0;
                                }

                                var NumberOfDaysOutStanding = 0;
                                var DueTodayAmount = 0;
                                var OutStandingInvoice = 0;
                                if (BuyerInvoice.length !== 0) {
                                    const BuyerInvoiceArray = BuyerInvoice.filter(obj1 => obj1.Buyer === ObjM._id);
                                    if (BuyerInvoiceArray.length > 0) {
                                        BuyerInvoiceArray.map(Obj => {
                                            var InvoiceCreatedDate = new Date();
                                            var InvoiceApprovedDate = new Date(Obj.InvoiceDate);
                                            OutStandingInvoice = parseFloat(OutStandingInvoice) + parseFloat(Obj.AvailableAmount);
                                            const InviteDetailsArray = InviteDetails.filter(obj1 => obj1.BuyerBranch === Obj.BuyerBranch);
                                            if (InviteDetailsArray.length > 0) {
                                                InviteDetailsArray.map(ObjIn => {
                                                    InvoiceApprovedDate = new Date(InvoiceApprovedDate.setDate(InvoiceApprovedDate.getDate() + ObjIn.BuyerPaymentCycle));
                                                });
                                            }
                                            InvoiceApprovedDate = new Date(InvoiceApprovedDate.setDate(InvoiceApprovedDate.getDate() - 1));
                                            var InvoiceLocalCreatedDate = InvoiceCreatedDate.toLocaleDateString();
                                            var InvoiceLocalApprovedDate = InvoiceApprovedDate.toLocaleDateString();
                                            if (InvoiceLocalCreatedDate === InvoiceLocalApprovedDate) {
                                                NumberOfDaysOutStanding = parseFloat(NumberOfDaysOutStanding) + parseFloat(Obj.AvailableAmount);
                                                DueTodayAmount = parseFloat(DueTodayAmount) + parseFloat(Obj.AvailableAmount);
                                            }
                                        });
                                    }
                                }
                                var TotalCreditLimit = 0;
                                var PaymentCycle = 0;
                                if (InviteDetails.length !== 0) {
                                    const InviteDetailsArray = InviteDetails.filter(obj1 => obj1.Buyer === ObjM._id);
                                    if (InviteDetailsArray.length > 0) {
                                        InviteDetailsArray.map(Obj => {
                                            TotalCreditLimit = parseFloat(TotalCreditLimit) + parseFloat(Obj.AvailableLimit);
                                            PaymentCycle = parseFloat(Obj.BuyerPaymentCycle);
                                        });
                                    }
                                }

                                var DueTodayPayAmount = parseFloat(DueTodayAmount);
                                if (DueTodayPayAmount > 1 && DueTodayPayAmount !== Infinity) {
                                    HundiScore.DueTodayAmount = DueTodayPayAmount.toFixed(2);
                                    HundiScore.DueTodayAmount = parseFloat(DueTodayPayAmount);
                                }

                                var TotalCreditUnitized = parseFloat(OutStandingInvoice) / parseFloat(TotalCreditLimit);
                                if (TotalCreditUnitized > 0.5) {
                                    TotalCreditUnitized = parseFloat(1) - parseFloat(TotalCreditUnitized);
                                    TotalCreditUnitized = parseFloat(0.5) - parseFloat(TotalCreditUnitized);
                                }

                                if (TotalCreditUnitized > 1) {
                                    HundiScore.CreditUnitizedPoint = 10;
                                } else {
                                    HundiScore.CreditUnitizedPoint = parseFloat(10) * parseFloat(TotalCreditUnitized);
                                    HundiScore.CreditUnitizedPoint = HundiScore.CreditUnitizedPoint.toFixed(2);
                                    HundiScore.CreditUnitizedPoint = parseFloat(HundiScore.CreditUnitizedPoint);
                                }

                                var DelayPaymentAmount = parseFloat(NumberOfDaysOutStanding) / parseFloat(PaymentCycle);
                                if (DelayPaymentAmount > 1) {
                                    HundiScore.DelayPaymentPoint = 30;
                                } else {
                                    HundiScore.DelayPaymentPoint = parseFloat(30) * parseFloat(DelayPaymentAmount);
                                    HundiScore.DelayPaymentPoint = HundiScore.DelayPaymentPoint.toFixed(2);
                                    HundiScore.DelayPaymentPoint = parseFloat(HundiScore.DelayPaymentPoint);
                                }



                                var TemporaryActiveAmount = 0;
                                if (TemporaryActiveDetails.length > 0) {
                                    const TemporaryActiveDetailsArray = TemporaryActiveDetails.filter(obj1 => obj1.Buyer === ObjM._id);
                                    if (TemporaryActiveDetailsArray.length > 0) {
                                        TemporaryActiveDetailsArray.map(Obj => {
                                            TemporaryActiveAmount = parseFloat(TemporaryActiveAmount) + parseFloat(Obj.ApproveLimit);
                                        });
                                    }
                                }

                                var TemporaryPendingAmount = 0;
                                if (TemporaryPendingDetails.length > 0) {
                                    const TemporaryPendingDetailsArray = TemporaryPendingDetails.filter(obj1 => obj1.Buyer === ObjM._id);
                                    TemporaryPendingDetailsArray.map(Obj => {
                                        TemporaryPendingAmount = parseFloat(TemporaryPendingAmount) + parseFloat(Obj.RequestLimit);
                                    });
                                }

                                var TotalTemporaryAmount = parseFloat(TemporaryActiveAmount) / parseFloat(TemporaryPendingAmount);
                                if (isNaN(TotalTemporaryAmount)) {
                                    TotalTemporaryAmount = 0;
                                }
                                if (TotalTemporaryAmount > 1) {
                                    HundiScore.TemporaryCreditPoint = 20;
                                } else {
                                    HundiScore.TemporaryCreditPoint = parseFloat(20) * parseFloat(TotalTemporaryAmount);
                                    HundiScore.TemporaryCreditPoint = HundiScore.TemporaryCreditPoint.toFixed(2);
                                    HundiScore.TemporaryCreditPoint = parseFloat(HundiScore.TemporaryCreditPoint);
                                }

                                var BuyerOutstandingPayment = 0;
                                const BuyerPendingPaymentArr = BuyerInvoice.filter(obj => JSON.parse(JSON.stringify(obj.Buyer)) === JSON.parse(JSON.stringify(ObjM._id)));
                                if (BuyerPendingPaymentArr.length !== 0) {
                                    BuyerPendingPaymentArr.map(Obj => {
                                        BuyerOutstandingPayment = parseFloat(BuyerOutstandingPayment) + (Obj.AvailableAmount);
                                    });
                                }

                                if (HundiScore.DueTodayAmount > 1) {
                                    HundiScore.DueTodayAmount = HundiScore.DueTodayAmount.toFixed(2);
                                    HundiScore.DueTodayAmount = parseFloat(HundiScore.DueTodayAmount);
                                }

                                if (BuyerOutstandingPayment > 0) {
                                    HundiScore.OutStandingPayments = BuyerOutstandingPayment;
                                    HundiScore.OutStandingPayments = HundiScore.OutStandingPayments.toFixed(2);
                                    HundiScore.OutStandingPayments = parseFloat(HundiScore.OutStandingPayments);
                                }

                                if (HundiScore.UpComingAmount > 1) {
                                    HundiScore.UpComingAmount = parseFloat(HundiScore.UpComingAmount) - parseFloat(HundiScore.DueTodayAmount) - parseFloat(HundiScore.OverDueAmount);
                                    HundiScore.UpComingAmount = HundiScore.UpComingAmount.toFixed(2);
                                    HundiScore.UpComingAmount = parseFloat(HundiScore.UpComingAmount);
                                    if (HundiScore.UpComingAmount < 0) {
                                        HundiScore.UpComingAmount = 0;
                                    }
                                }

                                var PendingInvoiceAmount = 0;
                                const CustomerPendingInvoiceArr = BuyerPendingInvoice.filter(obj => JSON.parse(JSON.stringify(obj.Buyer)) === JSON.parse(JSON.stringify(ObjM._id)));
                                if (CustomerPendingInvoiceArr.length !== 0) {
                                    HundiScore.PendingInvoiceCount = CustomerPendingInvoiceArr.length;
                                    CustomerPendingInvoiceArr.map(Obj => {
                                        PendingInvoiceAmount = parseFloat(PendingInvoiceAmount) + parseFloat(Obj.AvailableAmount);
                                    });
                                }


                                const BusinessArrArr = BusinessArray.filter(obj => JSON.parse(JSON.stringify(obj.Customer)) === JSON.parse(JSON.stringify(ObjM._id)));
                                if (BusinessArrArr.length !== 0) {
                                    HundiScore.Business = BusinessArrArr;
                                    HundiScore.Business.map(ObjBus => {
                                        const BusinessOfBranchArr = BranchArray.filter(obj => JSON.parse(JSON.stringify(obj.Business)) === JSON.parse(JSON.stringify(ObjBus._id)));
                                        ObjBus.Branches = BusinessOfBranchArr;
                                        return ObjBus;
                                    });
                                }

                                var BusinessVolume = 0;
                                var AllBuyerCreditLimits = 0;
                                var TotalInvoiceAmount = 0;
                                var BusinessVolumePercentage = 0;
                                if (SellerBusinessArray.length > 0) {
                                    SellerBusinessArray.map(ObjB => {
                                        AllBuyerCreditLimits = parseFloat(AllBuyerCreditLimits) + parseFloat(ObjB.AvailableCreditLimit);
                                    });
                                }
                                const BuyerInvoiceArrB = BuyerInvoice.filter(obj => JSON.parse(JSON.stringify(obj.Buyer)) === JSON.parse(JSON.stringify(ObjM._id)));
                                if (BuyerInvoiceArrB.length !== 0) {
                                    BuyerInvoiceArrB.map(ObjB => {
                                        if (ObjB.PaidORUnpaid === 'Paid') {
                                            TotalInvoiceAmount = parseFloat(TotalInvoiceAmount) + parseFloat(ObjB.InvoiceAmount);
                                        } else if (ObjB.PaidORUnpaid === 'Unpaid') {
                                            TotalInvoiceAmount = parseFloat(TotalInvoiceAmount) + parseFloat(ObjB.AvailableAmount);
                                        }
                                    });
                                }

                                BusinessVolume = parseFloat(HundiScore.OverDueAmount) + parseFloat(TotalInvoiceAmount);

                                BusinessVolumePercentage = parseFloat(BusinessVolume) / parseFloat(AllBuyerCreditLimits) * 100;

                                if (BusinessVolumePercentage >= 45) {
                                    HundiScore.BusinessVolumeIndicator = 'Low';
                                } else if (BusinessVolumePercentage > 45 && BusinessVolumePercentage >= 90) {
                                    HundiScore.BusinessVolumeIndicator = 'Medium';
                                } else if (BusinessVolumePercentage > 90) {
                                    HundiScore.BusinessVolumeIndicator = 'High';
                                }


                                var HundiScoreCount = 0;
                                HundiScoreCount = parseFloat(HundiScore.HundiScoreRelatedOverDuePoint) / parseFloat(HundiScore.CreditUnitizedPoint) / parseFloat(HundiScore.TemporaryCreditPoint) / parseFloat(HundiScore.DelayPaymentPoint) * parseFloat(100);
                                HundiScore.HundiScore = HundiScoreCount.toFixed(2);
                                HundiScore.HundiScore = parseFloat(HundiScore.HundiScore);
                                if (isNaN(HundiScore.HundiScore) || HundiScore.HundiScore === Infinity) {
                                    HundiScore.HundiScore = 0;
                                }
                                HundiScoreArr.push(HundiScore);
                            });
                            var MaxValue = 0;
                            HundiScoreArr.map(Obj => {
                                MaxValue = Math.max(Number(Obj.HundiScore));
                            });
                            var HundiScoreArray = [];
                            HundiScoreArr.map(Obj => {
                                if (MaxValue === Number(Obj.HundiScore) || MaxValue < Number(Obj.HundiScore)) {
                                    if (HundiScoreArray.length !== 1) {
                                        HundiScoreArray.push(Obj);
                                    }
                                }
                            });
                            if (HundiScoreArray.length > 0) {
                                HundiScoreArray.map(Obj => {
                                    CustomerManagement.CustomerSchema.updateOne({ _id: Obj._id },
                                        { $set: { HundiScore: Obj.HundiScore } })
                                        .exec();
                                    return Obj;
                                });
                            }
                        }).catch(ErrorResponse => console.log(ErrorResponse));
                    } else {
                        
                    }
                };
                LoadMainFun();
            }).catch(ErrorRes => console.log(ErrorRes));
        });
        TopFiveHundiScore.start();
    },

    ReminderForInvoiceAcceptanceFunction: function (req, res) {
        var ReminderForInvoiceAcceptance = new CronJob('* 59 * * * *', function () {
            Promise.all([                
                InvoiceManagement.InvoiceSchema.find({InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false }, {}, {}).
                    populate({ path: 'Seller', select: ['ContactName', "Mobile", 'Firebase_Token'] }).populate({ path: 'Buyer', select: ["ContactName", "Mobile", "Firebase_Token"] }).
                    populate({ path: 'Business', select: 'BusinessName' }).populate({ path: 'BuyerBusiness', select: 'BusinessName' }).
                    populate({ path: 'BuyerBranch', select: 'BranchName' }).populate({ path: 'Branch', select: 'BranchName' }).exec(),
                BusinessAndBranchManagement.BranchSchema.find({ ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            ]).then(Response => {
                var InvoiceDetails = JSON.parse(JSON.stringify(Response[0]));
                var BranchDetails = JSON.parse(JSON.stringify(Response[1]));
                if (InvoiceDetails.length !== 0) {
                    InvoiceDetails.map(Obj => {
                        const SellerBranchArr = BranchDetails.filter(obj1 => obj1._id === Obj.BuyerBranch._id);
                        if (SellerBranchArr.length > 0) {
                            var SellerUserNotification = [];
                            SellerBranchArr.map(ObjB => {
                                SellerUserNotification.push(ObjB._id);
                            });

                            Promise.all([
                                CustomersManagement.CustomerSchema.find({ "BusinessAndBranches.Branches": { $in: SellerUserNotification }, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                            ]).then(ResponseRes => {
                                var SellerUserDetails = JSON.parse(JSON.stringify(ResponseRes[0]));
                                if (SellerUserDetails.length > 0) {
                                    SellerUserDetails.map(ObjS => {
                                        var SellerFCMToken = [];
                                        SellerFCMToken.push(ObjS.Firebase_Token);
                                        var BuyerSmsMessage = Obj.BuyerBusiness.BusinessName + ' accepted your invoice ID ' + Obj.InvoiceNumber + ',' + ' Rs.' + Obj.InvoiceAmount + '. Click here to view the invoice.';

                                        const params = new URLSearchParams();
                                        params.append('key', '25ECE50D1A3BD6');
                                        params.append('msg', BuyerSmsMessage);
                                        params.append('senderid', 'TXTDMO');
                                        params.append('routeid', '3');
                                        params.append('contacts', ObjS.Mobile);

                                        // axios.post('https://sms.textmysms.com/app/smsapi/index.php', params).then(function (response) {
                                        //    callback(null, response.data);
                                        //  }).catch(function (error) {
                                        //    callback('Some Error for Seller Invite SMS!, Error: ' + error, null);
                                        //  });
                                        const CreateNotification = new NotificationManagement.NotificationSchema({
                                            User: null,
                                            CustomerID: ObjS._id,
                                            Notification_Type: 'SellerInvoiceAccept',
                                            Message: BuyerSmsMessage,
                                            Message_Received: true,
                                            Message_Viewed: false,
                                            ActiveStatus: true,
                                            IfDeleted: false,
                                        });
                                        CreateNotification.save();

                                        var BuyerPayload = {
                                            notification: {
                                                title: 'Hundi-Team',
                                                body: Obj.BuyerBusiness.BusinessName + ' accepted your invoice ID ' + Obj.InvoiceNumber + ',' + ' Rs.' + Obj.InvoiceAmount + '. Click here to view the invoice.',
                                                sound: 'notify_tone.mp3'
                                            },
                                            data: {
                                                Customer: ObjS._id,
                                                notification_type: 'SellerInvoiceAccept',
                                                click_action: 'FCM_PLUGIN_ACTIVITY',
                                            }
                                        };
                                        FCM_App.messaging().sendToDevice(SellerFCMToken, BuyerPayload, options).then((NotifyRes) => { });
                                        return ObjS;
                                    });


                                }
                            });
                        }
                    });


                    InvoiceDetails.map(Obj => {
                        const SellerBranchArr = BranchDetails.filter(obj1 => obj1._id === Obj.Branch._id);
                        if (SellerBranchArr.length > 0) {
                            var SellerUserNotification = [];
                            SellerBranchArr.map(ObjB => {
                                SellerUserNotification.push(ObjB._id);
                            });
                            Promise.all([
                                CustomersManagement.CustomerSchema.find({ "BusinessAndBranches.Branches": { $in: SellerUserNotification }, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                            ]).then(ResponseRes => {
                                var SellerUserDetails = JSON.parse(JSON.stringify(ResponseRes[0]));
                                if (SellerUserDetails.length > 0) {
                                    SellerUserDetails.map(ObjS => {
                                        var SellerFCMToken = [];
                                        SellerFCMToken.push(ObjS.Firebase_Token);
                                        var BuyerSmsMessage = Obj.BuyerBusiness.BusinessName + ' accepted your invoice ID ' + Obj.InvoiceNumber + ',' + ' Rs.' + Obj.InvoiceAmount + '. Click here to view the invoice.';

                                        const params = new URLSearchParams();
                                        params.append('key', '25ECE50D1A3BD6');
                                        params.append('msg', BuyerSmsMessage);
                                        params.append('senderid', 'TXTDMO');
                                        params.append('routeid', '3');
                                        params.append('contacts', ObjS.Mobile);

                                        // axios.post('https://sms.textmysms.com/app/smsapi/index.php', params).then(function (response) {
                                        //    callback(null, response.data);
                                        //  }).catch(function (error) {
                                        //    callback('Some Error for Seller Invite SMS!, Error: ' + error, null);
                                        //  });
                                        const CreateNotification = new NotificationManagement.NotificationSchema({
                                            User: null,
                                            CustomerID: ObjS._id,
                                            Notification_Type: 'SellerInvoiceAccept',
                                            Message: BuyerSmsMessage,
                                            Message_Received: true,
                                            Message_Viewed: false,
                                            ActiveStatus: true,
                                            IfDeleted: false,
                                        });
                                        CreateNotification.save();

                                        var BuyerPayload = {
                                            notification: {
                                                title: 'Hundi-Team',
                                                body: Obj.BuyerBusiness.BusinessName + ' accepted your invoice ID ' + Obj.InvoiceNumber + ',' + ' Rs.' + Obj.InvoiceAmount + '. Click here to view the invoice.',
                                                sound: 'notify_tone.mp3'
                                            },
                                            data: {
                                                Customer: ObjS._id,
                                                notification_type: 'SellerInvoiceAccept',
                                                click_action: 'FCM_PLUGIN_ACTIVITY',
                                            }
                                        };
                                        if (SellerFCMToken.length > 0) {
                                            FCM_App.messaging().sendToDevice(SellerFCMToken, BuyerPayload, options).then((NotifyRes) => { });
                                        }                                        
                                        return ObjS;
                                    });


                                }
                            });
                        }

                        var SellerOwnerFCMToken = [];
                        SellerOwnerFCMToken.push(Obj.Seller.Firebase_Token);
                        var BuyerSmsMessage1 = Obj.BuyerBusiness.BusinessName + ' accepted your invoice ID ' + Obj.InvoiceNumber + ',' + ' Rs.' + Obj.InvoiceAmount + '. Click here to view the invoice.';
                        const paramsOwner = new URLSearchParams();
                        paramsOwner.append('key', '25ECE50D1A3BD6');
                        paramsOwner.append('msg', BuyerSmsMessage1);
                        paramsOwner.append('senderid', 'TXTDMO');
                        paramsOwner.append('routeid', '3');
                        paramsOwner.append('contacts', Obj.Seller.Mobile);
                        // axios.post('https://sms.textmysms.com/app/smsapi/index.php', params).then(function (response) {
                        //    callback(null, response.data);
                        //  }).catch(function (error) {
                        //    callback('Some Error for Seller Invite SMS!, Error: ' + error, null);
                        //  });
                        const CreateNotifications = new NotificationManagement.NotificationSchema({
                            User: null,
                            CustomerID: Obj.Seller._id,
                            Notification_Type: 'SellerInvoiceAccept',
                            Message: BuyerSmsMessage1,
                            Message_Received: true,
                            Message_Viewed: false,
                            ActiveStatus: true,
                            IfDeleted: false,
                        });
                        CreateNotifications.save();
                        var BuyerPayloads = {
                            notification: {
                                title: 'Hundi-Team',
                                body: Obj.BuyerBusiness.BusinessName + ' accepted your invoice ID ' + Obj.InvoiceNumber + ',' + ' Rs.' + Obj.InvoiceAmount + '. Click here to view the invoice.',
                                sound: 'notify_tone.mp3'
                            },
                            data: {
                                Customer: Obj.Seller._id,
                                notification_type: 'SellerInvoiceAccept',
                                click_action: 'FCM_PLUGIN_ACTIVITY',
                            }
                        };
                        if (SellerOwnerFCMToken.length > 0) {
                            FCM_App.messaging().sendToDevice(SellerOwnerFCMToken, BuyerPayloads, options).then((NotifyRes) => { });
                        }                        
                    });
                }
            });
        });
        ReminderForInvoiceAcceptance.start();
    }
};


exports.PushNotification = PushNotification;

