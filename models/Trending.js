const mongoose = require('mongoose');

const TrendingSchema = new mongoose.Schema({
  title: String,
});

module.exports = mongoose.model('Trending', TrendingSchema);