var mongoose = require('mongoose'); InviteManagement
var CustomersManagement = require('../../Models/CustomerManagement.model');
var ErrorHandling = require('../../Handling/ErrorHandling').ErrorHandling;
var BusinessAndBranchManagement = require('../../Models/BusinessAndBranchManagement.model');
var InvoiceManagement = require('../../Models/InvoiceManagement.model');
var InviteManagement = require('../../Models/Invite_Management.model');
var TemporaryManagement = require('../../Models/TemporaryCredit.model');
var moment = require('moment');
var multer = require('multer');
var NotificationManagement = require('../../Models/notification_management.model');
var PaymentModel = require('../../Models/PaymentManagement.model');
var FCM_App = require('../../../Config/fcm_config').CustomerNotify;


var options = {
    priority: 'high',
    timeToLive: 60 * 60 * 24
};
var fs = require('fs-extra');

// Invoice Create
exports.InvoiceCreate = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.Seller || ReceivingData.Seller === '') {
        res.status(400).send({ Status: false, Message: "Seller can not be empty" });
    } else if (!ReceivingData.Business || ReceivingData.Business === '') {
        res.status(400).send({ Status: false, Message: "Business can not be empty" });
    } else if (!ReceivingData.Branch || ReceivingData.Branch === '') {
        res.status(400).send({ Status: false, Message: "Branch can not be empty" });
    } else if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
        res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
    } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
        res.status(400).send({ Status: false, Message: "Buyer Business can not be empty" });
    } else if (!ReceivingData.BuyerBranch || ReceivingData.BuyerBranch === '') {
        res.status(400).send({ Status: false, Message: "Buyer Branch can not be empty" });
    } else if (!ReceivingData.InvoiceNumber || ReceivingData.InvoiceNumber === '') {
        res.status(400).send({ Status: false, Message: "Invoice Number can not be empty" });
    } else {
        ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
        ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
        ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);
        ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
        ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
        ReceivingData.BuyerBranch = mongoose.Types.ObjectId(ReceivingData.BuyerBranch);
        var InvoiceDetailsArray = [];
        if (ReceivingData.InvoiceAttachments.length > 0) {
            ReceivingData.InvoiceAttachments.map(Obj => {
                if (Obj.InvoicePreviewAvailable === true) {
                    InvoiceDetailsArray.push({
                        fileName: Obj.InvoicePreview,
                        fileType: '.png'
                    });
                }
            });
        }

        var SellerBranchArr = [ReceivingData.Branch];
        var BuyerBranchArr = [ReceivingData.BuyerBranch];
        Promise.all([
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).
                populate({ path: "Owner", select: ["Mobile", "Firebase_Token"] }).exec(),
            BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.Business, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            BusinessAndBranchManagement.BranchSchema.findOne({ _id: ReceivingData.Branch, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.BuyerBusiness, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            BusinessAndBranchManagement.BranchSchema.findOne({ _id: ReceivingData.BuyerBranch, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            CustomersManagement.CustomerSchema.find({ "BusinessAndBranches.Branches": { $in: SellerBranchArr }, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            CustomersManagement.CustomerSchema.find({ "BusinessAndBranches.Branches": { $in: BuyerBranchArr }, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        ]).then(Response => {
            var SellerDetails = JSON.parse(JSON.stringify(Response[0]));
            var BusinessDetails = JSON.parse(JSON.stringify(Response[1]));
            var BranchDetails = JSON.parse(JSON.stringify(Response[2]));
            var BuyerDetails = JSON.parse(JSON.stringify(Response[3]));
            var BuyerBusinessDetails = JSON.parse(JSON.stringify(Response[4]));
            var BuyerBranchDetails = JSON.parse(JSON.stringify(Response[5]));
            var SellerUserDetails = JSON.parse(JSON.stringify(Response[6]));
            var BuyerUserDetails = JSON.parse(JSON.stringify(Response[7]));
            if (SellerDetails !== null && BusinessDetails !== null && BranchDetails !== null && BuyerDetails !== null && BuyerBusinessDetails !== null && BuyerBranchDetails !== null) {
                var Seller;
                var Buyer;
                var CustomerFCMToken = [];
                var SellerNotificationArr = [];
                var BuyerNotificationArr = [];
                if (SellerDetails.CustomerType === 'Owner') {
                    Seller = mongoose.Types.ObjectId(SellerDetails._id);
                    if (SellerUserDetails.length !== 0) {
                        SellerUserDetails.map(Obj => {
                            CustomerFCMToken.push(Obj.Firebase_Token);
                            SellerNotificationArr.push({
                                _id: mongoose.Types.ObjectId(Obj._id),
                                Mobile: Obj.Mobile
                            });
                        });
                    }
                } else if (SellerDetails.CustomerType === 'User') {
                    Seller = mongoose.Types.ObjectId(SellerDetails.Owner._id);
                    CustomerFCMToken.push(SellerDetails.Owner.Firebase_Token);
                    SellerNotificationArr.push({
                        _id: mongoose.Types.ObjectId(SellerDetails.Owner._id),
                        Mobile: SellerDetails.Owner.Mobile
                    });
                }

                var BuyerFCMToken = [];
                if (BuyerDetails.CustomerType === 'Owner') {
                    Buyer = mongoose.Types.ObjectId(BuyerDetails._id);
                    BuyerFCMToken.push(BuyerDetails.Firebase_Token);
                    BuyerNotificationArr.push({
                        _id: mongoose.Types.ObjectId(BuyerDetails._id),
                        Mobile: BuyerDetails.Mobile
                    });
                } else if (BuyerDetails.CustomerType === 'User') {
                    Buyer = mongoose.Types.ObjectId(BuyerDetails.Owner);
                    BuyerFCMToken.push(BuyerDetails.Firebase_Token);
                }


                if (BuyerUserDetails.length !== 0) {
                    BuyerUserDetails.map(Obj => {
                        BuyerFCMToken.push(Obj.Firebase_Token);
                        BuyerNotificationArr.push({
                            _id: mongoose.Types.ObjectId(Obj._id),
                            Mobile: Obj.Mobile
                        });
                    });
                }


                const Create_Invoice = new InvoiceManagement.InvoiceSchema({
                    Seller: Seller,
                    Business: ReceivingData.Business,
                    Branch: ReceivingData.Branch,
                    Buyer: Buyer,
                    BuyerBusiness: ReceivingData.BuyerBusiness,
                    BuyerBranch: ReceivingData.BuyerBranch,
                    InvoiceNumber: ReceivingData.InvoiceNumber,
                    InvoiceDate: ReceivingData.InvoiceDate || null,
                    InvoiceAmount: ReceivingData.InvoiceAmount || 0,
                    AvailableAmount: ReceivingData.InvoiceAmount || 0,
                    IfBuyerApprove: false,
                    IfBuyerNotify: false,
                    PaidORUnpaid: "Unpaid",
                    ApprovedDate: null,
                    InvoiceStatus: ReceivingData.InvoiceStatus || 'Pending',
                    InvoiceDescription: ReceivingData.InvoiceDescription,
                    Remarks: ReceivingData.Remarks,
                    CurrentCreditAmount: ReceivingData.CurrentCreditAmount,
                    UsedCurrentCreditAmount: 0,
                    TemporaryCreditAmount: ReceivingData.TemporaryCreditAmount,
                    UsedTemporaryCreditAmount: 0,
                    ExtraUsedCreditAmount: 0,
                    UsedCredit: 0,
                    ExtraUsedCredit: 0,
                    AcceptRemarks: '',
                    DisputedRemarks: '',
                    ResendRemarks: '',
                    InvoiceAttachments: InvoiceDetailsArray || [],
                    ActiveStatus: true,
                    IfDeleted: false
                });
                Create_Invoice.save((err, result) => {
                    if (err) {
                        ErrorHandling.ErrorLogCreation(req, 'Invoice Create Error', 'InvoiceManagement.Controller -> Invoice_Create', JSON.stringify(err));
                        res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to create the Invoice!.", Error: err });
                    } else {
                        result = JSON.parse(JSON.stringify(result));

                        if (result.InvoiceAttachments.length !== 0) {
                            var InvoiceArr = [];
                            var InvoiceAttachments = result.InvoiceAttachments;
                            InvoiceAttachments = InvoiceAttachments.map(Obj => {
                                var InvoiceObj = {
                                    _id: String,
                                    fileName: String,
                                    fileType: String
                                };
                                var reportData = Obj.fileName.replace(/^data:[a-z]+\/[a-z]+;base64,/, "").trim();
                                var buff = Buffer.from(reportData, 'base64');
                                const fineName = 'Uploads/Invoice/' + Obj._id + '.png';
                                InvoiceObj._id = Obj._id;
                                InvoiceObj.fileName = Obj._id + '.png';
                                InvoiceObj.fileType = Obj.fileType;
                                fs.writeFileSync(fineName, buff);
                                InvoiceArr.push(InvoiceObj);
                            });
                            InvoiceManagement.InvoiceSchema.updateOne({ _id: result._id }, { InvoiceAttachments: InvoiceArr }).exec();
                        }

                        // Seller Owner and User Notification
                        var payload = {
                            notification: {
                                title: 'Hundi-Team',
                                body: SellerDetails.ContactName + ' created an invoice for ' + BuyerBusinessDetails.BusinessName + ' ' + BuyerBranchDetails.BranchName + ' ' + 'Invoice ID - ' + result.InvoiceNumber + ' Amount - Rs.' + result.InvoiceAmount + ' Click here to view the same.',
                                sound: 'notify_tone.mp3'
                            },
                            data: {
                                Customer: SellerDetails._id,
                                notification_type: 'SellerInvoiceCreated',
                                click_action: 'FCM_PLUGIN_ACTIVITY',
                            }
                        };
                        if (CustomerFCMToken.length > 0) {
                            FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
                        }                        
                        var SmsMessage = SellerDetails.ContactName + ' created an invoice for ' + BuyerBusinessDetails.BusinessName + ' ' + BuyerBranchDetails.BranchName + ' ' + 'Invoice ID - ' + result.InvoiceNumber + ' Amount - Rs.' + result.InvoiceAmount + ' Click here to view the same.';
                        if (SellerNotificationArr.length > 0) {
                            SellerNotificationArr.map(Obj => {
                                const params = new URLSearchParams();
                                params.append('key', '25ECE50D1A3BD6');
                                params.append('msg', SmsMessage);
                                params.append('senderid', 'TXTDMO');
                                params.append('routeid', '3');
                                params.append('contacts', Obj.Mobile);

                                // axios.post('https://sms.textmysms.com/app/smsapi/index.php', params).then(function (response) {
                                //    callback(null, response.data);
                                //  }).catch(function (error) {
                                //    callback('Some Error for Seller Invite SMS!, Error: ' + error, null);
                                //  });

                                const CreateNotification = new NotificationManagement.NotificationSchema({
                                    User: null,
                                    CustomerID: Obj._id,
                                    Notification_Type: 'SellerInvoiceCreated',
                                    Message: SmsMessage,
                                    Message_Received: true,
                                    Message_Viewed: false,
                                    ActiveStatus: true,
                                    IfDeleted: false,
                                });
                                CreateNotification.save();
                                return Obj;
                            });
                        }


                        // Buyer Owner and User Notification
                        var BuyerPayload = {
                            notification: {
                                title: 'Hundi-Team',
                                body: BusinessDetails.BusinessName + ' created an invoice for ' + BuyerBusinessDetails.BusinessName + ' ' + BuyerBranchDetails.BranchName + ' ' + 'Invoice ID - ' + result.InvoiceNumber + ' Amount - Rs.' + result.InvoiceAmount + ' You can view the invoice here.',
                                sound: 'notify_tone.mp3'
                            },
                            data: {
                                Customer: BuyerDetails._id,
                                notification_type: 'BuyerInvoiceCreated',
                                click_action: 'FCM_PLUGIN_ACTIVITY',
                            }
                        };
                        if (BuyerFCMToken.length > 0) {
                            FCM_App.messaging().sendToDevice(BuyerFCMToken, BuyerPayload, options).then((NotifyRes) => { });
                        }                        
                        var BuyerSmsMessage = BusinessDetails.BusinessName + ' created an invoice for ' + BuyerBusinessDetails.BusinessName + ' ' + BuyerBranchDetails.BranchName + ' ' + 'Invoice ID - ' + result.InvoiceNumber + ' Amount - Rs.' + result.InvoiceAmount + ' You can view the invoice here.';
                        if (BuyerNotificationArr.length > 0) {
                            BuyerNotificationArr.map(Obj => {
                                const params = new URLSearchParams();
                                params.append('key', '25ECE50D1A3BD6');
                                params.append('msg', BuyerSmsMessage);
                                params.append('senderid', 'TXTDMO');
                                params.append('routeid', '3');
                                params.append('contacts', Obj.Mobile);

                                // axios.post('https://sms.textmysms.com/app/smsapi/index.php', params).then(function (response) {
                                //    callback(null, response.data);
                                //  }).catch(function (error) {
                                //    callback('Some Error for Seller Invite SMS!, Error: ' + error, null);
                                //  });

                                const CreateNotification = new NotificationManagement.NotificationSchema({
                                    User: null,
                                    CustomerID: Obj._id,
                                    Notification_Type: 'BuyerInvoiceCreated',
                                    Message: BuyerSmsMessage,
                                    Message_Received: true,
                                    Message_Viewed: false,
                                    ActiveStatus: true,
                                    IfDeleted: false,
                                });
                                CreateNotification.save();
                                return Obj;
                            });
                        }
                        res.status(200).send({ Status: true, Message: "Invoice Successfully Created" });
                    }
                });
            } else {
                res.status(400).send({ Status: false, Message: "Some Occurred Error" });
            }
        }).catch(Error => {
            // console.log(Error);
            ErrorHandling.ErrorLogCreation(req, 'Invoice Error', 'InvoiceManagement.Controller -> Some occurred Error', JSON.stringify(Error));
            res.status(417).send({ Status: false, Message: "Some occurred Error!.", Error: Error });
        });
    }
};

// Invoice Details Update
exports.InvoiceDetailsUpdate = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.Seller || ReceivingData.Seller === '') {
        res.status(400).send({ Status: false, Message: "Seller can not be empty" });
    } else if (!ReceivingData.Business || ReceivingData.Business === '') {
        res.status(400).send({ Status: false, Message: "Business can not be empty" });
    } else if (!ReceivingData.Branch || ReceivingData.Branch === '') {
        res.status(400).send({ Status: false, Message: "Branch can not be empty" });
    } else if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
        res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
    } else if (!ReceivingData.Invoice || ReceivingData.Invoice === '') {
        res.status(400).send({ Status: false, Message: "Invoice can not be empty" });
    } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
        res.status(400).send({ Status: false, Message: "Invoice can not be empty" });
    } else if (!ReceivingData.BuyerBranch || ReceivingData.BuyerBranch === '') {
        res.status(400).send({ Status: false, Message: "Invoice can not be empty" });
    } else if (!ReceivingData.InvoiceStatus || ReceivingData.InvoiceStatus === '') {
        res.status(400).send({ Status: false, Message: "Invoice Status can not be empty" });
    } else {
        var InvoiceDetailsArray = [];
        if (ReceivingData.InvoiceAttachments.length > 0) {
            ReceivingData.InvoiceAttachments.map(Obj => {
                if (Obj.InvoicePreviewAvailable === true) {
                    InvoiceDetailsArray.push({
                        fileName: Obj.InvoicePreview,
                        fileType: '.png'
                    });
                }
            });
        }
        ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
        ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
        ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);
        ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
        ReceivingData.Invoice = mongoose.Types.ObjectId(ReceivingData.Invoice);
        ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
        ReceivingData.BuyerBranch = mongoose.Types.ObjectId(ReceivingData.BuyerBranch);
        Promise.all([
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.Business, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            BusinessAndBranchManagement.BranchSchema.findOne({ _id: ReceivingData.Branch, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.BuyerBusiness, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            BusinessAndBranchManagement.BranchSchema.findOne({ _id: ReceivingData.BuyerBranch, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            InvoiceManagement.InvoiceSchema.findOne({ _id: ReceivingData.Invoice, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        ]).then(Response => {
            var SellerDetails = Response[0];
            var BusinessDetails = Response[1];
            var BranchDetails = Response[2];
            var BuyerDetails = Response[3];
            var BuyerBusinessDetails = Response[4];
            var BuyerBranchDetails = Response[5];
            var InvoiceDetails = Response[6];

            if (SellerDetails !== null && InvoiceDetails !== null && BuyerBusinessDetails !== null && BuyerBranchDetails !== null && BusinessDetails !== null && BranchDetails !== null && BuyerDetails !== null) {
                var InvoiceAttachments = [];
                if (ReceivingData.InvoiceAttachments === null) {
                    InvoiceAttachments = [];
                } else {
                    ReceivingData.InvoiceAttachments.map(obj => {
                        InvoiceAttachments.push(obj);
                    });
                }

                var Seller;
                var Buyer;
                if (SellerDetails.CustomerType === 'Owner') {
                    Seller = mongoose.Types.ObjectId(SellerDetails._id);
                } else if (SellerDetails.CustomerType === 'User') {
                    Seller = mongoose.Types.ObjectId(SellerDetails.Owner);
                }

                if (BuyerDetails.CustomerType === 'Owner') {
                    Buyer = mongoose.Types.ObjectId(BuyerDetails._id);
                } else if (BuyerDetails.CustomerType === 'User') {
                    Buyer = mongoose.Types.ObjectId(BuyerDetails.Owner);
                }

                if (ReceivingData.InvoiceStatus === "Disputed") {
                    InvoiceDetails.InvoiceStatus = 'Closed';
                    InvoiceDetails.ActiveStatus = false;
                    InvoiceDetails.IfDeleted = true;
                    InvoiceDetails.save((err, result) => {
                        if (err) {
                            ErrorHandling.ErrorLogCreation(req, 'Invoice Update Error', 'InvoiceManagement.Controller -> Invoice_Update', JSON.stringify(err));
                            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to create the Invoice!.", Error: err });
                        } else {
                            const Create_Invoice = new InvoiceManagement.InvoiceSchema({
                                Seller: Seller,
                                Business: ReceivingData.Business,
                                Branch: ReceivingData.Branch,
                                Buyer: Buyer,
                                BuyerBusiness: ReceivingData.BuyerBusiness,
                                BuyerBranch: ReceivingData.BuyerBranch,
                                InvoiceNumber: ReceivingData.InvoiceNumber,
                                InvoiceDate: InvoiceDates || null,
                                InvoiceAmount: ReceivingData.InvoiceAmount || 0,
                                AvailableAmount: ReceivingData.InvoiceAmount || 0,
                                CurrentCreditAmount: ReceivingData.CurrentCreditAmount,
                                UsedCurrentCreditAmount: 0,
                                TemporaryCreditAmount: ReceivingData.TemporaryCreditAmount,
                                ApprovedDate: null,
                                UsedTemporaryCreditAmount: 0,
                                ExtraUsedCreditAmount: 0,
                                IfBuyerApprove: false,
                                IfBuyerNotify: false,
                                InvoiceStatus: 'Pending',
                                PaidORUnpaid: "Unpaid",
                                InvoiceDescription: ReceivingData.InvoiceDescription,
                                Remarks: '',
                                AcceptRemarks: '',
                                DisputedRemarks: '',
                                ResendRemarks: '',
                                InvoiceAttachments: InvoiceDetailsArray,
                                ActiveStatus: true,
                                IfDeleted: false
                            });
                            Create_Invoice.save((errNew, resultNew) => {
                                if (errNew) {
                                    ErrorHandling.ErrorLogCreation(req, 'Invoice Create Error', 'InvoiceManagement.Controller -> Invoice_Create', JSON.stringify(errNew));
                                    res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to create the Invoice!.", Error: errNew });
                                } else {
                                    resultNew = JSON.parse(JSON.stringify(resultNew));

                                    if (resultNew.InvoiceAttachments.length !== 0) {
                                        var InvoiceArr = [];
                                        var InvoiceAttachments = resultNew.InvoiceAttachments;
                                        InvoiceAttachments = InvoiceAttachments.map(Obj => {
                                            var InvoiceObj = {
                                                _id: String,
                                                fileName: String,
                                                fileType: String
                                            };
                                            var reportData = Obj.fileName.replace(/^data:[a-z]+\/[a-z]+;base64,/, "").trim();
                                            var buff = Buffer.from(reportData, 'base64');
                                            const fineName = 'Uploads/Invoice/' + Obj._id + '.png';
                                            InvoiceObj._id = Obj._id;
                                            InvoiceObj.fileName = Obj._id + '.png';
                                            InvoiceObj.fileType = Obj.fileType;
                                            fs.writeFileSync(fineName, buff);
                                            InvoiceArr.push(InvoiceObj);
                                        });
                                        InvoiceManagement.InvoiceSchema.updateOne({ _id: result._id }, { InvoiceAttachments: InvoiceArr }).exec();
                                    }

                                    var CustomerFCMToken = [];
                                    CustomerFCMToken.push(BuyerDetails.Firebase_Token);
                                    var payload = {
                                        notification: {
                                            title: 'Hundi-Team',
                                            body: SellerDetails.ContactName + ' updated an invoice for ' + BuyerBusinessDetails.BusinessName + ' ' + BranchDetails.BranchName + ' ' + 'Invoice ID - ' + result.InvoiceNumber + ' Amount - Rs.' + result.InvoiceAmount + ' Click here to view the same.',
                                            sound: 'notify_tone.mp3'
                                        },
                                        data: {
                                            Customer: BuyerDetails._id,
                                            notification_type: 'SellerInvoiceCreated',
                                            click_action: 'FCM_PLUGIN_ACTIVITY',
                                        }
                                    };
                                    if (CustomerFCMToken.length > 0) {
                                        FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
                                    }
                                    
                                    var SmsMessage = SellerDetails.ContactName + ' updated an invoice for ' + BuyerBusinessDetails.BusinessName + ' ' + BranchDetails.BranchName + ' ' + 'Invoice ID - ' + result.InvoiceNumber + ' Amount - Rs.' + result.InvoiceAmount + ' Click here to view the same.';
                                    const params = new URLSearchParams();
                                    params.append('key', '25ECE50D1A3BD6');
                                    params.append('msg', SmsMessage);
                                    params.append('senderid', 'TXTDMO');
                                    params.append('routeid', '3');
                                    params.append('contacts', SellerDetails.Mobile);

                                    // axios.post('https://sms.textmysms.com/app/smsapi/index.php', params).then(function (response) {
                                    //    callback(null, response.data);
                                    //  }).catch(function (error) {
                                    //    callback('Some Error for Seller Invite SMS!, Error: ' + error, null);
                                    //  });
                                    const CreateNotification = new NotificationManagement.NotificationSchema({
                                        User: null,
                                        CustomerID: SellerDetails._id,
                                        Notification_Type: 'BuyerInvoiceCreated',
                                        Message: SmsMessage,
                                        Message_Received: true,
                                        Message_Viewed: false,
                                        ActiveStatus: true,
                                        IfDeleted: false,
                                    });
                                    CreateNotification.save();
                                    res.status(200).send({ Status: true, Message: "Invoice Successfully Updated" });

                                }
                            });
                        }
                    });
                } else {
                    InvoiceDetails.Seller = Seller;
                    InvoiceDetails.Business = ReceivingData.Business;
                    InvoiceDetails.Branch = ReceivingData.Branch;
                    InvoiceDetails.Buyer = Buyer;
                    InvoiceDetails.BuyerBusiness = ReceivingData.BuyerBusiness;
                    InvoiceDetails.BuyerBranch = ReceivingData.BuyerBranch;
                    InvoiceDetails.InvoiceNumber = ReceivingData.InvoiceNumber;
                    InvoiceDetails.InvoiceAmount = ReceivingData.InvoiceAmount || 0;
                    InvoiceDetails.AvailableAmount = ReceivingData.InvoiceAmount || 0;
                    InvoiceDetails.CurrentCreditAmount = ReceivingData.CurrentCreditAmount;
                    InvoiceDetails.TemporaryCreditAmount = ReceivingData.TemporaryCreditAmount;
                    InvoiceDetails.InvoiceStatus = ReceivingData.InvoiceStatus;
                    InvoiceDetails.InvoiceAttachments = InvoiceDetailsArray || [];
                    InvoiceDetails.InvoiceDate = ReceivingData.InvoiceDate;
                    InvoiceDetails.InvoiceDescription = ReceivingData.InvoiceDescription;
                    InvoiceDetails.save((err, result) => {
                        if (err) {
                            ErrorHandling.ErrorLogCreation(req, 'Invoice Update Error', 'InvoiceManagement.Controller -> Invoice_Update', JSON.stringify(err));
                            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to create the Invoice!.", Error: err });
                        } else {
                            if (InvoiceDetails.InvoiceAttachments.length !== 0) {
                                var InvoiceArr = [];
                                var InvoiceAttachments = InvoiceDetails.InvoiceAttachments;
                                InvoiceAttachments = InvoiceAttachments.map(Obj => {
                                    var InvoiceObj = {
                                        _id: String,
                                        fileName: String,
                                        fileType: String
                                    };
                                    var reportData = Obj.fileName.replace(/^data:[a-z]+\/[a-z]+;base64,/, "").trim();
                                    var buff = Buffer.from(reportData, 'base64');
                                    const fineName = 'Uploads/Invoice/' + Obj._id + '.png';
                                    InvoiceObj._id = Obj._id;
                                    InvoiceObj.fileName = Obj._id + '.png';
                                    InvoiceObj.fileType = Obj.fileType;
                                    fs.writeFileSync(fineName, buff);
                                    InvoiceArr.push(InvoiceObj);
                                });
                                InvoiceManagement.InvoiceSchema.updateOne({ _id: result._id }, { InvoiceAttachments: InvoiceArr }).exec();
                            }
                            res.status(200).send({ Status: true, Response: result, Message: 'Invoice Update Successfully' });
                        }
                    });
                }
            } else {
                res.status(400).send({ Status: false, Message: "Some Occurred Error" });
            }
        }).catch(Error => {
            // console.log(Error);
            ErrorHandling.ErrorLogCreation(req, 'SellerDetails InvoiceDetails BusinessDetails BranchDetails BuyerDetails Error', 'InvoiceManagement.Controller -> Some occurred Error', JSON.stringify(Error));
            res.status(417).send({ Status: false, Message: "Some occurred Error!.", Error: Error });
        });
    }
};

// BuyerPendingInvoice_List
exports.BuyerPendingInvoice_List = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
        res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
    } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
        res.status(400).send({ Status: false, Message: "Buyer Business can not be empty" });
    } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
        res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
    } else {
        ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
        ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
        // ReceivingData.BuyerBranch = mongoose.Types.ObjectId(ReceivingData.BuyerBranch);

        Promise.all([
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.BuyerBusiness, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            // BusinessAndBranchManagement.BranchSchema.findOne({ _id: ReceivingData.BuyerBranch, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        ]).then(Response => {
            var BuyerDetails = Response[0];
            var BusinessDetails = Response[1];
            // var BranchDetails = Response[2];

            if (BuyerDetails !== null && BusinessDetails !== null) {
                var Buyer;
                var FindQuery = {};
                // var BranchArr = [];
                var BusinessArr = [];
                // BranchArr.push(ReceivingData.BuyerBranch);
                if (BuyerDetails.CustomerType === 'Owner') {
                    Buyer = mongoose.Types.ObjectId(BuyerDetails._id);
                    FindQuery = { Buyer: Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, InvoiceStatus: "Pending" };
                } else if (BuyerDetails.CustomerType === 'User') {
                    Buyer = mongoose.Types.ObjectId(BuyerDetails.Owner);
                    if (BuyerDetails.BusinessAndBranches.length !== 0) {
                        BuyerDetails.BusinessAndBranches.map(Obj => {
                            // Obj.Business.map(obj => {
                                BusinessArr.push(mongoose.Types.ObjectId(Obj));
                            // });
                        });
                    }
                    FindQuery = { Buyer: Buyer, BuyerBusiness: { $in: BusinessArr }, InvoiceStatus: "Pending" };
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
                    InvoiceManagement.InvoiceSchema
                        .aggregate([
                            { $match: FindQuery },
                            {
                                $lookup: {
                                    from: "Business",
                                    let: { "business": "$Business" },
                                    pipeline: [
                                        { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                                        { $project: { "FirstName": 1,"LastName": 1 } }
                                    ],
                                    as: 'Business'
                                }
                            },
                            {
                                $lookup: {
                                    from: "Business",
                                    let: { "buyerBusiness": "$BuyerBusiness" },
                                    pipeline: [
                                        { $match: { $expr: { $eq: ["$$buyerBusiness", "$_id"] } } },
                                        { $project: { "FirstName": 1,"LastName": 1 } }
                                    ],
                                    as: 'BuyerBusiness'
                                }
                            },
                            { $unwind: { path: "$BuyerBusiness", preserveNullAndEmptyArrays: true } },
                            { $unwind: { path: "$Business", preserveNullAndEmptyArrays: true } },
                            // {
                            //     $lookup: {
                            //         from: "Branch",
                            //         let: { "branch": "$Branch" },
                            //         pipeline: [
                            //             { $match: { $expr: { $eq: ["$$branch", "$_id"] } } },
                            //             { $project: { "BranchName": 1 } }
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
                                    let: { "buyer": "$Buyer" },
                                    pipeline: [
                                        { $match: { $expr: { $eq: ["$$buyer", "$_id"] } } },
                                        { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                                    ],
                                    as: 'buyerInfo'
                                }
                            },
                            { $unwind: { path: "$buyerInfo", preserveNullAndEmptyArrays: true } },
                            {
                                $lookup: {
                                    from: "Customers",
                                    let: { "seller": "$Seller" },
                                    pipeline: [
                                        { $match: { $expr: { $eq: ["$$seller", "$_id"] } } },
                                        { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                                    ],
                                    as: 'SellerInfo'
                                }
                            },
                            { $unwind: { path: "$SellerInfo", preserveNullAndEmptyArrays: true } },
                            {
                                $project: {
                                    Business: 1,
                                    // BranchInfo: 1,
                                    buyer: 1,
                                    Seller: 1,
                                    // BuyerBranchInfo: 1,
                                    BuyerBusiness: 1,
                                    InvoiceDate: 1,
                                    InvoiceNumber: 1,
                                    InvoiceAmount: 1,
                                    AvailableAmount: 1,
                                    InvoiceStatus: 1,
                                    InvoiceDescription: 1,
                                    CurrentCreditAmount: 1,
                                    TemporaryCreditAmount: 1,
                                    AcceptRemarks: 1,
                                    DisputedRemarks: 1,
                                    ResendRemarks: 1,
                                    InvoiceAttachments: 1,
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
                    InvoiceManagement.InvoiceSchema.countDocuments(FindQuery).exec()
                ]).then(result => {
                    res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
                }).catch(Error => {
                    ErrorHandling.ErrorLogCreation(req, 'Invoice Find error', 'InvoiceManagement -> All Invoice List', JSON.stringify(Error));
                    res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
                });
            } else {
                res.status(200).send({ Http_Code: 400, Status: true, Message: 'Invalid User Details' });
            }
        });
    }

};

// BuyerAcceptInvoice_List
exports.BuyerAcceptInvoice_List = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
        res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
    } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
        res.status(400).send({ Status: false, Message: "Buyer Business can not be empty" });
    } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
        res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
    } else {
        ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
        ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
        // ReceivingData.BuyerBranch = mongoose.Types.ObjectId(ReceivingData.BuyerBranch);

        Promise.all([
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.BuyerBusiness, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            // BusinessAndBranchManagement.BranchSchema.findOne({ _id: ReceivingData.BuyerBranch, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        ]).then(Response => {
            var BuyerDetails = Response[0];
            var BusinessDetails = Response[1];
            // var BranchDetails = Response[2];

            if (BuyerDetails !== null && BusinessDetails !== null) {
                var Buyer;
                var FindQuery = {};
                // var BranchArr = [];
                var BusinessArr = [];
                BusinessArr.push(ReceivingData.BuyerBusiness);
                if (BuyerDetails.CustomerType === 'Owner') {
                    Buyer = mongoose.Types.ObjectId(BuyerDetails._id);
                    FindQuery = { Buyer: Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, InvoiceStatus: "Accept" };
                } else if (BuyerDetails.CustomerType === 'User') {
                    Buyer = mongoose.Types.ObjectId(BuyerDetails.Owner);
                    if (BuyerDetails.BusinessAndBranches.length !== 0) {
                        BuyerDetails.BusinessAndBranches.map(Obj => {
                            // Obj.Branches.map(obj => {
                                BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                            // });
                        });
                    }
                    FindQuery = { Buyer: Buyer, BuyerBusiness: { $in: BusinessArr }, InvoiceStatus: "Accept" };
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
                    InvoiceManagement.InvoiceSchema
                        .aggregate([
                            { $match: FindQuery },
                            {
                                $lookup: {
                                    from: "Business",
                                    let: { "business": "$Business" },
                                    pipeline: [
                                        { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                                        { $project: { "FirstName": 1,"LastName": 1 } }
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
                                        { $project: { "FirstName": 1,"LastName": 1 } }
                                    ],
                                    as: 'BuyerBusiness'
                                }
                            },
                            { $unwind: { path: "$BuyerBusiness", preserveNullAndEmptyArrays: true } },
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
                            // {
                            //     $lookup: {
                            //         from: "Branch",
                            //         let: { "branch": "$Branch" },
                            //         pipeline: [
                            //             { $match: { $expr: { $eq: ["$$branch", "$_id"] } } },
                            //             { $project: { "BranchName": 1 } }
                            //         ],
                            //         as: 'BranchInfo'
                            //     }
                            // },
                            // { $unwind: { path: "$BranchInfo", preserveNullAndEmptyArrays: true } },
                            {
                                $lookup: {
                                    from: "Customers",
                                    let: { "buyer": "$Buyer" },
                                    pipeline: [
                                        { $match: { $expr: { $eq: ["$$buyer", "$_id"] } } },
                                        { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                                    ],
                                    as: 'buyer'
                                }
                            },
                            { $unwind: { path: "$buyer", preserveNullAndEmptyArrays: true } },
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
                                $project: {
                                    Business: 1,
                                    // BranchInfo: 1,
                                    buyer: 1,
                                    Seller: 1,
                                    BuyerBusiness: 1,
                                    // BuyerBranchInfo: 1,
                                    InvoiceDate: 1,
                                    InvoiceNumber: 1,
                                    InvoiceAmount: 1,
                                    AvailableAmount: 1,
                                    InvoiceStatus: 1,
                                    InvoiceDescription: 1,
                                    CurrentCreditAmount: 1,
                                    TemporaryCreditAmount: 1,
                                    AcceptRemarks: 1,
                                    DisputedRemarks: 1,
                                    ResendRemarks: 1,
                                    InvoiceAttachments: 1,
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
                    InvoiceManagement.InvoiceSchema.countDocuments(FindQuery).exec()
                ]).then(result => {
                    res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
                }).catch(Error => {
                    console.log(Error);
                    ErrorHandling.ErrorLogCreation(req, 'Invoice Find error', 'InvoiceManagement -> All Invoice List', JSON.stringify(Error));
                    res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
                });
            } else {
                res.status(200).send({ Http_Code: 400, Status: true, Message: 'Invalid User Details' });
            }
        });
    }

};

// BuyerDisputedInvoice_List
exports.BuyerDisputedInvoice_List = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
        res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
    } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
        res.status(400).send({ Status: false, Message: "Buyer Business can not be empty" });
    } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
        res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
    } else {
        ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
        ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
        // ReceivingData.BuyerBranch = mongoose.Types.ObjectId(ReceivingData.BuyerBranch);

        Promise.all([
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.BuyerBusiness, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            // BusinessAndBranchManagement.BranchSchema.findOne({ _id: ReceivingData.BuyerBranch, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        ]).then(Response => {
            var BuyerDetails = Response[0];
            var BusinessDetails = Response[1];
            var BranchDetails = Response[2];

            if (BuyerDetails !== null && BusinessDetails !== null) {
                var Buyer;
                var FindQuery = {};
                var BusinessArr = [];
                BusinessArr.push(ReceivingData.BuyerBusiness);
                if (BuyerDetails.CustomerType === 'Owner') {
                    Buyer = mongoose.Types.ObjectId(BuyerDetails._id);
                    FindQuery = { Buyer: Buyer, BuyerBusiness: ReceivingData.BuyerBusiness,InvoiceStatus: "Disputed" };
                } else if (BuyerDetails.CustomerType === 'User') {
                    Buyer = mongoose.Types.ObjectId(BuyerDetails.Owner);
                    if (BuyerDetails.BusinessAndBranches.length !== 0) {
                        BuyerDetails.BusinessAndBranches.map(Obj => {
                            // Obj.Branches.map(obj => {
                                BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                            // });
                        });
                    }
                    FindQuery = { Buyer: Buyer, BuyerBusiness: { $in: BusinessArr }, InvoiceStatus: "Disputed" };
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
                    InvoiceManagement.InvoiceSchema
                        .aggregate([
                            { $match: FindQuery },
                            {
                                $lookup: {
                                    from: "Business",
                                    let: { "business": "$Business" },
                                    pipeline: [
                                        { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                                        { $project: { "FirstName": 1,"LastName": 1 } }
                                    ],
                                    as: 'Business'
                                }
                            },
                            { $unwind: { path: "$Business", preserveNullAndEmptyArrays: true } },
                            // {
                            //     $lookup: {
                            //         from: "Branch",
                            //         let: { "branch": "$Branch" },
                            //         pipeline: [
                            //             { $match: { $expr: { $eq: ["$$branch", "$_id"] } } },
                            //             { $project: { "BranchName": 1 } }
                            //         ],
                            //         as: 'BranchInfo'
                            //     }
                            // },
                            // { $unwind: { path: "$BranchInfo", preserveNullAndEmptyArrays: true } },
                            {
                                $lookup: {
                                    from: "Business",
                                    let: { "buyerBusiness": "$BuyerBusiness" },
                                    pipeline: [
                                        { $match: { $expr: { $eq: ["$$buyerBusiness", "$_id"] } } },
                                        { $project: { "FirstName": 1,"LastName": 1 } }
                                    ],
                                    as: 'BuyerBusiness'
                                }
                            },
                            { $unwind: { path: "$BuyerBusiness", preserveNullAndEmptyArrays: true } },
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
                                    let: { "buyer": "$Buyer" },
                                    pipeline: [
                                        { $match: { $expr: { $eq: ["$$buyer", "$_id"] } } },
                                        { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                                    ],
                                    as: 'buyer'
                                }
                            },
                            { $unwind: { path: "$buyer", preserveNullAndEmptyArrays: true } },
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
                                $project: {
                                    Business: 1,
                                    // BranchInfo: 1,
                                    buyer: 1,
                                    BuyerBusiness: 1,
                                    // BuyerBranchInfo: 1,
                                    Seller: 1,
                                    InvoiceDate: 1,
                                    InvoiceNumber: 1,
                                    InvoiceAmount: 1,
                                    AvailableAmount: 1,
                                    InvoiceStatus: 1,
                                    InvoiceDescription: 1,
                                    CurrentCreditAmount: 1,
                                    TemporaryCreditAmount: 1,
                                    AcceptRemarks: 1,
                                    DisputedRemarks: 1,
                                    ResendRemarks: 1,
                                    InvoiceAttachments: 1,
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
                    InvoiceManagement.InvoiceSchema.countDocuments(FindQuery).exec()
                ]).then(result => {
                    res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
                }).catch(Error => {
                    ErrorHandling.ErrorLogCreation(req, 'Invoice Find error', 'InvoiceManagement -> All Invoice List', JSON.stringify(Error));
                    res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
                });
            } else {
                res.status(200).send({ Http_Code: 400, Status: true, Message: 'Invalid User Details' });
            }
        });
    }

};

// Seller All Invoice List 
exports.SellerPendingInvoice_List = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.Seller || ReceivingData.Seller === '') {
        res.status(400).send({ Status: false, Message: "Seller can not be empty" });
    } else if (!ReceivingData.Business || ReceivingData.Business === '') {
        res.status(400).send({ Status: false, Message: "Business can not be empty" });
    } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
        res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
    } else {
        ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
        ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
        // ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);

        Promise.all([
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.Business, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            // BusinessAndBranchManagement.BranchSchema.findOne({ _id: ReceivingData.Branch, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        ]).then(Response => {
            var SellerDetails = Response[0];
            var BusinessDetails = Response[1];
            // var BranchDetails = Response[2];

            if (SellerDetails !== null && BusinessDetails !== null) {
                var Seller;
                var FindQuery = {};
                // var BranchArr = [];
                var BusinessArr = [];
                BusinessArr.push(ReceivingData.BuyerBusiness);
                if (SellerDetails.CustomerType === 'Owner') {
                    Seller = mongoose.Types.ObjectId(SellerDetails._id);
                    FindQuery = { Seller: Seller, Business: ReceivingData.Business, InvoiceStatus: "Pending" };
                } else if (SellerDetails.CustomerType === 'User') {
                    Seller = mongoose.Types.ObjectId(SellerDetails.Owner);
                    if (SellerDetails.BusinessAndBranches.length !== 0) {
                        SellerDetails.BusinessAndBranches.map(Obj => {
                            // Obj.Branches.map(obj => {
                                BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                            // });
                        });
                    }
                    FindQuery = { Seller: Seller, Business: { $in: BusinessArr }, InvoiceStatus: "Pending" };
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
                    InvoiceManagement.InvoiceSchema
                        .aggregate([
                            { $match: FindQuery },
                            {
                                $lookup: {
                                    from: "Business",
                                    let: { "buyerBusiness": "$BuyerBusiness" },
                                    pipeline: [
                                        { $match: { $expr: { $eq: ["$$buyerBusiness", "$_id"] } } },
                                        { $project: { "FirstName": 1,"LastName": 1 } }
                                    ],
                                    as: 'BuyerBusiness'
                                }
                            },
                            { $unwind: { path: "$BuyerBusiness", preserveNullAndEmptyArrays: true } },
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
                                    let: { "buyer": "$Buyer" },
                                    pipeline: [
                                        { $match: { $expr: { $eq: ["$$buyer", "$_id"] } } },
                                        { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                                    ],
                                    as: 'buyer'
                                }
                            },
                            { $unwind: { path: "$buyer", preserveNullAndEmptyArrays: true } },
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
                                    from: "Business",
                                    let: { "business": "$Business" },
                                    pipeline: [
                                        { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                                        { $project: { "FirstName": 1,"LastName": 1 } }
                                    ],
                                    as: 'Business'
                                }
                            },
                            { $unwind: { path: "$Business", preserveNullAndEmptyArrays: true } },
                            // {
                            //     $lookup: {
                            //         from: "Branch",
                            //         let: { "branch": "$Branch" },
                            //         pipeline: [
                            //             { $match: { $expr: { $eq: ["$$branch", "$_id"] } } },
                            //             { $project: { "BranchName": 1 } }
                            //         ],
                            //         as: 'BranchInfo'
                            //     }
                            // },
                            // { $unwind: { path: "$BranchInfo", preserveNullAndEmptyArrays: true } },
                            {
                                $project: {
                                    BuyerBusiness: 1,
                                    // BuyerBranchInfo: 1,
                                    Business: 1,
                                    // BranchInfo: 1,
                                    buyer: 1,
                                    Seller: 1,
                                    InvoiceDate: 1,
                                    InvoiceAmount: 1,
                                    AvailableAmount: 1,
                                    InvoiceStatus: 1,
                                    InvoiceNumber: 1,
                                    InvoiceDescription: 1,
                                    CurrentCreditAmount: 1,
                                    TemporaryCreditAmount: 1,
                                    AcceptRemarks: 1,
                                    DisputedRemarks: 1,
                                    ResendRemarks: 1,
                                    InvoiceAttachments: 1,
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
                    InvoiceManagement.InvoiceSchema.countDocuments(FindQuery).exec()
                ]).then(result => {
                    res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
                }).catch(Error => {
                    ErrorHandling.ErrorLogCreation(req, 'Invoice Find error', 'InvoiceManagement -> All Invoice List', JSON.stringify(Error));
                    res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
                });
            } else {
                res.status(200).send({ Http_Code: 400, Status: true, Message: 'Invalid User Details' });
            }
        });
    }

};

// SellerAcceptInvoice_List
exports.SellerAcceptInvoice_List = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.Seller || ReceivingData.Seller === '') {
        res.status(400).send({ Status: false, Message: "Seller can not be empty" });
    } else if (!ReceivingData.Business || ReceivingData.Business === '') {
        res.status(400).send({ Status: false, Message: "Business can not be empty" });
    } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
        res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
    } else {
        ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
        ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
        // ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);

        Promise.all([
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.Business, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            // BusinessAndBranchManagement.BranchSchema.findOne({ _id: ReceivingData.Branch, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        ]).then(Response => {
            var SellerDetails = Response[0];
            var BusinessDetails = Response[1];
            // var BranchDetails = Response[2];

            if (SellerDetails !== null && BusinessDetails !== null) {
                var Seller;
                var FindQuery = {};
                // var BranchArr = [];
                var BusinsArr = [];
                BusinsArr.push(ReceivingData.BuyerBusiness);
                if (SellerDetails.CustomerType === 'Owner') {
                    Seller = mongoose.Types.ObjectId(SellerDetails._id);
                    FindQuery = { Seller: Seller, Business: ReceivingData.Business,InvoiceStatus: "Accept" };
                } else if (SellerDetails.CustomerType === 'User') {
                    Seller = mongoose.Types.ObjectId(SellerDetails.Owner);

                    if (SellerDetails.BusinessAndBranches.length !== 0) {
                        SellerDetails.BusinessAndBranches.map(Obj => {
                            // Obj.Branches.map(obj => {
                                BusinsArr.push(mongoose.Types.ObjectId(Obj.Business));
                            // });
                        });
                    }
                    FindQuery = { Seller: Seller, Business: { $in: BusinsArr }, InvoiceStatus: "Accept" };
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
                    InvoiceManagement.InvoiceSchema
                        .aggregate([
                            { $match: FindQuery },
                            {
                                $lookup: {
                                    from: "Business",
                                    let: { "buyerBusiness": "$BuyerBusiness" },
                                    pipeline: [
                                        { $match: { $expr: { $eq: ["$$buyerBusiness", "$_id"] } } },
                                        { $project: { "FirstName": 1,"LastName": 1 } }
                                    ],
                                    as: 'BuyerBusiness'
                                }
                            },
                            { $unwind: { path: "$BuyerBusiness", preserveNullAndEmptyArrays: true } },
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
                                    let: { "buyer": "$Buyer" },
                                    pipeline: [
                                        { $match: { $expr: { $eq: ["$$buyer", "$_id"] } } },
                                        { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                                    ],
                                    as: 'buyer'
                                }
                            },
                            { $unwind: { path: "$buyer", preserveNullAndEmptyArrays: true } },
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
                                    from: "Business",
                                    let: { "business": "$Business" },
                                    pipeline: [
                                        { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                                        { $project: { "FirstName": 1,"LastName": 1 } }
                                    ],
                                    as: 'Business'
                                }
                            },
                            { $unwind: { path: "$Business", preserveNullAndEmptyArrays: true } },
                            // {
                            //     $lookup: {
                            //         from: "Branch",
                            //         let: { "branch": "$Branch" },
                            //         pipeline: [
                            //             { $match: { $expr: { $eq: ["$$branch", "$_id"] } } },
                            //             { $project: { "BranchName": 1 } }
                            //         ],
                            //         as: 'BranchInfo'
                            //     }
                            // },
                            // { $unwind: { path: "$BranchInfo", preserveNullAndEmptyArrays: true } },
                            {
                                $project: {
                                    BuyerBusiness: 1,
                                    // BuyerBranchInfo: 1,
                                    Business: 1,
                                    // BranchInfo: 1,
                                    buyer: 1,
                                    Seller: 1,
                                    InvoiceDate: 1,
                                    InvoiceAmount: 1,
                                    AvailableAmount: 1,
                                    InvoiceStatus: 1,
                                    InvoiceNumber: 1,
                                    InvoiceDescription: 1,
                                    CurrentCreditAmount: 1,
                                    TemporaryCreditAmount: 1,
                                    AcceptRemarks: 1,
                                    DisputedRemarks: 1,
                                    ResendRemarks: 1,
                                    InvoiceAttachments: 1,
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
                    InvoiceManagement.InvoiceSchema.countDocuments(FindQuery).exec()
                ]).then(result => {
                    res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
                }).catch(Error => {
                    ErrorHandling.ErrorLogCreation(req, 'Invoice Find error', 'InvoiceManagement -> All Invoice List', JSON.stringify(Error));
                    res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
                });
            } else {
                res.status(200).send({ Http_Code: 400, Status: true, Message: 'Invalid User Details' });
            }
        });
    }

};


