const { stripe, stripeConfig } = require('../config/stripe');

class StripeService {
  
  // Create payment intent for order
  async createPaymentIntent(orderData) {
    try {
      const { total, customerInfo, orderId } = orderData;
      
      // Convert amount to paise (Stripe expects amount in smallest currency unit)
      const amountInPaise = Math.round(total * 100);
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInPaise,
        currency: stripeConfig.currency,
        payment_method_types: stripeConfig.paymentMethodTypes,
        metadata: {
          orderId: orderId,
          customerEmail: customerInfo.email,
          customerName: customerInfo.name,
        },
        description: `Order payment for ${customerInfo.name}`,
        receipt_email: customerInfo.email,
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: amountInPaise,
        currency: stripeConfig.currency,
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  // Confirm payment
  async confirmPayment(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return {
        status: paymentIntent.status,
        paymentMethod: paymentIntent.payment_method,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      };
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw new Error('Failed to confirm payment');
    }
  }

  // Create checkout session (alternative to payment intent)
  async createCheckoutSession(orderData) {
    try {
      const { items, total, customerInfo, orderId } = orderData;
      
      // Create line items for Stripe checkout
      const lineItems = items.map(item => ({
        price_data: {
          currency: stripeConfig.currency,
          product_data: {
            name: item.product.title,
            description: item.product.description,
            images: item.product.images ? [item.product.images[0]] : [],
          },
          unit_amount: Math.round((item.product.discountPrice || item.product.price) * 100),
        },
        quantity: item.quantity,
      }));

      const session = await stripe.checkout.sessions.create({
        payment_method_types: stripeConfig.paymentMethodTypes,
        line_items: lineItems,
        mode: 'payment',
        success_url: `${stripeConfig.successUrl}?session_id={CHECKOUT_SESSION_ID}&orderId=${orderId}`,
        cancel_url: stripeConfig.cancelUrl,
        customer_email: customerInfo.email,
        metadata: {
          orderId: orderId,
          customerName: customerInfo.name,
        },
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  }

  // Get session details
  async getSession(sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      return {
        paymentStatus: session.payment_status,
        customerEmail: session.customer_email,
        amountTotal: session.amount_total,
        currency: session.currency,
        metadata: session.metadata,
      };
    } catch (error) {
      console.error('Error retrieving session:', error);
      throw new Error('Failed to retrieve session');
    }
  }

  // Handle webhook events
  async handleWebhook(body, signature) {
    try {
      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        stripeConfig.webhookSecret
      );

      switch (event.type) {
        case 'payment_intent.succeeded':
          console.log('Payment succeeded:', event.data.object);
          return { type: 'payment_succeeded', data: event.data.object };
          
        case 'payment_intent.payment_failed':
          console.log('Payment failed:', event.data.object);
          return { type: 'payment_failed', data: event.data.object };
          
        case 'checkout.session.completed':
          console.log('Checkout session completed:', event.data.object);
          return { type: 'checkout_completed', data: event.data.object };
          
        default:
          console.log(`Unhandled event type: ${event.type}`);
          return { type: 'unhandled', data: event.data.object };
      }
    } catch (error) {
      console.error('Webhook error:', error);
      throw new Error('Webhook verification failed');
    }
  }

  // Refund payment
  async createRefund(paymentIntentId, amount = null) {
    try {
      const refundData = { payment_intent: paymentIntentId };
      if (amount) {
        refundData.amount = Math.round(amount * 100); // Convert to paise
      }

      const refund = await stripe.refunds.create(refundData);
      
      return {
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status,
        currency: refund.currency,
      };
    } catch (error) {
      console.error('Error creating refund:', error);
      throw new Error('Failed to create refund');
    }
  }
}

module.exports = new StripeService();
