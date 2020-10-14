/**
 * Created by WebStorm.
 * User: theta-ubuntu-1
 * Date: 02/03/20
 * Time: 3:04 PM
 */
let mongoose = require('mongoose');
let constants = require('../Utils/ModelConstants');
let responseHandler = require('../Utils/ResponseHandler');
let varConst = require('../Utils/Constants');
let HttpStatus = require('http-status-codes');
let UserModel = mongoose.model(constants.UserModel);

function VerifyRecastToken(req, res, next) {
    // check header or url parameters or post parameters for token
    let token = req.headers['access_token'];

    if (!token) return responseHandler.sendResponse(res, "", HttpStatus.BAD_REQUEST, "'No token provided.'");

    function getUserModel(token) {
        return new Promise(function (resolve, reject) {
            UserModel.findOne({'accessToken': token}).deepPopulate('role').then(user => {
                if (!user) reject(responseHandler.sendResponse(res, "", HttpStatus.UNAUTHORIZED, 'Access Token not valid'));
                if (user.isDeleted === varConst.DELETED) {
                    reject(responseHandler.sendResponse(res, "", HttpStatus.UNAUTHORIZED, "Your account is deleted"));
                } else if (user.isActive === varConst.INACTIVE) {
                    reject(responseHandler.sendResponse(res, "", HttpStatus.UNAUTHORIZED, "Your account is inactive"));
                } else {
                    req.body.userId = user.id;
                    req.body.sgTokenType = user.sgTokenType;
                    req.body.sgScope = user.sgScope;
                    req.body.sgClientId = user.sgClientId;
                    req.body.sgClientSecret = user.sgClientSecret;
                    req.body.sgAccessToken = user.sgAccessToken;
                    req.body.sgRefreshToken = user.sgRefreshToken;
                    req.body.sgBaseUrl = user.sgBaseUrl;
                    resolve(req);
                }
            }).catch(err => {
                if (err) reject(responseHandler.sendResponse(res, err, HttpStatus.BAD_REQUEST, err.name));
            })
        })
    }

    getUserModel(token).then(userInfo => {
        next()
    }).catch(error => {
        return error
    })
}

module.exports = VerifyRecastToken;
