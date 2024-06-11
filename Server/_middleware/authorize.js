const {expressjwt: jwt} = require('express-jwt');
const secret = 'khfkhdskjfhdjkfhkjdshfkjdshf';
var CustomerManagement = require('../Models/CustomerManagement.model');


module.exports = {authorize};

function authorize() {
    console.log('authorize');
    return [

        // authenticate JWT token and attach decoded token to request as req.user
        jwt({ secret:secret, algorithms: ['HS256'] }),



        // check token expiry 

        // attach full user record to request object
        async (req, res, next) => {
            // console.log('token', req.auth.exp);
            // console.log('date ', Date.now());
            // const expiry = req.auth.exp;
            // if ((expiry * 1000) < Date.now()) {
            //     return res.status(401).json({ message: 'Unauthorized' });
            // }

            // get user with id from token 'sub' (subject) property
            //const user = await CustomerManagement.CustomerSchema.findOne(req.auth.sub);
            const user = await CustomerManagement.CustomerSchema.findOne({ _id: req.auth.sub, ActiveStatus: true, IfDeleted: false });
            // check user still exists
            if (!user)
                return res.status(401).json({ message: 'Unauthorized' });

            // authorization successful
            req.user = user;
            next();
        }
    ];
}