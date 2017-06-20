var express = require('express');
var router = express.Router();
var multiparty = require('multiparty');
var fs = require('fs');
var Promise = require('bluebird');
var util = require('../references/utility.js');
var databasePool = require('../references/databaseConfig.js');
var qs = require('qs');
var request = require('request');

router.get('/getImage', function(req, res, next) {
    var id = req.query.idx;
    if (!util.valueValidation(id)) {
        util.log('getImage', 'idx FAIL');

        res.contentType('application/json; charset=utf-8');
        res.end(JSON.stringify({}));
        return;
    }

    var queryStr = 'SELECT ';
    queryStr += 'save_file_name, ';
    queryStr += 'original_file_name, ';
    queryStr += 'content_type, ';
    queryStr += 'file_size ';
    queryStr += 'FROM image_file_path ';
    queryStr += 'WHERE id = ' + id + ' ';
    queryStr += 'AND status_flag != 3';
    util.log('getImage', queryStr);
    databasePool.getConnection(function(err, connection) {
        connection.query(queryStr, function(error, rows, fields) {
            connection.release();
            var img;
            if (rows.length > 0) {
                img = fs.readFileSync('/storage/goodsImage/' + rows[0].save_file_name);
                res.writeHead(200, { 'Content-Type': rows[0].content_type });
            }
            res.end(img, 'binary');
        });
    });
});

router.get('/getGoodsList', function(req, res, next) {
    util.log('getGoodsList', '', 'start');

    var major_class = req.query.idx_goods_major_classification;
    var sub_class = req.query.idx_goods_sub_classification;
    var queryStr = 'SELECT ';
    queryStr += 'goods.id, ';
    queryStr += 'goods.idx_goods_classification, ';
    queryStr += 'goods.price, ';
    queryStr += 'goods.chn_title, ';
    queryStr += 'goods.kor_title, ';
    queryStr += '(SELECT idx_image_file FROM goods_image WHERE top_flag = 1 AND idx_goods = goods.id ORDER BY update_date, id LIMIT 1) AS idx_image ';
    queryStr += 'FROM goods goods, ';
    queryStr += 'goods_sub_classification goods_sub ';
    queryStr += 'WHERE goods.idx_goods_classification = goods_sub.id ';
    queryStr += 'AND goods.status_flag != 3 ';
    if (major_class != undefined)
        queryStr += 'AND goods_sub.idx_major_classification = ' + major_class + ' ';
    if (sub_class != undefined)
        queryStr += 'AND goods_sub.id = ' + sub_class + ' ';

    util.log('getGoodsList', queryStr);

    databasePool.getConnection(function(err, connection) {
        connection.query(queryStr, function(error, rows, fields) {
            connection.release();
            if (error) {
                util.log('getGoodsList', error.message);
                res.contentType('application/json; charset=utf-8');
                res.end(JSON.stringify({}));
            } else {
                util.log('getGoodsList', '', 'success');
                res.contentType('application/json; charset=utf-8');
                res.end(JSON.stringify(rows));
            }
        });
    });
});

router.get('/getGoodsDetailInfo', function(req, res, next) {
    util.log('getGoodsDetailInfo', '', 'start');
    var idx_goods = req.query.idx_goods;
    var returnJson = {};
    if (!util.valueValidation(idx_goods)) {
        util.log('getGoodsDetailInfo', 'idx_goods FAIL');

        res.contentType('application/json; charset=utf-8');
        res.end(JSON.stringify({}));
        return;
    }
    var queryStr = 'SELECT ';
    queryStr += 'goods.id, ';
    queryStr += 'goods.idx_goods_classification, ';
    queryStr += 'goods.price, ';
    queryStr += 'goods.chn_title, ';
    queryStr += 'goods.chn_title, ';
    queryStr += 'goods.chn_info, ';
    queryStr += 'goods_sub.chn_name '
    queryStr += 'FROM goods goods, ';
    queryStr += 'goods_sub_classification goods_sub ';
    queryStr += 'WHERE goods.idx_goods_classification = goods_sub.id ';
    queryStr += 'AND goods.status_flag != 3 ';
    queryStr += 'AND goods.id = ' + idx_goods + ' ';

    util.log('getGoodsDetailInfo', queryStr);
    databasePool.getConnection(function(err, connection) {
        connection.query(queryStr, function(error, rows, fields) {
            if (error) throw error
            returnJson.goodsInfo = rows;
            var queryStr = 'SELECT ';
            queryStr += 'id, ';
            queryStr += 'idx_image_file, ';
            queryStr += 'top_flag ';
            queryStr += 'FROM goods_image ';
            queryStr += 'WHERE status_flag != 3 ';
            queryStr += 'AND top_flag = 1 ';
            queryStr += 'AND idx_goods = ' + idx_goods + ' ';

            util.log('getGoodsDetailInfo', 'goodsInfo success');
            connection.query(queryStr, function(error, rows2, fields) {
                if (error) throw error

                returnJson.goodsTopImage = rows2;
                var queryStr = 'SELECT ';
                queryStr += 'id, ';
                queryStr += 'idx_image_file, ';
                queryStr += 'top_flag ';
                queryStr += 'FROM goods_image ';
                queryStr += 'WHERE status_flag != 3 ';
                queryStr += 'AND top_flag = 0 ';
                queryStr += 'AND idx_goods = ' + idx_goods + ' ';
                util.log('getGoodsDetailInfo', 'goodsTopImage success');
                connection.query(queryStr, function(error, rows3, fields) {
                    if (error) throw error

                    returnJson.goodsDetailImage = rows3;
                    connection.release();
                    util.log('getGoodsDetailInfo', 'goodsDetailImage success');
                    util.log('getGoodsDetailInfo', '', 'success');

                    res.contentType('application/json; charset=utf-8');
                    res.end(JSON.stringify(returnJson));
                });
            });
        });
    });
});

