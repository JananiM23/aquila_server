//Invoice Auto Acceptance After 3 days 

const schedule = require('node-schedule');
const moment = require('moment');
const mongoose = require('../index.js'); // Import the database connection
const InvoiceManagement = require('./Models/InvoiceManagement.model.js');
const BusinessManagement = require('./Models/BusinessAndBranchManagement.model.js');
const InviteManagement = require('./Models/Invite_Management.model.js');

// Define the cron expression to run every second for testing
const cronExpression = '* * * * * *';
// const cronExpression = '0 1 1 * * *';


const threeDaysAgo = moment().subtract(3, 'days').startOf('day').toDate();
const todayDate = moment().startOf('day').toDate();


// Define your cron job
const InvoiceAutoAccept = schedule.scheduleJob(cronExpression, async function() {
    console.log('Auto Accept Invoice!');
    
    try {
        const invoices = await InvoiceManagement.InvoiceSchema.find({
            // createdAt: { $eq: threeDaysAgo },
            InvoiceStatus: 'Pending', 
            ActiveStatus: true,
            IfDeleted: false
        }).exec();
        console.log(invoices,'invoiceinvoice');
        for (const invoice of invoices) {
            // Update invoice status to 'Accept'
            await InvoiceManagement.InvoiceSchema.updateOne(
                { _id: invoice._id},
                { $set: { 
                    InvoiceStatus: 'Accept',
                    IfBuyerApprove:true,
                    IfBuyerNotify:true,
                    AcceptRemarks:"Auto accepted After 3 days",
                } }
            );

            // Update Buyer Business's Available Credit Limit
            const buyerBusiness = await BusinessManagement.BusinessSchema.findOne({
                _id: invoice.BuyerBusiness,
                ActiveStatus: true,
                IfDeleted: false
            }).exec();

            if (buyerBusiness) {
                const TotalInvAmount = Number(invoice.InvoiceAmount);
                let TotalAmount = buyerBusiness.AvailableCreditLimit - TotalInvAmount;
                if (TotalAmount < 0) {
                    TotalAmount = 0;
                }

                await BusinessManagement.BusinessSchema.updateOne(
                    { _id: invoice.BuyerBusiness },
                    { $set: { AvailableCreditLimit: TotalAmount } }
                );
            }

            // Update Invite Management
            const invite = await InviteManagement.InviteManagementSchema.findOne({
                Seller: invoice.Seller,
                Business: invoice.Business,
                Buyer: invoice.Buyer,
                BuyerBusiness: invoice.BuyerBusiness,
                Invite_Status: 'Accept'
            }).exec();

            if (invite) {
                var TotalInvAmount = 0;
                TotalInvAmount += Number(invoice.InvoiceAmount); 
                let TotalAmount = invite.AvailableLimit - TotalInvAmount;
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
});


module.exports = {
    InvoiceAutoAccept: InvoiceAutoAccept
};
