/**
 * Created by Akshay Sangani.
 * User: theta-ubuntu-1
 * Date: 7/6/19
 * Time: 4:37 PM
 */
let https = require('https');
let fs = require("fs");
let express = require('express');
let bodyParser = require('body-parser');
let logger = require('morgan');
let util = require('util');
let port = require('./Configs/masterConfig.json')["port"];
let dev = require('./Configs/masterConfig.json')["dev"];
let path = require('path');
let app = module.exports = express();
let HttpStatus = require('http-status-codes');

app.use(logger('dev'));
global.appRoot = path.resolve(__dirname);

// log only 4xx and 5xx responses to console
app.use(logger('dev', {
    skip: function (req, res) {
        return res.statusCode < 400
    }
}));

// log all requests to access.log
app.use(logger('common', {
    stream: fs.createWriteStream(path.join(__dirname, 'access.log'), {flags: 'a'})
}));

app.use(bodyParser.urlencoded({extended: true}));
// increasing the limit : else giving error Request entity too large.
app.use(bodyParser.json({
    limit: '100mb'
}));
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, access_token');
    res.setHeader('Access-Control-Allow-Credentials', true);

    //intercepts OPTIONS methodcreateServer
    if ('OPTIONS' === req.method) {
        //respond with 200
        res.sendStatus(200);
    } else {
        //move on
        next();
    }
});

require('./Connections/MongooseConnection');

/* Add the main Route File */
app.use(express.static(__dirname + '/public'));
require('./routes');
if (dev) {
    app.get('/database-backup', (req, res) => {
        res.sendFile('/public/db-backup-list.html', {root: __dirname});
    });
} else {
    app.get('/database-backup', (req, res) => {
        res.sendFile('/public/index.html', {root: __dirname});
    });
}

app.get('*', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});
// If no route is matched by now, it must be a 404
app.use(function (req, res, next) {
    let err = new Error('Not Found');
    err.status = HttpStatus.NOT_FOUND;
    next(err);
});

// Start the server
app.set('port', port);

if (dev) {
    let server = app.listen(app.get('port'), function () {
        util.log('Express server listening on port ' + server.address().port);
    });
} else {
    https.createServer({
        key: fs.readFileSync('/etc/letsencrypt/live/atunwapodcasts.com/privkey.pem'),
        cert: fs.readFileSync('/etc/letsencrypt/live/atunwapodcasts.com/cert.pem'),
        ca: fs.readFileSync('/etc/letsencrypt/live/atunwapodcasts.com/chain.pem')
    }, app).listen(app.get('port'), () => {
        util.log('Express server listening on port ' + port);
    });
}
