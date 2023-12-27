const multer = require('multer');
const path = require('path');
const { fileExists, getDate } = require('../common/util');
const database = require('../config').database;
const uploadPath = './data';
exports.uploadDB = multer({
  storage: multer.diskStorage({
    destination: function (req, file, callback) {
      try {
        callback(null, uploadPath);
      }
      catch (error) {
        console.log('uploadDB.multer.destination error：', error.message);
      }

    },
    filename: async function (req, file, callback) {
      try {
        //file.originalname = file.originalname.replaceAll(" ", "_");
        console.log('file', file) //上传的文件信息
        var fileFormat = (file.originalname).split('.')
        var filename = new Date().getTime()
        callback(null, file.originalname)
      }
      catch (error) {
        console.log('uploadDB.multer.filename error：', error.message);
      }

    }
  })
});
