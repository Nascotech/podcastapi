/**
 * Created by Akshay Sangani.
 * User: theta-ubuntu-1
 * Date: 27/05/20
 * Time: 10:45 AM
 */
let HttpStatus = require('http-status-codes');

let responseHandler = {

  sendResponse: function (response, jsonResponse, statusCode, errorMsg) {
    response.status(statusCode).send({
      'errorMsg': errorMsg,
      'response': jsonResponse
    });
  },

  sendSuccess: function (response, jsonResponse, errorMsg = '') {
    response.status(HttpStatus.OK).send({
      'errorMsg': errorMsg,
      'response': jsonResponse
    });
  },

  sendBadRequest: function (response, jsonResponse, errorMsg = '') {
    response.status(HttpStatus.BAD_REQUEST).send({
      'errorMsg': errorMsg,
      'response': jsonResponse
    });
  },

  sendInternalServerError: function (response, jsonResponse, errorMsg) {
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      'errorMsg': errorMsg,
      'response': jsonResponse
    });
  },

  sendUnAuthorised: function (response, errorMsg) {
   response.status(HttpStatus.UNAUTHORIZED).send({
     'errorMsg': errorMsg
   })
  },

  sendForbidden: function (response, errorMsg) {
   response.status(HttpStatus.FORBIDDEN).send({
     'errorMsg': errorMsg
   })
  },
};

module.exports = responseHandler;
