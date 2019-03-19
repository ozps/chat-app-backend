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

const getMessages = async roomID => {
    let results = []
    await Message.find({ roomID: roomID }, (error, messages) => {
        if (error) throw error
        for (let m of messages) {
            let temp = {
                username: m.username,
                roomID: m.roomID,
                content: m.message,
                timestamp: m._id.getTimestamp()
            }
            results.push(temp)
        }
    })
    return results
}

const setLastSeen = async (username, roomID) => {
    const seen = getSeen(username, roomID)
    seen.lastSeen = await new Date()
    await seen.save
    return seen
}

const getSeen = async (username, roomID) => {
    const seen = await Seen.findOne({ username, roomID })
    return seen || new Seen(username, roomID, new Date())
}

io.on('connection', socket => {
    console.log('connected')

    socket.on('register', username => {
        console.log('client register...', username)
    })

    socket.on('message', async message => {
        const { username, roomID, content } = message
        console.log('client send msg...', message)
        const msg = new Message({
            username: username,
            roomID: roomID,
            message: content
        })
        await msg.save((err, msg) => {
            message.timestamp = msg._id.getTimestamp()
        })
        await io.to(roomID).emit('message', message)
    })

    socket.on('join', async ({ username, roomID }) => {
        const messages = await getMessages(roomID)
        //const seen = setLastSeen(username, roomID)
        socket.join(roomID)
        io.to(roomID).emit('announce', `JOIN : ${socket.id}`)
        console.log(messages)
        // socket.emit('initial', { messages, seen })
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
