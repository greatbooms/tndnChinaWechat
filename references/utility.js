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
