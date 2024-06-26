const router = require('express').Router();
const User = require("../mongodb/Models/User");
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const fetchPerson = require("../middlewares");
const Question = require("../mongodb/Models/Question");
const basicAuth = require('express-basic-auth');


// Basic Authentication middleware
const userId = process.env.userId;
const userPassword = process.env.userPassword;

const userAuth = basicAuth({
    users: { [userId]: userPassword },
    challenge: true,
    unauthorizedResponse: 'Unauthorized',
});


//Register
//Token must be there before this route is called.
//Middleware will verify if user has verified there number or logged in.
// !REGISTER or updating user can be done only single time.

router.post("/register", userAuth,  async(req,res)=>{
    //todo: Validate the fields.
    const fields = req.body;
    try{
        //* testResponses are also included
        const newUser = await User.create(fields);
        //* Have to generate token also
        // generate token - expiry time is 24 hours
        const data = {
            exp: Math.floor(Date.now() / 1000) + 60*60*24,
            mongoID: newUser._id,
            isAdmin: false
        };
        const token = jwt.sign(data, process.env.JWT_SECRET);
        res.status(200).json({success: true, message: "Registered successfully", token});
    } catch(err){
        console.log(err);
        res.status(500).json({success: false, message: "Cannot register", err});
    }
});

//LOGIN
// ! Secure the API by using any code to request the APIs.
// ! IF MOBILE EXISTS UPDATE THE PASSWORD 
// ! ELSE CREATE USER WITH MOBILE AND PASSWORD
router.post("/login", userAuth, async (req,res)=>{
    try {
        const mobile = req.body.mobile;
        const password = req.body.password;
        let user = await User.findOne({mobile: mobile});

        if(!user){
            return res.status(404).json({success: false, message: "User not found"});
        }
        // *user is found, match the password
        if(user.password !== password){
            return res.status(401).json({success: false, message: "Incorrect password"});
        }
        //*User is authenticated, generate token
        // generate token - expiry time is 24 hours
        const data = {
            exp: Math.floor(Date.now() / 1000) + 60*60*24,
            mongoID: user._id,
            isAdmin: user.role===2?true:false
        };
        const token = jwt.sign(data, process.env.JWT_SECRET);
        console.log(req.body);
        res.status(200).json({success: true, message: "Logged in successfully", token});

    } catch(err){
        res.status(500).json({success: false, message: err});
    }
})

router.post("/update-password", userAuth, async (req, res)=>{
    const mobile = req.body.mobile;
    const newPassword = req.body.password;

    try {
        const userDoc = await User.findOneAndUpdate({mobile: mobile}, {password: newPassword}, {new: true});

        if(userDoc === null){
            return res.status(404).json({success: false, message: "User not found"});
        }

        res.status(200).json({success: true, message: "User updated successfully", userDoc});

    } catch (error) {
        res.status(500).json({success: false, message: err});
    }

})

//!Generate token also here
router.post("/check-password", userAuth, async(req,res)=>{
    try{
        const userDoc = await User.findOne({mobile: req.body.mobile});

        if(userDoc.password === req.body.password){
            //*GENERATING TOKEN
            const data = {
                exp: Math.floor(Date.now() / 1000) + 60*60*24,
                mongoID: userDoc._id,
                isAdmin: userDoc.role===2?true:false
            };
            const token = jwt.sign(data, process.env.JWT_SECRET);

            res.status(200).json({success:true, message:"Password matched", token})
            return;
        }
        else{
            res.status(401).json({success:false, message:'Incorrect Password'})
            return;
        }
    }
    catch(error){
        res.status(500).json({success: false, message: err});
    }

})

router.post("/verify-user", userAuth, fetchPerson, async (req,res)=>{
    
    res.json({success: true, message: "Token verified succesfully", isAdmin: req.isAdmin});
})

router.post("/get-user", fetchPerson, async (req,res)=>{
    // console.log("here", req.mongoID);
    // console.log("SDFSD");
    try {
        const userDoc = await User.findById(req.mongoID);
        res.json({success: true, message: "User fetched successfully", userDoc});
        
    } catch (err) {
        res.status(500).json({success: false, message: err});
    }
    
})

router.post("/check-mobile-registered", userAuth, async (req,res)=>{
    const phone = req.body.mobile
    try {
        const userDoc = await User.findOne({mobile: phone});
        // console.log(userDoc);
        if(!userDoc){
            //user not found
            res.status(200).json({success: false, message: "Mobile number not registered"});
            return;
        }
        res.status(200).json({success: true, message: "Mobile number registered"});
    } catch (error) {
        res.status(500).json({success: false, message: error});
    }
})

//Update test responses in user schema
router.put("/update-response", userAuth, fetchPerson, async(req,res)=>{
    const userId = req.mongoID;
    // console.log(userId);
    try {
        const updatedUser = await User.findByIdAndUpdate(userId, {testResponse: req.body.responses, lastTestDate: Date.now()}, {new:true});
        res.json({success:true, updatedUser});
    } catch (error) {
        res.status(500).json({success: false, message: error.message});
    }
})



module.exports = router;