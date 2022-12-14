/**
 * Created by Akshay Sangani.
 * User: theta-ubuntu-1
 * Date: 7/6/19
 * Time: 4:37 PM
 */
let defaultConfig = require('../Configs/masterConfig');

//app name
exports.APP_NAME = "Theta Technolabs";

//default page size
exports.PAGE_SIZE = 10;
exports.PAGE_SIZE_25 = 25;

//firebase api key
exports.FIREBASE_MOBILE_KEY = "AAAAeaRKIMg:APA91bETCdKZMFjZb-Ht0WaB3eZUx4bV5ELt9QHs5NYpegMZ_P7BD9jdv7G25Oi2zBM5maWGuFN3rMG8N7Y3Kn1adVekwTrh05VdBfebXQrVtrG7VnKKBYPmj";
exports.FIREBASE_WEB_KEY = "AAAAjAtarnQ:APA91bE50z6x6gfcqizdhxVF8L0FF7cCVfJqYgl2-WlFAJ6D1DQEOVX9FjVuFecMCQ4a0OfhFo6vLC4pamJFa5SFRBPa96phWdaQ6FNpaTEHMjXAaPvPfKn1BV3djG";

//status
exports.ACTIVE = 1;
exports.INACTIVE = 0;

//default sgUsername
exports.SG_USERNAME = "pthakur@plenartech.com"

//delete status
exports.DELETED = 1;
exports.NOT_DELETED = 0;

//notification status
exports.UNREAD = 0;
exports.READ = 1;

//default password
exports.PASSWORD = "123456";

//default Roles slugs for access admin panel
exports.SUPER_ADMIN = "super_admin";
exports.PUBLISHER = "publisher";

//default role for Array
exports.DEFAULT_ROLE_ARRAY = [
    "Super Admin",
    "Publisher"
];

//default device platform
exports.PLATFORM_WEB = "web";
exports.PLATFORM_ANDROID = "android";
exports.PLATFORM_IOS = "ios";

//Mailjet credentials
exports.MJ_APIKEY_PUBLIC = defaultConfig['mj_apikey_public'];
exports.MJ_APIKEY_PRIVATE = defaultConfig['mj_apikey_private'];
exports.MJ_MAIL_FROM = defaultConfig["from_mail"];

exports.FORGOT_PASSWORD_MAIL = 1548379;

//default mail config
exports.SMTP_HOST_NAME = "mail.plenartech.com";
exports.SMTP_PORT = 465;
exports.SMTP_USERNAME = "akshay.sangani@plenartech.com"
exports.SMTP_PASSWORD = "l3k6T0vFCDEA";
exports.MAIL_FROM = "akshay.sangani@plenartech.com";
exports.ADMIN_EMAIL = ["pthakur@plenartech.com", "akshay@thetatechnolabs.com"];

//podcast base url
exports.PODCAST_BASE_URL = "https://atunwadigital-recast.streamguys1.com/";
