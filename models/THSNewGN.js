const { DataTypes, Model } = require('sequelize');
const sequelize = require('../common/database');

class THSNewGN extends Model {}

THSNewGN.init(
  {
    //cid:{ type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true,},
    addtime: DataTypes.STRING,
    GNCode: { type: DataTypes.STRING,  primaryKey: true,},
    GNName:DataTypes.STRING,
    eventDesc:DataTypes.STRING,
    eventUrl: DataTypes.STRING,
    leadingStock: DataTypes.STRING,
    componentUrl:DataTypes.STRING,
    componentCount:DataTypes.INTEGER,
  },
  { sequelize }
);

module.exports = THSNewGN;