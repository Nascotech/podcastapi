/**
 * Created by Akshay Sangani.
 * User: theta-ubuntu-1
 * Date: 13/5/19
 * Time: 3:23 PM
 */
let mongoose = require('mongoose');
let fs = require('fs');
let HttpStatus = require('http-status-codes');
let async = require('async');
let path = require('path');
let crypto = require('crypto-random-string');
let bcrypt = require('bcryptjs');
let shortid = require('shortid-36');
let shell = require('shelljs');
let exec = require('child_process').exec;
let backup = require('../../../Configs/mongodb_backup.js');
let constants = require('../../../Utils/ModelConstants');
let varConst = require('../../../Utils/Constants');
let stringConstants = require('../../../Utils/StringConstants');
let responseHandler = require('../../../Utils/ResponseHandler');
let dbName = require('../../../Configs/masterConfig')["db_name"];
let host = require('../../../Configs/masterConfig')["host"];

//Models
let UserModel = mongoose.model(constants.UserModel);
let DeviceInfo = mongoose.model(constants.DeviceInfoModel);
let RolesModel = mongoose.model(constants.RolesModel);
let PhotosModel = mongoose.model(constants.PhotosModel);

let User = {

    signup: function (request, response, next) {

        let input = request.body;

        UserModel.findOne({'email': input.email.toLowerCase()}, function (err, user) {
            if (err) {
                responseHandler.sendResponse(response, "", HttpStatus.INTERNAL_SERVER_ERROR, stringConstants.InternalServerError);
            } else {
                if (user) {
                    responseHandler.sendResponse(response, "", HttpStatus.BAD_REQUEST, stringConstants.UserAlreadyExist);
                } else {

                    RolesModel.findOne({'slug': varConst.USER}, function (err, roleInfo) {
                        if (err) responseHandler.sendResponse(response, "", HttpStatus.INTERNAL_SERVER_ERROR, stringConstants.InternalServerError);

                        let userModel = new UserModel();
                        userModel.email = input.email.toLowerCase();
                        userModel.password = bcrypt.hashSync(input.password, 8);
                        userModel.role = roleInfo.id;
                        userModel.firstName = input.firstName;
                        userModel.lastName = input.lastName;
                        userModel.isResetPassword = varConst.ACTIVE;
                        userModel.save(function (error, finalRes) {
                            if (error) responseHandler.sendResponse(response, error, HttpStatus.BAD_REQUEST, error.name);

                            request.body.userId = finalRes.id;
                            next();
                        });
                    });
                }
            }
        });
    },

    uploadDefaultPhoto: function (request, response, next) {

        let input = request.body;

        let oldPath = 'images/default.png';
        let newPath = 'uploads/profile/';
        let fileName = input.userId + '.png';
        let final = newPath + fileName;

        fs.createReadStream(oldPath).pipe(fs.createWriteStream(final));

        let photosModel = new PhotosModel;
        photosModel.originalName = fileName;
        photosModel.fileName = fileName;
        photosModel.destination = newPath;
        photosModel.path = final;
        photosModel.size = 8805;
        photosModel.save((err, photo) => {
            if (err) responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err.name);

            UserModel.findOne({'_id': input.userId}, function (err, userInfo) {
                if (err) responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err.name);
                if (!userInfo) responseHandler.sendResponse(response, "", HttpStatus.BAD_REQUEST, "User not found");

                userInfo.photo = photo.id;
                userInfo.save((err, finalRes) => {
                    if (err) responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err.name);

                    next();
                });
            });
        });
    },

    signupInfo: function (request, response) {

        let input = request.body;

        UserModel.findOne({'_id': input.userId}).exec(function (err, finalRes) {
            if (err) responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err.name);

            responseHandler.sendResponse(response, finalRes, HttpStatus.OK, "");
        });
    },

    adminLogin: function (request, response, next) {

      let input = request.body;

      UserModel.findOne({'email': input.email}).then(user => {
        if (!user) {
          responseHandler.sendSuccess(response, "", "Username doesn’t match");
        } else if (user.isActive === varConst.INACTIVE) {
          responseHandler.sendSuccess(response, "", "Your account is not active");
        } else if (user.isDeleted === varConst.DELETED) {
          responseHandler.sendSuccess(response, "", "Your account is deleted");
        } else {
          return user;
        }
      }).then(user => {
          return user.deepPopulate('role');
      }).then(user => {
        if (user.role.slug == varConst.PUBLISHER) {
          responseHandler.sendForbidden(response, 'Access Denied')
        } else {
          let passwordIsValid = bcrypt.compareSync(input.password, user.password);
          if (!passwordIsValid) {
            return responseHandler.sendSuccess(response, "", "Password doesn’t match");
          } else {
            request.body.userId = user.id;
            next();
          }
        }
      }).catch(err => {
        responseHandler.sendInternalServerError(response, err, err.name);
      });
    },

    login: function (request, response, next) {

      let input = request.body;

      UserModel.findOne({'email': input.email}).deepPopulate('role').exec(function (err, user) {
        if (err) {
          responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err.name);
        } else if (!user) {
          responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, "Username doesn’t match");
        } else if (user.isActive === varConst.INACTIVE) {
          responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, "Your account is not active");
        } else if (user.isDeleted === varConst.DELETED) {
          responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, "Your account is deleted");
        } else {
          let passwordIsValid = bcrypt.compareSync(input.password, user.password);
          if (!passwordIsValid) {
            return responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, "Password doesn’t match");
          } else {
            request.body.userId = user.id;
            next();
          }
        }
      });
    },

    addDeviceInfo: function (request, response, next) {

      let input = request.body;

      DeviceInfo.findOne({'userId': input.userId}, function (err, device) {
        if (err) {
          responseHandler.sendInternalServerError(response, err, err.name);
        } else {
          if (!device) {
            device = new DeviceInfo;
          }
          device.userId = input.userId;
          device.devicePlatform = input.devicePlatform;
          device.deviceToken = input.deviceToken;
          device.deviceUniqueId = input.deviceUniqueId;
          device.deviceModel = input.deviceModel;
          device.deviceAccessToken = crypto({length: 64}).toString('hex');
          device.os = input.os;
          device.isLogin = varConst.ACTIVE;
          device.save(function (err, deviceInfo) {
            if (err) {
              responseHandler.sendSuccess(response, err, err.name);
            } else {
              request.body.deviceId = deviceInfo.id;
              request.body.userId = deviceInfo.userId;
              next();
            }
          });
        }
      });
    },

    finalInfo: function (request, response) {

      let input = request.body;

      DeviceInfo.findOne({'_id': input.deviceId}, function (err, deviceInfo) {
        if (err) {
          responseHandler.sendInternalServerError(response, err, err.name);
        } else {
          UserModel.findOne({'_id': input.userId}).deepPopulate('role photo').exec(function (err, finalInfo) {
            if (err) {
              responseHandler.sendInternalServerError(response, err, err.name);
            } else {
              responseHandler.sendSuccess(response, {
                  "userInfo": finalInfo,
                  "deviceInfo": deviceInfo
              });
            }
          });
        }
      });
    },

    logout: function (request, response) {

        let input = request.body;
        let token = request.headers['httpx-thetatech-accesstoken'];

        DeviceInfo.findOne({'deviceAccessToken': token}, function (err, info) {
            if (err) responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err.name);
            if (!info) responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, "User not found");

            info.isLogin = varConst.INACTIVE;
            info.save(function (error, deviceInfo) {
                if (error) responseHandler.sendResponse(response, error, HttpStatus.BAD_REQUEST, error.name);

                responseHandler.sendResponse(response, "", HttpStatus.OK, "");
            });
        });
    },

    editProfile: function (request, response, next) {

        let input = request.body;
        let query = {};

        UserModel.findOne({'_id': input.userId}, function (err, userInfo) {
            if (err) responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err.name);
            if (!userInfo) responseHandler.sendResponse(response, "", HttpStatus.BAD_REQUEST, "User not found");

            userInfo.lastName = input.lastName;
            userInfo.firstName = input.firstName;
            userInfo.phone = input.phone;
            userInfo.gender = input.gender;
            userInfo.dateOfBirth = input.dateOfBirth;
            userInfo.save((err, final) => {
                if (err) responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err.name);

                next()
            });
        });
    },

    unlinkProfilePic: function (request, response, next) {

        let input = request.body;

        if (input.isPhoto == 0) {
            next();
        } else {

            let query = {};

            UserModel.findOne({'_id': input.userId}, function (err, userInfo) {
                PhotosModel.findOne({'_id': userInfo.photo}, function (err, photoModel) {
                    if (err) responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err.name);
                    if (!photoModel) {
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
        }
    },

    uploadPhoto: function (request, response, next) {

        let input = request.body;

        if (input.isPhoto == 1) {

            if (request.file) {

                let photosModel = new PhotosModel;
                photosModel.originalName = request.file.originalname;
                photosModel.fileName = request.file.filename;
                photosModel.destination = request.file.destination;
                photosModel.path = request.file.path;
                photosModel.size = request.file.size;
                photosModel.save((err, photo) => {

                    if (err) responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err.name);

                    UserModel.findOne({'_id': input.userId}, function (err, userInfo) {
                        if (err) responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err.name);
                        if (!userInfo) responseHandler.sendResponse(response, "", HttpStatus.BAD_REQUEST, "User not found");

                        userInfo.photo = photo.id;
                        userInfo.save((err, finalRes) => {
                            if (err) responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err.name);

                            next();
                        });
                    });
                });
            }
        } else {
            next();
        }
    },

    userFinalRes: function (request, response) {

        let input = request.body;

        UserModel.findOne({'_id': input.userId}).deepPopulate('role photo').exec(function (err, finalRes) {
            if (err) responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err.name);

            responseHandler.sendResponse(response, {"userInfo": finalRes}, HttpStatus.OK, "");
        });
    },

    changePassword: function (request, response) {

        let input = request.body;

        if (input.new_password !== input.confirm_password) {
            responseHandler.sendResponse(response, "", HttpStatus.BAD_REQUEST, "Password & Confirm password doesn't match");
        } else {
            UserModel.findOne({'_id': input.userId}, function (err, user) {
                if (err) {
                    responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err.name);
                } else if (!user) {
                    responseHandler.sendResponse(response, err, HttpStatus.NOT_FOUND, "User not found");
                } else {
                    let passwordIsValid = bcrypt.compareSync(input.old_password, user.password);
                    if (!passwordIsValid) {
                        responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, "Incorrect old password");
                    } else {
                        user.password = bcrypt.hashSync(input.new_password, 8);
                        user.save(function (error, final) {
                            if (error) {
                                responseHandler.sendResponse(response, error, HttpStatus.BAD_REQUEST, error.name);
                            } else {
                                responseHandler.sendResponse(response, user, HttpStatus.OK, "");
                            }
                        });
                    }
                }
            });
        }
    },

    forgotPassword: function (request, response) {

        let input = request.body;

        UserModel.findOne({'email': input.email}, function (err, user) {
            if (err) {
                responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err.name);
            } else if (!user) {
                responseHandler.sendResponse(response, "", HttpStatus.BAD_REQUEST, "User not found");
            } else {
                user.passwordResetToken = crypto.randomBytes(20).toString('hex');
                user.save(function (error, finalRes) {
                    if (error) {
                        responseHandler.sendResponse(response, error, HttpStatus.BAD_REQUEST, error.name);
                    } else {

                        let link = varConst.BASE_URL + "forgot-password/reset-password/" + finalRes.passwordResetToken;

                        /*mailjet.post("send", {'version': 'v3.1'}).request({
                            "Messages": [
                                {
                                    "From": {
                                        "Email": varConst.MJ_MAIL_FROM,
                                        "Name": varConst.APP_NAME
                                    },
                                    "To": [
                                        {
                                            "Email": finalRes.email,
                                            "Name": finalRes.firstName + " " + finalRes.lastName
                                        }
                                    ],
                                    "TemplateID": varConst.FORGOT_PASSWORD_MAIL,
                                    "TemplateLanguage": true,
                                    "Subject": "Forgot Password",
                                    "Variables": {
                                        "USER_NAME": finalRes.firstName + " " + finalRes.lastName,
                                        "RESET_PASSWORD_LINK": "<a href=" + link + ">" + link + "</a>"
                                    },
                                }
                            ]
                        });*/
                        responseHandler.sendResponse(response, "We have sent you this email in response to your request to reset your password on " + finalRes.email, HttpStatus.OK, "");
                    }
                });
            }
        });
    },

    resetPassword: function (request, response) {

        let input = request.body;

        UserModel.findOne({'passwordResetToken': input.passwordResetToken}, function (err, user) {
            if (err) {
                responseHandler.sendResponse(response, err, HttpStatus.BAD_REQUEST, err.name);
            } else if (!user) {
                responseHandler.sendResponse(response, "", HttpStatus.BAD_REQUEST, "User not found");
            } else if (input.newPassword !== input.confirmPassword) {
                responseHandler.sendResponse(response, "", HttpStatus.BAD_REQUEST, "Password & Confirm password doesn't match");
            } else {
                user.isResetPassword = varConst.ACTIVE;
                user.passwordResetToken = "";
                user.password = bcrypt.hashSync(input.newPassword, 8);
                user.save(function (error, finalRes) {
                    if (error) {
                        responseHandler.sendResponse(response, error, HttpStatus.BAD_REQUEST, error.name);
                    } else {
                        responseHandler.sendResponse(response, "Your password changed successfully", HttpStatus.OK, "");
                    }
                });
            }
        });
    },

    removeDatabase: function (request, response) {
        backup.dbAutoBackUp();
        shell.exec('mongo ' + dbName + ' --eval "db.dropDatabase()"', function (err) {
            if (err) responseHandler.sendResponse(response, "", HttpStatus.BAD_REQUEST, "Something want wrong while we removing old database and setup fresh database.");

            shell.cd('migrations');
            shell.exec('migrate-mongo up', function (err) {
                responseHandler.sendResponse(response, "Backup current database and Fresh database setup successfully.", HttpStatus.OK, "");
            });
        });
    },

    getAllBackupDatabaseList: function (request, response) {
        let dirName = [];
        let directoryPath = path.join(__dirname, '../../../backup/');
        if (fs.existsSync(directoryPath)) {
            fs.readdirSync(directoryPath).forEach(function (file, index) {
                dirName.push(file);
            });
            responseHandler.sendResponse(response, dirName, HttpStatus.OK, "");
        } else {
            responseHandler.sendResponse(response, dirName, HttpStatus.OK, "");
        }
    },

    applyOldDatabase: function (request, response) {

        let param = request.params;

        if (param.dbName != null && param.dbName != '' && param.dbName != "undefined") {
            let directoryPath = path.join(__dirname, '../../../backup/' + param.dbName + "/");
            if (fs.existsSync(directoryPath)) {
                shell.exec('mongo ' + dbName + ' --eval "db.dropDatabase()"', function (err) {
                    fs.readdirSync(directoryPath).forEach(function (file, index) {
                        let cmd = 'mongoimport --db ' + dbName + ' --collection ' + path.parse(file).name + ' --file ' + directoryPath + file + ' --jsonArray';
                        exec(cmd, function (error, stdout, stderr) {
                            console.log(stdout);
                            console.log(stderr);
                        });
                    });
                    responseHandler.sendResponse(response, "Database " + param.dbName + " Restore successfully", HttpStatus.OK, "");
                });
            } else {
                responseHandler.sendResponse(response, "Sorry, Database not found", HttpStatus.BAD_REQUEST, "");
            }
        } else {
            responseHandler.sendResponse(response, "Please pass valid database name", HttpStatus.BAD_REQUEST, "");
        }
    },

    removeDatabaseBackup: function (request, response) {

        let param = request.params;

        if (param.dbName != null && param.dbName != '' && param.dbName != "undefined") {
            let directoryPath = path.join(__dirname, '../../../backup/' + param.dbName + "/");
            if (fs.existsSync(directoryPath)) {
                fs.rmdirSync(directoryPath);
                responseHandler.sendResponse(response, "Database " + param.dbName + " deleted successfully", HttpStatus.OK, "");
            } else {
                responseHandler.sendResponse(response, "Sorry, Database not found", HttpStatus.BAD_REQUEST, "");
            }
        } else {
            responseHandler.sendResponse(response, "Please pass valid database name", HttpStatus.BAD_REQUEST, "");
        }
    }
};

module.exports = User;
