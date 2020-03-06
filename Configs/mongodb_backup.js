/**
 * Created by Akshay Sangani.
 * User: theta-ubuntu-1
 * Date: 30/12/19
 * Time: 5:05 PM
 */
let fs = require('fs');
let _ = require('lodash');
let async = require('async');
let path = require('path');
let exec = require('child_process').exec;
let defaultConfig = require('./masterConfig');
let host = require('./masterConfig')["host"];
let dbOptions = {
    host: host,
    port: defaultConfig["mongodb_port"],
    database: defaultConfig["db_name"],
    autoBackup: true,
    removeOldBackup: true,
    keepLastDaysBackup: defaultConfig["keep_database_backup_days"],
    autoBackupPath: path.join(__dirname, '../backup/')
};

/* return date object */
function stringToDate(dateString) {
    return new Date(dateString);
}

/* return if variable is empty or not. */
function checkEmpty(mixedVar) {
    let undef, key, i, len;
    let emptyValues = [undef, null, false, 0, '', '0'];
    for (i = 0, len = emptyValues.length; i < len; i++) {
        if (mixedVar === emptyValues[i]) {
            return true;
        }
    }
    if (typeof mixedVar === 'object') {
        for (key in mixedVar) {
            return false;
        }
        return true;
    }
    return false;
}

// Auto backup script
exports.dbAutoBackUp = function () {
    // check for auto backup is enabled or disabled
    if (dbOptions.autoBackup == true) {
        let date = new Date();
        let beforeDate, oldBackupDir, oldBackupPath;
        let currentDate = stringToDate(date); // Current date
        let newBackupDir = currentDate.getFullYear() + '-' + (currentDate.getMonth() + 1) + '-' + currentDate.getDate();
        let newBackupPath = dbOptions.autoBackupPath + 'mongodump-' + newBackupDir; // New backup path for current backup process
        console.log(newBackupPath);

        // check for remove old backup after keeping # of days given in configuration
        if (dbOptions.removeOldBackup == true) {
            beforeDate = _.clone(currentDate);
            beforeDate.setDate(beforeDate.getDate() - dbOptions.keepLastDaysBackup); // Substract number of days to keep backup and remove old backup
            oldBackupDir = beforeDate.getFullYear() + '-' + (beforeDate.getMonth() + 1) + '-' + beforeDate.getDate();
            oldBackupPath = dbOptions.autoBackupPath + 'mongodump-' + oldBackupDir; // old backup(after keeping # of days)
        }

        /*Schema List*/
        async.parallel([
            async.apply(exec, 'mongoexport --host ' + dbOptions.host + ' --port ' + dbOptions.port + ' --db ' + dbOptions.database + ' -c roles --out ' + newBackupPath + '/roles.json --jsonArray --pretty'),
            async.apply(exec, 'mongoexport --host ' + dbOptions.host + ' --port ' + dbOptions.port + ' --db ' + dbOptions.database + ' -c users --out ' + newBackupPath + '/users.json --jsonArray --pretty')
        ], function (err, results) {
            if (checkEmpty(err)) {
                // check for remove old backup after keeping # of days given in configuration
                if (dbOptions.removeOldBackup == true) {
                    if (fs.existsSync(oldBackupPath)) {
                        exec("rm -rf " + oldBackupPath, function (err) {
                            console.log(err);
                            console.log("completed");
                        });
                    }
                }
            }
        });
    }
};
