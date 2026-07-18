const Category = require('../models/Category');
const ServiceProvider = require('../models/ServiceProvider');
const Booking = require('../models/Booking');
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

// PUT /api/categories/:id/activate (admin)
const activateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }
  res.json(category);
});

// PUT /api/categories/:id/deactivate (admin)
const deactivateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }
  res.json(category);
});

// DELETE /api/categories/:id (admin)
// Hard-deletes only if nothing references this category — providers offering it, or past bookings
// under it — since deleting a category still in use would orphan those records and break booking
// history / analytics. In that case, deactivate instead (hides it from public listing/search).
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }

  const [providerCount, bookingCount] = await Promise.all([
    ServiceProvider.countDocuments({ categories: category._id }),
    Booking.countDocuments({ category: category._id }),
  ]);

  if (providerCount > 0 || bookingCount > 0) {
    return res.status(409).json({
      message: `Cannot delete: ${providerCount} provider(s) and ${bookingCount} booking(s) reference this category. Deactivate it instead.`,
    });
  }

  await category.deleteOne();
  res.json({ message: 'Category deleted' });
});

module.exports = {
  listCategories,
  listAllCategoriesAdmin,
  createCategory,
  updateCategory,
  activateCategory,
  deactivateCategory,
  deleteCategory,
};