// SellerDisputedInvoice_List
exports.SellerDisputedInvoice_List = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.Seller || ReceivingData.Seller === '') {
        res.status(400).send({ Status: false, Message: "Seller can not be empty" });
    } else if (!ReceivingData.Business || ReceivingData.Business === '') {
        res.status(400).send({ Status: false, Message: "Business can not be empty" });
    } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
        res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
    } else {
        ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
        ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
        // ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);

        Promise.all([
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.Business, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            // BusinessAndBranchManagement.BranchSchema.findOne({ _id: ReceivingData.Branch, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        ]).then(Response => {
            var SellerDetails = Response[0];
            var BusinessDetails = Response[1];
            // var BranchDetails = Response[2];

            if (SellerDetails !== null && BusinessDetails !== null) {
                var Seller;
                var FindQuery = {};
                // var BranchArr = [];
                var BusinessArr = [];
                BusinessArr.push(ReceivingData.BuyerBusiness);
                if (SellerDetails.CustomerType === 'Owner') {
                    Seller = mongoose.Types.ObjectId(SellerDetails._id);
                    FindQuery = { Seller: Seller, Business: ReceivingData.Business,InvoiceStatus: "Disputed" };
                } else if (SellerDetails.CustomerType === 'User') {
                    Seller = mongoose.Types.ObjectId(SellerDetails.Owner);

                    if (SellerDetails.BusinessAndBranches.length !== 0) {
                        SellerDetails.BusinessAndBranches.map(Obj => {
                            // Obj.Branches.map(obj => {
                                BranchArr.push(mongoose.Types.ObjectId(Obj.Business));
                            // });
                        });
                    }
                    FindQuery = { Seller: Seller, Business: { $in: BusinessArr }, InvoiceStatus: "Disputed" };
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
                    InvoiceManagement.InvoiceSchema
                        .aggregate([
                            { $match: FindQuery },
                            {
                                $lookup: {
                                    from: "Business",
                                    let: { "buyerBusiness": "$BuyerBusiness" },
                                    pipeline: [
                                        { $match: { $expr: { $eq: ["$$buyerBusiness", "$_id"] } } },
                                        { $project: { "FirstName": 1,"LastName": 1 } }
                                    ],
                                    as: 'BuyerBusiness'
                                }
                            },
                            { $unwind: { path: "$BuyerBusiness", preserveNullAndEmptyArrays: true } },
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
                                    let: { "buyer": "$Buyer" },
                                    pipeline: [
                                        { $match: { $expr: { $eq: ["$$buyer", "$_id"] } } },
                                        { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                                    ],
                                    as: 'buyer'
                                }
                            },
                            { $unwind: { path: "$buyer", preserveNullAndEmptyArrays: true } },
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
                                    from: "Business",
                                    let: { "business": "$Business" },
                                    pipeline: [
                                        { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                                        { $project: { "FirstName": 1,"LastName": 1 } }
                                    ],
                                    as: 'Business'
                                }
                            },
                            { $unwind: { path: "$Business", preserveNullAndEmptyArrays: true } },
                            // {
                            //     $lookup: {
                            //         from: "Branch",
                            //         let: { "branch": "$Branch" },
                            //         pipeline: [
                            //             { $match: { $expr: { $eq: ["$$branch", "$_id"] } } },
                            //             { $project: { "BranchName": 1 } }
                            //         ],
                            //         as: 'BranchInfo'
                            //     }
                            // },
                            // { $unwind: { path: "$BranchInfo", preserveNullAndEmptyArrays: true } },
                            {
                                $project: {
                                    BuyerBusiness: 1,
                                    // BuyerBranchInfo: 1,
                                    Business: 1,
                                    // BranchInfo: 1,
                                    buyer: 1,
                                    Seller: 1,
                                    InvoiceDate: 1,
                                    InvoiceAmount: 1,
                                    AvailableAmount: 1,
                                    InvoiceStatus: 1,
                                    InvoiceNumber: 1,
                                    InvoiceDescription: 1,
                                    CurrentCreditAmount: 1,
                                    TemporaryCreditAmount: 1,
                                    AcceptRemarks: 1,
                                    DisputedRemarks: 1,
                                    ResendRemarks: 1,
                                    InvoiceAttachments: 1,
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
                    InvoiceManagement.InvoiceSchema.countDocuments(FindQuery).exec()
                ]).then(result => {
                    res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
                }).catch(Error => {
                    ErrorHandling.ErrorLogCreation(req, 'Invoice Find error', 'InvoiceManagement -> All Invoice List', JSON.stringify(Error));
                    res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
                });
            } else {
                res.status(200).send({ Http_Code: 400, Status: true, Message: 'Invalid User Details' });
            }
        });
    }

};

