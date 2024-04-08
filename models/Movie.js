const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  title: String,
  image: String,
  description: String,
});

module.exports = mongoose.model('Movie', movieSchema);