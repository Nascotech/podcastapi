/**
 * Created by Akshay Sangani.
 * User: theta-ubuntu-1
 * Date: 7/6/19
 * Time: 4:37 PM
 */
let mongoose = require('mongoose');
let constants = require('../Utils/ModelConstants');
let varConst = require('../Utils/Constants');
let responseHandler = require('../Utils/ResponseHandler');
let HttpStatus = require('http-status-codes');

//Models
let DeviceInfo = mongoose.model(constants.DeviceInfoModel);
let UserModel = mongoose.model(constants.UserModel);

function verifySuperAdmin(request, response, next) {

  // check header or url parameters or post parameters for token
  let token = request.headers['httpx-thetatech-accesstoken'];

  if (!token) return responseHandler.sendUnAuthorised(response, "'No token provided.'");

  // verifies device and checks exp
  DeviceInfo.findOne({'deviceAccessToken': token, 'isLogin': varConst.ACTIVE}, function (err, device) {
    if (err) {
      return responseHandler.sendInternalServerError(response, err, err.name);
    } else if (!device) {
      return responseHandler.sendUnAuthorised(response, 'Token is not valid');
    } else {
      UserModel.findOne({'_id': device.userId}).deepPopulate('role').exec(function (err, user) {
        if (err) {
          return responseHandler.sendInternalServerError(response, err, err.name);
        } else if (!user) {
          return responseHandler.sendSuccess(response, "", 'User not found.');
        } else if (user.role.slug === varConst.PUBLISHER) {
          responseHandler.sendForbidden(response, 'Access Denied')
        } else if (user.isDeleted === varConst.DELETED) {
          responseHandler.sendSuccess(response, "", "Your account is deleted")
        } else if (user.isActive === varConst.INACTIVE) {
          responseHandler.sendSuccess(response, "", "Your account is not active")
        } else {
          // if everything is good, save to request for use in other routes
          request.body.userId = device.userId;
          request.body.platform = device.devicePlatform;
          next();
        }
      });
    }
  });
}

module.exports = verifySuperAdmin;
