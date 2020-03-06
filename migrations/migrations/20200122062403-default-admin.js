/**
 * Created by Akshay Sangani.
 * User: theta-ubuntu-1
 * Date: 05/7/19
 * Time: 1:01 PM
 */
let varConst = require('../../Utils/Constants');
let bcrypt = require('bcryptjs');
let constants = require('../../Utils/ModelConstants');

module.exports = {
    up(db) {
        let hashedPassword = bcrypt.hashSync(varConst.PASSWORD, 8);
        db.collection(constants.RolesModel).findOne({'slug': varConst.SUPER_ADMIN}, function (err, roleInfo) {
            db.collection(constants.UserModel).insertOne({
                firstName: "Admin",
                lastName: "User",
                email: "admin@admin.com",
                role: roleInfo._id.toString(),
                password: hashedPassword,
                status: varConst.ACTIVE,
                isVerified: varConst.ACTIVE,
                isActive: varConst.ACTIVE,
                isDeleted: varConst.NOT_DELETED,
                updatedAt: new Date(),
                createdAt: new Date()
            });
        });
    },

    down(db) {
        db.collection(constants.UserModel).deleteMany({});
    }
};
