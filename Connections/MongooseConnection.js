/**
 * Created by Akshay Sangani.
 * User: theta-ubuntu-1
 * Date: 7/6/19
 * Time: 4:37 PM
 */
let mongoose = require('mongoose');
mongoose.Promise = global.Promise;
let defaultConfig = require('../Configs/masterConfig');
let uri = 'mongodb://' + defaultConfig['host'] + ':' + defaultConfig['mongodb_port'] + '/' + defaultConfig["db_name"];

let connectMongoose = function () {
    mongoose.connect(uri);
};

connectMongoose();

// Error handler
mongoose.connection.on('error', function (err) {
    console.log(err);
});

mongoose.connection.on('open', function () {
    //helper.importAllModels();
});

// Reconnect when closed
mongoose.connection.on('disconnected', function () {
    setTimeout(function () {
        connectMongoose();
    }, 1000);
});

let helper = {
    importAllModels: function () {
        // body...
        require('../Modules/User/bootstrap.js');
    }
};
helper.importAllModels();
