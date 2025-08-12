const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0
  },
  images: [
    {
      type: String, // URL to image
      required: true
    }
  ],
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true
  },
  sizes: [
    {
      type: String,
      enum: ["Small", "Medium", "Large", "XL", "XXL", "XXXL", "Custom"]
    }
  ],
  quality: {
    type: String,
    enum: ["Premium", "Standard", "Economy"]
  },
  variants: [
    {
      name: { type: String }, // e.g., "Color", "Material"
      value: { type: String }  // e.g., "Red", "Steel"
    }
  ],
  featured: {
    type: Boolean,
    default: false
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  avgRating: {
    type: Number,
    default: 0
  },
  numReviews: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
