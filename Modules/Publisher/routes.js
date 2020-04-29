/**
 * Created by WebStorm.
 * User: theta-ubuntu-4
 * Date: 02/03/20
 * Time: 5:16 PM
 */
let path = require('path');
let cron = require('node-cron');

let VerifySuperAdmin = require('../../auth/VerifySuperAdmin');

let PublisherController = require('./Controllers/PublisherController');

// every 5 hour cron job will refresh-token
cron.schedule('0 0 */5 * * *', () => {
    PublisherController.publisherCronjob();
});

// every 3 hour cron job will sync podcast list
cron.schedule('0 0 */3 * * *', () => {
    PublisherController.syncPodcastList();
});

module.exports = function (router) {
    // get Method
    router.get('/api/changeStatus/:publisherId', VerifySuperAdmin, PublisherController.changeStatus, PublisherController.publisherInfo);
    router.get('/api/removeUser/:publisherId', VerifySuperAdmin, PublisherController.removeUser);

    //post Method
    router.post('/api/publisherSignup', VerifySuperAdmin, PublisherController.addPublisher, PublisherController.publisherInfo);
    router.post('/api/publisherUpdate', VerifySuperAdmin, PublisherController.updatePublisher, PublisherController.publisherInfo);
    router.post('/api/publisherList', VerifySuperAdmin, PublisherController.providerList);
};
