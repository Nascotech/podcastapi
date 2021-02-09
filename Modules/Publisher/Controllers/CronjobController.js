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
let logStream = fs.createWriteStream('./cronjob.log', {flags: 'a'});
let aws = require('aws-sdk');
let multerS3 = require('multer-s3');
let bcrypt = require('bcryptjs');
const fetch = require('node-fetch');
const FormData = require('form-data');
const sharp = require('sharp');
const axios = require('axios');
let slugs = require("slugs");
let constants = require('../../../Utils/ModelConstants');
let varConst = require('../../../Utils/Constants');
let stringConstants = require('../../../Utils/StringConstants');
let responseHandler = require('../../../Utils/ResponseHandler');
let arrayDiff = require('simple-array-diff');
let objArrayDiff = require("fast-array-diff");
let masterConfig = require('../../../Configs/masterConfig.json');
let spacesEndpoint = new aws.Endpoint(masterConfig['LINODE_END_POINT']);
let s3 = new aws.S3({
  secretAccessKey: masterConfig['SECRET_ACCESS_KEY'],
  accessKeyId: masterConfig['SECRET_KEY_ID'],
  endpoint: spacesEndpoint
});
let cronjobStartTime = `UTC Time: ${Date()} \nIndia Time: ${new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"})} \nUSA Time: ${new Date().toLocaleString("en-US", {timeZone: "America/New_York"})}`;
let nodemailer = require('nodemailer');
let transporter = nodemailer.createTransport({
  host: varConst.SMTP_HOST_NAME,
  port: varConst.SMTP_PORT,
  secure: true, // true for 465, false for other ports
  auth: {
    user: varConst.SMTP_USERNAME, // generated ethereal user
    pass: varConst.SMTP_PASSWORD // generated ethereal password
  }
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
          let uSet = new Set(groupsArr);
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

    function fetchCollection(userInfo) {
      return new Promise(function (resolve, reject) {
        let url = userInfo.sgBaseUrl + 'api/v1/collections';
        let headers = {
          Connection: 'keep-alive',
          Accept: '*/*',
          Authorization: userInfo.sgTokenType + ' ' + userInfo.sgAccessToken
        }
        fetch(url, { method: 'GET', headers: headers}).then(async (res) => {
          let contentType = res.headers.get("content-type");
          if(res.status == 200 && contentType && contentType.indexOf("application/json") !== -1) {
            return res.json();
          } else {
            await updateAccessToken(userInfo);
            return {data: []};
          }
        }).then(result => {
          resolve(result.data);
        }).catch(err => {
          logStream.write("\n"+err);
          logStream.write("\nError while fetching collection list - " + userInfo.publisherName);
          reject(false);
        });
      })
    }

    function fetchPodcast(userInfo, collectionInfo, pageNo) {
      return new Promise(async function (resolve, reject) {
        let url = userInfo.sgBaseUrl + 'api/v1/collections/view/' + collectionInfo.id + '?length=100&page=' + pageNo;
        let headers = {
          Connection: 'keep-alive',
          Accept: '*/*',
          Authorization: userInfo.sgTokenType + ' ' + userInfo.sgAccessToken
        }
        await fetch(url, { method: 'GET', headers: headers}).then(async (res) => {
          let contentType = res.headers.get("content-type");
          if(res.status == 200 && contentType && contentType.indexOf("application/json") !== -1) {
            return res.json();
          } else {
            await updateAccessToken(userInfo);
            return {data: []};
          }
        }).then((json) => {
          resolve(json);
        }).catch(err => {
          logStream.write("\n"+err);
          logStream.write("\nError while fetching podcast list - " + userInfo.publisherName);
          reject(false);
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
        await fetch(url, { method: 'GET', headers: headers}).then(async (res) => {
          let contentType = res.headers.get("content-type");
          if(res.status == 200 && contentType && contentType.indexOf("application/json") !== -1) {
            return res.json();
          } else {
            await updateAccessToken(userInfo);
            return {data: []};
          }
        }).then((json) => {
          resolve(json);
        }).catch(err => {
          logStream.write("\n"+err);
          logStream.write("\nError while fetching episode list - " + userInfo.publisherName);
          reject(false);
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
        PodcastsModel.findOne({"publisher": userInfo.id, podcastId: podcast.id}).then(podcastsModel => {
          if(!podcastsModel) podcastsModel = new PodcastsModel();
          podcastsModel.podcastId = podcast.id;
          podcastsModel.collectionId = collectionInfo.id;
          podcastsModel.publisher = userInfo.id;
          podcastsModel.guid = podcast.guid;
          podcastsModel.name = podcast.name;
          podcastsModel.slug = slugs(podcast.name, '-');
          podcastsModel.description = podcast.description;
          podcastsModel.language = podcast.language;
          podcastsModel.link = podcast.link;
          podcastsModel.xmlFilename = podcast.xmlFilename;
          podcastsModel.prefixUrl = podcast.prefixUrl;
          podcastsModel.limit = podcast.limit;
          podcastsModel.image = (podcast.image) ? podcast.image : '';
          podcastsModel.rssFeed = podcast.rssFeed;
          podcastsModel.categories = podcast.categories;
          podcastsModel.syndications = podcast.syndications;
          podcastsModel.group = podcast.group;
          podcastsModel.user = podcast.user;
          podcastsModel.imageSync = varConst.INACTIVE;
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
            let oldEpisodeArr = await fetchOldEpisodeList(result._id);
            //await EpisodesModel.deleteMany({"podcast": result.id});
            await fetchEpisodeList(userInfo, result, oldEpisodeArr).then(result => {
              return resolve(true);
            }).catch(err => {
              if(err) return reject(err);
            });
          }).catch(err => {
            if(err) return reject(err);
          });
        }).catch(err => {
          if(err) return reject(err);
        });
      });
    }

    function fetchEpisodeList(userInfo, podcast, oldEpisodeArr) {
      return new Promise(async function (resolve, reject) {
        let firstEpisodeList = await fetchEpisode(userInfo, podcast, 1) || [];
        if(firstEpisodeList && firstEpisodeList.meta && firstEpisodeList.meta.last_page > 1) {
          return resolve(fetchRemainingEpisodes(userInfo, podcast, firstEpisodeList.meta.last_page, firstEpisodeList.data, oldEpisodeArr));
        } else {
          return resolve(syncEpisodesListIntoDatabase(userInfo, JSON.stringify(firstEpisodeList.data), podcast, oldEpisodeArr));
        }
      });
    }

    function fetchRemainingEpisodes(userInfo, podcast, lastPage, newEpisodeArr, oldEpisodeArr) {
      return new Promise(async function (resolve, reject) {
        for (let i = 2; i <= lastPage; i++) {
          let result = await fetchEpisode(userInfo, podcast, i);
          newEpisodeArr = await newEpisodeArr.concat(result.data);
        }
        return resolve(syncEpisodesListIntoDatabase(userInfo, JSON.stringify(newEpisodeArr), podcast, oldEpisodeArr));
      });
    }

    function compare(oldEpisode, newEpisode) {
      return (oldEpisode.guid.value == newEpisode.guid.value);
    }

    function syncEpisodesListIntoDatabase(userInfo, episodeList, podcast, oldEpisodeArr) {
      return new Promise(async function (resolve, reject) {
        let result = await objArrayDiff.diff(JSON.parse(oldEpisodeArr), JSON.parse(episodeList), compare);
        // let removedEpisode = (result.removed.length > 0) ? await removeEpisodeFromDatabase(result.removed, podcast) : true;
        let addEpisode = (result.added.length > 0) ? await addNewEpisodes(result.added, podcast) : true;

        if(addEpisode && removedEpisode) {
          return resolve(true);
        } else {
          return reject(false);
        }
      });
    }

    function addNewEpisodes(episodeList, podcast) {
      return new Promise(async function (resolve, reject) {
        if(episodeList.length > 0) {
          let count = 0;
          episodeList.forEach(async episode => {
            await updateEpisode(episode, podcast)
            count++;
            if (episodeList.length == count) {
              return resolve(true);
            }
          });
        } else {
          return resolve(true);
        }
      });
    }

    function removeEpisodeFromDatabase(episodeList, podcast) {
      return new Promise(function (resolve, reject) {
        let count = 0;
        episodeList.forEach(async episode => {
          await EpisodesModel.deleteOne({publisher: podcast.publisher, sgPodcastId: podcast.podcastId, 'guid.value': episode.guid.value});
          count++;
          if (episodeList.length == count) {
            return resolve(true);
          }
        });
      });
    }

    function fetchOldEpisodeList(podcastId) {
      return new Promise(function (resolve, reject) {
        EpisodesModel.find({"podcast": podcastId}).exec(function (err, result) {
          if (err) reject(err);
          if(result.length > 0) {
            return resolve(JSON.stringify(result));
          } else {
            return resolve('[]');
          }
        });
      });
    }

    function updateEpisode(episodeInfo, podcast) {
      return new Promise(function (resolve, reject) {
        // let dirName = 'uploads/publisher_' + podcast.publisher + '/podcast_' + podcast.podcastId + '/';
        // let fileName = 'episode_img_' + episodeInfo.guid.value;
        // let newImage = (episodeInfo.image && episodeInfo.image.link) ? await imageResize(episodeInfo.image.link, dirName, fileName) : '';
        let episodeModel = new EpisodesModel();
        episodeModel.podcast = podcast.id;
        episodeModel.publisher = podcast.publisher;
        episodeModel.sgPodcastId = podcast.podcastId;
        episodeModel.title = episodeInfo.title;
        episodeModel.description = episodeInfo.description;
        episodeModel.guid = episodeInfo.guid;
        episodeModel.url = episodeInfo.enclosure.url;
        episodeModel.type = episodeInfo.type;
        episodeModel.length = episodeInfo.length;
        episodeModel.duration = episodeInfo['itunes:duration'].replace(/^(?:00:)?0?/, '');
        episodeModel.image = (episodeInfo.image && episodeInfo.image.link) ? episodeInfo.image.link : '';
        episodeModel.pubDate = new Date(episodeInfo.pubDate);
        episodeModel.save().then(result => {
          return resolve(true);
        }).catch(err => {
          if(err) return reject(err);
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
      console.log("\n");
      console.log("\n======================== START PODCAST & EPISODES CRONJOB ================================");
      logStream.write("\n======================== START PODCAST & EPISODES CRONJOB ================================");
      logStream.write("\n" + cronjobStartTime);
      if(users.length > 0) {
        return allUserList(users);
      } else {
        return true;
      }
    }).then(async result => {
      console.log("Podcasts & episodes sync successfully");
      logStream.write("\nPodcasts & episodes sync successfully");
      return await updatePublisherGroups();
    }).then(async result => {
      await updatePodcastImages();
      logStream.write("\n======================== END PODCAST & EPISODES CRONJOB ================================");
      console.log("\n======================== END PODCAST & EPISODES CRONJOB ================================");
    }).catch(err => {
      console.log(err);
      logStream.write("\n"+err);
      logStream.write("\n======================== END PODCAST & EPISODES CRONJOB ================================");
      console.log("\n======================== END PODCAST & EPISODES CRONJOB ================================");
    });
  },
};
module.exports = PublisherCronjob;

function updateAccessToken(userInfo) {
  return new Promise(function (resolve, reject) {
    let url = userInfo.sgBaseUrl + 'oauth/token';
    const form = new FormData();
    form.append('username', userInfo.sgUsername);
    form.append('client_secret', userInfo.sgClientSecret);
    form.append('grant_type', userInfo.sgGrantType);
    form.append('scope', userInfo.sgScope);
    form.append('client_id', userInfo.sgClientId);
    form.append('password', userInfo.sgPassword);
    fetch(url, { method: 'POST', body: form}).then(async (res) => {
      let contentType = res.headers.get("content-type");
      if(res.status == 200 && contentType && contentType.indexOf("application/json") !== -1) {
        return res.json();
      } else {
        let string = 'Publisher Name: <b>' + userInfo.publisherName + '</b>' +
        '<p>Base URL: <b>' + userInfo.sgBaseUrl + '</b></p>' +
        '<p>Username: <b>' + userInfo.sgUsername + '</b></p>' +
        '<p>Client Id: <b>' + userInfo.sgClientId + '</b></p>' +
        '<p>Scope: <b>' + userInfo.sgScope + '</b></p>' +
        '<p>Clien Secret: <b>' + userInfo.sgClientSecret + '</b></p>' +
        '<p>Password: <b>' + userInfo.sgPassword + '</b></p>' +
        '<p>Grant Type: <b>' + userInfo.sgGrantType + '</b></p>' +
        '<p>Token Type: <b>' + userInfo.sgTokenType + '</b></p>' +
        '<br><p> --------------- Error While Generate Refresh Token --------------- </p>' +
        '<p>Status Code: <b>' + res.status + '</b></p>' +
        '<p>Status Text: <b>' + res.statusText + '</b></p>';

        await transporter.sendMail({
          from: varConst.MAIL_FROM,
          to: varConst.ADMIN_EMAIL,
          subject: 'Error while fetching refresh token - ' + userInfo.publisherName,
          text: 'Error',
          html: string
        }).then(info => console.log("mail send")).catch(err => console.log("Error:", err));
        return false;
      }
    }).then(async result => {
      if(result) await UserModel.updateOne({'_id': userInfo.id}, {$set: {"sgTokenType": result.token_type, "sgAccessToken": result.access_token, "sgRefreshToken": result.refresh_token}});
      resolve(result);
    }).catch(err => {
      logStream.write("\nError while fetching refresh token - " + userInfo.publisherName);
      logStream.write("\n"+err);
      reject(false);
    });
  });
}

function updatePublisherGroups() {
  return new Promise(function (resolve, reject) {
    function getAllUsers(users) {
      return new Promise(async function (resolve, reject) {
        let count = 0;
        let roleModel = await RolesModel.findOne({slug: varConst.PUBLISHER});
        let atunwaUser = await UserModel.findOne({'sgUsername': "pthakur@plenartech.com", 'role': roleModel.id});
        let list = await fetchGroupsList(atunwaUser);
        users.forEach(async user => {
          await updateUserGroups(list, user);
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
            await addGroupInfoDatabase(groupInfo, userInfo);
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
        fetch(url, { method: 'GET', headers: headers}).then(async (res) => {
          let contentType = res.headers.get("content-type");
          if(res.status == 200 && contentType && contentType.indexOf("application/json") !== -1) {
            return res.json();
          } else {
            await updateAccessToken(userInfo);
            return {data: []};
          }
        }).then((json) => {
          resolve(json.data);
        }).catch(err => {
          console.log("\n"+err);
          logStream.write("\nError while fetching group list - " + userInfo.publisherName);
          resolve([]);
        });
      });
    }

    RoleUserModel().then(users => {
      logStream.write("\n");
      logStream.write("\n          ***** START GROUPS CRONJOB *****");
      if(users.length > 0) {
        return getAllUsers(users);
      } else {
        return true;
      }
    }).then(result => {
      resolve(true);
      logStream.write("\n          Groups sync successfully");
      logStream.write("\n          ***** END GROUPS CRONJOB *****");
    }).catch(err => {
      resolve(true);
      logStream.write("\n"+err);
      logStream.write("\n          ***** END GROUPS CRONJOB *****");
    });
  });
}

function updatePodcastImages() {
  return new Promise(function (resolve, reject) {

    function getAllPodcastImages() {
      return new Promise(function (resolve, reject) {
        PodcastsModel.find({"imageSync": varConst.INACTIVE, 'image':{$exists: true, $ne: null}}, {publisher: true, podcastId: true, image: true}).then(result => {
          resolve(result);
        }).catch(err => {
          if(err) reject(err);
        });
      });
    }

    function compressImages(list) {
      return new Promise(function (resolve, reject) {
        if(list.length > 0) {
          let count = 0;
          list.forEach(async info => {
            let dirName = 'uploads/publisher_' + info.publisher + '/podcast_' + info.podcastId + '/';
            let fileName = 'poscast_img_' + info.podcastId;
            await imageResize(info.image, dirName, fileName, info._id);
            count++;
            if (list.length == count) {
              resolve(true);
            }
          });
        } else {
          resolve(true);
        }
      });
    }

    function imageResize(imageUrl, pathName, name, modelId) {
      return new Promise(async function (resolve, reject) {
        await axios({ url: imageUrl, responseType: "arraybuffer" }).then(function (response) {
          if(response.status == 200) {
            let ext = path.extname(imageUrl);
            sharp(response.data).resize(240,240).toBuffer().then(async result => {
              let params = {
                Bucket: masterConfig['BUCKET_NAME'],
                Key: pathName + name + ext,
                ACL: "public-read",
                Body: result,
              };
              await s3.upload(params, async function (s3Err, data) {
                if (s3Err) {
                  resolve(true);
                } else {
                  await PodcastsModel.updateOne({"_id": modelId}, {$set: {"image" : data.Location, 'imageSync': varConst.ACTIVE}});
                  resolve(true);
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

    getAllPodcastImages().then(list => {
      logStream.write("\n");
      logStream.write("\n          ***** START IMAGE COMPRESSION CRONJOB *****");
      if(list.length > 0) {
        return compressImages(list);
      } else {
        return true;
      }
    }).then(result => {
      resolve(true);
      logStream.write("\n          Images sync successfully");
      logStream.write("\n          ***** END IMAGE COMPRESSION CRONJOB *****");
    }).catch(err => {
      resolve(true);
      console.log(err);
      logStream.write("\n"+err);
      logStream.write("\n          ***** END IMAGE COMPRESSION CRONJOB *****");
    });
  });
}

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
};

function IsJsonString(str) {
  try {
      JSON.parse(str);
  } catch (e) {
      return false;
  }
  return true;
}