router.post('/setCartItem', function(req, res, next) {
    util.log('setCartItem', '', 'start');

    var form = new multiparty.Form();
    var inputArray = {};

    // get field name & value
    form.on('field', function(name, value) {
        inputArray[name] = value;
        util.log('setCartItem', 'normal field / name = ' + name + ' , value = ' + value);

    });

    // file upload handling
    form.on('part', function(part) {
        part.on('data', function(chunk) {});
        part.on('end', function() {});
    });

    // all uploads are completed
    form.on('close', function() {
        var queryStr = 'SELECT ';
        queryStr += '* ';
        queryStr += 'FROM cart ';
        queryStr += 'WHERE status_flag != 3 ';
        queryStr += 'AND idx_user = ' + inputArray.idx_user + ' ';
        queryStr += 'AND idx_goods = ' + inputArray.idx_goods + ' ';
        util.log('setCartItem', queryStr);

        databasePool.getConnection(function(err, connection) {
            connection.query(queryStr, function(error, rows, fields) {
                if (error) {
                    util.log('setCartItem', error.message);
                    res.contentType('application/json; charset=utf-8');
                    res.end(JSON.stringify({ result: "FAIL" }));
                } else {
                    console.log(rows.length);
                    if (rows.length != 0) {
                        queryStr = 'UPDATE cart ';
                        queryStr += 'SET quantity = quantity + 1, ';
                        queryStr += 'status_flag = 2, ';
                        queryStr += 'update_date = NOW() ';
                        queryStr += 'WHERE idx_user = ' + inputArray.idx_user + ' ';
                        queryStr += 'AND idx_goods = ' + inputArray.idx_goods + ' ';
                        queryStr += 'AND status_flag != 3';
                    } else {
                        queryStr = 'INSERT INTO cart(';
                        queryStr += 'idx_user, ';
                        queryStr += 'idx_goods, ';
                        queryStr += 'quantity, ';
                        queryStr += 'status_flag, ';
                        queryStr += 'insert_date) ';
                        queryStr += 'VALUES(';
                        queryStr += inputArray.idx_user + ', ';
                        queryStr += inputArray.idx_goods + ', ';
                        queryStr += '1, ';
                        queryStr += '1, ';
                        queryStr += 'NOW())';
                    }
                    util.log('setCartItem', queryStr);
                    connection.query(queryStr, function(error, rows, fields) {
                        if (error) {
                            util.log('setCartItem', error.message);

                            res.contentType('application/json; charset=utf-8');
                            res.end(JSON.stringify({ result: "FAIL" }));
                        } else {
                            util.log('setCartItem', '', 'success');

                            res.contentType('application/json; charset=utf-8');
                            res.end(JSON.stringify({ result: "SUCCESS" }));
                        }
                    });
                }
            });
            connection.release();
        });
    });

    // track progress
    form.on('progress', function(byteRead, byteExpected) {
        // console.log(' Reading total  ' + byteRead + '/' + byteExpected);
    });
    form.parse(req);
});

