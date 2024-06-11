const cron = require('node-cron');
const moment = require('moment');
var mongoose = require('mongoose');

var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var cors = require('cors');
const http = require('http');
var mime = require('mime-types');
// const https = require('https');
var app = express();
var ErrorManagement = require('./Server/Handling/ErrorHandling.js');
var LogManagement = require('./Server/Handling/LogHandling.js');   


// var PaymentManagement = require('../../Models/PaymentManagement.model');

// var PaymentReminderFunction = require('./Server/helper/pushNotification').PushNotification.PaymentReminderFunction();
// var MondayNotificationFunction = require('./Server/helper/pushNotification').PushNotification.MondayNotificationFunction();
// var BuyerCreditLimitUnitizedFunction = require('./Server/helper/pushNotification').PushNotification.BuyerCreditLimitUnitizedFunction();
// var SellerCreditLimitUnitizedFunction = require('./Server/helper/pushNotification').PushNotification.SellerCreditLimitUnitizedFunction();
// var TopFiveHundiScoreFunction = require('./Server/helper/pushNotification').PushNotification.TopFiveHundiScoreFunction();
// var ReminderForInvoiceAcceptanceFunction = require('./Server/helper/pushNotification').PushNotification.ReminderForInvoiceAcceptanceFunction();

var SellerMonthlyReportsFunction = require('./Server/helper/monthlyReports').MonthlyReports.SellerMonthlyReportsFunction();
var BuyerMonthlyReportsFunction = require('./Server/helper/monthlyReports').MonthlyReports.BuyerMonthlyReportsFunction();
var multer = require('multer');
fs = require('fs-extra');
var server = require('http').Server(app);
global.io = require('socket.io')(server);
// var fileName =express();
app.use('Uploads/Customer_Profile/',express.static('profile_image'))
app.use('/Uploads/Customer_Profile', express.static(path.join(__dirname, 'Uploads/Customer_Profile')));
// app.use('/APP_API/Customer_Image', express.static('Uploads/Customer_Profile/'));
// Certificate
   // const privateKey = fs.readFileSync('privkey.pem', 'utf8');
   // const certificate = fs.readFileSync('cert.pem', 'utf8');
   // const ca = fs.readFileSync('chain.pem', 'utf8');

   // const credentials = {
   // 	key: privateKey,
   // 	cert: certificate,
   // 	ca: ca
   // };
// Http/Https Config and Redirect 
   const httpServer = http.createServer(app);
   // const httpsServer = https.createServer(credentials, app);

   // http.createServer(function (req, res) {
   //    res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
   //    res.end();
   // }).listen(80);
// var SocketHandling = require('./Server/helper/socket-handling');

// var InvoiceAutoAccept = require('./Server/InvoiceAutoAccept.js').InvoiceAutoAccept;
// var PaymentAutoAccept = require('./Server/PaymentAutoAccept.js').PaymentAutoAccept;


// Process On Every Error
   process.setMaxListeners(0);
   process.on('unhandledRejection', (reason, promise) => {
      console.error('Un Handled Rejection');    
      console.log(reason);  
      ErrorManagement.ErrorHandling.ErrorLogCreation('', 'Un Handled Rejection', '', reason);
   });
   process.on('uncaughtException', function (err) {
      console.log(err);
       
      console.error('Un Caught Exception');
      ErrorManagement.ErrorHandling.ErrorLogCreation('', 'Un Caught Exception', '', err.toString());
   });

   
// DB Connection
   const uri = "mongodb://localhost:27017/Aquila-Local";
   // const uri = "mongodb://10.10.20.210:27017/Aquila-Stage-Temp";
   // const uri = "mongodb://10.10.20.210:27017/Aquila-Stage";

   mongoose.connect(uri, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true });
   
   mongoose.connection.on('error', function (err) {
      console.log('Mongodb Connection Error');
      console.log(err); 
   });
   mongoose.connection.once('open', function () {
      console.log('DB Connectivity, Success!');
   });

// Middleware 
   app.use(cors());
   app.use(bodyParser.urlencoded({ limit: '15mb', extended: true, parameterLimit: 100000 }));
   app.use(bodyParser.json({ limit: '15mb' }));

