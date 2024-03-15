const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const PORT = 8000;
const cookieParser = require('cookie-parser');

// routes defintion
const authRoutes = require('./Routes/Auth');
const calorieIntakeRoutes = require('./Routes/CalorieIntake');
const adminRoutes = require('./Routes/Admin');
const imageUploadRoutes = require('./Routes/imageUploadRoutes');
const sleepTrackRoutes = require('./Routes/SleepTrack');
const stepTrackRoutes = require('./Routes/StepTrack');
const weightTrackRoutes = require('./Routes/WeightTrack');
const waterTrackRoutes = require('./Routes/WaterTrack');
const workoutTrackRoutes = require('./Routes/WorkoutTrack');
const workoutRoutes = require('./Routes/WorkoutPlans');
const reportRoutes = require('./Routes/Report');


require('dotenv').config();
require('./db');

app.use(bodyParser.json());
const allowedOrigins = ['https://miniature-system-rqvr57797vw2pw9j-3000.app.github.dev']; // front-end url
// cors policy only allows those who only have accesss

const allowedOrigin = 'https://miniature-system-rqvr57797vw2pw9j.github.dev';

app.use(cors({
    origin: function (origin, callback) {
      // Check if the request origin matches the allowed origin or if the origin is not present (for same-origin requests)
      if (!origin || origin === 'https://miniature-system-rqvr57797vw2pw9j-3000.app.github.dev') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }));

// storing your cookies
app.use(cookieParser());


// routes
app.use('/auth', authRoutes);
app.use('/calorieintake', calorieIntakeRoutes);
app.use('/admin', adminRoutes);
app.use('/image-upload', imageUploadRoutes);
app.use('/sleeptrack', sleepTrackRoutes);
app.use('/steptrack', stepTrackRoutes);
app.use('/weighttrack', weightTrackRoutes);
app.use('/watertrack', waterTrackRoutes);
app.use('/workouttrack', workoutTrackRoutes);
app.use('/workoutplans', workoutRoutes);
app.use('/report', reportRoutes);


app.listen(PORT, () => {
    console.log(`SERVER IS RUNNING ON PORT ${PORT}`)
}) 