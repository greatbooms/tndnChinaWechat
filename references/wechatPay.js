var Promise = require('bluebird');
var request = require('request');
var xml2js = require('xml2js');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var util = require('../references/utility.js');

var pfxFilePath = path.resolve(__dirname, 'apiclient_cert.p12')
var appid = 'wxa98e6fa0a6d50100';
var APPSECRET = 'd766e78e01c209c348a9090b0dc8267f';
var mch_id = '1482307622';
var key = 'BOLZEc8oGf7RkD4RFB0miSIPiEBdhE03';
// var key='ESiduf283Fei8slfEfESiduf283Fei8slfDS';

var createOutTradeNo = exports.createOutTradeNo = function() {
    var nowTime = new Date().getTime();
    var random_num = Math.floor(Math.random() * 100000) + 1;
    var pad = '000000';
    var random_num_pad = pad.substring(0, pad.length - random_num.length) + random_num;
    return nowTime + '' + random_num_pad;
}

function createNonceStr() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

function md5sign(fullStr, input_charset) {
    return new Promise(function(resolve, reject) {
        var md5sum = crypto.createHash('md5');
        md5sum.update(fullStr, input_charset);
        var sign = md5sum.digest('hex');
        resolve(sign.toUpperCase());
    });
}

function doXMLParse(xmlData) {
    var parser = new xml2js.Parser();
    var returnResult;
    parser.parseString(xmlData, function(err, result) {
        returnResult = result;
    });
    return returnResult;
}

function calcTime() {
    var d = new Date();
    var utc_offset = d.getTimezoneOffset();
    d.setMinutes(d.getMinutes() + utc_offset);
    var china_offset = 8 * 60;
    d.setMinutes(d.getMinutes() + china_offset);
    return d.getTime();
}

function httpRequestForWechat(xmlData) {
    return new Promise(function(resolve, reject) {
        request.post({
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            url: 'https://api.mch.weixin.qq.com/pay/unifiedorder',
            body: xmlData
        }, function(error, response, body) {
            resolve(body);
        });
    });
}

function httpRequestForOrderQuery(xmlData) {
    return new Promise(function(resolve, reject) {
        request.post({
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            url: 'https://api.mch.weixin.qq.com/pay/orderquery',
            body: xmlData
        }, function(error, response, body) {
            resolve(body);
        });
    });
}

