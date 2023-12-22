const Sequelize = require('sequelize');
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../common/database');
const { PAGE_TYPES, PAGE_STATUS, FORMULA_KIND, FORMULA_CATEGORY } = require('../common/constant');

class Formula extends Model {}
Formula.init({
    fs_id: {
        type: DataTypes.STRING,
        primaryKey: true
      },
      path: {
        type: DataTypes.STRING,
        defaultValue: ""
      },
      server_filename: {
        type: DataTypes.STRING,
        defaultValue: ""
      },
      size: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      server_mtime: {
        type: DataTypes.INTEGER,
        defaultValue: Sequelize.NOW
      },
      server_ctime: {
        type: DataTypes.INTEGER,
        defaultValue: Sequelize.NOW
      },
      local_mtime: {
        type: DataTypes.INTEGER,
        defaultValue: Sequelize.NOW
      },
      local_ctime: {
        type: DataTypes.INTEGER,
        defaultValue: Sequelize.NOW
      },
      isdir: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      category: {
        type: DataTypes.INTEGER,
        defaultValue: FORMULA_CATEGORY.OTHERS
      },
      md5: {
        type: DataTypes.STRING,
        defaultValue: ""
      },
      dir_empty: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      price: {
        type: DataTypes.REAL,
        defaultValue: 0
      },
      md5: {
        type: DataTypes.STRING,
        defaultValue: ""
      },
      isSell: {
        type: DataTypes.INTEGER,
        defaultValue: 1
      },
      xhsUrl: {
        type: DataTypes.STRING,
        defaultValue: ""
      },
      kind: {
        type: DataTypes.STRING,
        defaultValue: FORMULA_KIND.ZBGS
      },
      createtime: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW
      },
      lastupdate: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW
      }
},
  { sequelize,
    timestamps:false
  }
);

module.exports = Formula;