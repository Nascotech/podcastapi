/**
 * Created by Akshay Sangani.
 * User: theta-ubuntu-1
 * Date: 13/5/19
 * Time: 3:23 PM
 */
let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let constants = require('../../../Utils/ModelConstants');
let varConst = require('../../../Utils/Constants');
let deepPopulate = require('mongoose-deep-populate')(mongoose);
let mongooseValidationErrorTransform = require('mongoose-validation-error-transform');
let schema = new Schema({

    roleName: {type: String, required: true},
    slug: {type: String, required: true, unique: true},
    status: {type: Number, default: varConst.ACTIVE},
    isDeleted: {type: Number, default: varConst.NOT_DELETED}
}, {
    collection: constants.RolesModel, autoIndex: true, timestamps: true,
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
mongoose.model(constants.RolesModel, schema);
