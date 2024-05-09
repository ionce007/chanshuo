const { DataTypes, Model } = require('sequelize');
const sequelize = require('../common/database');
const THSNewGN = require('./THSNewGN');

class THSgnComponent extends Model {}

THSgnComponent.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true,},//概念编码+股票编码
    stockCode:DataTypes.STRING,
    stockName:DataTypes.STRING,
    GNCode:DataTypes.STRING,
  },
  { sequelize }
);
//CSCategory.hasMany(CSArticle, { foreignKey: 'cid'});
THSgnComponent.belongsTo(THSNewGN, { foreignKey:'GNCode'});
module.exports = THSgnComponent;