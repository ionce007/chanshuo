const { DataTypes, Model } = require('sequelize');
const sequelize = require('../common/database');

class THSgnChange extends Model {}

THSgnChange.init(
  {
    id:{ type: DataTypes.STRING, primaryKey: true,},//概念编码+股票编码
    action: DataTypes.STRING,
    created_at: DataTypes.BIGINT,
    news_url:DataTypes.STRING,
    reason:DataTypes.STRING,
    gnCode: DataTypes.STRING,
    gn_is_attend: DataTypes.STRING,
    gn_market:DataTypes.STRING,
    gn_name:DataTypes.STRING,
    stock_code:DataTypes.STRING,
    stock_market:DataTypes.STRING,
    stock_name:DataTypes.STRING,
  },
  { sequelize }
);

module.exports = THSgnChange;