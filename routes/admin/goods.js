var express = require('express');
var router = express.Router();

var databasePool = require('../../references/databaseConfig.js');

/* GET home page. */
router.get('/search', function(req, res, next) {
  console.log('search!');
  res.render('admin/goods/search', { title: 'Express' });
});

router.get('/json/majorClassification', function(req, res, next) {
  var queryStr = 'SELECT ';
  queryStr += 'id, ';
  queryStr += 'chn_name, ';
  queryStr += 'kor_name ';
  queryStr += 'FROM goods_major_classification ';
  queryStr += 'WHERE status_flag != 3 ';
  queryStr += 'ORDER BY sort_no ';

  databasePool.getConnection(function(err, connection) {
    connection.query(queryStr, function(error, rows, fields) {
      connection.release();
      if (error) throw error;
      res.contentType('application/json; charset=utf-8');
		  res.status(200);
		  res.write(JSON.stringify(rows));
		  res.end();
    });
  });
});

router.get('/json/subClassification', function(req, res, next) {
	var majorClassification = req.query.majorClassification;

  var queryStr = 'SELECT ';
  queryStr += 'id, ';
  queryStr += 'chn_name, ';
  queryStr += 'kor_name ';
  queryStr += 'FROM goods_sub_classification ';
  queryStr += 'WHERE idx_major_classification = ' + majorClassification + ' ';
  queryStr += 'AND status_flag != 3 ';
  queryStr += 'ORDER BY sort_no ';

  databasePool.getConnection(function(err, connection) {
    connection.query(queryStr, function(error, rows, fields) {
      connection.release();
      if (error) throw error;
      res.contentType('application/json; charset=utf-8');
		  res.status(200);
		  res.write(JSON.stringify(rows));
		  res.end();
    });
  });
});

router.get('/input', function(req, res, next) {
  res.render('admin/goods/input');
});

module.exports = router;
