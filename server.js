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

const getMessages = async (username, roomID) => {
    let results = []
    let time
    await Message.find(
        { username: username, roomID: roomID, message: '*#Join' },
        (error, messages) => {
            if (error) throw error
            console.log(messages)
            if (messages.length) time = messages[0].createdAt
        }
    )
    //console.log('time', typeof (time))
    if (!time) return results
    await Message.find({ roomID: roomID }, (error, messages) => {
        if (error) throw error
        for (let m of messages) {
            if (m.createdAt > time) {
                let temp = {
                    username: m.username,
                    roomID: m.roomID,
                    content: m.message,
                    timestamp: m.createdAt
                }
                results.push(temp)
            }
        }
    })
    return results
}

const setLastSeen = async (username, roomID, timestamp) => {
    await Seen.findOne(
        { username: username, roomID: roomID },
        async (error, seen) => {
            if (error) throw error
            await console.log('Oz', seen)
            if (seen === null) {
                const s = new Seen({
                    username: username,
                    roomID: roomID,
                    lastSeen: timestamp
                })
                await s.save()
            } else {
                await Seen.findOneAndUpdate(
                    { username: username, roomID: roomID },
                    { lastSeen: timestamp }
                )
            }
        }
    )
}

const getLastSeen = async (username, roomID) => {
    let results = []
    console.log('USER', username, roomID)
    await Seen.findOne(
        { username: username, roomID: roomID },
        (error, seen) => {
            if (error) throw error
            console.log('seen', seen)
            if (seen !== null) results.push(seen.lastSeen)
        }
    )
    console.log('results', results)
    return results
}

const getAllGroups = async () => {
    let results = []
    await Message.distinct('roomID', function(err, messages) {
        results = messages
    })
    return results
}

const deleteJoin = async (username, roomID) => {
    await Message.findOneAndDelete({ username: username, roomID: roomID })
}

io.on('connection', socket => {
    console.log('connected')

    socket.on('register', async username => {
        console.log('client register...', username)
        const groups = await getAllGroups()
        await socket.emit('group', groups)
        //await console.log("Debug--- ", groups)
    })

    socket.on('message', async (message, cb) => {
        const { username, roomID, content } = message
        console.log('client send msg...', message)
        const msg = new Message({
            username: username,
            roomID: roomID,
            message: content
        })
        await msg.save()
        message.timestamp = await msg.createdAt
        await io.to(roomID).emit('message', message)
        if (cb) await cb(null)
    })

    socket.on('newGroup', roomID => {
        console.log('new room ', roomID)
        io.emit('group', [roomID])
    })

    socket.on('getMessages', async ({ username, roomID }, cb) => {
        const messages = await getMessages(username, roomID)
        const seen = await getLastSeen(username, roomID)
        await console.log('test', messages, seen)
        await cb({ msg: messages, lastSeen: seen })
    })

    socket.on('join', async ({ username, roomID }, cb) => {
        console.log('client join....', username, roomID)
        //console.log(groups)
        socket.join(roomID)
        if (cb) await cb(null)
    })

    socket.on('exit', async (username, { roomID, timestamp }) => {
        console.log(username, ' Exit')
        await setLastSeen(username, roomID, timestamp)
        await io.to(roomID).emit('announce', `EXIT : ${socket.id}`)
    })

    socket.on('leave', async (message, cb) => {
        socket.leave(message.roomID)
        await deleteJoin(message.username, message.roomID)
        await cb(null)
    })

    socket.on('disconnect', () => {
        console.log('disconnected')
    })
})

server.listen(5000, function() {
    console.log('listening on *:5000')
})