router.get('/getCartItem', function(req, res, next) {
    util.log('getCartItem', '', 'start');

    var major_class = req.query.idx_user;

    if (!util.valueValidation(major_class)) {
        util.log('getGoodsDetailInfo', 'idx_user FAIL');

        res.contentType('application/json; charset=utf-8');
        res.end(JSON.stringify({}));
        return;
    }


    var queryStr = 'SELECT ';
    queryStr += 'cart.id, ';
    queryStr += 'goods.chn_title, ';
    queryStr += 'goods.chn_subtitle, ';
    queryStr += 'goods.price, ';
    queryStr += 'cart.quantity, ';
    queryStr += '(SELECT idx_image_file FROM goods_image WHERE top_flag = 1 AND idx_goods = goods.id ORDER BY update_date, id LIMIT 1) AS idx_image ';
    queryStr += 'FROM cart cart, goods goods ';
    queryStr += 'WHERE cart.idx_goods = goods.id ';
    queryStr += 'AND cart.status_flag != 3 ';
    queryStr += 'AND goods.status_flag != 3 ';
    queryStr += 'AND cart.idx_user = ' + major_class + ' ';





    util.log('getCartItem', queryStr);
    databasePool.getConnection(function(err, connection) {
        connection.query(queryStr, function(error, rows, fields) {
            connection.release();
            if (error) {
                util.log('getCartItem', error.message);

                res.contentType('application/json; charset=utf-8');
                res.end(JSON.stringify({}));
            } else {
                util.log('getCartItem', '', 'success');

                res.contentType('application/json; charset=utf-8');
                res.end(JSON.stringify(rows));
            }
        });
    });
});

router.put('/updateCartItem', function(req, res, next) {
    util.log('updateCartItem', '', 'start');

    var form = new multiparty.Form();
    var inputArray = { idx_carts: [], quantitys: [] };

    // get field name & value
    form.on('field', function(name, value) {
        inputArray[name] = value;
        if (name == 'idx_cart') {
            inputArray.idx_carts.push({ "idx_cart": value })
        } else if (name == 'quantity') {
            inputArray.quantitys.push({ "quantity": value })
        }
        util.log('updateCartItem', 'normal field / name = ' + name + ' , value = ' + value);

    });

    // file upload handling
    form.on('part', function(part) {
        part.on('data', function(chunk) {});
        part.on('end', function() {});
    });

    // all uploads are completed
    form.on('close', function() {
        for (var i = 0; i < inputArray.idx_carts.length; i++) {
            var queryStr = 'UPDATE cart ';
            queryStr += 'SET quantity = ' + inputArray.quantitys[i].quantity + ', ';
            queryStr += 'status_flag = 2, ';
            queryStr += 'update_date = NOW() ';
            queryStr += 'WHERE id = ' + inputArray.idx_carts[i].idx_cart;

            util.log('updateCartItem', queryStr);
            databasePool.getConnection(function(err, connection) {
                connection.query(queryStr, function(error, rows, fields) {
                    if (error) throw error;
                });
                connection.release();
            });
        }
        util.log('updateCartItem', '', 'success');

        res.contentType('application/json; charset=utf-8');
        res.end(JSON.stringify({ result: "SUCCESS" }));
    });

    // track progress
    form.on('progress', function(byteRead, byteExpected) {
        // console.log(' Reading total  ' + byteRead + '/' + byteExpected);
    });
    form.parse(req);
});

router.delete('/deleteCartItem', function(req, res, next) {
    util.log('deleteCartItem', '', 'start');

    var cartId = req.query.idx_cart;

    // console.log(req.body);
    // console.log(req.query);
    // console.log(req.param);

    // console.log('cartId = ' + cartId);

    var queryStr = 'UPDATE cart ';
    queryStr += 'SET status_flag = 3, ';
    queryStr += 'update_date = NOW() ';
    queryStr += 'WHERE id = ' + cartId;

    util.log('deleteCartItem', queryStr);
    databasePool.getConnection(function(err, connection) {
        connection.query(queryStr, function(error, rows, fields) {
            connection.release();
            if (error) {
                util.log('deleteCartItem', error.message);

                res.contentType('application/json; charset=utf-8');
                res.end(JSON.stringify({ result: "FAIL" }));
            } else {
                util.log('deleteCartItem', '', 'success');

                res.contentType('application/json; charset=utf-8');
                res.end(JSON.stringify({ result: "SUCCESS" }));
            }
        });
    });
});


router.get('/getAreacode', function(req, res, next) {
    util.log('getAreacode', '', 'start');

    var topno = req.query.topno;

    var queryStr = 'SELECT ';
    queryStr += 'id, ';
    queryStr += 'areaname, ';
    queryStr += 'no, ';
    queryStr += 'topno, ';
    queryStr += 'areacode, ';
    queryStr += 'arealevel, ';
    queryStr += 'typename ';
    queryStr += 'FROM quan_prov_city_area ';
    queryStr += 'WHERE topno = ' + topno + ' ';
    queryStr += 'ORDER BY no';

    util.log('getAreacode', queryStr);
    databasePool.getConnection(function(err, connection) {
        connection.query(queryStr, function(error, rows, fields) {
            connection.release();
            if (error) {
                util.log('getAreacode', error.message);

                res.contentType('application/json; charset=utf-8');
                res.end(JSON.stringify({}));
            } else {
                util.log('getAreacode', '', 'success');

                res.contentType('application/json; charset=utf-8');
                res.end(JSON.stringify(rows));
            }
        });
    });
});

