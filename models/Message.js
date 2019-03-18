const mongoose = require('mongoose')
const { Schema } = mongoose
const messageSchema = new Schema(
    {
        username: String,
        roomID: String,
        message: String
    },
    { versionKey: false, timestamps: true }
)

module.exports = mongoose.model('Message', messageSchema, 'Message')
