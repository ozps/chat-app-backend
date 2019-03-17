const mongoose = require('mongoose')
const { Schema } = mongoose
const messageSchema = new Schema(
    {
        username: String,
        roomID: String,
        message: String,
        timestamp: Date
    },
    { versionKey: false }
)

module.exports = mongoose.model('Message', messageSchema, 'Message')
