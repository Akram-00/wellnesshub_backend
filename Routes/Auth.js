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
        pass: 'trmcbkktnkudnpim'
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
            return res.status(400).json(createResponse(false, 'Invalid credentials'));
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
        const otp = Math.floor(100000 + Math.random() * 900000);

        const mailOptions = {
            from: 'akramtest0000@gmail.com',
            to: email,
            subject: 'OTP for verification',
            text: `Your OTP is ${otp}`
        }

        transporter.sendMail(mailOptions, async (err, info) => {
            if (err) {
                console.log(err);
                res.status(500).json(createResponse(false, err.message));
            } else {
                res.json(createResponse(true, 'OTP sent successfully', { otp }));
            }
        });
    } catch (err) {
        next(err)
    }
})
router.post('/checklogin', authTokenHandler, async (req, res, next) => {
    const userId = req.userId;
    res.json({
        ok: true,
        message: 'User authenticated successfully',
        userid: userId
    })
})
router.put('/changepassword', authTokenHandler, async (req, res, next) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.userId;

    try {
        // Find the user by userId
        const user = await User.findById(userId);

        // If user doesn't exist
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Compare oldPassword with the existing password
        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

        // If oldPassword is incorrect
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Incorrect old password' });
        }

        // Hash the new password
        user.password = newPassword;

        // Save the updated user
        await user.save();

        // Respond with success message
        res.status(200).json({ message: 'Password changed successfully' });
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
            return res.status(404).json({ message: 'User not found' });
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
        return res.status(200).json({ message: 'User data cleared successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
router.delete('/deleteuser', authTokenHandler, async (req, res, next) => {
    try {
        const userId = req.userId; // Assuming you're using middleware to extract userId
        const user = await User.findByIdAndDelete(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({ message: 'User account deleted successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
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