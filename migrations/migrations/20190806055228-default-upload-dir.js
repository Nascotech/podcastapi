/**
 * Created by Akshay Sangani.
 * User: theta-ubuntu-1
 * Date: 06/7/19
 * Time: 11:22 AM
 */
let fs = require('fs');
let path = require('path');
let mkdirp = require('mkdirp');
let oldmask = process.umask(0);

module.exports = {
    async up(db) {
        await mkdirp(path.join(__dirname, '../../uploads'), '0777', function (err) {
            mkdirp(path.join(__dirname, '../../backup'), '0777', function (err) {});
            mkdirp(path.join(__dirname, '../../uploads/profile'), '0777', function (err) {});
        });
    },

    down(db) {
        // TODO write the statements to rollback your migration (if possible)
    }
};
