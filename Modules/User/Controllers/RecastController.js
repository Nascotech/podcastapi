/**
 * Created by Akshay Sangani.
 * User: theta-ubuntu-1
 * Date: 13/5/19
 * Time: 3:23 PM
 */
let mongoose = require('mongoose');
let HttpStatus = require('http-status-codes');
let constants = require('../../../Utils/ModelConstants');
let varConst = require('../../../Utils/Constants');
let stringConstants = require('../../../Utils/StringConstants');
let responseHandler = require('../../../Utils/ResponseHandler');
let requestAPI = require('request');

let UserModel = mongoose.model(constants.UserModel);

let RecastCtrl = {

    checkUserToken: function (request, response) {

        let input = request.body;

        UserModel.findOne({}, function (err, userInfo) {
            if (err) {
                responseHandler.sendResponse(response, "", HttpStatus.INTERNAL_SERVER_ERROR, stringConstants.InternalServerError);
            } else if (!userInfo) {
                responseHandler.sendResponse(response, "", HttpStatus.NOT_FOUND, "Auth info not found");
            } else {
                let options = {
                    url: varConst.PODCAST_BASE_URL + 'oauth/token',
                    method: 'POST',
                    headers: {
                        Connection: 'keep-alive',
                        Accept: '*/*',
                        'content-type': 'multipart/form-data;'
                    },
                    formData: {
                        username: userInfo.sgUsername,
                        client_secret: userInfo.sgClientSecret,
                        grant_type: userInfo.sgGrantType,
                        client_id: userInfo.sgClientId,
                        scope: userInfo.sgScope,
                        password: userInfo.sgPassword
                    }
                };

                requestAPI(options, function (err, result, body) {
                    if (err) responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err);

                    if (result.statusCode == 200) {
                        let finalRes = JSON.parse(result.body);
                        responseHandler.sendResponse(response, finalRes, HttpStatus.OK, "");
                    } else {
                        responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err);
                    }
                });
            }
        });
    },

    getOauthToken: function (request, response) {

        let input = request.body;

        let options = {
            url: varConst.PODCAST_BASE_URL + 'oauth/token',
            method: 'POST',
            headers: {
                Connection: 'keep-alive',
                Accept: '*/*',
                'content-type': 'multipart/form-data;'
            },
            formData: {
                username: input.username,
                client_secret: input.client_secret,
                grant_type: input.grant_type,
                client_id: input.client_id,
                scope: input.scope,
                password: input.password
            }
        };

        requestAPI(options, function (err, result, body) {
            if (err) responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err);

            if (result.statusCode == 200) {
                let finalRes = JSON.parse(result.body);
                responseHandler.sendResponse(response, finalRes, HttpStatus.OK, "");
            } else {
                responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err);
            }
        });
    },

    getPodcasts: function (request, response) {

        let input = request.body;
        let params = request.params;

        let options = {
            url: input.sgBaseUrl + 'api/v1/sgrecast/podcasts/feeds?page=' + params.pageNo,
            headers: {
                Connection: 'keep-alive',
                Accept: '*/*',
                Authorization: input.sgTokenType + ' ' + input.sgAccessToken
            }
        };

        requestAPI(options, function (err, result, body) {
            if (err) responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err);

            if (result.statusCode == 200) {
                let finalRes = JSON.parse(result.body);
                responseHandler.sendResponse(response, finalRes, HttpStatus.OK, "");
            } else {
                responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err);
            }
        });
    },

    getPodcastDetails: function (request, response) {

        let input = request.body;
        let params = request.params;

        let options = {
            url: input.sgBaseUrl + 'api/v1/sgrecast/podcasts/feeds/view/' + params.podcastId,
            headers: {
                Connection: 'keep-alive',
                Accept: '*/*',
                Authorization: input.sgTokenType + ' ' + input.sgAccessToken
            }
        };

        requestAPI(options, function (err, result, body) {
            if (err) responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err);

            if (result.statusCode == 200) {
                let finalRes = JSON.parse(result.body);
                responseHandler.sendResponse(response, finalRes, HttpStatus.OK, "");
            } else {
                responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err);
            }
        });
    },

    getPodcastEpisodes: function (request, response) {

        let params = request.params;
        let input = request.body;

        let options = {
            url: input.sgBaseUrl + 'api/v1/sgrecast/podcasts/feeds/episodes/' + params.podcastId,
            headers: {
                Connection: 'keep-alive',
                Accept: '*/*',
                Authorization: input.sgTokenType + ' ' + input.sgAccessToken
            }
        };

        requestAPI(options, function (err, result, body) {
            if (err) responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err);

            if (result.statusCode == 200) {
                let finalRes = JSON.parse(result.body);
                responseHandler.sendResponse(response, finalRes, HttpStatus.OK, "");
            } else {
                responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err);
            }
        });
    },
};

module.exports = RecastCtrl;
