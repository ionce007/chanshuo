const { DataTypes, Model } = require('sequelize');
const sequelize = require('../common/database');
const CSCategory = require('./cscategory');

class CSArticle extends Model {}

CSArticle.init(
  {
    id: {
      type: DataTypes.STRING,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title:DataTypes.STRING,
    content:DataTypes.TEXT,
    cid: DataTypes.STRING,/*{
        type: DataTypes.STRING,
        references: { model: 'CSCategory', key: 'cid',},
        allowNull: false,
    }, */
    issuedate: DataTypes.STRING,
    isEnable: DataTypes.BOOLEAN,
    href: DataTypes.STRING,
    link: DataTypes.STRING,
  },
  { sequelize }
);
//CSCategory.hasMany(CSArticle, { foreignKey: 'cid'});
CSArticle.belongsTo(CSCategory, { foreignKey:'cid'});
module.exports = CSArticle;