// Seller Business And Branches Invoice List for Seller 
exports.Seller_InvoiceCount = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.Seller || ReceivingData.Seller === '') {
        res.status(400).send({ Status: false, Message: "Seller can not be empty" });
    } else {
        ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
        CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller }, {}, {}).exec(function (err, result) {
            if (err) {
                ErrorHandling.ErrorLogCreation(req, 'Seller Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(err));
                res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
            } else {
                if (result !== null) {
                    if (result.CustomerType === 'Owner') {
                        Promise.all([
                            BusinessAndBranchManagement.BusinessSchema.find({ Customer: ReceivingData.Seller, IfSeller: true, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                            BusinessAndBranchManagement.BranchSchema.find({ Customer: ReceivingData.Seller, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                            InvoiceManagement.InvoiceSchema.find({ Seller: ReceivingData.Seller, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                            InvoiceManagement.InvoiceSchema.find({ Seller: ReceivingData.Seller, ActiveStatus: true, InvoiceStatus: 'Pending', IfDeleted: false }, {}, {}).exec(),
                            PaymentModel.PaymentSchema.find({ Seller: ReceivingData.Seller, Payment_Status: "Pending" }, {}, {}).exec(),
                        ]).then(ResponseOU => {
                            var BusinessDetails = JSON.parse(JSON.stringify(ResponseOU[0]));
                            var BranchDetails = JSON.parse(JSON.stringify(ResponseOU[1]));
                            var InvoiceDetails = JSON.parse(JSON.stringify(ResponseOU[2]));
                            var InvoicePendingDetails = JSON.parse(JSON.stringify(ResponseOU[3]));
                            var PendingPaymentDetails = JSON.parse(JSON.stringify(ResponseOU[4]));
                            if (BusinessDetails.length > 0) {
                                BusinessDetails.map(Obj => {
                                    Obj.ExtraUnitizedCreditLimit = 0;
                                    Obj.CreditBalanceExists = false;
                                    const BranchDetailsArr = BranchDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                                    if (BranchDetailsArr.length > 0) {
                                        Obj.Branches = BranchDetailsArr;
                                        Obj.Branches = JSON.parse(JSON.stringify(Obj.Branches));
                                        Obj.Branches.map(ObjB => {
                                            ObjB.ExtraUnitizedCreditLimit = 0;
                                            ObjB.CreditBalanceExists = false;
                                            ObjB.UserDetails = [];
                                            ObjB.TotalInvoiceAmount = 0;
                                            const InvoiceDetailsBranchArr = InvoicePendingDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Branch)) === JSON.parse(JSON.stringify(ObjB._id)));
                                            const InvoiceAcceptDetailsBranchArr = PendingPaymentDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Branch)) === JSON.parse(JSON.stringify(ObjB._id)));
                                            ObjB.InvoiceCount = InvoiceDetailsBranchArr.length;
                                            ObjB.PaymentCount = InvoiceAcceptDetailsBranchArr.length;
                                            const InvoiceDetailsBranchArray = InvoiceDetails.filter(obj1 => obj1.Branch === ObjB._id);
                                            if (InvoiceDetailsBranchArray.length > 0) {
                                                var InvoiceAmount = 0;
                                                InvoiceDetailsBranchArray.map(obj => {
                                                    InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.AvailableAmount);
                                                });
                                                if (InvoiceAmount > 0) {
                                                    ObjB.TotalInvoiceAmount = InvoiceAmount.toFixed(2);
                                                    ObjB.TotalInvoiceAmount = parseFloat(ObjB.TotalInvoiceAmount);
                                                    ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit) - parseFloat(InvoiceAmount);
                                                    if (ObjB.AvailableCreditLimit > 0) {
                                                        ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                                                    } else {
                                                        ObjB.ExtraUnitizedCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                                                        ObjB.ExtraUnitizedCreditLimit = ObjB.ExtraUnitizedCreditLimit.toFixed(2);
                                                        ObjB.ExtraUnitizedCreditLimit = parseFloat(ObjB.ExtraUnitizedCreditLimit);
                                                        ObjB.CreditBalanceExists = true;
                                                        ObjB.AvailableCreditLimit = 0;
                                                    }
                                                    ObjB.AvailableCreditLimit = ObjB.AvailableCreditLimit.toFixed(2);
                                                    ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                                                }
                                            }
                                            return ObjB;
                                        });
                                    } else {
                                        Obj.Branches = [];
                                    }
                                    const BranchDetailsArrArr = BranchDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                                    var BranchCreditLimit = 0;
                                    if (BranchDetailsArrArr.length > 0) {
                                        BranchDetailsArrArr.map(obj => {
                                            BranchCreditLimit = parseFloat(BranchCreditLimit) + parseFloat(obj.AvailableCreditLimit);
                                        });
                                        if (BranchCreditLimit > 0) {
                                            Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) - parseFloat(BranchCreditLimit);
                                            if (Obj.AvailableCreditLimit > 0) {
                                                Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                            } else {
                                                Obj.AvailableCreditLimit = 0;
                                            }
                                            Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                                            Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                        }
                                    }
                                    const InvoiceDetailsArr = InvoicePendingDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                                    const PaymentDetailsArr = PendingPaymentDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                                    Obj.BusinessInvoice = InvoiceDetailsArr.length;
                                    Obj.BusinessPayment = PaymentDetailsArr.length;
                                    return Obj;
                                });
                                res.status(200).send({ Status: true, Message: 'Buyer Invoice Count', Response: BusinessDetails });
                            } else {
                                res.status(200).send({ Status: true, Message: 'No Records Found', Response: [] });
                            }
                        }).catch(Error => {
                            ErrorHandling.ErrorLogCreation(req, 'Seller Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(Error));
                            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
                        });
                    } else if (result.CustomerType === 'User') {
                        var BuyerBusinessArray = [];
                        var BuyerBranchArray = [];
                        if (result.BusinessAndBranches.length > 0) {
                            result.BusinessAndBranches.map(Obj => {
                                BuyerBusinessArray.push(mongoose.Types.ObjectId(Obj.Business));
                                Obj.Branches.map(obj => {
                                    BuyerBranchArray.push(mongoose.Types.ObjectId(obj));
                                });
                            });
                        }

                        Promise.all([
                            BusinessAndBranchManagement.BusinessSchema.find({ _id: { $in: BuyerBusinessArray }, IfSeller: true, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                            BusinessAndBranchManagement.BranchSchema.find({ _id: { $in: BuyerBranchArray }, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                            InvoiceManagement.InvoiceSchema.find({ Branch: { $in: BuyerBranchArray }, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                            InvoiceManagement.InvoiceSchema.find({ Branch: { $in: BuyerBranchArray }, ActiveStatus: true, InvoiceStatus: 'Pending', IfDeleted: false }, {}, {}).exec(),
                            PaymentModel.PaymentSchema.find({ Branch: { $in: BuyerBranchArray }, Payment_Status: "Pending" }, {}, {}).exec(),
                        ]).then(ResponseOU => {
                            var BusinessDetails = JSON.parse(JSON.stringify(ResponseOU[0]));
                            var BranchDetails = JSON.parse(JSON.stringify(ResponseOU[1]));
                            var InvoiceDetails = JSON.parse(JSON.stringify(ResponseOU[2]));
                            var InvoicePendingDetails = JSON.parse(JSON.stringify(ResponseOU[3]));
                            var PendingPaymentDetails = JSON.parse(JSON.stringify(ResponseOU[4]));
                            if (BusinessDetails.length > 0) {
                                BusinessDetails.map(Obj => {
                                    Obj.ExtraUnitizedCreditLimit = 0;
                                    Obj.CreditBalanceExists = false;
                                    const BranchDetailsArr = BranchDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                                    if (BranchDetailsArr.length > 0) {
                                        Obj.Branches = BranchDetailsArr;
                                        Obj.Branches = JSON.parse(JSON.stringify(Obj.Branches));
                                        Obj.Branches.map(ObjB => {
                                            ObjB.ExtraUnitizedCreditLimit = 0;
                                            ObjB.CreditBalanceExists = false;
                                            ObjB.UserDetails = [];
                                            ObjB.TotalInvoiceAmount = 0;
                                            const InvoiceDetailsBranchArr = InvoicePendingDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Branch)) === JSON.parse(JSON.stringify(ObjB._id)));
                                            const InvoiceAcceptDetailsBranchArr = PendingPaymentDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Branch)) === JSON.parse(JSON.stringify(ObjB._id)));
                                            ObjB.InvoiceCount = InvoiceDetailsBranchArr.length;
                                            ObjB.PaymentCount = InvoiceAcceptDetailsBranchArr.length;
                                            const InvoiceDetailsBranchArray = InvoiceDetails.filter(obj1 => obj1.Branch === ObjB._id);
                                            if (InvoiceDetailsBranchArray.length > 0) {
                                                var InvoiceAmount = 0;
                                                InvoiceDetailsBranchArray.map(obj => {
                                                    InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.AvailableAmount);
                                                });
                                                if (InvoiceAmount > 0) {
                                                    ObjB.TotalInvoiceAmount = InvoiceAmount.toFixed(2);
                                                    ObjB.TotalInvoiceAmount = parseFloat(ObjB.TotalInvoiceAmount);
                                                    ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit) - parseFloat(InvoiceAmount);
                                                    if (ObjB.AvailableCreditLimit > 0) {
                                                        ObjB.AvailableCreditLimit = Math.abs(ObjB.AvailableCreditLimit);
                                                    } else {
                                                        ObjB.ExtraUnitizedCreditLimit = -Math.abs(ObjB.ExtraUnitizedCreditLimit);
                                                        ObjB.ExtraUnitizedCreditLimit = ObjB.ExtraUnitizedCreditLimit.toFixed(2);
                                                        ObjB.ExtraUnitizedCreditLimit = parseFloat(ObjB.ExtraUnitizedCreditLimit);
                                                        ObjB.CreditBalanceExists = true;
                                                        ObjB.AvailableCreditLimit = 0;
                                                    }
                                                    ObjB.AvailableCreditLimit = ObjB.AvailableCreditLimit.toFixed(2);
                                                    ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                                                }
                                            }
                                            return ObjB;
                                        });
                                    } else {
                                        Obj.Branches = [];
                                    }
                                    const BranchDetailsArrArr = BranchDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                                    var BranchCreditLimit = 0;
                                    if (BranchDetailsArrArr.length > 0) {
                                        BranchDetailsArrArr.map(obj => {
                                            BranchCreditLimit = parseFloat(BranchCreditLimit) + parseFloat(obj.AvailableCreditLimit);
                                        });
                                        if (BranchCreditLimit > 0) {
                                            Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) - parseFloat(BranchCreditLimit);
                                            if (Obj.AvailableCreditLimit > 0) {
                                                Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                            } else {
                                                Obj.AvailableCreditLimit = 0;
                                            }
                                            Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                                            Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                        }
                                    }
                                    const InvoiceDetailsArr = InvoicePendingDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                                    const PaymentDetailsArr = PendingPaymentDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                                    Obj.BusinessInvoice = InvoiceDetailsArr.length;
                                    Obj.BusinessPayment = PaymentDetailsArr.length;
                                    return Obj;
                                });
                                res.status(200).send({ Status: true, Message: 'Buyer Invoice Count', Response: BusinessDetails });
                            } else {
                                res.status(200).send({ Status: true, Message: 'No Records Found', Response: [] });
                            }
                        }).catch(Error => {
                            ErrorHandling.ErrorLogCreation(req, 'Seller Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(Error));
                            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
                        });
                    }
                } else {
                    res.status(400).send({ Status: false, Message: "Invalid Customer Details" });
                }
            }
        });
    }
};

