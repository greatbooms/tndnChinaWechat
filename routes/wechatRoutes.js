var express = require('express');
var router = express.Router();
var mobilePayModule = require('../references/wechatPay.js');
var util = require('../references/utility.js');
//html parse
var request = require('request');
///////////////
var mysql = require('mysql');
var databaseConfig = require('../references/databaseConfig.js');
var pool = mysql.createPool(databaseConfig);

router.post('/wechatSign', function(req, res, next) {
  var rmbFee = req.body.priceChnSale;
  var resName = req.body.resName;
  var openId = req.body.openid;
  var remoteIp = req.connection.remoteAddress;

  if (remoteIp.split(':').length > 3) {
    remoteIp = remoteIp.split(':')[3]
  }

  mobilePayModule.wechatBuildRequest(rmbFee, resName, openId, remoteIp).then(function(returnData) {
    console.log('*******************');
    console.log(returnData);
    // var instantOrderData = 'idxAppUser=' + '';
    // instantOrderData += '&' + 'idxStore=' + req.body.idx;
    // instantOrderData += '&' + 'nameStoreKor=' + req.body.resKorName;
    // instantOrderData += '&' + 'nameStoreChn=' + req.body.resName;
    // instantOrderData += '&' + 'data=' + req.body.data;
    // instantOrderData += '&' + 'currency=' + req.body.currency;
    // instantOrderData += '&' + 'priceKor=' + req.body.priceKor;
    // instantOrderData += '&' + 'priceSaleKor=' + req.body.priceKorSale;
    // instantOrderData += '&' + 'priceChn=' + req.body.priceChn;
    // instantOrderData += '&' + 'priceSaleChn=' + req.body.priceChnSale;
    // instantOrderData += '&' + 'outTradeNo=' + returnData.out_trade_no;
    // instantOrderData += '&' + 'payType=' + '121';
    // instantOrderData += '&' + 'userCode=' + req.body.usercode;
    // instantOrderData += '&' + 'feeType=' + req.body.feeType;
    // instantOrderData += '&' + 'storeCommissionRate=' + req.body.storeCommissionRate;
    // instantOrderData += '&' + 'customerCommissionRate=' + req.body.customerCommissionRate;
    // instantOrderData += '&' + 'os=' + req.body.os;
    // request.post({
    //   headers: { 'content-type': 'application/x-www-form-urlencoded' },
    //   url: 'http://tndnchina.cn/setOrder',
    //   body: instantOrderData
    // }, function(error, response, body) {
    //   console.log(body);
    //   util.returnHeader(res);
    //   util.returnBody(res, 'wechatpaySign', returnData);
    //   util.returnFooter(res);
    // });
    // logger.info('id = ' + req.body.idx + ' storeName = ' + req.body.resKorName + ' korPrice = ' + req.body.priceKor + ' chnPrice = ' + req.body.priceChnSale + ' outTradeNo = ' + returnData.out_trade_no + ' wechatpaySign');
  console.log('wechatSign');
  });
});

