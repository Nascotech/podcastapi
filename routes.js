/**
 * Created by Akshay Sangani.
 * User: theta-ubuntu-1
 * Date: 7/6/19
 * Time: 4:37 PM
 */
let express = require('express');
let app = require('./server');
let router = express.Router();

require('./Modules/User/routes')(router);
require('./Modules/Publisher/routes')(router);

app.use(router);
module.exports = router;
