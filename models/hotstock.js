const { DataTypes, Model } = require('sequelize');
const sequelize = require('../common/database');

class HotStock extends Model {}

HotStock.init(
  {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    code: DataTypes.STRING,
    name: DataTypes.STRING,
    rank: DataTypes.INTEGER,
    origin: DataTypes.STRING,
    hotDate: DataTypes.DATE
  },
  { sequelize }
);

module.exports = HotStock;
