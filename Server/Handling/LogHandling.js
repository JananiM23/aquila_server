var log4js = require('log4js');
var parser = require('ua-parser-js');

var LogHandling = {
	LogCreation: function(From, req) {
      // Log Creation For Every Request
         var fileName = new Date().toLocaleDateString().toString().split('/').join('-');
         log4js.configure({  appenders: { Info: { type: 'file', filename: 'Logs/Req_Logs/' + fileName + '.log'  } },
                           categories: { default: { appenders: ['Info'], level: 'info' } } });
         var logger = log4js.getLogger('Info');
         var Ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
         var DeviceInfo = parser(req.headers['user-agent']);
         logger.info(JSON.stringify({
            From: From,
            Date: new Date(),
            Ip: Ip,
            Request_From_Origin: req.headers.origin,
            Request_From: req.headers.referer,
            Request_Url: req.url,
            Request_Body: req.body,
            If_Get : req.params,
            Device_Info: DeviceInfo,
         }));
	}
};
exports.LogHandling = LogHandling;