router.post('/wechatNotify', function(req, res, next) {
  var responseXml = [];
  req.on('data', function(chunk) {
    responseXml.push(chunk);
  }).on('end', function() {
    responseXml = Buffer.concat(responseXml).toString();
    mobilePayModule.wechatNotify(responseXml).then(function(returnData) {
      if (returnData.return_code == 'SUCCESS') {
        pool.getConnection(function(err, connection) {
          if (err) {
            logger.error('outTradeNo = ' + returnData.out_trade_no + ' getConnection error!');
            return;
          }
          var query = 'SELECT ';
          query += 'idx_store, ';
          query += 'name_store_kor, ';
          query += 'price_kor, ';
          query += 'price_sale_chn, '
          query += 'out_trade_no, ';
          query += 'user_code, ';
          query += 'user_is, ';
          query += 'os, ';
          query += 'pay_success ';
          query += 'FROM ';
          query += 'store_instant_pay_history ';
          query += 'WHERE ';
          query += 'out_trade_no = ' + '\"' + returnData.out_trade_no + '\"';
          connection.query(query, function(err, rows) {
            connection.release();
            if (rows.length == 0) {
              logger.info('wechatNotify Error no search out_trade_no!!');
              res.write('error!');
              res.end();
            } else {
              if (rows[0].pay_success == '0') {
                // var instantPayData = 'thisIs=' + 'instant';
                // instantPayData += '&' + 'id=' + rows[0].idx_store;
                // instantPayData += '&' + 'outTradeNo=' + rows[0].out_trade_no;
                // instantPayData += '&' + 'userCode=' + rows[0].user_code;
                // instantPayData += '&' + 'os=' + rows[0].os;
                // request.post({
                //   headers: { 'content-type': 'application/x-www-form-urlencoded' },
                //   url: 'http://52.69.30.53:505/setStorePay',
                //   body: instantPayData
                // }, function(error, response, body) {
                //   logger.info('id = ' + rows[0].idx_store + ' storeName = ' + rows[0].name_store_kor + ' korPrice = ' + rows[0].price_kor + ' chnPrice = ' + rows[0].price_sale_chn + ' outTradeNo = ' + returnData.out_trade_no + ' wechatNotifySuccess');
                // });
              } else {
                logger.info('id = ' + rows[0].idx_store + ' storeName = ' + rows[0].name_store_kor + ' korPrice = ' + rows[0].price_kor + ' chnPrice = ' + rows[0].price_sale_chn + ' outTradeNo = ' + returnData.out_trade_no + ' already send sms data!');
              }
              res.write('<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>');
              res.end();
            }
          });
        })
      } else {
        res.write('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[PAYFAIL]]></return_msg></xml>');
        res.end();
      }
    });
  });
});

router.post('/wechatTradeQuery', function(req, res, next) {
  mobilePayModule.wechatTradeQuery(req.body.tradeTrace).then(function(returnData) {
    var jsonObject;
    var returnJson = {};
    console.log(returnData);
    if (returnData.xml.return_code[0] == 'SUCCESS' && returnData.xml.result_code[0] == 'SUCCESS') {
      if (returnData.xml.trade_state[0] == 'SUCCESS') {
        pool.getConnection(function(err, connection) {
          if (err) {
            logger.error('outTradeNo = ' + req.body.tradeTrace + 'paygate wechat TradeQuery getConnection error!');
            logger.error(err.stack);
            returnJson.result = '2';
            res.write(JSON.stringify(returnJson));
            res.end();
            return;
          }
          var query = 'SELECT ';
          query += 'idx_store, ';
          query += 'name_store_kor, ';
          query += 'price_kor, ';
          query += 'price_sale_chn, '
          query += 'out_trade_no, ';
          query += 'user_code, ';
          query += 'os, ';
          query += 'pay_success ';
          query += 'FROM ';
          query += 'store_instant_pay_history ';
          query += 'WHERE ';
          query += 'out_trade_no = ' + '\"' + req.body.tradeTrace + '\"';
          connection.query(query, function(err, rows) {
            connection.release();
            if (rows.length == 0) {
              logger.info('wechatPaygateTradeQuery Error no search out_trade_no!!');
              returnJson.result = '0'; //fail
              res.write(JSON.stringify(returnJson));
              res.end();
              return;
            } else {
              if (rows[0].pay_success == '0') {
                var instantPayData = 'thisIs=' + 'instant';
                instantPayData += '&' + 'id=' + rows[0].idx_store;
                instantPayData += '&' + 'outTradeNo=' + rows[0].out_trade_no;
                instantPayData += '&' + 'userCode=' + rows[0].user_code;
                instantPayData += '&' + 'os=' + rows[0].os;
                request.post({
                  headers: { 'content-type': 'application/x-www-form-urlencoded' },
                  url: 'http://52.69.30.53:505/setStorePay',
                  body: instantPayData
                }, function(error, response, body) {
                  try {
                    jsonObject = JSON.parse(body);
                  } catch (err) {
                    logger.error('outTradeNo = ' + req.body.tradeTrace + 'wechatPaygateTradeQuery JSON Parse error!');
                    logger.error(err.stack);
                    returnJson.result = '2'; //error
                    res.write(JSON.stringify(returnJson));
                    res.end();
                    return;
                  }
                  if (jsonObject.result == 'success') {
                    returnJson.result = '1'; //success
                    res.write(JSON.stringify(returnJson));
                    res.end();
                    return;
                  }
                });
              } else {
                returnJson.result = '0'; //fail
                res.write(JSON.stringify(returnJson));
                res.end();
                return;
              }
            }
          });
        });
      } else {
        returnJson.result = '0'; //fail
        res.write(JSON.stringify(returnJson));
        res.end();
        return;
      }
    } else {
      returnJson.result = '0'; //fail
      res.write(JSON.stringify(returnJson));
      res.end();
      return;
    }
  });
});

