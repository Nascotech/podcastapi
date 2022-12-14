/**
 * Created by Akshay Sangani.
 * User: theta-ubuntu-1
 * Date: 05/11/20
 * Time: 03:17 PM
 */
let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let constants = require('../../../Utils/ModelConstants');
let deepPopulate = require('mongoose-deep-populate')(mongoose);
let varConst = require('../../../Utils/Constants');
let mongooseValidationErrorTransform = require('mongoose-validation-error-transform');
let schema = new Schema({

    sgPodcastId: {type: Number, required: true},
    podcastName: {type: String},
    title: {type: String, required: true},
    description: {type: String},
    guid: {
      value: {type: String},
      permaLink: {type: Boolean}
    },
    duration: {type: String},
    url: {type: String},
    type: {type: String},
    length: {type: Number},
    image: {type: String},
    pubDate: {type: Date},
}, {
  collection: constants.OtherEpisodesModel, autoIndex: true, timestamps: true, usePushEach: true,
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
mongoose.model(constants.OtherEpisodesModel, schema);
