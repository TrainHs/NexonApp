let express = require('express');
let PostsController = require('../controllers/blogposts');
let router = express.Router();
const multer = require("multer");
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

router.get('/',  PostsController.getPosts);
router.get('/:id', PostsController.getPost);
router.post('/:postId/like', PostsController.likes);
router.post('/:postId/comment', PostsController.comments);
router.post('/create', upload.array('images', 20), PostsController.createPost);

// router.put('/:id', PostsController.updatePost);

// router.delete('/posts/image/:id', PostsController.deleteImage)
router.delete('/:id', PostsController.deletePost);

module.exports = router;