// Buyer Business And Branches Invoice List for Buyer
exports.Buyer_InvoiceCount = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
        res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
    } else {
        ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
        CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer }, {}, {}).exec(function (err, result) {
            if (err) {
                ErrorHandling.ErrorLogCreation(req, 'Seller Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(err));
                res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
            } else {
                if (result !== null) {
                    if (result.CustomerType === 'Owner') {
                        Promise.all([
                            BusinessAndBranchManagement.BusinessSchema.find({ Customer: ReceivingData.Buyer, IfBuyer: true, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                            BusinessAndBranchManagement.BranchSchema.find({ Customer: ReceivingData.Buyer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                            InviteManagement.InviteManagementSchema.find({ Buyer: ReceivingData.Buyer, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                            TemporaryManagement.CreditSchema.find({ Buyer: ReceivingData.Buyer, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                            InvoiceManagement.InvoiceSchema.find({ Buyer: ReceivingData.Buyer, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                            InvoiceManagement.InvoiceSchema.find({ Buyer: ReceivingData.Buyer, ActiveStatus: true, InvoiceStatus: 'Pending', IfDeleted: false }, {}, {}).exec(),
                            PaymentModel.PaymentSchema.find({ Buyer: ReceivingData.Buyer, Payment_Status: "Pending" }, {}, {}).exec(),
                            InvoiceManagement.InvoiceSchema.find({ Buyer: ReceivingData.Buyer, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                        ]).then(ResponseOU => {
                            var BusinessDetails = JSON.parse(JSON.stringify(ResponseOU[0]));
                            var BranchDetails = JSON.parse(JSON.stringify(ResponseOU[1]));
                            var InviteDetails = JSON.parse(JSON.stringify(ResponseOU[2]));
                            var TemporaryDetails = JSON.parse(JSON.stringify(ResponseOU[3]));
                            var InvoiceDetails = JSON.parse(JSON.stringify(ResponseOU[4]));
                            var InvoicePendingDetails = JSON.parse(JSON.stringify(ResponseOU[5]));
                            var PendingPaymentDetails = JSON.parse(JSON.stringify(ResponseOU[6]));
                            var InvoiceAcceptList = JSON.parse(JSON.stringify(ResponseOU[7]));
                            if (BusinessDetails.length > 0) {
                                BusinessDetails.map(Obj => {
                                    Obj.ExtraUnitizedCreditLimit = 0;
                                    Obj.CreditBalanceExists = false;
                                    const BranchDetailsArr = BranchDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                                    if (BranchDetailsArr.length > 0) {
                                        Obj.Branches = BranchDetailsArr;
                                        Obj.Branches = JSON.parse(JSON.stringify(Obj.Branches));
                                        Obj.Branches.map(ObjB => {
                                            ObjB.ExtraUnitizedCreditLimit = 0;
                                            ObjB.CreditBalanceExists = false;
                                            ObjB.UserDetails = [];
                                            ObjB.TotalInvoiceAmount = 0;
                                            const InvoiceDetailsBranchArr = InvoicePendingDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.BuyerBranch)) === JSON.parse(JSON.stringify(ObjB._id)));
                                            const InvoiceAcceptDetailsBranchArr = InvoiceAcceptList.filter(obj1 => JSON.parse(JSON.stringify(obj1.BuyerBranch)) === JSON.parse(JSON.stringify(ObjB._id)));

                                            ObjB.InvoiceCount = InvoiceDetailsBranchArr.length;
                                            ObjB.PaymentCount = InvoiceAcceptDetailsBranchArr.length;
                                            const TemporaryDetailsBranchArr = TemporaryDetails.filter(obj1 => obj1.BuyerBranch === ObjB._id);
                                            if (TemporaryDetailsBranchArr.length > 0) {
                                                var BranchValidityDate = new Date();
                                                var BranchTodayDate = new Date();
                                                TemporaryDetailsBranchArr.map(obj => {
                                                    BranchValidityDate = new Date(obj.updatedAt);
                                                    BranchValidityDate = new Date(BranchValidityDate.setDate(BranchValidityDate.getDate() + obj.ApprovedPeriod));
                                                    if (BranchValidityDate.valueOf() >= BranchTodayDate.valueOf()) {
                                                        ObjB.BranchCreditLimit = parseFloat(ObjB.BranchCreditLimit) + parseFloat(obj.ApproveLimit);
                                                        ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit) + parseFloat(obj.ApproveLimit);
                                                    }
                                                });
                                            }

                                            const InviteDetailsBranchArr = InviteDetails.filter(obj1 => obj1.BuyerBranch === ObjB._id);
                                            if (InviteDetailsBranchArr.length > 0) {
                                                var BranchValidityInviteDate = new Date();
                                                var BranchTodayInviteDate = new Date();
                                                InviteDetailsBranchArr.map(obj => {
                                                    //  BranchValidityInviteDate = new Date(obj.updatedAt);
                                                    //  BranchValidityInviteDate = new Date(BranchValidityInviteDate.setDate(BranchValidityInviteDate.getDate() + obj.BuyerPaymentCycle));
                                                    //  if (BranchValidityInviteDate.valueOf() >= BranchTodayInviteDate.valueOf()) {
                                                    ObjB.BranchCreditLimit = parseFloat(ObjB.BranchCreditLimit) + parseFloat(obj.AvailableLimit);
                                                    ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit) + parseFloat(obj.AvailableLimit);
                                                    //  }
                                                });
                                            }

                                            const InvoiceDetailsBranchArray = InvoiceDetails.filter(obj1 => obj1.BuyerBranch === ObjB._id);
                                            if (InvoiceDetailsBranchArray.length > 0) {
                                                var BranchInvoiceAmount = 0;
                                                InvoiceDetailsBranchArray.map(obj => {
                                                    BranchInvoiceAmount = parseFloat(BranchInvoiceAmount) + parseFloat(obj.AvailableAmount);
                                                });

                                                if (BranchInvoiceAmount > 0) {
                                                    ObjB.TotalInvoiceAmount = BranchInvoiceAmount.toFixed(2);
                                                    ObjB.TotalInvoiceAmount = parseFloat(ObjB.TotalInvoiceAmount);
                                                    ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit) - parseFloat(BranchInvoiceAmount);
                                                    if (ObjB.AvailableCreditLimit > 0) {
                                                        ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                                                    } else {
                                                        ObjB.ExtraUnitizedCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                                                        ObjB.ExtraUnitizedCreditLimit = ObjB.ExtraUnitizedCreditLimit.toFixed(2);
                                                        ObjB.ExtraUnitizedCreditLimit = parseFloat(ObjB.ExtraUnitizedCreditLimit);
                                                        ObjB.CreditBalanceExists = true;
                                                        ObjB.AvailableCreditLimit = 0;
                                                    }
                                                    ObjB.AvailableCreditLimit = ObjB.AvailableCreditLimit.toFixed(2);
                                                    ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                                                }
                                            }
                                            return ObjB;
                                        });
                                    } else {
                                        Obj.Branches = [];
                                    }

                                    const TemporaryDetailsArr = TemporaryDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                                    if (TemporaryDetailsArr.length > 0) {
                                        var ValidityDate = new Date();
                                        var TodayDate = new Date();
                                        TemporaryDetailsArr.map(obj => {
                                            ValidityDate = new Date(obj.updatedAt);
                                            ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + obj.ApprovedPeriod));
                                            if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                                                Obj.BusinessCreditLimit = parseFloat(Obj.BusinessCreditLimit) + parseFloat(obj.ApproveLimit);
                                                Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.ApproveLimit);
                                            }
                                        });
                                    }

                                    const InviteDetailsArr = InviteDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                                    if (InviteDetailsArr.length > 0) {
                                        var ValidityInviteDate = new Date();
                                        var TodayInviteDate = new Date();
                                        InviteDetailsArr.map(obj => {
                                            //   ValidityInviteDate = new Date(obj.updatedAt);
                                            //   ValidityInviteDate = new Date(ValidityInviteDate.setDate(ValidityInviteDate.getDate() + obj.BuyerPaymentCycle));
                                            //   if (ValidityInviteDate.valueOf() >= TodayInviteDate.valueOf()) {
                                            Obj.BusinessCreditLimit = parseFloat(Obj.BusinessCreditLimit) + parseFloat(obj.AvailableLimit);
                                            Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.AvailableLimit);
                                            //  }
                                        });
                                    }

                                    const InvoiceDetailsArray = InvoiceDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                                    if (InvoiceDetailsArray.length > 0) {
                                        var UsedCurrentCreditAmount = 0;
                                        var UsedForTemporaryAmount = 0;
                                        InvoiceDetailsArray.map(obj => {
                                            UsedCurrentCreditAmount = parseFloat(UsedCurrentCreditAmount) + parseFloat(obj.UsedCurrentCreditAmount);
                                            UsedForTemporaryAmount = parseFloat(UsedForTemporaryAmount) + parseFloat(obj.UsedTemporaryCreditAmount);
                                        });

                                        var PermanentCreditAmount = parseFloat(UsedCurrentCreditAmount) + parseFloat(UsedForTemporaryAmount);
                                        if (PermanentCreditAmount > 0) {
                                            Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) - parseFloat(PermanentCreditAmount);
                                            if (Obj.AvailableCreditLimit > 0) {
                                                Obj.AvailableCreditLimit = Math.abs(Obj.AvailableCreditLimit);
                                            } else {
                                                Obj.ExtraUnitizedCreditLimit = -Math.abs(Obj.AvailableCreditLimit);
                                                Obj.ExtraUnitizedCreditLimit = Obj.ExtraUnitizedCreditLimit.toFixed(2);
                                                Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.ExtraUnitizedCreditLimit);
                                                Obj.CreditBalanceExists = true;
                                                Obj.AvailableCreditLimit = 0;
                                            }
                                            Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                                            Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                        }
                                    }
                                    const InvoiceDetailsArr = InvoicePendingDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.BuyerBusiness)) === JSON.parse(JSON.stringify(Obj._id)));
                                    const PaymentDetailsArr = InvoiceAcceptList.filter(obj1 => JSON.parse(JSON.stringify(obj1.BuyerBusiness)) === JSON.parse(JSON.stringify(Obj._id)));
                                    Obj.BusinessInvoice = InvoiceDetailsArr.length;
                                    Obj.BusinessPayment = PaymentDetailsArr.length;
                                    return Obj;
                                });
                                res.status(200).send({ Status: true, Message: 'Buyer Invoice Count', Response: BusinessDetails });
                            } else {
                                res.status(200).send({ Status: true, Message: 'No Records Found', Response: [] });
                            }
                        }).catch(Error => {
                            ErrorHandling.ErrorLogCreation(req, 'Seller Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(Error));
                            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
                        });
                    } else if (result.CustomerType === 'User') {
                        var BuyerBusinessArray = [];
                        var BuyerBranchArray = [];
                        if (result.BusinessAndBranches.length > 0) {
                            result.BusinessAndBranches.map(Obj => {
                                BuyerBusinessArray.push(mongoose.Types.ObjectId(Obj.Business));
                                Obj.Branches.map(obj => {
                                    BuyerBranchArray.push(mongoose.Types.ObjectId(obj));
                                });
                            });
                        }

                        Promise.all([
                            BusinessAndBranchManagement.BusinessSchema.find({ _id: { $in: BuyerBusinessArray }, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                            BusinessAndBranchManagement.BranchSchema.find({ _id: { $in: BuyerBranchArray }, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                            InviteManagement.InviteManagementSchema.find({ BuyerBranch: { $in: BuyerBranchArray }, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                            TemporaryManagement.CreditSchema.find({ BuyerBranch: { $in: BuyerBranchArray }, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                            InvoiceManagement.InvoiceSchema.find({ BuyerBranch: { $in: BuyerBranchArray }, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                            InvoiceManagement.InvoiceSchema.find({ BuyerBranch: { $in: BuyerBranchArray }, ActiveStatus: true, InvoiceStatus: 'Pending', IfDeleted: false }, {}, {}).exec(),
                            PaymentModel.PaymentSchema.find({ BuyerBranch: { $in: BuyerBranchArray }, Payment_Status: "Pending" }, {}, {}).exec(),
                            InvoiceManagement.InvoiceSchema.find({ BuyerBranch: { $in: BuyerBranchArray }, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                        ]).then(ResponseOU => {
                            var BusinessDetails = JSON.parse(JSON.stringify(ResponseOU[0]));
                            var BranchDetails = JSON.parse(JSON.stringify(ResponseOU[1]));
                            var InviteDetails = JSON.parse(JSON.stringify(ResponseOU[2]));
                            var TemporaryDetails = JSON.parse(JSON.stringify(ResponseOU[3]));
                            var InvoiceDetails = JSON.parse(JSON.stringify(ResponseOU[4]));
                            var InvoicePendingDetails = JSON.parse(JSON.stringify(ResponseOU[5]));
                            var PendingPaymentDetails = JSON.parse(JSON.stringify(ResponseOU[6]));
                            var InvoiceAcceptList = JSON.parse(JSON.stringify(ResponseOU[7]));
                            if (BusinessDetails.length > 0) {
                                BusinessDetails.map(Obj => {
                                    Obj.ExtraUnitizedCreditLimit = 0;
                                    Obj.CreditBalanceExists = false;
                                    const BranchDetailsArr = BranchDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.Business)) === JSON.parse(JSON.stringify(Obj._id)));
                                    if (BranchDetailsArr.length > 0) {
                                        Obj.Branches = BranchDetailsArr;
                                        Obj.Branches = JSON.parse(JSON.stringify(Obj.Branches));
                                        Obj.Branches.map(ObjB => {
                                            ObjB.ExtraUnitizedCreditLimit = 0;
                                            ObjB.CreditBalanceExists = false;
                                            ObjB.UserDetails = [];
                                            ObjB.TotalInvoiceAmount = 0;
                                            const InvoiceDetailsBranchArr = InvoicePendingDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.BuyerBranch)) === JSON.parse(JSON.stringify(ObjB._id)));
                                            const InvoiceAcceptBranchArr = InvoiceAcceptList.filter(obj1 => JSON.parse(JSON.stringify(obj1.BuyerBranch)) === JSON.parse(JSON.stringify(ObjB._id)));
                                            ObjB.InvoiceCount = InvoiceDetailsBranchArr.length;
                                            ObjB.PaymentCount = InvoiceAcceptBranchArr.length;
                                            const TemporaryDetailsBranchArr = TemporaryDetails.filter(obj1 => obj1.BuyerBranch === ObjB._id);
                                            if (TemporaryDetailsBranchArr.length > 0) {
                                                var BranchValidityDate = new Date();
                                                var BranchTodayDate = new Date();
                                                TemporaryDetailsBranchArr.map(obj => {
                                                    BranchValidityDate = new Date(obj.updatedAt);
                                                    BranchValidityDate = new Date(BranchValidityDate.setDate(BranchValidityDate.getDate() + obj.ApprovedPeriod));
                                                    if (BranchValidityDate.valueOf() >= BranchTodayDate.valueOf()) {
                                                        ObjB.BranchCreditLimit = parseFloat(ObjB.BranchCreditLimit) + parseFloat(obj.ApproveLimit);
                                                        ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit) + parseFloat(obj.ApproveLimit);
                                                    }
                                                });
                                            }

                                            const InviteDetailsBranchArr = InviteDetails.filter(obj1 => obj1.BuyerBranch === ObjB._id);
                                            if (InviteDetailsBranchArr.length > 0) {
                                                var BranchValidityInviteDate = new Date();
                                                var BranchTodayInviteDate = new Date();
                                                InviteDetailsBranchArr.map(obj => {
                                                    //   BranchValidityInviteDate = new Date(obj.updatedAt);
                                                    //   BranchValidityInviteDate = new Date(BranchValidityInviteDate.setDate(BranchValidityInviteDate.getDate() + obj.BuyerPaymentCycle));
                                                    // if (BranchValidityInviteDate.valueOf() >= BranchTodayInviteDate.valueOf()) {
                                                    ObjB.BranchCreditLimit = parseFloat(ObjB.BranchCreditLimit) + parseFloat(obj.AvailableLimit);
                                                    ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit) + parseFloat(obj.AvailableLimit);
                                                    //  }
                                                });
                                            }

                                            const InvoiceDetailsBranchArray = InvoiceDetails.filter(obj1 => obj1.BuyerBranch === ObjB._id);
                                            if (InvoiceDetailsBranchArray.length > 0) {
                                                var BranchInvoiceAmount = 0;
                                                InvoiceDetailsBranchArray.map(obj => {
                                                    BranchInvoiceAmount = parseFloat(BranchInvoiceAmount) + parseFloat(obj.AvailableAmount);
                                                });

                                                if (BranchInvoiceAmount > 0) {
                                                    ObjB.TotalInvoiceAmount = BranchInvoiceAmount.toFixed(2);
                                                    ObjB.TotalInvoiceAmount = parseFloat(ObjB.TotalInvoiceAmount);
                                                    ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit) - parseFloat(BranchInvoiceAmount);
                                                    if (ObjB.AvailableCreditLimit > 0) {
                                                        ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                                                    } else {
                                                        ObjB.ExtraUnitizedCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                                                        ObjB.ExtraUnitizedCreditLimit = ObjB.ExtraUnitizedCreditLimit.toFixed(2);
                                                        ObjB.ExtraUnitizedCreditLimit = parseFloat(ObjB.ExtraUnitizedCreditLimit);
                                                        ObjB.CreditBalanceExists = true;
                                                        ObjB.AvailableCreditLimit = 0;
                                                    }
                                                    ObjB.AvailableCreditLimit = ObjB.AvailableCreditLimit.toFixed(2);
                                                    ObjB.AvailableCreditLimit = parseFloat(ObjB.AvailableCreditLimit);
                                                }
                                            }
                                            return ObjB;
                                        });
                                    } else {
                                        Obj.Branches = [];
                                    }

                                    const TemporaryDetailsArr = TemporaryDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                                    if (TemporaryDetailsArr.length > 0) {
                                        var ValidityDate = new Date();
                                        var TodayDate = new Date();
                                        TemporaryDetailsArr.map(obj => {
                                            ValidityDate = new Date(obj.updatedAt);
                                            ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + obj.ApprovedPeriod));
                                            if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                                                Obj.BusinessCreditLimit = parseFloat(Obj.BusinessCreditLimit) + parseFloat(obj.ApproveLimit);
                                                Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.ApproveLimit);
                                            }
                                        });
                                    }

                                    const InviteDetailsArr = InviteDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                                    if (InviteDetailsArr.length > 0) {
                                        var ValidityInviteDate = new Date();
                                        var TodayInviteDate = new Date();
                                        InviteDetailsArr.map(obj => {
                                            //  ValidityInviteDate = new Date(obj.updatedAt);
                                            //  ValidityInviteDate = new Date(ValidityInviteDate.setDate(ValidityInviteDate.getDate() + obj.BuyerPaymentCycle));
                                            // if (ValidityInviteDate.valueOf() >= TodayInviteDate.valueOf()) {
                                            Obj.BusinessCreditLimit = parseFloat(Obj.BusinessCreditLimit) + parseFloat(obj.AvailableLimit);
                                            Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.AvailableLimit);
                                            //  }
                                        });
                                    }

                                    const InvoiceDetailsArray = InvoiceDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                                    if (InvoiceDetailsArray.length > 0) {
                                        var UsedCurrentCreditAmount = 0;
                                        var UsedForTemporaryAmount = 0;
                                        InvoiceDetailsArray.map(obj => {
                                            UsedCurrentCreditAmount = parseFloat(UsedCurrentCreditAmount) + parseFloat(obj.UsedCurrentCreditAmount);
                                            UsedForTemporaryAmount = parseFloat(UsedForTemporaryAmount) + parseFloat(obj.UsedTemporaryCreditAmount);
                                        });

                                        var PermanentCreditAmount = parseFloat(UsedCurrentCreditAmount) + parseFloat(UsedForTemporaryAmount);
                                        if (PermanentCreditAmount > 0) {
                                            Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) - parseFloat(PermanentCreditAmount);
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
                                        }
                                    }
                                    const InvoiceDetailsArr = InvoicePendingDetails.filter(obj1 => JSON.parse(JSON.stringify(obj1.BuyerBusiness)) === JSON.parse(JSON.stringify(Obj._id)));
                                    const PaymentDetailsArr = InvoiceAcceptList.filter(obj1 => JSON.parse(JSON.stringify(obj1.BuyerBusiness)) === JSON.parse(JSON.stringify(Obj._id)));
                                    Obj.BusinessInvoice = InvoiceDetailsArr.length;
                                    Obj.BusinessPayment = PaymentDetailsArr.length;
                                    return Obj;
                                });
                                res.status(200).send({ Status: true, Message: 'Buyer Invoice Count', Response: BusinessDetails });
                            } else {
                                res.status(200).send({ Status: true, Message: 'No Records Found', Response: [] });
                            }
                        }).catch(Error => {
                            ErrorHandling.ErrorLogCreation(req, 'Seller Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(Error));
                            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
                        });
                    }
                } else {
                    res.status(400).send({ Status: false, Message: "Invalid Customer Details" });
                }
            }
        });
    }
};


