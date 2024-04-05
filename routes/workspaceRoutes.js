const express = require('express');
const workspaceController = require('../controllers/workspaceController');
const authController = require('../controllers/authController');

const router = express.Router();

router
  .route('/')
  .get(authController.protect, workspaceController.getAllWorkspaces)
  .post(authController.protect, workspaceController.createWorkspace);
router
  .route('/:id')
  .get(authController.protect, workspaceController.getWorkspace)
  .patch(
    authController.protect,
    workspaceController.uploadWorkspaceImage,
    workspaceController.resizeWorkspaceImages,
    workspaceController.updateWorkspace,
  )
  .delete(
    authController.protect,
    authController.restricTo('admin', 'onwer'),
    workspaceController.deleteWorkspace,
  );
router
  .route('/:id/rent')
  .post(authController.protect, workspaceController.rentWorkspace);

module.exports = router;
