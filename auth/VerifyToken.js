/**
 * Created by Akshay Sangani.
 * User: theta-ubuntu-1
 * Date: 7/6/19
 * Time: 4:37 PM
 */
let mongoose = require('mongoose');
let constants = require('../Utils/ModelConstants');
let responseHandler = require('../Utils/ResponseHandler');
let varConst = require('../Utils/Constants');
let HttpStatus = require('http-status-codes');
//Models
let DeviceInfo = mongoose.model(constants.DeviceInfoModel);
let UserModel = mongoose.model(constants.UserModel);

function verifyToken(req, res, next) {
    // check header or url parameters or post parameters for token
    let token = req.headers['httpx-thetatech-accesstoken'];

    if (!token) return responseHandler.sendResponse(res, "", HttpStatus.BAD_REQUEST, "'No token provided.'");

    function getDeviceInfo(token) {
        return new Promise(function (resolve, reject) {
            DeviceInfo.findOne({'deviceAccessToken': token, 'isLogin': varConst.ACTIVE}, function (err, device) {
                if (err) reject(responseHandler.sendResponse(res, err, HttpStatus.BAD_REQUEST, err.name));
                if (!device) reject(responseHandler.sendResponse(res, "", HttpStatus.UNAUTHORIZED, 'Device info not found.'));
                resolve(device);
            });
        })
    }

    function getUserModel(device) {
        return new Promise(function (resolve, reject) {
            UserModel.findOne({'_id': device.userId}).deepPopulate('role').then(user => {
                if (!user) reject(responseHandler.sendResponse(res, "", HttpStatus.NOT_FOUND, 'User not found.'));
                if (user.isDeleted === varConst.DELETED) {
                    reject(responseHandler.sendResponse(res, err, HttpStatus.UNAUTHORIZED, "Your account is deleted"));
                } else {
                    req.body.userId = device.userId;
                    req.body.platform = device.devicePlatform;
                    resolve(req);
                }
            }).catch(err => {
                if (err) reject(responseHandler.sendResponse(res, err, HttpStatus.BAD_REQUEST, err.name));
            })
        })
    }

    getDeviceInfo(token)
        .then(device => {
            return getUserModel(device)
        })
        .then(request => {
            next()
        }).catch(error => {
        return error
    })
}

module.exports = verifyToken;
