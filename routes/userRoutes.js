const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/signup', authController.signUp);
router.post('/login', authController.login);

// Protect (require login) all routes after this middleware
router.use(authController.protect);

router.post('/logout', authController.logout);

router.patch('/update', userController.updateUser);
router.delete('/delete', userController.deleteUser);

router.get('/my-bookings', userController.getRentedWorkspaces);

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);
router
  .route('/:id')
  .get(userController.getUser)
  .patch(
    userController.uploadUserPhoto,
    userController.resizeUserPhoto,
    userController.updateUser,
  )
  .delete(userController.deleteUser);

module.exports = router;
