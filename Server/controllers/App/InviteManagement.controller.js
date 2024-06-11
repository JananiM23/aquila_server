var mongoose = require('mongoose');
var CustomersManagement = require('../../Models/CustomerManagement.model');
var NotificationManagement = require('../../Models/notification_management.model');
var ErrorHandling = require('../../Handling/ErrorHandling').ErrorHandling;
var InviteManagement = require('../../Models/Invite_Management.model');
var InvoiceManagement = require('../../Models/InvoiceManagement.model');
var BusinessManagement = require('../../Models/BusinessAndBranchManagement.model');
var FCM_App = require('../../../Config/fcm_config').CustomerNotify;
var BusinessAndBranchManagement = require('../../Models/BusinessAndBranchManagement.model');
var TemporaryManagement = require('../../Models/TemporaryCredit.model');
var moment = require('moment');
const axios = require('axios');
var options = {
  priority: 'high',
  timeToLive: 60 * 60 * 24
};


// Verify Customer Mobile Number before Send Invite
exports.VerifyCustomer_Mobile = function (req, res) {
  var ReceivingData = req.body;

  if (!ReceivingData.Mobile || ReceivingData.Mobile === '') {
    res.status(400).send({ Status: false, Message: "Mobile details can not be empty" });
  } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
    res.status(400).send({ Status: false, Message: "Customer Category details can not be empty" });
  } else {
    CustomersManagement.CustomerSchema.findOne({ Mobile: ReceivingData.Mobile, $or: [{ CustomerCategory: ReceivingData.CustomerCategory }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(function (err, result) {
      if (err) {
        ErrorHandling.ErrorLogCreation(req, 'Buyer Mobile Verify Details Error', 'Seller.Controller -> VerifyBuyer_Mobile', JSON.stringify(err));
        res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
      } else {
        if (result !== null) {
          res.status(200).send({ Status: true, Message: 'Existing Customer', Response: result });
        } else {
          res.status(200).send({ Status: false, Message: "New Customer!" });
        }
      }
    });
  }
};

// Verify Referral Code before Customer Register
exports.VerifyReferralCode = function (req, res) {
  var ReceivingData = req.body;
  if (!ReceivingData.ReferralCode || ReceivingData.ReferralCode === '') {
    res.status(400).send({ Status: false, Message: "Referral Code  can not be empty" });
  } else {
    InviteManagement.InviteManagementSchema.findOne({ ReferralCode: ReceivingData.ReferralCode, ActiveStatus: true, IfDeleted: false }, { ContactName: 1, Mobile: 1, Email: 1, InviteCategory: 1 }, {}).exec(function (err, result) {
      if (err) {
        ErrorHandling.ErrorLogCreation(req, 'Buyer Mobile Verify Details Error', 'Invite_Management.Controller -> VerifyReferralCode', JSON.stringify(err));
        res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
      } else {
        if (result !== null) {
          res.status(200).send({ Status: true, Message: 'Existing Customer', Response: result });
        } else {
          res.status(200).send({ Status: false, Message: "New Customer!" });
        }
      }
    });
  }
};

// Seller And Buyer Business List 
exports.SellerAndBuyerBusinessList = function (req, res) {
	var ReceivingData = req.body;

	if (!ReceivingData.InviteFrom || ReceivingData.InviteFrom === '') {
		res.status(400).send({ Status: false, Message: "Invite From details can not be empty" });
	} else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
		res.status(400).send({ Status: false, Message: "Customer Category details can not be empty" });
	} else if (!ReceivingData.InviteTo || ReceivingData.InviteTo === '') {
		res.status(400).send({ Status: false, Message: "Invite To details can not be empty" });
	} else if (!ReceivingData.Business || ReceivingData.Business === '') {
		res.status(400).send({ Status: false, Message: "Business details can not be empty" });
	} else {
		ReceivingData.InviteFrom = mongoose.Types.ObjectId(ReceivingData.InviteFrom);
		ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
		if (ReceivingData.InviteTo !== 'Empty') {
			ReceivingData.InviteTo = mongoose.Types.ObjectId(ReceivingData.InviteTo);
		} else {
			ReceivingData.InviteTo = null;
		}

		CustomersManagement.CustomerSchema
		.findOne({ _id: ReceivingData.InviteFrom, $or: [{ CustomerCategory: ReceivingData.CustomerCategory }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {})
		.exec((error, result) => {
			if (error) {
				ErrorHandling.ErrorLogCreation(req, 'Customer Details Find Error', 'InviteManagement.Controller -> Customer Details And Business Details Find Error', JSON.stringify(Error));
				res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: error });
			} else {
				var CustomerDetails = JSON.parse(JSON.stringify(result));
				if (CustomerDetails !== null) {
					ReceivingData.InviteFrom = CustomerDetails.CustomerType === 'User' ? mongoose.Types.ObjectId(CustomerDetails.Owner) : ReceivingData.InviteFrom;
					if (ReceivingData.CustomerCategory === 'Seller') {
						Promise.all([
              InviteManagement.InviteManagementSchema.find({ Seller: ReceivingData.InviteFrom, Business: ReceivingData.Business, $or: [{ Invite_Status: 'Pending_Approval' }, { Invite_Status: 'Accept' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
							CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.InviteTo, $or: [{ CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
						
            ]).then(Response => {
							var InviteDetails = JSON.parse(JSON.stringify(Response[0]));
							var InvitedToDetails = JSON.parse(JSON.stringify(Response[1]));
							
							if (InvitedToDetails !== null) {
								if (InvitedToDetails.CustomerType === 'Owner') {
								BusinessAndBranchManagement.BusinessSchema.aggregate([
									{ $match: { IfBuyer: true, Customer: ReceivingData.InviteTo } },
									
									{ 	$project: {
                    _id:1,
										FirstName: 1,
                    LastName: 1,
										AvailableCreditLimit: 1,
										BusinessCreditLimit: 1,
										BusinessCategory: 1,
										Industry: 1
										}
									}
								]).exec((err, result1) => {
									if (err) {
										ErrorHandling.ErrorLogCreation(req, 'Business List Getting Error', 'BusinessAndBranchManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
										res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business!.", Error: err });
									} else {
										result1 = JSON.parse(JSON.stringify(result1));
										if (result1.length !== 0) {

                      // var ExistingBusinessId = result1.map(objj => objj._id)

											result1 = result1.filter(obj => {
												// var ExistingBusiness = InviteDetails.map(obj1 => obj1.BuyerBusiness);
                        
												// if (obj._id.length > 0) {
												// 	// obj.Branches = obj.Branches.filter(obj1 => !ExistingBranches.includes(obj1._id));
                        //     // obj._id = ExistingBusinessId.filter(obj1 => !ExistingBusiness.includes(obj1.ExistingBusinessId));
                        //     obj._id != ExistingBusiness
												// }
												const ReturnValue = obj._id.length > 0 ? true : false;
												// delete obj._id;
												return ReturnValue;
											});
										}
										if (result1.length > 0) {
											res.status(200).send({ Status: true, Message: "Buyer Business list", Response: result1 });
										} else {
											res.status(200).send({ Status: true, Message: "Buyer Business list un-available ", Response: result1 });
										}
									}
								});
							} else if (InvitedToDetails.CustomerType === 'User') {
								var BusinessArray = [];
								if (InvitedToDetails.BusinessAndBranches.length > 0) {
									InvitedToDetails.BusinessAndBranches.map(Obj => {
										BusinessArray.push(mongoose.Types.ObjectId(Obj.Business));
									});
								}
								BusinessAndBranchManagement.BusinessSchema.aggregate([
									{ $match: { IfBuyer: true, _id: { $in: BusinessArray } } },
							
									{	$project: {
										FirstName: 1,
										LastName: 1,
										AvailableCreditLimit: 1,
										BusinessCreditLimit: 1,
										BusinessCategory: 1,
										Industry: 1,
										}
									}
								]).exec((err, result1) => {
									if (err) {
										ErrorHandling.ErrorLogCreation(req, 'Business List Getting Error', 'BusinessAndBranchManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
										res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business!.", Error: err });
									} else {
										result1 = JSON.parse(JSON.stringify(result1));
										if (result1.length !== 0) {
											result1 = result1.filter(obj => {
												// var ExistingBranches = InviteDetails.map(obj1 => obj1.BuyerBranch);
												// if (obj._id.length > 0) {
												// 	// obj.Branches = obj.Branches.filter(obj1 => !ExistingBranches.includes(obj1._id));
                        //   obj._id != ExistingBusiness
												// }
												const ReturnValue = obj._id.length > 0 ? true : false;
												// delete obj._id;
												return ReturnValue;
											});
										}
										if (result1.length > 0) {
											res.status(200).send({ Status: true, Message: "Buyer Business list", Response: result1 });
										} else {
											res.status(200).send({ Status: true, Message: "Buyer Business list un-available ", Response: result1 });
										}
									}
								});
								}
							} else {
								res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
							}
						}).catch(Error => {
							ErrorHandling.ErrorLogCreation(req, 'Customer Details And Business Details Find Error', 'InviteManagement.Controller -> Customer Details And Business Details Find Error', JSON.stringify(Error));
							res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
						});
					} else if (ReceivingData.CustomerCategory === 'Buyer') {
						Promise.all([
							InviteManagement.InviteManagementSchema.find({ Buyer: ReceivingData.InviteFrom, BuyerBusiness: ReceivingData.Business, $or: [{ Invite_Status: 'Pending_Approval' }, { Invite_Status: 'Accept' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
							CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.InviteTo, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
						]).then(Response => {
							var InviteDetails = JSON.parse(JSON.stringify(Response[0]));
							var InvitedToDetails = JSON.parse(JSON.stringify(Response[1]));

							if (InvitedToDetails !== null) {
								if (InvitedToDetails.CustomerType === 'Owner') {
								BusinessAndBranchManagement.BusinessSchema.aggregate([
									{ $match: { IfSeller: true, Customer: ReceivingData.InviteTo, ActiveStatus: true, IfDeleted: false } },
									
									{	$project: {
										FirstName: 1,
										LastName: 1,
										AvailableCreditLimit: 1,
										BusinessCreditLimit: 1,
										BusinessCategory: 1,
										Industry: 1,
										}
									}
								]).exec((err, result1) => {
									if (err) {
										ErrorHandling.ErrorLogCreation(req, 'Business List Getting Error', 'BusinessAndBranchManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
										res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business!.", Error: err });
									} else {
										result1 = JSON.parse(JSON.stringify(result1));
										if (result1.length !== 0) {
											result1 = result1.filter(obj => {
												// var ExistingBusiness = InviteDetails.map(obj1 => obj1.Business);
												// if (obj._id.length > 0) {
												// 	// obj.Branches = obj.Branches.filter(obj1 => !ExistingBranches.includes(obj1._id));
                        //   obj._id != ExistingBusiness
												// }
												const ReturnValue = obj._id.length > 0 ? true : false;
												// delete obj.Branches;
												return ReturnValue;
											});
										}
										if (result1.length > 0) {
											res.status(200).send({ Status: true, Message: "Seller Business list", Response: result1 });
										} else {
											res.status(200).send({ Status: true, Message: "Seller Business list un-available ", Response: result1 });
										}
									}
								});
								} else if (InvitedToDetails.CustomerType === 'User') {
									var BusinessArray = [];
									if (InvitedToDetails.BusinessAndBranches.length > 0) {
										InvitedToDetails.BusinessAndBranches.map(Obj => {
											BusinessArray.push(mongoose.Types.ObjectId(Obj.Business));
										});
									}
								BusinessAndBranchManagement.BusinessSchema.aggregate([
									{ $match: { IfSeller: true, _id: { $in: BusinessArray }, ActiveStatus: true, IfDeleted: false } },
								
									{	$project: {
										FirstName: 1,
										LastName: 1,
										AvailableCreditLimit: 1,
										BusinessCreditLimit: 1,
										BusinessCategory: 1,
										Industry: 1
										}
									}
								]).exec((err, result1) => {
									if (err) {
										ErrorHandling.ErrorLogCreation(req, 'Business List Getting Error', 'BusinessAndBranchManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
										res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business!.", Error: err });
									} else {
										result1 = JSON.parse(JSON.stringify(result1));
										if (result1.length !== 0) {
											result1 = result1.filter(obj => {
												// var ExistingBranches = InviteDetails.map(obj1 => obj1.Business);
												// if (obj._id.length > 0) {
												// 	// obj.Branches = obj.Branches.filter(obj1 => !ExistingBranches.includes(obj1._id));
                        //   obj._id != ExistingBusiness
												// }
												const ReturnValue = obj._id.length > 0 ? true : false;
												// delete obj.Branches;
												return ReturnValue;
											});
										}
										if (result1.length > 0) {
											res.status(200).send({ Status: true, Message: "Seller Business list", Response: result1 });
										} else {
											res.status(200).send({ Status: true, Message: "Seller Business list un-available ", Response: result1 });
										}
									}
								});
								}
							} else {
								res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
							}
						}).catch(Error => {
							ErrorHandling.ErrorLogCreation(req, 'Customer Details And Business Details Find Error', 'InviteManagement.Controller -> Customer Details And Business Details Find Error', JSON.stringify(Error));
							res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
						});
					}
				} else {
					res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
				}
			}
		});
  	}
};

// Seller And Buyer Branch List 
exports.SellerAndBuyerBranchList = function (req, res) {
  var ReceivingData = req.body;

	if (!ReceivingData.InviteFrom || ReceivingData.InviteFrom === '') {
		res.status(400).send({ Status: false, Message: "Invite From details can not be empty" });
	} else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
		res.status(400).send({ Status: false, Message: "Customer Category details can not be empty" });
	} else if (!ReceivingData.InviteTo || ReceivingData.InviteTo === '') {
		res.status(400).send({ Status: false, Message: "InviteTo details can not be empty" });
	} else if (!ReceivingData.Business || ReceivingData.Business === '') {
		res.status(400).send({ Status: false, Message: "Business details can not be empty" });
	} else if (!ReceivingData.Branch || ReceivingData.Branch === '') {
		res.status(400).send({ Status: false, Message: "Branch details can not be empty" });
	} else if (!ReceivingData.BusinessTo || ReceivingData.BusinessTo === '') {
		res.status(400).send({ Status: false, Message: "Business To details can not be empty" });
	} else {
		ReceivingData.InviteFrom = mongoose.Types.ObjectId(ReceivingData.InviteFrom);
		ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
		ReceivingData.Branch = mongoose.Types.ObjectId(ReceivingData.Branch);
		ReceivingData.BusinessTo = mongoose.Types.ObjectId(ReceivingData.BusinessTo);
		if (ReceivingData.InviteTo !== 'Empty') {
			ReceivingData.InviteTo = mongoose.Types.ObjectId(ReceivingData.InviteTo);
		} else {
			ReceivingData.InviteTo = null;
		}
		CustomersManagement.CustomerSchema
		.findOne({ _id: ReceivingData.InviteFrom, $or: [{ CustomerCategory: ReceivingData.CustomerCategory }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {})
		.exec((error, cusResult) => {
			if (error) {
				ErrorHandling.ErrorLogCreation(req, 'Customer Details Getting Error', 'BusinessAndBranchManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(error));
				res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get customer details!.", Error: error });	
			} else {
				var CustomerDetails = JSON.parse(JSON.stringify(cusResult));
				if (CustomerDetails !== null) {
					ReceivingData.InviteFrom = CustomerDetails.CustomerType === 'User' ? mongoose.Types.ObjectId(CustomerDetails.Owner) : ReceivingData.InviteFrom;
					if (ReceivingData.CustomerCategory === 'Seller') {
						Promise.all([
							InviteManagement.InviteManagementSchema.find({ Seller: ReceivingData.InviteFrom, Business: ReceivingData.Business, Branch: ReceivingData.Branch, $or: [{ Invite_Status: 'Pending_Approval' }, { Invite_Status: 'Accept' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
							CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.InviteTo, $or: [{ CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
							TemporaryManagement.CreditSchema.find({ Buyer: ReceivingData.InviteFrom, BuyerBusiness: ReceivingData.Business, BuyerBranch: ReceivingData.Branch, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
						]).then(Response => {
							var InviteDetails = JSON.parse(JSON.stringify(Response[0]));
							var InvitedToDetails = JSON.parse(JSON.stringify(Response[1]));
							var TemporaryDetails = JSON.parse(JSON.stringify(Response[2]));
							if (InvitedToDetails !== null) {
								if (InvitedToDetails.CustomerType === 'Owner') {
									BusinessAndBranchManagement.BranchSchema.find({ Customer: ReceivingData.InviteTo, Business: ReceivingData.BusinessTo, ActiveStatus: true, IfDeleted: false },
									{	BranchName: 1,
										BranchCreditLimit: 1,
										BrachCategory: 1,
										Mobile: 1,
										Address: 1,
										RegistrationId: 1,
										AvailableCreditLimit: 1,
										GSTIN: 1
									}).exec((err, result) => {
										if (err) {
											ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessAndBranchManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
											res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
										} else {
											result = JSON.parse(JSON.stringify(result));
											if (result.length !== 0) {
												result = result.filter(obj => {
													const result1Arr = InviteDetails.filter(obj1 => obj1.BuyerBranch === obj._id);
													return result1Arr.length > 0 ? false : true;
												});
											}
											if (result.length > 0) {
												result.map(Obj => {
													const result1Arr = TemporaryDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
													if (result1Arr.length > 0) {
													var ValidityDate = new Date();
													var TodayDate = new Date();
													TodayDate = new Date(TodayDate.setHours(0, 0, 0, 0));
													result1Arr.map(obj => {
														ValidityDate = new Date(obj.updatedAt);
														ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + obj.ApprovedPeriod));
														ValidityDate = new Date(ValidityDate.setHours(0, 0, 0, 0));
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
				
													if (Obj.BranchCreditLimit > 0) {
														Obj.BranchCreditLimit = Obj.BranchCreditLimit.toFixed(2);
														Obj.BranchCreditLimit = parseFloat(Obj.BranchCreditLimit);
														Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
														Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
													}
												});
												res.status(200).send({ Status: true, Message: "Buyer Branches list", Response: result });
											} else {
												res.status(200).send({ Status: true, Message: "Buyer Branches list un-available ", Response: result });
											}
										}
									});
								} else if (InvitedToDetails.CustomerType === 'User') {
									var BranchArray = [];
									if (InvitedToDetails.BusinessAndBranches.length > 0) {
										InvitedToDetails.BusinessAndBranches.map(Obj => {
											Obj.Branches.map(obj => {
												BranchArray.push(mongoose.Types.ObjectId(obj));
											});
										});
									}
			
									BusinessAndBranchManagement.BranchSchema.find({ _id: { $in: BranchArray }, Business: ReceivingData.BusinessTo, ActiveStatus: true, IfDeleted: false },
									{	BranchName: 1,
										BranchCreditLimit: 1,
										BrachCategory: 1,
										Mobile: 1,
										Address: 1,
										RegistrationId: 1,
										AvailableCreditLimit: 1,
										GSTIN: 1
									}).exec((err, result) => {
										if (err) {
											ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessAndBranchManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
											res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
										} else {
											result = JSON.parse(JSON.stringify(result));
											if (result.length !== 0) {
												result = result.filter(obj => {
													const result1Arr = InviteDetails.filter(obj1 => obj1.BuyerBranch === obj._id);
													return result1Arr.length > 0 ? false : true;
												});
											}
										if (result.length > 0) {
											result.map(Obj => {
												const result1Arr = TemporaryDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
												if (result1Arr.length > 0) {
													var ValidityDate = new Date();
													var TodayDate = new Date();
													TodayDate = new Date(TodayDate.setHours(0, 0, 0, 0));
													result1Arr.map(obj => {
														ValidityDate = new Date(obj.updatedAt);
														ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + obj.ApprovedPeriod));
														ValidityDate = new Date(ValidityDate.setHours(0, 0, 0, 0));
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
												if (Obj.BranchCreditLimit > 0) {
													Obj.BranchCreditLimit = Obj.BranchCreditLimit.toFixed(2);
													Obj.BranchCreditLimit = parseFloat(Obj.BranchCreditLimit);
													Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
													Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
												}
											});
											res.status(200).send({ Status: true, Message: "Buyer Branches list", Response: result });
										} else {
											res.status(200).send({ Status: true, Message: "Buyer Branches list un-available ", Response: result });
										}
										}
									});
								}
							} else {
								res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
							}
						}).catch(Error => {
							ErrorHandling.ErrorLogCreation(req, 'Customer Details And Business Details Find Error', 'InviteManagement.Controller -> Customer Details And Business Details Find Error', JSON.stringify(Error));
							res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
						});
					} else if (ReceivingData.CustomerCategory === 'Buyer') {
						Promise.all([
							InviteManagement.InviteManagementSchema.find({ Buyer: ReceivingData.InviteFrom, BuyerBusiness: ReceivingData.Business, BuyerBranch: ReceivingData.Branch, $or: [{ Invite_Status: 'Pending_Approval' }, { Invite_Status: 'Accept' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
							CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.InviteTo, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
						]).then(Response => {
							var InviteDetails = JSON.parse(JSON.stringify(Response[0]));
							var InvitedToDetails = JSON.parse(JSON.stringify(Response[1]));
				
							if (InvitedToDetails !== null) {
								if (InvitedToDetails.CustomerType === 'Owner') {
									BusinessAndBranchManagement.BranchSchema.find({ Customer: ReceivingData.InviteTo, Business: ReceivingData.BusinessTo },
									{	BranchName: 1,
										BranchCreditLimit: 1,
										BrachCategory: 1,
										Mobile: 1,
										Address: 1,
										RegistrationId: 1,
										AvailableCreditLimit: 1,
										GSTIN: 1
									}).exec((err, result) => {
										if (err) {
											ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessAndBranchManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
											res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
										} else {
											result = JSON.parse(JSON.stringify(result));
											if (result.length !== 0) {
												result = result.filter(obj => {
													const result1Arr = InviteDetails.filter(obj1 => obj1.Branch === obj._id);
													return result1Arr.length > 0 ? false : true;
												});
											}
											if (result.length > 0) {
												res.status(200).send({ Status: true, Message: "Seller Branches list", Response: result });
											} else {
												res.status(200).send({ Status: true, Message: "Seller Branches list un-available ", Response: result });
											}
										}
									});
								} else if (InvitedToDetails.CustomerType === 'User') {
									var BranchArray = [];
									if (InvitedToDetails.BusinessAndBranches.length > 0) {
										InvitedToDetails.BusinessAndBranches.map(Obj => {
											Obj.Branches.map(obj => {
											BranchArray.push(mongoose.Types.ObjectId(obj));
											});
										});
									}
									BusinessAndBranchManagement.BranchSchema.find({ _id: { $in: BranchArray }, Business: ReceivingData.BusinessTo },
									{	BranchName: 1,
										BranchCreditLimit: 1,
										BrachCategory: 1,
										Mobile: 1,
										Address: 1,
										RegistrationId: 1,
										AvailableCreditLimit: 1,
										GSTIN: 1
									}).exec((err, result) => {
										if (err) {
											ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessAndBranchManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
											res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
										} else {
											result = JSON.parse(JSON.stringify(result));
											if (result.length !== 0) {
												result = result.filter(obj => {
													const result1Arr = InviteDetails.filter(obj1 => obj1.Branch === obj._id);
													return result1Arr.length > 0 ? false : true;
												});
											}
											if (result.length > 0) {
												res.status(200).send({ Status: true, Message: "Seller Branches list", Response: result });
											} else {
												res.status(200).send({ Status: true, Message: "Seller Branches list un-available ", Response: result });
											}
										}
									});
								}
							} else {
								res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
							}
						}).catch(Error => {
							ErrorHandling.ErrorLogCreation(req, 'Customer Details And Business Details Find Error', 'InviteManagement.Controller -> Customer Details And Business Details Find Error', JSON.stringify(Error));
							res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
						});
					}
				} else {
					res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
				}
			}
		});
	}
};

// Seller Invite Create
exports.SellerSendInvite =  async function (req, res) {
  var ReceivingData = req.body;

  if (!ReceivingData.InviteCategory || ReceivingData.InviteCategory === '') {
    res.status(400).send({ Status: false, Message: "InviteCategory can not be empty" });
  } else if (!ReceivingData.Seller || ReceivingData.Seller === '') {
    res.status(400).send({ Status: false, Message: "Seller Details can not be empty" });
  } else if (!ReceivingData.InviteType || ReceivingData.InviteType === '') {
    res.status(400).send({ Status: false, Message: "Customer Type can not be empty" });
  } else if (!ReceivingData.BuyerCreditLimit || ReceivingData.BuyerCreditLimit === '') {
    res.status(400).send({ Status: false, Message: "Credit Amount can not be empty" });
  } else if (!ReceivingData.BuyerPaymentCycle || ReceivingData.BuyerPaymentCycle === '') {
    res.status(400).send({ Status: false, Message: "Payment Cycle can not be empty" });
  } else if (!ReceivingData.Business || ReceivingData.Business === '') {
    res.status(400).send({ Status: false, Message: "Business Details can not be empty" });
  }  else {
    ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
    ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);

    var InviteProcess = 'Pending';
    var ModeInvite = 'Mobile';
      if (ReceivingData.Buyer !== 'Empty' && ReceivingData.BuyerBusiness !== 'Empty') {
      InviteProcess = 'Completed';
      ModeInvite = 'Direct';
    }

    if (ReceivingData.Buyer !== 'Empty') {
      ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
    } else {
      ReceivingData.Buyer = null;
    }

    if (ReceivingData.BuyerBusiness !== 'Empty') {
      ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
    } else {
      ReceivingData.BuyerBusiness = null;
    }

    
    Promise.all([
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      InviteManagement.InviteManagementSchema.find({ Business: ReceivingData.Business,BuyerBusiness: ReceivingData.BuyerBusiness, $or: [{ Invite_Status: "Pending_Approval" }, { Invite_Status: "Accept" }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.Business, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      InviteManagement.InviteManagementSchema.findOne({ Mobile: ReceivingData.Mobile, Seller: ReceivingData.Seller, Business: ReceivingData.Business, Invite_Status: "Reject", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      InviteManagement.InviteManagementSchema.findOne({  Business: ReceivingData.Business, BuyerBusiness: ReceivingData.BuyerBusiness, $or: [{ Invite_Status: "Accept" }, { Invite_Status: "Pending_Approval" }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      InviteManagement.InviteManagementSchema.findOne({ Mobile: ReceivingData.Mobile, Seller: ReceivingData.Seller, Business: ReceivingData.Business, Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness,  Invite_Status: "Reject", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      InviteManagement.InviteManagementSchema.findOne({}, {}, { sort: { createdAt: -1 } }).exec(),
    ]).then(Response => {
      var CustomerDetails = Response[0];
      var InvitedDetails = Response[1];
      var BuyerDetails = JSON.parse(JSON.stringify(Response[2]));
      var BusinessDetails = JSON.parse(JSON.stringify(Response[3]));
      var RejectDetails = Response[4];
      var OneTimeRequest = Response[5];
      var OneTimeRequestRejected = Response[6];
      var LastReferralCode = Response[7];
   
    //&& ModeInvite === "Mobile") || ModeInvite === "Direct"
      if (CustomerDetails !== null && ((InvitedDetails.length === 0 )) && OneTimeRequest === null) {
        var IfUser = false;
        var InvitedUser = null;
        if (BuyerDetails !== null) {
          if (BuyerDetails.CustomerType === 'Owner') {
            ReceivingData.Buyer = mongoose.Types.ObjectId(BuyerDetails._id);
          } else if (BuyerDetails.CustomerType === 'User') {
            ReceivingData.Buyer = mongoose.Types.ObjectId(BuyerDetails.Owner);
            
          }
        }
        if (CustomerDetails.CustomerType === 'Owner') {
          ReceivingData.Seller = CustomerDetails._id;
        } else if (CustomerDetails.CustomerType === 'User') {
          ReceivingData.Seller = CustomerDetails.Owner;
          InvitedUser = mongoose.Types.ObjectId(CustomerDetails._id);
          IfUser = true;
        }
        ReceivingData.BuyerCreditLimit = parseFloat(ReceivingData.BuyerCreditLimit);
        if (ReceivingData.BuyerCreditLimit > 0) {
          ReceivingData.BuyerCreditLimit = ReceivingData.BuyerCreditLimit.toFixed(2);
          ReceivingData.BuyerCreditLimit = parseFloat(ReceivingData.BuyerCreditLimit);
        }
        LastReferralCode = LastReferralCode !== null ? (LastReferralCode.Referral_Unique + 1) : 1;
        const Create_Invite = new InviteManagement.InviteManagementSchema({
          Mobile: ReceivingData.Mobile,
          ContactName: ReceivingData.ContactName,
          Email: ReceivingData.Email,
          Buyer: ReceivingData.Buyer,
          BuyerBusiness: ReceivingData.BuyerBusiness,
          Seller: ReceivingData.Seller,
          Business: ReceivingData.Business,
          IfUser: IfUser,
          InvitedUser: InvitedUser,
          Invite_Status: 'Pending_Approval',
          ReferralCode: 'AQUIL-' + LastReferralCode.toString().padStart(9, '0'),
          Referral_Unique: LastReferralCode,
          InviteType: ReceivingData.InviteType,
          BuyerCreditLimit: ReceivingData.BuyerCreditLimit,
          BuyerPaymentType: ReceivingData.BuyerPaymentType,
          BuyerPaymentCycle: ReceivingData.BuyerPaymentCycle,
          AvailableLimit: ReceivingData.BuyerCreditLimit,
          InvitedBy: ReceivingData.Seller,
          InviteProcess: InviteProcess,
          IfSeller: 'Pending',
          IfBuyer: '',
          InviteCategory: 'Buyer',
          ModeInvite: ModeInvite,
          ActiveStatus: true,
          IfDeleted: false
        });
        Create_Invite.save(function (err, result) {
          if (err) {
            ErrorHandling.ErrorLogCreation(req, 'Buyer Invite Register Error', 'InviteManagement.Controller -> SellerInviteSend', JSON.stringify(err));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to complete this invitation!.", Error: err });
          } else {

            if (BuyerDetails !== null) {
              var CustomerFCMToken = [];
              CustomerFCMToken.push(BuyerDetails.Firebase_Token);
             
              var payload = {
                notification: {
                  title: 'Hundi-Team',
                  body: BusinessDetails.FirstName +''+BusinessDetails.LastName + ' would like to offer online invoicing for you at free of cost. Click this link to install the app and get started - Team Hundi',
                  sound: 'notify_tone.mp3'
                },
                data: {
                  Customer: BuyerDetails._id,
                  notification_type: 'InviteNotification',
                  click_action: 'FCM_PLUGIN_ACTIVITY',
                }
              };
              if (CustomerFCMToken.length > 0) {
                FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
              }


            } else {
              var SmsMessage = BusinessDetails.FirstName +''+ BusinessDetails.LastName  + ' would like to offer online invoicing for you at free of cost. Click this link to install the app and get started - Team Hundi';
              const params = new URLSearchParams();
              params.append('key', '25ECE50D1A3BD6');
              params.append('msg', SmsMessage);
              params.append('senderid', 'TXTDMO');
              params.append('routeid', '3');
              params.append('contacts', ReceivingData.Mobile);

              // axios.post('https://sms.textmysms.com/app/smsapi/index.php', params).then(function (response) {
              //    callback(null, response.data);
              //  }).catch(function (error) {
              //    callback('Some Error for sending Buyer Invite SMS!, Error: ' + error, null);
              //  });
            }

            if (result.BuyerBusiness !== null) {
              const CreateNotification = new NotificationManagement.NotificationSchema({
                User: null,
                // Branch: result.BuyerBranch,
                Business: result.BuyerBusiness,
                Notification_Type: 'BuyerRequestSend',
                Message: BusinessDetails.FirstName +''+ BusinessDetails.LastName  + ' would like to offer online invoicing for you at free of cost. Click this link to install the app and get started - Team Hundi',
                Message_Received: true,
                Message_Viewed: false,
                ActiveStatus: true,
                IfDeleted: false,
              });
              CreateNotification.save();
            }

            if (result.ModeInvite === 'Mobile') {
              // const params = new URLSearchParams();
              // params.append('key', '25ECE50D1A3BD6');
              // params.append('msg', SmsMessage);
              // params.append('senderid', 'TXTDMO');
              // params.append('routeid', '3');
              // params.append('contacts', result.Mobile);

              // axios.post('https://sms.textmysms.com/app/smsapi/index.php', params).then(function (response) {
              //    callback(null, response.data);
              //  }).catch(function (error) {
              //    callback('Some Error for Seller Invite SMS!, Error: ' + error, null);
              //  });
            }

            if (RejectDetails !== null) {
              RejectDetails.ActiveStatus = false;
              RejectDetails.IfDeleted = true;
              RejectDetails.save();
            }

            if (OneTimeRequestRejected !== null) {
              OneTimeRequestRejected.ActiveStatus = false;
              OneTimeRequestRejected.IfDeleted = true;
              OneTimeRequestRejected.save();
            }
            res.status(200).send({ Status: true, Response: result });
          }
        });
      } else {
        res.status(200).send({ Status: false, Message: "Already Send to the Invite this Number And Seller, Seller Business" });
      }
    }).catch(Error => {
      ErrorHandling.ErrorLogCreation(req, 'Customer Details Error', 'InviteManagement.Controller -> Customer details Error', JSON.stringify(Error));
      res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
    });
  }
};

// Buyer Invite Create
exports.BuyerSendInvite = function (req, res) {
  var ReceivingData = req.body;

  if (!ReceivingData.InviteCategory || ReceivingData.InviteCategory === '') {
    res.status(400).send({ Status: false, Message: "InviteCategory can not be empty" });
  } else if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
    res.status(400).send({ Status: false, Message: "Buyer Details can not be empty" });
  } else if (!ReceivingData.InviteType || ReceivingData.InviteType === '') {
    res.status(400).send({ Status: false, Message: "Customer Type can not be empty" });
  } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
    res.status(400).send({ Status: false, Message: " Buyer Business Details can not be empty" });
  } else {
    ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
    ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
    var InviteProcess = 'Pending';
    var ModeInvite = 'Mobile';

    if (ReceivingData.Seller !== 'Empty' && ReceivingData.Business !== 'Empty') {
      InviteProcess = 'Completed';
      ModeInvite = 'Direct';
    }

    if (ReceivingData.Seller !== 'Empty') {
      ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
    } else {
      ReceivingData.Seller = null;
    }

    if (ReceivingData.Business !== 'Empty') {
      ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
    } else {
      ReceivingData.Business = null;
    }


    Promise.all([
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      InviteManagement.InviteManagementSchema.find({  Business: ReceivingData.Business,BuyerBusiness: ReceivingData.BuyerBusiness, $or: [{ Invite_Status: "Pending_Approval" }, { Invite_Status: "Accept" }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.BuyerBusiness, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      InviteManagement.InviteManagementSchema.findOne({ Mobile: ReceivingData.Mobile, Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, Invite_Status: "Reject", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      InviteManagement.InviteManagementSchema.findOne({  Business: ReceivingData.Business,  BuyerBusiness: ReceivingData.BuyerBusiness, $or: [{ Invite_Status: "Accept" }, { Invite_Status: "Pending_Approval" }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      InviteManagement.InviteManagementSchema.findOne({ Mobile: ReceivingData.Mobile, Seller: ReceivingData.Seller, Business: ReceivingData.Business, Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness,Invite_Status: "Reject", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      InviteManagement.InviteManagementSchema.findOne({}, {}, { sort: { createdAt: -1 } }).exec(),
    ]).then(Response => {
      var CustomerDetails = Response[0];
      var InvitedDetails = Response[1];
      var SellerDetails = JSON.parse(JSON.stringify(Response[2]));
      var BusinessDetails = JSON.parse(JSON.stringify(Response[3]));
      var RejectDetails = Response[4];
      var OneTimeRequest = Response[5];
      var OneTimeRequestRejected = Response[6];
      var LastReferralCode = Response[7];
    //ModeInvite === "Mobile"  || ModeInvite === "Direct"
      if (CustomerDetails !== null && ((InvitedDetails.length === 0 )) && OneTimeRequest === null) {
        var IfUser = false;
        var InvitedUser = null;
        if (SellerDetails !== null) {
          if (SellerDetails.CustomerType === 'Owner') {
            ReceivingData.Seller = mongoose.Types.ObjectId(SellerDetails._id);
          } else if (SellerDetails.CustomerType === 'User') {
            ReceivingData.Seller = mongoose.Types.ObjectId(SellerDetails.Owner);
          }
        }
        if (CustomerDetails.CustomerType === 'Owner') {
          ReceivingData.Buyer = CustomerDetails._id;
        } else if (CustomerDetails.CustomerType === 'User') {
          IfUser = true;
          ReceivingData.Buyer = CustomerDetails.Owner;
          InvitedUser = mongoose.Types.ObjectId(CustomerDetails._id);
        }
        ReceivingData.BuyerCreditLimit = parseFloat(ReceivingData.BuyerCreditLimit);
        if (ReceivingData.BuyerCreditLimit > 0) {
          ReceivingData.BuyerCreditLimit = ReceivingData.BuyerCreditLimit.toFixed(2);
          ReceivingData.BuyerCreditLimit = parseFloat(ReceivingData.BuyerCreditLimit);
        }
        LastReferralCode = LastReferralCode !== null && LastReferralCode.Referral_Unique !== undefined ? (LastReferralCode.Referral_Unique + 1) : 1;
        const Create_Invite = new InviteManagement.InviteManagementSchema({
          Mobile: ReceivingData.Mobile,
          ContactName: ReceivingData.ContactName,
          Email: ReceivingData.Email,
          Buyer: ReceivingData.Buyer,
          BuyerBusiness: ReceivingData.BuyerBusiness,
          Seller: ReceivingData.Seller,
          Business: ReceivingData.Business,
          IfUser: IfUser,
          InvitedUser: InvitedUser,
          ReferralCode: 'AQUIL-' + LastReferralCode.toString().padStart(9, '0'),
          Referral_Unique: LastReferralCode,
          Invite_Status: 'Pending_Approval',
          InviteType: ReceivingData.InviteType,
          BuyerCreditLimit: Math.abs(ReceivingData.BuyerCreditLimit) || 0,
          BuyerPaymentType: ReceivingData.BuyerPaymentType || '',
          BuyerPaymentCycle: ReceivingData.BuyerPaymentCycle || 0,
          AvailableLimit: Math.abs(ReceivingData.BuyerCreditLimit) || 0,
          InvitedBy: ReceivingData.Buyer,
          InviteProcess: InviteProcess,
          IfSeller: '',
          IfBuyer: 'Pending',
          InviteCategory: 'Seller',
          ModeInvite: ModeInvite,
          ActiveStatus: true,
          IfDeleted: false
        });
        Create_Invite.save(function (err, result) {
          if (err) {
            ErrorHandling.ErrorLogCreation(req, 'Buyer Invite Register Error', 'InviteManagement.Controller -> SellerInviteSend', JSON.stringify(err));
            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to complete this invitation!.", Error: err });
          } else {
            if (SellerDetails !== null) {
              var SmsMessage = BusinessDetails.FirstName +''+ BusinessDetails.LastName  + ' would like to offer online payment system for you at free of cost. Click this link to install the app and get started - Team Hundi';
              var CustomerFCMToken = [];
              CustomerFCMToken.push(SellerDetails.Firebase_Token);
              var payload = {
                notification: {
                  title: 'Hundi-Team',
                  body: BusinessDetails.FirstName +''+ BusinessDetails.LastName + ' would like to offer online payment system for you at free of cost. Click this link to install the app and get started - Team Hundi',
                  sound: 'notify_tone.mp3'
                },
                data: {
                  Customer: SellerDetails._id,
                  notification_type: 'InviteNotification',
                  click_action: 'FCM_PLUGIN_ACTIVITY',
                }
              };
              if (CustomerFCMToken.length > 0) {
                FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
              }

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
            }

            // if (result.Branch !== null) {
            //   const CreateNotification = new NotificationManagement.NotificationSchema({
            //     User: null,
            //     Branch: result.Branch,
            //     Notification_Type: 'SellerRequestSend',
            //     Message: BusinessDetails.BusinessName + ' would like to offer online payment system for you at free of cost. Click this link to install the app and get started - Team Hundi',
            //     Message_Received: true,
            //     Message_Viewed: false,
            //     ActiveStatus: true,
            //     IfDeleted: false,
            //   });
            //   CreateNotification.save();
            // }
               
            if (result.Business !== null) {
              const CreateNotification = new NotificationManagement.NotificationSchema({
                User: null,
                // Branch: result.Branch,
                Business: result.Business,
                Notification_Type: 'SellerRequestSend',
                Message: BusinessDetails.FirstName +''+ BusinessDetails.LastName  + ' would like to offer online payment system for you at free of cost. Click this link to install the app and get started - Team Hundi',
                Message_Received: true,
                Message_Viewed: false,
                ActiveStatus: true,
                IfDeleted: false,
              });
              CreateNotification.save();
            }

            // When a new invite to the customer, then app link to SMS
            if (result.ModeInvite === 'Mobile') {
              // const params = new URLSearchParams();
              // params.append('key', '25ECE50D1A3BD6');
              // params.append('msg', SmsMessage);
              // params.append('senderid', 'TXTDMO');
              // params.append('routeid', '3');
              // params.append('contacts', result.Mobile);

              // axios.post('https://sms.textmysms.com/app/smsapi/index.php', params).then(function (response) {
              //    callback(null, response.data);
              //  }).catch(function (error) {
              //    callback('Some Error for Seller Invite SMS!, Error: ' + error, null);
              //  });
            }

            if (RejectDetails !== null) {
              RejectDetails.ActiveStatus = false;
              RejectDetails.IfDeleted = true;
              RejectDetails.save();
            }

            if (OneTimeRequestRejected !== null) {
              OneTimeRequestRejected.ActiveStatus = false;
              OneTimeRequestRejected.IfDeleted = true;
              OneTimeRequestRejected.save();
            }
            res.status(200).send({ Status: true, Response: result });
          }
        });
      } else {
        res.status(200).send({ Status: false, Message: "Already Send to the Invite this Number And Buyer, Buyer Business" });
      }
    }).catch(Error => {
      ErrorHandling.ErrorLogCreation(req, 'Customer Details Error', 'InviteManagement.Controller -> Customer details Error', JSON.stringify(Error));
      res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
    });
  }
};

// Invite Status Update Buyer Update 
exports.BuyerInvite_StatusUpdate = function (req, res) {
  var ReceivingData = req.body;
    
  if (!ReceivingData.InviteId || ReceivingData.InviteId === '') {
    res.status(400).send({ Status: false, Message: "InviteId can not be empty" });
  } else if (!ReceivingData.Invite_Status || ReceivingData.Invite_Status === '') {
    res.status(400).send({ Status: false, Message: "Invite Status can not be empty" });
  } else if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
    res.status(400).send({ Status: false, Message: "CustomerId can not be empty" });
  } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
    res.status(400).send({ Status: false, Message: "Buyer Business can not be empty" });
  } else {
    ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.CustomerId);
    ReceivingData.InviteId = mongoose.Types.ObjectId(ReceivingData.InviteId);
    ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);

    Promise.all([
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      InviteManagement.InviteManagementSchema.findOne({ _id: ReceivingData.InviteId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.BuyerBusiness, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
    ]).then(Response => {
      var CustomerDetails = Response[0];
      var InviteDetails = JSON.parse(JSON.stringify(Response[1]));
      var BusinessDetails = JSON.parse(JSON.stringify(Response[2]));
      if (CustomerDetails !== null && InviteDetails !== null) {
        if (InviteDetails.InviteProcess === 'Pending') {
          InviteManagement.InviteManagementSchema.updateOne(
            { "_id": ReceivingData.InviteId },
            {
              $set: {
                "Invite_Status": ReceivingData.Invite_Status,
                "IfSeller": ReceivingData.Invite_Status,
                "IfBuyer": ReceivingData.Invite_Status,
                "BuyerBusiness": ReceivingData.BuyerBusiness,
                "InviteProcess": 'Completed'
              }
            }
          ).exec();
        } else if (InviteDetails.InviteProcess === 'Completed') {
          InviteManagement.InviteManagementSchema.updateOne(
            { "_id": ReceivingData.InviteId },
            {
              $set: {
                "Invite_Status": ReceivingData.Invite_Status,
                "IfSeller": ReceivingData.Invite_Status,
                "IfBuyer": ReceivingData.Invite_Status
              }
            }
          ).exec();
        }

        var mBusinessCreditLimit = 0;
        var mAvailableCreditLimit = 0;


        // mBusinessCreditLimit = BranchDetails.BranchCreditLimit + InviteDetails.BuyerCreditLimit;
        // mAvailableCreditLimit = BranchDetails.AvailableCreditLimit + InviteDetails.AvailableLimit;

        mBusinessCreditLimit = BusinessDetails.BusinessCreditLimit + InviteDetails.BuyerCreditLimit;
        mAvailableCreditLimit = BusinessDetails.AvailableCreditLimit + InviteDetails.AvailableLimit;

        // BusinessAndBranchManagement.BranchSchema.updateOne(
        //   { _id: ReceivingData.BuyerBranch },
        //   {
        //     $set: {

        //       BranchCreditLimit: mBusinessCreditLimit,
        //       AvailableCreditLimit: mAvailableCreditLimit
        //     }
        //   }
        // ).exec();

        BusinessAndBranchManagement.BusinessSchema.updateOne(
          { _id: ReceivingData.BuyerBusiness },
          {
            $set: {

              BusinessCreditLimit: mBusinessCreditLimit,
              AvailableCreditLimit: mAvailableCreditLimit
            }
          }
        ).exec();


            var mBusinessBusinessCreditLimit = 0;
            var mBusinessAvailableCreditLimit = 0;
    
    
            // mBusinessBusinessCreditLimit = BusinessDetails.BranchCreditLimit + InviteDetails.BuyerCreditLimit;
            // mBusinessAvailableCreditLimit = BusinessDetails.AvailableCreditLimit + InviteDetails.AvailableLimit;

            mBusinessBusinessCreditLimit = BusinessDetails.BusinessCreditLimit + InviteDetails.BuyerCreditLimit;
            mBusinessAvailableCreditLimit = BusinessDetails.AvailableCreditLimit + InviteDetails.AvailableLimit;
    
            // BusinessAndBranchManagement.BusinessSchema.updateOne(
            //   { _id: ReceivingData.BuyerBranch },
            //   {
            //     $set: {
    
            //       BranchCreditLimit: mBusinessBusinessCreditLimit,
            //       AvailableCreditLimit: mBusinessAvailableCreditLimit
            //     }
            //   }
            // ).exec();
    
            BusinessAndBranchManagement.BusinessSchema.updateOne(
              { _id: ReceivingData.BuyerBusiness },
              {
                $set: {
    
                  BusinessCreditLimit: mBusinessBusinessCreditLimit,
                  AvailableCreditLimit: mBusinessAvailableCreditLimit
                }
              }
            ).exec();

            if (InviteDetails !== null) {
              var SelerBusnsId = InviteDetails.Business;
              BusinessAndBranchManagement.BusinessSchema.findOne(
                { _id: SelerBusnsId },
                {},{}
              ).exec().then(result =>{
                // var mBusinessCreditLimit = 0;
                var mAvailableCreditLimit = 0;
        
                mBusinessCreditLimit = result.BusinessCreditLimit - InviteDetails.BuyerCreditLimit;
                mAvailableCreditLimit = result.AvailableCreditLimit - InviteDetails.AvailableLimit;
                  
                BusinessAndBranchManagement.BusinessSchema.updateOne(
                  { _id: result._id },
                  {
                    $set: {
        
                      // BusinessCreditLimit: mBusinessCreditLimit,
                      AvailableCreditLimit: mAvailableCreditLimit
                    }
                  }
                ).exec();

                
              })
            }

        // Notification 
        Promise.all([
          InviteManagement.InviteManagementSchema.findOne({ _id: ReceivingData.InviteId, ActiveStatus: true, IfDeleted: false }, {}, {})
            .populate({ path: "BuyerBusiness", select: ["FirstName","LastName"] })
          .populate({ path: "Business", select: ["FirstName","LastName"] }).populate({ path: "Seller", select: ["Firebase_Token", "Device_Type", "Mobile"] }).exec(),
          CustomersManagement.CustomerSchema.findOne({ Mobile: ReceivingData.Mobile, CustomerType: 'User', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        ]).then(ResponseRes => {
          var NotifyInviteDetails = JSON.parse(JSON.stringify(ResponseRes[0]));
          var UserDetails = JSON.parse(JSON.stringify(Response[1]));
          if (NotifyInviteDetails !== null) {
            var CustomerFCMToken = [];
            var SellerId = null;
            if (UserDetails !== null) {
              CustomerFCMToken.push(UserDetails.Firebase_Token);
              MobileNumber = UserDetails.Mobile;
              SellerId = UserDetails._id;
            } else {
              CustomerFCMToken.push(NotifyInviteDetails.Seller.Firebase_Token);
              MobileNumber = NotifyInviteDetails.Seller.Mobile;
              SellerId = NotifyInviteDetails.Seller._id;
            }
                
            var payload = {
              notification: {
                title: 'Hundi-Team',
                body: NotifyInviteDetails.BuyerBusiness.FirstName +''+ NotifyInviteDetails.BuyerBusiness.LastName + ' accepted your invite. Click here to create your first invoice for ' + NotifyInviteDetails.Business.FirstName +''+ NotifyInviteDetails.Business.FirstName,
                sound: 'notify_tone.mp3'
              },
              data: {
                Customer: SellerId,
                notification_type: 'InviteNotification',
                click_action: 'FCM_PLUGIN_ACTIVITY',
              }
            };
            if (CustomerFCMToken.length > 0) {
              FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
            }
            const CreateNotification = new NotificationManagement.NotificationSchema({
              User: null,
              // Branch: NotifyInviteDetails.Branch,
              Business: NotifyInviteDetails.Business,
              Notification_Type: 'SellerRequestAccepted',
              Message: NotifyInviteDetails.BuyerBusiness.FirstName +''+ NotifyInviteDetails.BuyerBusiness.LastName  + ' accepted your invite. Click here to create your first invoice for ' + NotifyInviteDetails.Business.FirstName +''+ NotifyInviteDetails.Business.LastName ,
              Message_Received: true,
              Message_Viewed: false,
              ActiveStatus: true,
              IfDeleted: false,
            });
            CreateNotification.save();
            res.status(200).send({ Status: true, Message: "Invite Status Successfully Updated" });
          } else {
            res.status(200).send({ Status: true, Message: "Invite Status Successfully Updated" });
          }
        }).catch(ErrorRes => { });
      } else {
        res.status(417).send({ Status: false, Message: "Invalid Customer details!." });
      }
    }).catch(Error => {
      res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: Error });
    });
  }
};

// Invite Status Update Buyer Update 
exports.SellerInvite_StatusUpdate = function (req, res) {
  var ReceivingData = req.body;
 
  if (!ReceivingData.InviteId || ReceivingData.InviteId === '') {
    res.status(400).send({ Status: false, Message: "InviteId can not be empty" });
  } else if (!ReceivingData.Invite_Status || ReceivingData.Invite_Status === '') {
    res.status(400).send({ Status: false, Message: "Invite Status can not be empty" });
  } else if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
    res.status(400).send({ Status: false, Message: "CustomerId can not be empty" });
  } else if (!ReceivingData.Business || ReceivingData.Business === '') {
    res.status(400).send({ Status: false, Message: "Business can not be empty" });
  } else if (!ReceivingData.BuyerCreditLimit || ReceivingData.BuyerCreditLimit === '') {
    res.status(400).send({ Status: false, Message: "Buyer Credit Limit can not be empty" });
  } else if (!ReceivingData.BuyerPaymentCycle || ReceivingData.BuyerPaymentCycle === '') {
    res.status(400).send({ Status: false, Message: "Buyer Payment Cycle can not be empty" });
  } else if (!ReceivingData.BuyerPaymentType || ReceivingData.BuyerPaymentType === '') {
    res.status(400).send({ Status: false, Message: "Buyer Payment Type can not be empty" });
  } else {
    ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.CustomerId);
    ReceivingData.InviteId = mongoose.Types.ObjectId(ReceivingData.InviteId);
    ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
    Promise.all([
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      InviteManagement.InviteManagementSchema.findOne({ _id: ReceivingData.InviteId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.Business, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      InviteManagement.InviteManagementSchema.find({ Seller: ReceivingData.CustomerId, Business: ReceivingData.Business, $or: [{ Invite_Status: 'Pending_Approval' }, { Invite_Status: 'Accept' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
    ]).then(Response => {
      var CustomerDetails = Response[0];
      var InviteDetails = JSON.parse(JSON.stringify(Response[1]));
      var BusinessDetails = Response[2];
      var GetInviteDetails = Response[3];
       

      if (CustomerDetails !== null && InviteDetails !== null) {
        ReceivingData.BuyerCreditLimit = parseFloat(ReceivingData.BuyerCreditLimit);
        if (ReceivingData.BuyerCreditLimit > 0) {
          ReceivingData.BuyerCreditLimit = ReceivingData.BuyerCreditLimit.toFixed(2);
          ReceivingData.BuyerCreditLimit = parseFloat(ReceivingData.BuyerCreditLimit);
        }
        InviteManagement.InviteManagementSchema.updateOne(
          { "_id": ReceivingData.InviteId },
          {
            $set: {
              "Invite_Status": ReceivingData.Invite_Status,
              "IfSeller": ReceivingData.Invite_Status,
              "IfBuyer": ReceivingData.Invite_Status,
              "Business": ReceivingData.Business,
              // "Branch": ReceivingData.Branch,
              "BuyerCreditLimit": ReceivingData.BuyerCreditLimit,
              "AvailableLimit": ReceivingData.BuyerCreditLimit,
              "BuyerPaymentCycle": ReceivingData.BuyerPaymentCycle,
              "BuyerPaymentType": ReceivingData.BuyerPaymentType,
              "InviteProcess": 'Completed'
            }
          }
        ).exec(function (err_1, result_1) {
          if (err_1) {
            res.status(417).send({ Status: false, Message: "Some error occurred while Updating the Invite Status!.", Error: err_1 });
          } else {
            if (BusinessDetails !== null) {
              
              var AvailableLimit = parseFloat(BusinessDetails.AvailableCreditLimit) - parseFloat(ReceivingData.BuyerCreditLimit); //parseFloat(InviteDetails.AvailableLimit);
              if (AvailableLimit >= 0) {
                BusinessDetails.AvailableCreditLimit = AvailableLimit;
                BusinessDetails.save();
              } else {
                res.status(200).send({ Status: false, Message: "Your Business Credit Limit used for full amount, Please reduce to assigned Credit limit" });
              }
            }
            if (InviteDetails !== null ){
              Promise.all([
                BusinessAndBranchManagement.BusinessSchema.findOne({ _id: InviteDetails.BuyerBusiness, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                
              ]).then(Response => {
                var GetBuyerBusiness = Response[0];

                var mBusinessCreditLimit = 0;
                var mAvailableCreditLimit = 0;  

                if ( GetBuyerBusiness.BusinessCreditLimit > 0) {
                      mBusinessCreditLimit = InviteDetails.BusinessCreditLimit - ReceivingData.BuyerCreditLimit;
                      mAvailableCreditLimit = InviteDetails.AvailableCreditLimit - ReceivingData.BuyerCreditLimit;
                } else{
                      mBusinessCreditLimit = ReceivingData.BuyerCreditLimit;
                      mAvailableCreditLimit = ReceivingData.BuyerCreditLimit;
                }

                //Update  Buyer Business Credit Limits
                BusinessAndBranchManagement.BusinessSchema.updateOne(
                  { _id: InviteDetails.BuyerBusiness },
                  {
                    $set: {
        
                      BusinessCreditLimit: mBusinessCreditLimit,
                      AvailableCreditLimit: mAvailableCreditLimit
                    }
                  }
                ).exec();

            }).catch(Error => {
                res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: Error });
              }); 
            }

            // Notification 
            Promise.all([
              InviteManagement.InviteManagementSchema.findOne({ _id: ReceivingData.InviteId, ActiveStatus: true, IfDeleted: false }, {}, {})
                .populate({ path: "BuyerBusiness", select: ["FirstName","LastName"]})
                .populate({ path: "Business", select: ["FirstName","LastName"] }).populate({ path: "Seller", select: ["Firebase_Token", "Device_Type", "Mobile"] }).exec(),
              CustomersManagement.CustomerSchema.findOne({ Mobile: ReceivingData.Mobile, CustomerType: 'User', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            ]).then(ResponseRes => {
              var NotifyInviteDetails = JSON.parse(JSON.stringify(ResponseRes[0]));
              var UserDetails = JSON.parse(JSON.stringify(Response[1]));
              if (NotifyInviteDetails !== null) {
                var CustomerFCMToken = [];
                var BuyerId = null;
                if (UserDetails !== null) {
                  CustomerFCMToken.push(UserDetails.Firebase_Token);
                  MobileNumber = UserDetails.Mobile;
                  BuyerId = UserDetails._id;
                } else {
                  CustomerFCMToken.push(InviteDetails.Buyer.Firebase_Token);
                  MobileNumber = InviteDetails.Buyer.Mobile;
                  BuyerId = InviteDetails.Buyer._id;
                }

                var payload = {
                  notification: {
                    title: 'Hundi-Team',
                    body: NotifyInviteDetails.Business.FirstName +''+ NotifyInviteDetails.Business.LastName  + ' accepted your invite. Click here to create your first invoice for ' + NotifyInviteDetails.BuyerBusiness.FirstName +''+ NotifyInviteDetails.BuyerBusiness.LastName ,
                    sound: 'notify_tone.mp3'
                  },
                  data: {
                    Customer: BuyerId,
                    notification_type: 'InviteNotification',
                    click_action: 'FCM_PLUGIN_ACTIVITY',
                  }
                };
                if (CustomerFCMToken.length > 0) {
                  FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
                }

                const CreateNotification = new NotificationManagement.NotificationSchema({
                  User: null,
                  // Branch: NotifyInviteDetails.BuyerBranch,
                  Business: NotifyInviteDetails.BuyerBusiness,
                  Notification_Type: 'BuyerRequestAccepted',
                  Message: NotifyInviteDetails.Business.FirstName +''+ NotifyInviteDetails.Business.LastName  + ' accepted your invite. Click here to create your first invoice for ' + NotifyInviteDetails.BuyerBusiness.FirstName +''+NotifyInviteDetails.BuyerBusiness.LastName ,
                  Message_Received: true,
                  Message_Viewed: false,
                  ActiveStatus: true,
                  IfDeleted: false,
                });
                CreateNotification.save();
                res.status(200).send({ Status: true, Message: "Invite Status Successfully Updated" });
              } else {
                res.status(200).send({ Status: true, Message: "Invite Status Successfully Updated" });
              }
            }).catch(ErrorRes => {  });
          }
        });

      } else {
        res.status(417).send({ Status: false, Message: "Invalid Customer details!." });
      }
    }).catch(Error => {
      res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: Error });
    });
  }
};

// Seller Update To Buyer Credit limit
exports.SellerUpdateToBuyerCreditLimit = function (req, res) {
  var ReceivingData = req.body;

  if (!ReceivingData.InviteId || ReceivingData.InviteId === '') {
    res.status(400).send({ Status: false, Message: "InviteId can not be empty" });
  } else if (!ReceivingData.BuyerCreditLimit || ReceivingData.BuyerCreditLimit === '') {
    res.status(400).send({ Status: false, Message: "Buyer Credit Limit can not be empty" });
  } else if (!ReceivingData.BuyerPaymentCycle || ReceivingData.BuyerPaymentCycle === '') {
    res.status(400).send({ Status: false, Message: "Buyer Payment Cycle can not be empty" });
  } else if (!ReceivingData.BuyerPaymentType || ReceivingData.BuyerPaymentType === '') {
    res.status(400).send({ Status: false, Message: "Buyer Payment Type can not be empty" });
  } else if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
    res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
  } else if (!ReceivingData.Business || ReceivingData.Business === '') {
    res.status(400).send({ Status: false, Message: "Seller Business can not be empty" });
  } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
    res.status(400).send({ Status: false, Message: "Buyer Business can not be empty" });
  } else {
    ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.CustomerId);
    ReceivingData.InviteId = mongoose.Types.ObjectId(ReceivingData.InviteId);
    ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
    ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);

    var newRequestLimit =  parseFloat(ReceivingData.BuyerCreditLimit.toString());

    var SellerBusiness = [ReceivingData.Business];
    var BuyerBusiness = [ReceivingData.BuyerBusiness];

    Promise.all([
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      InviteManagement.InviteManagementSchema.findOne({ _id: ReceivingData.InviteId, ActiveStatus: true, IfDeleted: false }, {}, {})
        .populate({ path: "Business", select: ["FirstName","LastName"] })
        .populate({ path: "BuyerBusiness", select: ["FirstName","LastName"] })
        .populate({ path: "Buyer", select: ["Firebase_Token", "Device_Type", "Mobile"] }).exec(),
      CustomersManagement.CustomerSchema.find({ "BusinessAndBranches.Business": { $in: SellerBusiness }, CustomerType: 'User', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      CustomersManagement.CustomerSchema.find({ "BusinessAndBranches.Business": { $in: BuyerBusiness }, CustomerType: 'User', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.Business, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.BuyerBusiness, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      InvoiceManagement.InvoiceSchema.find({BuyerBusiness: ReceivingData.BuyerBusiness,$or: [{ InvoiceStatus: 'Pending' }, { InvoiceStatus: 'Accept' }], ActiveStatus: true, IfDeleted: false  }, {}, {}).exec(),
      // BusinessAndBranchManagement.BusinessSchema.findOne({_id:ReceivingData.BuyerBusiness,ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      InvoiceManagement.InvoiceSchema.find({BuyerBusiness: ReceivingData.BuyerBusiness,Business: ReceivingData.Business,PaidORUnpaid:"Unpaid",
        IfUsedTemporaryCredit:false, InvoiceStatus:'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
        InvoiceManagement.InvoiceSchema.find({BuyerBusiness: ReceivingData.BuyerBusiness,Business: ReceivingData.Business,PaidORUnpaid:"Unpaid",
          IfUsedTemporaryCredit:true, InvoiceStatus:'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
    ]).then(Response => {
      var CustomerDetails = Response[0];
      var InviteDetails = JSON.parse(JSON.stringify(Response[1]));
      var SellerUserDetails = JSON.parse(JSON.stringify(Response[2]));
      var BuyerUserDetails = JSON.parse(JSON.stringify(Response[3]));
      var SellerBusinessDetails = JSON.parse(JSON.stringify(Response[4]));
      var BuyerBusinessDetails = JSON.parse(JSON.stringify(Response[5]));
      var InvoiceDetails = JSON.parse(JSON.stringify(Response[6]));
      // var BuyerBusinessDetails = JSON.parse(JSON.stringify(Response[5]));
      var CreditInvoiceDetails = JSON.parse(JSON.stringify(Response[7]));
      var TempInvoiceDetails = JSON.parse(JSON.stringify(Response[8]));

      var TotalOpenInvoiceAmounts = 0;
      var BuyerBusinessTotalCreditLimit = 0;
      var BuyerBusinessAvailableCreditLimit = 0;
      var SellerBusinessTotal = 0;
      var SellerAvailable = 0;
    if (InviteDetails.BuyerCreditLimit > newRequestLimit) { // 4000 > 500

      BusinessAndBranchManagement.BusinessSchema 
      .findOne({ _id: ReceivingData.Business, ActiveStatus: true, IfDeleted: false }, {}, {})
      .exec((err, result) => {
        if (err) {
          ErrorHandling.ErrorLogCreation(req, 'Branch Details getting Error', 'InvoiceManagement.Controller -> Some occurred Error', JSON.stringify(err));
          res.status(417).send({ Status: false, Message: "Some occurred Error!.", Error: err });
        } else {
         
          if (result !== null) {
            var SellerCreditAmount = Number(result.AvailableCreditLimit); //5000
            var BuyerCreditAmount = Number(result.AvailableCreditLimit); //5000
 
            if (newRequestLimit <= SellerCreditAmount) { // 5000 <= 4000
               
          //Open Invoice Amount Calculation
              CreditInvoiceDetails.forEach(element => {
                TotalOpenInvoiceAmounts += element.InvoiceAmount;
              });

              if (newRequestLimit > TotalOpenInvoiceAmounts) { //500 <= 3310
            
                if (CustomerDetails !== null && InviteDetails !== null) {
                  
                  ReceivingData.BuyerCreditLimit = parseFloat(ReceivingData.BuyerCreditLimit); //50
          
                  if (ReceivingData.BuyerCreditLimit > 0) {
                    ReceivingData.BuyerCreditLimit = ReceivingData.BuyerCreditLimit.toFixed(2);
                    ReceivingData.BuyerCreditLimit = parseFloat(ReceivingData.BuyerCreditLimit);
                  }
                  
                  var BuyerIncreaseTotalAmount =  Number(ReceivingData.BuyerCreditLimit);
                  var BuyerIncreaseAvailableAmount =  Number(ReceivingData.BuyerCreditLimit);
               
                  InviteManagement.InviteManagementSchema.updateOne(
                    { "_id": ReceivingData.InviteId },
                    {
                      $set: {
                        "BuyerCreditLimit": BuyerIncreaseTotalAmount, //50
                        "AvailableLimit": BuyerIncreaseAvailableAmount,
                        "BuyerPaymentCycle": ReceivingData.BuyerPaymentCycle,
                        "BuyerPaymentType": ReceivingData.BuyerPaymentType,
                      }
                    }
                  ).exec(function (err_1, result_1) {
                    if (err_1) {
                      res.status(417).send({ Status: false, Message: "Some error occurred while Updating the Invite Status!.", Error: err_1 });
                    } else {
          
                      result.AvailableCreditLimit =  Number(BuyerCreditAmount) - Number(newRequestLimit); //5000 - 50 
                      result.save((err2, result2) => {
                        if (err2) {
                          ErrorHandling.ErrorLogCreation(req, 'Branch Available Limit Reduce Error', 'InviteManagement.Controller -> SellerIncreaseCreditLimit', JSON.stringify(err2));
                          res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to reduce the Branch Available Credit limit!.", Error: JSON.stringify(err2) });
                        } else {
                                  if (SellerUserDetails.length > 0) {
                                      SellerUserDetails.map(Obj => {
                                        var BuyerFCMToken = [];
                                        BuyerFCMToken.push(Obj.Firebase_Token);
                                        var payload = {
                                           notification: {
                                              title: 'Hundi-Team',
                                              body: InviteDetails.BuyerBusiness.FirstName + ''+InviteDetails.BuyerBusiness.LastName + ' of ' + 'credit limit has been changed to Rs.' + ReceivingData.BuyerCreditLimit + ' and Payment cycle to (' + ReceivingData.BuyerPaymentCycle + 'Days) by ' + InviteDetails.Business.FirstName + ',' + InviteDetails.Business.LastName,
                                              sound: 'notify_tone.mp3'
                                           },
                                           data: {
                                              Customer: Obj._id,
                                              notification_type: 'InviteNotification',
                                              click_action: 'FCM_PLUGIN_ACTIVITY',
                                           }
                                        };
                   
                                        if (BuyerFCMToken.length > 0) {
                                           FCM_App.messaging().sendToDevice(BuyerFCMToken, payload, options).then((NotifyRes) => { });
                                        }
                                        return Obj;
                                      });
                                   }
        
                                   const CreateNotificationSeller = new NotificationManagement.NotificationSchema({
                                      User: null,
                                      // Branch: InviteDetails.Branch._id,
                                      Business: InviteDetails.Business._id,
                                      Notification_Type: 'SellerChangedInvite',
                                      Message: InviteDetails.BuyerBusiness.FirstName + ''+InviteDetails.BuyerBusiness.LastName  + ' accepted your invite. Click here to create your first invoice for ' + InviteDetails.BuyerBusiness.FirstName + ''+InviteDetails.BuyerBusiness.LastName,
                                      Message_Received: true,
                                      Message_Viewed: false,
                                      ActiveStatus: true,
                                      IfDeleted: false,
                                   });
                                   CreateNotificationSeller.save();
                   
                                   if (BuyerUserDetails.length > 0) {
                                      BuyerUserDetails.map(Obj => {
                                        var SellerFCMToken = [];
                                        SellerFCMToken.push(Obj.Firebase_Token);
                                        var payload = {
                                           notification: {
                                              title: 'Hundi-Team',
                                              body: InviteDetails.BuyerBusiness.FirstName + ''+InviteDetails.BuyerBusiness.LastName + 'credit limit has been changed to Rs.' + ReceivingData.BuyerCreditLimit + ' and Payment cycle to (' + ReceivingData.BuyerPaymentCycle + 'Days) by ' + InviteDetails.BuyerBusiness.FirstName + ''+InviteDetails.BuyerBusiness.LastName,
                                              sound: 'notify_tone.mp3'
                                           },
                                           data: {
                                              Customer: Obj._id,
                                              notification_type: 'InviteNotification',
                                              click_action: 'FCM_PLUGIN_ACTIVITY',
                                           }
                                        };
                   
                                        if (SellerFCMToken.length > 0) {
                                           FCM_App.messaging().sendToDevice(SellerFCMToken, payload, options).then((NotifyRes) => { });
                                        }
                   
                                        var SmsMessage = InviteDetails.BuyerBusiness.FirstName + ''+InviteDetails.BuyerBusiness.LastName + 'credit limit has been changed to Rs.' + ReceivingData.BuyerCreditLimit + ' and Payment cycle to (' + ReceivingData.BuyerPaymentCycle + 'Days) by ' + InviteDetails.BuyerBusiness.FirstName + ''+InviteDetails.BuyerBusiness.LastName ;
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
                                        return Obj;
                                      });
                                   }
                   
                                   var CustomerFCMToken = [];
                                   CustomerFCMToken.push(InviteDetails.Buyer.Firebase_Token);
                                   var payload = {
                                      notification: {
                                        title: 'Hundi-Team',
                                        body: InviteDetails.BuyerBusiness.FirstName + ''+InviteDetails.BuyerBusiness.LastName + 'credit limit has been changed to Rs.' + ReceivingData.BuyerCreditLimit + ' and Payment cycle to (' + ReceivingData.BuyerPaymentCycle + 'Days) by ' + InviteDetails.BuyerBusiness.FirstName + ''+InviteDetails.BuyerBusiness.LastName,
                                        sound: 'notify_tone.mp3'
                                      },
                                      data: {
                                        Customer: InviteDetails.Buyer._id,
                                        notification_type: 'InviteNotification',
                                        click_action: 'FCM_PLUGIN_ACTIVITY',
                                      }
                                   };
                   
                                   if (CustomerFCMToken.length > 0) {
                                      FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
                                   }
                   
                                   var SmsMessage = InviteDetails.BuyerBusiness.FirstName + ''+InviteDetails.BuyerBusiness.LastName + 'credit limit has been changed to Rs.' + ReceivingData.BuyerCreditLimit + ' and Payment cycle to (' + ReceivingData.BuyerPaymentCycle + 'Days) by ' +InviteDetails.BuyerBusiness.FirstName + ''+InviteDetails.BuyerBusiness.LastName;
                                   const params = new URLSearchParams();
                                   params.append('key', '25ECE50D1A3BD6');
                                   params.append('msg', SmsMessage);
                                   params.append('senderid', 'TXTDMO');
                                   params.append('routeid', '3');
                                   params.append('contacts', InviteDetails.Buyer.Mobile);
                   
                                   // axios.post('https://sms.textmysms.com/app/smsapi/index.php', params).then(function (response) {
                                   //    callback(null, response.data);
                                   //  }).catch(function (error) {
                                   //    callback('Some Error for Seller Invite SMS!, Error: ' + error, null);
                                   //  });
                   
                                   const CreateBuyerNotification = new NotificationManagement.NotificationSchema({
                                      User: null,
                                      CustomerID: InviteDetails.BuyerBusiness._id,
                                      Notification_Type: 'BuyerChangedInvite',
                                      Message: InviteDetails.BuyerBusiness.FirstName + ''+InviteDetails.BuyerBusiness.LastName + 'credit limit has been changed to Rs.' + ReceivingData.BuyerCreditLimit + ' and Payment cycle to (' + ReceivingData.BuyerPaymentCycle + 'Days) by ' + InviteDetails.BuyerBusiness.FirstName + ''+InviteDetails.BuyerBusiness.LastName,
                                      Message_Received: true,
                                      Message_Viewed: false,
                                      ActiveStatus: true,
                                      IfDeleted: false,
                                   });
                                   CreateBuyerNotification.save();
                          res.status(200).send({ Status: true, Message: 'Invite Status Successfully Updated'});
                        }
                      });
                    }
                  });
          
                } else {
                  res.status(417).send({ Status: false, Message: "Invalid Customer details!." });
                }
              } else {
                res.status(400).send({ Status: false, Message: "Sorry you have Open Invoices you can reduce the Amount!." });
              }  

             
            } else {
              res.status(200).send({ Status: false, Message: 'Your Requested Limit should be within the Seller Business Credit Limit!' });
            }
          } else {
            res.status(400).send({ Status: false, Message: 'Invalid Business Details' });
          }
        }
      });
    } else {
      //update
      BusinessAndBranchManagement.BusinessSchema 
      .findOne({ _id: ReceivingData.Business, ActiveStatus: true, IfDeleted: false }, {}, {})
      .exec((err, result) => {
        if (err) {
          ErrorHandling.ErrorLogCreation(req, 'Branch Details getting Error', 'InvoiceManagement.Controller -> Some occurred Error', JSON.stringify(err));
          res.status(417).send({ Status: false, Message: "Some occurred Error!.", Error: err });
        } else {
         
          if (result !== null) {
            var SellerCreditAmount = Number(result.AvailableCreditLimit); //5000
            var BuyerCreditAmount = Number(result.AvailableCreditLimit); //5000
 
            if (newRequestLimit <= SellerCreditAmount) { // 5000 <= 4000
               
          //Open Invoice Amount Calculation
              CreditInvoiceDetails.forEach(element => {
                TotalOpenInvoiceAmounts += element.InvoiceAmount;
              });

              if (newRequestLimit > TotalOpenInvoiceAmounts) { //500 <= 3310
            
                if (CustomerDetails !== null && InviteDetails !== null) {
                  
                  ReceivingData.BuyerCreditLimit = parseFloat(ReceivingData.BuyerCreditLimit); //50
          
                  if (ReceivingData.BuyerCreditLimit > 0) {
                    ReceivingData.BuyerCreditLimit = ReceivingData.BuyerCreditLimit.toFixed(2);
                    ReceivingData.BuyerCreditLimit = parseFloat(ReceivingData.BuyerCreditLimit);
                  }
                  
                  var BuyerIncreaseTotalAmount =  Number(ReceivingData.BuyerCreditLimit);
                  var BuyerIncreaseAvailableAmount =  Number(ReceivingData.BuyerCreditLimit);
               
                  InviteManagement.InviteManagementSchema.updateOne(
                    { "_id": ReceivingData.InviteId },
                    {
                      $set: {
                        "BuyerCreditLimit": BuyerIncreaseTotalAmount, //50
                        "AvailableLimit": BuyerIncreaseAvailableAmount,
                        "BuyerPaymentCycle": ReceivingData.BuyerPaymentCycle,
                        "BuyerPaymentType": ReceivingData.BuyerPaymentType,
                      }
                    }
                  ).exec(function (err_1, result_1) {
                    if (err_1) {
                      res.status(417).send({ Status: false, Message: "Some error occurred while Updating the Invite Status!.", Error: err_1 });
                    } else {
          
                      result.AvailableCreditLimit =  Number(BuyerCreditAmount) - Number(newRequestLimit); //5000 - 50 
                      result.save((err2, result2) => {
                        if (err2) {
                          ErrorHandling.ErrorLogCreation(req, 'Branch Available Limit Reduce Error', 'InviteManagement.Controller -> SellerIncreaseCreditLimit', JSON.stringify(err2));
                          res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to reduce the Branch Available Credit limit!.", Error: JSON.stringify(err2) });
                        } else {
                                  if (SellerUserDetails.length > 0) {
                                      SellerUserDetails.map(Obj => {
                                        var BuyerFCMToken = [];
                                        BuyerFCMToken.push(Obj.Firebase_Token);
                                        var payload = {
                                           notification: {
                                              title: 'Hundi-Team',
                                              body: InviteDetails.BuyerBusiness.FirstName + ''+InviteDetails.BuyerBusiness.LastName + ' of ' + 'credit limit has been changed to Rs.' + ReceivingData.BuyerCreditLimit + ' and Payment cycle to (' + ReceivingData.BuyerPaymentCycle + 'Days) by ' + InviteDetails.Business.FirstName + ',' + InviteDetails.Business.LastName,
                                              sound: 'notify_tone.mp3'
                                           },
                                           data: {
                                              Customer: Obj._id,
                                              notification_type: 'InviteNotification',
                                              click_action: 'FCM_PLUGIN_ACTIVITY',
                                           }
                                        };
                   
                                        if (BuyerFCMToken.length > 0) {
                                           FCM_App.messaging().sendToDevice(BuyerFCMToken, payload, options).then((NotifyRes) => { });
                                        }
                                        return Obj;
                                      });
                                   }
        
                                   const CreateNotificationSeller = new NotificationManagement.NotificationSchema({
                                      User: null,
                                      // Branch: InviteDetails.Branch._id,
                                      Business: InviteDetails.Business._id,
                                      Notification_Type: 'SellerChangedInvite',
                                      Message: InviteDetails.BuyerBusiness.FirstName + ''+InviteDetails.BuyerBusiness.LastName  + ' accepted your invite. Click here to create your first invoice for ' + InviteDetails.BuyerBusiness.FirstName + ''+InviteDetails.BuyerBusiness.LastName,
                                      Message_Received: true,
                                      Message_Viewed: false,
                                      ActiveStatus: true,
                                      IfDeleted: false,
                                   });
                                   CreateNotificationSeller.save();
                   
                                   if (BuyerUserDetails.length > 0) {
                                      BuyerUserDetails.map(Obj => {
                                        var SellerFCMToken = [];
                                        SellerFCMToken.push(Obj.Firebase_Token);
                                        var payload = {
                                           notification: {
                                              title: 'Hundi-Team',
                                              body: InviteDetails.BuyerBusiness.FirstName + ''+InviteDetails.BuyerBusiness.LastName + 'credit limit has been changed to Rs.' + ReceivingData.BuyerCreditLimit + ' and Payment cycle to (' + ReceivingData.BuyerPaymentCycle + 'Days) by ' + InviteDetails.BuyerBusiness.FirstName + ''+InviteDetails.BuyerBusiness.LastName,
                                              sound: 'notify_tone.mp3'
                                           },
                                           data: {
                                              Customer: Obj._id,
                                              notification_type: 'InviteNotification',
                                              click_action: 'FCM_PLUGIN_ACTIVITY',
                                           }
                                        };
                   
                                        if (SellerFCMToken.length > 0) {
                                           FCM_App.messaging().sendToDevice(SellerFCMToken, payload, options).then((NotifyRes) => { });
                                        }
                   
                                        var SmsMessage = InviteDetails.BuyerBusiness.FirstName + ''+InviteDetails.BuyerBusiness.LastName + 'credit limit has been changed to Rs.' + ReceivingData.BuyerCreditLimit + ' and Payment cycle to (' + ReceivingData.BuyerPaymentCycle + 'Days) by ' + InviteDetails.BuyerBusiness.FirstName + ''+InviteDetails.BuyerBusiness.LastName ;
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
                                        return Obj;
                                      });
                                   }
                   
                                   var CustomerFCMToken = [];
                                   CustomerFCMToken.push(InviteDetails.Buyer.Firebase_Token);
                                   var payload = {
                                      notification: {
                                        title: 'Hundi-Team',
                                        body: InviteDetails.BuyerBusiness.FirstName + ''+InviteDetails.BuyerBusiness.LastName + 'credit limit has been changed to Rs.' + ReceivingData.BuyerCreditLimit + ' and Payment cycle to (' + ReceivingData.BuyerPaymentCycle + 'Days) by ' + InviteDetails.BuyerBusiness.FirstName + ''+InviteDetails.BuyerBusiness.LastName,
                                        sound: 'notify_tone.mp3'
                                      },
                                      data: {
                                        Customer: InviteDetails.Buyer._id,
                                        notification_type: 'InviteNotification',
                                        click_action: 'FCM_PLUGIN_ACTIVITY',
                                      }
                                   };
                   
                                   if (CustomerFCMToken.length > 0) {
                                      FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
                                   }
                   
                                   var SmsMessage = InviteDetails.BuyerBusiness.FirstName + ''+InviteDetails.BuyerBusiness.LastName + 'credit limit has been changed to Rs.' + ReceivingData.BuyerCreditLimit + ' and Payment cycle to (' + ReceivingData.BuyerPaymentCycle + 'Days) by ' +InviteDetails.BuyerBusiness.FirstName + ''+InviteDetails.BuyerBusiness.LastName;
                                   const params = new URLSearchParams();
                                   params.append('key', '25ECE50D1A3BD6');
                                   params.append('msg', SmsMessage);
                                   params.append('senderid', 'TXTDMO');
                                   params.append('routeid', '3');
                                   params.append('contacts', InviteDetails.Buyer.Mobile);
                   
                                   // axios.post('https://sms.textmysms.com/app/smsapi/index.php', params).then(function (response) {
                                   //    callback(null, response.data);
                                   //  }).catch(function (error) {
                                   //    callback('Some Error for Seller Invite SMS!, Error: ' + error, null);
                                   //  });
                   
                                   const CreateBuyerNotification = new NotificationManagement.NotificationSchema({
                                      User: null,
                                      CustomerID: InviteDetails.BuyerBusiness._id,
                                      Notification_Type: 'BuyerChangedInvite',
                                      Message: InviteDetails.BuyerBusiness.FirstName + ''+InviteDetails.BuyerBusiness.LastName + 'credit limit has been changed to Rs.' + ReceivingData.BuyerCreditLimit + ' and Payment cycle to (' + ReceivingData.BuyerPaymentCycle + 'Days) by ' + InviteDetails.BuyerBusiness.FirstName + ''+InviteDetails.BuyerBusiness.LastName,
                                      Message_Received: true,
                                      Message_Viewed: false,
                                      ActiveStatus: true,
                                      IfDeleted: false,
                                   });
                                   CreateBuyerNotification.save();
                          res.status(200).send({ Status: true, Message: 'Invite Status Successfully Updated'});
                        }
                      });
                    }
                  });
          
                } else {
                  res.status(417).send({ Status: false, Message: "Invalid Customer details!." });
                }
              } else {
                res.status(400).send({ Status: false, Message: "Sorry you have Open Invoices you can reduce the Amount!." });
              }  

             
            } else {
              res.status(200).send({ Status: false, Message: 'Your Requested Limit should be within the Seller Business Credit Limit!' });
            }
          } else {
            res.status(400).send({ Status: false, Message: 'Invalid Business Details' });
          }
        }
      }); 
    }
    
      
    }).catch(Error => {
      res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: Error });
    });
  
    
  }
};





// Invite Reject 
exports.Invite_Reject = function (req, res) {
  var ReceivingData = req.body;

  if (!ReceivingData.InviteId || ReceivingData.InviteId === '') {
    res.status(400).send({ Status: false, Message: "InviteId can not be empty" });
  } else if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
    res.status(400).send({ Status: false, Message: "CustomerId can not be empty" });
  } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
    res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
  } else {
    ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
    ReceivingData.InviteId = mongoose.Types.ObjectId(ReceivingData.InviteId);
    Promise.all([
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      InviteManagement.InviteManagementSchema.findOne({ _id: ReceivingData.InviteId, ActiveStatus: true, IfDeleted: false }, {}, {}).
        populate({ path: 'Seller', select: ['Firebase_Token'] }).populate({ path: 'Buyer', select: ['Firebase_Token'] }).
        populate({ path: 'BuyerBusiness', select: ['FirstName','LastName'] }).populate({ path: 'Business', select: ['FirstName','LastName'] }).exec(),
    ]).then(Response => {
      var CustomerDetails = Response[0];
      var InviteDetails = Response[1];
      if (CustomerDetails !== null && InviteDetails !== null) {
        InviteManagement.InviteManagementSchema.updateOne(
          { "_id": ReceivingData.InviteId },
          { $set: { Invite_Status: 'Reject', IfBuyer: 'Reject', IfSeller: 'Reject' } }
        ).exec(function (err_1, result_1) {
          if (err_1) {
            res.status(417).send({ Status: false, Message: "Some error occurred while Updating the Invite Status!.", Error: err_1 });
          } else {
            Promise.all([
              BusinessAndBranchManagement.BusinessSchema.findOne({ _id: InviteDetails.Business }, {}, {}).exec(),
            ]).then(Response => {
              var BusinessDetails = Response[0];
              var AvailableBusinessCreditLimit = 0;
              //var AvailableBusinessCreditLimit = Number(InviteDetails.BuyerCreditLimit);
              //AvailableBusinessCreditLimit = AvailableBusinessCreditLimit + BranchDetails.AvailableCreditLimit;

              if(ReceivingData.CustomerCategory == "Seller")
              {
                AvailableBusinessCreditLimit = BusinessDetails.AvailableCreditLimit;
              }
              else if(ReceivingData.CustomerCategory == "Buyer")
              {
                 AvailableBusinessCreditLimit = Number(InviteDetails.BuyerCreditLimit);
                 AvailableBusinessCreditLimit = AvailableBusinessCreditLimit + BusinessDetails.AvailableCreditLimit;
              }


              Promise.all([
                // BusinessAndBranchManagement.BranchSchema.updateOne(
                //   { _id: InviteDetails.Branch },
                //   { $set: { AvailableCreditLimit: AvailableBusinessCreditLimit } }
                // ).exec()
                BusinessAndBranchManagement.BusinessSchema.updateOne(
                  { _id: InviteDetails.Business },
                  { $set: {
                    //  AvailableCreditLimit: AvailableBusinessCreditLimit
                     } }
                ).exec()
              ]).then(ResponseNew => {
                // res.status(200).send({ Status: true, Message: "Branch details successfully updated!." });
              }).catch(error => {
                ErrorHandling.ErrorLogCreation(req, 'Business and branch details update getting error', 'BusinessAndBranchManagement.controller -> BranchUpdate', JSON.stringify(error));
                res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to update the branch details!.", Error: JSON.stringify(error) });
              });
            }).catch(Error => {
              res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: Error });
            });
				var CustomerFCMToken = [];
				var payload = {};
            if (ReceivingData.CustomerCategory === 'Seller') {
              CustomerFCMToken = [];
              CustomerFCMToken.push(InviteDetails.Buyer.Firebase_Token);
              payload = {
                notification: {
                  title: 'Hundi-Team',
                  body: InviteDetails.Business.FirstName +''+ InviteDetails.Business.LastName  + '  rejected your invite',
                  sound: 'notify_tone.mp3'
                },
                data: {
                  Customer: InviteDetails.Buyer._id,
                  notification_type: 'InviteNotification',
                  click_action: 'FCM_PLUGIN_ACTIVITY',
                }
              };
              if (CustomerFCMToken.length > 0) {
                FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
              }

              const CreateNotification = new NotificationManagement.NotificationSchema({
                User: null,
                // Branch: InviteDetails.BuyerBranch,
                Business: InviteDetails.BuyerBusiness,
                Notification_Type: 'InviteRejected',
                Message: InviteDetails.Business.FirstName +''+ InviteDetails.Business.LastName  + '  rejected your invite',
                Message_Received: true,
                Message_Viewed: false,
                ActiveStatus: true,
                IfDeleted: false,
              });
              CreateNotification.save();
            } else if (ReceivingData.CustomerCategory === 'Buyer') {
              CustomerFCMToken = [];
              CustomerFCMToken.push(InviteDetails.Seller.Firebase_Token);
              payload = {
                notification: {
                  title: 'Hundi-Team',
                  body: InviteDetails.BuyerBusiness.FirstName +''+ InviteDetails.BuyerBusiness.LastName  + '  rejected your invite',
                  sound: 'notify_tone.mp3'
                },
                data: {
                  Customer: InviteDetails.Seller._id,
                  notification_type: 'InviteNotification',
                  click_action: 'FCM_PLUGIN_ACTIVITY',
                }
              };
              if (CustomerFCMToken.length > 0) {
                FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
              }

              const CreateNotification = new NotificationManagement.NotificationSchema({
                User: null,
                // Branch: InviteDetails.Branch,
                Business: InviteDetails.Business,
                Notification_Type: 'InviteRejected',
                Message: InviteDetails.BuyerBusiness.FirstName +''+ InviteDetails.BuyerBusiness.LastName  + '  rejected your invite',
                Message_Received: true,
                Message_Viewed: false,
                ActiveStatus: true,
                IfDeleted: false,
              });
              CreateNotification.save();
            }
            res.status(200).send({ Status: true, Message: "Invite Status Successfully Updated" });
          }
        });
      } else {
        res.status(417).send({ Status: false, Message: "Invalid Customer details!." });
      }
    }).catch(Error => {
      res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: Error });
    });
  }
};

// Seller And Buyer Invite List
exports.SellerAndBuyerInviteList = function (req, res) {
  var ReceivingData = req.body;

  if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
    res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
  } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
    res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
  } else {
    ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
    var FindQuery = {};

    CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(function (err, result) {
      if (err) {
        ErrorHandling.ErrorLogCreation(req, 'Customer Details Getting Error', 'PaymentManagement.Controller -> Customer Details Finding Error', JSON.stringify(err));
        res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Customer Details!.", Error: err });
      } else {
        var customerDetails = JSON.parse(JSON.stringify(result));
        if (result !== null) {

          if (customerDetails.CustomerType === 'User') {
          //   const userBranches = [];
          //   const branchKey = ReceivingData.CustomerCategory === 'Seller' ? 'Branch' : 'BuyerBranch';
          //   customerDetails.BusinessAndBranches.map(Obj => { 
          //     Obj.Branches.map(ObjNew => {
          //        userBranches.push(mongoose.Types.ObjectId(ObjNew));
          //     });
          //  });

          const userBusiness = [];
          const branchKey = ReceivingData.CustomerCategory === 'Seller' ? 'Business' : 'BuyerBusiness';
          customerDetails.BusinessAndBranches.map(Obj => { 
            

              userBusiness.push(Obj.Business);
         });

            if (ReceivingData.CustomerCategory === 'Seller') {
              if (ReceivingData.Invite_Status === 'Pending_Approval') {
                FindQuery = { Business: { $in: userBusiness }, IfBuyer: "Pending", IfSeller: "", Invite_Status: ReceivingData.Invite_Status, ActiveStatus: true, IfDeleted: false };
              } else if (ReceivingData.Invite_Status === 'Pending') {
                FindQuery = { Business: { $in: userBusiness }, IfBuyer: "", IfSeller: "Pending", Invite_Status: "Pending_Approval", ActiveStatus: true, IfDeleted: false };
              } else if (ReceivingData.Invite_Status === 'Accept') {
                FindQuery = { Business: { $in: userBusiness }, Invite_Status: ReceivingData.Invite_Status, ActiveStatus: true, IfDeleted: false };
              } else if (ReceivingData.Invite_Status === 'Reject') {
                FindQuery = { Business: { $in: userBusiness }, Invite_Status: ReceivingData.Invite_Status, ActiveStatus: true, IfDeleted: false };
              } else {
                FindQuery = { Business: { $in: userBusiness },  ActiveStatus: true, IfDeleted: false };
              }
            } else if (ReceivingData.CustomerCategory === 'Buyer') {
              if (ReceivingData.Invite_Status === 'Pending_Approval') {
                FindQuery = {  BuyerBusiness: { $in: userBusiness }, IfBuyer: "", IfSeller: "Pending", Invite_Status: ReceivingData.Invite_Status, ActiveStatus: true, IfDeleted: false };
              } else if (ReceivingData.Invite_Status === 'Pending') {
                FindQuery = { BuyerBusiness: { $in: userBusiness }, IfBuyer: "Pending", IfSeller: "", Invite_Status: "Pending_Approval", ActiveStatus: true, IfDeleted: false };
              } else if (ReceivingData.Invite_Status === 'Accept') {
                FindQuery = { BuyerBusiness: { $in: userBusiness }, Invite_Status: ReceivingData.Invite_Status, ActiveStatus: true, IfDeleted: false };
              } else if (ReceivingData.Invite_Status === 'Reject') {
                FindQuery = { BuyerBusiness: { $in: userBusiness }, Invite_Status: ReceivingData.Invite_Status, ActiveStatus: true, IfDeleted: false };
              } else {
                FindQuery = { BuyerBusiness: { $in: userBusiness }, ActiveStatus: true, IfDeleted: false };
              }
            }

          }

          if (ReceivingData.CustomerCategory === 'Seller' && customerDetails.CustomerType === 'Owner') {
            if (ReceivingData.Invite_Status === 'Pending_Approval') {
              FindQuery = { Seller: ReceivingData.CustomerId, IfBuyer: "Pending", IfSeller: "", Invite_Status: ReceivingData.Invite_Status, ActiveStatus: true, IfDeleted: false };
            } else if (ReceivingData.Invite_Status === 'Pending') {
              FindQuery = { InvitedBy: ReceivingData.CustomerId, IfBuyer: "", IfSeller: "Pending", Invite_Status: "Pending_Approval", ActiveStatus: true, IfDeleted: false };
            } else if (ReceivingData.Invite_Status === 'Accept') {
              FindQuery = { Seller: ReceivingData.CustomerId, Invite_Status: ReceivingData.Invite_Status, ActiveStatus: true, IfDeleted: false };
            } else if (ReceivingData.Invite_Status === 'Reject') {
              FindQuery = { Seller: ReceivingData.CustomerId, Invite_Status: ReceivingData.Invite_Status, ActiveStatus: true, IfDeleted: false };
            } else {
              FindQuery = { Seller: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false };
            }
          } else if (ReceivingData.CustomerCategory === 'Buyer' && customerDetails.CustomerType === 'Owner') {
            if (ReceivingData.Invite_Status === 'Pending_Approval') {
              FindQuery = { Buyer: ReceivingData.CustomerId, IfBuyer: "",  IfSeller: "Pending", Invite_Status: ReceivingData.Invite_Status, ActiveStatus: true, IfDeleted: false };
            } else if (ReceivingData.Invite_Status === 'Pending') {
              FindQuery = { InvitedBy: ReceivingData.CustomerId, IfBuyer: "Pending", IfSeller: "", Invite_Status: "Pending_Approval", ActiveStatus: true, IfDeleted: false };
            } else if (ReceivingData.Invite_Status === 'Accept') {
              FindQuery = { Buyer: ReceivingData.CustomerId, Invite_Status: ReceivingData.Invite_Status, ActiveStatus: true, IfDeleted: false };
            } else if (ReceivingData.Invite_Status === 'Reject') {
              FindQuery = { Buyer: ReceivingData.CustomerId, Invite_Status: ReceivingData.Invite_Status, ActiveStatus: true, IfDeleted: false };
            } else {
              FindQuery = { Buyer: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false };
            }
          }
          Promise.all([
            CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
          ]).then(Response => {
            var CustomerDetails = Response[0];
            if (CustomerDetails !== null) {
              InviteManagement.InviteManagementSchema.find(FindQuery, {},{ 'sort': { createdAt: -1 } })
                .populate({ path: 'Buyer', select: ['ContactName', 'Mobile', 'Email'] })
                .populate({ path: 'Seller', select: ['ContactName', 'Mobile', 'Email'] })
                .populate({ path: 'InvitedUser', select: ['ContactName', 'Mobile', 'Email'] })
                .populate({ path: 'BuyerBusiness', select: ['FirstName','LastName'] })
                .populate({ path: "Business", select: ['FirstName','LastName' ,"BusinessCreditLimit", "AvailableCreditLimit"]})
                .exec(function (err, result) {
                  if (err) {
                    ErrorHandling.ErrorLogCreation(req, 'Seller Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(err));
                    res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
                  } else {
                    result = JSON.parse(JSON.stringify(result));
                  
                    if (result.length !== 0) {
                      var ResponsePending_Approval = [];
                      var ResponsePending = [];
                      var ResponseAccepted = [];
                      var ResponseRejected = [];
                      result.map(Obj => {
                        Obj.createdAt = moment(new Date(Obj.createdAt)).format("YYYY-MM-DD");
                        Obj.updatedAt = moment(new Date(Obj.updatedAt)).format("YYYY-MM-DD");
                      
                        if (Obj.IfUser === true && Obj.InviteCategory === "Seller") {
                          Obj.Buyer = Obj.InvitedUser;
                        } else if (Obj.IfUser === true && Obj.InviteCategory === "Buyer") {
                          Obj.Seller = Obj.InvitedUser;
                        }
                        const EmptyValueBuyer = {
                          _id: null,
                          ContactName: '',
                          Mobile: '',
                          Email: ''
                        };
                        const EmptyValueBuyerBusiness = {
                          _id: null,
                          FirstName: '',
                          LastName: '',
                        };
                     
                        const EmptyValueSeller = {
                          _id: null,
                          ContactName: '',
                          Mobile: '',
                          Email: ''
                        };
                        const EmptyValueBusiness = {
                          _id: null,
                          FirstName: '',
                          LastName: '',
                          BusinessCreditLimit: 0,
                          AvailableCreditLimit: 0
                        };
                      
                        if (Obj.Buyer === null) {
                          Obj.Buyer = EmptyValueBuyer;
                        }
                        if (Obj.BuyerBusiness === null) {
                          Obj.BuyerBusiness = EmptyValueBuyerBusiness;
                        }
                       
                        if (Obj.Seller === null) {
                          Obj.Seller = EmptyValueSeller;
                        }
                        if (Obj.Business === null) {
                          Obj.Business = EmptyValueBusiness;
                        }
                    
                        return Obj;
                      });
                      if (ReceivingData.Invite_Status === '') {
                        result.map(Obj => {
                          if (customerDetails.CustomerType === 'User') 
                          {
                            if (ReceivingData.CustomerCategory === 'Seller')
                            {
                              if ((Obj.Invite_Status === 'Pending_Approval' && Obj.InviteCategory === 'Seller' && Obj.IfBuyer === 'Pending' && Obj.IfSeller === '')) {
                                ResponsePending_Approval.push(Obj);
                              } else if ((Obj.Invite_Status === 'Pending_Approval' && Obj.InviteCategory === 'Buyer' && Obj.IfBuyer === '' && Obj.IfSeller === 'Pending')) {
                                ResponsePending.push(Obj);
                              } else if (Obj.Invite_Status === 'Accept') {
                                ResponseAccepted.push(Obj);
                              } else if (Obj.Invite_Status === 'Reject') {
                                ResponseRejected.push(Obj);
                              }
                            }
                            else if (ReceivingData.CustomerCategory === 'Buyer')
                            { 
                             
                              if (Obj.Invite_Status === 'Pending_Approval' && Obj.InviteCategory === 'Buyer' && Obj.IfBuyer === '' && Obj.IfSeller === 'Pending') {
                                ResponsePending_Approval.push(Obj);
                              } else if (Obj.Invite_Status === 'Pending_Approval' && Obj.InviteCategory === 'Seller' && Obj.IfBuyer === 'Pending' && Obj.IfSeller === '') {
                                ResponsePending.push(Obj);
                              } else if (Obj.Invite_Status === 'Accept') {
                                ResponseAccepted.push(Obj);
                              } else if (Obj.Invite_Status === 'Reject') {
                                ResponseRejected.push(Obj);
                              }
                            }
                          }
                          else
                          {
                          
                           
                            if ((Obj.InvitedBy !== JSON.parse(JSON.stringify(ReceivingData.CustomerId))  && Obj.Invite_Status === 'Pending_Approval' && Obj.InviteCategory === 'Seller' && Obj.IfBuyer === 'Pending' && Obj.IfSeller === '') ||
                            (Obj.InvitedBy !== JSON.parse(JSON.stringify(ReceivingData.CustomerId))  && Obj.Invite_Status === 'Pending_Approval' && Obj.InviteCategory === 'Buyer' && Obj.IfBuyer === '' && Obj.IfSeller === 'Pending')) {
                        
                              ResponsePending_Approval.push(Obj);
                            } else if ((Obj.InvitedBy === JSON.parse(JSON.stringify(ReceivingData.CustomerId)) && Obj.Invite_Status === 'Pending_Approval' && Obj.InviteCategory === 'Buyer' && Obj.IfBuyer === '' && Obj.IfSeller === 'Pending') ||
                              (Obj.InvitedBy === JSON.parse(JSON.stringify(ReceivingData.CustomerId)) && Obj.Invite_Status === 'Pending_Approval' && Obj.InviteCategory === 'Seller' && Obj.IfBuyer === 'Pending' && Obj.IfSeller === '')) {
                              ResponsePending.push(Obj);
                            } else if (Obj.Invite_Status === 'Accept') {
                              ResponseAccepted.push(Obj);
                            } else if (Obj.Invite_Status === 'Reject') { //Obj.BuyerBusiness._id === null
                              ResponseRejected.push(Obj);
                            } 
                            // else  if 
                          //   ((Obj.InvitedBy !== JSON.parse(JSON.stringify(ReceivingData.CustomerId)) && Obj.Business._id === null && Obj.Invite_Status === 'Pending_Approval' && Obj.InviteCategory === 'Seller' && Obj.IfBuyer === 'Pending' && Obj.IfSeller === '') ||
                          //   (Obj.InvitedBy !== JSON.parse(JSON.stringify(ReceivingData.CustomerId)) && Obj.BuyerBusiness._id === null && Obj.Invite_Status === 'Pending_Approval' && Obj.InviteCategory === 'Buyer' && Obj.IfBuyer === '' && Obj.IfSeller === 'Pending')){
                          //     InviteManagement.InviteManagementSchema.find({InvitedBy:Obj.InvitedBy,ActiveStatus:true,IfDeleted:false},{},{})
                          //     .populate({ path: 'Buyer', select: ['ContactName', 'Mobile', 'Email'] })
                          //     .populate({ path: 'Seller', select: ['ContactName', 'Mobile', 'Email'] })
                          //     .populate({ path: 'InvitedUser', select: ['ContactName', 'Mobile', 'Email'] })
                          //     .populate({ path: 'BuyerBusiness', select: ['FirstName','LastName'] })
                          //     .populate({ path: "Business", select: ['FirstName','LastName' ,"BusinessCreditLimit", "AvailableCreditLimit"]})
                          //     .exec(
                          //       function (err, reslt) {
                          //           if (err) {
                          //             console.log('errrr');
                          //           } else {
                          //             reslt.map(objj=>{ 
                          //               console.log(objj);
                          //               ResponsePending_Approval.push(objj)
                                        
                          //             })
                          //           }
                          //         // console.log(ResponsePending_Approval,'213123');
                          //       }
                          //     )
                          //    }
                          }

                         
                        }); 
                         
                        if (ResponsePending_Approval.length > 0) {
                          res.status(200).send({ Status: true, Message: 'Customer Pending Approval List', InviteTitle: 'Pending_Approval', Response: ResponsePending_Approval });
                        } else if (ResponsePending.length > 0) {
                          res.status(200).send({ Status: true, Message: 'Your Pending List', InviteTitle: 'Pending', Response: ResponsePending });
                        } else if (ResponseAccepted.length > 0) {
                          res.status(200).send({ Status: true, Message: 'Customer Accepted List', InviteTitle: 'Accept', Response: ResponseAccepted });
                        } else if (ResponseRejected.length > 0) {
                          res.status(200).send({ Status: true, Message: 'Customer Rejected List', InviteTitle: 'Reject', Response: ResponseRejected });
                        } else {
                          res.status(200).send({ Status: false, Message: "You Doesn't having any Customer!", InviteTitle: 'Pending_Approval', Response: [] });
                        }
                      } else {
                        res.status(200).send({ Status: true, InviteTitle: ReceivingData.Invite_Status, Message: 'Your Connected Customers', Response: result });
                      }
                    } else {
                      res.status(200).send({ Status: false, InviteTitle: 'Pending_Approval', Message: "You Doesn't having any Customer!", Response: [] });
                    }
                  }
                });
            } else {
              res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
            }
          }).catch(Error => {
            res.status(417).send({ Status: false, Message: "Some Occurred Error", Error: Error });
          });
        } else {
          res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
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
  } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
    res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
  } else {
    ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
    ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);

    Promise.all([
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
    ]).then(Response => {
      var CustomerDetails = Response[0];
      if (CustomerDetails !== null) {
        if (CustomerDetails.CustomerType === 'Owner') {
          ReceivingData.Seller = mongoose.Types.ObjectId(CustomerDetails._id);
          InviteManagement.InviteManagementSchema.find({ Seller: ReceivingData.Seller, Business: ReceivingData.Business, Invite_Status: 'Accept' }, {}, {})
            .populate({ path: 'Buyer', select: ['ContactName', 'Mobile', 'Email'] })
            .exec(function (err, result) {
              if (err) {
                ErrorHandling.ErrorLogCreation(req, 'Seller Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(err));
                res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
              } else {
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
          var BusinessArr = [ReceivingData.Business];
          ReceivingData.Seller = mongoose.Types.ObjectId(CustomerDetails.Owner);
         
          if (CustomerDetails.BusinessAndBranches.length !== 0) {
            CustomerDetails.BusinessAndBranches.map(Obj => {
              if (Obj.Business.length !== 0) {
               
                  BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                
              }
            });
          }
          InviteManagement.InviteManagementSchema.find({ Seller: ReceivingData.Seller, Business: ReceivingData.Business, Invite_Status: 'Accept' }, {}, {})
            .populate({ path: 'Buyer', select: ['ContactName', 'Mobile', 'Email'] })
            .exec(function (err, result) {
              if (err) {
                ErrorHandling.ErrorLogCreation(req, 'Seller Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(err));
                res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
              } else {
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

// SellerAgainstBusinessList
exports.SellerAgainstBusinessList = function (req, res) {
  var ReceivingData = req.body;
  if (!ReceivingData.Seller || ReceivingData.Seller === '') {
    res.status(400).send({ Status: false, Message: "Seller can not be empty" });
  } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
    res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
  } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
    res.status(400).send({ Status: false, Message: "Buyer Business Details can not be empty" });
  } else if (!ReceivingData.CustomerType || ReceivingData.CustomerType === '') {
    res.status(400).send({ Status: false, Message: "CustomerType can not be empty" });
  } else {
    ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
    ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
    CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller }, {}, {}).exec((error, result) => {
      if (error) {
        ErrorHandling.ErrorLogCreation(req, 'Seller Details List Error', 'InviteManagement.Controller -> SellerAgainstBusinessList', JSON.stringify(error));
        res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: error });
      } else {
        if (result !== null) {
          if (ReceivingData.CustomerType === 'Owner') {
            Promise.all([
              InviteManagement.InviteManagementSchema.find({ Seller: ReceivingData.Seller, BuyerBusiness: ReceivingData.BuyerBusiness,Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            ]).then(Response => {
              var InviteDetails = Response[0];
              if (InviteDetails.length !== 0) {
                var BusinessArr = [];
                InviteDetails.map(Obj => {
                  BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                });
                BusinessAndBranchManagement.BusinessSchema.find({ IfSeller: true, _id: { $in: BusinessArr } },
                  {
                    FirstName: 1,
                    LastName: 1,
                    AvailableCreditLimit: 1,
                    BusinessCreditLimit: 1,
                    BusinessCategory: 1,
                    Industry: 1,
                  }).exec((err, result1) => {
                    if (err) {
                      ErrorHandling.ErrorLogCreation(req, 'Business List Getting Error', 'InviteManagement.Controller -> SellerAgainstBusinessList', JSON.stringify(err));
                      res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business!.", Error: err });
                    } else {
                      res.status(200).send({ Status: true, Message: "Seller Business list", Response: result1 });
                    }
                  });
              } else {
                res.status(200).send({ Status: true, Message: "Seller Business list", Response: [] });
              }
            }).catch(Error => {
              ErrorHandling.ErrorLogCreation(req, 'Invite Details List Error', 'InviteManagement.Controller -> SellerAgainstBusinessList', JSON.stringify(Error));
              res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
            });
          } else if (ReceivingData.CustomerType === 'User') {
            Promise.all([
              InviteManagement.InviteManagementSchema.find({ Seller: ReceivingData.Seller, BuyerBusiness: ReceivingData.BuyerBusiness,Invite_Status: "Accept", ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            ]).then(Response => {
              var InviteDetails = Response[0];
              if (InviteDetails.length !== 0) {
                var BusinessArr = [];
                InviteDetails.map(Obj => {
                  BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                });
                BusinessAndBranchManagement.BusinessSchema.find({ IfSeller: true, _id: { $in: BusinessArr } },
                  {
                    FirstName: 1,
                    LastName: 1,
                    AvailableCreditLimit: 1,
                    BusinessCreditLimit: 1,
                    BusinessCategory: 1,
                    Industry: 1,
                  }).exec((err, result1) => {
                    if (err) {
                      ErrorHandling.ErrorLogCreation(req, 'Business List Getting Error', 'InviteManagement.Controller -> SellerAgainstBusinessList', JSON.stringify(err));
                      res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business!.", Error: err });
                    } else {
                      res.status(200).send({ Status: true, Message: "Seller Business list", Response: result1 });
                    }
                  });
              } else {
                res.status(200).send({ Status: true, Message: "Seller Business list", Response: [] });
              }
            }).catch(Error => {
              ErrorHandling.ErrorLogCreation(req, 'Invite Details List Error', 'InviteManagement.Controller -> SellerAgainstBusinessList', JSON.stringify(Error));
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

// SellerAgainstBranchList
exports.SellerAgainstBranchList = function (req, res) {
  var ReceivingData = req.body;

  if (!ReceivingData.Seller || ReceivingData.Seller === '') {
    res.status(400).send({ Status: false, Message: "Seller can not be empty" });
  } else if (!ReceivingData.Business || ReceivingData.Business === '') {
    res.status(400).send({ Status: false, Message: "Business can not be empty" });
  } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
    res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
  } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
    res.status(400).send({ Status: false, Message: "Buyer Business can not be empty" });
  } else if (!ReceivingData.CustomerType || ReceivingData.CustomerType === '') {
    res.status(400).send({ Status: false, Message: "Customer Type can not be empty" });
  } else if (!ReceivingData.BuyerBranch || ReceivingData.BuyerBranch === '') {
    res.status(400).send({ Status: false, Message: "Buyer Branch can not be empty" });
  } else {
    ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
    ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
    ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
    ReceivingData.BuyerBranch = mongoose.Types.ObjectId(ReceivingData.BuyerBranch);
    CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Seller }, {}, {}).exec((error, result) => {
      if (error) {
        ErrorHandling.ErrorLogCreation(req, 'Seller Details List Error', 'InviteManagement.Controller -> SellerAgainstBranchList', JSON.stringify(error));
        res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: error });
      } else {
        if (result !== null) {
          if (ReceivingData.CustomerType === 'Owner') {
            Promise.all([
              InviteManagement.InviteManagementSchema.find({ Seller: ReceivingData.Seller, Business: ReceivingData.Business, BuyerBusiness: ReceivingData.BuyerBusiness, BuyerBranch: ReceivingData.BuyerBranch, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            ]).then(Response => {
              var InviteDetails = Response[0];
              if (InviteDetails.length !== 0) {
                var BranchArr = [];
                InviteDetails.map(Obj => {
                  BranchArr.push(mongoose.Types.ObjectId(Obj.Branch));
                });
                BusinessAndBranchManagement.BranchSchema.find({ Customer: ReceivingData.Seller, Business: ReceivingData.Business, _id: { $in: BranchArr } },
                  {
                    BranchName: 1,
                    BranchCreditLimit: 1,
                    BrachCategory: 1,
                    Mobile: 1,
                    Address: 1,
                    RegistrationId: 1,
                    AvailableCreditLimit: 1,
                    GSTIN: 1
                  }).exec((err, result1) => {
                    if (err) {
                      ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'InviteManagement.Controller -> SellerAgainstBranchList', JSON.stringify(err));
                      res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
                    } else {
                      res.status(200).send({ Status: true, Response: result1, Message: 'Branches List' });
                    }
                  });
              } else {
                res.status(200).send({ Status: true, Message: "Seller Branches list", Response: [] });
              }
            }).catch(Error => {
              ErrorHandling.ErrorLogCreation(req, 'Invite Details List Error', 'InviteManagement.Controller -> SellerAgainstBusinessList', JSON.stringify(Error));
              res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
            });
          } else if (ReceivingData.CustomerType === 'User') {
            Promise.all([
              InviteManagement.InviteManagementSchema.find({ Seller: ReceivingData.Seller, BuyerBusiness: ReceivingData.BuyerBusiness, BuyerBranch: ReceivingData.BuyerBranch, Business: ReceivingData.Business, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            ]).then(Response => {
              var InviteDetails = Response[0];
              if (InviteDetails.length !== 0) {
                var BranchArr = [];
                InviteDetails.map(Obj => {
                  BranchArr.push(mongoose.Types.ObjectId(Obj.Branch));
                });
                BusinessAndBranchManagement.BranchSchema.find({ Customer: ReceivingData.Seller, Business: ReceivingData.Business, _id: { $in: BranchArr } },
                  {
                    BranchName: 1,
                    BranchCreditLimit: 1,
                    BrachCategory: 1,
                    Mobile: 1,
                    Address: 1,
                    RegistrationId: 1,
                    AvailableCreditLimit: 1,
                    GSTIN: 1
                  }).exec((err, result1) => {
                    if (err) {
                      ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'InviteManagement.Controller -> SellerAgainstBranchList', JSON.stringify(err));
                      res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
                    } else {
                      res.status(200).send({ Status: true, Response: result1, Message: 'Branches List' });
                    }
                  });
              } else {
                res.status(200).send({ Status: true, Message: "Seller Branches list", Response: [] });
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

// BuyerAgainstSellerList
exports.BuyerAgainstSellerList = function (req, res) {
  var ReceivingData = req.body;
  if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
    res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
  } else if (!ReceivingData.Business || ReceivingData.Business === '') {
    res.status(400).send({ Status: false, Message: "Business can not be empty" });
  } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
    res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
  } else {
    ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
    ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);

    Promise.all([
      CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      InvoiceManagement.InvoiceSchema.find({ InvoiceStatus: 'Accept', BuyerBusiness: ReceivingData.Business }, {}, {})
        .populate({ path: 'Seller', select: ['ContactName'] })
    ]).then(Response => {
      var CustomerDetails = Response[0];
      var InvoiceDetails = JSON.parse(JSON.stringify(Response[1]));
      if (CustomerDetails !== null) {
        if (CustomerDetails.CustomerType === 'Owner') {
          ReceivingData.Buyer = mongoose.Types.ObjectId(CustomerDetails._id);
          InviteManagement.InviteManagementSchema.find({ Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.Business,  Invite_Status: 'Accept' }, {}, {})
            .populate({ path: 'Seller', select: ['ContactName', 'Mobile', 'Email'] })
            .exec(function (err, result) {
              if (err) {
                ErrorHandling.ErrorLogCreation(req, 'Seller Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(err));
                res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
              } else {
                var filteredData = [];
                result = JSON.parse(JSON.stringify(result));
                var InviteArr = [];
                if (result.length !== 0) {
                  result.map(Obj => {
                    InviteArr.push(Obj.Seller);
                  });
                  var mFilterData = getUnique(InviteArr, '_id');

                  res.status(200).send({ Status: true, Message: 'Buyer Against Seller List', Response: mFilterData });
                } else {
                  res.status(200).send({ Status: false, Message: "This Buyer Doesn't having any Seller!", Response: [] });
                }
              }
            });
        } else if (CustomerDetails.CustomerType === 'User') {
          // var BranchArr = [ReceivingData.Branch];
          // ReceivingData.Buyer = mongoose.Types.ObjectId(CustomerDetails.Owner);
          // if (CustomerDetails.BusinessAndBranches.length !== 0) {
          //   CustomerDetails.BusinessAndBranches.map(Obj => {
          //     if (Obj.Branches.length !== 0) {
          //       Obj.Branches.map(obj => {
          //         BranchArr.push(mongoose.Types.ObjectId(obj));
          //       });
          //     }
          //   });
          // }
          InviteManagement.InviteManagementSchema.find({ Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.Business,  Invite_Status: 'Accept' }, {}, {})
            .populate({ path: 'Seller', select: ['ContactName', 'Mobile', 'Email'] })
            .exec(function (err, result) {
              if (err) {
                ErrorHandling.ErrorLogCreation(req, 'Buyer Linking Buyer Details List Error', 'Invite.Controller -> SellerAgainstBuyerList', JSON.stringify(err));
                res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
              } else {
                result = JSON.parse(JSON.stringify(result));
                var InviteArr = [];
                if (result.length !== 0) {
                  result.map(Obj => {
                    InviteArr.push(Obj.Seller);
                  });
                }

                if (InvoiceDetails.length !== 0) {
                  InvoiceDetails.map(Obj => {
                    InviteArr.push(mongoose.Types.ObjectId(Obj.Seller._id));
                  });
                }
                InviteArr = JSON.parse(JSON.stringify(InviteArr));
                InviteArr = InviteArr.filter((obj, index) => InviteArr.indexOf(obj) === index);
                CustomersManagement.CustomerSchema.find({ _id: { $in: InviteArr }, ActiveStatus: true, IfDeleted: false }, { ContactName: 1 }, {}).exec((ErrorRes, ResponseRes) => {
                  res.status(200).send({ Status: true, Message: 'Your Seller List', Response: ResponseRes });
                });

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

function getUnique(arr, comp) {

  // store the comparison  values in array
  const unique = arr.map(e => e[comp])

    // store the indexes of the unique objects
    .map((e, i, final) => final.indexOf(e) === i && i)

    // eliminate the false indexes & return unique objects
    .filter((e) => arr[e]).map(e => arr[e]);

  return unique;
}

// BuyerAgainstBusinessList  

/*
NOTE : Refer the BuyerAgainstBranchList API same as like
*/

exports.BuyerAgainstBusinessList = function (req, res) {
  var ReceivingData = req.body;
  if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
    res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
  }  else if (!ReceivingData.Business || ReceivingData.Business === '') {
    res.status(400).send({ Status: false, Message: "Business Details can not be empty" });
  } else {
    ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
    ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
    CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Buyer }, {}, {}).exec((error, result) => {
      if (error) {
        ErrorHandling.ErrorLogCreation(req, 'Buyer Details List Error', 'InviteManagement.Controller -> BuyerAgainstBusinessList', JSON.stringify(error));
        res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: error });
      } else {
        if (result !== null) {
            Promise.all([
              InviteManagement.InviteManagementSchema.find({ Buyer: ReceivingData.Buyer, Business: ReceivingData.Business, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
              TemporaryManagement.CreditSchema.find({ Buyer: ReceivingData.Buyer,Business: ReceivingData.Business,Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
              InvoiceManagement.InvoiceSchema.find({Buyer: ReceivingData.Buyer,Business: ReceivingData.Business,
                IfUsedTemporaryCredit:false, InvoiceStatus:'Pending', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                InvoiceManagement.InvoiceSchema.find({Buyer: ReceivingData.Buyer,Business: ReceivingData.Business,
                  IfUsedTemporaryCredit:true, InvoiceStatus:'Pending', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            ]).then(Response => {
              var InviteDetails = JSON.parse(JSON.stringify(Response[0]));
              var TemporaryDetails = JSON.parse(JSON.stringify(Response[1]));
              var InvoiceDetails = JSON.parse(JSON.stringify(Response[2]));
              var TempInvoiceDetails = JSON.parse(JSON.stringify(Response[3]));
              var CheckInvoiceAmounts = 0;
              var CheckTempInvoiceAmounts = 0;
              var IfUsedTemporaryCredit = false;

              if (InviteDetails != null && InvoiceDetails != null) {
                  var InviteAvailableAmount = 0;
                  var InvoiceTotalAmount = 0;
                  InviteDetails.map(obj=>{
                    InviteAvailableAmount = obj.AvailableLimit;
                  });
                  InvoiceDetails.map(obbj=>{
                    InvoiceTotalAmount += obbj.InvoiceAmount;
                    IfUsedTemporaryCredit = obbj.IfUsedTemporaryCredit
                  });
                 
                  if (InviteAvailableAmount >= InvoiceTotalAmount) {
                    CheckInvoiceAmounts = InviteAvailableAmount -InvoiceTotalAmount;
                  } else if (InviteAvailableAmount <= InvoiceTotalAmount) {
                    CheckInvoiceAmounts = InvoiceTotalAmount - InviteAvailableAmount; 
                  }
             
              } 
                //Open Temp Amount Calculation
                    if (InviteDetails != null && TempInvoiceDetails !== null) {
                      var TempInvoiceTotalAmount = 0;
                      // var InviteAvailableAmount = 0;

                      // InviteDetails.map(obj=>{
                      //   InviteAvailableAmount = obj.AvailableLimit;
                      // });

                      TempInvoiceDetails.map(temp=>{
                        TempInvoiceTotalAmount += temp.InvoiceAmount;
                      });
                   
                      // if (InviteAvailableAmount >= InvoiceTotalAmount) {
                      //   CheckTempInvoiceAmounts = InviteAvailableAmount -TempInvoiceTotalAmount;
                      // } else if (InviteAvailableAmount <= InvoiceTotalAmount) {
                      //   CheckTempInvoiceAmounts = TempInvoiceTotalAmount - InviteAvailableAmount; 
                      // }
                    }
                      
              if (InviteDetails.length !== 0 ) {
                var BusinessArr = [];
                InviteDetails.map(Obj => {
                  BusinessArr.push(mongoose.Types.ObjectId(Obj.BuyerBusiness));
                });
                BusinessAndBranchManagement.BusinessSchema.find({ Customer: ReceivingData.Buyer, _id: { $in: BusinessArr } },
                  {
                    FirstName: 1,
                    LastName: 1,
                    AvailableCreditLimit: 1,
                    BusinessCreditLimit: 1,
                    BusinessCategory: 1,
                    Industry: 1,
                  }).exec((err, result1) => {
                    
                    if (err) {
                      ErrorHandling.ErrorLogCreation(req, 'Business List Getting Error', 'InviteManagement.Controller -> BuyerAgainstBusinessList', JSON.stringify(err));
                      res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business!.", Error: err });
                    } else {
                      result1 = JSON.parse(JSON.stringify(result1));
                     
                      if (result1 !== null && IfUsedTemporaryCredit === false) {
                   
                        result1 = result1.map(oBj=>{
                          
                              if (oBj.AvailableCreditLimit > CheckInvoiceAmounts) {
                                oBj.AvailableCreditLimit =  CheckInvoiceAmounts;
                              } else if(CheckInvoiceAmounts < oBj.AvailableCreditLimit){
                                oBj.AvailableCreditLimit = CheckInvoiceAmounts;
                              }
                              
                            if (oBj.AvailableCreditLimit !== 0 || oBj.AvailableCreditLimit === 0) {
                              oBj.isTemprorayCredit = false;
                            }
                           
                            return oBj;
                        })
                      }
                    
                      if (result1.length !== 0) {
                        result1 = result1.map(Obj => {
                            
                          Obj.CurrentCreditAmount = 0;
                          Obj.TemporaryCreditAmount = 0;
                          Obj.ExtraUnitizedCreditLimit = 0;
                          Obj.CreditBalanceExists = false;
                            
                         if (Obj.AvailableCreditLimit <= 0) {
                          const result1Arr = TemporaryDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                          
                          if (result1Arr.length > 0) {
                              var ValidityDate = new Date();
                              var TodayDate = new Date();
                              TodayDate = new Date(TodayDate.setHours(0, 0, 0, 0));
                              var TemporaryCredit = 0;
                              
                              result1Arr.map(obj => {
                                  
                                  ValidityDate = new Date(obj.updatedAt);
                                  ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + obj.ApprovedPeriod));
                                  ValidityDate = new Date(ValidityDate.setHours(0, 0, 0, 0));
                                  if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                                    
                                      Obj.TemporaryCreditAmount = Math.round(TemporaryCredit + obj.AvailableLimit);
                                      Obj.AvailableCreditLimit = Math.round(Obj.AvailableCreditLimit + obj.AvailableLimit);
                                      if (obj.AvailableLimit === 0) {
                                        Obj.isTemprorayCredit = false;
                                      } else if (obj.AvailableLimit !== 0) {
                                        Obj.isTemprorayCredit = true;
                                      }
                                      return Obj;
                                  } else if (ValidityDate.valueOf() <= TodayDate.valueOf()) {
                                      Obj.TemporaryCreditAmount = 0; // Reset AvailableCreditLimit to 0
                                      Obj.isTemprorayCredit = false; // Ensure isTemporaryCredit is false
                                      return Obj;
                                  }
                              });

                              result1Arr.map(obj => {
                                ValidityDate = new Date(obj.updatedAt);
                                ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + obj.ApprovedPeriod));
                                ValidityDate = new Date(ValidityDate.setHours(0, 0, 0, 0));
                                var TempCalculations = 0 ;
                                if (ValidityDate.valueOf() >= TodayDate.valueOf() && TempInvoiceTotalAmount > 0) {
                                  if (TempInvoiceTotalAmount >= obj.AvailableLimit) {
                                    TempCalculations =TempInvoiceTotalAmount - obj.AvailableLimit;
                                  } else if (TempInvoiceTotalAmount <= obj.AvailableLimit) {
                                    TempCalculations = obj.AvailableLimit -TempInvoiceTotalAmount;
                                  }
                                  Obj.TemporaryCreditAmount = TempCalculations;
                                  Obj.AvailableCreditLimit = TempCalculations;
                                  Obj.isTemprorayCredit = false;
                                  return Obj;
                                }
                            });
                          }
                        }
                          
                          //Credit Limit Scores (BusinessCreditLimit,AvailableCreditLimit)

                          const result2Arr = InviteDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id);
                          if (result2Arr.length > 0) {
                        
                            result2Arr.map(obj => {
                               Obj.BusinessCreditLimit = Obj.BusinessCreditLimit; 
                               Obj.CurrentCreditAmount = obj.BuyerCreditLimit;
                               Obj.AvailableCreditLimit =Obj.AvailableCreditLimit;
                            });
                          }

                          Obj.AvailableCreditLimit = Obj.AvailableCreditLimit.toFixed(2);
                          Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                          return Obj;
                        });
                      res.status(200).send({ Status: true, Message: "Buyer Business list", Response: result1 });

                      }
                      // res.status(200).send({ Status: true, Message: "Buyer Business list", Response: result1 });
                    }
                  });
              } else {
                res.status(200).send({ Status: true, Message: "Buyer Business list", Response: [] });
              }
            }).catch(Error => {
              ErrorHandling.ErrorLogCreation(req, 'Invite Details List Error', 'InviteManagement.Controller -> BuyerAgainstBusinessList', JSON.stringify(Error));
              res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
            });
          
          

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
  }  else if (!ReceivingData.Business || ReceivingData.Business === '') {
    res.status(400).send({ Status: false, Message: "Business Details can not be empty" });
  } else if (!ReceivingData.Branch || ReceivingData.Branch === '') {
    res.status(400).send({ Status: false, Message: "Branch Details can not be empty" });
  }  else {
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
         // if (ReceivingData.CustomerType === 'Owner') {
            Promise.all([
              InviteManagement.InviteManagementSchema.find({ Buyer: ReceivingData.Buyer, Business: ReceivingData.Business, Branch: ReceivingData.Branch, BuyerBusiness: ReceivingData.BuyerBusiness, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
              TemporaryManagement.CreditSchema.find({ Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness,Business: ReceivingData.Business, Branch: ReceivingData.Branch, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            //  InvoiceManagement.InvoiceSchema.find({ Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
            ]).then(Response => {
              var InviteDetails = JSON.parse(JSON.stringify(Response[0]));
              var TemporaryDetails = JSON.parse(JSON.stringify(Response[1]));
             // var InvoiceDetails = JSON.parse(JSON.stringify(Response[2]));
              if (InviteDetails.length !== 0 ) {
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
                          //  ReceivingData.BuyerBusiness ReceivingData.Business  ReceivingData.Branch 
                          const result1Arr = TemporaryDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
                          
                          if (result1Arr.length > 0) {
                            var ValidityDate = new Date();
                            var TodayDate = new Date();
                            TodayDate = new Date(TodayDate.setHours(0, 0, 0, 0));
                            var TemporaryCredit = 0;
                            result1Arr.map(obj => {
                              ValidityDate = new Date(obj.updatedAt);
                              ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + obj.ApprovedPeriod));
                              ValidityDate = new Date(ValidityDate.setHours(0, 0, 0, 0));
                              if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                                Obj.BranchCreditLimit = Math.round(Obj.BranchCreditLimit + obj.AvailableLimit);
                                Obj.TemporaryCreditAmount = Math.round(TemporaryCredit + obj.AvailableLimit);
                                Obj.AvailableCreditLimit = Math.round(Obj.AvailableCreditLimit + obj.AvailableLimit);

                              }
                            });
                          }
                          const result2Arr = InviteDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
                          if (result2Arr.length > 0) {
                            var InviteCredit = 0;
                            result2Arr.map(obj => {
                              Obj.BranchCreditLimit =  obj.BuyerCreditLimit; //Math.round(Obj.BranchCreditLimit ) +
                              Obj.CurrentCreditAmount = Math.round(InviteCredit + obj.AvailableLimit) + Math.round(Obj.TemporaryCreditAmount);
                              Obj.AvailableCreditLimit = Math.round(obj.AvailableLimit);//Math.round(Obj.AvailableCreditLimit + obj.AvailableLimit);

                            });
                          }

                          // const result3Arr = InvoiceDetails.filter(obj1 => obj1.Customer === Obj.Buyer && obj1.BuyerBranch === Obj._id);
                          // var InvoiceAmount = 0;
                          // if (result3Arr.length > 0) {
                          //   result3Arr.map(obj => {
                          //     InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.AvailableAmount);
                          //   });
                          // }
                          // if (InvoiceAmount > 0) {
                          //   Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) - parseFloat(InvoiceAmount);
                          //   if (Obj.AvailableCreditLimit > 0) {
                          //     Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                          //   } else {
                          //     Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                          //     Obj.ExtraUnitizedCreditLimit = Obj.ExtraUnitizedCreditLimit.toFixed(2);
                          //     Obj.ExtraUnitizedCreditLimit = parseFloat(Obj.ExtraUnitizedCreditLimit);
                          //     Obj.CreditBalanceExists = true;
                          //     Obj.AvailableCreditLimit = 0;
                          //   }
                          // }
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
          // } else if (ReceivingData.CustomerType === 'User') {
          //   Promise.all([
          //     InviteManagement.InviteManagementSchema.find({ Buyer: ReceivingData.Buyer, Business: ReceivingData.Business, Branch: ReceivingData.Branch, BuyerBusiness: ReceivingData.BuyerBusiness, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
          //     TemporaryManagement.CreditSchema.find({ Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
          //     InvoiceManagement.InvoiceSchema.find({ Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
          //   ]).then(Response => {
          //     var InviteDetails = JSON.parse(JSON.stringify(Response[0]));
          //     var TemporaryDetails = JSON.parse(JSON.stringify(Response[1]));
          //     var InvoiceDetails = JSON.parse(JSON.stringify(Response[2]));
          //     if (InviteDetails.length !== 0 && (TemporaryDetails.length === 0 || TemporaryDetails.length !== 0)) {
          //       var BranchArr = [];
          //       InviteDetails.map(Obj => {
          //         BranchArr.push(mongoose.Types.ObjectId(Obj.BuyerBranch));
          //       });
          //       BusinessAndBranchManagement.BranchSchema.find({ Customer: ReceivingData.Buyer, Business: ReceivingData.BuyerBusiness, _id: { $in: BranchArr } },
          //         {
          //           BranchName: 1,
          //           BranchCreditLimit: 1,
          //           BrachCategory: 1,
          //           Mobile: 1,
          //           Address: 1,
          //           RegistrationId: 1,
          //           AvailableCreditLimit: 1,
          //           GSTIN: 1,
          //           Customer: 1
          //         }).exec((err, result1) => {
          //           if (err) {
          //             ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'InviteManagement.Controller -> BuyerAgainstBranchList', JSON.stringify(err));
          //             res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
          //           } else {
          //             result1 = JSON.parse(JSON.stringify(result1));
                     
          //             if (result1.length !== 0) {
          //               result1 = result1.map(Obj => {
          //                 Obj.CurrentCreditAmount = 0;
          //                 Obj.TemporaryCreditAmount = 0;
          //                 Obj.ExtraUnitizedCreditLimit = 0;
          //                 const result1Arr = TemporaryDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
         
          //                 if (result1Arr.length > 0) {
          //                   var ValidityDate = new Date();
          //                   var TodayDate = new Date();
          //                   TodayDate = new Date(TodayDate.setHours(0, 0, 0, 0));
          //                   result1Arr.map(obj => {
          //                     var TemporaryCredit = 0;
          //                     ValidityDate = new Date(obj.updatedAt);
          //                     ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + obj.ApprovedPeriod));
          //                     ValidityDate = new Date(ValidityDate.setHours(0, 0, 0, 0));
          //                     if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                               
          //                       Obj.BranchCreditLimit = Math.round(Obj.BranchCreditLimit + obj.ApproveLimit);
          //                       Obj.TemporaryCreditAmount = Math.round(TemporaryCredit + obj.ApproveLimit);
          //                       Obj.AvailableCreditLimit = Math.round(Obj.AvailableCreditLimit + obj.ApproveLimit);;
          //                     }
          //                   });
          //                 }
          //                 const result2Arr = InviteDetails.filter(obj1 => obj1.BuyerBranch === Obj._id);
          //                 if (result2Arr.length > 0) {
          //                   var InviteCredit = 0;
          //                   result2Arr.map(obj => {
          //                     Obj.BranchCreditLimit = Math.round(Obj.BranchCreditLimit + obj.AvailableLimit);
          //                     Obj.CurrentCreditAmount = Math.round(InviteCredit + obj.AvailableLimit);
          //                     Obj.AvailableCreditLimit = Math.round(Obj.AvailableCreditLimit + obj.AvailableLimit);
          //                   });
          //                 }

          //                 const result3Arr = InvoiceDetails.filter(obj1 => obj1.Customer === Obj.Buyer && obj1.BuyerBranch === Obj._id);

          //                 if (result3Arr.length > 0) {
          //                   var UsedCurrentCreditAmount = 0;
          //                   var UsedForTemporaryAmount = 0;
          //                   result3Arr.map(obj => {
          //                     UsedCurrentCreditAmount = Math.round(UsedCurrentCreditAmount + obj.UsedCurrentCreditAmount);
          //                     UsedForTemporaryAmount = Math.round(UsedForTemporaryAmount + obj.UsedTemporaryCreditAmount);
          //                   });

          //                   var UnitizedCurrentCreditAmount = Math.round(Obj.CurrentCreditAmount - UsedCurrentCreditAmount);
          //                   if (UnitizedCurrentCreditAmount > 0) {
          //                     Obj.CurrentCreditAmount = UnitizedCurrentCreditAmount
          //                   } else {
          //                     Obj.CurrentCreditAmount = 0;
          //                   }

          //                   var UnitizedTemporaryCreditAmount = Math.round(Obj.TemporaryCreditAmount - UsedForTemporaryAmount);
          //                   if (UnitizedTemporaryCreditAmount > 0) {
          //                     Obj.TemporaryCreditAmount = UnitizedTemporaryCreditAmount;
          //                   } else {
          //                     Obj.TemporaryCreditAmount = 0;
          //                   }
          //                 }
          //                 return Obj;
          //               });
          //             }

          //             res.status(200).send({ Status: true, Response: result1, Message: 'Branches List' });
          //           }
          //         });
          //     } else {
          //       res.status(200).send({ Status: true, Message: "Buyer Branches list", Response: [] });
          //     }
          //   }).catch(Error => {
          //     ErrorHandling.ErrorLogCreation(req, 'Invite Details List Error', 'InviteManagement.Controller -> BuyerAgainstBusinessList', JSON.stringify(Error));
          //     res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
          //   });
          // }

        } else {
          res.status(417).send({ Status: false, Message: "Invalid Customer Details." });
        }
      }
    });
  }
};

// Buyer Against Seller Simple List
exports.BuyerAgainstSellerSimpleList = function (req, res) {
  var ReceivingData = req.body;
  if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
    res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
  } else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
    res.status(400).send({ Status: false, Message: "Buyer Business can not be empty" });
  } else if (!ReceivingData.BuyerBranch || ReceivingData.BuyerBranch === '') {
    res.status(400).send({ Status: false, Message: "Buyer Branch can not be empty" });
  } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
    res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
  } else {
    ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
    ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
    ReceivingData.BuyerBranch = mongoose.Types.ObjectId(ReceivingData.BuyerBranch);
    Promise.all([
      InviteManagement.InviteManagementSchema.find({ Buyer: ReceivingData.Buyer, BuyerBusiness: ReceivingData.BuyerBusiness, BuyerBranch: ReceivingData.BuyerBranch, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {})
        .populate({ path: "Seller", select: ["ContactName"] }).exec(),
    ]).then(Response => {
      var SellerDetails = JSON.parse(JSON.stringify(Response[0]));
      if (SellerDetails.length !== 0) {
        var SellerArr = [];
        SellerDetails.map(Obj => {
          SellerArr.push(Obj.Seller);
        });
        res.status(200).send({ Status: true, Message: 'Your Seller List', Response: SellerArr });
      } else {
        res.status(200).send({ Status: true, Message: "Buyer Against Seller Simple list", Response: [] });
      }
    }).catch(Error => {
      ErrorHandling.ErrorLogCreation(req, 'Invite Details List Error', 'InviteManagement.Controller -> BuyerAgainstSellerSimpleList', JSON.stringify(Error));
      res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: Error });
    });
  }
};

// Seller Against Business Simple List
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

//Seller And Business Against Branch Simple List
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


// Seller Increase the credit limit 
exports.SellerIncreaseCreditLimit = function (req, res) {
	var ReceivingData = req.body;
	if (!ReceivingData.Seller || ReceivingData.Seller === '') {
		res.status(400).send({ Status: false, Message: "Seller Details can not be empty" });
	} else if (!ReceivingData.Business || ReceivingData.Business === '') {
		res.status(400).send({ Status: false, Message: "Business Details can not be empty" });
	} else if (!ReceivingData.Buyer || ReceivingData.Buyer === '') {
		res.status(400).send({ Status: false, Message: "Buyer can not be empty" });
	} else if (!ReceivingData.BuyerBusiness || ReceivingData.BuyerBusiness === '') {
		res.status(400).send({ Status: false, Message: "Buyer Business can not be empty" });
	} else if (!ReceivingData.BuyerCreditLimit || ReceivingData.BuyerCreditLimit === '') {
		res.status(400).send({ Status: false, Message: "Credit Amount can not be empty" });
	} else {

		ReceivingData.Seller = mongoose.Types.ObjectId(ReceivingData.Seller);
		ReceivingData.Business = mongoose.Types.ObjectId(ReceivingData.Business);
		ReceivingData.Buyer = mongoose.Types.ObjectId(ReceivingData.Buyer);
		ReceivingData.BuyerBusiness = mongoose.Types.ObjectId(ReceivingData.BuyerBusiness);
		const newRequestLimit =  parseFloat(ReceivingData.BuyerCreditLimit.toString());

    var mInvoiceAmount = 0;
    var mBusinessCreditLimit = 0;
    var mAvailableCreditLimit = 0;
    var InvoiceDetails = [];
    var BusinessDetails = [];
    
    var InvoiceQuery = {};
    if(ReceivingData.InvoiceId === ''){
      InvoiceQuery = {BuyerBusiness: ReceivingData.BuyerBusiness, ActiveStatus: true, IfDeleted: false};
    } else{
      InvoiceQuery = {BuyerBusiness: ReceivingData.BuyerBusiness, ActiveStatus: true, IfDeleted: false,_id: { $ne: ReceivingData.InvoiceId }};
    }
    

    Promise.all([
      InvoiceManagement.InvoiceSchema.find(InvoiceQuery, {}, {}).exec(),
      BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.Business, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      BusinessAndBranchManagement.BusinessSchema.findOne({ _id: ReceivingData.BuyerBusiness, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
    ]).then(Response =>
      {
        InvoiceDetails = JSON.parse(JSON.stringify(Response[0]));
        BusinessDetails = JSON.parse(JSON.stringify(Response[1]));
        Buyerbusiness = JSON.parse(JSON.stringify(Response[2]));
   

      if (InvoiceDetails.length !== 0) {
        InvoiceDetails.map(Obj => {
          mInvoiceAmount = mInvoiceAmount + Obj.UsedCurrentCreditAmount;
        });
      } 
      BusinessAndBranchManagement.BusinessSchema
      .findOne({ _id: ReceivingData.Business, ActiveStatus: true, IfDeleted: false }, {}, {})
      .exec((err, result) => {
        if (err) {
          ErrorHandling.ErrorLogCreation(req, 'Branch Details getting Error', 'InvoiceManagement.Controller -> Some occurred Error', JSON.stringify(err));
          res.status(417).send({ Status: false, Message: "Some occurred Error!.", Error: err });
        } else {
          if (result !== null) {
           
            if (newRequestLimit >= result.AvailableCreditLimit) 
            {
              res.status(200).send({ Status: false, Message: 'Additional Credit Limit should be within the Seller Business Available Credit Limit' });
            } else {

              InviteManagement.InviteManagementSchema.findOne({
                Buyer: ReceivingData.Buyer,
                BuyerBusiness: ReceivingData.BuyerBusiness,
                Seller: ReceivingData.Seller,
                Business: ReceivingData.Business,
                Invite_Status: 'Accept',
                ActiveStatus: true,
                IfDeleted: false
              }, {}, {})
              .exec((err1, result1) => {
                if (err1) {
                  ErrorHandling.ErrorLogCreation(req, 'Invite Details Getting Error', 'InviteManagement.Controller -> SellerIncreaseCreditLimit', JSON.stringify(err1));
                  res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the invite Details!.", Error: JSON.stringify(err1) });
                } else {
                  if (result1 !== null) {
                    if(ReceivingData.InvoiceId === '') { 
                      result1.AvailableLimit = Math.abs((Number(newRequestLimit) + result1.AvailableLimit));
                    
                    } else {
                      var GetAvailableCreditLimit = Number(result1.AvailableLimit);
                      var buyerCreditLimit = Number(result1.BuyerCreditLimit);
                      
                      
                      // Perform the calculation and ensure it's not negative
                      result1.AvailableLimit = Math.abs((Number(newRequestLimit) - buyerCreditLimit) + GetAvailableCreditLimit);
                    }
                  
                    result1.BuyerCreditLimit = result1.BuyerCreditLimit + newRequestLimit;
                 
                    result1.save((errNew, resultNew) => {

                      if (errNew) {
                        ErrorHandling.ErrorLogCreation(req, 'Credit limit increase Getting Error', 'InviteManagement.Controller -> SellerIncreaseCreditLimit', JSON.stringify(errNew));
                        res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to update the Credit limit!.", Error: JSON.stringify(errNew) });
                      } else {

                        if (Buyerbusiness !== null) {

                          //Buyer Business Details
                          Buyerbusiness.BusinessCreditLimit =  Buyerbusiness.BusinessCreditLimit + newRequestLimit;
                          mBusinessCreditLimit = Buyerbusiness.BusinessCreditLimit; 
                          
                          Buyerbusiness.AvailableCreditLimit = Buyerbusiness.AvailableCreditLimit + newRequestLimit;
                          mAvailableCreditLimit = Buyerbusiness.AvailableCreditLimit;

                          //Business Details
                          result.AvailableCreditLimit = result.AvailableCreditLimit - newRequestLimit;
                          
                          //Update Query
                          BusinessAndBranchManagement.BusinessSchema.updateOne(
                            { _id: ReceivingData.BuyerBusiness },
                            { 
                              $set: {
          
                                BusinessCreditLimit: mBusinessCreditLimit,
                                AvailableCreditLimit: mAvailableCreditLimit
                              }
                            }
                          ).exec();
                          
                        }



                        result.save((err2, result2) => {
                          if (err2) {
                            ErrorHandling.ErrorLogCreation(req, 'Business Available Limit Reduce Error', 'InviteManagement.Controller -> SellerIncreaseCreditLimit', JSON.stringify(err2));
                            res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to reduce the Business Available Credit limit!.", Error: JSON.stringify(err2) });
                          } else {
                            res.status(200).send({ Status: true, Message: 'Credit Limit Successfully increased', Response: resultNew });
                          }
                        });
                      }
                    });
                  } else {
                    res.status(417).send({ Status: false, Message: "Invalid Seller/Buyer details!." });
                  }
                }
              });
            }
          } else {
            res.status(400).send({ Status: false, Message: 'Invalid Business Details' });
          }
        }
      });

    }).catch(Error => {
      ErrorHandling.ErrorLogCreation(req, 'Invoice Error', 'InvoiceManagement.Controller -> Some occurred Error', JSON.stringify(Error));
      res.status(417).send({ Status: false, Message: "Some occurred Error!.", Error: Error });
   });


	
	}
};

// SellerBusiness_List
exports.SellerBusiness_List = function (req, res) {
  // console.log("req",req.body);
  // return res.send(req.body);
  var ReceivingData = req.body;
  if (!ReceivingData.Customer || ReceivingData.Customer === '') {
     res.status(400).send({ Status: false, Message: "Customer can not be empty" });
  } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
     res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
  } else {
     ReceivingData.Customer = mongoose.Types.ObjectId(ReceivingData.Customer);
     Promise.all([
        CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.Customer}, {}, {}).exec(),
     ]).then(Response => {
        var CustomerDetails = Response[0];
        // console.log(CustomerDetails,'CustomerDetails');
        var BusinessArr = [];
        var BranchArr = [];
        if (CustomerDetails !== null) {
           var InvoiceQuery = {};
           var FindQuery = {};
           var BranchFindQuery = {};
           var BusinessFindQuery = {};
           var TemporaryQuery = {};
           var InviteQuery = {};
           var InvoicePendingListQuery = {};
           if (ReceivingData.CustomerCategory === 'Seller') {
              if (CustomerDetails.CustomerType === 'Owner') {
                 InvoiceQuery = { Seller: ReceivingData.Customer, PaidORUnpaid: "Unpaid",InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
                 FindQuery = { Customer: ReceivingData.Customer, IfSeller: true, IfBuyer: false, ActiveStatus: true, IfDeleted: false };
                 InviteQuery = { Seller: ReceivingData.Customer, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                 TemporaryQuery = { Seller: ReceivingData.Customer, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
              } else if (CustomerDetails.CustomerType === 'User') {
                 if (CustomerDetails.BusinessAndBranches.length > 0) {
                    CustomerDetails.BusinessAndBranches.map(Obj => {
                       BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                    });
                    // CustomerDetails.BusinessAndBranches.map(Obj => {
                    //    // console.log(Obj,'Obj');
                    //    if (Obj.Branches.length > 0) {
                    //       Obj.Branches.map(obj => {
                    //          BranchArr.push(mongoose.Types.ObjectId(obj));
                    //       });
                    //    }
                    // });
                 }

                 // FindQuery = { _id: { $in: BusinessArr }, IfSeller: true, IfBuyer: false, ActiveStatus: true, IfDeleted: false };
                 // InvoiceQuery = { Branch: { $in: BranchArr }, PaidORUnpaid: "Unpaid",InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
                 // TemporaryQuery = { Branch: { $in: BranchArr }, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                 // InviteQuery = { Branch: { $in: BranchArr }, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                 // BranchFindQuery = { _id: { $in: BranchArr },  ActiveStatus: true, IfDeleted: false };

                 FindQuery = { _id: { $in: BusinessArr }, IfSeller: true, IfBuyer: false, ActiveStatus: true, IfDeleted: false };
                 InvoiceQuery = { Business: { $in: BusinessArr }, PaidORUnpaid: "Unpaid",InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
                 TemporaryQuery = { Business: { $in: BusinessArr }, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                 InviteQuery = { Business: { $in: BusinessArr }, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                 BusinessFindQuery = { _id: { $in: BusinessArr },  ActiveStatus: true, IfDeleted: false };

              }

           } else if (ReceivingData.CustomerCategory === 'Buyer') {
              if (CustomerDetails.CustomerType === 'Owner') {
                 InvoiceQuery = { Buyer: ReceivingData.Customer, PaidORUnpaid: "Unpaid",InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
                 InvoicePendingListQuery =  { Buyer: ReceivingData.Customer,  InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
                 FindQuery = { Customer: ReceivingData.Customer, IfSeller: false, IfBuyer: true, ActiveStatus: true, IfDeleted: false };
                 TemporaryQuery = { Buyer: ReceivingData.Customer, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                 InviteQuery = { Buyer: ReceivingData.Customer, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
              } else if (CustomerDetails.CustomerType === 'User') {
                 if (CustomerDetails.BusinessAndBranches.length > 0) {
                    CustomerDetails.BusinessAndBranches.map(Obj => {
                       BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                    });
                 }

                 // CustomerDetails.BusinessAndBranches.map(Obj => {
                 //    if (Obj.Branches.length > 0) {
                 //       Obj.Branches.map(obj => {
                 //          BranchArr.push(mongoose.Types.ObjectId(obj));
                 //       });
                 //    }
                 // });

                 // InvoiceQuery = { BuyerBranch: { $in: BranchArr },PaidORUnpaid: "Unpaid", InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
                 // InvoicePendingListQuery = { BuyerBusiness: { $in: BusinessArr }, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
                 // FindQuery = { _id: { $in: BusinessArr }, IfSeller: false, IfBuyer: true, ActiveStatus: true, IfDeleted: false };
                 // TemporaryQuery = { BuyerBusiness: { $in: BusinessArr }, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                 // InviteQuery = { BuyerBusiness: { $in: BusinessArr }, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                 // BranchFindQuery = { _id: { $in: BranchArr },  ActiveStatus: true, IfDeleted: false };


                 InvoiceQuery = { BuyerBusiness: { $in: BusinessArr },PaidORUnpaid: "Unpaid", InvoiceStatus: "Accept", ActiveStatus: true, IfDeleted: false };
                 InvoicePendingListQuery = { BuyerBusiness: { $in: BusinessArr }, InvoiceStatus: "Pending", ActiveStatus: true, IfDeleted: false };
                 FindQuery = { _id: { $in: BusinessArr }, IfSeller: false, IfBuyer: true, ActiveStatus: true, IfDeleted: false };
                 TemporaryQuery = { BuyerBusiness: { $in: BusinessArr }, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                 InviteQuery = { BuyerBusiness: { $in: BusinessArr }, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false };
                 BusinessFindQuery = { _id: { $in: BusinessArr },  ActiveStatus: true, IfDeleted: false };
              }
           }

           Promise.all([
              BusinessAndBranchManagement.BusinessSchema.find(FindQuery, {}, {}).populate({path: 'Industry', select: 'Industry_Name'}).exec(),
              InvoiceManagement.InvoiceSchema.find(InvoiceQuery, {}, {}).exec(),
              TemporaryManagement.CreditSchema.find(TemporaryQuery, {}, {}).exec(),
              InviteManagement.InviteManagementSchema.find(InviteQuery, {}, {}).exec(),
              BusinessAndBranchManagement.BusinessSchema.find(BusinessFindQuery, {}, {}).exec(),
              InvoiceManagement.InvoiceSchema.find(InvoicePendingListQuery, {}, {}).exec(),
           ]).then(ResponseRes => {
              var BusinessDetails = JSON.parse(JSON.stringify(ResponseRes[0]));
              var InvoiceDetails = JSON.parse(JSON.stringify(ResponseRes[1]));
              var TemporaryDetails = JSON.parse(JSON.stringify(ResponseRes[2]));
              var InviteDetails = JSON.parse(JSON.stringify(ResponseRes[3]));
              var BusinessDetailLists = JSON.parse(JSON.stringify(ResponseRes[4]));
              var InvoicePendingList = JSON.parse(JSON.stringify(ResponseRes[5]));

              // console.log(BusinessDetails,'BusinessDetailsBusinessDetailsBusinessDetails');
              // console.log(InvoiceDetails,'InvoiceDetailsInvoiceDetailsInvoiceDetails');
              // console.log(TemporaryDetails,'TemporaryDetailsTemporaryDetailsTemporaryDetails');
              // console.log(InviteDetails,'InviteDetailsInviteDetailsInviteDetails');
              // console.log(BusinessDetailLists,'BranchDetailsBranchDetailsBranchDetails');
              // console.log(InvoicePendingList,'InvoicePendingListInvoicePendingListInvoicePendingList');

         // if (CustomerDetails.CustomerCategory === 'Seller' && CustomerDetails.CustomerType === 'User') {
         // 	BusinessDetails = BusinessDetails.map(business => {
         // 		const BranchesArr = BranchDetails.filter(branch => branch.Business === business._id);
         // 		var BusinessCreditLimit = 0;
         // 		var AvailableCreditLimit = 0;
         // 		BranchesArr.map(Obj => {
         // 			BusinessCreditLimit = BusinessCreditLimit + Obj.BranchCreditLimit;
         // 			AvailableCreditLimit = AvailableCreditLimit + Obj.AvailableCreditLimit;
         // 		});
         // 		business.BusinessCreditLimit = BusinessCreditLimit;
         // 		business.AvailableCreditLimit = AvailableCreditLimit;
         // 		return business;
         // 	});
         // }

           

              // Seller Business Available Credit balance check
              if (BusinessDetails.length > 0) {
                 BusinessDetails.map(Obj => {
                    var TodayDate = new Date();
                    TodayDate = new Date(TodayDate.setHours(0, 0, 0, 0));
                    Obj.OverDueAmount = 0;
                    Obj.AvailableTemporaryCreditLimit = 0;
                    Obj.TotalTemporaryCreditLimit = 0;
                    Obj.DueTodayAmount = 0;
                    Obj.UpComingAmount = 0;

                    const result1Arr = TemporaryDetails.filter(obj1 => (obj1.BuyerBusiness === Obj._id && Obj.IfBuyer) ||
                       (obj1.Business === Obj._id && Obj.IfSeller));
                    if (result1Arr.length > 0) {
                       var ValidityDate = new Date();
                       result1Arr.map(obj => {
                          ValidityDate = new Date(obj.updatedAt);
                          ValidityDate = new Date(ValidityDate.setDate(ValidityDate.getDate() + obj.ApprovedPeriod));
                          ValidityDate = new Date(ValidityDate.setHours(0, 0, 0, 0));
                          if (ValidityDate.valueOf() >= TodayDate.valueOf()) {
                             Obj.TotalTemporaryCreditLimit = parseFloat(Obj.TotalTemporaryCreditLimit) + parseFloat(obj.ApproveLimit);
                             Obj.AvailableTemporaryCreditLimit = parseFloat(Obj.AvailableTemporaryCreditLimit) + parseFloat(obj.ApproveLimit);
                          }
                       });
                    }
                    const result2Arr = InviteDetails.filter(obj1 => obj1.BuyerBusiness === Obj._id && Obj.IfBuyer);
                  
                    if (result2Arr.length > 0) {
                       result2Arr.map(obj => {
                          if (CustomerDetails.CustomerCategory === 'Seller') {
                             Obj.BusinessCreditLimit = parseFloat(Obj.BusinessCreditLimit) + parseFloat(obj.AvailableLimit);
                             Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.AvailableLimit);
                          }
                          else if (CustomerDetails.CustomerCategory === 'Buyer') {

                             BusinessDetails.map(ObjBusiness => {
                             
                                if(CustomerDetails.CustomerType === 'User' && ObjBusiness._id === obj.BuyerBranch) {
                                var mInvoiceAmount = 0;
                                InvoicePendingList.map(ObjIn1 => {
                                   if(obj.BuyerBusiness === ObjIn1.BuyerBusiness && obj.Business === ObjIn1.Business) {
                                      if(ObjIn1.InvoiceStatus === 'Pending')
                                      {
                                         mInvoiceAmount = mInvoiceAmount + ObjIn1.UsedCurrentCreditAmount ;  
                                      }
                                   }
                                 });
                                Obj.BusinessCreditLimit = parseFloat(Obj.BusinessCreditLimit) + parseFloat(obj.BuyerCreditLimit);
                                Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.AvailableLimit) + parseFloat(mInvoiceAmount);
                             } else if(CustomerDetails.CustomerType === 'Owner' && ObjBusiness._id === obj.BuyerBusiness) {
                                var mInvoiceAmount = 0;
                                InvoicePendingList.map(ObjIn1 => {
                                   if(obj.BuyerBusiness === ObjIn1.BuyerBusiness && obj.Business === ObjIn1.Business) {
                                      if(ObjIn1.InvoiceStatus === 'Pending')
                                      {
                                         mInvoiceAmount = mInvoiceAmount + ObjIn1.UsedCurrentCreditAmount ;  
                                      }
                                   }
                                 });
                                Obj.BusinessCreditLimit = parseFloat(Obj.BusinessCreditLimit) + parseFloat(obj.BuyerCreditLimit);
                                Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) + parseFloat(obj.AvailableLimit) + parseFloat(mInvoiceAmount);
                             }
                             });
                          }
                       });
                    }
                    const result4Arr = InvoiceDetails.filter(obj1 => (obj1.BuyerBusiness === Obj._id && Obj.IfBuyer && !Obj.IfSeller) ||
                       (obj1.Business === Obj._id && !Obj.IfBuyer && Obj.IfSeller));

                   
                     
                    var OverDueDate = new Date();
                    var DueTodayDate = new Date();
                    if (result4Arr.length > 0) {
                       var InvoiceAmount = 0;
                       var OverDueAmount = 0;
                       var DueTodayAmount = 0;
                       var UpComingAmount = 0;
                       result4Arr.map(obj => {
                         
                          InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.RemainingAmount); //parseFloat(obj.AvailableAmount);
                          OverDueDate = new Date(obj.InvoiceDueDate);
                          DueTodayDate = new Date(obj.InvoiceDueDate);

                        // var mCurrentDate = moment(TodayDate)
                         var mInvoiceDate = moment(obj.InvoiceDueDate)

                          if(mInvoiceDate.valueOf() < TodayDate.valueOf())
                          {
                             OverDueAmount = parseFloat(OverDueAmount) + parseFloat(obj.InvoiceAmount);
                             
                          }
                          else if(mInvoiceDate.valueOf() > TodayDate.valueOf())
                          {
                             UpComingAmount = parseFloat(UpComingAmount) + parseFloat(obj.InvoiceAmount);
                            
                            
                          }
                          else if(mInvoiceDate.valueOf() === TodayDate.valueOf())
                          {
                             DueTodayAmount = parseFloat(DueTodayAmount) + parseFloat(obj.InvoiceAmount);
                            
                          }
                         
                          

                          // const InviteDetailsArr = InviteDetails.filter(obj1 => (obj1.Business === obj.Business && obj1.Seller === obj.Seller) ||
                          //    (obj1.BuyerBusiness === obj.BuyerBusiness && obj1.Buyer === obj.Buyer));
                          // if (InviteDetailsArr.length > 0) {
                          //    InviteDetailsArr.map(objInvite => {
                          //       // OverDueDate = new Date(OverDueDate.setDate(OverDueDate.getDate() + objInvite.BuyerPaymentCycle + 1));
                          //       // DueTodayDate = new Date(DueTodayDate.setDate(DueTodayDate.getDate() + objInvite.BuyerPaymentCycle));

                          //       OverDueDate = new Date(OverDueDate.setDate(OverDueDate.getDate() ));
                          //       DueTodayDate = new Date(DueTodayDate.setDate(DueTodayDate.getDate() ));
                          //    });
                          //    OverDueDate = new Date(OverDueDate.setHours(0, 0, 0, 0));
                          //    if (OverDueAmount.valueOf() < TodayDate.valueOf()) {
                          //       OverDueAmount = parseFloat(OverDueAmount) + parseFloat(obj.InvoiceAmount);
                          //    }
                          //    if (DueTodayDate.toLocaleDateString() === TodayDate.toLocaleDateString()) {
                          //       DueTodayAmount = parseFloat(DueTodayAmount) + parseFloat(obj.InvoiceAmount);
                          //    }
                          // }
                       });
                      
                       // Obj.OverDueAmount = Obj.OverDueAmount.toFixed(2);
                       // Obj.OverDueAmount = parseFloat(Obj.OverDueAmount);
                       // Obj.UpComingAmount = InvoiceAmount.toFixed(2);
                       // Obj.UpComingAmount = parseFloat(Obj.UpComingAmount);
                       // Obj.DueTodayAmount = DueTodayAmount.toFixed(2);
                     //  Obj.DueTodayAmount = parseFloat(Obj.DueTodayAmount);

                       Obj.OverDueAmount = OverDueAmount.toFixed(2);
                       Obj.OverDueAmount = parseFloat(Obj.OverDueAmount);
                       Obj.UpComingAmount = UpComingAmount.toFixed(2);
                       Obj.UpComingAmount = parseFloat(Obj.UpComingAmount);
                       Obj.DueTodayAmount = DueTodayAmount.toFixed(2);
                       Obj.DueTodayAmount = parseFloat(Obj.DueTodayAmount);

                       // if (Obj.OverDueAmount > 0 || Obj.DueTodayAmount > 0) {
                       //    Obj.UpComingAmount = Obj.UpComingAmount - (Obj.DueTodayAmount + Obj.OverDueAmount);
                       //    if (Obj.UpComingAmount > 0) {
                       //       Obj.UpComingAmount = Obj.UpComingAmount.toFixed(2);
                       //       Obj.UpComingAmount = parseFloat(Obj.UpComingAmount);
                       //    } else {
                       //       Obj.UpComingAmount = 0;
                       //    }
                       // }

                       if (InvoiceAmount > 0 && ReceivingData.CustomerCategory === 'Buyer') {
                          Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit) //- parseFloat(InvoiceAmount);
                          if (Obj.AvailableCreditLimit > 0) {
                             Obj.AvailableCreditLimit = parseFloat(Obj.AvailableCreditLimit);
                          } else {
                             if (Obj.AvailableCreditLimit < 0) {
                                Obj.AvailableTemporaryCreditLimit = parseFloat(Obj.AvailableTemporaryCreditLimit) + parseFloat(Obj.AvailableCreditLimit);
                                if (Obj.AvailableTemporaryCreditLimit > 0) {
                                   Obj.AvailableTemporaryCreditLimit = parseFloat(Obj.AvailableTemporaryCreditLimit);
                                } else {
                                   Obj.AvailableTemporaryCreditLimit = 0;
                                }
                             }
                             Obj.AvailableCreditLimit = 0;
                          }
                       }
                    }
                    return Obj;
                 });
              }
              //Sort By Business Name in Alphabetical Order
              BusinessDetails.sort(function (a, b) {
                 // Convert the names to lowercase
                 let nameA = a.FirstName.toLowerCase();
                 let nameB = b.FirstName.toLowerCase();
               
                 // Compare the names
                 if (nameA < nameB) {
                   return -1; // nameA comes first
                 }
                 if (nameA > nameB) {
                   return 1; // nameB comes first
                 }
                 return 0; // names are equal
               });
              res.status(200).send({ Status: true, Message: "My Business List!!!.", Response: BusinessDetails});
           }).catch(ErrorRes => {
              ErrorHandling.ErrorLogCreation(req, 'Business And Invoice, Invite, Temporary List Getting Error', 'BusinessAndBranchManagement.Controller -> MyBusinessList', JSON.stringify(ErrorRes));
              res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business And Invoice, Invite, Temporary!.", Error: ErrorRes });
           });
        } else {
           res.status(400).send({ Status: false, Message: "Invalid Customer Details!." });
        }
     }).catch(Error => {
        ErrorHandling.ErrorLogCreation(req, 'Business And Invoice, Invite, Temporary List Getting Error', 'BusinessAndBranchManagement.Controller -> MyBusinessList', JSON.stringify(Error));
        res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Business And Invoice, Invite, Temporary!.", Error: Error });
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
              Promise.all([
                 InviteManagement.InviteManagementSchema.find({ Buyer: ReceivingData.Customer, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                 TemporaryManagement.CreditSchema.find({ Buyer: ReceivingData.Customer, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                 InvoiceManagement.InvoiceSchema.find({ Buyer: ReceivingData.Customer, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
              ]).then(ResponseRes => {
                 var InviteDetails = JSON.parse(JSON.stringify(ResponseRes[0]));
                 var TemporaryDetails = JSON.parse(JSON.stringify(ResponseRes[1]));
                 var InvoiceDetails = JSON.parse(JSON.stringify(ResponseRes[2]));
                 BusinessAndBranchManagement.BusinessSchema.find({ IfBuyer: true, Customer: ReceivingData.Customer, ActiveStatus: true, IfDeleted: false },
                    {
                       FirstName: 1,
                       LastName: 1,
                       Customer: 1,
                       AvailableCreditLimit: 1,
                       BusinessCreditLimit: 1,
                      //  BusinessCategory: 1,
                       Industry: 1,
                    }).populate({ path: "Industry", select: ["Industry_Name"] }).exec((err, result1) => {
                       if (err) {
                          ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
                          res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
                       } else {
                          result1 = JSON.parse(JSON.stringify(result1));
                          if (result1.length !== 0) {
                             result1.map(Obj => {
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
                          res.status(200).send({ Status: true, Message: "My Business list", Response: result1 });
                       }
                    });
              }).catch(ErrorRes => {
                 ErrorHandling.ErrorLogCreation(req, 'Business List Getting Error', 'BusinessManagement.Controller -> BuyerBusinessList', JSON.stringify(ErrorRes));
                 res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: ErrorRes });
              });
           } else if (CustomerDetails.CustomerType === 'User') {
              if (CustomerDetails.BusinessAndBranches.length !== 0) {
                 CustomerDetails.BusinessAndBranches.map(Obj => {
                    BusinessArr.push(mongoose.Types.ObjectId(Obj.Business));
                 });
              }
              Promise.all([
                 InviteManagement.InviteManagementSchema.find({ BuyerBusiness: { $in: BusinessArr }, Invite_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                 TemporaryManagement.CreditSchema.find({ BuyerBusiness: { $in: BusinessArr }, Request_Status: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
                 InvoiceManagement.InvoiceSchema.find({ BuyerBusiness: { $in: BusinessArr }, PaidORUnpaid: 'Unpaid', InvoiceStatus: 'Accept', ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
              ]).then(ResponseRes => {
                 var InviteDetails = JSON.parse(JSON.stringify(ResponseRes[0]));
                 var TemporaryDetails = JSON.parse(JSON.stringify(ResponseRes[1]));
                 var InvoiceDetails = JSON.parse(JSON.stringify(ResponseRes[2]));
                 BusinessAndBranchManagement.BusinessSchema.find({ IfBuyer: true, _id: { $in: BusinessArr }, ActiveStatus: true, IfDeleted: false },
                    {
                      FirstName:1,
                      LastName:1,
                       Customer: 1,
                       AvailableCreditLimit: 1,
                       BusinessCreditLimit: 1,
                      //  BusinessCategory: 1,
                       Industry: 1,
                    }).populate({ path: "Industry", select: ["Industry_Name"] }).exec((err, result1) => {
                       if (err) {
                          ErrorHandling.ErrorLogCreation(req, 'Branches List Getting Error', 'BusinessManagement.Controller -> BranchesOfBusiness_SimpleList', JSON.stringify(err));
                          res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: err });
                       } else {
                          result1 = JSON.parse(JSON.stringify(result1));
                          if (result1.length !== 0) {
                             result1.map(Obj => {
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
                          res.status(200).send({ Status: true, Message: "My Business list", Response: result1 });
                       }
                    });
              }).catch(ErrorRes => {
                  
                 ErrorHandling.ErrorLogCreation(req, 'Business List Getting Error', 'BusinessManagement.Controller -> BuyerBusinessList', JSON.stringify(ErrorRes));
                 res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to get Branches!.", Error: ErrorRes });
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

// SellerInvite_PendingList
exports.SellerInvite_PendingList = function (req, res) {
  var ReceivingData = req.body;
  if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
  }   else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
    res.status(400).send({ Status: false, Message: "Customern Category can not be empty" });
} else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Promise.all([
          CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),          
      ]).then(Response => {
          var OwnerDetails = Response[0];            
          if (OwnerDetails !== null ) {          
             const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
             const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
             var ShortOrder = { createdAt: -1 };
             var ShortKey = ReceivingData.ShortKey;
             var ShortCondition = ReceivingData.ShortCondition;
             if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                ShortOrder = {};
                ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
             }         
             var FindQuery = {  InvitedBy: ReceivingData.CustomerId,  IfSeller: 'Pending' };

             if (ReceivingData.CustomerCategory === 'Seller') {
                var FindQuery = {  InvitedBy: ReceivingData.CustomerId,  IfSeller: 'Pending' };
             } else if (ReceivingData.CustomerCategory === 'Buyer') {
                var FindQuery = {  InvitedBy: ReceivingData.CustomerId,  IfBuyer: 'Pending' };
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
                InviteManagement.InviteManagementSchema
                   .aggregate([
                      { $match: FindQuery },
                      {
                         $lookup: {
                            from: "Business",
                            let: { "business": "$Business" },
                            pipeline: [
                               { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                               { $project: { "FirstName": 1 ,"LastName":1} }
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
                               { $project: { "FirstName": 1 ,"LastName":1}  }
                            ],
                            as: 'BuyerBusiness'
                         }
                      },
                      { $unwind: { path: "$BuyerBusiness", preserveNullAndEmptyArrays: true } },
                      // {
                      //    $lookup: {
                      //       from: "Branch",
                      //       let: { "branch": "$Branch" },
                      //       pipeline: [
                      //          { $match: { $expr: { $eq: ["$$branch", "$_id"] } } },
                      //          { $project: { "BranchName": 1, "AvailableCreditLimit": 1 } }
                      //       ],
                      //       as: 'BranchInfo'
                      //    }
                      // },
                      // { $unwind: { path: "$BranchInfo", preserveNullAndEmptyArrays: true } },
                      // {
                      //    $lookup: {
                      //       from: "Branch",
                      //       let: { "buyerBranch": "$BuyerBranch" },
                      //       pipeline: [
                      //          { $match: { $expr: { $eq: ["$$buyerBranch", "$_id"] } } },
                      //          { $project: { "BranchName": 1 } }
                      //       ],
                      //       as: 'BuyerBranchInfo'
                      //    }
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
                            let: { "invitedUser": "$InvitedUser" },
                            pipeline: [
                               { $match: { $expr: { $eq: ["$$invitedUser", "$_id"] } } },
                               { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                            ],
                            as: 'InvitedUserInfo'
                         }
                      },
                      { $unwind: { path: "$InvitedUserInfo", preserveNullAndEmptyArrays: true } },
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
                            Mobile: 1,
                            ContactName: 1,
                            Email: 1,
                            Buyer: 1,
                            BuyerBusiness: 1,
                            // BuyerBranchInfo: 1,
                            Seller: 1,
                            Business: 1,
                            // BranchInfo: 1,
                            IfUser: 1,
                            InvitedUserInfo: 1,
                            Invite_Status: 1,
                            InviteType: 1,
                            IfSeller: 1,
                            IfBuyer: 1,
                            BuyerCreditLimit: 1,
                            BuyerPaymentType: 1,
                            BuyerPaymentCycle: 1,
                            AvailableLimit: 1,
                            InvitedBy: 1,
                            InviteProcess: 1,
                            ModeInvite: 1,
                            InviteCategory: 1,
                            ActiveStatus: 1,
                            IfDeleted: 1,
                            createdAt: 1
                         }
                      },
                      { $sort: ShortOrder },
                      { $skip: Skip_Count },
                      { $limit: Limit_Count }
                   ]).exec(),
                InviteManagement.InviteManagementSchema.countDocuments(FindQuery).exec(),
                // BusinessManagement.BranchSchema.find({ ActiveStatus: true, IfDeleted: false },{}, {}).exec(),
                BusinessAndBranchManagement.BusinessSchema.find({ ActiveStatus: true, IfDeleted: false },{}, {}).exec(),
                InvoiceManagement.InvoiceSchema.find({ InvoiceStatus: "Accept", PaidORUnpaid: "Unpaid" },{}, {}).exec(),
             ]).then(result => {
              var InviteDetails = JSON.parse(JSON.stringify(result[0]));
              var BranchDetails = JSON.parse(JSON.stringify(result[2]));
              var InvoiceDetails = JSON.parse(JSON.stringify(result[3]));
              if (InviteDetails.length !== 0) {
                  InviteDetails.map(Obj => {
                      // if (Obj.BranchInfo !== null) {
                      //     Obj.BranchInfo.ExtraUnitizedCreditLimit = 0;
                      //     Obj.BranchInfo.CreditBalanceExists = false;
                      // }
                      // const BranchDetailsArr = BranchDetails.filter(obj => obj.Customer === Obj.SellerInfo._id && obj._id === Obj.BranchInfo._id);
                      // if (BranchDetailsArr.length > 0) {
                      //     BranchDetailsArr.map(obj => {
                      //         if (Obj.BranchInfo !== null) {
                      //             Obj.BranchInfo.AvailableCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit) + parseFloat(obj.AvailableCreditLimit);
                      //             Obj.BranchInfo.AvailableCreditLimit = Obj.BranchInfo.AvailableCreditLimit.toFixed(2);
                      //             Obj.BranchInfo.AvailableCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit);
                      //         }
                      //     });
                      // }

                      // const InvoiceDetailsArr = InvoiceDetails.filter(obj => obj.Seller === Obj.SellerInfo._id && obj._id === Obj.BranchInfo._id);
                      // var InvoiceAmount = 0;
                      // if (InvoiceDetailsArr.length > 0) {
                      //     InvoiceDetailsArr.map(obj => {
                      //         InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.AvailableAmount);
                      //     });
                      // }
                      // if (Obj.BranchInfo !== null) {
                      //     Obj.BranchInfo.AvailableCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit) + parseFloat(InvoiceAmount);
                      //     if (Obj.BranchInfo.AvailableCreditLimit > 0) {
                      //         Obj.BranchInfo.AvailableCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit);
                      //         Obj.BranchInfo.AvailableCreditLimit = Obj.BranchInfo.AvailableCreditLimit.toFixed(2);
                      //         Obj.BranchInfo.AvailableCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit);
                      //     } else {
                      //         Obj.BranchInfo.AvailableCreditLimit = 0;
                      //         Obj.BranchInfo.ExtraUnitizedCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit);
                      //         Obj.BranchInfo.ExtraUnitizedCreditLimit = Obj.BranchInfo.ExtraUnitizedCreditLimit.toFixed(2);
                      //         Obj.BranchInfo.ExtraUnitizedCreditLimit = parseFloat(Obj.BranchInfo.ExtraUnitizedCreditLimit);
                      //     }
                      // }
                      // return Obj;
                  });
                  res.status(200).send({ Status: true, Message: 'Your Invite List', Response: InviteDetails, SubResponse: result[1]});
              } else {
                  res.status(200).send({ Status: false, Message: "This Customer does not having any Invites!" });
              }                 
             }).catch(Error => {
                ErrorHandling.ErrorLogCreation(req, 'Invite Find error', 'InviteManagement -> All Invite List', JSON.stringify(Error));
                res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
             });
          } else {
              res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
          }
      }).catch(Error => {
          res.status(417).send({ Status: false, Message: "Some Occurred Error", Error: Error });
      });
  }
};

// SellerInvite_AcceptList
exports.SellerInvite_AcceptList = function (req, res) {
  var ReceivingData = req.body;
  if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
  }  else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
    res.status(400).send({ Status: false, Message: "Customern Category can not be empty" });
}else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Promise.all([
          CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
          var CustomerDetails = Response[0];
          if (CustomerDetails !== null) {
             const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
             const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
             var ShortOrder = { createdAt: -1 };
             var ShortKey = ReceivingData.ShortKey;
             var ShortCondition = ReceivingData.ShortCondition;
             if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                ShortOrder = {};
                ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
             }         
             // var FindQuery = { Seller: ReceivingData.CustomerId, Invite_Status: 'Accept'};

             if (ReceivingData.CustomerCategory === 'Seller') {
                var FindQuery = { Seller: ReceivingData.CustomerId, Invite_Status: 'Accept'};
             } else if (ReceivingData.CustomerCategory === 'Buyer') {
                var FindQuery = { Buyer: ReceivingData.CustomerId, Invite_Status: 'Accept'};
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
                InviteManagement.InviteManagementSchema
                   .aggregate([
                      { $match: FindQuery },
                      {
                         $lookup: {
                            from: "Business",
                            let: { "business": "$Business" },
                            pipeline: [
                               { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                               { $project: { "FirstName": 1 ,"LastName":1} }
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
                               { $project: { "FirstName": 1 ,"LastName":1} }
                            ],
                            as: 'BuyerBusiness'
                         }
                      },
                      { $unwind: { path: "$BuyerBusiness", preserveNullAndEmptyArrays: true } },
                      // {
                      //    $lookup: {
                      //       from: "Branch",
                      //       let: { "branch": "$Branch" },
                      //       pipeline: [
                      //          { $match: { $expr: { $eq: ["$$branch", "$_id"] } } },
                      //          { $project: { "BranchName": 1 } }
                      //       ],
                      //       as: 'BranchInfo'
                      //    }
                      // },
                      // { $unwind: { path: "$BranchInfo", preserveNullAndEmptyArrays: true } },
                      // {
                      //    $lookup: {
                      //       from: "Branch",
                      //       let: { "buyerBranch": "$BuyerBranch" },
                      //       pipeline: [
                      //          { $match: { $expr: { $eq: ["$$buyerBranch", "$_id"] } } },
                      //          { $project: { "BranchName": 1 } }
                      //       ],
                      //       as: 'BuyerBranchInfo'
                      //    }
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
                            let: { "invitedUser": "$InvitedUser" },
                            pipeline: [
                               { $match: { $expr: { $eq: ["$$invitedUser", "$_id"] } } },
                               { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                            ],
                            as: 'InvitedUserInfo'
                         }
                      },
                      { $unwind: { path: "$InvitedUserInfo", preserveNullAndEmptyArrays: true } },
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
                            Mobile: 1,
                            ContactName: 1,
                            Email: 1,
                            Buyer: 1,
                            BuyerBusiness: 1,
                            // BuyerBranchInfo: 1,
                            Seller: 1,
                            Business: 1,
                            // BranchInfo: 1,
                            IfUser: 1,
                            InvitedUserInfo: 1,
                            Invite_Status: 1,
                            InviteType: 1,
                            IfSeller: 1,
                            IfBuyer: 1,
                            BuyerCreditLimit: 1,
                            BuyerPaymentType: 1,
                            BuyerPaymentCycle: 1,
                            AvailableLimit: 1,
                            InvitedBy: 1,
                            InviteProcess: 1,
                            ModeInvite: 1,
                            InviteCategory: 1,
                            ActiveStatus: 1,
                            IfDeleted: 1,
                            createdAt: 1
                         }
                      },
                      { $sort: ShortOrder },
                      { $skip: Skip_Count },
                      { $limit: Limit_Count }
                   ]).exec(),
                InviteManagement.InviteManagementSchema.countDocuments(FindQuery).exec()
             ]).then(result => {
                res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
             }).catch(Error => {
                ErrorHandling.ErrorLogCreation(req, 'Invite Find error', 'InviteManagement -> All Invite List', JSON.stringify(Error));
                res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
             });
          } else {
              res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
          }       
      }).catch(Error => {
          res.status(417).send({ Status: false, Message: "Some Occurred Error", Error: Error });
      });
  }
};


// SellerInvite_RejectList
exports.SellerInvite_RejectList = function (req, res) {
  var ReceivingData = req.body;
  if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
  }  else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
    res.status(400).send({ Status: false, Message: "Customern Category can not be empty" });
} else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Promise.all([
          CustomersManagement.CustomerSchema.findOne({ _id: ReceivingData.CustomerId, $or: [{ CustomerCategory: 'Seller' }, { CustomerCategory: 'Buyer' }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
          var CustomerDetails = Response[0];
          if (CustomerDetails !== null) {
             const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
             const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
             var ShortOrder = { createdAt: -1 };
             var ShortKey = ReceivingData.ShortKey;
             var ShortCondition = ReceivingData.ShortCondition;
             if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                ShortOrder = {};
                ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
             }         
             // var FindQuery = { Seller: ReceivingData.CustomerId, Invite_Status: 'Reject'};
             
              if (ReceivingData.CustomerCategory === 'Seller') {
                var FindQuery = { Seller: ReceivingData.CustomerId, Invite_Status: 'Reject'};
              } else if (ReceivingData.CustomerCategory === 'Buyer') {
                var FindQuery = { Buyer: ReceivingData.CustomerId, Invite_Status: 'Reject'};
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
                InviteManagement.InviteManagementSchema
                   .aggregate([
                      { $match: FindQuery },
                      {
                         $lookup: {
                            from: "Business",
                            let: { "business": "$Business" },
                            pipeline: [
                               { $match: { $expr: { $eq: ["$$business", "$_id"] } } },
                               { $project: { "FirstName": 1 ,"LastName":1} }
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
                               { $project: { "FirstName": 1 ,"LastName":1} }
                            ],
                            as: 'BuyerBusiness'
                         }
                      },
                      { $unwind: { path: "$BuyerBusiness", preserveNullAndEmptyArrays: true } },
                      // {
                      //    $lookup: {
                      //       from: "Branch",
                      //       let: { "branch": "$Branch" },
                      //       pipeline: [
                      //          { $match: { $expr: { $eq: ["$$branch", "$_id"] } } },
                      //          { $project: { "BranchName": 1 } }
                      //       ],
                      //       as: 'BranchInfo'
                      //    }
                      // },
                      // { $unwind: { path: "$BranchInfo", preserveNullAndEmptyArrays: true } },
                      // {
                      //    $lookup: {
                      //       from: "Branch",
                      //       let: { "buyerBranch": "$BuyerBranch" },
                      //       pipeline: [
                      //          { $match: { $expr: { $eq: ["$$buyerBranch", "$_id"] } } },
                      //          { $project: { "BranchName": 1 } }
                      //       ],
                      //       as: 'BuyerBranchInfo'
                      //    }
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
                            let: { "invitedUser": "$InvitedUser" },
                            pipeline: [
                               { $match: { $expr: { $eq: ["$$invitedUser", "$_id"] } } },
                               { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                            ],
                            as: 'InvitedUserInfo'
                         }
                      },
                      { $unwind: { path: "$InvitedUserInfo", preserveNullAndEmptyArrays: true } },
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
                            Mobile: 1,
                            ContactName: 1,
                            Email: 1,
                            Buyer: 1,
                            BuyerBusiness: 1,
                            // BuyerBranchInfo: 1,
                            Seller: 1,
                            Business: 1,
                            // BranchInfo: 1,
                            IfUser: 1,
                            InvitedUserInfo: 1,
                            Invite_Status: 1,
                            InviteType: 1,
                            IfSeller: 1,
                            IfBuyer: 1,
                            BuyerCreditLimit: 1,
                            BuyerPaymentType: 1,
                            BuyerPaymentCycle: 1,
                            AvailableLimit: 1,
                            InvitedBy: 1,
                            InviteProcess: 1,
                            ModeInvite: 1,
                            InviteCategory: 1,
                            ActiveStatus: 1,
                            IfDeleted: 1,
                            createdAt: 1
                         }
                      },
                      { $sort: ShortOrder },
                      { $skip: Skip_Count },
                      { $limit: Limit_Count }
                   ]).exec(),
                InviteManagement.InviteManagementSchema.countDocuments(FindQuery).exec()
             ]).then(result => {
                res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
             }).catch(Error => {
                ErrorHandling.ErrorLogCreation(req, 'Invite Find error', 'InviteManagement -> All Invite List', JSON.stringify(Error));
                res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
             });
          } else {
              res.status(417).send({ Status: false, Message: "Invalid Customer Details" });
          }       
      }).catch(Error => {
          res.status(417).send({ Status: false, Message: "Some Occurred Error", Error: Error });
      });
  }
};

// InvitedSeller_InviteList 
exports.InvitedSeller_InviteList = function (req, res) {
  var ReceivingData = req.body;

  if (!ReceivingData.Mobile || ReceivingData.Mobile === '') {
      res.status(400).send({ Status: false, Message: "Mobile can not be empty" });
  } else if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
  } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
      res.status(400).send({ Status: false, Message: "Customer Category can not be empty" });
  } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Promise.all([
          CustomersManagement.CustomerSchema.findOne({ Mobile: ReceivingData.Mobile, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
          CustomersManagement.CustomerSchema.find({ Owner: ReceivingData.CustomerId, ActiveStatus: true, IfDeleted: false }, {}, {}).exec(),
      ]).then(Response => {
          var OwnerDetails = Response[0];
          var CustomerDetails = Response[1];
          var MobileArr = [ReceivingData.Mobile];
          if (OwnerDetails !== null && (CustomerDetails.length === 0 || CustomerDetails.length !== 0)) {
              if (CustomerDetails.length !== 0) {
                  CustomerDetails.map(Obj => {
                      MobileArr.push(Obj.Mobile);
                  });
              }
              var FindQuery = { Mobile: { $in: MobileArr }, InviteCategory: ReceivingData.CustomerCategory, Invite_Status: 'Pending_Approval' };

              if (ReceivingData.CustomerCategory === 'Seller') {
                var FindQuery = { Mobile: { $in: MobileArr }, InviteCategory: ReceivingData.CustomerCategory, Invite_Status: 'Pending_Approval' };
              } else if (ReceivingData.CustomerCategory === 'Buyer') {
                var FindQuery = { Mobile: { $in: MobileArr }, InviteCategory: ReceivingData.CustomerCategory, Invite_Status: 'Pending_Approval' };
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
                  InviteManagement.InviteManagementSchema
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
                              as: 'BusinessInfo'
                           }
                        },
                        { $unwind: { path: "$BusinessInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Business",
                              let: { "buyerBusiness": "$BuyerBusiness" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$buyerBusiness", "$_id"] } } },
                                 { $project: { "BusinessName": 1 } }
                              ],
                              as: 'BuyerBusinessInfo'
                           }
                        },
                        { $unwind: { path: "$BuyerBusinessInfo", preserveNullAndEmptyArrays: true } },
                      //   {
                      //      $lookup: {
                      //         from: "Branch",
                      //         let: { "branch": "$Branch" },
                      //         pipeline: [
                      //            { $match: { $expr: { $eq: ["$$branch", "$_id"] } } },
                      //            { $project: { "BranchName": 1, "AvailableCreditLimit": 1 } }
                      //         ],
                      //         as: 'BranchInfo'
                      //      }
                      //   },
                      //   { $unwind: { path: "$BranchInfo", preserveNullAndEmptyArrays: true } },
                      //   {
                      //      $lookup: {
                      //         from: "Branch",
                      //         let: { "buyerBranch": "$BuyerBranch" },
                      //         pipeline: [
                      //            { $match: { $expr: { $eq: ["$$buyerBranch", "$_id"] } } },
                      //            { $project: { "BranchName": 1 } }
                      //         ],
                      //         as: 'BuyerBranchInfo'
                      //      }
                      //   },
                      //   { $unwind: { path: "$BuyerBranchInfo", preserveNullAndEmptyArrays: true } },
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
                           $lookup: {
                              from: "Customers",
                              let: { "invitedUser": "$InvitedUser" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$invitedUser", "$_id"] } } },
                                 { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                              ],
                              as: 'InvitedUserInfo'
                           }
                        },
                        { $unwind: { path: "$InvitedUserInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Customers",
                              let: { "buyer": "$Buyer" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$buyer", "$_id"] } } },
                                 { $project: { "ContactName": 1, "Mobile": 1, "Email": 1 } }
                              ],
                              as: 'BuyerInfo'
                           }
                        },
                        { $unwind: { path: "$BuyerInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $project: {
                              Mobile: 1,
                              ContactName: 1,
                              Email: 1,
                              BuyerInfo: 1,
                              BuyerBusinessInfo: 1,
                            //   BuyerBranchInfo: 1,
                              SellerInfo: 1,
                              BusinessInfo: 1,
                            //   BranchInfo: 1,
                              IfUser: 1,
                              InvitedUserInfo: 1,
                              Invite_Status: 1,
                              InviteType: 1,
                              IfSeller: 1,
                              IfBuyer: 1,
                              BuyerCreditLimit: 1,
                              BuyerPaymentType: 1,
                              BuyerPaymentCycle: 1,
                              AvailableLimit: 1,
                              InvitedBy: 1,
                              InviteProcess: 1,
                              ModeInvite: 1,
                              InviteCategory: 1,
                              ActiveStatus: 1,
                              IfDeleted: 1,
                              createdAt: 1
                           }
                        },
                        { $sort: ShortOrder },
                        { $skip: Skip_Count },
                        { $limit: Limit_Count }
                     ]).exec(),
                  InviteManagement.InviteManagementSchema.countDocuments(FindQuery).exec(),
                  BusinessAndBranchManagement.BusinessSchema.find({ ActiveStatus: true, IfDeleted: false },{}, {}).exec(),
                  InvoiceManagement.InvoiceSchema.find({ InvoiceStatus: "Accept", PaidORUnpaid: "Unpaid" },{}, {}).exec(),
               ]).then(result => {
                var InviteDetails = JSON.parse(JSON.stringify(result[0]));
                var BranchDetails = JSON.parse(JSON.stringify(result[2]));
                var InvoiceDetails = JSON.parse(JSON.stringify(result[3]));
                if (InviteDetails.length !== 0) {
                   //  InviteDetails.map(Obj => {
                   //      if (Obj.BranchInfo !== null) {
                   //          Obj.BranchInfo.ExtraUnitizedCreditLimit = 0;
                   //          Obj.BranchInfo.CreditBalanceExists = false;
                   //      }
                   //      const BranchDetailsArr = BranchDetails.filter(obj => obj.Customer === Obj.SellerInfo._id && obj._id === Obj.BranchInfo._id);
                   //      if (BranchDetailsArr.length > 0) {
                   //          BranchDetailsArr.map(obj => {
                   //              if (Obj.BranchInfo !== null) {
                   //                  Obj.BranchInfo.AvailableCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit) + parseFloat(obj.AvailableCreditLimit);
                   //                  Obj.BranchInfo.AvailableCreditLimit = Obj.BranchInfo.AvailableCreditLimit.toFixed(2);
                   //                  Obj.BranchInfo.AvailableCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit);
                   //              }
                   //          });
                   //      }

                   //      const InvoiceDetailsArr = InvoiceDetails.filter(obj => obj.Seller === Obj.SellerInfo._id && obj._id === Obj.BranchInfo._id);
                   //      var InvoiceAmount = 0;
                   //      if (InvoiceDetailsArr.length > 0) {
                   //          InvoiceDetailsArr.map(obj => {
                   //              InvoiceAmount = parseFloat(InvoiceAmount) + parseFloat(obj.AvailableAmount);
                   //          });
                   //      }
                   //      if (Obj.BranchInfo !== null) {
                   //          Obj.BranchInfo.AvailableCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit) + parseFloat(InvoiceAmount);
                   //          if (Obj.BranchInfo.AvailableCreditLimit > 0) {
                   //              Obj.BranchInfo.AvailableCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit);
                   //              Obj.BranchInfo.AvailableCreditLimit = Obj.BranchInfo.AvailableCreditLimit.toFixed(2);
                   //              Obj.BranchInfo.AvailableCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit);
                   //          } else {
                   //              Obj.BranchInfo.AvailableCreditLimit = 0;
                   //              Obj.BranchInfo.ExtraUnitizedCreditLimit = parseFloat(Obj.BranchInfo.AvailableCreditLimit);
                   //              Obj.BranchInfo.ExtraUnitizedCreditLimit = Obj.BranchInfo.ExtraUnitizedCreditLimit.toFixed(2);
                   //              Obj.BranchInfo.ExtraUnitizedCreditLimit = parseFloat(Obj.BranchInfo.ExtraUnitizedCreditLimit);
                   //          }
                   //      }
                   //      return Obj;
                   //  });
                    res.status(200).send({ Status: true, Message: 'Your Invite List', Response: InviteDetails, SubResponse: result[1]});
                } else {
                    res.status(400).send({ Status: false, Message: "This Customer does not having any Invites!" });
                }                 
               }).catch(Error => {
                  ErrorHandling.ErrorLogCreation(req, 'Invite Find error', 'InviteManagement -> All Invite List', JSON.stringify(Error));
                  res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customers list!." });
               });              
          } else {
              res.status(400).send({ Status: false, Message: "Invalid Customer Details" });
          }
      }).catch(Error => {
          res.status(400).send({ Status: false, Message: "This Customer does not having any Invites!" });
      });
  }
};

// Verify Buyer Mobile Number before Send Invite
exports.Verify_Mobile = function (req, res) {
  var ReceivingData = req.body;

  if (!ReceivingData.Mobile || ReceivingData.Mobile === '') {
     res.status(400).send({ Status: false, Message: "Mobile details can not be empty" });
  } else if (!ReceivingData.CustomerCategory || ReceivingData.CustomerCategory === '') {
     res.status(400).send({ Status: false, Message: "Mobile details can not be empty" });
  } else {
     CustomersManagement.CustomerSchema.findOne({ Mobile: ReceivingData.Mobile, $or: [{ CustomerCategory: ReceivingData.CustomerCategory }, { CustomerCategory: 'BothBuyerAndSeller' }], ActiveStatus: true, IfDeleted: false }, {}, {}).exec(function (err, result) {
        if (err) {
           ErrorHandling.ErrorLogCreation(req, 'Buyer Mobile Verify Details Error', 'Seller.Controller -> VerifyBuyer_Mobile', JSON.stringify(err));
           res.status(417).send({ Status: false, Message: "Some errors predicted, We are unable to getting the Details!.", Error: err });
        } else {
           if (result !== null) {
              res.status(200).send({ Status: true, Message: 'Existing Customer', Response: result });
           } else {
              res.status(200).send({ Status: false, Message: "New Customer!" });
           }
        }
     });
  }
};