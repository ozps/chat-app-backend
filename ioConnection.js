const mongoose = require('mongoose')
const config = require('./config/config')
const Message = require('./models/Message')
const Seen = require('./models/Seen')

mongoose.connect(config.mongoURI, { useNewUrlParser: true })

const getMessages = async roomID => {
    const messages = await Message.find({ roomID: roomID })
    return messages.map(message => {
        return {
            sender: message.username,
            timestamp: message.id.getTimestamp(),
            text: message.message,
            roomID
        }
    })
}

const seen = async (username, roomID) => {
    const seen = await getSeen(username, roomID)
    seen.lastSeen = new Date()
    await seen.save
    return seen
}

const getSeen = async (username, roomID) => {
    const seen = await Seen.findOne({ username, roomID })
    return seen || new Seen(username, roomID, new Date())
}

module.exports = async socket => {
    const username = socket.handshake.query.username || Math.random().toFixed(4)
    const roomID = socket.handshake.query.roomID || 'global'

    console.log('connected')

    socket.join(roomID)
    const [messages, read] = await Promise.all([
        getMessages(roomID),
        seen(username, roomID)
    ])
    socket.emit('initial', { messages, read })

    socket.on('message', async event => {
        const { roomID, message } = event
        const msg = new Message({
            username,
            roomID,
            message
        })
        await msg.save()
        message.timestamp = msg.timestamps.createdAt
        // io.of('/chat').to(roomID).emit('message', message);
    })

    socket.on('join', roomID => {
        socket.join(roomID)
        // io.of('/chat').to(roomID).emit('announce', `JOIN : ${socket.id}`);
    })

    socket.on('leave', roomID => {
        socket.leave(roomID)
        // io.of('/chat').to(roomID).emit('announce', `LEAVE : ${socket.id}`);
    })

    socket.on('disconnect', () => {
        console.log('disconnected')
    })
}