function httpRequestForRefundRequest(xmlData) {
    return new Promise(function(resolve, reject) {
        request.post({
            headers: { 'content-type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(xmlData) },
            url: 'https://api.mch.weixin.qq.com/secapi/pay/refund',
            body: xmlData,
            agentOptions: {
                pfx: fs.readFileSync(pfxFilePath),
                passphrase: '22062256',
                securityOptions: 'SSL_OP_NO_SSLv3'
            }
        }, function(error, response, body) {
            resolve(body);
        });
    });
}

function httpRequestForRefundQuery(xmlData) {
    return new Promise(function(resolve, reject) {
        request.post({
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            url: 'https://api.mch.weixin.qq.com/pay/refundquery',
            body: xmlData
        }, function(error, response, body) {
            resolve(body);
        });
    });
}

exports.wechatBuildRequest = function(rmbFee, storeName, openID, remoteIp, out_trade_no) {
    util.log('wechatBuildRequest', '', 'start');

    return new Promise(function(resolve, reject) {
        var fee_type = 'CNY';
        var notify_url = 'http://tndnchina.cn/pay/wechatNotify';
        var trade_type = 'JSAPI';
        var sign_type = 'MD5';
        var input_charset = 'utf-8';
        var attach = 'TNDN Inc./+827086709409';
        var nonce_str = createNonceStr().replace('-', '').toUpperCase();
        var random_num = Math.floor(Math.random() * 10000000) + 1;
        var pad = '00000000';
        var random_num_pad = pad.substring(0, pad.length - random_num.length) + random_num;
        var wechatReturnData = {};
     
        rmbFee = parseInt(rmbFee);

        var prestr = 'appid=' + appid + '&';
        prestr += 'attach=' + attach + '&';
        prestr += 'body=' + storeName + '&';
        prestr += 'mch_id=' + mch_id + '&';
        prestr += 'nonce_str=' + nonce_str + '&';
        prestr += 'notify_url=' + notify_url + '&';
        prestr += 'openid=' + openID + '&';
        prestr += 'out_trade_no=' + out_trade_no + '&';
        prestr += 'spbill_create_ip=' + remoteIp + '&';
        prestr += 'total_fee=' + rmbFee + '&';
        prestr += 'trade_type=' + trade_type + '&';
        prestr += 'key=' + key;

        md5sign(prestr, input_charset).then(function(my_sign) {
            var requestXml = '<xml>';
            requestXml += '<appid>' + appid + '</appid>';
            requestXml += '<attach>' + '<![CDATA[' + attach + ']]>' + '</attach>';
            requestXml += '<body>' + '<![CDATA[' + storeName + ']]>' + '</body>';
            requestXml += '<mch_id>' + mch_id + '</mch_id>';
            requestXml += '<nonce_str>' + nonce_str + '</nonce_str>';
            requestXml += '<notify_url>' + notify_url + '</notify_url>';
            requestXml += '<openid>' + openID + '</openid>';
            requestXml += '<out_trade_no>' + out_trade_no + '</out_trade_no>';
            requestXml += '<spbill_create_ip>' + remoteIp + '</spbill_create_ip>';
            requestXml += '<total_fee>' + rmbFee + '</total_fee>';
            requestXml += '<trade_type>' + trade_type + '</trade_type>';
            requestXml += '<sign>' + '<![CDATA[' + my_sign + ']]>' + '</sign>';
            requestXml += '</xml>';
            return httpRequestForWechat(requestXml);

        }).then(function(reponseXml) {

            var parseXmlData = doXMLParse(reponseXml);

            var wechatTimeStamp = Math.round(calcTime() / 1000);

            prestr = '';
            prestr += 'appId=' + parseXmlData.xml.appid + '&';
            prestr += 'nonceStr=' + parseXmlData.xml.nonce_str + '&';
            prestr += 'package=' + 'prepay_id=' + parseXmlData.xml.prepay_id + '&';
            prestr += 'signType=' + sign_type + '&';
            prestr += 'timeStamp=' + wechatTimeStamp + '&';
            prestr += 'key=' + key;


            wechatReturnData.appId = parseXmlData.xml.appid + '';
            wechatReturnData.nonceStr = parseXmlData.xml.nonce_str + '';
            wechatReturnData.package = 'prepay_id=' + parseXmlData.xml.prepay_id;
            wechatReturnData.signType = sign_type;
            wechatReturnData.timeStamp = wechatTimeStamp + '';
            wechatReturnData.out_trade_no = out_trade_no + '';


            return md5sign(prestr, input_charset);
        }).then(function(prePaySign) {
            wechatReturnData.prepaySign = prePaySign;
            util.log('wechatBuildRequest', '', 'success');
            resolve(wechatReturnData);
        }).catch(function(e) {
            console.log(e);
            // console.log(e.statusText);
        });
    });
}

exports.wechatNotify = function(reponseXml) {
    return new Promise(function(resolve, reject) {
        var wechatResultData = {};
        var parseXmlData = doXMLParse(reponseXml);
        wechatResultData.return_code = parseXmlData.xml.return_code;
        wechatResultData.out_trade_no = parseXmlData.xml.out_trade_no;
        resolve(wechatResultData);
    });
}

exports.wechatTradeQuery = function(out_trade_no) {
    return new Promise(function(resolve, reject) {
        var nonce_str = createNonceStr().replace('-', '').toUpperCase();
        var input_charset = 'utf-8';

        var prestr = 'appid=' + appid + '&';
        prestr += 'mch_id=' + mch_id + '&';
        prestr += 'nonce_str=' + nonce_str + '&';
        prestr += 'out_trade_no=' + out_trade_no + '&';
        prestr += 'key=' + key;

        md5sign(prestr, input_charset).then(function(my_sign) {
            var requestXml = '<xml>';
            requestXml += '<appid>' + appid + '</appid>';
            requestXml += '<mch_id>' + mch_id + '</mch_id>';
            requestXml += '<nonce_str>' + nonce_str + '</nonce_str>';
            requestXml += '<out_trade_no>' + out_trade_no + '</out_trade_no>';
            requestXml += '<sign>' + '<![CDATA[' + my_sign + ']]>' + '</sign>';
            requestXml += '</xml>';
            return httpRequestForOrderQuery(requestXml);
        }).then(function(reponseXml) {
            var parseXmlData = doXMLParse(reponseXml);
            resolve(parseXmlData);
        })
    });
}

exports.wechatRefundRequest = function(out_trade_no, refund_fee) {
    return new Promise(function(resolve, reject) {
        var nonce_str = createNonceStr().replace('-', '').toUpperCase();
        var input_charset = 'utf-8';

        var wechatReturnData = {};

        if (refund_fee.split('.')[1].length > 1) {
            refund_fee = refund_fee.replace('.', '');
            refund_fee = parseInt(refund_fee);
        } else {
            refund_fee = refund_fee + '0';
            refund_fee = refund_fee.replace('.', '');
            refund_fee = parseInt(refund_fee);
        }

        var prestr = 'appid=' + appid + '&';
        prestr += 'mch_id=' + mch_id + '&';
        prestr += 'nonce_str=' + nonce_str + '&';
        prestr += 'op_user_id=' + mch_id + '&';
        prestr += 'out_refund_no=' + out_trade_no + '&';
        prestr += 'out_trade_no=' + out_trade_no + '&';
        prestr += 'refund_fee=' + refund_fee + '&';
        prestr += 'total_fee=' + refund_fee + '&';
        // prestr += 'transaction_id=' + out_trade_no + '&';
        prestr += 'key=' + key;

        md5sign(prestr, input_charset).then(function(my_sign) {
            var requestXml = '<xml>';
            requestXml += '<appid>' + appid + '</appid>';
            requestXml += '<mch_id>' + mch_id + '</mch_id>';
            requestXml += '<nonce_str>' + nonce_str + '</nonce_str>';
            requestXml += '<op_user_id>' + mch_id + '</op_user_id>';
            requestXml += '<out_refund_no>' + out_trade_no + '</out_refund_no>';
            requestXml += '<out_trade_no>' + out_trade_no + '</out_trade_no>';
            requestXml += '<refund_fee>' + refund_fee + '</refund_fee>';
            requestXml += '<total_fee>' + refund_fee + '</total_fee>';
            // requestXml += '<transaction_id>' + out_trade_no + '</transaction_id>';
            requestXml += '<sign>' + '<![CDATA[' + my_sign + ']]>' + '</sign>';
            requestXml += '</xml>';
            return httpRequestForRefundRequest(requestXml);
        }).then(function(reponseXml) {
            var parseXmlData = doXMLParse(reponseXml);
            console.log(parseXmlData);
            wechatReturnData.return_code = parseXmlData.xml.return_code[0];
            if (wechatReturnData.return_code == 'SUCCESS') {
                wechatReturnData.result_code = parseXmlData.xml.result_code[0];
            }
            resolve(wechatReturnData);
        })
    });
}

exports.wechatRefundQuery = function(out_trade_no) {
    return new Promise(function(resolve, reject) {
        var nonce_str = createNonceStr().replace('-', '').toUpperCase();
        var input_charset = 'utf-8';

        var wechatReturnData = {};

        var prestr = 'appid=' + appid + '&';
        prestr += 'mch_id=' + mch_id + '&';
        prestr += 'nonce_str=' + nonce_str + '&';
        prestr += 'out_trade_no=' + out_trade_no + '&';
        prestr += 'key=' + key;

        md5sign(prestr, input_charset).then(function(my_sign) {
            var requestXml = '<xml>';
            requestXml += '<appid>' + appid + '</appid>';
            requestXml += '<mch_id>' + mch_id + '</mch_id>';
            requestXml += '<nonce_str>' + nonce_str + '</nonce_str>';
            requestXml += '<out_trade_no>' + out_trade_no + '</out_trade_no>';
            requestXml += '<sign>' + '<![CDATA[' + my_sign + ']]>' + '</sign>';
            requestXml += '</xml>';
            return httpRequestForRefundQuery(requestXml);
        }).then(function(reponseXml) {
            var parseXmlData = doXMLParse(reponseXml);
            console.log(parseXmlData);
            wechatReturnData.return_code = parseXmlData.xml.return_code[0];
            if (wechatReturnData.return_code == 'SUCCESS') {
                wechatReturnData.result_code = parseXmlData.xml.result_code[0];
            }
            resolve(wechatReturnData);
        })
    });
}
