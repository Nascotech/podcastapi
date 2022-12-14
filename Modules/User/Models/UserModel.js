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
    favIcon: {type: String, ref: constants.PhotosModel},
    accessToken: {type: String},
    password: {type: String},
    passwordResetToken: {type: String},
    isVerified: {type: Number, default: varConst.ACTIVE},  //0=no, 1=yes
    isActive: {type: Number, default: varConst.ACTIVE},  //0=no, 1=yes
    isResetPassword: {type: Number, default: varConst.INACTIVE},  //0=no, 1=yes
    isDeleted: {type: Number, default: varConst.NOT_DELETED},  //0=no, 1=yes
    groupName: {type: String},
    groupId: {type: Number},
    podcastsGroups: [{type: Number}],

    headerScript: {type: String},
    bodyScript: {type: String},

    //sgrecast credentials
    homeDomain: {type: String}, //yyyy-mm-dd
    registeredDate: {type: String}, //yyyy-mm-dd
    publisherName: {type: String},
    publisherSlug: {type: String},
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
    termsOfUse: {type: String},
    googleCode: {type: String},
    privacyPolicy: {type: String},
    headerScript: {type: String},
    sgAccessToken: {type: String},
    sgRefreshToken: {type: String},
    updatedTokenDate: {type: Date},
    isSync: {type: Number, default: varConst.INACTIVE},  //0=no, 1=yes

    lastSyncDate: {type: Date}

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
    transform: function (messages) {
        return messages;
    }
});
mongoose.model(constants.UserModel, schema);
