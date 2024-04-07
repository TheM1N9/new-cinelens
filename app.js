// app.js

const express = require('express');
const session = require('express-session');
const path = require('path')
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const User = require('./models/User');

const app = express();

// Set up static file serving
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware setup
app.use(session({
  secret: 'secret-key', // Change this to a more secure secret
  resave: false,
  saveUninitialized: false
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Connect to MongoDB Atlas
const dbURI = 'mongodb+srv://cinelens:cinelens@cluster0.se0ybbw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));


// Redirect root URL to login page if not logged in, otherwise redirect to main page
app.get('/', (req, res) => {
  if (req.session.userId) {
    res.redirect('/mainpage.html'); // Redirect to main page if logged in
  } else {
    res.redirect('/login.html'); // Redirect to login page if not logged in
  }
});

// Main page route (protected)
app.get('/mainpage.html', requireLogin, (req, res) => {
  res.sendFile(__dirname + '/public/mainpage.html');
});

// Middleware to protect routes
function requireLogin(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  } else {
    res.redirect('/login.html'); // Redirect to login page if not logged in
  }
}

// Sign up route
app.post('/signup', async (req, res) => {
  const { email, username, password } = req.body; // Extract email, username, and password

  try {
    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    // Create new user
    const newUser = new User({ email, username, password }); // Include email in the user creation
    await newUser.save();

    res.status(200).json({ success: true, message: 'Sign up successful. You can now log in.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username, password });
    if (user) {
      req.session.userId = user._id; // Store user ID in session
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