router.post('/setUserAddress', function(req, res, next) {
    util.log('setUserAddress', '', 'start');

    var form = new multiparty.Form();
    var inputArray = {};

    // get field name & value
    form.on('field', function(name, value) {
        inputArray[name] = value;
        util.log('setUserAddress', 'normal field / name = ' + name + ' , value = ' + value);

    });

    // file upload handling
    form.on('part', function(part) {
        part.on('data', function(chunk) {});
        part.on('end', function() {});
    });

    // all uploads are completed
    form.on('close', function() {
        if (!util.valueValidation(inputArray.idx_user)) {
            util.log('setUserAddress', 'idx_user FAIL');

            res.contentType('application/json; charset=utf-8');
            res.end(JSON.stringify({ result: "idx_user FAIL" }));
            return;
        } else if (!util.valueValidation(inputArray.weixin_id)) {
            util.log('setUserAddress', 'weixin_id FAIL');

            res.contentType('application/json; charset=utf-8');
            res.end(JSON.stringify({ result: "weixin_id FAIL" }));
            return;
        }
        var queryStr = 'INSERT INTO user_address(';
        queryStr += 'idx_user, ';
        queryStr += 'weixin_id, ';
        queryStr += 'name, ';
        queryStr += 'contacts, ';
        queryStr += 'zip_code, ';
        queryStr += 'address_1, ';
        queryStr += 'address_2, ';
        queryStr += 'address_3, ';
        queryStr += 'address_detail, ';
        queryStr += 'status_flag, ';
        queryStr += 'insert_date) ';
        queryStr += 'VALUES(';
        queryStr += inputArray.idx_user + ', ';
        queryStr += '"' + inputArray.weixin_id + '", ';
        queryStr += '"' + inputArray.name + '", ';
        queryStr += '"' + inputArray.contacts + '", ';
        queryStr += '"' + inputArray.zip_code + '", ';
        queryStr += '"' + inputArray.address_1 + '", ';
        queryStr += '"' + inputArray.address_2 + '", ';
        queryStr += '"' + inputArray.address_3 + '", ';
        queryStr += '"' + inputArray.address_detail + '", ';
        queryStr += '1, ';
        queryStr += 'NOW())';

        util.log('setUserAddress', queryStr);
        databasePool.getConnection(function(err, connection) {
            connection.query(queryStr, function(error, rows, fields) {
                connection.release();
                if (error) {
                    util.log('setUserAddress', error.message);

                    res.contentType('application/json; charset=utf-8');
                    res.end(JSON.stringify({ result: "FAIL" }));
                } else {
                    util.log('setUserAddress', '', 'success');

                    res.contentType('application/json; charset=utf-8');
                    res.end(JSON.stringify({ result: "SUCCESS" }));
                }
            });
        });
    });

    // track progress
    form.on('progress', function(byteRead, byteExpected) {
        // console.log(' Reading total  ' + byteRead + '/' + byteExpected);
    });
    form.parse(req);
});

router.get('/getUserAddressList', function(req, res, next) {
    util.log('getUserAddressList', '', 'start');

    var idx_user = req.query.idx_user;

    // console.log('idx_user = ' + idx_user);

    if (!util.valueValidation(idx_user)) {
        util.log('getUserAddressList', 'idx_user FAIL');
        res.contentType('application/json; charset=utf-8');
        res.end(JSON.stringify({ result: "idx_user FAIL" }));
        return;
    }

    var queryStr = 'SELECT ';
    queryStr += 'id, ';
    queryStr += 'weixin_id, ';
    queryStr += 'name, ';
    queryStr += 'contacts, ';
    queryStr += 'zip_code, ';
    queryStr += '(SELECT areaname FROM quan_prov_city_area where no = address_1) as addressName_1, ';
    queryStr += '(SELECT areaname FROM quan_prov_city_area where no = address_2) as addressName_2, ';
    queryStr += '(SELECT areaname FROM quan_prov_city_area where no = address_3) as addressName_3, ';
    queryStr += 'address_detail ';
    queryStr += 'FROM user_address ';
    queryStr += 'WHERE status_flag != 3 ';
    queryStr += 'AND idx_user = ' + idx_user + ' ';

    util.log('getUserAddressList', queryStr);
    databasePool.getConnection(function(err, connection) {
        connection.query(queryStr, function(error, rows, fields) {
            connection.release();
            if (error) {
                util.log('getUserAddressList', error.message);

                res.contentType('application/json; charset=utf-8');
                res.end(JSON.stringify({}));
            } else {
                util.log('getUserAddressList', '', 'success');

                res.contentType('application/json; charset=utf-8');
                res.end(JSON.stringify(rows));
            }
        });
    });
});

