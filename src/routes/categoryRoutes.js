const express = require('express');
const { protect } = require('../middleware/auth');
const { listCategories, createCategory, updateCategory } = require('../controllers/categoryController');

const router = express.Router();

router.get('/', listCategories);
router.post('/', protect('admin'), createCategory);
router.put('/:id', protect('admin'), updateCategory);

module.exports = router;
