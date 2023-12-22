const { DataTypes, Model } = require('sequelize');
const sequelize = require('../common/database');

class CSCategory extends Model {}

CSCategory.init(
  {
    cid: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true,},
    title: DataTypes.STRING,
    parent:DataTypes.STRING,
    isEnable: DataTypes.TINYINT,
    iorder: DataTypes.INTEGER,
    href: DataTypes.STRING,
    link: DataTypes.STRING
  },
  { sequelize }
);

module.exports = CSCategory;