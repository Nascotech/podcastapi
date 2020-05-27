/**
 * Created by Akshay Sangani.
 * User: theta-ubuntu-1
 * Date: 08/04/20
 * Time: 10:45 AM
 */
let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let constants = require('../../../Utils/ModelConstants');
let deepPopulate = require('mongoose-deep-populate')(mongoose);
let varConst = require('../../../Utils/Constants');
let mongooseValidationErrorTransform = require('mongoose-validation-error-transform');
let schema = new Schema({

    publisher: {type: String, required: true, ref: constants.UserModel},
    podcastId: {type: Number},
    guid: {type: String},
    name: {type: String},
    description: {type: String},
    language: {type: String},
    link: {type: String},
    xmlFilename: {type: String},
    prefixUrl: {type: String},
    limit: {type: String},
    image: {type: String},
    rssFeed: {type: String},
    categories: [{type: String}],
    syndications: [{googlePlay: String, iTunes: String, tuneIn: String}],
    awEpisodeId: {type: Number},
    awCollectionId: {type: String},
    awGenre: {type: String},
    itunesAuthor: {type: String},
    itunesBlock: {type: String},
    itunesEmail: {type: String},
    itunesExplicit: {type: String},
    itunesKeywords: {type: String},
    itunesLink: {type: String},
    itunesName: {type: String},
    itunesNewFeed: {type: String},
    itunesSubtitle: {type: String},
    itunesSummary: {type: String},
    itunesType: {type: String},
    copyright: {type: String},
    goooglePlayLink: {type: String},
    subOverrideLink: {type: String},
    ttl: {type: String},
    group: {type: Number},
    user: {type: Number},
    createdBy: {type: String},
    createdAt: {type: String},
    createdAtTimestamp: {type: String},
    updatedAt: {type: String},
    updatedAtTimestamp: {type: String},
    backgroundColor: {type: String},
    primaryColor: {type: String},
    lighterColor: {type: String},
    fontSelect: {type: String},
    disableScrub: {type: String},
    disableDownload: {type: String},
    playerAutoCreation: {type: Number}
}, {
    collection: constants.PodcastsModel, autoIndex: true, usePushEach: true,
    toObject: {
        transform: function (doc, obj) {
            obj.id = Number(obj.podcastId);
        }
    },
    toJSON: {
        transform: function (doc, obj) {
            obj.id = Number(obj.podcastId);
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
mongoose.model(constants.PodcastsModel, schema);
