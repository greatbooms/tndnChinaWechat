var express = require('express');
var router = express.Router();
var multiparty = require('multiparty');
var fs = require('fs');
var Promise = require('bluebird');
var util = require('../references/utility.js');
var databasePool = require('../references/databaseConfig.js');

router.get('/getImage', function(req, res, next) {
  var id = req.query.idx;
  var queryStr = 'SELECT ';
  queryStr += 'save_file_name, ';
  queryStr += 'original_file_name, ';
  queryStr += 'content_type, ';
  queryStr += 'file_size ';
  queryStr += 'FROM image_file_path ';
  queryStr += 'WHERE id = ' + id + ' ';
  queryStr += 'AND status_flag != 3';
  console.log(queryStr);
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
  var major_class = req.query.idx_goods_major_classification;
  var sub_class = req.query.idx_goods_sub_classification;
  var queryStr = 'SELECT ';
  queryStr += 'goods.id, ';
  queryStr += 'goods.idx_goods_classification, ';
  queryStr += 'goods.price, ';
  queryStr += 'goods.chn_title, ';
  queryStr += 'goods.chn_subtitle, ';
  queryStr += '(SELECT idx_image_file FROM goods_image WHERE top_flag = 1 AND idx_goods = goods.id ORDER BY update_date, id LIMIT 1) AS idx_image ';
  queryStr += 'FROM goods goods, ';
  queryStr += 'goods_sub_classification goods_sub ';
  queryStr += 'WHERE goods.idx_goods_classification = goods_sub.id ';
  queryStr += 'AND goods.status_flag != 3 ';
  if (major_class != undefined)
    queryStr += 'AND goods_sub.idx_major_classification = ' + major_class + ' ';
  if (sub_class != undefined)
    queryStr += 'AND goods_sub.id = ' + sub_class + ' ';

  console.log(queryStr);
  databasePool.getConnection(function(err, connection) {
    connection.query(queryStr, function(error, rows, fields) {
      connection.release();
      if (error) {
        res.contentType('application/json; charset=utf-8');
        res.end(JSON.stringify({}));
      } else {
        res.contentType('application/json; charset=utf-8');
        res.end(JSON.stringify(rows));
      }
    });
  });
});

router.get('/getGoodsDetailInfo', function(req, res, next) {
  var idx_goods = req.query.idx_goods;
  var returnJson = {};
  if (idx_goods == undefined) {
    res.contentType('application/json; charset=utf-8');
    res.end(JSON.stringify({}));
    return;
  }
  var queryStr = 'SELECT ';
  queryStr += 'goods.id, ';
  queryStr += 'goods.idx_goods_classification, ';
  queryStr += 'goods.price, ';
  queryStr += 'goods.chn_title, ';
  queryStr += 'goods.chn_subtitle, ';
  queryStr += 'goods.chn_info, ';
  queryStr += 'goods_sub.chn_name '
  queryStr += 'FROM goods goods, ';
  queryStr += 'goods_sub_classification goods_sub ';
  queryStr += 'WHERE goods.idx_goods_classification = goods_sub.id ';
  queryStr += 'AND goods.status_flag != 3 ';
  queryStr += 'AND goods.id = ' + idx_goods + ' ';

  console.log(queryStr);
  databasePool.getConnection(function(err, connection) {
    connection.query(queryStr, function(error, rows, fields) {
      returnJson.goodsInfo = rows;
      var queryStr = 'SELECT ';
      queryStr += 'id, ';
      queryStr += 'idx_image_file, ';
      queryStr += 'top_flag ';
      queryStr += 'FROM goods_image ';
      queryStr += 'WHERE status_flag != 3 ';
      queryStr += 'AND top_flag = 1 ';
      queryStr += 'AND idx_goods = ' + idx_goods + ' ';
      console.log(rows);
      console.log(queryStr);
      connection.query(queryStr, function(error, rows2, fields) {
        returnJson.goodsTopImage = rows2;
        var queryStr = 'SELECT ';
        queryStr += 'id, ';
        queryStr += 'idx_image_file, ';
        queryStr += 'top_flag ';
        queryStr += 'FROM goods_image ';
        queryStr += 'WHERE status_flag != 3 ';
        queryStr += 'AND top_flag = 0 ';
        queryStr += 'AND idx_goods = ' + idx_goods + ' ';
        console.log(rows2);
        console.log(queryStr);
        connection.query(queryStr, function(error, rows3, fields) {
          returnJson.goodsDetailImage = rows3;
          connection.release();
          console.log(rows3);
          console.log(returnJson);
          res.contentType('application/json; charset=utf-8');
          res.end(JSON.stringify(returnJson));
        });
      });
    });
  });
});

