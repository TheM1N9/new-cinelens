// app.js

const express = require('express');
const session = require('express-session');
const path = require('path')
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const User = require('./models/User');

const app = express();
var validateUser = 0;

// Set up static file serving
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

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
// Main page route (protected)
app.get('/mainpage', requireLogin, (req, res) => {
  res.render('mainpage');
});

// Middleware to protect routes
function requireLogin(req, res, next) {
  if (req.session && req.session.userId) {
    return next(); // Proceed to the next middleware or route handler
  } else {
    res.redirect('/userlogin'); // Redirect to login page if not logged in
  }
}

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

app.get('/userlogin', (req, res) => {
  res.render('login');
});


// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/userlogin');
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
