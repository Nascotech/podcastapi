/**
 * Created by Akshay Sangani.
 * User: theta-ubuntu-1
 * Date: 05/11/20
 * Time: 02:17 PM
 */
let mongoose = require('mongoose');
let HttpStatus = require('http-status-codes');
let async = require('async');
let path = require('path');
let fs = require('fs');
let aws = require('aws-sdk');
let multerS3 = require('multer-s3');
let bcrypt = require('bcryptjs');
const fetch = require('node-fetch');
const sharp = require('sharp');
const axios = require('axios');
let constants = require('../../../Utils/ModelConstants');
let varConst = require('../../../Utils/Constants');
let stringConstants = require('../../../Utils/StringConstants');
let responseHandler = require('../../../Utils/ResponseHandler');
let arrayDiff = require('simple-array-diff');
let masterConfig = require('../../../Configs/masterConfig.json');
let spacesEndpoint = new aws.Endpoint(masterConfig['LINODE_END_POINT']);
let s3 = new aws.S3({
  secretAccessKey: masterConfig['SECRET_ACCESS_KEY'],
  accessKeyId: masterConfig['SECRET_KEY_ID'],
  endpoint: spacesEndpoint
});

//Models
let UserModel = mongoose.model(constants.UserModel);
let RolesModel = mongoose.model(constants.RolesModel);
let PodcastsModel = mongoose.model(constants.PodcastsModel);
let PhotosModel = mongoose.model(constants.PhotosModel);
let EpisodesModel = mongoose.model(constants.EpisodesModel);
let GroupsModel = mongoose.model(constants.GroupsModel);

