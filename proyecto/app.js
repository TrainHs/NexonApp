const express = require('express');
const app = express();
const path = require('path');
const blogposts = require('./routes/blogposts');
const users = require('./routes/users');
const session = require('express-session');
const PostsController = require('./controllers/blogposts');
const userController = require('./controllers/users');
require('dotenv').config({ path: './sesst.env' });

app.use(
  session({
    secret: process.env.SES,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Asegúrate de configurar secure en true para producción
  })
);

const isAuthenticated = (req, res, next) => {
  if (req.session.isAuthenticated) {
    return next();
  } else {
    return res.status(401).redirect('/');
  }
};

// Configurar EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public/views'));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Deshabilitar x-powered-by
app.disable('x-powered-by');

// Usar rutas
app.use('/posts', blogposts);
app.use('/users', users);

// Rutas principales
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/dashboard', isAuthenticated, PostsController.getPosts, (req, res) => {
  res.render('dashboard');
});

app.get('/configuracion', isAuthenticated, (req, res) => {
  res.render('configuracion');
});

app.get('/forgotten-password', isAuthenticated, (req, res) => {
  res.render('forgotten-password');
});

app.get('/update-email', isAuthenticated, (req, res) => {
  res.render('update-email', { email: req.session.email });
});

app.get('/update-password', isAuthenticated, (req, res) => {
  res.render('update-password');
});

app.get('/post/:postId', PostsController.getPost,  isAuthenticated, (req, res) => {
  res.render('post');
});

app.get('/crear-publicacion', isAuthenticated, (req, res) => {
  res.render('crear-publicacion');
});

app.get('/actualizar-usuario', isAuthenticated, (req, res) => {
  res.render('update-username');
});

app.get('/chats', isAuthenticated, (req, res) => {
  res.render('chats', userController.chats);
});

app.get('/perfil', isAuthenticated, userController.perfil, PostsController.myPosts, (req, res) => {
  // Renderizar la vista usando los datos de res.locals
  res.render('perfil', {
      username: res.locals.username,
      posts: res.locals.posts,
      followers: res.locals.followers,
      following: res.locals.following
  });
});

app.get('/busqueda', isAuthenticated, (req, res) => {
  res.render('busqueda', userController.search);
});

app.get('/actualizar-nombre', isAuthenticated, (req, res) => {
  res.render('update-name', { name: req.session.name });
});

app.get('/guia', isAuthenticated, (req, res) => {
  res.render('guia');
});

module.exports = app;
