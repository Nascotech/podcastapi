/**
 * Created by Akshay Sangani.
 * User: theta-ubuntu-1
 * Date: 05/7/19
 * Time: 6:03 PM
 */
let slugs = require("slugs");
let varConst = require('../../Utils/Constants');
let constants = require('../../Utils/ModelConstants');

module.exports = {
    async up(db) {
        await varConst.DEFAULT_ROLE_ARRAY.forEach(function (roleName) {
            let role = db.collection(constants.RolesModel);
            role.insert({
                roleName: roleName,
                slug: slugs(roleName, '_'),
                updatedAt: new Date(),
                createdAt: new Date()
            });
        });
    },

    async down(db) {
        await varConst.DEFAULT_ROLE_ARRAY.forEach(function (roleName) {
            let role = db.collection(constants.RolesModel);
            role.remove({slug: slugs(roleName, '_')});
        });
    }
};
