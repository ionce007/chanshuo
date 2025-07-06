const { DataTypes, Model } = require('sequelize');
const sequelize = require('../common/database');

class SMS extends Model { }

SMS.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        phone: { type: DataTypes.STRING },
        account: DataTypes.STRING,
        password: DataTypes.STRING,
        email: DataTypes.STRING,
        token: DataTypes.STRING,
        verifyCode: DataTypes.STRING,
        sendTime: DataTypes.DATE, //发送短信时间
        state: DataTypes.STRING, //
        createdAt: DataTypes.DATE, //数据创建时间
        updatedAt: DataTypes.DATE //数据修改时间
    },
    { sequelize }
);

module.exports = SMS;
