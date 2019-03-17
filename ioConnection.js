const mongoose = require('mongoose')
const keys = require('./config/config')
const Message = require('./models/Message')
const Seen = require('./models/Seen')

mongoose.connect(keys.mongoURI, { useNewUrlParser: true })

module.exports = socket => {
    const username = socket.handshake.query.username || Math.random().toFixed(4)
    const roomID = socket.handshake.query.roomID || 'global'
}
