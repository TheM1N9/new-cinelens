// app.js

const express = require("express");
const session = require("express-session");
const path = require("path");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./models/User");
const Admin = require("./models/Admin");
const Movie = require("./models/Movie");
const FeaturedMovie = require("./models/FeaturedMovie");
const Trending = require("./models/Trending");
const WeekRelease = require("./models/WeekRelease");
const app = express();
require("dotenv").config();
// var validateUser = 0;

// Set up static file serving
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

// Session middleware setup
app.use(
  session({
    secret: "secret-key", // Change this to a more secure secret
    resave: false,
    saveUninitialized: false,
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Connect to MongoDB Atlas
const dbURI =
  "mongodb+srv://cinelens:cinelens@cluster0.se0ybbw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
mongoose
  .connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// Redirect root URL to login page if not logged in, otherwise redirect to main page
app.get("/", (req, res) => {
  if (req.session.userId) {
    res.render("mainpage"); // render to main page if logged in
  } else {
    res.render("login"); // render to login page if not logged in
  }
});

// Redirect root URL to login page if not logged in, otherwise redirect to main page
// Main page route (protected)
app.get("/mainpage", requireLogin, async (req, res) => {
  try {
    
    const userId = req.session.userId;
    const user = await User.findById(userId);
    // Query titles of featured movies from the featuredMovies collection
    const featuredMovieTitles = await FeaturedMovie.find({}, "title");

    // Find the featured movies from the movies collection based on their titles
    const featuredMovies = await Movie.find({
      title: { $in: featuredMovieTitles.map((titleObj) => titleObj.title) },
    });

    // const TrendingTitles = await Trending.find({}, "title");
    // const TrendingMovies = await Movie.find({ title: { $in: TrendingTitles.map(titleObj => titleObj.title) } });

    // Get trending movies based on clicks
    const TrendingMovies = await Movie.find().sort({ clicks: -1 }).limit(5);

    const WeekReleaseTitles = await WeekRelease.find({}, "title");

    const WeekReleases = await Movie.find({
      title: { $in: WeekReleaseTitles.map((titleObj) => titleObj.title) },
    });

    const allmovies = await Movie.find(); // Fetch all movies from the database
    res.render("mainpage", {
      featuredMovies,
      TrendingMovies,
      WeekReleases,
      allmovies,
      user,
    }); // Pass the movies to the main page template
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/collection", requireLogin, async (req, res) => {
  try {
    const user = await User.findOne();
    const movies = await Movie.find(); // Fetch all movies from the database
    res.render("collection", { movies, user }); // Pass the movies to the main page template
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Add this route handler to your Express app
app.get("/search", async (req, res) => {
  try {
    const { query } = req.query;
    const user = await User.findOne();
    const movies = await Movie.find({ title: { $regex: new RegExp(query, "i") } });
    res.render("searchResults", { movies ,user });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});


// Middleware to protect routes
// Middleware to protect routes for regular users
function requireLogin(req, res, next) {
  if (req.session && req.session.userId && req.session.userType === "user") {
    return next(); // Proceed to the next middleware or route handler
  } else {
    res.redirect("/userlogin"); // Redirect to login page if not logged in or not a regular user
  }
}

// Middleware to protect routes for administrators
function requireAdminLogin(req, res, next) {
  if (req.session && req.session.userId && req.session.userType === "admin") {
    return next(); // Proceed to the next middleware or route handler
  } else {
    res.redirect("/adminloginpage"); // Redirect to admin login page if not logged in or not an admin
  }
}

// Login route
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (user) {
      // Compare the provided password with the hashed password stored in the database
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (passwordMatch) {
        req.session.userId = user._id; // Store user ID in session
        req.session.userType = "user";
        res.json({ success: true });
      } else {
        res
          .status(401)
          .json({ success: false, message: "Invalid username or password" });
      }
    } else {
      res
        .status(401)
        .json({ success: false, message: "Invalid username or password" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


app.post("/adminLogin", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await Admin.findOne({ username, password });
    if (user) {
      req.session.userId = user._id; // Store user ID in session
      req.session.userType = "admin";
      res.json({ success: true });
    } else {
      res
        .status(401)
        .json({ success: false, message: "Invalid username or password" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Route to handle user signup
app.post("/signup", async (req, res) => {
  const { email, username, password } = req.body;

  try {
    // Check if the email or username already exists in the database
    const existingUser = await User.findOne({
      $or: [{ email: email }, { username: username }],
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email or username already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user instance with the hashed password
    const newUser = new User({ email, username, password: hashedPassword });

    // Save the new user to the database
    await newUser.save();

    // Respond with success message
    res
      .status(201)
      .json({ success: true, message: "User created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


app.get("/userlogin", (req, res) => {
  res.render("login");
});

app.get("/adminloginpage", (req, res) => {
  res.render("adminLogin");
});

// Route to display admin page with featured movies
app.get("/admin", requireAdminLogin, async (req, res) => {
  try {
    // Retrieve all featured movies from the database
    const featuredMovies = await FeaturedMovie.find();
    const TrendingMovies = await Trending.find();
    const WeekReleaseMovies = await WeekRelease.find();
    res.render("admin", { featuredMovies, TrendingMovies, WeekReleaseMovies });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.get("/userSignup", (req, res) => {
  res.render("signup");
});

// Route to handle adding movie form submission
app.post("/addmovie", requireAdminLogin, async (req, res) => {
  const {
    title,
    image,
    director,
    producer,
    cast,
    description,
    onlineLink,
    downloadLink,
  } = req.body;

  try {
    // Create a new movie document
    const newMovie = new Movie({
      title,
      image,
      director,
      producer,
      cast,
      description,
      onlineLink,
      downloadLink,
    });
    // Save the new movie to the database
    await newMovie.save();
    // Redirect to admin page after adding movie
    res.redirect("/admin");
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Route to handle adding featured movie form submission
app.post("/addFeaturedMovie", requireAdminLogin, async (req, res) => {
  const { title } = req.body;

  try {
    // Create a new movie document
    const newMovie = new FeaturedMovie({ title });
    // Save the new movie to the database
    await newMovie.save();
    // Redirect to admin page after adding movie
    res.redirect("/admin");
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Route to handle editing a featured movie
app.post("/editFeaturedMovie/:id", requireAdminLogin, async (req, res) => {
  const { title } = req.body;
  const { id } = req.params;

  try {
    // Find the featured movie by ID and update its title
    await FeaturedMovie.findByIdAndUpdate(id, { title });
    res.redirect("/admin");
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Route to handle movie clicks
app.post("/movies/:id/click", async (req, res) => {
  const movieId = req.params.id;

  try {
    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res
        .status(404)
        .json({ success: false, message: "Movie not found" });
    }

    // Increment the clicks field
    movie.clicks++;
    await movie.save();

    res
      .status(200)
      .json({ success: true, message: "Click recorded successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Route to handle deleting a featured movie
app.post("/deleteFeaturedMovie/:id", requireAdminLogin, async (req, res) => {
  const { id } = req.params;

  try {
    // Find the featured movie by ID and delete it
    await FeaturedMovie.findByIdAndDelete(id);
    res.redirect("/admin");
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// // Route to handle adding trending movie form submission
// app.post("/addTrending", requireAdminLogin, async (req, res) => {
//   const { title } = req.body;

//   try {
//     // Create a new movie document
//     const newMovie = new Trending({ title });
//     // Save the new movie to the database
//     await newMovie.save();
//     // Redirect to admin page after adding movie
//     res.redirect("/admin");
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// });

// // Route to handle editing a featured movie
// app.post("/editTrendingMovie/:id", requireAdminLogin, async (req, res) => {
//   const { title } = req.body;
//   const { id } = req.params;

//   try {
//     // Find the featured movie by ID and update its title
//     await Trending.findByIdAndUpdate(id, { title });
//     res.redirect("/admin");
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// });

// // Route to handle deleting a featured movie
// app.post("/deleteTrendingMovie/:id", requireAdminLogin, async (req, res) => {
//   const { id } = req.params;

//   try {
//     // Find the featured movie by ID and delete it
//     await Trending.findByIdAndDelete(id);
//     res.redirect("/admin");
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// });

// Route to handle adding week releases movie form submission
app.post("/addWeekRelease", requireAdminLogin, async (req, res) => {
  const { title } = req.body;

  try {
    // Create a new movie document
    const newMovie = new WeekRelease({ title });
    // Save the new movie to the database
    await newMovie.save();
    // Redirect to admin page after adding movie
    res.redirect("/admin");
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Route to handle editing a featured movie
app.post("/editWeekReleaseMovie/:id", requireAdminLogin, async (req, res) => {
  const { title } = req.body;
  const { id } = req.params;

  try {
    // Find the featured movie by ID and update its title
    await WeekRelease.findByIdAndUpdate(id, { title });
    res.redirect("/admin");
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Route to handle deleting a featured movie
app.post("/deleteWeekReleaseMovie/:id", requireAdminLogin, async (req, res) => {
  const { id } = req.params;

  try {
    // Find the featured movie by ID and delete it
    await WeekRelease.findByIdAndDelete(id);
    res.redirect("/admin");
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Route to serve movie pages
app.get("/movies/:id", requireLogin, async (req, res) => {
  try {
    const user = await User.findOne();
    // Retrieve the movie details from the database based on the ID
    const movie = await Movie.findById(req.params.id);

    const movies = await Movie.find(); // Fetch all movies from the database
    // res.render('movie',{movies});

    if (!movie) {
      return res.status(404).send("Movie not found");
    }

    // Render the movie page template with the movie data
    res.render("movie", { movies, movie, user });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/users/:id", requireLogin, async (req, res) => {
  try {
    // Retrieve the movie details from the database based on the ID
    // const user = await User.findById(req.params.id);

    // const users = await User.find();
    // res.render('user',{users});

    const userId = req.session.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send("user not found");
    }

    // Render the user page template with the user data
    res.render("myAccount", {  user });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// POST route to handle changing the password
app.post("/changePassword", async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const userId = req.session.userId; // Retrieve user ID from session

  try {
    // Fetch the user from the database
    const user = await User.findById(userId);

    // Verify if the current password provided matches the user's current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Current password is incorrect" });
    }

    // Verify if the new password and confirm password match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match",
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password in the database with the hashed password
    user.password = hashedPassword;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


// Logout route
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/userlogin");
});

app.get("/adminLogout", (req, res) => {
  req.session.destroy();
  res.redirect("/adminloginpage");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
