/**
 * Created by Akshay Sangani.
 * User: theta-ubuntu-1
 * Date: 13/5/19
 * Time: 3:23 PM
 */
let mongoose = require('mongoose');
let HttpStatus = require('http-status-codes');
let async = require('async');
let constants = require('../../../Utils/ModelConstants');
let varConst = require('../../../Utils/Constants');
let stringConstants = require('../../../Utils/StringConstants');
let responseHandler = require('../../../Utils/ResponseHandler');
let requestAPI = require('request');

let UserModel = mongoose.model(constants.UserModel);
let PodcastsModel = mongoose.model(constants.PodcastsModel);

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

      let isPagination = (input.isPagination == true) ? true : false;
      let pageNo = (input.pageNo != null && input.pageNo != '' && input.pageNo != 0 && input.pageNo != "undefined") ? input.pageNo : 1;
      let pageSize = (input.pageSize != null && input.pageSize != '' && input.pageSize != 0 && input.pageSize != "undefined") ? parseInt(input.pageSize) : varConst.PAGE_SIZE;
      let group = (input.groupId != null && input.groupId != '' && input.groupId != 0 && input.groupId != "undefined") ? {"group": input.groupId} : {};
      let userName = (input.keyword != null && input.keyword != '' && input.keyword != "undefined") ? {
        $or: [
            {name: {'$regex': input.keyword, '$options': 'i'}},
        ]
      } : {};

      let query = {$and: [{"publisher": input.userId}, group, userName]};

      async.parallel({
          count: function (callback) {
              PodcastsModel.count(query).exec(function (err, result) {
                  if (err) responseHandler.sendResponse(response, err, 400, err.name);

                  callback(err, result);
              });
          },
          list: function (callback) {
              if (isPagination) {
                  PodcastsModel.find(query).limit(pageSize).skip((pageNo - 1) * pageSize).sort('-createdAt').exec(function (err, result) {
                      if (err) responseHandler.sendResponse(response, err, 400, err.name);

                      callback(err, result);
                  });
              } else {
                  PodcastsModel.find(query).sort('-createdAt').exec(function (err, result) {
                      if (err) responseHandler.sendResponse(response, err, 400, err.name);

                      callback(err, result);
                  });
              }
          },
      }, function (err, results) {
          if (err) responseHandler.sendResponse(response, err, 400, err.name);

          let json = {
              "total": results.count,
              "list": results.list,
          };
          responseHandler.sendResponse(response, json, 200, "");
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
        let queryP = request.query;
        let pageNo = (queryP.pageNo != null && queryP.pageNo != '' && queryP.pageNo != 0 && queryP.pageNo != "undefined") ? queryP.pageNo : 1;

        let options = {
          url: input.sgBaseUrl + 'api/v1/sgrecast/podcasts/feeds/episodes/' + params.podcastId + '?length=10&page=' + pageNo,
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

    getGroups: function(request, response) {

      let input = request.body;

      let pageNo = (input.pageNo != null && input.pageNo != '' && input.pageNo != 0 && input.pageNo != "undefined") ? input.pageNo : 1;

      let options = {
          method: 'GET',
          url: input.sgBaseUrl + 'api/v1/groups?page=' + pageNo,
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
    }
};

module.exports = RecastCtrl;