// Seller Against Buyer List for Invoice Create  And also Payment Create 
exports.SellerAgainstBuyerList = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.Seller || ReceivingData.Seller === '') {
        res.status(400).send({ Status: false, Message: "Seller can not be empty" });
    } else if (!ReceivingData.Business || ReceivingData.Business === '') {
        res.status(400).send({ Status: false, Message: "Business can not be empty" });
    } else if (!ReceivingData.Branch || ReceivingData.Branch === '') {
        res.status(400).send({ Status: false, Message: "Branch can not be empty" });
    } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
        res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
    } else {
        ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
        ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
        ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);

        Promise.all([
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        ]).then(Response => {
            var CustomerDetails = Response[0];
            if (CustomerDetails !== null) {
                if (CustomerDetails.CustomerType === 'Owner') {
                    ReceivingData.Seller = mongoose.Types.ObjectId(CustomerDetails._id);
                    InviteManagement.InviteManagementSchema.find({ Seller: ReceivingData.Seller, Business: ReceivingData.Business, Branch: ReceivingData.Branch, Invite_Status: 'Accept' }, {}, {})
                        .populate({ path: 'Buyer', select: ['ContactName', 'Mobile', 'Email'] })
                        .exec(function (err, result) {
                            if (err) {
                                ErrorHandling.ErrorLogCreation(req, 'Seller Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(err));
                                res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
                            } else {
                                // result = JSON.parse(JSON.stringify(result));
                                var InviteArr = [];
                                if (result.length !== 0) {
                                    result.map(Obj => {
                                        InviteArr.push(Obj.Buyer);
                                    });

                                    InviteArr = InviteArr.filter((obj, index) => InviteArr.indexOf(obj) === index);
                                    res.status(200).send({ Status: true, Message: 'Seller Against Buyer List', Response: InviteArr });
                                } else {
                                    res.status(200).send({ Status: false, Message: "This Seller Doesn't having any Buyer!", Response: [] });
                                }
                            }
                        });
                } else if (CustomerDetails.CustomerType === 'User') {
                    var BranchArr = [ReceivingData.Branch];
                    ReceivingData.Seller = mongoose.Types.ObjectId(CustomerDetails.Owner);
                    if (CustomerDetails.BusinessAndBranches.length !== 0) {
                        CustomerDetails.BusinessAndBranches.map(Obj => {
                            if (Obj.Branches.length !== 0) {
                                Obj.Branches.map(obj => {
                                    BranchArr.push(mongoose.Types.ObjectId(obj));
                                });
                            }
                        });
                    }
                    InviteManagement.InviteManagementSchema.find({ Seller: ReceivingData.Seller, Business: ReceivingData.Business, Branch: { $in: BranchArr }, Invite_Status: 'Accept' }, {}, {})
                        .populate({ path: 'Buyer', select: ['ContactName', 'Mobile', 'Email'] })
                        .exec(function (err, result) {
                            if (err) {
                                ErrorHandling.ErrorLogCreation(req, 'Seller Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(err));
                                res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
                            } else {
                                // result = JSON.parse(JSON.stringify(result));
                                var InviteArr = [];
                                if (result.length !== 0) {
                                    result.map(Obj => {
                                        InviteArr.push(Obj.Buyer);
                                    });
                                    InviteArr = InviteArr.filter((obj, index) => InviteArr.indexOf(obj) === index);
                                    res.status(200).send({ Status: true, Message: 'Seller Against Buyer List', Response: InviteArr });
                                } else {
                                    res.status(200).send({ Status: false, Message: "This Seller Doesn't having any Buyer!", Response: [] });
                                }
                            }
                        });
                }
            } else {
                res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
            }
        }).catch(Error => {
            res.status(417).send({ Status: false, Message: "Some Occurred Error", Error: Error });
        });
    }
};