router.get('/getUserAddressDetail', function(req, res, next) {
    util.log('getUserAddressDetail', '', 'start');

    var idx_address = req.query.idx_address;


    if (!util.valueValidation(idx_address)) {
        util.log('getUserAddressDetail', 'idx_address FAIL');

        res.contentType('application/json; charset=utf-8');
        res.end(JSON.stringify({ result: "idx_address FAIL" }));
        return;
    }

    var queryStr = 'SELECT ';
    queryStr += 'id, ';
    queryStr += 'weixin_id, ';
    queryStr += 'name, ';
    queryStr += 'contacts, ';
    queryStr += 'zip_code, ';
    queryStr += 'address_1, ';
    queryStr += 'address_2, ';
    queryStr += 'address_3, ';
    queryStr += 'address_detail ';
    queryStr += 'FROM user_address ';
    queryStr += 'WHERE status_flag != 3 ';
    queryStr += 'AND id = ' + idx_address + ' ';

    util.log('getUserAddressDetail', queryStr);
    databasePool.getConnection(function(err, connection) {
        connection.query(queryStr, function(error, rows, fields) {
            connection.release();
            if (error) {
                util.log('getUserAddressDetail', error.message);

                res.contentType('application/json; charset=utf-8');
                res.end(JSON.stringify({}));
            } else {
                util.log('getUserAddressDetail', '', 'success');

                res.contentType('application/json; charset=utf-8');
                res.end(JSON.stringify(rows));
            }
        });
    });
});

router.put('/updateUserAddress', function(req, res, next) {
    util.log('updateUserAddress', '', 'start');

    var form = new multiparty.Form();
    var inputArray = {};

    // get field name & value
    form.on('field', function(name, value) {
        inputArray[name] = value;
        util.log('updateUserAddress', 'normal field / name = ' + name + ' , value = ' + value);

    });

    // file upload handling
    form.on('part', function(part) {
        part.on('data', function(chunk) {});
        part.on('end', function() {});
    });

    // all uploads are completed
    form.on('close', function() {
        if (!util.valueValidation(inputArray.idx_address)) {
            util.log('updateUserAddress', 'idx_address FAIL');

            res.contentType('application/json; charset=utf-8');
            res.end(JSON.stringify({ result: "idx_address FAIL" }));
            return;
        } else if (!util.valueValidation(inputArray.weixin_id)) {
            util.log('updateUserAddress', 'weixin_id FAIL');

            res.contentType('application/json; charset=utf-8');
            res.end(JSON.stringify({ result: "weixin_id FAIL" }));
            return;
        }
        var queryStr = 'UPDATE user_address ';
        queryStr += 'SET weixin_id = "' + inputArray.weixin_id + '", ';
        queryStr += 'name = "' + inputArray.name + '", ';
        queryStr += 'contacts = "' + inputArray.contacts + '", ';
        queryStr += 'zip_code = "' + inputArray.zip_code + '", ';
        queryStr += 'address_1 = "' + inputArray.address_1 + '", ';
        queryStr += 'address_2 = "' + inputArray.address_2 + '", ';
        queryStr += 'address_3 = "' + inputArray.address_3 + '", ';
        queryStr += 'address_detail = "' + inputArray.address_detail + '", ';
        queryStr += 'status_flag = 2, ';
        queryStr += 'update_date = NOW() ';
        queryStr += 'WHERE id = ' + inputArray.idx_address;

        util.log('updateUserAddress', queryStr);
        databasePool.getConnection(function(err, connection) {
            connection.query(queryStr, function(error, rows, fields) {
                connection.release();
                if (error) {
                    util.log('updateUserAddress', error.message);

                    res.contentType('application/json; charset=utf-8');
                    res.end(JSON.stringify({ result: "FAIL" }));
                } else {
                    util.log('updateUserAddress', '', 'success');

                    res.contentType('application/json; charset=utf-8');
                    res.end(JSON.stringify({ result: "SUCCESS" }));
                }
            });
        });
    });

    // track progress
    form.on('progress', function(byteRead, byteExpected) {
        // console.log(' Reading total  ' + byteRead + '/' + byteExpected);
    });
    form.parse(req);
});

