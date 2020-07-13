/**
 * Created by Akshay Sangani.
 * User: theta-ubuntu-1
 * Date: 13/07/20
 * Time: 11:05 AM
 */
let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let constants = require('../../../Utils/ModelConstants');
let deepPopulate = require('mongoose-deep-populate')(mongoose);
let varConst = require('../../../Utils/Constants');
let mongooseValidationErrorTransform = require('mongoose-validation-error-transform');
let schema = new Schema({

    sidebar1: {type: String, required: true},
    sidebar2: {type: String, required: true},
    sidebar3: {type: String, required: true},
    sidebar4: {type: String, required: true},
    leaderboard1: {type: String, required: true},
}, {
    collection: constants.DefaultConfigModel, autoIndex: true, timestamps: true, usePushEach: true,
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
mongoose.model(constants.DefaultConfigModel, schema);
