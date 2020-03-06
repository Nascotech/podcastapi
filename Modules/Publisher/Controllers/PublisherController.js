/**
 * Created by WebStorm.
 * User: theta-ubuntu-4
 * Date: 02/03/20
 * Time: 5:17 PM
 */
let mongoose = require('mongoose');
let HttpStatus = require('http-status-codes');
let async = require('async');
let path = require('path');
let bcrypt = require('bcryptjs');
let request = require('request');
let constants = require('../../../Utils/ModelConstants');
let varConst = require('../../../Utils/Constants');
let stringConstants = require('../../../Utils/StringConstants');
let responseHandler = require('../../../Utils/ResponseHandler');

//Models
let UserModel = mongoose.model(constants.UserModel);
let RolesModel = mongoose.model(constants.RolesModel);

let Publisher = {

    addPublisher: function (request, response, next) {
        let input = request.body;
        UserModel.findOne({'email': input.email.toLowerCase()}, function (err, provider) {
            if (err) responseHandler.sendResponse(response, "", HttpStatus.INTERNAL_SERVER_ERROR, stringConstants.InternalServerError);
            if (provider) responseHandler.sendResponse(response, "", HttpStatus.BAD_REQUEST, stringConstants.UserAlreadyExist);
            RolesModel.findOne({'slug': varConst.PROVIDER}, function (err, roleInfo) {
                if (err) responseHandler.sendResponse(response, "", HttpStatus.INTERNAL_SERVER_ERROR, stringConstants.InternalServerError);
                let userModel = new UserModel();
                userModel.email = input.email.toLowerCase();
                userModel.firstName = input.firstName;
                userModel.lastName = input.lastName;
                userModel.password = bcrypt.hashSync(varConst.PASSWORD, 8);
                userModel.role = roleInfo.id;
                userModel.isResetPassword = varConst.ACTIVE;
                userModel.sgBaseUrl = input.baseUrl;
                userModel.sgUsername = input.email.toLowerCase();
                userModel.sgScope = input.scope;
                userModel.sgClientId = input.clientId;
                userModel.sgGrantType = input.grantType;
                userModel.sgClientSecret = input.clientSecret;
                userModel.sgPassword = input.password;
                userModel.save(function (error, finalRes) {
                    if (error) responseHandler.sendResponse(response, error, HttpStatus.BAD_REQUEST, error.name);
                    request.body.userId = finalRes.id;
                    next();
                });
            });
        });
    },

    updatePublisher: function (request, response, next) {
        let input = request.body;
        UserModel.findOne({'_id': input.providerId}, function (err, provider) {
            if (err) responseHandler.sendResponse(response, "", HttpStatus.INTERNAL_SERVER_ERROR, stringConstants.InternalServerError);
            if (provider) {
                provider.firstName = input.firstName;
                provider.lastName = input.lastName;
                provider.isResetPassword = varConst.ACTIVE;
                provider.sgBaseUrl = input.baseUrl;
                provider.sgScope = input.scope;
                provider.sgClientId = input.clientId;
                provider.sgGrantType = input.grantType;
                provider.sgClientSecret = input.clientSecret;
                provider.sgPassword = input.password;
                provider.save(function (error, finalRes) {
                    if (error) responseHandler.sendResponse(response, error, HttpStatus.BAD_REQUEST, error.name);
                    request.body.userId = finalRes.id;
                    next();
                });
            } else {
                responseHandler.sendResponse(response, "", HttpStatus.BAD_REQUEST, stringConstants.UserAlreadyExist);
            }
        });
    },

    providerList: function (request, response) {
        let input = request.body;
        let pageNo = (input.pageNo != null && input.pageNo != '' && input.pageNo != 0 && input.pageNo != "undefined") ? input.pageNo : 1;
        let pageSize = (input.pageSize != null && input.pageSize != '' && input.pageSize != 0 && input.pageSize != "undefined") ? parseInt(input.pageSize) : varConst.PAGE_SIZE;

        RolesModel.findOne({slug: varConst.PROVIDER}).exec(function (err, roles) {
            if (err) responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err.name);
            let query = {role: roles.id};
            async.parallel({
                count: function (callback) {
                    UserModel.count(query).exec(function (error, result) {
                        if (error) responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err.name);
                        callback(error, result);
                    });
                },
                list: function (callback) {
                    UserModel.find(query, function (err, result) {
                        if (err) responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err);
                        callback(err, result);
                    });
                },
            }, function (err, results) {
                if (err) responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err.name);
                let json = {
                    "list": results.list,
                    "count": results.count
                };
                responseHandler.sendResponse(response, json, HttpStatus.OK, "");
            });
        });
    },

    changeStatus: function (request, response, next) {
        let params = request.params;
        UserModel.findOne({'_id': params.userId}).exec(function (err, user) {
            if (err) responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err.name);
            if (user.isActive == varConst.INACTIVE) {
                user.isActive = varConst.ACTIVE;
            } else if (user.isActive == varConst.ACTIVE) {
                user.isActive = varConst.INACTIVE;
            }
            user.save(function (error, finalRes) {
                if (error) responseHandler.sendResponse(response, error, HttpStatus.BAD_REQUEST, error.name);
                request.body.userId = finalRes.id;
                next();
            });
        });
    },

    removeUser: function (request, response) {
        let params = request.params;
        UserModel.findOne({'_id': params.userId}).exec(function (err, user) {
            if (err) responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err.name);
            user.isDeleted = varConst.DELETED;
            user.save(function (error, finalRes) {
                if (error) responseHandler.sendResponse(response, error, HttpStatus.BAD_REQUEST, error.name);
                responseHandler.sendResponse(response, "User Successfully Removed", HttpStatus.OK, "");
            });
        });
    },

    publisherInfo: function (request, response) {
        let input = request.body;
        UserModel.findOne({'_id': input.userId}).populate('role').exec(function (err, finalRes) {
            if (err) responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err.name);
            responseHandler.sendResponse(response, finalRes, HttpStatus.OK, "");
        });
    },

    publisherCronjob: function (req, res) {
        let RoleUserModel = function (req, res) {
            return new Promise(function (resolve, reject) {
                RolesModel.findOne({slug: varConst.PROVIDER}, function (err, result) {
                    if (err) reject(err);
                    UserModel.find({role: result.id}, function (err, result) {
                        if (err) reject(err);
                        resolve(result);
                    })
                })
            })
        }

        function TokenRefreshModel(users) {
            return new Promise(function (resolve, reject) {
                let count = 0;
                users.forEach(user => {
                    let options = {
                        url: user.sgBaseUrl + 'oauth/token',
                        method: 'POST',
                        headers: {
                            Connection: 'keep-alive',
                            Accept: '*/*',
                            'content-type': 'multipart/form-data;'
                        },
                        formData: {
                            client_secret: user.sgClientSecret,
                            refresh_token: user.sgRefreshToken,
                            scope: user.sgScope,
                            client_id: user.sgClientId,
                            grant_type: "refresh_token"
                        }
                    };
                    request(options, function (err, result, body) {
                        if (err) console.log(err);
                        if (result.statusCode == 200) {
                            let finalRes = JSON.parse(result.body);
                            user.sgTokenType = finalRes.token_type;
                            user.sgAccessToken = finalRes.access_token;
                            user.sgRefreshToken = finalRes.refresh_token;
                            user.updatedTokenDate = new Date();
                            user.save(function (err, result) {
                                if (err) reject(err);
                            });
                        } else {
                            console.log(HttpStatus.BAD_REQUEST);
                        }
                    });
                    count++;
                    if (users.length == count) {
                        resolve(true);
                    }
                })
            })
        }

        RoleUserModel().then(users => {
            return TokenRefreshModel(users);
        }).then(token => {
            console.log("success");
        }).catch(err => {
            console.log("err", err);
        });
    }

};
module.exports = Publisher;