router.delete('/deleteUserAddress', function(req, res, next) {
    util.log('deleteUserAddress', '', 'start');

    var idx_address = req.query.idx_address;

    // console.log(req.body);
    // console.log(req.query);
    // console.log(req.param);


    if (!util.valueValidation(idx_address)) {
        util.log('deleteUserAddress', 'idx_address FAIL');

        res.contentType('application/json; charset=utf-8');
        res.end(JSON.stringify({ result: "idx_address FAIL" }));
        return;
    }

    var queryStr = 'UPDATE user_address ';
    queryStr += 'SET status_flag = 3, ';
    queryStr += 'update_date = NOW() ';
    queryStr += 'WHERE id = ' + idx_address;

    util.log('deleteUserAddress', queryStr);
    databasePool.getConnection(function(err, connection) {
        connection.query(queryStr, function(error, rows, fields) {
            connection.release();
            if (error) {
                util.log('deleteUserAddress', error.message);

                res.contentType('application/json; charset=utf-8');
                res.end(JSON.stringify({ result: "FAIL" }));
            } else {
                util.log('deleteUserAddress', '', 'success');

                res.contentType('application/json; charset=utf-8');
                res.end(JSON.stringify({ result: "SUCCESS" }));
            }
        });
    });
});

router.get('/wechatRedirect', function(req, res, next) {
    util.log('wechatRedirect', '', 'start');

    var code = req.query.code;
    getToken(code).then(function(body) {
        /**
          {"openid":"opX9IwdgHVHJ_WAF7VKVTx5V-f30",
          "nickname":"devTndn",
          "language":"ko",
          "city":"",
          "province":"",
          "country":"中国",
          "headimgurl":"",
          "privilege":[]}
        */
        if (!util.valueValidation(body.openid)) {
            //wechat login and get userInfo failed
            util.log('wechatRedirect', 'openid FAIL');

            res.contentType('application/json; charset=utf-8');
            res.end(JSON.stringify({ result: "openid FAIL" }));
            return;
        }
        //wechat login and get userInfo success
        //Let's start tndn login with tndn database


        var queryStr = "INSERT INTO user (open_id, nickname,  language, city, province, contry, headimgurl, privilege) " + " VALUES (\"" + body.openid + "\", \"" + body.nickname + "\",\"" + body.language + "\",\"" + body.city + "\",\"" + body.province + "\",\"" + body.contry + "\",\"" + body.headimgurl + "\",\"" + body.privilege + "\") " + " ON DUPLICATE KEY UPDATE open_id=\"" + body.openid + "\", nickname=\"" + body.nickname + "\",  language=\"" + body.language + "\", city=\"" + body.city + "\", province=\"" + body.province + "\", contry=\"" + body.contry + "\", headimgurl=\"" + body.headimgurl + "\", privilege=\"" + body.privilege + "\";";

        databasePool.getConnection(function(err, connection) {
            connection.query(queryStr, function(error, rows, fields) {
                if (error) {
                    util.log('wechatRedirect', error.message);
                    res.contentType('application/json; charset=utf-8');
                    res.end(JSON.stringify({ result: "FAIL" }));
                } else {
                    var userId = rows.insertId
                    if (userId == 0) {
                        //already registered user so get id using select query
                        connection.query("select id from user where open_id=\"" + body.openid + "\";", function(_error, _rows, _fields) {

                            userId = _rows[0].id;
                            res.contentType('application/json; charset=utf-8');
                            res.end(JSON.stringify({ idx_user: userId }));
                        });

                    } else {

                        res.contentType('application/json; charset=utf-8');
                        res.end(JSON.stringify({ idx_user: userId }));
                    }
                    util.log('wechatRedirect', '', 'success');


                }
                connection.release();

            });
        });

    });

});

//getWebToken.js using wechat
function getToken(code) {
    util.log('getToken', '', 'start');

    var appId = 'wxa98e6fa0a6d50100';
    var secret = 'd766e78e01c209c348a9090b0dc8267f';
    var reqUrl = 'https://api.weixin.qq.com/sns/oauth2/access_token?';

    var params = {
        appid: appId,
        secret: secret,
        code: code,
        grant_type: 'authorization_code'
    };

    var options = {
        method: 'get',
        url: reqUrl + qs.stringify(params)
    };

    return new Promise((resolve, reject) => {
        request(options, function(err, res, body) {
            if (res) {
                getUserInfo(JSON.parse(body).access_token, JSON.parse(body).openid).then(function(data) {
                    resolve(JSON.parse(data));
                });
            } else {
                reject(err);
            }
        })
    })
}

//getUserInfo using wechat
function getUserInfo(AccessToken, openId) {
    util.log('getUserInfo', '', 'start');

    var reqUrl = 'https://api.weixin.qq.com/sns/userinfo?';
    var params = {
        access_token: AccessToken,
        openid: openId,
        lang: 'zh_CN'
    };

    var options = {
        method: 'get',
        url: reqUrl + qs.stringify(params)
    };

    return new Promise((resolve, reject) => {
        request(options, function(err, res, data) {
            if (res) {
                resolve(data);
            } else {
                reject(err);
            }
        });
    })
}