let PublisherCronjob = {

  syncPodcastList: function (request, response) {

    function allUserList(users) {
      return new Promise(function (resolve, reject) {
        let count = 0;
        users.forEach(async user => {
          await fetchCollectiontList(user);
          count++;
          if (users.length == count) {
            resolve(true);
          }
        });
      });
    }

    function fetchCollectiontList(userInfo) {
      return new Promise(async function (resolve, reject) {
        let collectionList = await fetchCollection(userInfo);
        let oldPodcastArr = await fetchOldPodcastList(userInfo);
        if(collectionList.length > 0) {
          let count = 0;
          collectionList.forEach(async collection => {
            await fetchPodcastList(userInfo, collection, oldPodcastArr);
            count++;
            if (collectionList.length == count) {
              resolve(true);
            }
          });
        } else {
          resolve(true);
        }
      });
    }

    function fetchPodcastList(userInfo, collectionInfo, oldPodcastArr) {
      return new Promise(async function (resolve, reject) {
        let firstPodcastList = await fetchPodcast(userInfo, collectionInfo, 1);
        if(firstPodcastList && firstPodcastList.meta.last_page > 1) {
          resolve(fetchRemainingPodcast(userInfo, collectionInfo, firstPodcastList.meta.last_page, oldPodcastArr, firstPodcastList.data));
        } else {
          resolve(podcastDiff(userInfo, oldPodcastArr, JSON.stringify(firstPodcastList.data), collectionInfo));
        }
      });
    }

    function fetchRemainingPodcast(userInfo, collectionInfo, lastPage, oldPodcastArr, newPodcastArr) {
      return new Promise(async function (resolve, reject) {
        for (let i = 2; i <= lastPage; i++) {
          let result = await fetchPodcast(userInfo, collectionInfo, i);
          newPodcastArr = await newPodcastArr.concat(result.data);
        }
        resolve(podcastDiff(userInfo, oldPodcastArr, JSON.stringify(newPodcastArr), collectionInfo));
      });
    }

    function updateGroups(userInfo, podcastLists) {
      return new Promise(async function (resolve, reject) {
        let finalRes = JSON.parse(podcastLists);
        if(finalRes.length > 0) {
          let groupsArr = await finalRes.map(podcast => podcast.group);
          var uSet = new Set(groupsArr);
          UserModel.findOne({"_id": userInfo.id}).then(userModel => {
            userModel.podcastsGroups = [...uSet];
            userModel.save().then(result => {
              resolve(true);
            }).catch(err => {
              if(err) reject(err);
            });
          }).catch(err => {
            if(err) reject(err);
          });
        } else {
          resolve(true);
        }
      });
    }

    function podcastDiff(userInfo, oldPodcastArr, newPodcastArr, collectionInfo) {
      return new Promise(async function (resolve, reject) {
        await updateGroups(userInfo, newPodcastArr);
        let result = await arrayDiff(JSON.parse(oldPodcastArr), JSON.parse(newPodcastArr), 'id');
        let addPodcast = (result.added.length > 0) ? await syncPodcastListIntoDatabase(result.added, userInfo, collectionInfo) : true;
        let commonPodcast = (result.common.length > 0) ? await syncPodcastListIntoDatabase(result.common, userInfo, collectionInfo) : true;
        let removedPodcast = (result.removed.length > 0) ? await removePodcastFromDatabase(result.removed, userInfo) : true;

        if(addPodcast && commonPodcast && removedPodcast) {
          resolve(true);
        } else {
          reject(false);
        }
      });
    }

    function fetchPodcast(userInfo, collectionInfo, pageNo) {
      return new Promise(async function (resolve, reject) {
        let url = userInfo.sgBaseUrl + 'api/v1/collections/view/' + collectionInfo.id + '?length=100&page=' + pageNo;
        let headers = {
          Connection: 'keep-alive',
          Accept: '*/*',
          Authorization: userInfo.sgTokenType + ' ' + userInfo.sgAccessToken
        }
        await fetch(url, { method: 'GET', headers: headers}).then((res) => {
          return res.json()
        }).then((json) => {
          resolve(json);
        }).catch(err => {
          resolve('[]');
        });
      })
    }

    function fetchEpisode(userInfo, podcast, pageNo) {
      return new Promise(async function (resolve, reject) {
        let url = userInfo.sgBaseUrl + 'api/v1/sgrecast/podcasts/feeds/episodes/' + podcast.podcastId + '?length=100&page=' + pageNo;
        let headers = {
          Connection: 'keep-alive',
          Accept: '*/*',
          Authorization: userInfo.sgTokenType + ' ' + userInfo.sgAccessToken
        }
        await fetch(url, { method: 'GET', headers: headers}).then((res) => {
          return res.json()
        }).then((json) => {
          resolve(json);
        }).catch(err => {
          resolve('[]');
        });
      })
    }

    function fetchOldPodcastList(userInfo) {
      return new Promise(function (resolve, reject) {
        PodcastsModel.find({"publisher": userInfo.id}).sort({'podcastId': 1}).exec(function (err, result) {
          if (err) reject(err);
          if(result.length > 0) {
            resolve(JSON.stringify(result));
          } else {
            resolve('[]');
          }
        });
      });
    }

    function fetchCollection(userInfo, oldPodcastArr) {
      return new Promise(function (resolve, reject) {
        let url = userInfo.sgBaseUrl + 'api/v1/collections';
        let headers = {
          Connection: 'keep-alive',
          Accept: '*/*',
          Authorization: userInfo.sgTokenType + ' ' + userInfo.sgAccessToken
        }
        fetch(url, { method: 'GET', headers: headers}).then((res) => {
           return res.json()
        }).then((json) => {
          resolve(json.data);
        }).catch(err => {
          resolve([]);
        });
      })
    }

    function syncPodcastListIntoDatabase(podcastLists, userInfo, collectionInfo) {
      return new Promise(function (resolve, reject) {
        if(podcastLists.length > 0) {
          let count = 0;
          podcastLists.forEach(async podcast => {
            await updatePodcast(podcast, userInfo, collectionInfo)
            count++;
            if (podcastLists.length == count) {
              resolve(true);
            }
          });
        } else {
          resolve(true);
        }
      });
    }

    function updatePodcast(podcast, userInfo, collectionInfo) {
      return new Promise(async function (resolve, reject) {
        let dirName = 'uploads/publisher_' + userInfo.id + '/podcast_' + podcast.id + '/';
        let fileName = 'poscast_img_' + podcast.id;
        let newImage = (podcast.image) ? await imageResize(podcast.image, dirName, fileName) : '';
        PodcastsModel.findOne({"publisher": userInfo.id, podcastId: podcast.id}).then(podcastsModel => {
          if(!podcastsModel) podcastsModel = new PodcastsModel();
          podcastsModel.podcastId = podcast.id;
          podcastsModel.collectionId = collectionInfo.id;
          podcastsModel.publisher = userInfo.id;
          podcastsModel.guid = podcast.guid;
          podcastsModel.name = podcast.name;
          podcastsModel.description = podcast.description;
          podcastsModel.language = podcast.language;
          podcastsModel.link = podcast.link;
          podcastsModel.xmlFilename = podcast.xmlFilename;
          podcastsModel.prefixUrl = podcast.prefixUrl;
          podcastsModel.limit = podcast.limit;
          podcastsModel.image = newImage;
          podcastsModel.rssFeed = podcast.rssFeed;
          podcastsModel.categories = podcast.categories;
          podcastsModel.syndications = podcast.syndications;
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
          podcastsModel.save().then(async result => {
            await EpisodesModel.deleteMany({"podcast": result.id});
            return await fetchEpisodeList(userInfo, result);
          }).then(result => {
            resolve(true);
          }).catch(err => {
            if(err) reject(err);
          });
        }).catch(err => {
          if(err) reject(err);
        });
      });
    }

    function fetchEpisodeList(userInfo, podcast) {
      return new Promise(async function (resolve, reject) {
        let firstEpisodeList = await fetchEpisode(userInfo, podcast, 1);
        if(firstEpisodeList && firstEpisodeList.meta.last_page > 1) {
          resolve(fetchRemainingEpisodes(userInfo, podcast, firstEpisodeList.meta.last_page, firstEpisodeList.data));
        } else {
          resolve(syncEpisodesListIntoDatabase(firstEpisodeList, podcast));
        }
      });
    }

    function fetchRemainingEpisodes(userInfo, podcast, lastPage, newEpisodeArr) {
      return new Promise(async function (resolve, reject) {
        for (let i = 2; i <= lastPage; i++) {
          let result = await fetchEpisode(userInfo, podcast, i);
          newEpisodeArr = await newEpisodeArr.concat(result.data);
        }
        resolve(syncEpisodesListIntoDatabase(newEpisodeArr, podcast));
      });
    }

    function syncEpisodesListIntoDatabase(episodeList, podcast) {
      return new Promise(function (resolve, reject) {
        if(episodeList.length > 0) {
          let count = 0;
          episodeList.forEach(async episodeInfo => {
            await updateEpisode(episodeInfo, podcast);
            count++;
            if (episodeList.length == count) {
              resolve(true);
            }
          });
        } else {
          resolve(true);
        }
      })
    }

    function updateEpisode(episodeInfo, podcast) {
      return new Promise(async function (resolve, reject) {
        EpisodesModel.findOne({"guid": episodeInfo.guid.value, podcast: podcast.id}).then(episodeModel => {
          if(!episodeModel) episodeModel = new EpisodesModel();
          episodeModel.podcast = podcast.id;
          episodeModel.publisher = podcast.publisher;
          episodeModel.sgPodcastId = podcast.podcastId;
          episodeModel.title = episodeInfo.title;
          episodeModel.description = episodeInfo.description;
          episodeModel.guid = episodeInfo.guid.value;
          episodeModel.url = episodeInfo.url;
          episodeModel.type = episodeInfo.type;
          episodeModel.length = episodeInfo.length;
          episodeModel.duration = episodeInfo['itunes:duration'].replace(/^(?:00:)?0?/, '');
          episodeModel.image = podcast.image;
          episodeModel.pubDate = new Date(episodeInfo.pubDate);
          episodeModel.save().then(result => {
            resolve(true);
          }).catch(err => {
            if(err) reject(err);
          });
        }).catch(err => {
          if(err) reject(err);
        });
      });
    }

    function removePodcastFromDatabase(podcastLists, userInfo) {
      return new Promise(function (resolve, reject) {
        let count = 0;
        podcastLists.forEach(async podcast => {
          let dirName = 'uploads/publisher_' + userInfo.id + '/podcast_' + podcast.id + '/';
          let podcastModel = await PodcastsModel.findOne({"publisher": userInfo.id, podcastId: podcast.id});
          await emptyS3Directory(dirName);
          await PodcastsModel.deleteMany({"publisher": userInfo.id, podcastId: podcast.id});
          await EpisodesModel.deleteMany({"podcast": podcastModel.id});
          count++;
          if (podcastLists.length == count) {
            resolve(true);
          }
        });
      });
    }

    function imageResize(imageUrl, pathName, name) {
      return new Promise(async function (resolve, reject) {
        await axios({ url: imageUrl, responseType: "arraybuffer" }).then(function (response) {
          if(response.status == 200) {
            let ext = path.extname(imageUrl);
            sharp(response.data).resize(240,240).toBuffer().then( result => {
              let params = {
                Bucket: masterConfig['BUCKET_NAME'],
                Key: pathName + name + ext,
                ACL: "public-read",
                Body: result,
              };
              s3.upload(params, function (s3Err, data) {
                if (s3Err) {
                  resolve(imageUrl);
                } else {
                  resolve(data.Location);
                }
              });
            }).catch( err => {
              resolve(imageUrl);
            });
          } else {
            resolve(imageUrl);
          }
        }).catch(function (error) {
          resolve(imageUrl);
        });
      });
    }

    function emptyS3Directory(dirName) {
      return new Promise(async function (resolve, reject) {
        let currentData;
        let params = { Bucket: masterConfig['BUCKET_NAME'], Prefix: dirName};
        return s3.listObjects(params).promise().then(data => {
          if (data.Contents.length === 0) {
            resolve(true);
          }
          currentData = data;
          params = {Bucket: masterConfig['BUCKET_NAME']};
          params.Delete = {Objects:[]};
          currentData.Contents.forEach(content => {
            params.Delete.Objects.push({Key: content.Key});
          });
          return s3.deleteObjects(params).promise();
        }).then(() => {
          if (currentData.Contents.length === 1000) {
            emptyBucket(dirName, callback);
          } else {
            resolve(true);
          }
        });
      });
    }

    RoleUserModel().then(users => {
      if(users.length > 0) {
        return allUserList(users);
      } else {
        return true;
      }
    }).then(result => {
      console.log("Podcasts sync successfully");
      //responseHandler.sendSuccess(response, "Podcasts sync successfully");
    }).catch(err => {
      console.log(err);
      //responseHandler.sendInternalServerError(response, err, err.name);
    });
  },

  syncGroupList: function (request, response) {

    function getAllUsers(users) {
      return new Promise(async function (resolve, reject) {
        let count = 0;
        let roleModel = await RolesModel.findOne({slug: varConst.PUBLISHER});
        let atunwaUser = await UserModel.findOne({'sgUsername': "pthakur@plenartech.com", 'role': roleModel.id});
        let list = await fetchGroupsList(atunwaUser);
        users.forEach(async user => {
          let test = await updateUserGroups(list, user);
          count++;
          if (users.length == count) {
            resolve(true);
          }
        });
      });
    }

    function updateUserGroups(groupList, userInfo) {
      return new Promise(async function (resolve, reject) {
        let groupFiltered = await groupList.filter((el) => { return userInfo.podcastsGroups.some((f) => { return f == el.id; }); });
        if(groupFiltered.length > 0) {
          await GroupsModel.deleteMany({"publisher": userInfo.id});
          let count = 0;
          groupFiltered.forEach(async groupInfo => {
            let test = await addGroupInfoDatabase(groupInfo, userInfo);
            count++;
            if (groupFiltered.length == count) {
              resolve(true);
            }
          });
        } else {
          resolve(true);
        }
      });
    }

    function addGroupInfoDatabase(groupInfo, userInfo) {
      return new Promise(function (resolve, reject) {
        GroupsModel.findOne({"publisher": userInfo.id, groupId: groupInfo.id}).then(groupsModel => {
          if(!groupsModel) groupsModel = new GroupsModel();
          groupsModel.publisher = userInfo.id;
          groupsModel.groupId = groupInfo.id;
          groupsModel.name = groupInfo.name;
          groupsModel.displayName = groupInfo.displayName;
          groupsModel.description = groupInfo.description;
          groupsModel.parent = groupInfo.parent;
          groupsModel.type = groupInfo.type;
          groupsModel.save().then(result => {
            resolve(true);
          }).catch(err => {
            if(err) reject(err);
          });
        }).catch(err => {
          if(err) reject(err);
        });
      });
    }

    function fetchGroupsList(userInfo, oldPodcastArr) {
      return new Promise(function (resolve, reject) {
        let url = userInfo.sgBaseUrl + 'api/v1/groups?page=1&length=1000';
        let headers = {
          Connection: 'keep-alive',
          Accept: '*/*',
          Authorization: userInfo.sgTokenType + ' ' + userInfo.sgAccessToken
        }
        fetch(url, { method: 'GET', headers: headers}).then((res) => {
          return res.json()
        }).then((json) => {
          resolve(json.data);
        }).catch(err => {
          console.log(err);
          resolve([]);
        });
      });
    }

    RoleUserModel().then(users => {
      if(users.length > 0) {
        return getAllUsers(users);
      } else {
        return true;
      }
    }).then(result => {
      //responseHandler.sendSuccess(response, result);
      console.log("Groups sync successfully");
    }).catch(err => {
      //responseHandler.sendInternalServerError(response, err, err.name);
      console.log(err)
    });
  }
};
module.exports = PublisherCronjob;

let RoleUserModel = function (req, res) {
  return new Promise(function (resolve, reject) {
    RolesModel.findOne({slug: varConst.PUBLISHER}).then(roleModel => {
      UserModel.find({role: roleModel.id, isDeleted: varConst.NOT_DELETED}).then(result => {
        resolve(result);
      }).catch(err => {
        reject(err);
      });
    }).catch(err => {
      reject(err);
    });
  });
}
