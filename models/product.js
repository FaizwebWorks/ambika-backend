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
  // B2C pricing
  price: {
    type: Number,
    required: true,
    min: 0
  },
  // B2B pricing structure
  b2bPricing: {
    enabled: {
      type: Boolean,
      default: true
    },
    showPriceToGuests: {
      type: Boolean,
      default: false
    },
    priceOnRequest: {
      type: Boolean,
      default: true
    },
    bulkPricing: [
      {
        minQuantity: {
          type: Number,
          required: true
        },
        maxQuantity: Number,
        pricePerUnit: {
          type: Number,
          required: true
        },
        discount: {
          type: Number,
          default: 0
        }
      }
    ]
  },
  stock: {
    type: Number,
    required: true,
    min: 0
  },
  minOrderQuantity: {
    type: Number,
    default: 1
  },
  maxOrderQuantity: Number,
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
  tags: [{
    type: String,
    trim: true
  }],
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
  // Product specifications for B2B
  specifications: {
    material: String,
    dimensions: String,
    weight: String,
    warranty: String,
    certifications: [String],
    features: [String],
    usage: String,
    packaging: String
  },
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
  status: {
    type: String,
    enum: ["active", "inactive", "draft"],
    default: "active"
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
  },
  // Target customer types
  targetCustomers: {
    type: [String],
    enum: ["B2C", "B2B"],
    default: ["B2C", "B2B"]
  }
}, { timestamps: true });

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
