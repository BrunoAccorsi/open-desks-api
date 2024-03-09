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
  .patch(authController.protect, workspaceController.updateWorkspace)
  .delete(
    authController.protect,
    authController.restricTo('admin', 'onwer'),
    workspaceController.deleteWorkspace,
  );

module.exports = router;
