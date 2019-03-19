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

const setLastSeen = async ({ username, roomID, timestamp }) => {
    await Seen.findOneAndUpdate(
        { username: username, roomID: roomID },
        { lastSeen: timestamp },
        (error, seen) => {
            if (error) throw error
            console.log(seen.lastSeen)
        }
    )
}

const getLastSeen = async ({ username, roomID }) => {
    let results = []
    await Seen.findOne(
        { username: username, roomID: roomID },
        (error, seen) => {
            if (error) throw error
            results.push(seen.lastSeen)
        }
    )
    return results
}

io.set('transports', ['websocket'])
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
        const seen = await getLastSeen(username, roomID)
        await socket.join(roomID)
        await io.to(roomID).emit('announce', `JOIN : ${socket.id}`)
        await socket.emit('initial', { messages, seen })
    })

    socket.on('exit', async ({ username, roomID }) => {
        await setLastSeen(username, roomID)
        await io.to(roomID).emit('announce', `EXIT : ${socket.id}`)
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
