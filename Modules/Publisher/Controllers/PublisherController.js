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
let fs = require('fs');
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
let PhotosModel = mongoose.model(constants.PhotosModel);

let Publisher = {

    getPublisherRole: function (request, response, next) {
      RolesModel.findOne({'slug': varConst.PUBLISHER}, function (err, roleInfo) {
        if (err) {
          responseHandler.sendInternalServerError(response, err, err.name);
        } else {
          request.body.roleId = roleInfo.id;
          next();
        }
      });
    },

    addPublisher: function (request, response, next) {

      let input = request.body;
      UserModel.findOne({'email': input.email.toLowerCase()}, function (err, publisher) {
        if (err) {
          responseHandler.sendInternalServerError(response, err, err.name);
        }
        //  else if (publisher) {
        //   responseHandler.sendSuccess(response, "", stringConstants.UserAlreadyExist);
        // }
        else {
          let userModel = new UserModel();
          userModel.email = input.email.toLowerCase();
          userModel.accessToken = randomString(48);
          userModel.publisherName = input.publisherName;
          userModel.fullName = input.fullName;
          userModel.homeDomain = input.homeDomain;
          userModel.domain = input.domain;
          userModel.termsOfUse = input.termsOfUse;
          userModel.privacyPolicy = input.privacyPolicy;
          userModel.registeredDate = input.registeredDate;
          userModel.password = bcrypt.hashSync(varConst.PASSWORD, 8);
          userModel.role = input.roleId;
          userModel.sgUsername = input.sgUsername.toLowerCase();
          userModel.sgBaseUrl = input.sgBaseUrl;
          userModel.sgScope = input.sgScope;
          userModel.googleCode = input.googleCode;
          userModel.sgClientId = input.sgClientId;
          userModel.sgGrantType = input.sgGrantType;
          userModel.sgTokenType = input.sgTokenType;
          userModel.sgClientSecret = input.sgClientSecret;
          userModel.sgPassword = input.password;
          userModel.headerColor = input.headerColor;
          userModel.footerColor = input.footerColor;
          userModel.isResetPassword = varConst.ACTIVE;
          userModel.isActive = input.isActive;
          userModel.save(function (err, finalRes) {
            if (err) {
              responseHandler.sendSuccess(response, err, err.name);
            } else {
              request.body.userId = finalRes.id;
              next();
            }
          });
        }
      });
    },

    updatePublisher: function (request, response, next) {

      let input = request.body;

      UserModel.findOne({'_id': input.publisherId}, function (err, userModel) {
        if (err) {
          responseHandler.sendInternalServerError(response, err, err.name);
        } else {
          userModel.email = input.email.toLowerCase();
          userModel.publisherName = input.publisherName;
          userModel.homeDomain = input.homeDomain;
          userModel.fullName = input.fullName;
          userModel.domain = input.domain;
          userModel.termsOfUse = input.termsOfUse;
          userModel.privacyPolicy = input.privacyPolicy;
          userModel.registeredDate = input.registeredDate;
          userModel.sgUsername = input.sgUsername.toLowerCase();
          userModel.sgBaseUrl = input.sgBaseUrl;
          userModel.sgScope = input.sgScope;
          userModel.googleCode = input.googleCode;
          userModel.sgClientId = input.sgClientId;
          userModel.sgGrantType = input.sgGrantType;
          userModel.sgTokenType = input.sgTokenType;
          userModel.sgClientSecret = input.sgClientSecret;
          userModel.sgPassword = input.password;
          userModel.headerColor = input.headerColor;
          userModel.footerColor = input.footerColor;
          userModel.isActive = input.isActive;
          userModel.save(function (err, finalRes) {
            if (err) {
              responseHandler.sendSuccess(response, err, err.name);
            } else {
              request.body.oldPhotoId = finalRes.photo;
              request.body.userId = finalRes.id;
              next();
            }
          });
        }
      });
    },

    updateGroup: function (request, response, next) {

      let input = request.body;

      UserModel.findOne({'_id': input.publisherId}, function (err, userModel) {
        if (err) {
          responseHandler.sendInternalServerError(response, err, err.name);
        } else {
          userModel.groupName = input.groupName;
          userModel.groupId = input.groupId;
          userModel.save(function (err, finalRes) {
            if (err) {
              responseHandler.sendSuccess(response, err, err.name);
            } else {
              request.body.userId = finalRes.id;
              next();
            }
          });
        }
      });
    },

    unlinkPhoto: function (request, response, next) {

      let input = request.body;

      if (request.files.image) {
        UserModel.findOne({'_id': mongoose.Types.ObjectId(input.userId)}, function (err, userInfo) {
          PhotosModel.findOne({'_id': mongoose.Types.ObjectId(userInfo.photo)}, function (err, photoModel) {
            if (err){
              responseHandler.sendInternalServerError(response, err, err.name);
            } else if (!photoModel) {
              next();
            } else {
              fs.exists(photoModel.path, function (exists) {
                if (exists) {
                  fs.unlink(photoModel.path, function (err) {
                    photoModel.remove();
                    next();
                  });
                } else {
                  photoModel.remove();
                  next();
                }
              });
            }
          });
        });
      } else {
        next();
      }
    },

    unlinkFavIcon: function (request, response, next) {

      let input = request.body;

      if (request.files.favIcon) {
        UserModel.findOne({'_id': mongoose.Types.ObjectId(input.userId)}, function (err, userInfo) {
          PhotosModel.findOne({'_id': mongoose.Types.ObjectId(userInfo.favIcon)}, function (err, photoModel) {
            if (err){
              responseHandler.sendInternalServerError(response, err, err.name);
            } else if (!photoModel) {
              next();
            } else {
              fs.exists(photoModel.path, function (exists) {
                if (exists) {
                  fs.unlink(photoModel.path, function (err) {
                    photoModel.remove();
                    next();
                  });
                } else {
                  photoModel.remove();
                  next();
                }
              });
            }
          });
        });
      } else {
        next();
      }
    },

    uploadPhoto: function (request, response, next) {

      let input = request.body;

      if (request.files.image) {
        let count = 0;
        request.files.image.forEach(function (info) {
          let photosModel = new PhotosModel;
          photosModel.originalName = info.originalname;
          photosModel.fileName = info.filename;
          photosModel.destination = info.destination;
          photosModel.path = info.path;
          photosModel.size = info.size;
          photosModel.save((err, photo) => {
            if (err) {
              responseHandler.sendInternalServerError(response, err, err.name);
            } else {
              UserModel.findOne({_id: mongoose.Types.ObjectId(input.userId)}, function (err, userModel) {
                if (err) {
                  responseHandler.sendInternalServerError(response, err, err.name);
                } else {
                  userModel.photo = mongoose.Types.ObjectId(photo.id);
                  userModel.save((err, result) => {
                    if (err) {
                      responseHandler.sendInternalServerError(response, err, err.name);
                    } else {
                      count++;
                      if (request.files.image.length == count) {
                        next();
                      }
                    }
                  });
                }
              });
            }
          });
        });
      } else {
        next();
      }
    },

    uploadFavIcon: function (request, response, next) {

      let input = request.body;

      if (request.files.favIcon) {
        let count = 0;
        request.files.favIcon.forEach(function (info) {
          let photosModel = new PhotosModel;
          photosModel.originalName = info.originalname;
          photosModel.fileName = info.filename;
          photosModel.destination = info.destination;
          photosModel.path = info.path;
          photosModel.size = info.size;
          photosModel.save((err, photo) => {
            if (err) {
              responseHandler.sendInternalServerError(response, err, err.name);
            } else {
              UserModel.findOne({_id: mongoose.Types.ObjectId(input.userId)}, function (err, userModel) {
                if (err) {
                  responseHandler.sendInternalServerError(response, err, err.name);
                } else {
                  userModel.favIcon = mongoose.Types.ObjectId(photo.id);
                  userModel.save((err, result) => {
                    if (err) {
                      responseHandler.sendInternalServerError(response, err, err.name);
                    } else {
                      count++;
                      if (request.files.favIcon.length == count) {
                        next();
                      }
                    }
                  });
                }
              });
            }
          });
        });
      } else {
        next();
      }
    },

    publisherList: function (request, response) {

      let input = request.body;
      let params = request.query;

      let pageNo = (params.pageNo != null && params.pageNo != '' && params.pageNo != 0 && params.pageNo != "undefined") ? params.pageNo : 1;
      let pageSize = (params.pageSize != null && params.pageSize != '' && params.pageSize != 0 && params.pageSize != "undefined") ? parseInt(params.pageSize) : varConst.PAGE_SIZE;
      let isPagination = (params.isPagination == true) ? true : false;
      let searchQ = (params.keyword != null && params.keyword != '' && params.keyword != "undefined") ? {
        $or: [
            {fullName: {'$regex': params.keyword, '$options': 'i'}},
            {publisherName: {'$regex': params.keyword, '$options': 'i'}},
            {email: {'$regex': params.keyword, '$options': 'i'}}
        ]
      } : {};

      let query = {$and: [{'isDeleted': varConst.NOT_DELETED}, {'role': input.roleId}, searchQ]};

      async.parallel({
        count: function (callback) {input
          UserModel.count(query).countDocuments(function (err, result) {
            if (err) {
              responseHandler.sendInternalServerError(response, err, err.name);
            } else {
              callback(err, result);
            }
          });
        },
        list: function (callback) {
          if (isPagination) {
            UserModel.find(query).deepPopulate('role photo favIcon').limit(pageSize).skip((pageNo - 1) * pageSize).sort('-createdAt').exec(function (err, result) {
              if (err) {
                responseHandler.sendInternalServerError(response, err, err.name);
              } else {
                callback(err, result);
              }
            });
          } else {
            UserModel.find(query).deepPopulate('role photo favIcon').sort('-createdAt').exec(function (err, result) {
              if (err) {
                responseHandler.sendInternalServerError(response, err, err.name);
              } else {
                callback(err, result);
              }
            });
          }
        },
      }, function (err, results) {
        if (err) {
          responseHandler.sendInternalServerError(response, err, err.name);
        } else {
          responseHandler.sendSuccess(response, {
            "count": results.count,
            "list": results.list
          });
        }
      });
    },

    changeStatus: function (request, response, next) {
      let params = request.params;

      UserModel.findOne({'_id': params.publisherId}).exec(function (err, user) {
        if (err) {
          responseHandler.sendInternalServerError(response, err, err.name);
        } else {
          user.isActive = (user.isActive == varConst.INACTIVE) ? varConst.ACTIVE : varConst.INACTIVE;
          user.save(function (error, finalRes) {
            if (err) {
              responseHandler.sendSuccess(response, err, err.name);
            } else {
              request.body.userId = finalRes.id;
              next();
            }
          });
        }
      });
    },

    removePublisher: function (request, response, next) {
      let params = request.params;

      UserModel.findOne({'_id': params.publisherId}).exec(function (err, user) {
        if (err) {
          responseHandler.sendInternalServerError(response, err, err.name);
        } else {
          user.isDeleted = varConst.DELETED;
          user.save(function (error, finalRes) {
            if (err) {
              responseHandler.sendSuccess(response, err, err.name);
            } else {
              request.body.userId = finalRes.id;
              next();
            }
          });
        }
      });
    },

    getAccessToken: function (request, response) {

      let input = request.body;

      let usersProjection = {
        homeDomain: true,
        publisherName: true,
        headerColor: true,
        footerColor: true,
        accessToken: true,
        firstName: true,
        lastName: true,
        fullName: true,
        photo: true,
        termsOfUse: true,
        groupId: true,
        favIcon: true,
        privacyPolicy: true,
        googleCode: true
      };

      UserModel.findOne({'role': input.roleId, 'domain': input.domain}, usersProjection).populate('photo favIcon').exec(function (err, result) {
        if (err) {
          responseHandler.sendInternalServerError(response, err, err.name);
        } else if(result) {
          responseHandler.sendSuccess(response, result);
        } else {
          responseHandler.sendSuccess(response, "", "Domain is not bind with this server");
        }
      });
    },

    publisherInfo: function (request, response) {

      let input = request.body;

      UserModel.findOne({'_id': input.userId}).populate('role photo favIcon').exec(function (err, finalRes) {
        if (err) {
          responseHandler.sendInternalServerError(response, err, err.name);
        } else {
          responseHandler.sendSuccess(response, finalRes);
        }
      });
    },

    syncPublisherInfo: function (req, res) {
      function getToken(users) {
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
                      username: user.sgUsername,
                      client_secret: user.sgClientSecret,
                      grant_type: user.sgGrantType,
                      client_id: user.sgClientId,
                      scope: user.sgScope,
                      password: user.sgPassword
                  }
              };

              request(options, function (err, result, body) {
                if (err) console.log(err);
                if (result && result.statusCode == 200) {
                  let finalRes = JSON.parse(result.body);
                  user.sgTokenType = finalRes.token_type;
                  user.sgAccessToken = finalRes.access_token;
                  user.sgRefreshToken = finalRes.refresh_token;
                  user.updatedTokenDate = new Date();
                  user.isSync = varConst.ACTIVE;
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

        syncNewPublisher().then(users => {
          if(users.length > 0) {
            return getToken(users);
          } else {
            return true;
          }
        }).then(token => {
          console.log("success");
        }).catch(err => {
          console.log("err", err);
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
          let removedPodcast = (result.removed.length > 0) ? await removePodcastFromDatabase(result.removed, userInfo) : true;

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
              podcastsModel.iproviderListtunesBlock = podcast.itunesBlock;
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
          console.log("Cron job success");
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

let syncNewPublisher = function (req, res) {
    return new Promise(function (resolve, reject) {
        RolesModel.findOne({slug: varConst.PUBLISHER}, function (err, result) {
            if (err) reject(err);
            UserModel.find({role: result.id, 'isSync': varConst.INACTIVE}, function (err, result) {
                if (err) reject(err);
                resolve(result);
            })
        })
    })
}

function randomString(len, charSet) {
  charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var randomString = '';
  for (var i = 0; i < len; i++) {
      var randomPoz = Math.floor(Math.random() * charSet.length);
      randomString += charSet.substring(randomPoz,randomPoz+1);
  }
  return randomString;
}
