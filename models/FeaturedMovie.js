const mongoose = require('mongoose');

const featuredMovieSchema = new mongoose.Schema({
  title: String,
});

module.exports = mongoose.model('FeaturedMovie', featuredMovieSchema);