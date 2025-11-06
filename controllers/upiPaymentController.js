const UPIPaymentService = require('../services/upiPaymentService');
const Order = require('../models/order');
const logger = require('../utils/logger');

class UPIPaymentController {
    constructor() {
        // Bind methods to the instance
        this.generatePaymentRequest = this.generatePaymentRequest.bind(this);
        this.verifyPayment = this.verifyPayment.bind(this);
    }

    /**
     * Generate UPI payment request
     */
    async generatePaymentRequest(req, res) {
        try {
            const { orderId } = req.params;
            const order = await Order.findById(orderId);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // Check if order belongs to the current user
            if (order.customer.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to access this order'
                });
            }

            if (!order.pricing || typeof order.pricing.total !== 'number' || order.pricing.total <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid order amount'
                });
            }

            const paymentRequest = await UPIPaymentService.createPaymentRequest({
                amount: order.pricing.total,
                orderId: order._id,
                description: `Payment for Order #${order.orderNumber || order._id}`
            });

            if (!paymentRequest.success) {
                throw new Error(paymentRequest.error);
            }

            // Update order with transaction details
            order.paymentDetails = {
                transactionId: paymentRequest.data.transactionId,
                paymentMethod: 'UPI',
                status: 'pending',
                timestamp: new Date()
            };
            await order.save();

            res.status(200).json(paymentRequest);

        } catch (error) {
            logger.error('UPI Payment Generation Error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate payment request',
                error: error.message
            });
        }
    }

    /**
     * Generate QR code for UPI collect request
     */
    async generateCollectQR(req, res) {
        try {
            const { upiId, amount, orderId, transactionId } = req.body;

            if (!upiId || !amount || !orderId || !transactionId) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }

            // Create UPI collect URL
            const upiUrl = `upi://collect?pa=${upiId}&pn=${encodeURIComponent(process.env.MERCHANT_NAME || 'Ambika International')}&am=${amount}&tn=${encodeURIComponent(`Order ${orderId}`)}&tr=${transactionId}`;

            // Generate QR code
            const qrCode = await UPIPaymentService.generateQRCode(upiUrl);

            res.status(200).json({
                success: true,
                data: {
                    qrCode,
                    upiUrl
                }
            });

        } catch (error) {
            logger.error('UPI Collect QR Generation Error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate collect QR code',
                error: error.message
            });
        }
    }

    /**
     * Verify UPI payment status
     * Note: This is a manual verification endpoint since UPI doesn't provide automatic callbacks
     */
    async verifyPayment(req, res) {
        try {
            const { orderId, transactionId, upiTransactionId, upiId } = req.body;

            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // Check if payment is already verified
            if (order.payment && order.payment.status === 'completed') {
                // If payment is already completed, return success with the order details
                return res.status(200).json({
                    success: true,
                    message: 'Payment already verified',
                    order: {
                        id: order._id,
                        orderNumber: order.orderNumber,
                        status: order.status,
                        payment: order.payment,
                        amount: order.pricing.total
                    }
                });
            }

            // Update payment information
            order.payment = {
                ...order.payment,
                method: 'upi',
                status: 'completed',
                transactionId: transactionId,
                upiTransactionId: upiTransactionId || 'AUTO_VERIFIED',
                upiId: upiId,
                paidAt: new Date()
            };

            // Update order status
            order.status = 'confirmed';
            
            // Add status history
            order.statusHistory.push({
                status: 'confirmed',
                note: `Payment verified via UPI (Transaction ID: ${upiTransactionId})`,
                updatedAt: new Date()
            });

            await order.save();

            res.status(200).json({
                success: true,
                message: 'Payment verified successfully',
                order: {
                    id: order._id,
                    orderNumber: order.orderNumber,
                    status: order.status,
                    payment: {
                        status: order.payment.status,
                        method: order.payment.method,
                        transactionId: order.payment.transactionId,
                        upiTransactionId: order.payment.upiTransactionId,
                        paidAt: order.payment.paidAt
                    },
                    amount: order.pricing.total
                }
            });

        } catch (error) {
            logger.error('UPI Payment Verification Error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to verify payment',
                error: error.message
            });
        }
    }
}

module.exports = new UPIPaymentController();