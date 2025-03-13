

require("dotenv").config();

function checkRole(req,res,next){
    console.log('process.env.user ',process.env.MY_USER);
    console.log("Checkrole is called: ",res.locals.role);

    if(res.locals.role == process.env.MY_USER)
        res.sendStatus(401);
    else
    next()
}

module.exports = { checkRole:checkRole }