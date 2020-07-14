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

let PublisherController = require('./Controllers/PublisherController');

// every 1 minute check if new publisher then add access token
cron.schedule('* */1 * * * *', () => {
    PublisherController.syncPublisherInfo();
});

// every 5 hour cron job will refresh-token
cron.schedule('0 0 */5 * * *', () => {
    PublisherController.publisherCronjob();
});

// every 3 hour cron job will sync podcast list
cron.schedule('0 0 */3 * * *', () => {
    PublisherController.syncPodcastList();
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
    router.post('/api/publisher', VerifySuperAdmin, userUpload.fields([{name: 'image', maxCount: '1'}, {name: 'favIcon', maxCount: '1'}]), VerifySuperAdmin, PublisherController.getPublisherRole, PublisherController.addPublisher, PublisherController.uploadPhoto, PublisherController.uploadFavIcon, PublisherController.publisherInfo);
    router.put('/api/publisher', userUpload.fields([{name: 'image', maxCount: '1'}, {name: 'favIcon', maxCount: '1'}]), PublisherController.updatePublisher, PublisherController.unlinkPhoto, PublisherController.unlinkFavIcon, PublisherController.uploadPhoto, PublisherController.uploadFavIcon, PublisherController.publisherInfo);
    router.get('/api/publisherStatus/:publisherId', VerifySuperAdmin, PublisherController.changeStatus, PublisherController.publisherInfo);
    router.get('/api/removePublisher/:publisherId', VerifySuperAdmin, PublisherController.removePublisher, PublisherController.publisherInfo);
    router.get('/api/publisher', VerifySuperAdmin, PublisherController.getPublisherRole, PublisherController.publisherList);

    router.post('/api/getAccessToken', PublisherController.getPublisherRole, PublisherController.getAccessToken);
};