router.post('/setCartItem', function(req, res, next) {

  var form = new multiparty.Form();
  var inputArray = {};

  // get field name & value
  form.on('field', function(name, value) {
    inputArray[name] = value;
    console.log('normal field / name = ' + name + ' , value = ' + value);
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
    console.log(queryStr);

    databasePool.getConnection(function(err, connection) {
      connection.query(queryStr, function(error, rows, fields) {
        if (error) {
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
          console.log(queryStr);
          connection.query(queryStr, function(error, rows, fields) {
            if (error) {
              res.contentType('application/json; charset=utf-8');
              res.end(JSON.stringify({ result: "FAIL" }));
            } else {
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
  var major_class = req.query.idx_user;
  var queryStr = 'SELECT ';
  queryStr += 'cart.id, ';
  queryStr += 'goods.chn_title, ';
  queryStr += 'goods.chn_subtitle, ';
  queryStr += 'goods.price, ';
  queryStr += 'cart.quantity ';
  queryStr += 'FROM cart cart, goods goods ';
  queryStr += 'WHERE cart.idx_goods = goods.id ';
  queryStr += 'AND cart.status_flag != 3 ';
  queryStr += 'AND cart.idx_user = ' + major_class + ' ';

  console.log(queryStr);
  databasePool.getConnection(function(err, connection) {
    connection.query(queryStr, function(error, rows, fields) {
      connection.release();
      if (error) {
        res.contentType('application/json; charset=utf-8');
        res.end(JSON.stringify({}));
      } else {
        res.contentType('application/json; charset=utf-8');
        res.end(JSON.stringify(rows));
      }
    });
  });
});

router.put('/updateCartItem', function(req, res, next) {
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
    console.log('normal field / name = ' + name + ' , value = ' + value);
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

      console.log(queryStr);
      databasePool.getConnection(function(err, connection) {
        connection.query(queryStr, function(error, rows, fields) {
          if (error) throw error;
        });
        connection.release();
      });
    }
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

  var cartId = req.query.idx_cart;

  console.log(req.body);
  console.log(req.query);
  console.log(req.param);

  console.log('cartId = ' + cartId);

  var queryStr = 'UPDATE cart ';
  queryStr += 'SET status_flag = 3, ';
  queryStr += 'update_date = NOW() ';
  queryStr += 'WHERE id = ' + cartId;

  console.log(queryStr);
  databasePool.getConnection(function(err, connection) {
    connection.query(queryStr, function(error, rows, fields) {
      connection.release();
      if (error) {
        res.contentType('application/json; charset=utf-8');
        res.end(JSON.stringify({ result: "FAIL" }));
      } else {
        res.contentType('application/json; charset=utf-8');
        res.end(JSON.stringify({ result: "SUCCESS" }));
      }
    });
  });
});

router.get('/getAreacode', function(req, res, next) {
  var topno = req.query.topno;

  console.log('topno = ' + topno);

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

  console.log(queryStr);
  databasePool.getConnection(function(err, connection) {
    connection.query(queryStr, function(error, rows, fields) {
      connection.release();
      if (error) {
        res.contentType('application/json; charset=utf-8');
        res.end(JSON.stringify({}));
      } else {
        res.contentType('application/json; charset=utf-8');
        res.end(JSON.stringify(rows));
      }
    });
  });
});

router.post('/setUserAddress', function(req, res, next) {
  var form = new multiparty.Form();
  var inputArray = {};

  // get field name & value
  form.on('field', function(name, value) {
    inputArray[name] = value;
    console.log('normal field / name = ' + name + ' , value = ' + value);
  });

  // file upload handling
  form.on('part', function(part) {
    part.on('data', function(chunk) {});
    part.on('end', function() {});
  });

  // all uploads are completed
  form.on('close', function() {
    if (inputArray.idx_user == undefined || inputArray.idx_user == '') {
      res.contentType('application/json; charset=utf-8');
      res.end(JSON.stringify({ result: "idx_user FAIL" }));
      return;
    } else if (inputArray.weixin_id == undefined || inputArray.weixin_id == '') {
      res.contentType('application/json; charset=utf-8');
      res.end(JSON.stringify({ result: "weixin_id FAIL" }));
      return;
    }
    var queryStr = 'INSERT INTO user_address(';
    queryStr += 'idx_user, ';
    queryStr += 'weixin_id, ';
    queryStr += 'name, ';
    queryStr += 'sex, ';
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
    queryStr += '"' + inputArray.sex + '", ';
    queryStr += '"' + inputArray.contacts + '", ';
    queryStr += '"' + inputArray.zip_code + '", ';
    queryStr += '"' + inputArray.address_1 + '", ';
    queryStr += '"' + inputArray.address_2 + '", ';
    queryStr += '"' + inputArray.address_3 + '", ';
    queryStr += '"' + inputArray.address_detail + '", ';
    queryStr += '1, ';
    queryStr += 'NOW())';

    console.log(queryStr);
    databasePool.getConnection(function(err, connection) {
      connection.query(queryStr, function(error, rows, fields) {
        connection.release();
        if (error) {
          res.contentType('application/json; charset=utf-8');
          res.end(JSON.stringify({ result: "FAIL" }));
        } else {
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
  var idx_user = req.query.idx_user;

  console.log('idx_user = ' + idx_user);

  if (idx_user == undefined || idx_user == '') {
    res.contentType('application/json; charset=utf-8');
    res.end(JSON.stringify({ result: "idx_user FAIL" }));
    return;
  }

  var queryStr = 'SELECT ';
  queryStr += 'id, ';
  queryStr += 'weixin_id, ';
  queryStr += 'name, ';
  queryStr += 'sex, ';
  queryStr += 'contacts, ';
  queryStr += 'zip_code, ';
  queryStr += '(SELECT areaname FROM quan_prov_city_area where no = address_1) as addressName_1, ';
  queryStr += '(SELECT areaname FROM quan_prov_city_area where no = address_2) as addressName_2, ';
  queryStr += '(SELECT areaname FROM quan_prov_city_area where no = address_3) as addressName_3, ';
  queryStr += 'address_detail ';
  queryStr += 'FROM user_address ';
  queryStr += 'WHERE status_flag != 3 ';
  queryStr += 'AND idx_user = ' + idx_user + ' ';

  console.log(queryStr);
  databasePool.getConnection(function(err, connection) {
    connection.query(queryStr, function(error, rows, fields) {
      connection.release();
      if (error) {
        res.contentType('application/json; charset=utf-8');
        res.end(JSON.stringify({}));
      } else {
        res.contentType('application/json; charset=utf-8');
        res.end(JSON.stringify(rows));
      }
    });
  });
});

router.get('/getUserAddressDetail', function(req, res, next) {
  var idx_address = req.query.idx_address;

  console.log('idx_address = ' + idx_address);

  if (idx_address == undefined || idx_address == '') {
    res.contentType('application/json; charset=utf-8');
    res.end(JSON.stringify({ result: "idx_address FAIL" }));
    return;
  }

  var queryStr = 'SELECT ';
  queryStr += 'id, ';
  queryStr += 'weixin_id, ';
  queryStr += 'name, ';
  queryStr += 'sex, ';
  queryStr += 'contacts, ';
  queryStr += 'zip_code, ';
  queryStr += 'address_1, ';
  queryStr += 'address_2, ';
  queryStr += 'address_3, ';
  queryStr += 'address_detail ';
  queryStr += 'FROM user_address ';
  queryStr += 'WHERE status_flag != 3 ';
  queryStr += 'AND id = ' + idx_address + ' ';

  console.log(queryStr);
  databasePool.getConnection(function(err, connection) {
    connection.query(queryStr, function(error, rows, fields) {
      connection.release();
      if (error) {
        res.contentType('application/json; charset=utf-8');
        res.end(JSON.stringify({}));
      } else {
        res.contentType('application/json; charset=utf-8');
        res.end(JSON.stringify(rows));
      }
    });
  });
});

router.put('/updateUserAddress', function(req, res, next) {
  var form = new multiparty.Form();
  var inputArray = {};

  // get field name & value
  form.on('field', function(name, value) {
    inputArray[name] = value;
    console.log('normal field / name = ' + name + ' , value = ' + value);
  });

  // file upload handling
  form.on('part', function(part) {
    part.on('data', function(chunk) {});
    part.on('end', function() {});
  });

  // all uploads are completed
  form.on('close', function() {
    if (inputArray.idx_address == undefined || inputArray.idx_address == '') {
      res.contentType('application/json; charset=utf-8');
      res.end(JSON.stringify({ result: "idx_address FAIL" }));
      return;
    } else if (inputArray.weixin_id == undefined || inputArray.weixin_id == '') {
      res.contentType('application/json; charset=utf-8');
      res.end(JSON.stringify({ result: "weixin_id FAIL" }));
      return;
    }
    var queryStr = 'UPDATE user_address ';
    queryStr += 'SET weixin_id = "' + inputArray.weixin_id + '", ';
    queryStr += 'name = "' + inputArray.name + '", ';
    queryStr += 'sex = "' + inputArray.sex + '", ';
    queryStr += 'contacts = "' + inputArray.contacts + '", ';
    queryStr += 'zip_code = "' + inputArray.zip_code + '", ';
    queryStr += 'address_1 = "' + inputArray.address_1 + '", ';
    queryStr += 'address_2 = "' + inputArray.address_2 + '", ';
    queryStr += 'address_3 = "' + inputArray.address_3 + '", ';
    queryStr += 'address_detail = "' + inputArray.address_detail + '", ';
    queryStr += 'status_flag = 2, ';
    queryStr += 'update_date = NOW() ';
    queryStr += 'WHERE id = ' + inputArray.idx_address;

    console.log(queryStr);
    databasePool.getConnection(function(err, connection) {
      connection.query(queryStr, function(error, rows, fields) {
        connection.release();
        if (error) {
          res.contentType('application/json; charset=utf-8');
          res.end(JSON.stringify({ result: "FAIL" }));
        } else {
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
  var idx_address = req.query.idx_address;

  console.log(req.body);
  console.log(req.query);
  console.log(req.param);

  console.log('idx_address = ' + idx_address);

  if (idx_address == undefined || idx_address == '') {
    res.contentType('application/json; charset=utf-8');
    res.end(JSON.stringify({ result: "idx_address FAIL" }));
    return;
  }

  var queryStr = 'UPDATE user_address ';
  queryStr += 'SET status_flag = 3, ';
  queryStr += 'update_date = NOW() ';
  queryStr += 'WHERE id = ' + idx_address;

  console.log(queryStr);
  databasePool.getConnection(function(err, connection) {
    connection.query(queryStr, function(error, rows, fields) {
      connection.release();
      if (error) {
        res.contentType('application/json; charset=utf-8');
        res.end(JSON.stringify({ result: "FAIL" }));
      } else {
        res.contentType('application/json; charset=utf-8');
        res.end(JSON.stringify({ result: "SUCCESS" }));
      }
    });
  });
});

module.exports = router;
