  // app.js

  const express = require('express');
  const session = require('express-session');
  const path = require('path')
  const bodyParser = require('body-parser');
  const mongoose = require('mongoose');
  const User = require('./models/User');
  const Admin = require('./models/Admin');
  const Movie = require('./models/Movie');
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
  app.get('/', (req, res) => {
    if (req.session.userId) {
      res.render('mainpage'); // render to main page if logged in
    } else {
      res.render('login'); // render to login page if not logged in
    }
  });

  // Redirect root URL to login page if not logged in, otherwise redirect to main page
  // Main page route (protected)
  app.get('/mainpage', requireLogin, async (req, res) => {
    try {
      const movies = await Movie.find(); // Fetch all movies from the database
      res.render('mainpage', { movies }); // Pass the movies to the main page template
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });
  

  // Middleware to protect routes
  // Middleware to protect routes for regular users
function requireLogin(req, res, next) {
  if (req.session && req.session.userId && req.session.userType === 'user') {
    return next(); // Proceed to the next middleware or route handler
  } else {
    res.redirect('/userlogin'); // Redirect to login page if not logged in or not a regular user
  }
}

// Middleware to protect routes for administrators
function requireAdminLogin(req, res, next) {
  if (req.session && req.session.userId && req.session.userType === 'admin') {
    return next(); // Proceed to the next middleware or route handler
  } else {
    res.redirect('/adminloginpage'); // Redirect to admin login page if not logged in or not an admin
  }
}


  // Login route
  app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
      const user = await User.findOne({ username, password });
      if (user) {
        req.session.userId = user._id; // Store user ID in session
        req.session.userType = 'user';
        res.json({ success: true });
      } else {
        res.status(401).json({ success: false, message: 'Invalid username or password' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  app.post('/adminLogin', async (req, res) => {
    const { username, password } = req.body;

    try {
      const user = await Admin.findOne({ username, password });
      if (user) {
        req.session.userId = user._id; // Store user ID in session
        req.session.userType = 'admin';
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

  app.get('/adminloginpage', (req, res) => {
    res.render('adminLogin');
  });

  app.get('/admin',requireAdminLogin, (req, res) => {
    res.render('admin');
  });

  app.get('/signup', (req, res) => {
    res.render('signup');
  });

  // Route to handle adding movie form submission
  app.post('/addmovie', requireAdminLogin, async (req, res) => {
    const { title, image, description } = req.body;

    try {
        const newMovie = new Movie({ title, image, description });
        await newMovie.save();
        res.redirect('/admin'); // Redirect to main page after adding movie
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // Logout route
  app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/userlogin');
  });

  app.get('/adminLogout', (req, res) => {
    req.session.destroy();
    res.redirect('/adminloginpage');
  });


  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
