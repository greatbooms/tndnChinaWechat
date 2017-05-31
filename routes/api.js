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
      res.contentType('application/json; charset=utf-8');
      res.end(JSON.stringify(rows));
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
  var idxUser = req.body.idx_user;
  var idxGoods = req.body.idx_goods;
  var queryStr = 'INSERT INTO cart(';
  queryStr += 'idx_user, ';
  queryStr += 'idx_goods, ';
  queryStr += 'quantity, ';
  queryStr += 'status_flag, ';
  queryStr += 'insert_date) ';
  queryStr += 'VALUES(';
  queryStr += idxUser + ', ';
  queryStr += idxGoods + ', ';
  queryStr += '1, ';
  queryStr += '1, ';
  queryStr += 'NOW())';

  console.log(queryStr);
  databasePool.getConnection(function(err, connection) {
    connection.query(queryStr, function(error, rows, fields) {
      connection.release();
      if (error) {
        res.contentType('application/json; charset=utf-8');
        res.end(JSON.stringify({result: "FAIL"}));
      } else {
        res.contentType('application/json; charset=utf-8');
        res.end(JSON.stringify({result: "SUCCESS"}));
      }
    });
  });
});

router.get('/getCartItem', function(req, res, next) {
  var major_class = req.query.idx_user;
  var queryStr = 'SELECT ';
  queryStr += 'goods.id, ';
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
      res.contentType('application/json; charset=utf-8');
      res.end(JSON.stringify(rows));
    });
  });
});

router.put('/updateCartItem', function(req, res, next) {
  var cartId = req.body.idx_cart;
  var quantity = req.body.quantity;

  // console.log(req);
  console.log(quantity);
  var queryStr = 'UPDATE cart ';
  queryStr += 'SET quantity = ' + quantity + ', ';
  queryStr += 'update_date = NOW() ';
  queryStr += 'WHERE id = ' + cartId;

  console.log(queryStr);
  databasePool.getConnection(function(err, connection) {
    connection.query(queryStr, function(error, rows, fields) {
      connection.release();
      if (error) {
        res.contentType('application/json; charset=utf-8');
        res.end(JSON.stringify({result: "FAIL"}));
      } else {
        res.contentType('application/json; charset=utf-8');
        res.end(JSON.stringify({result: "SUCCESS"}));
      }
    });
  });
});

router.delete('/deleteCartItem', function(req, res, next) {
  var cartId = req.body.idx_cart;

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
        res.end(JSON.stringify({result: "FAIL"}));
      } else {
        res.contentType('application/json; charset=utf-8');
        res.end(JSON.stringify({result: "SUCCESS"}));
      }
    });
  });
});

module.exports = router;
