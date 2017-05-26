var mysql = require('mysql');

var db_port = '3306';
var db_user = 'tndn';
var db_pw = 'tndn0505';
var db_host = '116.62.196.89';
var db_database = 'weixinApp';

var config = {
	connectionLimit : 10,
  host: db_host,
  user: db_user,
  password: db_pw,
  database: db_database
};

var pool = mysql.createPool(config);

module.exports = pool;
