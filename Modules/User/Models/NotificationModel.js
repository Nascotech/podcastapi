/**
 * Created by Akshay Sangani.
 * User: theta-ubuntu-1
 * Date: 17/9/19
 * Time: 2:04 PM
 */
let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let FCM = require('fcm-node');
let constants = require('../../../Utils/ModelConstants');
let varConst = require('../../../Utils/Constants');
let deepPopulate = require('mongoose-deep-populate')(mongoose);
let mongooseValidationErrorTransform = require('mongoose-validation-error-transform');
let DeviceInfo = mongoose.model(constants.DeviceInfoModel);
let UserModel = mongoose.model(constants.UserModel);

//notification
let fcm = new FCM(varConst.FIREBASE_MOBILE_KEY);
let fcmWeb = new FCM(varConst.FIREBASE_WEB_KEY);

let schema = new Schema({

    user: {type: String, ref: constants.UserModel, required: true},
    title: {type: String},
    body: {type: String},
    notificationType: {type: String},
    payload: {type: String},
    isRead: {type: Number, default: varConst.UNREAD}
}, {
    collection: constants.NotificationModel, autoIndex: true, timestamps: true,
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
schema.statics.sendNotification = function (userIdArr, title, body, payload) {

    UserModel.find({'_id': {$in: userIdArr}}).exec(function (err, users) {

        if (users) {
            if (users.length > 0) {
                getUserDevices(users, function (devices) {

                    if (devices.webDevices.length > 0) {
                        sendWebNotification(devices.webDevices, title, payload, function (res) {
                            console.log(res);
                        });
                    }

                    if (devices.iosDevices.length > 0) {
                        sendiosNotification(devices.iosDevices, title, body, payload, function (res) {
                            console.log(res);
                        });
                    }

                    if (devices.androidDevices.length > 0) {
                        sendAndroidNotification(devices.androidDevices, title, body, payload, function (res) {
                            console.log(res);
                        });
                    }
                });
            }
        }
    });
};

function sendAndroidNotification(tokens, title, body, payload, callback) {

    let count = 0;
    tokens.forEach(function (to) {
        let message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
            to: to,
            notification: {
                title: title,
                body: body,
                sound: "default",
            },
            data: payload.data
        };

        fcm.send(message, function (err, response) {
            if (err) {
                console.log("Something has gone wrong!");
            } else {
                console.log("Successfully sent with response: ", response);
            }

            count++;
            if (count == tokens.length) {
                callback("Send All");
            }
        });
    });
}

function sendiosNotification(tokens, title, body, payload, callback) {

    let count = 0;
    tokens.forEach(function (to) {
        let message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
            to: to,
            notification: {
                title: title,
                body: body,
                sound: "default"
            },
            data: {
                "response": payload
            }
        };

        fcm.send(message, function (err, response) {
            if (err) {
                console.log("Something has gone wrong!");
            } else {
                console.log("Successfully sent with response: ", response);
            }

            count++;
            if (count == tokens.length) {
                callback("Send All");
            }
        });
    });
}

function sendWebNotification(tokens, notification, payload, callback) {

    let count = 0;
    tokens.forEach(function (to) {
        let message = {
            to: to,
            notification: {
                title: varConst.APP_NAME,
                body: notification
            },
            data: payload
        };

        fcmWeb.send(message, function (err, response) {
            if (err) {
                console.log("Something has gone wrong!");
            } else {
                console.log("Successfully sent with response: ", response);
            }

            count++;
            if (count == tokens.length) {
                callback("Send All");
            }
        });
    });
}

function getUserDevices(users, callback) {

    let webDevices = [];
    let iosDevices = [];
    let androidDevices = [];

    users.forEach(function (user) {
        DeviceInfo.find({'userId': user.id}).exec(function (err, devices) {
            if (devices.length > 0) {
                let count = 0;
                devices.forEach(function (device) {
                    if (device.devicePlatform === varConst.PLATFORM_WEB) {
                        count++;
                        webDevices.push(device.deviceToken);
                    } else if (device.devicePlatform === varConst.PLATFORM_IOS) {
                        count++;
                        iosDevices.push(device.deviceToken);
                    } else {
                        count++;
                        androidDevices.push(device.deviceToken);
                    }

                    if (count == devices.length) {
                        callback({
                            "webDevices": webDevices,
                            "iosDevices": iosDevices,
                            "androidDevices": androidDevices
                        });
                    }
                });
            }
        });
    });
}

mongoose.model(constants.NotificationModel, schema);
