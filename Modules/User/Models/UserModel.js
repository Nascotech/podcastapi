/**
 * Created by Akshay Sangani.
 * User: theta-ubuntu-1
 * Date: 07/06/19
 * Time: 1:20 PM
 */
let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let constants = require('../../../Utils/ModelConstants');
let deepPopulate = require('mongoose-deep-populate')(mongoose);
let varConst = require('../../../Utils/Constants');
let mongooseValidationErrorTransform = require('mongoose-validation-error-transform');
let schema = new Schema({

    firstName: {type: String},
    lastName: {type: String},
    fullName: {type: String},
    email: {type: String, index: true, format: 'email'},
    role: {type: String, required: true, ref: constants.RolesModel},
    photo: {type: String, ref: constants.PhotosModel},
    accessToken: {type: String},
    password: {type: String},
    passwordResetToken: {type: String},
    isVerified: {type: Number, default: varConst.ACTIVE},  //0=no, 1=yes
    isActive: {type: Number, default: varConst.ACTIVE},  //0=no, 1=yes
    isResetPassword: {type: Number, default: varConst.INACTIVE},  //0=no, 1=yes
    isDeleted: {type: Number, default: varConst.NOT_DELETED},  //0=no, 1=yes

    //sgrecast credentials
    homeDomain: {type: String}, //yyyy-mm-dd
    registeredDate: {type: String}, //yyyy-mm-dd
    publisherName: {type: String},
    domain: {type: String},
    sgBaseUrl: {type: String},
    sgUsername: {type: String},
    sgClientSecret: {type: String},
    sgGrantType: {type: String},
    sgClientId: {type: String},
    sgScope: {type: String},
    sgPassword: {type: String},
    sgTokenType: {type: String},
    headerColor: {type: String},
    footerColor: {type: String},
    headerScript: {type: String},
    sidebar1: {type: String},
    sidebar2: {type: String},
    sidebar3: {type: String},
    sidebar4: {type: String},
    leaderboard1: {type: String},
    sgAccessToken: {type: String},
    sgRefreshToken: {type: String},
    updatedTokenDate: {type: Date},
}, {
    collection: constants.UserModel, autoIndex: true, timestamps: true, usePushEach: true,
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
schema.plugin(deepPopulate);
mongoose.plugin(mongooseValidationErrorTransform, {
  capitalize: true,
  humanize: true,
  transform: function(messages) {
    return messages;
  }
});
mongoose.model(constants.UserModel, schema);
