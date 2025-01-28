import express from "express"
import { createServer } from "node:http"
import { Server } from "socket.io"
import dotenv from "dotenv"
dotenv.config()
const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.NEXT_PUBLIC_URL, // Remove the trailing slash
    methods: ["GET", "POST"],
  },
})


io.on("connection", (socket) => {
  
  socket.userName = null
  socket.readyToStart = false
  console.log("New user connected:", socket.id)

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id)
  })

  socket.on("join_room", (data) => {
    console.log(`${data.userName} user connected: ${socket.id}`)
    socket.join(data.roomName)
    socket.userName = data.userName

    // Get all sockets in the room
    const sockets = io.sockets.adapter.rooms.get(data.roomName)
    const users = Array.from(sockets || [])
      .map((socketId) => {
        return io.sockets.sockets.get(socketId)?.userName
      })
      .filter(Boolean)

    // Emit room_users event to all users in the room
    io.to(data.roomName).emit("room_users", users)

    console.log(`User ${data.userName} joined room ${data.roomName}`)
  })

  socket.on("ready_to_start", (data) => {
    console.log(`${data.userName} is ready to start in room ${data.roomName}`)
    socket.readyToStart = true

    const room = io.sockets.adapter.rooms.get(data.roomName)
    // console.log("room", room)

    if (room) {
      const sockets = Array.from(room)
      const readyPlayers = sockets.filter((socketId) => {
        const playerSocket = io.sockets.sockets.get(socketId)
        return playerSocket && playerSocket.readyToStart
      })

      console.log("readyPlayers", readyPlayers)

      if (readyPlayers.length === 1) {
        io.to(data.roomName).emit("waiting_for_opponent")
      } else if (readyPlayers.length === 2) {
        io.to(data.roomName).emit("game_start")
      }
    }
  })
  socket.on("game_over", (data) => {
    io.to(data.roomName).emit("winner_is",data.userName)
  })


  socket.on("send_number", ({roomName, number,userName}) => {
    console.log("message: by " + userName + " in room " + roomName + " " + number)
    const d={userName,number,roomName}
    io.to(roomName).emit("receive_number",d)
  })
  

  socket.on("disconnect", () => {
    console.log("User disconnected")
  })
})



const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

