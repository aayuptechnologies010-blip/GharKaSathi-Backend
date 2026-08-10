const express = require('express');
const { protect } = require('../middleware/auth');
const {
  listCategories,
  createCategory,
  updateCategory,
  activateCategory,
  deactivateCategory,
  deleteCategory,
  addSubService,
  updateSubService,
  deleteSubService,
} = require('../controllers/categoryController');

const router = express.Router();

router.get('/', listCategories);
router.post('/', protect('admin'), createCategory);
router.put('/:id', protect('admin'), updateCategory);
router.put('/:id/activate', protect('admin'), activateCategory);
router.put('/:id/deactivate', protect('admin'), deactivateCategory);
router.delete('/:id', protect('admin'), deleteCategory);

// Sub-service management (admin)
router.post('/:id/sub-services', protect('admin'), addSubService);
router.put('/:id/sub-services/:subId', protect('admin'), updateSubService);
router.delete('/:id/sub-services/:subId', protect('admin'), deleteSubService);

module.exports = router;