// BuyerAgainstBusinessList
exports.BuyerAgainstBusinessList = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
        res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
    } else if (!ReceivingData.Business || ReceivingData.Business === '') {
        res.status(400).send({ Status: false, Message: "Business can not be empty" });
    } else if (!ReceivingData.Branch || ReceivingData.Branch === '') {
        res.status(400).send({ Status: false, Message: "Branch can not be empty" });
    } else if (!ReceivingData.CustomerType || ReceivingData.CustomerType === '') {
        res.status(400).send({ Status: false, Message: "CustomerType can not be empty" });
    } else {
        ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
        ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
        ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);
        CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer }, {}, {}).exec((error, result) => {
            if (error) {
                ErrorHandling.ErrorLogCreation(req, 'Buyer Details List Error', 'InviteManagement.Controller -> BuyerAgainstBusinessList', JSON.stringify(error));
                res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: error });
            } else {
                if (result !== null) {
                    if (ReceivingData.CustomerType === 'Owner') {
                        Promise.all([
                            InviteManagement.InviteManagementSchema.find({ Buyer: ReceivingData.Buyer, Business: ReceivingData.Business, Branch: ReceivingData.Branch, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                        ]).then(Response => {
                            var InviteDetails = Response[0];
                            if (InviteDetails.length !== 0) {
                                var BusinessArr = [];
                                InviteDetails.map(Obj => {
                                    BusinessArr.push(mongoose.Types.ObjectId(Obj.BuyerBusiness));
                                });
                                BusinessAndBranchManagement.BusinessSchema.find({ IsAssigned: true, IfBuyer: true, _id: { $in: BusinessArr } },
                                    {
                                        BusinessName: 1,
                                        AvailableCreditLimit: 1,
                                        BusinessCreditLimit: 1,
                                        BusinessCategory: 1,
                                        Industry: 1,
                                    }).exec((err, result1) => {
                                        if (err) {
                                            ErrorHandling.ErrorLogCreation(req, 'Business List Getting Error', 'InviteManagement.Controller -> BuyerAgainstBusinessList', JSON.stringify(err));
                                            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business!.", Error: err });
                                        } else {
                                            res.status(200).send({ Status: true, Message: "Buyer Business list", Response: result1 });
                                        }
                                    });
                            } else {
                                res.status(200).send({ Status: true, Message: "Buyer Business list", Response: [] });
                            }
                        }).catch(Error => {
                            ErrorHandling.ErrorLogCreation(req, 'Invite Details List Error', 'InviteManagement.Controller -> BuyerAgainstBusinessList', JSON.stringify(Error));
                            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
                        });
                    } else if (ReceivingData.CustomerType === 'User') {
                        Promise.all([
                            InviteManagement.InviteManagementSchema.find({ Buyer: ReceivingData.Buyer, Business: ReceivingData.Business, Branch: ReceivingData.Branch, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                        ]).then(Response => {
                            var InviteDetails = Response[0];
                            if (InviteDetails.length !== 0) {
                                var BusinessArr = [];
                                InviteDetails.map(Obj => {
                                    BusinessArr.push(mongoose.Types.ObjectId(Obj.BuyerBusiness));
                                });
                                BusinessAndBranchManagement.BusinessSchema.find({ IsAssigned: true, IfBuyer: true, _id: { $in: BusinessArr } },
                                    {
                                        BusinessName: 1,
                                        AvailableCreditLimit: 1,
                                        BusinessCreditLimit: 1,
                                        BusinessCategory: 1,
                                        Industry: 1,
                                    }).exec((err, result1) => {
                                        if (err) {
                                            ErrorHandling.ErrorLogCreation(req, 'Business List Getting Error', 'InviteManagement.Controller -> BuyerAgainstBusinessList', JSON.stringify(err));
                                            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business!.", Error: err });
                                        } else {
                                            res.status(200).send({ Status: true, Message: "Buyer Business list", Response: result1 });
                                        }
                                    });
                            } else {
                                res.status(200).send({ Status: true, Message: "Buyer Business list", Response: [] });
                            }
                        }).catch(Error => {
                            ErrorHandling.ErrorLogCreation(req, 'Invite Details List Error', 'InviteManagement.Controller -> BuyerAgainstBusinessList', JSON.stringify(Error));
                            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
                        });
                    }

                } else {
                    res.status(417).send({ Status: false, Message: "Invalid Customer Details." });
                }
            }
        });
    }
};

