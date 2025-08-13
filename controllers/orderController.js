const Order = require("../models/order");
const Product = require("../models/product");
const User = require("../models/user");
const { validationResult } = require("express-validator");

// Create a new order
exports.createOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const {
      items,
      customerInfo,
      shipping,
      payment,
      notes
    } = req.body;

    // Validate items and calculate pricing
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${item.product} not found`
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product ${product.title}`
        });
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        productInfo: {
          title: product.title,
          price: product.price,
          image: product.images[0] || ''
        },
        quantity: item.quantity,
        price: product.price,
        size: item.size,
        variants: item.variants || []
      });

      // Update product stock
      await Product.findByIdAndUpdate(
        product._id,
        { $inc: { stock: -item.quantity } }
      );
    }

    // Calculate total pricing
    const tax = subtotal * 0.18; // 18% GST
    const shippingCost = shipping?.method === 'express' ? 200 : 
                        shipping?.method === 'overnight' ? 500 : 100;
    const total = subtotal + tax + shippingCost;

    // Create order
    const order = await Order.create({
      customer: req.user.id,
      customerInfo: customerInfo || {
        name: req.user.name || req.user.username,
        email: req.user.email,
        phone: req.user.phone || ''
      },
      items: orderItems,
      pricing: {
        subtotal,
        tax,
        shipping: shippingCost,
        total
      },
      payment: payment || { method: 'cod' },
      shipping,
      notes
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email')
      .populate('items.product', 'title images');

    res.status(201).json({
      success: true,
      data: populatedOrder
    });

  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating order"
    });
  }
};

// Get user's orders
exports.getUserOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status
    } = req.query;

    const query = { customer: req.user.id };
    
    if (status && status !== 'all') {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('items.product', 'title images')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          current: Number(page),
          pages: Math.ceil(total / Number(limit)),
          total
        }
      }
    });

  } catch (error) {
    console.error("Get user orders error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching orders"
    });
  }
};

// Get single order
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('items.product', 'title images description');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Check if user owns this order or is admin
    if (order.customer._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching order"
    });
  }
};

// Cancel order (user can cancel only if status is pending or confirmed)
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Check if user owns this order
    if (order.customer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Check if order can be cancelled
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "Order cannot be cancelled at this stage"
      });
    }

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } }
      );
    }

    // Update order status
    order.status = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      updatedAt: new Date(),
      note: 'Cancelled by customer'
    });
    
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      data: order
    });

  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({
      success: false,
      message: "Error cancelling order"
    });
  }
};

// Track order
exports.trackOrder = async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const order = await Order.findOne({ orderNumber })
      .populate('items.product', 'title images')
      .select('orderNumber status shipping statusHistory createdAt');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error("Track order error:", error);
    res.status(500).json({
      success: false,
      message: "Error tracking order"
    });
  }
};

// Get order statistics for user
exports.getUserOrderStats = async (req, res) => {
  try {
    const stats = await Order.aggregate([
      { $match: { customer: req.user._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$pricing.total' },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalOrders: 0,
      totalSpent: 0,
      pendingOrders: 0,
      deliveredOrders: 0
    };

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error("Get user order stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching order statistics"
    });
  }
};

// Update payment status (for payment gateway webhook)
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { orderId, paymentId, status, signature } = req.body;

    // Verify payment signature here (implement based on your payment gateway)
    
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Update payment details
    order.payment.status = status;
    order.payment.transactionId = paymentId;
    
    if (status === 'completed') {
      order.payment.paidAt = new Date();
      order.status = 'confirmed';
      order.statusHistory.push({
        status: 'confirmed',
        updatedAt: new Date(),
        note: 'Payment completed'
      });
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: "Payment status updated successfully"
    });

  } catch (error) {
    console.error("Update payment status error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating payment status"
    });
  }
};

module.exports = exports;
