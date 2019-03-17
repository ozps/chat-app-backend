const mongoose = require('mongoose')
const { Schema } = mongoose
const seenSchema = new Schema(
    {
        username: String,
        roomID: String,
        lastSeen: Date
    },
    { versionKey: false }
)

module.exports = mongoose.model('Seen', seenSchema, 'Seen')
