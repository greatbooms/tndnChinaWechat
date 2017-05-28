var express = require('express');
var router = express.Router();
var multiparty = require('multiparty');
var fs = require('fs');
var Promise = require('bluebird');
var util = require('../references/utility.js');
var databasePool = require('../references/databaseConfig.js');

/* GET home page. */
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
      if(rows.length > 0) {
        img = fs.readFileSync('/tmp/' + rows[0].save_file_name);
        res.writeHead(200, { 'Content-Type': rows[0].content_type });
      }
      res.end(img, 'binary');
    });
  });
});

router.get('/getAllGoods', function(req, res, next) {
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
      if(rows.length > 0) {
        img = fs.readFileSync('/tmp/' + rows[0].save_file_name);
        res.writeHead(200, { 'Content-Type': rows[0].content_type });
      }
      res.end(img, 'binary');
    });
  });
});

module.exports = router;
