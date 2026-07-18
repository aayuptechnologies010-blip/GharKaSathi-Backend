const express = require('express');
const { protect } = require('../middleware/auth');
const {
  listCategories,
  createCategory,
  updateCategory,
  activateCategory,
  deactivateCategory,
  deleteCategory,
} = require('../controllers/categoryController');

const router = express.Router();

router.get('/', listCategories);
router.post('/', protect('admin'), createCategory);
router.put('/:id', protect('admin'), updateCategory);
router.put('/:id/activate', protect('admin'), activateCategory);
router.put('/:id/deactivate', protect('admin'), deactivateCategory);
router.delete('/:id', protect('admin'), deleteCategory);

module.exports = router;
