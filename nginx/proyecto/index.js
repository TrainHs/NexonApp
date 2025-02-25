const mongoose = require('mongoose');
let port = 3000;
const { createServer } = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { UserModel } = require('./models/users'); // Importa el modelo correcto
const server = createServer(app);
const io = new Server(server);

io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  // Enviar mensajes pendientes al reconectar
  UserModel.findOne({ _id: socket.id }).then((user) => {
    if (user) {
      // Filtrar mensajes no entregados
      const pendingMessages = user.messages.filter((msg) => !msg.delivered);

      // Enviar mensajes pendientes al cliente
      pendingMessages.forEach((msg) => {
        socket.emit('chat message', msg.content);
        msg.delivered = true; 
      });

      // Guardar los cambios del usuario
      user.save();
    } else {
      console.log('Usuario no encontrado');
    }
  });

  // Escuchar mensajes del cliente
  socket.on('chat message', async ({ senderId, receiverId, content }) => {
    console.log('Mensaje recibido:', content);

    // Buscar al receptor del mensaje
    const receiver = await UserModel.findOne({ _id: receiverId });
    if (receiver) {
      // Añadir el mensaje al campo messages del receptor
      receiver.messages.push({
        content,
        sender: senderId,
        receiver: receiverId,
      });

      await receiver.save();

      // Emitir el mensaje al receptor si está conectado
      io.to(receiverId).emit('chat message', content);
    } else {
      console.log('Receptor no encontrado');
    }
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado:', socket.id);
  });
});

// Conectar a MongoDB y arrancar servidor
mongoose.connect('mongodb://localhost:27017/Proyecto').then(() => {
  console.log('Conexión a la base de datos correcta!!');

  app.listen(port, () => {
    console.log('Servidor corriendo en http://localhost:' + port);
  });
});
