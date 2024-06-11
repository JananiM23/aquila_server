//Payment Auto Accept After 3 days 
const schedule = require('node-schedule');
const moment = require('moment');
const mongoose = require('../index.js'); // Import the database connection
const InvoiceManagement = require('./Models/InvoiceManagement.model.js');
const BusinessManagement = require('./Models/BusinessAndBranchManagement.model.js');
const InviteManagement = require('./Models/Invite_Management.model.js');
const PaymentManagement = require('./Models/PaymentManagement.model.js');

// Define the cron expression to run every second for testing
const cronExpression = '* * * * * *';
// const cronExpression = '0 1 1 * * *';


const threeDaysAgo = moment().subtract(3, 'days').startOf('day').toDate();
const todayDate = moment().startOf('day').toDate();


// Define your cron job
const PaymentAutoAccept = schedule.scheduleJob(cronExpression, async function() {
    console.log('Auto Accept Payments!');
    
    try {
        const payments = await PaymentManagement.PaymentSchema.find({
            // createdAt: { $eq: threeDaysAgo },
            Payment_Status: 'Pending',
            ActiveStatus: true,
            IfDeleted: false
        }).exec(); 
        
        for (const payment of payments) {
            // console.log(payment,'paymentpayment');

          

            // Update invoice status to 'Accept'
            await PaymentManagement.PaymentSchema.updateOne(
                { _id: payment._id },
                { $set: { 
                    Payment_Status: 'Accept',
                    IfSellerApprove : true,
                    IfSellerNotify:true,
                    Payment_ApprovedBy:payment.Seller,
                    
                } }
            );

            payment.InvoiceDetails.map(async obj=>{
                console.log(obj,'objobj');
                // var InProgress = 0 ;
                // InProgress += obj.InProgressAmount;
                InvoiceManagement.InvoiceSchema.find({_id:obj.InvoiceId}).exec(
                    (err,res)=>{
                        if (err) {
                            console.log("Error while Fetching the Invoice Details",err);
                        } else {
                           res.map(async inv=>{
                            console.log(inv,'invinv');
                            await InvoiceManagement.InvoiceSchema.updateOne(
                                { _id:inv._id},
                                { $set: { 
                                    PaidAmount : inv.PaidAmount + obj.InProgressAmount,
                                    InProgressAmount : inv.InProgressAmount - obj.InProgressAmount,
                                    PaidCurrentCreditAmount: inv.PaidCurrentCreditAmount +obj.InProgressAmount
                                }}
                            )
                           })
                        }
                    })
            })
            

            // Update Buyer Business's Available Credit Limit
            const buyerBusiness = await BusinessManagement.BusinessSchema.findOne({
                _id: payment.BuyerBusiness,
                ActiveStatus: true,
                IfDeleted: false
            }).exec();

            if (buyerBusiness) {
                const TotalPaymntAmount = Number(payment.PaymentAmount);
                let TotalAmount = buyerBusiness.AvailableCreditLimit + TotalPaymntAmount;
                if (TotalAmount < 0) {
                    TotalAmount = 0;
                }

                await BusinessManagement.BusinessSchema.updateOne(
                    { _id: payment.BuyerBusiness },
                    { $set: { AvailableCreditLimit: TotalAmount } }
                );
            }

            // Update Invite Management
            const invite = await InviteManagement.InviteManagementSchema.findOne({
                Seller: payment.Seller,
                Business: payment.Business,
                Buyer: payment.Buyer,
                BuyerBusiness: payment.BuyerBusiness,
                Invite_Status: 'Accept'
            }).exec();

            if (invite) {
                const TotalPaymntAmount = Number(payment.PaymentAmount);
                let TotalAmount = invite.AvailableLimit + TotalPaymntAmount;
                if (TotalAmount < 0) {
                    TotalAmount = 0;
                }
                await InviteManagement.InviteManagementSchema.updateOne(
                    { _id: invite._id },
                    { $set: {  AvailableLimit: TotalAmount } }
                );
            }
        }
    } catch (error) {
        console.error('Error processing invoices:', error);
    }
})

module.exports = {
    PaymentAutoAccept: PaymentAutoAccept
};
