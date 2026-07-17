const Category = require('../models/Category');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/categories (public)
const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort('name');
  res.json(categories);
});

// GET /api/admin/categories (admin) — includes inactive ones, needed to manage/reactivate them
const listAllCategoriesAdmin = asyncHandler(async (req, res) => {
  const categories = await Category.find({}).sort('name');
  res.json(categories);
});

// POST /api/categories (admin)
const createCategory = asyncHandler(async (req, res) => {
  const { name, icon, description, commissionPercent } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'name is required' });
  }

  const slug = name.trim().toLowerCase().replace(/\s+/g, '-');
  const category = await Category.create({ name, slug, icon, description, commissionPercent });
  res.status(201).json(category);
});

// PUT /api/categories/:id (admin)
const updateCategory = asyncHandler(async (req, res) => {
  const { name, icon, description, isActive, commissionPercent } = req.body;
  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }

  if (name !== undefined) {
    category.name = name;
    category.slug = name.trim().toLowerCase().replace(/\s+/g, '-');
  }
  if (icon !== undefined) category.icon = icon;
  if (description !== undefined) category.description = description;
  if (isActive !== undefined) category.isActive = isActive;
  if (commissionPercent !== undefined) category.commissionPercent = commissionPercent;

  await category.save();
  res.json(category);
});

module.exports = { listCategories, listAllCategoriesAdmin, createCategory, updateCategory };