/**
create order no
*/
function createOrderNo() {
    var orderNo = Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return orderNo.substring(0, 22).replace('-', '').toUpperCase();

}

/**
  order payed history insert to db
*/
router.post('/setOrder', function(req, res, next) {
    util.log('setOrder', '', 'start');

    var form = new multiparty.Form();
    var inputArray = { idx_goodss: [], quantitys: [] };

    // get field name & value
    form.on('field', function(name, value) {
        inputArray[name] = value;
        if (name == 'idx_goods') {
            inputArray.idx_goodss.push({ "idx_goods": value })
        } else if (name == 'quantity') {
            inputArray.quantitys.push({ "quantity": value })
        }
        util.log('setOrder', 'normal field / name = ' + name + ' , value = ' + value);

    });

    // file upload handling
    form.on('part', function(part) {
        part.on('data', function(chunk) {});
        part.on('end', function() {});
    });

    // all uploads are completed
    form.on('close', function() {
        var orderNumber = createOrderNo();
        var historyQuery = 'INSERT INTO order_history(idx_user, total_price, order_number, pay_status, delivery_status, insert_date) ' + ' VALUES(\"' + inputArray.idx_user + '\", \"' + inputArray.total_price + '\", \"' + orderNumber + '\", 0, 0, now());';
        var historyDetailQuery = 'INSERT INTO order_history_detail_items(idx_order_history, idx_goods, quantity) VALUES ';

        // if idx_goods and quantity array size different, throw error
        if (inputArray.idx_goodss.length != inputArray.quantitys.length) {
            util.log('setOrder', 'different goods and quantity size FAIL');

            res.contentType('application/json; charset=utf-8');
            res.end(JSON.stringify({ result: "different goods and quantity size FAIL" }));
            return;
        }
        databasePool.getConnection(function(err, connection) {
            connection.query(historyQuery, function(error, rows, fields) {

                var idxOrderHistory = rows.insertId;

                util.log('setOrder', 'insert order_history');

                if (error) throw error;
                for (var i = 0; i < inputArray.idx_goodss.length; i++) {
                    historyDetailQuery = historyDetailQuery + ' (' + idxOrderHistory + ', ' + inputArray.idx_goodss[i].idx_goods + ', ' + inputArray.quantitys[i].quantity + '),';

                    if (i == inputArray.idx_goodss.length - 1) {
                        //last array
                        //have to delete last comma(,) and write semicolon(;)
                        //and execute insert query
                        historyDetailQuery = historyDetailQuery.substring(0, historyDetailQuery.length - 1) + ';';

                        util.log('setOrder', 'insert order_history_detail  ' + orderNumber);
                        connection.query(historyDetailQuery, function(error2, rows2, fields2) {
                            if (error2) throw error2;
                            util.log('setOrder', '', 'success');

                            connection.release();
                            res.contentType('application/json; charset=utf-8');
                            res.end(JSON.stringify({ order_number: orderNumber }));
                        });
                    } //end if last array check
                } //end for
            });
        });
    });

    // track progress
    form.on('progress', function(byteRead, byteExpected) {
        // console.log(' Reading total  ' + byteRead + '/' + byteExpected);
    });
    form.parse(req);
});

/**
  order payed history success to db
*/
router.put('/updateOrder', function(req, res, next) {
    util.log('updateOrder', '', 'start');

    var form = new multiparty.Form();
    var inputArray = { idx_goodss: [], quantitys: [] };

    // get field name & value
    form.on('field', function(name, value) {
        inputArray[name] = value;
        util.log('updateOrder', 'normal field / name = ' + name + ' , value = ' + value);

    });

    // file upload handling
    form.on('part', function(part) {
        part.on('data', function(chunk) {});
        part.on('end', function() {});
    });

    // all uploads are completed
    form.on('close', function() {

        if (!util.valueValidation(inputArray.order_number)) {
            util.log('updateOrder', 'order_number FAIL');

            res.contentType('application/json; charset=utf-8');
            res.end(JSON.stringify({ result: "order_number FAIL" }));
            return;
        }
        var queryStr = 'UPDATE order_history '
        queryStr += ' SET '
        queryStr += ' pay_status = 1, update_date = NOW() '
        queryStr += ' WHERE '
        queryStr += ' pay_status=0 '
        queryStr += ' and order_number = \"'
        queryStr += inputArray.order_number + '\";';


        databasePool.getConnection(function(err, connection) {
            connection.query(queryStr, function(error, rows, fields) {
                if (error) throw error;
                connection.release();

                util.log('updateOrder', queryStr);
                if (rows.affectedRows == 0) {
                    //해당하는 값이 없음
                    util.log('updateOrder', 'not match order_number FAIL');

                    res.contentType('application/json; charset=utf-8');
                    res.end(JSON.stringify({ result: "not match order_number FAIL" }));
                    return;
                }
                util.log('updateOrder', '', 'success');

                res.contentType('application/json; charset=utf-8');
                res.end(JSON.stringify({ result: "SUCCESS" }));
            });
        });
    });

    // track progress
    form.on('progress', function(byteRead, byteExpected) {
        // console.log(' Reading total  ' + byteRead + '/' + byteExpected);
    });
    form.parse(req);
});




