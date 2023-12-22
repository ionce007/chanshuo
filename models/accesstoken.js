const { DataTypes, Model } = require('sequelize');
const sequelize = require('../common/database');

class AccessToken extends Model {}

AccessToken.init(
    {
        supplier: {
            type: DataTypes.STRING,
            defaultValue: '',
            primaryKey: true
        },
        access_token: DataTypes.TEXT,
        expires_in: DataTypes.INTEGER,
        refresh_token: DataTypes.STRING,
        scope: DataTypes.STRING,
        remark: DataTypes.STRING,
    },
    { sequelize }
  );
  
  module.exports = AccessToken;