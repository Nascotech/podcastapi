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
let requestAPI = require('request');
let arrayDiff = require('simple-array-diff');

//Models
let UserModel = mongoose.model(constants.UserModel);
let RolesModel = mongoose.model(constants.RolesModel);
let PodcastsModel = mongoose.model(constants.PodcastsModel);

let Publisher = {

    addPublisher: function (request, response, next) {
        let input = request.body;
        UserModel.findOne({'email': input.email.toLowerCase()}, function (err, publisher) {
            if (err) responseHandler.sendResponse(response, "", HttpStatus.INTERNAL_SERVER_ERROR, stringConstants.InternalServerError);
            if (publisher) responseHandler.sendResponse(response, "", HttpStatus.BAD_REQUEST, stringConstants.UserAlreadyExist);
            RolesModel.findOne({'slug': varConst.PUBLISHER}, function (err, roleInfo) {
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
        UserModel.findOne({'_id': input.publisherId}, function (err, publisher) {
            if (err) responseHandler.sendResponse(response, "", HttpStatus.INTERNAL_SERVER_ERROR, stringConstants.InternalServerError);
            if (publisher) {
                publisher.firstName = input.firstName;
                publisher.lastName = input.lastName;
                publisher.isResetPassword = varConst.ACTIVE;
                publisher.sgBaseUrl = input.baseUrl;
                publisher.sgScope = input.scope;
                publisher.sgClientId = input.clientId;
                publisher.sgGrantType = input.grantType;
                publisher.sgClientSecret = input.clientSecret;
                publisher.sgPassword = input.password;
                publisher.save(function (error, finalRes) {
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

        RolesModel.findOne({slug: varConst.PUBLISHER}).exec(function (err, roles) {
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
        UserModel.findOne({'_id': params.publisherId}).exec(function (err, user) {
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
        UserModel.findOne({'_id': params.publisherId}).exec(function (err, user) {
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
    },

    syncPodcastList: function (req, res) {
      function allUserList(users) {
          return new Promise(function (resolve, reject) {
              let count = 0;
              users.forEach(async user => {
                  oldPodcastArr = await fetchOldPodcastList(user);
                  await fetchFirstPodcastList(user, 1, oldPodcastArr, []);
                  count++;
                  if (users.length == count) {
                      resolve(true);
                  }
              })
          })
      }

      function fetchOldPodcastList(userInfo) {
        return new Promise(function (resolve, reject) {
          PodcastsModel.find({"publisher": userInfo.id}).sort({'podcastId': 1}).exec(function (err, result) {
              if (err) reject(err);
              resolve(result);
          });
        });
      }

      function fetchFirstPodcastList(userInfo, pageNo, oldPodcastArr, newPodcastArr) {
        return new Promise(async function (resolve, reject) {
          let firstPodcastList = await fetchPodcast(userInfo, pageNo);
          newPodcastArr = firstPodcastList.data;
          if(firstPodcastList.meta.last_page > 1) {
            resolve(fetchRemainingPodcast(userInfo, firstPodcastList.meta.last_page, oldPodcastArr, newPodcastArr));
          } else {
            resolve(podcastDiff(userInfo, oldPodcastArr, newPodcastArr));
          }
        });
      }

      function fetchRemainingPodcast(userInfo, lastPage, oldPodcastArr, newPodcastArr) {
        return new Promise(async function (resolve, reject) {
          for (let i = 2; i <= lastPage; i++) {
            let result = await fetchPodcast(userInfo, i);
            newPodcastArr = newPodcastArr.concat(result.data);
          }
          resolve(podcastDiff(userInfo, oldPodcastArr, newPodcastArr));
        });
      }

      function podcastDiff(userInfo, oldPodcastArr, newPodcastArr) {
        return new Promise(async function (resolve, reject) {
          let result = arrayDiff(JSON.parse(JSON.stringify(oldPodcastArr)), JSON.parse(JSON.stringify(newPodcastArr)), 'id');
          let addPodcast = (result.added.length > 0) ? await syncPodcastListIntoDatabase(result.added, userInfo) : true;
          let commonPodcast = (result.common.length > 0) ? await syncPodcastListIntoDatabase(result.common, userInfo) : true;
          let removedPodcast = (result.removed.length > 0) ? await removePodcastFromDatabase(result.removedPodcast, userInfo) : true;

          if(addPodcast && commonPodcast && removedPodcast) {
            resolve(true);
          } else {
            reject(false);
          }
        });
      }

      function fetchPodcast(userInfo, pageNo) {
        return new Promise(function (resolve, reject) {
          let options = {
              url: userInfo.sgBaseUrl + 'api/v1/sgrecast/podcasts/feeds?page=' + pageNo,
              headers: {
                  Connection: 'keep-alive',
                  Accept: '*/*',
                  Authorization: userInfo.sgTokenType + ' ' + userInfo.sgAccessToken
              }
          };

          requestAPI(options, function (err, result, body) {
              if (err) reject(err);

              if (result.statusCode == 200) {
                  resolve(JSON.parse(result.body));
              } else {
                  reject(err);
              }
          });
        })
      }

      function removePodcastFromDatabase(podcastLists, userInfo) {
        return new Promise(function (resolve, reject) {
          let count = 0;
          podcastLists.forEach(async podcast => {
            PodcastsModel.remove({"publisher": userInfo.id, podcastId: podcast.id}).exec(function (err, podcastsModel) {
              if (err) reject(err);

              count++;
              if (podcastLists.length == count) {
                  resolve(true);
              }
            });
          });
        });
      }

      function syncPodcastListIntoDatabase(podcastLists, userInfo) {
        return new Promise(function (resolve, reject) {
          let count = 0;
          podcastLists.forEach(async podcast => {

            PodcastsModel.findOne({"publisher": userInfo.id, podcastId:podcast.id}).exec(function (err, podcastsModel) {
              if (err) reject(err);

              if(!podcastsModel) podcastsModel = new PodcastsModel();

              podcastsModel.podcastId = podcast.id;
              podcastsModel.publisher = userInfo.id;
              podcastsModel.guid = podcast.guid;
              podcastsModel.name = podcast.name;
              podcastsModel.description = podcast.description;
              podcastsModel.language = podcast.language;
              podcastsModel.link = podcast.link;
              podcastsModel.xmlFilename = podcast.xmlFilename;
              podcastsModel.prefixUrl = podcast.prefixUrl;
              podcastsModel.limit = podcast.limit;
              podcastsModel.image = podcast.image;
              podcastsModel.rssFeed = podcast.rssFeed;
              podcastsModel.categories = podcast.categories;
              podcastsModel.syndications = podcast.syndications;
              podcastsModel.awEpisodeId = podcast.awEpisodeId;
              podcastsModel.awCollectionId = podcast.awCollectionId;
              podcastsModel.awGenre = podcast.awGenre;
              podcastsModel.itunesAuthor = podcast.itunesAuthor;
              podcastsModel.itunesBlock = podcast.itunesBlock;
              podcastsModel.itunesEmail = podcast.itunesEmail;
              podcastsModel.itunesExplicit = podcast.itunesExplicit;
              podcastsModel.itunesKeywords = podcast.itunesKeywords;
              podcastsModel.itunesLink = podcast.itunesLink;
              podcastsModel.itunesName = podcast.itunesName;
              podcastsModel.itunesNewFeed = podcast.itunesNewFeed;
              podcastsModel.itunesSubtitle = podcast.itunesSubtitle;
              podcastsModel.itunesSummary = podcast.itunesSummary;
              podcastsModel.itunesType = podcast.itunesType;
              podcastsModel.copyright = podcast.copyright;
              podcastsModel.goooglePlayLink = podcast.goooglePlayLink;
              podcastsModel.subOverrideLink = podcast.subOverrideLink;
              podcastsModel.ttl = podcast.ttl;
              podcastsModel.group = podcast.group;
              podcastsModel.user = podcast.user;
              podcastsModel.createdBy = podcast.createdBy;
              podcastsModel.createdAt = podcast.createdAt;
              podcastsModel.createdAtTimestamp = podcast.createdAtTimestamp;
              podcastsModel.updatedAt = podcast.updatedAt;
              podcastsModel.updatedAtTimestamp = podcast.updatedAtTimestamp;
              podcastsModel.backgroundColor = podcast.backgroundColor;
              podcastsModel.primaryColor = podcast.primaryColor;
              podcastsModel.lighterColor = podcast.lighterColor;
              podcastsModel.fontSelect = podcast.fontSelect;
              podcastsModel.disableScrub = podcast.disableScrub;
              podcastsModel.disableDownload = podcast.disableDownload;
              podcastsModel.playerAutoCreation = podcast.playerAutoCreation;
              podcastsModel.save(function (err, result) {
                  if (err) reject(err);

                  count++;
                  if (podcastLists.length == count) {
                      resolve(true);
                  }
              });
            });
          });
        })
      }

      RoleUserModel().then(users => {
          return allUserList(users);
      }).then(token => {
          console.log("success");
      }).catch(err => {
          console.log("err", err);
      });
    },
};
module.exports = Publisher;

let RoleUserModel = function (req, res) {
    return new Promise(function (resolve, reject) {
        RolesModel.findOne({slug: varConst.PUBLISHER}, function (err, result) {
            if (err) reject(err);
            UserModel.find({role: result.id}, function (err, result) {
                if (err) reject(err);
                resolve(result);
            })
        })
    })
}
