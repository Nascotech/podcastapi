/**
 * Created by Akshay Sangani.
 * User: theta-ubuntu-1
 * Date: 06/11/20
 * Time: 04:04 PM
 */
let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let constants = require('../../../Utils/ModelConstants');
let deepPopulate = require('mongoose-deep-populate')(mongoose);
let varConst = require('../../../Utils/Constants');
let mongooseValidationErrorTransform = require('mongoose-validation-error-transform');
let schema = new Schema({

    publisher: {type: String, required: true, ref: constants.UserModel},
    groupId: {type: Number, required: true},
    name: {type: String, required: true},
    displayName: {type: String, required: true},
    description: {type: String},
    parent: {type: Number},
    type: {type: String},
}, {
  collection: constants.GroupsModel, autoIndex: true, usePushEach: true,
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
mongoose.model(constants.GroupsModel, schema);
