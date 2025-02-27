const mongoose = require("mongoose");
const z = require("zod");
const bcrypt = require("bcrypt");
const moment = require("moment");

// Subesquema de Mensajes
const MessageSchema = new mongoose.Schema({
  content: { type: String, required: true },
  sender: { type: String, required: true }, 
  receiver: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  delivered: { type: Boolean, default: false },
});

// Esquema de Usuario
const UserSchema = new mongoose.Schema(
  {
    _id: String,
    name: String,
    username: String,
    bornDate: Date,
    email: String,
    password: String,
    emailVerificationToken: String,
    emaiilNew: String,
    gender: [{ type: String }],
    following: [{ type: String }],
    followers: [{ type: String }],
    messages: [MessageSchema],
    registerDate: { type: Date, default: Date.now },
  },
  { collection: "Users" }
);

// Middleware para cifrar Contraseñas
UserSchema.pre("save", function (next) {
  const user = this;

  if (!user.isModified("password")) {
    return next();
  }

  bcrypt.hash(user.password, 10, (err, hash) => {
    if (err) {
      return next(err);
    }
    user.password = hash;
    next();
  });
});

// Crear Modelo de Usuario
const UserModel = mongoose.model("User", UserSchema);

// Zod Schema para Validación de Usuarios
const UserZodSchema = z.object({
  name: z
    .string({
      required_error: "El nombre no puede ir vacío",
    })
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
    .max(30, { message: "El nombre no puede tener más de 40 caracteres" })
    .refine((value) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(value), {
      message: "El nombre solo puede contener letras",
    })
    .transform((value) => value.trim()),
  username: z
    .string()
    .min(4, {
      message: "El nombre de usuario debe tener al menos 4 caracteres.",
    })
    .max(30, {
      message: "El nombre de usuario no puede tener más de 30 caracteres.",
    })
    .regex(/^(?!.*[_.]{2})[a-zA-Z0-9][a-zA-Z0-9._]{0,29}[a-zA-Z0-9]$/, {
      message:
        "El nombre de usuario solo puede contener letras, números, puntos y guiones bajos comenzar o terminar con ellos.",
    })
    .transform((value) => value.trim()),
  bornDate: z.preprocess(
    (fecha) => {
      if (typeof fecha === "string" || fecha instanceof Date) {
        return new Date(fecha);
      }
      return fecha;
    },
    z.date().refine(
      (date) => {
        const age = moment().diff(date, "years");
        return age >= 18 && age <= 110;
      },
      {
        message: "Debes de ser mayor de 18 años",
      }
    )
  ),
  email: z
    .string({
      required_error: "El correo no puede estar vacío",
    })
    .email({ message: "El correo no tiene un formato válido" })
    .regex(/^[\w\.\-]+@[a-zA-Z\d\-]+\.[a-zA-Z]{2,}$/, {
      message: "El correo no es válido",
    }),
  password: z
    .string({ required_error: "La contraseña no puede estar vacía" })
    .min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+={[}\]|:;"'<>,.?/~`]).{10,}$/,
      {
        message:
          "La contraseña debe contener al menos una letra mayúscula, una letra minúscula, un número y un carácter especial",
      }
    )
    .transform((value) => value.trim()),
  gender: z.enum(["Masculino", "Femenino"]),
  following: z.array(z.string()).optional(),
  followers: z.array(z.string()).optional(),
  messages: z
  .array(
    z.object({
      content: z.string(),
      sender: z.string(),
      receiver: z.string(),
      timestamp: z.date().optional(),
      delivered: z.boolean().optional(),
    })
  )
  .optional(),
  registerDate: z.array(z.date()).optional(),
});

// Validación con Zod
function validateUser(object) {
  return UserZodSchema.safeParse(object);
}

module.exports = {
  UserModel,
  validateUser,
};