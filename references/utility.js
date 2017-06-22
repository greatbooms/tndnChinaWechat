var moment = require('moment');
moment.locale('ko');

exports.UUID = function() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}
exports.valueValidation = function(value) {
    if (value == 'undefined' || value == undefined || !value || value == null || value == 'null') {
        return false;
    } else {
        return true;
    }

}

//using time format
var today = exports.today = function() {
    return moment().format('YYYY-MM-DD HH:mm:ss'); // '2014-07-03 20:14:28.500 +0900'
};


exports.log = function(api, data, start) {
    if (start == 'start') {
    	        return console.log(today() + '  ********* ' + api + ' START ********');

    }else if (start == 'success') {
    	        return console.log(today() + '  ********* ' + api + ' SUCCESS ********');

    } else {
        return console.log(today() + '  "' + api + '"     ' + data + '  ');
    }
};
module.exports.returnHeader = function(res) {
  res.contentType('application/json; charset=utf-8');
  res.write('{\"result\":\"success\"');
}

module.exports.returnBody = function(res, key, value) {
  res.write(',\"' + key + '\":');
  res.write(JSON.stringify(value));
}

module.exports.returnFooter = function(res) {
    res.write('}');
  res.end();
}

module.exports.error = function(res, message, code) {
  res.contentType('application/json; charset=utf-8');
  res.status(code);
  res.write(JSON.stringify({ 'result': 'failed', 'data': message}));
  res.end();
}

/**
create order no
*/
exports.createOrderNo=function() {
    var orderNo = Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return orderNo.substring(0, 22).replace('-', '').toUpperCase();
}
