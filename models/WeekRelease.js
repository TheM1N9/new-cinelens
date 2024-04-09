const mongoose = require('mongoose');

const WeekReleaseSchema = new mongoose.Schema({
  title: String,
});

module.exports = mongoose.model('WeekRelease', WeekReleaseSchema);