// Socket IO Connection
var numClients = 0;
io.on('connection', (socket) => {
   numClients++;
   console.log('Connected clients:', numClients);

   socket.on('join',function(random){
      socket.join(random);
      socket.emit('res', {mes: "you are added namespace in " + random});
   });

   socket.on('disconnect', function() {
      numClients--;
      console.log('Connected clients:', numClients);
  });
});
 
// Every request Log Creation 
   app.use('/APP_API/', function (req, res, next) { 
      LogManagement.LogHandling.LogCreation('APP', req); 
      return next();
   }); 
   app.use('/Web_API/', function (req, res, next) { 
      LogManagement.LogHandling.LogCreation('Web', req); 
      return next();
   }); 
   app.use('/Admin_API/', function (req, res, next) { 
      LogManagement.LogHandling.LogCreation('Admin', req); 
      return next();
   }); 


// Static URL
   app.use('/APP_API/Customer_Image', express.static('Uploads/Customer_Profile/'));
   app.use('/APP_API/Invoice', express.static('Uploads/Invoice/'));
   app.use('/APP_API/Payment', express.static('Uploads/Payment/'));
   app.use('/APP_API/BuyerPdfFiles', express.static('Uploads/BuyerPDF/'));
   app.use('/APP_API/SellerPdfFiles', express.static('Uploads/SellerPDF/'));
// Admin URL
   require('./Server/Routes/Admin/industryManagement.routes')(app);
   require('./Server/Routes/Admin/userManagement.routes')(app);
   require('./Server/Routes/Admin/SupportManagement.routes')(app);
   require('./Server/Routes/Admin/customer.routes')(app);
// Web URL
   require('./Server/Routes/Web/Registration.routes')(app);
   require('./Server/Routes/Web/BusinessAndBranches.routes')(app);
   require('./Server/Routes/Web/Invite.routes')(app);
   require('./Server/Routes/Web/Invoice.routes')(app);
   require('./Server/Routes/Web/Payment.routes')(app);
   require('./Server/Routes/Web/HundiScore.routes')(app);
   require('./Server/Routes/Web/supportManagement.routes')(app);
   require('./Server/Routes/Web/TemporaryCredit.routes')(app);
// App URL
   require('./Server/Routes/App/Common.routes')(app);
   require('./Server/Routes/App/Customer.routes')(app);
   require('./Server/Routes/App/BusinessAndBranchManagement.routes')(app);
   require('./Server/Routes/App/InviteManagement.routes')(app);
   require('./Server/Routes/App/InvoiceManagement.routes')(app);
   require('./Server/Routes/App/Payment.routes')(app);
   require('./Server/Routes/App/SupportManagement.routes')(app);
   require('./Server/Routes/App/DeviceManagement.routes')(app);
   require('./Server/Routes/App/TemporaryCredit.routes')(app);
   require('./Server/Routes/App/LocationManagement.routes')(app);
   require('./Server/Routes/App/HundiScoreManagement.routes')(app);   
   require('./Server/Routes/App/SocketIo.routes')(app);



// Web Access
   app.use('/*.html|/*.js|/*.css|/*.png|/*.jpg|/*.svg|/*.ico|/*.ttf|/*.woff|/*.txt|/*.eot|/*.json', function (req, res, next) {
      if (req.headers['accept-encoding'] && req.headers.host === 'aquila-admin.pptssolutions.com') {
         const cond = req.headers['accept-encoding'].includes('gzip');
         if (cond) {
            const contentType = mime.lookup(req.originalUrl);
            req.url = req.url + '.gz';
            res.set('Content-Encoding', 'gzip');
            res.set('Content-Type', contentType);
         }
      }
      next();
   });

   app.use(express.static(__dirname + '/Admin/dist/Admin/'));
   app.use(express.static(__dirname + '/Client/dist/Client/'));
   app.use(function(req, res) {
      res.sendFile(path.join(__dirname, '/Admin/dist/Admin', 'index.html'));
   });
  // Set up the middleware stack
   // app.use('/', function(req, res, next) {
      // if (req.headers.host === 'aquila-client.pptssolutions.com') {
      //    express.static(__dirname + '/Client/dist/Client/')(req, res, next);
      // }
      // if (req.headers.host === 'aquila.pptssolutions.com.com') {
      //    express.static(__dirname + '/Admin/dist/Admin/')(req, res, next);
      // }
   // });
   // app.use('/', function(req, res, next) {
   //    if (req.headers.host === 'aquila-client.pptssolutions.com') {
   //       res.sendFile(path.join(__dirname, '/Client/dist/Client', 'index.html'));
   //    }
   //    if (req.headers.host === 'aquila-admin.pptssolutions.com') {
   //       res.sendFile(path.join(__dirname, '/Admin/dist/Admin', 'index.html'));
   //    }
   // });


