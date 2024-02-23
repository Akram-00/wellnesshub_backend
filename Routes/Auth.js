const express = require('express');
const router = express.Router();
const User = require('../Models/UserSchema')
const errorHandler = require('../Middlewares/errorMiddleware');
const authTokenHandler = require('../Middlewares/checkAuthToken');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'akramtest0000@gmail.com',
        pass: 'lmmq inva sfdd vueh'
    }
})

router.get('/test', async (req, res) => {
    res.json({
        message: "Auth api is working"
    })
})

function createResponse(ok, message, data) {
    return {
        ok,
        message,
        data,
    };
}

router.post('/register', async (req, res, next) => {
    try {
        const { name, email, password, weightInKg, heightInCm, gender, dob, goal, activityLevel } = req.body;
        const existingUser = await User.findOne({ email: email });

        if (existingUser) {
            return res.status(409).json(createResponse(false, 'Email already exists'));
        }
        const newUser = new User({
            name,
            password,
            email,
            weight: [
                {
                    weight: weightInKg,
                    unit: "kg",
                    date: Date.now()
                }
            ],
            height: [
                {
                    height: heightInCm,
                    date: Date.now(),
                    unit: "cm"
                }
            ],
            gender,
            dob,
            goal,
            activityLevel
        });
        await newUser.save(); // Await the save operation

        res.status(201).json(createResponse(true, 'User registered successfully'));

    } catch (err) {
        next(err)
    }
})
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json(createResponse(false, 'User Not Found'));
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json(createResponse(false, 'Invalid credentials'));
        }

        const authToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '50m' });
        const refreshToken = jwt.sign({ userId: user._id }, process.env.JWT_REFRESH_SECRET_KEY, { expiresIn: '100m' });

        res.cookie('authToken', authToken, { httpOnly: true });
        res.cookie('refreshToken', refreshToken, { httpOnly: true });
        res.status(200).json(createResponse(true, 'Login successful', {
            authToken,
            refreshToken
        }));
    } catch (err) {
        next(err)
    }
})
router.post('/sendotp', async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000);

        // Set OTP value and expiration
        const otpExpiry = new Date();
        otpExpiry.setMinutes(otpExpiry.getMinutes() + 15); // Expiry set to 15 minutes
        user.otp = { value: otp, expiry: otpExpiry };
        await user.save();

        const mailOptions = {
            from: 'akramtest0000@gmail.com',
            to: email,
            subject: 'OTP for password reset',
            text: `Your OTP for password reset is ${otp}`
        };

        transporter.sendMail(mailOptions, async (err, info) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: 'Failed to send OTP', error: err });
            } else {
                res.json({ message: 'OTP sent successfully' });
            }
        });
    } catch (err) {
        next(err);
    }
});
router.put('/otpverfication', async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email });

        // Find the user by userId and check OTP validity

        if (!user) {
            return res.status(404).json(createResponse(false, 'User not found'));
        }

        if (!user.otp || user.otp.value !== otp || user.otp.expiry < new Date()) {
            return res.status(400).json(createResponse(false, 'Invalid OTP'));
        }

        // Clear the OTP value and expiry time
        user.otp = { value: "", expiry: "" };

        // Save the updated user record
        await user.save();

        res.json(createResponse(true, 'OTP verification is completed'));
    } catch (err) {
        next(err);
    }
});
router.put('/resetpasswordbyotp', async(req,res,next)=>{
    try {
        const { email, newPassword } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json(createResponse(false, 'User not found'));
        }
        user.password = newPassword;
        user.otp = undefined;
        await user.save();
    
        res.json(createResponse(true, 'Password reset successfully'));
    } catch (error) {
        next(error)
    }
})
router.post('/checklogin', authTokenHandler, async (req, res, next) => {
    try {
        const userId = req.userId;
        res.json({
            ok: true,
            message: 'User authenticated successfully',
            userid: userId
        })
    } catch (error) {
        next(error)
    }
})
router.put('/changepassword', authTokenHandler, async (req, res, next) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.userId;

    try {
        // Find the user by userId
        const user = await User.findById(userId);

        // If user doesn't exist
        if (!user) {
            return res.status(404).json(createResponse(true,"User not Found"));
        }

        // Compare oldPassword with the existing password
        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

        // If oldPassword is incorrect
        if (!isPasswordValid) {
            return res.status(400).json(createResponse(true, "Incorrect password"));
        }

        // Hash the new password
        user.password = newPassword;

        // Save the updated user
        await user.save();

        // Respond with success message
        res.status(200).json(createResponse(true, "Password changed successfully"));
    } catch (error) {
        // Handle errors
        next(error);
    }
});
router.delete('/cleardata', authTokenHandler, async (req, res) => {
    try {
        const userId = req.userId; // Assuming you're using middleware to extract userId
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json(createResponse(false, "User Not Found"));
        }

        // Clear user data from calorieIntake to water
        user.calorieIntake = [];
        user.sleep = [];
        user.steps = [];
        user.workouts = [];
        user.water = [];

        // Save the updated user
        await user.save();

        // Respond with success message
        return res.status(200).json(createResponse(true, 'User data cleared successfully'));
    } catch (error) {
        console.error(error);
        return res.status(500).json(createResponse(true, 'Internal server error'));
    }
});
router.delete('/deleteuser', authTokenHandler, async (req, res, next) => {
    try {
        const userId = req.userId; // Assuming you're using middleware to extract userId
        const user = await User.findByIdAndDelete(userId);

        if (!user) {
            return res.status(404).json(createResponse(false,'User not found'));
        }

        return res.status(200).json(createResponse(true,'User account deleted successfully' ));
    } catch (error) {
        console.error(error);
        return res.status(500).json(createResponse(false,'Internal server error'));
    }
});
router.put('/uploadImage', authTokenHandler, async (req, res) => {
    try {
        const userId = req.userId; // Extracting userId from middleware

        // Find the user by userId
        const user = await User.findById(userId);

        // If user doesn't exist
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Extract the link from the request body
        const { link } = req.body;

        // Update the userImageURL field
        user.userImageURL = link;

        // Save the updated user
        await user.save();

        // Respond with success message
        res.status(200).json({ message: 'User image URL updated successfully' });
    } catch (error) {
        // Handle errors
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.post('/getuserdata', authTokenHandler, async (req, res, next) => {
    const userId = req.userId;
    const user = await User.findById(userId);

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const userDetails = {
        name: user.name,
        email: user.email,
        weight: user.weight,
        height: user.height,
        gender: user.gender,
        dob: user.dob,
        goal: user.goal,
        workouts: user.workouts,
        activityLevel: user.activityLevel
    }

    res.json(createResponse(true, 'UserDetails fetched successfully', userDetails))

})

router.post('/logout', authTokenHandler, (req, res) => {
    // Clear cookies to "logout" the user
    res.clearCookie('authToken');
    res.clearCookie('refreshToken');

    res.status(200).json({ message: 'Logout successful', ok: true });
});

router.use(errorHandler)

module.exports = router