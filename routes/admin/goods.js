var express = require('express');
var router = express.Router();
var multiparty = require('multiparty');
var fs = require('fs');
var Promise = require('bluebird');
var util = require('../../references/utility.js');
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
  console.log(util.UUID());
  res.render('admin/goods/input');
});

router.post('/input/save', function(req, res, next) {

  var form = new multiparty.Form();
  var inputArray = {};
  var fileArray = { items: [] };

  // get field name & value
  form.on('field', function(name, value) {
    inputArray[name] = value;
    console.log('normal field / name = ' + name + ' , value = ' + value);
  });

  // file upload handling
  form.on('part', function(part) {
    var filename, size, paraName, contentType, saveFileName;

    var jsonStr;
    var writeStream;
    if (part.filename != '') {
      filename = part.filename;
      size = part.byteCount;
      paraName = part.name;
      contentType = part.headers['content-type'];
      saveFileName = util.UUID() + '_' + filename;
      fileArray.items.push({ "paraName": paraName, "type": contentType, "size": size, "originName": filename, "saveName": saveFileName })
      writeStream = fs.createWriteStream('/storage/goodsImage/' + saveFileName);
      writeStream.filename = saveFileName;
      part.pipe(writeStream);
    } else {
      part.resume();
    }

    part.on('data', function(chunk) {
      // console.log(filename + ' read ' + chunk.length + 'bytes');
    });

    part.on('end', function() {
      // console.log(filename + ' Part read complete');
      if (part.filename != '')
        writeStream.end();
    });
  });

  // all uploads are completed
  form.on('close', function() {
    console.log(inputArray);
    console.log(fileArray);
    var queryStr = 'INSERT INTO goods(';
    queryStr += 'idx_goods_classification, ';
    queryStr += 'price, ';
    queryStr += 'stock_quantity, ';
    queryStr += 'chn_title, ';
    queryStr += 'chn_subtitle, ';
    queryStr += 'chn_info, ';
    queryStr += 'kor_title, ';
    queryStr += 'kor_subtitle, ';
    queryStr += 'kor_info, ';
    queryStr += 'overseas_flag, ';
    queryStr += 'status_flag, ';
    queryStr += 'insert_date) ';
    queryStr += 'VALUES(';
    queryStr += '"' + inputArray.goods_sub_classification + '", ';
    queryStr += '"' + inputArray.price + '", ';
    queryStr += '"' + inputArray.stock_quantity + '", ';
    queryStr += '"' + inputArray.chn_title + '", ';
    queryStr += '"' + inputArray.chn_subtitle + '", ';
    queryStr += '"' + inputArray.chn_info + '", ';
    queryStr += '"' + inputArray.kor_title + '", ';
    queryStr += '"' + inputArray.kor_subtitle + '", ';
    queryStr += '"' + inputArray.kor_info + '", ';
    queryStr += inputArray.overseas_flag + ', ';
    queryStr += '1, ';
    queryStr += 'NOW())';
    console.log(queryStr);

    databasePool.getConnection(function(err, connection) {
      connection.query(queryStr, function(error, rows, fields) {
        if (error) throw error;
        console.log('*********************');
        console.log(rows.insertId);
        for (var i = 0; i < fileArray.items.length; i++) {
          insertImageFile(fileArray.items[i], connection).then(function(returnJson) {
            console.log('*********************');
            console.log(returnJson.insertId);
            console.log(returnJson.top_flag);
            queryStr = 'INSERT INTO goods_image(';
            queryStr += 'idx_goods, ';
            queryStr += 'idx_image_file, ';
            queryStr += 'top_flag, ';
            queryStr += 'status_flag, ';
            queryStr += 'insert_date) ';
            queryStr += 'VALUES(';
            queryStr += rows.insertId + ', ';
            queryStr += returnJson.insertId + ', ';
            queryStr += returnJson.top_flag + ', ';
            queryStr += '1, ';
            queryStr += 'NOW())';
            console.log(queryStr);
            connection.query(queryStr, function(error, rows3, fields) {
              if (error) throw error;
              console.log('+++++++++++++++++++++++++++++');
              console.log(rows3.insertId);
            });
          })
        }
      });
      connection.release();
    });
    res.status(200).send('Upload complete' + util.UUID());
  });

  // track progress
  form.on('progress', function(byteRead, byteExpected) {
    // console.log(' Reading total  ' + byteRead + '/' + byteExpected);
  });
  form.parse(req);
});

function insertImageFile(fileItem, connection) {
  return new Promise(function(resolve, reject) {
    var returnJson = {};
    var queryStr = 'INSERT INTO image_file_path(';
    queryStr += 'save_file_name, ';
    queryStr += 'original_file_name, ';
    queryStr += 'content_type, ';
    queryStr += 'file_size, ';
    queryStr += 'status_flag, ';
    queryStr += 'insert_date) ';
    queryStr += 'VALUES(';
    queryStr += '"' + fileItem.saveName + '", ';
    queryStr += '"' + fileItem.originName + '", ';
    queryStr += '"' + fileItem.type + '", ';
    queryStr += fileItem.size + ', ';
    queryStr += '1, ';
    queryStr += 'NOW())';
    console.log(queryStr);
    if (fileItem.paraName == 'top_image')
      returnJson.top_flag = 1;
    else
      returnJson.top_flag = 0;
    connection.query(queryStr, function(error, rows, fields) {
      if (error) throw error;
      returnJson.insertId = rows.insertId;
      resolve(returnJson);
    });
  });
}

module.exports = router;