// 404 
   app.use('*', function (req, res) {
      res.sendFile(path.join(__dirname+'/404-Error.html'));
   });
   
// Connect Http
   httpServer.listen(3002, () => {
      console.log('HTTP Server running on port 3002');
   });

// Invoice & Payment Auto Update as Paid.

//   var InvoiceManagement = require('./Server/Models/InvoiceManagement.model.js');
//   var PaymentManagement = require('./Server/Models/PaymentManagement.model.js');

//    async function listDocuments() {  
//       try {            
//          var InvUpdatedRecords = [];

//           const formattedCurrentDate = moment().format('YYYY-MM-DD');
            
//          //    const query = {
//          //       $expr: {
//          //           $eq: [
//          //               { $dateToString: { format: '%Y-%m-%d', date: '$InvoiceDueDate' } },
//          //               formattedCurrentDate
//          //           ]
//          //       },
//          //       InvoiceStatus: 'Pending'
//          //   };

//             // var InvoiceList = [];
//             // const findInvoice = async () => {
//             //    try {
//             //      InvoiceList = await InvoiceManagement.InvoiceSchema.find(query).exec();
//             //      console.log(InvoiceList ,'Invoice List From DB');
//             //    } catch (error) {
//             //       console.log(error,'Invoice Fetch Error');
//             //     }
//             //  };
//             //  await findInvoice();

//          //  const update = {
//          //      $set: {
//          //          PaidORUnpaid: "Paid",
//          //          InvoiceStatus: 'Accept',
//          //          updatedAt: new Date(),
//          //          InvoiceDescription: "Auto Paid",
//          //          RemainingAmount: 0,
//          //          PaidAmount: 0,
//          //          InProgressAmount:0
//          //      }
//          //  };
  
//          //  const result = await InvoiceManagement.InvoiceSchema.updateMany(query, update);
         
//          // console.log(result);
//          // console.log(`Updated ${result.nModified} documents`);
   
//          // var InvList = [];
//          // InvList.push({
//          //      'InvoiceId': mongoose.Types.ObjectId(invoice.InvoiceId),
//          //      'PaidORUnpaid': "Paid",
//          //      'InvoiceNumber': invoice.InvoiceNumber,
//          //      'IfUsedTemporaryCredit': invoice.IfUsedTemporaryCredit,
//          //      'IfUsedPaidTemporaryCredit':invoice.IfUsedPaidTemporaryCredit,
//          //      'InvoiceAmount': invoice.InvoiceAmount,
//          //      'InvoiceDate': invoice.InvoiceDate,
//          //      'RemainingAmount': invoice.RemainingAmount,
//          //      'InProgressAmount': invoice.InProgressAmount,
//          //      'CurrentCreditAmount': invoice.CurrentCreditAmount,
//          //      'UsedCurrentCreditAmount': invoice.UsedCurrentCreditAmount,
//          //      'PaidCurrentCreditAmount': invoice.PaidCurrentCreditAmount,
//          //      'TemporaryCreditAmount': invoice.TemporaryCreditAmount,
//          //      'UsedTemporaryCreditAmount': invoice.UsedTemporaryCreditAmount,
//          //      'PaidTemporaryCreditAmount': invoice.PaidTemporaryCreditAmount
//          //   });
//          //   console.log(InvList,'InvList');
       
//          const query = {
//             $expr: {
//                $eq: [
//                      { $dateToString: { format: '%Y-%m-%d', date: '$InvoiceDueDate' } },
//                      formattedCurrentDate
//                ]
//             },
//             InvoiceStatus: 'Pending'
//          };

