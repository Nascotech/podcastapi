/**
 * Created by WebStorm.
 * User: theta-ubuntu-4
 * Date: 02/03/20
 * Time: 5:16 PM
 */
let path = require('path');
let cron = require('node-cron');
let multer = require('multer');
let crypto = require('crypto-random-string');
let VerifySuperAdmin = require('../../auth/VerifySuperAdmin');
let VerifyRecastToken = require('../../auth/VerifyRecastToken');

let PublisherController = require('./Controllers/PublisherController');
let CronjobController = require('./Controllers/CronjobController');
let PodcastController = require('./Controllers/PodcastController');

// every 1 minute check if new publisher then add access token
// cron.schedule('* */1 * * * *', () => {
//   PublisherController.syncPublisherInfo();
// });

// every month cron job will refresh-token
// cron.schedule('* * * 1 * *', () => {
//   PublisherController.publisherCronjob();
// });

// every 4 hour cron job will sync groups
// cron.schedule('0 0 */4 * * *', () => {
//   CronjobController.syncGroupList();
// });

//every 4 hour cron job will sync podcast list
cron.schedule('0 */10 * * * *', async () => {
  await CronjobController.syncPodcastList();
  await CronjobController.syncGroupList();
});

let userUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/profile')
    },
    filename: function (req, file, cb) {
      cb(null, crypto({length: 64}).toString('hex') + path.extname(file.originalname))
    }
  })
});

module.exports = function (router) {

    //publisher management
    router.post('/api/publisher', VerifySuperAdmin, userUpload.fields([{name: 'image', maxCount: '1'}, {name: 'favIcon', maxCount: '1'}]), VerifySuperAdmin, PublisherController.checkAccessToken, PublisherController.getPublisherRole, PublisherController.addPublisher, PublisherController.uploadPhoto, PublisherController.uploadFavIcon, PublisherController.publisherInfo);
    router.put('/api/publisher', userUpload.fields([{name: 'image', maxCount: '1'}, {name: 'favIcon', maxCount: '1'}]), PublisherController.checkAccessToken, PublisherController.updatePublisher, PublisherController.unlinkPhoto, PublisherController.unlinkFavIcon, PublisherController.uploadPhoto, PublisherController.uploadFavIcon, PublisherController.publisherInfo);
    router.get('/api/publisherStatus/:publisherId', VerifySuperAdmin, PublisherController.changeStatus, PublisherController.publisherInfo);
    router.get('/api/removePublisher/:publisherId', VerifySuperAdmin, PublisherController.removePublisher, PublisherController.publisherInfo);
    router.get('/api/publisher', VerifySuperAdmin, PublisherController.getPublisherRole, PublisherController.publisherList);
    router.put('/api/publisher/group', VerifySuperAdmin, PublisherController.updateGroup, PublisherController.publisherInfo);

    router.post('/api/getAccessToken', PublisherController.getPublisherRole, PublisherController.getAccessToken);

    //podcasts APIs
    router.post('/api/getPodcasts', VerifyRecastToken, PodcastController.getPodcasts);
    router.get('/api/getPodcastDetails/:podcastId', VerifyRecastToken, PodcastController.getPodcastDetails);
    router.get('/api/getPodcastEpisodes/:podcastId', VerifyRecastToken, PodcastController.getPodcastEpisodes);
    router.get('/api/getGroups', VerifyRecastToken, PodcastController.getGroups);
    router.get('/api/userGroups/:publisherId', VerifySuperAdmin, PodcastController.userGroups);

    router.get('/api/test', CronjobController.syncPodcastList);
    router.get('/api/test2', CronjobController.syncGroupList);
};
