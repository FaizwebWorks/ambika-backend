const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    required: false,
  },
  image: {
    type: String, // URL to category image
  },
  isActive: {
    type: Boolean,
    default: true,
  }
}, { timestamps: true });

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;