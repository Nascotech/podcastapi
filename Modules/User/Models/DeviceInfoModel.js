/**
 * Created by Akshay Sangani.
 * User: theta-ubuntu-1
 * Date: 06/07/19
 * Time: 1:10 PM
 */
let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let constants = require('../../../Utils/ModelConstants');
let varConst = require('../../../Utils/Constants');
let schema = new Schema({

    userId: {type: String, required: true},
    devicePlatform: {type: String, enum: ['web', 'ios', 'android'], required: true},
    deviceToken: {type: String},
    deviceAccessToken: {type: String, required: true},
    deviceUniqueId: {type: String, required: true},
    isLogin: {type: Number, default: varConst.ACTIVE},
    deviceModel: {type: String, required: true},
    os: {type: String, required: true},
}, {
    collection: constants.DeviceInfoModel, autoIndex: true, timestamps: true,
    toObject: {
        transform: function (doc, obj) {
            obj.id = obj._id;
            delete obj._id;
        }
    },
    toJSON: {
        transform: function (doc, obj) {
            obj.id = obj._id;
            delete obj._id;
        }
    }
});
mongoose.model(constants.DeviceInfoModel, schema);
