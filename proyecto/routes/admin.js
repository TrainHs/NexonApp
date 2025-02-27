const express = require('express');
const adminController = require('./../controllers/admin');
const router = express.Router();

router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

router.get('/posts', adminController.getAllPosts);
router.get('/posts/:id', adminController.getPostById);
router.post('/posts', adminController.createPost);
router.put('/posts/:id', adminController.updatePost);
router.delete('/posts/:id', adminController.deletePost);

module.exports = router;