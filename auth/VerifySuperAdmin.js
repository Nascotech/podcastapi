/**
 * Created by Akshay Sangani.
 * User: theta-ubuntu-1
 * Date: 7/6/19
 * Time: 4:37 PM
 */
let mongoose = require('mongoose');
let constants = require('../Utils/ModelConstants');
let varConst = require('../Utils/Constants');
let responseHandler = require('../Utils/ResponseHandler');
let HttpStatus = require('http-status-codes');

//Models
let DeviceInfo = mongoose.model(constants.DeviceInfoModel);
let UserModel = mongoose.model(constants.UserModel);

function verifySuperAdmin(req, res, next) {

    // check header or url parameters or post parameters for token
    let token = req.headers['httpx-thetatech-accesstoken'];

    if (!token) return responseHandler.sendResponse(res, "", HttpStatus.BAD_REQUEST, "'No token provided.'");

    // verifies device and checks exp
    DeviceInfo.findOne({'deviceAccessToken': token, 'isLogin': varConst.ACTIVE}, function (err, device) {
        if (err) return responseHandler.sendResponse(res, err, HttpStatus.BAD_REQUEST, err.name);
        if (!device) return responseHandler.sendResponse(res, "", HttpStatus.NOT_FOUND, 'Device info not found.');

        UserModel.findOne({'_id': device.userId}).deepPopulate('role').exec(function (err, user) {
            if (err) return responseHandler.sendResponse(res, err, HttpStatus.BAD_REQUEST, err.name);
            if (!user) return responseHandler.sendResponse(res, "", HttpStatus.NOT_FOUND, 'User not found.');

            if (user.role.slug === varConst.USER) {
                responseHandler.sendResponse(res, "", HttpStatus.FORBIDDEN, 'Access Denied')
            } else if (user.isDeleted === varConst.DELETED) {
                responseHandler.sendResponse(res, err, HttpStatus.UNAUTHORIZED, "Your account is deleted")
            } else if (user.isActive === varConst.INACTIVE) {
                responseHandler.sendResponse(res, err, HttpStatus.UNAUTHORIZED, "Your account is deleted")
            } else {
                // if everything is good, save to request for use in other routes
                req.body.userId = device.userId;
                req.body.platform = device.devicePlatform;
                next();
            }
        });
    });
}

module.exports = verifySuperAdmin;
