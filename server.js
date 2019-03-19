const express = require('express')
const http = require('http')
const socketIO = require('socket.io')
const bodyParser = require('body-parser')
const cors = require('cors')
const app = express()
const server = http.createServer(app)
const io = socketIO(server)
const mongoose = require('mongoose')
const config = require('./config/config')
const Message = require('./models/Message')
const Seen = require('./models/Seen')

mongoose.connect(config.mongoURI, { useNewUrlParser: true })

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html')
})

const getMessages = roomID => {
    const messages = Message.find({ roomID: roomID })
    return messages.map(message => {
        return {
            sender: message.username,
            timestamp: message._id.getTimestamp(),
            text: message.message,
            roomID
        }
    })
}

const seen = (username, roomID) => {
    const seen = getSeen(username, roomID)
    seen.lastSeen = new Date()
    seen.save
    return seen
}

const getSeen = (username, roomID) => {
    const seen = Seen.findOne({ username, roomID })
    return seen || new Seen(username, roomID, new Date())
}

io.on('connection', socket => {
    console.log('connected')

    socket.on('register', username => {
        console.log('client register...', username)
    })

    socket.on('message', async message => {
        const { username, roomID, content } = message
        console.log('client send msg...', data)
        const msg = new Message({
            username: username,
            roomID: roomID,
            message: content
        })
        await msg.save()
        message.timestamp = await msg.timestamps.createdAt
        await io.to(roomID).emit('message', message)
    })

    // socket.join(roomID)
    // const [messages, read] = await Promise.all([
    //     getMessages(roomID),
    //     seen(username, roomID)
    // ])
    // socket.emit('initial', { messages, read })

    socket.on('join', roomID => {
        socket.join(roomID)
        io.to(roomID).emit('announce', `JOIN : ${socket.id}`)
    })

    socket.on('leave', roomID => {
        socket.leave(roomID)
        io.to(roomID).emit('announce', `LEAVE : ${socket.id}`)
    })

    socket.on('disconnect', () => {
        console.log('disconnected')
    })
})

server.listen(3000, function() {
    console.log('listening on *:3000')
})
