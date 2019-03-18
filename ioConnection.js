const mongoose = require('mongoose')
const config = require('./config/config')
const Message = require('./models/Message')
const Seen = require('./models/Seen')

mongoose.connect(config.mongoURI, { useNewUrlParser: true })

module.exports = socket => {
    const username = socket.handshake.query.username || Math.random().toFixed(4)
    const roomID = socket.handshake.query.roomID || 'global'

    console.log('connected')

    // socket.join(roomID);
    // const [messages, read] = await Promise.all([

    //   MessageModel.getMessages(roomID),
    //   ReadModel.read(username, roomID),

    // ]);
    // socket.emit('initial', { messages, read });

    // socket.on('message', event => {
    //     const { roomID, message } = event;
    //     const addedMessage = await MessageModel.addMessage(
    //         username,
    //         roomID,
    //         message.text,
    //     );
    //     message.timestamp = addedMessage.insertedId.getTimestamp();
    //     Socket.chatIO.to(roomID).emit('message', message);
    // });

    socket.on('join', roomID => {
        socket.join(roomID)
        // io.of('/chat').to(roomID).emit('announce', `JOIN : ${socket.id}`);
    })

    socket.on('leave', roomID => {
        socket.leave(roomID)
        // Socket.chatIO.to(roomID).emit('announce', `LEAVE : ${socket.id}`);
    })

    socket.on('disconnect', () => {
        console.log('disconnected')
    })
}