router.get('/getUserOrderHistory', function(req, res, next) {
    util.log('getUserOrderHistory', '', 'start');

    var idxUser = req.query.idx_user;

    var queryStr = '  SELECT  ' +
        '    o.total_price, ' +
        '    o.order_number, ' +
        '    o.pay_status, ' +
        '    o.delivery_status, ' +
        "    DATE_FORMAT(o.insert_date, '%Y-%m-%d %H:%i') AS insert_date, " +
        "    DATE_FORMAT(o.update_date, '%Y-%m-%d %H:%i') AS update_date, " +
        '    COUNT(od.idx_order_history) AS goods_count ' +
        'FROM ' +
        '    order_history o, ' +
        '    order_history_detail_items od, ' +
        '    goods g, ' +
        '    user u ' +
        'WHERE ' +
        '    g.status_flag != 3 ' +
        '        AND od.idx_goods = g.id ' +
        '        AND od.idx_order_history = o.id ' +
        '        AND o.idx_user = u.id ' +
        '        AND o.idx_user = ' + idxUser +
        ' GROUP BY od.idx_order_history; ';
    util.log('getUserOrderHistory', queryStr);

    if (!util.valueValidation(idxUser)) {
        util.log('getUserOrderHistory', 'idx_user FAIL');

        res.contentType('application/json; charset=utf-8');
        res.end(JSON.stringify({ result: "idx_user FAIL" }));
        return;
    }

    databasePool.getConnection(function(err, connection) {
        connection.query(queryStr, function(error, rows, fields) {
            connection.release();
            if (error) {
                util.log('getUserOrderHistory', error.message);

                res.contentType('application/json; charset=utf-8');
                res.end(JSON.stringify({}));
            } else {
                util.log('getUserOrderHistory', '', 'success');

                res.contentType('application/json; charset=utf-8');
                res.end(JSON.stringify(rows));
            }
        });
    });
});

router.get('/getUserOrderHistoryDetail', function(req, res, next) {
    util.log('getUserOrderHistoryDetail', '', 'start');

    var orderNumber = req.query.order_number;


    var queryStr = ' SELECT  ' +
        '     g.id AS idx_goods, ' +
        '     g.chn_title, ' +
        '     g.chn_subtitle, ' +
        '     g.price, ' +
        '     od.quantity, ' +
        '     gi.idx_image_file, ' +
        '     o.pay_status, ' +
        '     o.delivery_status, ' +
        '     DATE_FORMAT(o.insert_date, "%Y-%m-%d%H:%i") AS insert_date, ' +
        '     DATE_FORMAT(o.update_date, "%Y-%m-%d%H:%i") AS update_date ' +
        ' FROM ' +
        '     goods g, ' +
        '     order_history_detail_items od, ' +
        '     order_history o, ' +
        '     goods_image gi ' +
        ' WHERE ' +
        '     o.id = od.idx_order_history ' +
        '         AND od.idx_goods = g.id ' +
        '         AND gi.status_flag != 3 ' +
        '         AND g.status_flag != 3 ' +
        '         AND gi.idx_goods = g.id ' +
        '         AND gi.top_flag = 1 ' +
        '         AND o.order_number = \"' + orderNumber + '\"; ';


    util.log('getUserOrderHistoryDetail', queryStr);

    if (!util.valueValidation(orderNumber)) {
        util.log('deleteUserAddress', 'order_number FAIL');

        res.contentType('application/json; charset=utf-8');
        res.end(JSON.stringify({ result: "order_number FAIL" }));
        return;
    }

    databasePool.getConnection(function(err, connection) {
        connection.query(queryStr, function(error, rows, fields) {
            connection.release();
            if (error) {
                util.log('getUserOrderHistoryDetail', error.message);

                res.contentType('application/json; charset=utf-8');
                res.end(JSON.stringify({}));
            } else {
                util.log('getUserOrderHistoryDetail', '', 'success');

                res.contentType('application/json; charset=utf-8');
                res.end(JSON.stringify(rows));
            }
        });
    });
});


module.exports = router;
