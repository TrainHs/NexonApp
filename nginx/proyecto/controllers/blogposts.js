const crypto = require("node:crypto");
const { PostSchema } = require("../models/blogposts");
const moment = require("moment");
moment.locale("es");

let PostsController = {
  //* Mostrar posts
  getPosts: (req, res) => {
    PostSchema.find({})
      .sort({ date: -1 }) // Ordena las publicaciones por el campo `date` de forma descendente
      .then((posts) => {
        // Mapea los datos que necesitas
        let allPosts = posts.map((post) => {
          return {
            _id: post._id,
            username: post.username,
            images: post.images,
            description: post.description,
            likes: post.likes.length,
            comments: post.comments.length,
          };
        });
  
        res.render("dashboard", {
          username: req.session.username,
          posts: allPosts,
        });
      })
      .catch((error) => {
        console.error("Error al obtener publicaciones:", error);
        res.status(500).send("Error interno del servidor");
      });
  },

  // Mostrar un post
  getPost: async (req, res) => {
    try {
      const post = await PostSchema.findById(req.params.postId);

      if (!post) {
        return res
          .status(404)
          .json({ message: "El artículo que ha buscado no existe" });
      }

      // Renderiza la vista con los datos del post
      res.render("post", {
        username: post.username,
        images: post.images,
        description: post.description,
        comments: post.comments,
        postId: post._id,
        likes: post.likes,
      });
    } catch (err) {
      res.status(500).json({ message: "Error al obtener el artículo" });
    }
  },

  myPosts: async (req, res, next) => { 
    try {
        const posts = await PostSchema.find({ username: req.session.username });

        // Mapear los datos relevantes
        res.locals.posts = posts.map((post) => {
            return {
                _id: post.id,
                username: post.username,
                images: post.images, 
                description: post.description,
                likes: post.likes.length,
                comments: post.comments.length, 
                date: post.date 
            };
        });

        // Pasar al siguiente middleware
        next();
    } catch (error) {
        console.error("Error al obtener publicaciones del perfil:", error);
        res.status(500).send("Error interno del servidor");
    }
}
,

  //* Crear posts
  createPost: async (req, res) => {
    const id = crypto.randomUUID();
    const newPost = new PostSchema({
      _id: id,
      username: req.session.username,
      images: req.files.map((file) => ({
        data: file.buffer,
        contentType: file.mimetype,
      })),
      description: req.body.description,
      date: req.body.date,
    });

    // Guardar el nuevo post en la base de datos
    await newPost
      .save()
      .then(() => {
        return res.status(201).redirect("/dashboard");
      })
      .catch((err) => {
        return res.status(500).json({ error: "Error al guardar el post" });
      });
  },

  //*Actualizar posts
  updatePost: async (req, res) => {
    try {
      let PostID = req.params.id;
      let UpdatedData = req.body;

      // Buscar y actualizar el post
      let UpdatedPost = await PostSchema.findOneAndUpdate(
        { _id: PostID },
        UpdatedData,
        { new: true }
      );

      // Verificar si el post fue encontrado y actualizado
      if (!UpdatedPost) {
        return res.status(404).json({ error: "Post no encontrado" });
      }

      // Responder con el post actualizado
      return res.status(200).json({ UpdatedPost });
    } catch (error) {
      // Manejar cualquier error que ocurra durante la actualización
      return res.status(500).json({ error: "Error al actualizar el post" });
    }
  },
  //*Eliminar posts
  deletePost: (req, res) => {
    const { id } = req.params;

    PostSchema.findByIdAndDelete(id)
      .then((deletedPost) => {
        if (!deletedPost) {
          res.status(404).json({ error: "Publicación no encontrada" });
        }
        res.json({ message: "Publicación eliminada correctamente" });
      })
      .catch((err) => {
        res.status(500).json({
          message:
            "Error al intentar borrar la publicación, inténtalo de nuevo",
        });
      });
  },

  likes: async (req, res) => {
    const userID = req.session.userId;
    const postID = req.params.postId;

    try {
      if (!postID) {
        return res.status(404).json({ message: "Publicación no encontrada" });
      }

      const post = await PostSchema.findById(postID);

      if (!post) {
        return res.status(404).json({ message: "Publicación no encontrada" });
      }

      if (post.likes.includes(userID)) {
        post.likes = post.likes.filter((id) => id !== userID);
        await post.save();
        return res
          .status(200)
          .json({ message: "Se ha quitado el me gusta a esta publicación" });
      }

      post.likes.push(userID);
      await post.save();

      res.status(200).json({ message: "Has dado 'me gusta' a la publicación" });
    } catch (error) {
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  },
  comments: async (req, res) => {
    const userID = req.session.userId; 
    const username = req.session.username; 
    const postID = req.params.postId;       
    const commentText = req.body.comment;    

    try {
        const post = await PostSchema.findById(postID); 
        if (!post) {
            return res.status(404).json({ message: "Publicación no encontrada" });
        }

        const newComment = {
            _id: userID,
            username: username,  
            comment: commentText, 
        };

        post.comments.push(newComment);
        await post.save(); 

        // Redirige al usuario de vuelta al post
        ///res.status(200).redirect(`/post/${postID}`);
    } catch (error) {
        return res
            .status(500)
            .json({ message: "No se ha podido comentar la publicación" });
    }
},
};

//* Borrar imagenes

module.exports = PostsController;