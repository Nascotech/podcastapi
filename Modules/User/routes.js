/**
 * Created by Akshay Sangani.
 * User: theta-ubuntu-1
 * Date: 17/5/19
 * Time: 3:54 PM
 */
let path = require('path');
let multer = require('multer');
let crypto = require('crypto-random-string');
let VerifyRecastToken = require('../../auth/VerifyRecastToken');
let VerifyToken = require('../../auth/VerifyToken');
let VerifySuperAdmin = require('../../auth/VerifySuperAdmin');
let UserController = require('./Controllers/UserController');
let RecastController = require('./Controllers/RecastController');
let cron = require('node-cron');
let backup = require('../../Configs/mongodb_backup.js');

/*Cronjob for database backup - every day at 12:00 AM*/
cron.schedule('0 0 0 * * *', () => {
    backup.dbAutoBackUp();
});

let userUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'uploads/profile')
        },
        filename: function (req, file, cb) {
            cb(null, crypto({length: 64}).toString('hex') + path.extname(file.originalname))
        }
    }),
    /*Particular validation for files*/
    /*fileFilter: function (req, file, callback) {
        let ext = path.extname(file.originalname);
        if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg' && ext !== '.doc' && ext !== '.docx' && ext !== '.pdf') {
            return callback(new Error('Only images, pdf and doc are allowed'))
        }
        callback(null, true)
    }*/
});

/* Add here the all the routes for the user */
module.exports = function (router) {
    /* REST API */

    /*Mobile side & Admin side*/
    router.post('/api/signup', UserController.signup, UserController.uploadDefaultPhoto, UserController.signupInfo);
    router.post('/api/login', UserController.login, UserController.finalInfo);
    router.post('/api/adminLogin', UserController.adminLogin, UserController.addDeviceInfo, UserController.finalInfo);
    router.post('/api/logout', VerifyToken, UserController.logout);
    router.post('/api/updateProfile', VerifyToken, userUpload.single('image'), VerifyToken, UserController.editProfile, UserController.unlinkProfilePic, UserController.uploadPhoto, UserController.userFinalRes);
    router.post('/api/changePassword', VerifySuperAdmin, UserController.changePassword);
    router.post('/api/forgotPassword', UserController.forgotPassword);
    router.post('/api/resetPassword', UserController.resetPassword);
    router.post('/api/checkResetToken', UserController.checkResetToken);
    router.post('/api/defaultConfig', UserController.defaultConfig);
    router.get('/api/defaultConfig', UserController.getDefaultConfig);

    //Remove database and setup fresh database with default migration
    router.get('/api/removeDatabase', VerifySuperAdmin, UserController.removeDatabase);
    router.get('/api/getAllBackupDatabaseList', UserController.getAllBackupDatabaseList);
    router.get('/api/applyOldDatabase/:dbName', UserController.applyOldDatabase);
    router.get('/api/removeDatabaseBackup/:dbName', UserController.removeDatabaseBackup);

    //podcast API
    router.post('/api/checkUserToken', VerifyRecastToken, RecastController.checkToken, RecastController.updateToken, RecastController.checkUserToken);
    router.post('/api/getOauthToken', RecastController.getOauthToken);
    router.post('/api/getPodcasts', VerifyRecastToken, RecastController.checkToken, RecastController.updateToken, RecastController.getPodcasts);
    router.get('/api/getPodcastDetails/:podcastId', VerifyRecastToken, RecastController.checkToken, RecastController.updateToken, RecastController.getPodcastDetails);
    router.get('/api/getPodcastEpisodes/:podcastId', VerifyRecastToken, RecastController.checkToken, RecastController.updateToken, RecastController.getPodcastEpisodes);
    router.post('/api/getGroups', VerifyRecastToken, RecastController.checkToken, RecastController.updateToken, RecastController.getGroups);
    router.get('/api/userGroups/:publisherId', VerifySuperAdmin, RecastController.checkToken, RecastController.updateToken, RecastController.checkPublisher, RecastController.getGroups);
};