//          const invoicesToUpdate = await InvoiceManagement.InvoiceSchema.find(query);

//          await invoicesToUpdate.forEach(async (invoice) => {
//             const remainingAmount = invoice.RemainingAmount || 0;
//             const invoiceAmount = invoice.InvoiceAmount || 0;
//             const inProgressAmount =  invoiceAmount - remainingAmount;

//             const update = {
//                $set: {
//                      PaidORUnpaid: 'Paid',
//                      InvoiceStatus: 'Accept',
//                      updatedAt: new Date(),
//                      InvoiceDescription: 'Auto Paid',
//                      RemainingAmount: 0,
//                      PaidAmount: invoiceAmount,
//                      InProgressAmount: inProgressAmount
//                }
//             };

//          var invUpdatePer_Rec =  await InvoiceManagement.InvoiceSchema.findOneAndUpdate({ _id: invoice._id }, update,{ new: true });
         
//          await InvUpdatedRecords.push(invUpdatePer_Rec);
//          });

//          var k = setInterval(async ()=>{

//             if(InvUpdatedRecords.length > 0){
//                clearInterval(k);
//                // console.log('Updated Documents:', InvUpdatedRecords);
//                // console.log( InvUpdatedRecords);

//                // console.log("*******Updated result**********");

//                var LastPayment = [];
//                   const findLastPayment = async () => {
//                      try {
//                         LastPayment = await PaymentManagement.PaymentSchema.findOne({ ActiveStatus: true, IfDeleted: false }, {}, { sort: { PaymentID_Unique : -1 } }).exec();
//                      console.log(LastPayment,'Last PAyment Success');
//                      } catch (error) {
//                         console.log(error,'Last Payment Fetch Error');
//                      }
//                   };
//                await findLastPayment();
      
      
//                if(InvUpdatedRecords.length > 0){
//                await InvUpdatedRecords.forEach(async (invoiceupdaatedlist, index) => {
//                   console.log(index);            
                  
//                      var LastPayment_Reference = LastPayment !== null ? (LastPayment.PaymentID_Unique + (index + 1)) : (index + 1);
//                   console.log(LastPayment_Reference);
                     
//                   const Create_Payment = new PaymentManagement.PaymentSchema({
//                         Seller: invoiceupdaatedlist.Seller,
//                         Business: invoiceupdaatedlist.Business,
//                         Buyer:invoiceupdaatedlist.Buyer,
//                         BuyerBusiness: invoiceupdaatedlist.BuyerBusiness,
//                         PaymentID: 'PAY-' + LastPayment_Reference.toString(),
//                         PaymentID_Unique: LastPayment_Reference,
//                         InvoiceDetails: invoiceupdaatedlist, 
//                         PaymentDate: moment().format('YYYY-MM-DDTHH:mm:ss'),//YYYY-MM-DD (2023-12-13T18:30:00.000Z)
//                         PaymentDueDate:invoiceupdaatedlist.InvoiceDueDate, 
//                         PaymentAmount: invoiceupdaatedlist.InvoiceAmount || 0,
//                         PaymentMode: 'Online',
//                         Remarks: 'Auto Payment',
//                         IfSellerApprove: false,
//                         IfSellerNotify: false,
//                         DisputedRemarks: '',
//                         Payment_Status: 'Pending',
//                         PaymentAttachments: [],
//                         ActiveStatus: true,
//                         IfDeleted: false
//                      });
//                      Create_Payment.save(function (err_2, result_2) {
//                         console.log(result_2);
//                         if (err_2) {
//                            // ErrorHandling.ErrorLogCreation(req, 'Payment Create Error', 'PaymentManagement.Controller -> PaymentCreate', JSON.stringify(err_2));
//                            // res.status(417).send({ Status: false, Message: "Some error occurred while Creating the Payment!.", Error: err_2 });
//                      console.log(err_2,'Error Aftr payment Save Method');
//                         }
//                      });
//                   });
//                   }
//             }

//        },100)
  
//       } catch(err) {
//           console.log(err,'listDocuments Error');
//       }
//   }
  
  
//   cron.schedule('*/10 * * * * *', async () => {
//    // console.log('Cron Running the update task every 10 seconds...');
//    await listDocuments();
// });
  
  
  