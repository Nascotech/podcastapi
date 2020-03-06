/**
 * Created by Akshay Sangani.
 * User: theta-ubuntu-1
 * Date: 17/5/19
 * Time: 3:55 PM
 */
let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let constants = require('../../../Utils/ModelConstants');
let deepPopulate = require('mongoose-deep-populate')(mongoose);
let schema = new Schema({

    originalName: {type: String, required: true},
    fileName: {type: String, required: true},
    destination: {type: String, required: true},
    path: {type: String, required: true},
    size: {type: Number, required: true}
}, {
    collection: constants.PhotosModel, autoIndex: true, timestamps: true,
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
mongoose.model(constants.PhotosModel, schema);
