let express = require('express');
let userController = require('../controllers/users');
let router = express.Router();

// router.get('/users/', userController.home);
router.get('/buscar', userController.search);
router.post('/register', userController.register);
router.post('/recovery-email', userController.sendRecoveryEmail);
router.patch('/password-update', userController.updatePassword);
router.patch('/name-update', userController.updateName);
router.patch('/username-update', userController.updateUsername);
router.post('/login', userController.login);
router.post('/logout', userController.logout);
router.post('/forgotten', userController.forgottenEmail);
router.post('/recover', userController.recoverPassword);
router.post('/follow', userController.follow);
router.get('/updated-email', userController.updatedEmail);
router.get('/verify-login', userController.verifyLogin);
// router.get('/verify-login', userController.verifyLogin);

module.exports = router;
