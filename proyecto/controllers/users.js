const bcrypt = require("bcrypt");
const { validateUser, UserModel } = require("../models/users");
const crypto = require("node:crypto");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const { PostSchema } = require("../models/blogposts");
const z = require("zod");
const { resolveSoa } = require("node:dns");
const { console } = require("node:inspector");

let userController = {
  home: (req, res) => {
    res.render("index", { title: "Blog Posts" });
  },

  register: async (req, res) => {
    const id = crypto.randomUUID();
    const { username, email, password, confirmPassword } = req.body;
  
    try {
      // Verificar si el nombre de usuario ya está en uso
      const existingUsername = await UserModel.findOne({ username });
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: "Este nombre de usuario ya está en uso",
        });
      }
  
      // Verificar si el correo electrónico ya está en uso
      const existingEmail = await UserModel.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Este email ya está en uso",
        });
      }
  
      // Verificar si las contraseñas coinciden
      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "Las contraseñas no coinciden",
        });
      }
  
      // Validar datos de usuario con Zod
      const result = validateUser(req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Errores de validación",
          errors: result.error.errors,
        });
      }
  
      // Si todo es válido, crear el usuario
      const newUser = new UserModel({
        _id: id,
        username,
        email,
        password,
        name: req.body.name,
        bornDate: req.body.bornDate,
        gender: req.body.gender,
      });
  
      await newUser.save();
  
      return res.status(200).json({
        success: true,
        message: "Usuario registrado con éxito",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  },
  
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await UserModel.findOne({ email });
  
      if (!user) {
        return res.status(404).json({ message: "Este usuario no está registrado" });
      }
  
      const validPassword = bcrypt.compareSync(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Contraseña incorrecta, inténtelo de nuevo" });
      }
  
      // Generar un token único
      const token = crypto.randomBytes(20).toString('hex');
      const expiration = Date.now() + 3600000; // 1 hora
  
      // Guardar el token y la fecha de expiración en el usuario
      user.emailVerificationToken = token;
      user.emailVerificationTokenExpiration = expiration;
      await user.save();
  
      const verifyLink = `http://localhost:3000/users/verify-login?token=${token}&userId=${user._id}`;
  
      const mensaje = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verificación de Inicio de Sesión</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    margin: 0;
                    padding: 0;
                    background-color: #f7f7f7;
                }
                .container {
                    background: #ffffff;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                    max-width: 600px;
                    margin: 0 auto;
                }
                .header {
                    font-size: 24px;
                    font-weight: bold;
                    color: #333;
                    text-align: center;
                    margin-bottom: 20px;
                }
                .content {
                    font-size: 16px;
                    color: #555;
                    margin-bottom: 20px;
                }
                .button {
                    display: inline-block;
                    padding: 12px 25px;
                    font-size: 16px;
                    color: white;
                    background-color: #007bff;
                    text-decoration: none;
                    border-radius: 5px;
                    text-align: center;
                }
                .footer {
                    font-size: 14px;
                    color: #777;
                    text-align: center;
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Verificación de Inicio de Sesión</h1>
                </div>
                <div class="content">
                    <p>Hola <strong>${user.name}</strong>,</p>
                    <p>Hemos detectado un intento de inicio de sesión en tu cuenta de nexonapp.com.</p>
                    <p>Para completar el proceso, por favor haz clic en el siguiente enlace para confirmar tu inicio de sesión:</p>
                    <p><a href="${verifyLink}" class="button"><strong>Iniciar Sesión</strong></a></p>
                    <p>Si no fuiste tú quien intentó iniciar sesión, por favor ignora este mensaje y considera cambiar tu contraseña.</p>
                    <p>Si tienes alguna pregunta, no dudes en ponerte en contacto con nosotros respondiendo a este correo.</p>
                </div>
                <div class="footer">
                    <p>Saludos,<br>El equipo de <strong>Nexonapp.com</strong></p>
                </div>
            </div>
        </body>
        </html>
        `;
  
      const transport = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        auth: { user: "nexonapp0@gmail.com", pass: "gpje hjye llow tweo" }
      });
  
      await transport.sendMail({
        from: 'nexonapp0@gmail.com',
        to: user.email,
        subject: "Verificación de Inicio de Sesión",
        html: mensaje,
      });
  
      return res.status(200).json({
        success: true,
        message: "Se ha enviado un correo de verificación. Por favor, verifica tu inicio de sesión."
      });
  
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Error al autenticar el usuario" });
    }
  }
  ,verifyLogin: async (req, res) => {
    try {
      const { token, userId } = req.query;
      const user = await UserModel.findOne({ _id: userId, emailVerificationToken: token });
  
      if (!user || Date.now() > user.emailVerificationTokenExpiration) {
        return res.status(400).json({ message: "Token inválido o expirado" });
      }
  
      // Limpiar el token y la fecha de expiración
      user.emailVerificationToken = undefined;
      user.emailVerificationTokenExpiration = undefined;
      await user.save();
  
      // Establecer la sesión del usuario
      req.session.userId = user._id;
      req.session.name = user.name;
      req.session.username = user.username;
      req.session.email = user.email;
      req.session.followers = user.followers;
      req.session.following = user.following;
      req.session.isAuthenticated = true;
  
      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ message: "Error al guardar la sesión" });
        }
        return res.redirect("/dashboard");
      });
  
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Error al verificar el inicio de sesión, inténtelo de nuevo" });
    }
  },
  updateName: async (req, res) => {
    const nameSchema = z
    .string({
      required_error: "El nombre no puede ir vacío",
    })
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
    .max(30, { message: "El nombre no puede tener más de 40 caracteres" })
    .refine((value) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(value), {
      message: "El nombre solo puede contener letras",
    })
    .transform((value) => value.trim())

    try {
      const { newName } = req.body;
      const { userId } = req.session;
      const validatedName = nameSchema.safeParse(newName);

      if (!validatedName.success) {
        return res.status(400).json({
          success: false,
          message: validatedName.error.errors[0].message
        });
      }

      const updatedName = await UserModel.findByIdAndUpdate(
        userId,
        { name: newName },
        { new: true, runValidators: true }
      );

      if (!updatedName) {
        return res.status(404).json({
          success: false,
          message: "El usuario no se ha encontrado"
        });
      }

      return res.status(200).json({
        success: true,
        message: "El nombre se ha actualizado correctamente"
      });

    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: "Ha ocurrido un error, vuelve a intentarlo"
      });
    }
}

  ,

  
 updatePassword: async (req, res) => {
  const passwordSchema = z
    .string({ required_error: "La contraseña no puede ir vacía" })
    .min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+={[}\]|:;"'<>,.?/~`]).{10,}$/,
      {
        message:
          "La contraseña debe contener al menos una letra mayúscula, una letra minúscula, un número y un carácter especial",
      }
    )
    .transform((value) => value.trim());

  try {
    const userId = req.session.userId;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "El usuario no se ha encontrado" });
    }

    // Verificar la contraseña actual
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: "La contraseña actual es incorrecta, inténtelo de nuevo" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Las contraseñas no coinciden" });
    }

    const parsedPassword = passwordSchema.safeParse(newPassword);
    if (!parsedPassword.success) {
      return res.status(400).json({ success: false, message: "Ha habido un error al actualizar la contraseña, inténtalo de nuevo" });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "La contraseña se ha actualizado correctamente",
    });

  } catch (err) {
    console.error("Error al actualizar la contraseña:", err);
    return res.status(500).json({ success: false, error: "Ha ocurrido un error, vuélvalo a intentar" });
  }
},
updateUsername: async (req, res) => {
  const usernameSchema = z
    .string()
    .min(4, {
      message: "El nombre de usuario debe tener al menos 4 caracteres.",
    })
    .max(30, {
      message: "El nombre de usuario no puede tener más de 30 caracteres.",
    })
    .regex(/^(?!.*[_.]{2})[a-zA-Z0-9][a-zA-Z0-9._]{0,29}[a-zA-Z0-9]$/, {
      message:
        "El nombre de usuario solo puede contener letras, números, puntos y guiones bajos. No puede comenzar o terminar con un caracter especial.",
    })
    .transform((value) => value.trim());

  try {
    const { newUsername } = req.body;
    const { userId } = req.session;

    // Validación del nuevo nombre de usuario
    const validatedUsername = usernameSchema.safeParse(newUsername);
    if (!validatedUsername.success) {
      return res.status(400).json({
        success: false,
        message: validatedUsername.error.errors[0].message, // Error de validación
        type: "validation_error",
      });
    }

    // Verificar si el nombre de usuario ya está en uso
    const existingUsername = await UserModel.findOne({ username: newUsername });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: "Este nombre de usuario ya está en uso",
        type: "username_taken",
      });
    }

    // Intentar actualizar el nombre de usuario en la base de datos
    const updatedUsername = await UserModel.findByIdAndUpdate(
      userId,
      { username: newUsername },
      { new: true, runValidators: true }
    );

    if (!updatedUsername) {
      return res.status(404).json({
        success: false,
        message: "El usuario no se ha encontrado",
        type: "user_not_found",
      });
    }

    // Si todo salió bien, enviamos éxito
    return res.status(200).json({
      success: true,
      message: "El nombre de usuario se ha actualizado correctamente",
      type: "success",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Ha ocurrido un error inesperado, por favor, inténtalo de nuevo.",
      type: "server_error",
    });
  }
},
sendRecoveryEmail: async (req, res) => {
  try {
      const { newEmail } = req.body;
      const userId = req.session.userId;
      const currentEmail = req.session.email; 
      const name = req.session.name;

      if (!newEmail) {
          return res.status(400).json({ success: false, message: "El nuevo email es obligatorio." });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
          return res.status(400).json({ success: false, message: "Formato de email no válido." });
      }

      const user = await UserModel.findById(userId);
      if (!user) {
          return res.status(404).json({ success: false, message: "Usuario no encontrado." });
      }

      // Generar un token único
      const token = crypto.randomBytes(20).toString('hex');
      const expiration  = Date.now() + 3600000; // 1 hora

      // Guardar el token y la fecha de expiración en el usuario
      user.emailVerificationToken = token;
      user.emailVerificationTokenExpiration = expiration;
      user.emaiilNew = newEmail;
      await user.save();

      const verifyLink = `http://localhost:3000/users/updated-email?token=${user.emailVerificationToken}`;


  const mensaje = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verificación de Cambio de Correo Electrónico</title>
      <style>
          body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 0;
              background-color: #f7f7f7;
          }
          .container {
              background: #ffffff;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
              max-width: 600px;
              margin: 0 auto;
          }
          .header {
              font-size: 24px;
              font-weight: bold;
              color: #333;
              text-align: center;
              margin-bottom: 20px;
          }
          .content {
              font-size: 16px;
              color: #555;
              margin-bottom: 20px;
          }
          .button {
              display: inline-block;
              padding: 12px 25px;
              font-size: 16px;
              color: white;
              background-color: #007bff;
              text-decoration: none;
              border-radius: 5px;
              text-align: center;
          }
          .footer {
              font-size: 14px;
              color: #777;
              text-align: center;
              margin-top: 20px;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <h1>Solicitud de Cambio de Correo Electrónico</h1>
          </div>
          <div class="content">
              <p>Hola <strong>${name}</strong>,</p>
              <p>Hemos recibido una solicitud para cambiar la dirección de correo electrónico asociada a tu cuenta en nexonapp.com.</p>
              <p>Para completar el proceso, por favor haz clic en el siguiente enlace para confirmar el cambio:</p>
              <p><a href="${verifyLink}" class="button"><strong>Cambiar mi correo</strong></a></p>
              <p>Si no fuiste tú quien realizó esta solicitud, puedes ignorar este mensaje.</p>
              <p>Si tienes alguna pregunta, no dudes en ponerte en contacto con nosotros respondiendo a este correo.</p>
          </div>
          <div class="footer">
              <p>Saludos,<br>El equipo de <strong>Nexonapp.com</strong></p>
          </div>
      </div>
  </body>
  </html>
  `;

    const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    auth: { user: "nexonapp0@gmail.com", pass: "gpje hjye llow tweo" }
});

await transport.sendMail({
  from: 'nexonapp0@gmail.com',
  to: newEmail,
  subject: "Confirma tu cambio de correo",
  html: mensaje,
});

  return res.status(200).json({ success: true, message: "Correo de verificación enviado." });

} catch (error) {
  res.status(500).send("Error al enviar el correo.");
}

},
updatedEmail: async (req, res) => {
    try {
      const { token} = req.query;
      // Verificar si el token existe y no ha expirado
      const user = await UserModel.findOne({
          emailVerificationToken: token,
      });
   
      if (!user) {
          return res.status(400).json({ success: false, message: "Token inválido o expirado." });
      }

      // Actualizar el correo del usuario
      const newEmail  = user.emaiilNew; 
      user.email = newEmail;
      user.emailVerificationToken = null; 
      user.emailVerificationTokenExpiration = null; // Limpiar la fecha de expiración
      user.emaiilNew = null;
      await user.save();

      // Limpiar el correo de la sesión
      req.session.email = newEmail;

      // Redirigir al usuario o enviar una respuesta de éxito
      return res.status(200).redirect("/");

  } catch (err) {
      console.error("Error actualizando el correo:", err);
      return res.status(500).json({ success: false, message: "Error actualizando el correo." });
  }
},


  forgottenEmail: async (req, res) => {
    const destino = req.body.destino;
    const username = req.session.username

    if (!destino) {
      return res.status(400).send("El correo electrónico es requerido.");
    }

    try {
      const config = {
        host: "smtp.gmail.com",
        port: 587,
        auth: {
          user: "nexonapp0@gmail.com",
          pass: "gpje hjye llow tweo",
        },
      };

      const mensaje = `
      <!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cambio de correo electrónico</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 20px;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background: #ffffff;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        .boton {
          display: inline-block;
          padding: 10px 20px;
          font-size: 16px;
          color: white;
          background-color: #007bff;
          text-decoration: none;
          border-radius: 5px;
      }
    </style>
</head>
<body>
    <div class="container">
        <h1>Hola <strong>${username}</strong>,</h1>
        <p><a href="http://localhost:3000/update-email" class="boton"><strong>Cambiar mi correo</strong></a></p>
        <p>Si no te has sido tu , simplemente ignora este mensaje.</p>
        <p>Si tienes alguna pregunta, no dudes en responder a este correo.</p>
        <p>¡Bienvenido a nuestra comunidad!</p>
        <p>Saludos,<br>
        El equipo de <strong>MMG.COM</strong></p>
    </div>
</body>
</html>
      `
      const datos = {
        from: "nexonapp0@gmail.com",
        to: destino,
        subject: "Verifica tu dirección de correo electrónico",
        html: mensaje,
      };

      const transport = nodemailer.createTransport(config);
      const info = await transport.sendMail(datos);

      res.send("Correo de recuperación enviado.");
    } catch (error) {
      res.status(500).send("Error al enviar el correo.");
    }
  },

  recoverPassword: async (req, res) => {
    res.send("Recuperar contraseña");
  },

  logout: (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Error al cerrar sesión" });
      }
      res.redirect("/");
    });
  },

  follow: async (req, res) => {
    const userID = req.session.userId;
    const followUsername = req.body.followUsername;

    console.log(userID, followUsername);

    try {
      const sessionUser = await UserModel.findById(userID);
      if (!sessionUser) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      if (sessionUser.username === followUsername) {
        return res.status(400).json({ message: "No puedes seguirte a ti mismo" });
      }

      const userToFollow = await UserModel.findOne({ username: followUsername });
      if (!userToFollow) {
        return res.status(404).json({ message: "Usuario a seguir no encontrado" });
      }

      if (sessionUser.following.includes(userToFollow.username)) {
        return res.status(400).json({ message: "Ya sigues a este usuario" });
      }

      sessionUser.following.push(userToFollow.username);
      await sessionUser.save();

      userToFollow.followers.push(sessionUser.username);
      await userToFollow.save();

      return res.json({ message: "Usuario seguido correctamente" });
    } catch (err) {
      return res.status(500).json({
        message: "No se ha podido añadir al amigo, inténtelo de nuevo",
      });
    }
  },

  perfil: (req, res, next) => {
    try {
      console.log("Session Data:", req.session)
        // Configurar datos del usuario en res.locals
        res.locals.username = req.session.username;

        // Calcular el número de followers y following
        res.locals.followersCount = (req.session.followers || []).length;
        res.locals.followingCount = (req.session.following || []).length;

        res.locals.followers = req.session.followers || [];
        res.locals.following = req.session.following || [];
      
        next();
    } catch (error) {
        console.error("Error al cargar perfil:", error);
        res.status(500).send("Error interno del servidor");
    }
},

search: async (req, res) => {
  const { searchUsername } = req.query; // Acceder al parámetro de la query

  if (!searchUsername) {
    return res.status(400).render('busqueda', { message: "Debes introducir un nombre de usuario", user: null });
  }

  try {
    const regex = new RegExp(searchUsername, 'i');
    // Buscar al usuario por el nombre de usuario
    const user = await UserModel.findOne({ username: { $regex: regex } });

    if (!user) {
      return res.status(404).render('busqueda', { message: "Usuario no encontrado", user: null });
    }

    return res.status(200).render('busqueda', { message: null, user });
  } catch (err) {
    console.error(err);
    return res.status(500).render('busqueda', { message: "Error al buscar el usuario", user: null });
  }
},

}




// chat: (req, res) => {
//   // Configurar Socket.IO
// io.on("connection", (socket) => {
//   console.log("Usuario conectado:", socket.id);

//   // Manejar evento de chat
//   socket.on("chat message", (msg) => {
//       io.emit("chat message", msg); 
//   });

//   socket.on("disconnect", () => {
//       console.log("Usuario desconectado:", socket.id);
//   });
// });
// }


module.exports = userController;
