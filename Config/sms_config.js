const axios = require('axios');


exports.sendOTP = function (Mobile, OTP, callback) { 
   console.log(Mobile);
   if (Mobile !== undefined && Mobile !== null && Mobile !== '' && OTP !== undefined && OTP !== null && OTP !== '' ) {

      const params = new URLSearchParams();
      params.append('key', '');
      params.append('msg', '');
      params.append('senderid', '');
      params.append('routeid', '');      
      params.append('contacts', Mobile);

      axios.post('https://sms.textmysms.com/app/smsapi/index.php', params).then(function (response) {
         callback(null, response.data);
         console.log(response);
       }).catch(function (error) {
          console.log(error);
         callback('Some Error for sending OTP SMS!, Error: ' + error, null);
       });
   } else {
      callback('OTP send failed, purpose of invalid data {Mobile: ' + Mobile + ', OTP: ' + OTP + ' }', null);
   }
};
