const express = require('express')
const path = require('path')
const http = require('http')
const socketio = require('socket.io')
const { generateMessage, generateLocation } = require('./utils/messages')
const {addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users')

const app = express()
const public = path.join(__dirname, '../public')
const server = http.createServer(app)
const io = socketio(server)

app.use(express.json())
app.use(express.static(public)) 

const port = process.env.PORT || '3000'

io.on('connection', (socket) => {

    // ---> Connect to a single room
    socket.on('join', ({username, room}, callback) => {
        const {error, user} = addUser({id: socket.id, username, room})
        if(error) {
            return callback(error)
        }
        socket.join(user.room)

        socket.emit('message', generateMessage('Admin' ,`Welcome ${user.username}!`))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin' ,`${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    // ----> Send messages
    socket.on('message', (message, callback) => {
        const user = getUser(socket.id)

        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    // ----> Emit disconnected user
    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if(user) {
            io.to(user.room).emit('message', generateMessage('Admin' ,`${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })

    // ----> Send location
    socket.on('sendLocation', (location, callback) => {
        const user = getUser(socket.id)

       io.to(user.room).emit('locationMessage', generateLocation(user.username, `https://www.google.com/maps?q=${location.latitude},${location.longitude}`))

       callback()
    })
})

server.listen(port, () => {
    console.log('Running on port ' + port)
})