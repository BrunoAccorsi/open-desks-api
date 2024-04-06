const express = require('express');
const propertyController = require('../controllers/propertyController');
const authController = require('../controllers/authController');

const router = express.Router();

router
  .route('/')
  .get(propertyController.getAllProperties)
  .post(propertyController.createProperty);
router
  .route('/:id')
  .get(propertyController.getProperty)
  .patch(propertyController.updateProperty)
  .delete(
    authController.protect,
    authController.restricTo('admin', 'onwer'),
    propertyController.deleteProperty,
  );

module.exports = router;
