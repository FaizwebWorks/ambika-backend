const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  stock: {
    type: Number,
    required: true,
  },
  images: [
    {
      type: String, // URL to image
    }
  ],
  sizes: [
    {
      type: String,
      enum: ["Small", "Medium", "Large", "XL", "Custom"], // Add more as needed
    }
  ],
  quality: {
    type: String,
    enum: ["Premium", "Standard", "Economy"], // Add more as needed
  },
  variants: [
    {
      name: { type: String }, // e.g., "Color", "Material"
      value: { type: String }, // e.g., "Red", "Steel"
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;