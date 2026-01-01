const mongoose = require('mongoose');

const PreUserSchema = new mongoose.Schema({
  username: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // hashed password
  name: { type: String },
  customerType: { type: String, enum: ['B2C', 'B2B'], default: 'B2C' },
  approvalStatus: { type: String, default: 'pending' },
  businessDetails: { type: mongoose.Schema.Types.Mixed },
  emailVerificationToken: { type: String },
  emailVerificationExpires: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PreUser', PreUserSchema);
