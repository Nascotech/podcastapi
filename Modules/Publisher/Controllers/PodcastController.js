/**
* Created by WebStorm.
* User: theta-ubuntu-4
* Date: 09/11/20
* Time: 09:47 PM
*/
let mongoose = require('mongoose');
let async = require('async');
let constants = require('../../../Utils/ModelConstants');
let varConst = require('../../../Utils/Constants');
let stringConstants = require('../../../Utils/StringConstants');
let responseHandler = require('../../../Utils/ResponseHandler');

//models
let UserModel = mongoose.model(constants.UserModel);
let PodcastsModel = mongoose.model(constants.PodcastsModel);
let EpisodesModel = mongoose.model(constants.EpisodesModel);
let GroupsModel = mongoose.model(constants.GroupsModel);

let PodcastCtrl = {

  getPodcastDetails: function (request, response) {

    let input = request.body;
    let params = request.params;

    PodcastsModel.findOne({"publisher": input.userId, 'slug': params.slug}).then(result => {
      responseHandler.sendSuccess(response, result);
    }).catch(err => {
      if(err) responseHandler.sendInternalServerError(response, err, err.name);
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
        PodcastsModel.countDocuments(query).exec(function (err, result) {
          if (err) responseHandler.sendInternalServerError(response, err, err.name);

          callback(err, result);
        });
      },
      list: function (callback) {
        if (isPagination) {
          PodcastsModel.find(query).limit(pageSize).skip((pageNo - 1) * pageSize).sort('-createdAt').exec(function (err, result) {
            if (err) responseHandler.sendInternalServerError(response, err, err.name);

            callback(err, result);
          });
        } else {
          PodcastsModel.find(query).sort('-createdAt').exec(function (err, result) {
            if (err) responseHandler.sendInternalServerError(response, err, err.name);

            callback(err, result);
          });
        }
      },
    }, function (err, results) {
      if (err) responseHandler.sendInternalServerError(response, err, err.name);

      let json = {
          "total": results.count,
          "list": results.list,
      };
      responseHandler.sendSuccess(response, json);
    });
  },

  getPodcastEpisodes: async function (request, response) {

    let params = request.params;
    let input = request.body;
    let queryP = request.query;
    let pageNo = (queryP.pageNo != null && queryP.pageNo != '' && queryP.pageNo != 0 && queryP.pageNo != "undefined") ? queryP.pageNo : 1;
    let podcastModel = await PodcastsModel.findOne({"publisher": input.userId, 'slug': params.slug});
    let query = {"publisher": input.userId, 'sgPodcastId': podcastModel.podcastId};

    async.parallel({
      count: function (callback) {
        EpisodesModel.countDocuments(query).exec(function (err, result) {
          if (err) responseHandler.sendInternalServerError(response, err, err.name);

          callback(err, result);
        });
      },
      list: function (callback) {
        EpisodesModel.find(query).limit(varConst.PAGE_SIZE_25).skip((pageNo - 1) * varConst.PAGE_SIZE_25).sort('-pubDate').exec(function (err, result) {
          if (err) responseHandler.sendInternalServerError(response, err, err.name);

          callback(err, result);
        });
      },
    }, function (err, results) {
      if (err) responseHandler.sendInternalServerError(response, err, err.name);

      let json = {
          "total": results.count,
          "list": results.list,
      };
      responseHandler.sendSuccess(response, json);
    });
  },

  getGroups: function(request, response) {

    let input = request.body;

    GroupsModel.find({"publisher": input.userId}).then(result => {
      responseHandler.sendSuccess(response, result);
    }).catch(err => {
      if(err) responseHandler.sendInternalServerError(response, err, err.name);
    });
  },

  userGroups: function(request, response) {

    let input = request.body;
    let params = request.params;

    GroupsModel.find({"publisher": params.publisherId}).then(result => {
      responseHandler.sendSuccess(response, result);
    }).catch(err => {
      if(err) responseHandler.sendInternalServerError(response, err, err.name);
    });
  },
};

module.exports = PodcastCtrl;