// BuyerAgainstBusinessList
exports.BuyerAgainstBranchList = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
        res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
    } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
        res.status(400).send({ Status: false, Message: "Buyer Business can not be empty" });
    } else if (!ReceivingData.Business || ReceivingData.Business === '') {
        res.status(400).send({ Status: false, Message: "Business can not be empty" });
    } else if (!ReceivingData.Branch || ReceivingData.Branch === '') {
        res.status(400).send({ Status: false, Message: "Branch can not be empty" });
    } else if (!ReceivingData.CustomerType || ReceivingData.CustomerType === '') {
        res.status(400).send({ Status: false, Message: "CustomerType can not be empty" });
    } else {
        ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
        ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
        ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
        ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);
        CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer }, {}, {}).exec((error, result) => {
            if (error) {
                ErrorHandling.ErrorLogCreation(req, 'Buyer Details List Error', 'InviteManagement.Controller -> BuyerAgainstBranchList', JSON.stringify(error));
                res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: error });
            } else {
                if (result !== null) {
                    if (ReceivingData.CustomerType === 'Owner') {
                        Promise.all([
                            InviteManagement.InviteManagementSchema.find({Business: ReceivingData.Business, Branch: ReceivingData.Branch, Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                            TemporaryManagement.CreditSchema.find({Business: ReceivingData.Business, Branch: ReceivingData.Branch, Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                            InvoiceManagement.InvoiceSchema.find({Business: ReceivingData.Business, Branch: ReceivingData.Branch, Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                        ]).then(Response => {
                            var InviteDetails = JSON.parse(JSON.stringify(Response[0]));
                            var TemporaryDetails = JSON.parse(JSON.stringify(Response[1]));
                            var InvoiceDetails = JSON.parse(JSON.stringify(Response[2]));
                            if (InviteDetails.length !== 0 && (TemporaryDetails.length === 0 || TemporaryDetails.length !== 0)) {
                                var BranchArr = [];
                                InviteDetails.map(Obj => {
                                    BranchArr.push(mongoose.Types.ObjectId(Obj.BuyerBranch));
                                });
                                BusinessAndBranchManagement.BranchSchema.find({ Customer: ReceivingData.Buyer, Business: ReceivingData.BuyerBusiness, _id: { $in: BranchArr } },
                                    {
                                        BranchName: 1,
                                        BranchCreditLimit: 1,
                                        BrachCategory: 1,
                                        Mobile: 1,
                                        Address: 1,
                                        RegistrationId: 1,
                                        AvailableCreditLimit: 1,
                                        GSTIN: 1,
                                        Customer: 1
                                    }).exec((err, result1) => {
                                        if (err) {
                                            ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'InviteManagement.Controller -> BuyerAgainstBranchList', JSON.stringify(err));
                                            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
                                        } else {
                                            result1 = JSON.parse(JSON.stringify(result1));
                                            if (result1.length !== 0) {
                                                result1 = result1.map(Obj => {
                                                    Obj.CurrentCreditAmount = 0;
                                                    Obj.TemporaryCreditAmount = 0;
                                                    Obj.ExtraUnitizedCreditLimit = 0;
                                                    Obj.CreditBalanceExists = false;
                                                    const result1Arr = TemporaryDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
                                                    if (result1Arr.length > 0) {
                                                        var ValidityDate = new Date();
                                                        var TodayDate = new Date();
                                                        result1Arr.map(obj => {
                                                            var TemporaryCredit = 0;
                                                            ValidityDate = new Date(obj.updatedAt);
                                                            ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + obj.ApprovedPeriod));
                                                            if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                                                                Obj.BranchCreditLimit = Math.round(Obj.BranchCreditLimit + obj.ApproveLimit);
                                                                Obj.TemporaryCreditAmount = Math.round(TemporaryCredit + obj.ApproveLimit);
                                                                Obj.AvailableCreditLimit = Math.round(Obj.AvailableCreditLimit + obj.ApproveLimit);;
                                                            }
                                                        });
                                                    }
                                                    const result2Arr = InviteDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
                                                    if (result2Arr.length > 0) {
                                                        var InviteCredit = 0;
                                                        result2Arr.map(obj => {
                                                            Obj.BranchCreditLimit = Math.round(Obj.BranchCreditLimit + obj.AvailableLimit);
                                                            Obj.CurrentCreditAmount = Math.round(InviteCredit + obj.AvailableLimit);
                                                            Obj.AvailableCreditLimit = Math.round(Obj.AvailableCreditLimit + obj.AvailableLimit);
                                                        });
                                                    }

                                                    const result3Arr = InvoiceDetails.filter(obj1 => obj1.Customer === Obj.Buyer && obj1.BuyerBranch === Obj._id);
                                                    var InvoiceAmount = 0;
                                                    if (result3Arr.length > 0) {
                                                        result3Arr.map(obj => {
                                                            InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.AvailableAmount);
                                                        });
                                                    }
                                                    if (InvoiceAmount > 0) {
                                                        Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) - parseFloat(InvoiceAmount);
                                                        if (Obj.AvailableCreditLimit > 0) {
                                                            Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                                        } else {
                                                            Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                                            Obj.ExtraUnitizedCreditLimit = Obj.ExtraUnitizedCreditLimit.toFixed(2);
                                                            Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.ExtraUnitizedCreditLimit);
                                                            Obj.CreditBalanceExists = true;
                                                            Obj.AvailableCreditLimit = 0;
                                                        }
                                                    }

                                                    Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                                                    Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                                                    return Obj;
                                                });
                                            }

                                            res.status(200).send({ Status: true, Response: result1, Message: 'Branches List' });
                                        }
                                    });
                            } else {
                                res.status(200).send({ Status: true, Message: "Buyer Branches list", Response: [] });
                            }
                        }).catch(Error => {
                            ErrorHandling.ErrorLogCreation(req, 'Invite Details List Error', 'InviteManagement.Controller -> BuyerAgainstBusinessList', JSON.stringify(Error));
                            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
                        });
                    } else if (ReceivingData.CustomerType === 'User') {
                        Promise.all([
                            InviteManagement.InviteManagementSchema.find({Business: ReceivingData.Business, Branch: ReceivingData.Branch, Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                            TemporaryManagement.CreditSchema.find({Business: ReceivingData.Business, Branch: ReceivingData.Branch, Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                            InvoiceManagement.InvoiceSchema.find({Business: ReceivingData.Business, Branch: ReceivingData.Branch, Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                        ]).then(Response => {
                            var InviteDetails = JSON.parse(JSON.stringify(Response[0]));
                            var TemporaryDetails = JSON.parse(JSON.stringify(Response[1]));
                            var InvoiceDetails = JSON.parse(JSON.stringify(Response[2]));
                            if (InviteDetails.length !== 0 && (TemporaryDetails.length === 0 || TemporaryDetails.length !== 0)) {
                                var BranchArr = [];
                                InviteDetails.map(Obj => {
                                    BranchArr.push(mongoose.Types.ObjectId(Obj.BuyerBranch));
                                });
                                BusinessAndBranchManagement.BranchSchema.find({ Customer: ReceivingData.Buyer, Business: ReceivingData.BuyerBusiness, _id: { $in: BranchArr } },
                                    {
                                        BranchName: 1,
                                        BranchCreditLimit: 1,
                                        BrachCategory: 1,
                                        Mobile: 1,
                                        Address: 1,
                                        RegistrationId: 1,
                                        AvailableCreditLimit: 1,
                                        GSTIN: 1,
                                        Customer: 1
                                    }).exec((err, result1) => {
                                        if (err) {
                                            ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'InviteManagement.Controller -> BuyerAgainstBranchList', JSON.stringify(err));
                                            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
                                        } else {
                                            result1 = JSON.parse(JSON.stringify(result1));
                                            if (result1.length !== 0) {
                                                result1 = result1.map(Obj => {
                                                    Obj.CurrentCreditAmount = 0;
                                                    Obj.TemporaryCreditAmount = 0;
                                                    Obj.ExtraUnitizedCreditLimit = 0;
                                                    const result1Arr = TemporaryDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
                                                    if (result1Arr.length > 0) {
                                                        var ValidityDate = new Date();
                                                        var TodayDate = new Date();
                                                        result1Arr.map(obj => {
                                                            var TemporaryCredit = 0;
                                                            ValidityDate = new Date(obj.updatedAt);
                                                            ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + obj.ApprovedPeriod));
                                                            if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                                                                Obj.BranchCreditLimit = Math.round(Obj.BranchCreditLimit + obj.ApproveLimit);
                                                                Obj.TemporaryCreditAmount = Math.round(TemporaryCredit + obj.ApproveLimit);
                                                                Obj.AvailableCreditLimit = Math.round(Obj.AvailableCreditLimit + obj.ApproveLimit);;
                                                            }
                                                        });
                                                    }
                                                    const result2Arr = InviteDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
                                                    if (result2Arr.length > 0) {
                                                        var InviteCredit = 0;
                                                        result2Arr.map(obj => {
                                                            Obj.BranchCreditLimit = Math.round(Obj.BranchCreditLimit + obj.AvailableLimit);
                                                            Obj.CurrentCreditAmount = Math.round(InviteCredit + obj.AvailableLimit);
                                                            Obj.AvailableCreditLimit = Math.round(Obj.AvailableCreditLimit + obj.AvailableLimit);
                                                        });
                                                    }

                                                    const result3Arr = InvoiceDetails.filter(obj1 => obj1.Customer === Obj.Buyer && obj1.BuyerBranch === Obj._id);

                                                    if (result3Arr.length > 0) {
                                                        var UsedCurrentCreditAmount = 0;
                                                        var UsedForTemporaryAmount = 0;
                                                        result3Arr.map(obj => {
                                                            UsedCurrentCreditAmount = Math.round(UsedCurrentCreditAmount + obj.UsedCurrentCreditAmount);
                                                            UsedForTemporaryAmount = Math.round(UsedForTemporaryAmount + obj.UsedTemporaryCreditAmount);
                                                        });

                                                        var UnitizedCurrentCreditAmount = Math.round(Obj.CurrentCreditAmount - UsedCurrentCreditAmount);
                                                        if (UnitizedCurrentCreditAmount > 0) {
                                                            Obj.CurrentCreditAmount = UnitizedCurrentCreditAmount
                                                        } else {
                                                            Obj.CurrentCreditAmount = 0;
                                                        }

                                                        var UnitizedTemporaryCreditAmount = Math.round(Obj.TemporaryCreditAmount - UsedForTemporaryAmount);
                                                        if (UnitizedTemporaryCreditAmount > 0) {
                                                            Obj.TemporaryCreditAmount = UnitizedTemporaryCreditAmount;
                                                        } else {
                                                            Obj.TemporaryCreditAmount = 0;
                                                        }
                                                    }
                                                    return Obj;
                                                });
                                            }

                                            res.status(200).send({ Status: true, Response: result1, Message: 'Branches List' });
                                        }
                                    });
                            } else {
                                res.status(200).send({ Status: true, Message: "Buyer Branches list", Response: [] });
                            }
                        }).catch(Error => {
                            ErrorHandling.ErrorLogCreation(req, 'Invite Details List Error', 'InviteManagement.Controller -> BuyerAgainstBusinessList', JSON.stringify(Error));
                            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
                        });
                    }

                } else {
                    res.status(417).send({ Status: false, Message: "Invalid Customer Details." });
                }
            }
        });
    }
};