router.post('/wechatRefundRequest', function(req, res, next) {
  var out_trade_no = req.body.tradeTrace;
  var idxStore = req.body.idxStore;
  mobilePayModule.wechatRefundRequest(req.body.tradeTrace, req.body.refundFee).then(function(returnData) {
    var jsonObject;
    var returnJson = {};
    if (returnData.return_code == 'SUCCESS') {
      var refundData = 'outTradeNo=' + out_trade_no;
      refundData += '&' + 'idxStore=' + idxStore;
      request.post({
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        // url: 'http://52.69.30.53:505/refundSuccess',
        url: 'http://52.69.34.17:505/refundSuccess',
        body: refundData
      }, function(error, response, body) {
        try {
          jsonObject = JSON.parse(body);
        } catch (err) {
          logger.error('id = ' + idxStore + ' outTradeNo = ' + out_trade_no + ' wechat refund Success JSON Parse error!');
          logger.error(err.stack);
          returnJson.result = '2'; //error
          res.write(JSON.stringify(returnJson));
          res.end();
          return;
        }
        if (jsonObject.result == 'success') {
          logger.info('id = ' + idxStore + ' outTradeNo = ' + out_trade_no + ' wechat refund Success!');
          returnJson.result = '1'; //success
          res.write(JSON.stringify(returnJson));
          res.end();
          return;
        } else {
          logger.info('id = ' + idxStore + ' outTradeNo = ' + out_trade_no + ' wechat refund Fail!');
          returnJson.result = '0'; //fail
          res.write(JSON.stringify(returnJson));
          res.end();
          return;
        }
      });
    } else {
      logger.info('id = ' + idxStore + ' outTradeNo = ' + out_trade_no + ' wechat refund Fail!');
      returnJson.result = '0'; //fail
      res.write(JSON.stringify(returnJson));
      res.end();
      return;
    }
  });
});

router.post('/wechatRefundQuery', function(req, res, next) {
  var out_trade_no = req.body.tradeTrace;
  var idxStore = req.body.idxStore;
  mobilePayModule.wechatRefundQuery(req.body.tradeTrace).then(function(returnData) {
    var jsonObject;
    var returnJson = {};
    if (returnData.return_code == 'SUCCESS') {
      var refundData = 'outTradeNo=' + out_trade_no;
      refundData += '&' + 'idxStore=' + idxStore;
      request.post({
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        // url: 'http://52.69.30.53:505/refundSuccess',
        url: 'http://52.69.34.17:505/refundSuccess',
        body: refundData
      }, function(error, response, body) {
        try {
          jsonObject = JSON.parse(body);
        } catch (err) {
          logger.error('id = ' + idxStore + ' outTradeNo = ' + out_trade_no + ' wechat refund Success JSON Parse error!');
          logger.error(err.stack);
          returnJson.result = '2'; //error
          res.write(JSON.stringify(returnJson));
          res.end();
          return;
        }
        if (jsonObject.result == 'success') {
          logger.info('id = ' + idxStore + ' outTradeNo = ' + out_trade_no + ' wechat refund Success!');
          returnJson.result = '1'; //success
          res.write(JSON.stringify(returnJson));
          res.end();
          return;
        } else if (jsonObject.data == 'already-refunded') {
          logger.info('id = ' + idxStore + ' outTradeNo = ' + out_trade_no + ' wechat refund Fail!');
          returnJson.result = '1'; //success
          res.write(JSON.stringify(returnJson));
          res.end();
          return;
        } else {
          logger.info('id = ' + idxStore + ' outTradeNo = ' + out_trade_no + ' wechat refund Fail!');
          returnJson.result = '0'; //fail
          res.write(JSON.stringify(returnJson));
          res.end();
          return;
        }
      });
    } else {
      logger.info('id = ' + idxStore + ' outTradeNo = ' + out_trade_no + ' wechat refund Fail!');
      returnJson.result = '0'; //fail
      res.write(JSON.stringify(returnJson));
      res.end();
      return;
    }
  });
});


module.exports = router;
