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
    util.log('wechatSign', '', 'start');

    var form = new multiparty.Form();
    var inputArray = {};
    var remoteIp = req.connection.remoteAddress;
    var orderNumber = createOrderNo();

    // get field name & value
    form.on('field', function(name, value) {
        inputArray[name] = value;
        if (name == 'idx_goods') {
            inputArray.idx_goodss.push({ "idx_goods": value })
        } else if (name == 'quantity') {
            inputArray.quantitys.push({ "quantity": value })
        }
        util.log('wechatSign', 'normal field / name = ' + name + ' , value = ' + value);

    });

    // file upload handling
    form.on('part', function(part) {
        part.on('data', function(chunk) {});
        part.on('end', function() {});
    });


    if (remoteIp.split(':').length > 3) {
        remoteIp = remoteIp.split(':')[3]
    }
    form.on('close', function() {
        mobilePayModule.wechatBuildRequest(inputArray.total_price, inputArray.chn_title, inputArray.openid, remoteIp, orderNumber).then(function(returnData) {
            var historyQuery = 'INSERT INTO order_history(idx_user, total_price, order_number, pay_status, delivery_status, insert_date) ' + ' VALUES(\"' + inputArray.idx_user + '\", \"' + inputArray.total_price + '\", \"' + orderNumber + '\", 0, 0, now());';
            var historyDetailQuery = 'INSERT INTO order_history_detail_items(idx_order_history, idx_goods, quantity) VALUES ';

            // if idx_goods and quantity array size different, throw error
            if (inputArray.idx_goodss.length != inputArray.quantitys.length) {
                util.log('wechatSign', 'different goods and quantity size FAIL');

                res.contentType('application/json; charset=utf-8');
                res.end(JSON.stringify({ result: "different goods and quantity size FAIL" }));
                return;
            }
            databasePool.getConnection(function(err, connection) {
                connection.query(historyQuery, function(error, rows, fields) {
                    connection.release();
                    var idxOrderHistory = rows.insertId;

                    util.log('wechatSign', 'insert order_history');

                    if (error) throw error;
                    for (var i = 0; i < inputArray.idx_goodss.length; i++) {
                        historyDetailQuery = historyDetailQuery + ' (' + idxOrderHistory + ', ' + inputArray.idx_goodss[i].idx_goods + ', ' + inputArray.quantitys[i].quantity + '),';

                        if (i == inputArray.idx_goodss.length - 1) {
                            //last array
                            //have to delete last comma(,) and write semicolon(;)
                            //and execute insert query
                            historyDetailQuery = historyDetailQuery.substring(0, historyDetailQuery.length - 1) + ';';

                            util.log('wechatSign', 'insert order_history_detail  ' + orderNumber);
                            connection.query(historyDetailQuery, function(error2, rows2, fields2) {
                                if (error2) throw error2;
                                util.log('wechatSign', '', 'success');

                                util.returnHeader(res);
                                util.returnBody(res, 'wechatpaySign', returnData);
                                util.returnFooter(res);

                            });
                        } //end if last array check
                    } //end for
                });
            });


        });
    }); //end form close


});

router.post('/wechatNotify', function(req, res, next) {
    util.log('wechatNotify', '', 'start');

    var responseXml = [];
    req.on('data', function(chunk) {
        responseXml.push(chunk);
    }).on('end', function() {
        responseXml = Buffer.concat(responseXml).toString();
        mobilePayModule.wechatNotify(responseXml).then(function(returnData) {
            if (returnData.return_code == 'SUCCESS') {
                databasePool.getConnection(function(err, connection) {
                        if (err) {
                            util.log('wechatNotify', 'outTradeNo = ' + returnData.out_trade_no + ' getConnection error!');
                            return;
                        }

                        var query = 'UPDATE order_history ';
                        query += 'SET ';
                        query += 'pay_status = 1, update_date=now() ';
                        query += 'WHERE ';
                        query += 'pay_status=0 ';
                        query += 'AND ';
                        query += 'order_number = ' + '\"' + returnData.out_trade_no + '\"';


                        connection.query(query, function(err, rows) {
                            console.log(rows);
                            if (rows.affectedRows == 0) {
                                //해당하는 값이 없음
                                util.log('wechatNotify', 'wechatNotify Error out_trade_no!!');
                                res.write('error!');
                                res.end();
                            } else {
                                res.write('<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>');
                                res.end();
                            }

                        }); //end connection
                    }) //end pool
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
