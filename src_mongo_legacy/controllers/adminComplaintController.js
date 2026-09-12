const Complaint = require('../models/Complaint');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/admin/complaints?status=open
const getComplaints = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const complaints = await Complaint.find(filter)
    .populate('user', 'name phone')
    .populate('provider', 'name phone')
    .sort('-createdAt');
  res.json(complaints);
});

// PUT /api/admin/complaints/:id/resolve
const resolveComplaint = asyncHandler(async (req, res) => {
  const { status, adminNote } = req.body;
  const allowed = ['in-progress', 'resolved', 'rejected'];

  if (!allowed.includes(status)) {
    return res.status(400).json({ message: `status must be one of: ${allowed.join(', ')}` });
  }

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    return res.status(404).json({ message: 'Complaint not found' });
  }

  complaint.status = status;
  if (adminNote !== undefined) complaint.adminNote = adminNote;
  if (status === 'resolved' || status === 'rejected') complaint.resolvedAt = new Date();

  await complaint.save();
  res.json(complaint);
});

module.exports = { getComplaints, resolveComplaint };