// Buyer Dispute the Multiple Invoice
exports.BuyerInvoice_Dispute = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.WaitForApprovalArray || ReceivingData.WaitForApprovalArray === []) {
        res.status(400).send({ Status: false, Message: "InvoiceId can not be empty" });
    } else if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
        res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
    } else {
        ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
        var InvoiceArr = [];
        ReceivingData.WaitForApprovalArray.map(Obj => {
            InvoiceArr.push(mongoose.Types.ObjectId(Obj._id));
        });

        Promise.all([
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            InvoiceManagement.InvoiceSchema.find({ "_id": { $in: InvoiceArr } }, {}, {}).
                populate({ path: 'Seller', select: ['ContactName', 'Firebase_Token', "Mobile"] }).populate({ path: 'Buyer', select: ["ContactName", "Firebase_Token", "Mobile"] }).
                populate({ path: 'Business', select: 'BusinessName' }).populate({ path: 'BuyerBusiness', select: 'BusinessName' }).
                populate({ path: 'BuyerBranch', select: 'BranchName' }).populate({ path: 'Branch', select: 'BranchName' }).exec(),
        ]).then(Response => {
            var CustomerDetails = JSON.parse(JSON.stringify(Response[0]));
            var InvoiceDetails = JSON.parse(JSON.stringify(Response[1]));
            if (CustomerDetails !== null && InvoiceDetails.length !== 0) {
                InvoiceManagement.InvoiceSchema.updateMany(
                    { "_id": { $in: InvoiceArr } },

                    {
                        $set: {
                            "InvoiceStatus": 'Disputed',
                            "DisputedRemarks": ReceivingData.Remarks || '',
                        }
                    }
                ).exec(function (err_1, result_1) {
                    if (err_1) {
                        ErrorHandling.ErrorLogCreation(req, 'Invoice Details Update  Getting Error', 'InvoiceManagement.Controller -> BuyerInvoice_Dispute', JSON.stringify(err_1));
                        res.status(417).send({ Status: false, Message: "Some error occurred while Updating the Invoice Status!.", Error: err_1 });
                    } else {
                        InvoiceDetails.map(Obj => {
                            var CustomerFCMTokenSeller = [];
                            CustomerFCMTokenSeller.push(Obj.Seller.Firebase_Token);
                            var payload = {
                                notification: {
                                    title: 'Hundi-Team',
                                    body: 'Buyer Business Name ' + Obj.BuyerBusiness.BusinessName + ' disputed invoice Invoice ID ' + Obj.InvoiceNumber + ' Please click here to review and make any changes.',
                                    sound: 'notify_tone.mp3'
                                },
                                data: {
                                    Customer: Obj.Seller._id,
                                    notification_type: 'SellerInvoiceDisputed',
                                    click_action: 'FCM_PLUGIN_ACTIVITY',
                                }
                            };
                            if (CustomerFCMTokenSeller.length > 0) {
                                FCM_App.messaging().sendToDevice(CustomerFCMTokenSeller, payload, options).then((NotifyRes) => { });
                            }

                            var SmsMessage = 'Buyer Business Name ' + Obj.BuyerBusiness.BusinessName + ' disputed invoice Invoice ID ' + Obj.InvoiceNumber + ' Please click here to review and make any changes.';
                            const params = new URLSearchParams();
                            params.append('key', '25ECE50D1A3BD6');
                            params.append('msg', SmsMessage);
                            params.append('senderid', 'TXTDMO');
                            params.append('routeid', '3');
                            params.append('contacts', Obj.Seller.Mobile);

                            // axios.post('https://sms.textmysms.com/app/smsapi/index.php', params).then(function (response) {
                            //    callback(null, response.data);
                            //  }).catch(function (error) {
                            //    callback('Some Error for Seller Invite SMS!, Error: ' + error, null);
                            //  });
                            const CreateNotification = new NotificationManagement.NotificationSchema({
                                User: null,
                                CustomerID: Obj.Seller._id,
                                Notification_Type: 'SellerInvoiceDisputed',
                                Message: SmsMessage,
                                Message_Received: true,
                                Message_Viewed: false,
                                ActiveStatus: true,
                                IfDeleted: false,
                            });
                            CreateNotification.save();

                            var CustomerFCMTokenBuyer = [];
                            CustomerFCMTokenBuyer.push(Obj.Buyer.Firebase_Token);
                            var payload = {
                                notification: {
                                    title: 'Hundi-Team',
                                    body: 'Seller Business Name ' + Obj.Business.BusinessName + ' responded to your invoice dispute on invoice ' + Obj.InvoiceNumber + '  Click here to view their response..',
                                    sound: 'notify_tone.mp3'
                                },
                                data: {
                                    Customer: Obj.Buyer._id,
                                    notification_type: 'BuyerInvoiceDisputed',
                                    click_action: 'FCM_PLUGIN_ACTIVITY',
                                }
                            };
                            if (CustomerFCMTokenBuyer.length > 0) {
                                FCM_App.messaging().sendToDevice(CustomerFCMTokenBuyer, payload, options).then((NotifyRes) => { });
                            }

                            var SmsMessage1 = 'Seller Business Name ' + Obj.Business.BusinessName + ' responded to your invoice dispute on invoice ' + Obj.InvoiceNumber + '  Click here to view their response..';
                            const params1 = new URLSearchParams();
                            params1.append('key', '25ECE50D1A3BD6');
                            params1.append('msg', SmsMessage1);
                            params1.append('senderid', 'TXTDMO');
                            params1.append('routeid', '3');
                            params1.append('contacts', Obj.Buyer.Mobile);

                            // axios.post('https://sms.textmysms.com/app/smsapi/index.php', params1).then(function (response) {
                            //    callback(null, response.data);
                            //  }).catch(function (error) {
                            //    callback('Some Error for Seller Invite SMS!, Error: ' + error, null);
                            //  });

                            const CreateNotifications = new NotificationManagement.NotificationSchema({
                                User: null,
                                CustomerID: Obj.Buyer._id,
                                Notification_Type: 'SellerInvoiceDisputed',
                                Message: SmsMessage1,
                                Message_Received: true,
                                Message_Viewed: false,
                                ActiveStatus: true,
                                IfDeleted: false,
                            });
                            CreateNotifications.save();
                        });
                        res.status(200).send({ Status: true, Message: "Invoice Successfully Disputed" });
                    }
                });
            } else {
                res.status(417).send({ Http_Code: 417, Status: false, Message: "Invalid Customer Details!." });
            }

        }).catch(Error => {
            ErrorHandling.ErrorLogCreation(req, 'Finding the invoice details and customer details Getting Error', 'InvoiceManagement.Controller -> BuyerInvoice_Dispute', JSON.stringify(Error));
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Buyer Details!.", Error: Error });
        });
    }
};

// Buyer Invoice Accepted

exports.BuyerInvoice_Accept = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.WaitForApprovalArray || ReceivingData.WaitForApprovalArray === []) {
        res.status(400).send({ Status: false, Message: "InvoiceId can not be empty" });
    } else if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
        res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
    } else {
        ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
        var InvoiceArr = [];
        ReceivingData.WaitForApprovalArray.map(Obj => {
            InvoiceArr.push(mongoose.Types.ObjectId(Obj._id));
        });

        Promise.all([
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            InvoiceManagement.InvoiceSchema.find({ "_id": { $in: InvoiceArr } }, {}, {}).
                populate({ path: 'Seller', select: ['ContactName', 'Firebase_Token'] }).populate({ path: 'Buyer', select: ["ContactName", "Firebase_Token"] }).
                populate({ path: 'Business', select: 'BusinessName' }).populate({ path: 'BuyerBusiness', select: 'BusinessName' }).
                populate({ path: 'BuyerBranch', select: 'BranchName' }).populate({ path: 'Branch', select: 'BranchName' }).exec(),
        ]).then(Response => {
            var CustomerDetails = JSON.parse(JSON.stringify(Response[0]));
            var InvoiceDetails = JSON.parse(JSON.stringify(Response[1]));

            if (CustomerDetails !== null && InvoiceDetails.length !== 0) {
                var CreditUnitizedArr = [];
                InvoiceDetails.map(Obj => {
                    var EmptyInvoiceDetails = {
                        _id: mongoose.Types.ObjectId(Obj._id),
                        CurrentCreditAmount: Obj.CurrentCreditAmount,
                        TemporaryCreditAmount: Obj.TemporaryCreditAmount,
                        UsedCurrentCreditAmount: Obj.UsedCurrentCreditAmount,
                        ExtraUsedCreditAmount: Obj.ExtraUsedCreditAmount,
                        UsedTemporaryCreditAmount: Obj.UsedTemporaryCreditAmount
                    };

                    var UsedForCurrentCreditAmount = parseFloat(EmptyInvoiceDetails.CurrentCreditAmount) - parseFloat(Obj.AvailableAmount);

                    if (UsedForCurrentCreditAmount > 0) {
                        EmptyInvoiceDetails.UsedCurrentCreditAmount = Obj.AvailableAmount;
                    } else {
                        EmptyInvoiceDetails.UsedCurrentCreditAmount = EmptyInvoiceDetails.CurrentCreditAmount;
                        var UsedForTemporaryCreditAmount = parseFloat(EmptyInvoiceDetails.TemporaryCreditAmount) + parseFloat(UsedForCurrentCreditAmount);

                        if (UsedForTemporaryCreditAmount > 0) {
                            EmptyInvoiceDetails.UsedTemporaryCreditAmount = UsedForTemporaryCreditAmount;
                        } else {
                            EmptyInvoiceDetails.UsedTemporaryCreditAmount = EmptyInvoiceDetails.TemporaryCreditAmount
                        }
                    }

                    var TotalCurrentAndTemporaryCreditAmount = parseFloat(EmptyInvoiceDetails.CurrentCreditAmount) + parseFloat(EmptyInvoiceDetails.TemporaryCreditAmount);
                    var TotalForUsedCreditUnitized = parseFloat(TotalCurrentAndTemporaryCreditAmount) - parseFloat(Obj.AvailableAmount);
                    if (TotalForUsedCreditUnitized < 0) {
                        EmptyInvoiceDetails.ExtraUsedCreditAmount = TotalForUsedCreditUnitized;
                    }
                    CreditUnitizedArr.push(EmptyInvoiceDetails);
                });
                CreditUnitizedArr.map(Obj => {
                    InvoiceManagement.InvoiceSchema.updateOne(
                        { "_id": mongoose.Types.ObjectId(Obj._id) },
                        {
                            $set: {
                                "InvoiceStatus": "Accept",
                                "AcceptRemarks": ReceivingData.Remarks || '',
                                "CurrentCreditAmount": Obj.CurrentCreditAmount,
                                "TemporaryCreditAmount": Obj.TemporaryCreditAmount,
                                "UsedCurrentCreditAmount": Obj.UsedCurrentCreditAmount,
                                "UsedTemporaryCreditAmount": Obj.UsedTemporaryCreditAmount,
                                "ApprovedDate": new Date(),
                                "ExtraUsedCreditAmount": Obj.ExtraUsedCreditAmount,
                                "IfBuyerApprove": true,
                                "IfBuyerNotify": true,
                            }
                        }
                    ).exec();
                    return Obj;
                });
                res.status(200).send({ Status: true, Message: "Invoice Successfully Accepted" });

            } else {
                res.status(417).send({ Http_Code: 417, Status: false, Message: "Invalid Customer Details!." });
            }

        }).catch(Error => {
            ErrorHandling.ErrorLogCreation(req, 'Finding the invoice details and customer details Getting Error', 'InvoiceManagement.Controller -> BuyerInvoice_Dispute', JSON.stringify(Error));
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Buyer Details!.", Error: Error });
        });
    }
};




