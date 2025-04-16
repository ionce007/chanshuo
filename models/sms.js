const { DataTypes, Model } = require('sequelize');
const sequelize = require('../common/database');

class SMS extends Model { }

SMS.init(
    {
        phone: { type: DataTypes.STRING, primaryKey: true },
        account: DataTypes.STRING,
        verifyCode: DataTypes.STRING,
        sendTime: DataTypes.DATE, //发送短信时间
        state: DataTypes.STRING, //
        createdAt: DataTypes.DATE, //数据创建时间
        updatedAt: DataTypes.DATE //数据修改时间
    },
    { sequelize }
);

module.exports = SMS;
