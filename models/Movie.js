const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
    title: String,
    image: String,
    director: String,
    producer: String,
    cast: String,
    description: String,
    onlineLink: String,
    downloadLink: String,
    clicks: { type: Number, default: 0 } 
});

module.exports = mongoose.model('Movie', movieSchema);
