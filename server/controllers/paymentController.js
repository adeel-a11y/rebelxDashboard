const Client = require('../models/Client');
const stripeService = require('../services/stripeService');
const { validationResult } = require('express-validator');

/**
 * Create or retrieve Stripe customer for a client
 */
const ensureStripeCustomer = async (client) => {
  // Check if client already has a Stripe customer ID
  if (client.paymentMethod?.stripeCustomerId) {
    return client.paymentMethod.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await stripeService.createCustomer({
    email: client.email,
    name: client.name,
    phone: client.phone,
    clientId: client._id.toString()
  });

  // Update client with Stripe customer ID
  client.paymentMethod = client.paymentMethod || {};
  client.paymentMethod.stripeCustomerId = customer.id;
  await client.save();

  return customer.id;
};

/**
 * Add a payment method to a client
 */
const addPaymentMethod = async (req, res) => {
  try {
    // Check if Stripe is configured
    if (!stripeService.isConfigured()) {
      return res.status(503).json({ 
        message: 'Payment processing is not configured' 
      });
    }

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { clientId, paymentMethodId, isDefault = false } = req.body;

    // Find client
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Ensure client has a Stripe customer
    const stripeCustomerId = await ensureStripeCustomer(client);

    // Attach payment method to customer
    const paymentMethod = await stripeService.attachPaymentMethod(
      paymentMethodId,
      stripeCustomerId
    );

    // Set as default if requested or if it's the first payment method
    const existingMethods = client.paymentMethod?.paymentMethods || [];
    if (isDefault || existingMethods.length === 0) {
      await stripeService.setDefaultPaymentMethod(stripeCustomerId, paymentMethodId);
    }

    // Add payment method to client document
    const newPaymentMethod = {
      id: paymentMethod.id,
      brand: paymentMethod.card.brand,
      last4: paymentMethod.card.last4,
      expMonth: paymentMethod.card.exp_month,
      expYear: paymentMethod.card.exp_year,
      nameOnCard: paymentMethod.billing_details?.name,
      billingZip: paymentMethod.billing_details?.address?.postal_code,
      isDefault: isDefault || existingMethods.length === 0,
      createdAt: new Date()
    };

    // If setting as default, update other methods
    if (newPaymentMethod.isDefault) {
      existingMethods.forEach(method => {
        method.isDefault = false;
      });
    }

    // Initialize payment method structure if needed
    if (!client.paymentMethod) {
      client.paymentMethod = {
        stripeCustomerId,
        paymentMethods: []
      };
    }

    client.paymentMethod.paymentMethods.push(newPaymentMethod);
    await client.save();

    res.json({
      message: 'Payment method added successfully',
      paymentMethod: newPaymentMethod
    });
  } catch (error) {
    console.error('Add payment method error:', error);
    res.status(500).json({ 
      message: 'Error adding payment method', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

/**
 * List payment methods for a client
 */
const listPaymentMethods = async (req, res) => {
  try {
    const { clientId } = req.params;

    // Find client
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Return payment methods from database
    const paymentMethods = client.paymentMethod?.paymentMethods || [];

    res.json({
      paymentMethods,
      stripeCustomerId: client.paymentMethod?.stripeCustomerId
    });
  } catch (error) {
    console.error('List payment methods error:', error);
    res.status(500).json({ 
      message: 'Error listing payment methods', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

/**
 * Set default payment method
 */
const setDefaultPaymentMethod = async (req, res) => {
  try {
    // Check if Stripe is configured
    if (!stripeService.isConfigured()) {
      return res.status(503).json({ 
        message: 'Payment processing is not configured' 
      });
    }

    const { clientId, paymentMethodId } = req.params;

    // Find client
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Check if payment method exists
    const paymentMethod = client.paymentMethod?.paymentMethods?.find(
      pm => pm.id === paymentMethodId
    );
    if (!paymentMethod) {
      return res.status(404).json({ message: 'Payment method not found' });
    }

    // Update Stripe default
    if (client.paymentMethod?.stripeCustomerId) {
      await stripeService.setDefaultPaymentMethod(
        client.paymentMethod.stripeCustomerId,
        paymentMethodId
      );
    }

    // Update local records
    client.paymentMethod.paymentMethods.forEach(pm => {
      pm.isDefault = pm.id === paymentMethodId;
    });
    await client.save();

    res.json({
      message: 'Default payment method updated successfully'
    });
  } catch (error) {
    console.error('Set default payment method error:', error);
    res.status(500).json({ 
      message: 'Error setting default payment method', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

/**
 * Remove a payment method
 */
const removePaymentMethod = async (req, res) => {
  try {
    // Check if Stripe is configured
    if (!stripeService.isConfigured()) {
      return res.status(503).json({ 
        message: 'Payment processing is not configured' 
      });
    }

    const { clientId, paymentMethodId } = req.params;

    // Find client
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Check if payment method exists
    const methodIndex = client.paymentMethod?.paymentMethods?.findIndex(
      pm => pm.id === paymentMethodId
    );
    if (methodIndex === -1) {
      return res.status(404).json({ message: 'Payment method not found' });
    }

    // Detach from Stripe
    await stripeService.detachPaymentMethod(paymentMethodId);

    // Remove from local records
    const wasDefault = client.paymentMethod.paymentMethods[methodIndex].isDefault;
    client.paymentMethod.paymentMethods.splice(methodIndex, 1);

    // If removed method was default and there are other methods, set first as default
    if (wasDefault && client.paymentMethod.paymentMethods.length > 0) {
      client.paymentMethod.paymentMethods[0].isDefault = true;
      
      // Update Stripe default
      if (client.paymentMethod?.stripeCustomerId) {
        await stripeService.setDefaultPaymentMethod(
          client.paymentMethod.stripeCustomerId,
          client.paymentMethod.paymentMethods[0].id
        );
      }
    }

    await client.save();

    res.json({
      message: 'Payment method removed successfully'
    });
  } catch (error) {
    console.error('Remove payment method error:', error);
    res.status(500).json({ 
      message: 'Error removing payment method', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

/**
 * Create a payment intent
 */
const createPaymentIntent = async (req, res) => {
  try {
    // Check if Stripe is configured
    if (!stripeService.isConfigured()) {
      return res.status(503).json({ 
        message: 'Payment processing is not configured' 
      });
    }

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { 
      clientId, 
      amount, 
      currency = 'usd', 
      description,
      paymentMethodId,
      savePaymentMethod = false,
      confirm = false
    } = req.body;

    // Find client
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Get Stripe customer ID
    const stripeCustomerId = await ensureStripeCustomer(client);

    // Determine payment method to use
    let methodId = paymentMethodId;
    if (!methodId) {
      // Use default payment method if not specified
      const defaultMethod = client.paymentMethod?.paymentMethods?.find(pm => pm.isDefault);
      if (defaultMethod) {
        methodId = defaultMethod.id;
      } else {
        return res.status(400).json({ 
          message: 'No payment method specified or available' 
        });
      }
    }

    // Create payment intent
    const paymentIntent = await stripeService.createPaymentIntent({
      amount,
      currency,
      customerId: stripeCustomerId,
      paymentMethodId: methodId,
      description: description || `Payment for ${client.name}`,
      metadata: {
        clientId: client._id.toString(),
        clientName: client.name
      },
      confirm,
      savePaymentMethod
    });

    res.json({
      message: 'Payment intent created successfully',
      paymentIntent: {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      }
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ 
      message: 'Error creating payment intent', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

/**
 * Confirm a payment intent
 */
const confirmPaymentIntent = async (req, res) => {
  try {
    // Check if Stripe is configured
    if (!stripeService.isConfigured()) {
      return res.status(503).json({ 
        message: 'Payment processing is not configured' 
      });
    }

    const { paymentIntentId, paymentMethodId } = req.body;

    const paymentIntent = await stripeService.confirmPaymentIntent(
      paymentIntentId,
      paymentMethodId
    );

    res.json({
      message: 'Payment confirmed successfully',
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      }
    });
  } catch (error) {
    console.error('Confirm payment intent error:', error);
    res.status(500).json({ 
      message: 'Error confirming payment', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

/**
 * Get payment history for a client
 */
const getPaymentHistory = async (req, res) => {
  try {
    // Check if Stripe is configured
    if (!stripeService.isConfigured()) {
      return res.status(503).json({ 
        message: 'Payment processing is not configured' 
      });
    }

    const { clientId } = req.params;
    const { limit = 10 } = req.query;

    // Find client
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Get Stripe customer ID
    const stripeCustomerId = client.paymentMethod?.stripeCustomerId;
    if (!stripeCustomerId) {
      return res.json({ charges: [] });
    }

    // Get charges from Stripe
    const charges = await stripeService.listCharges(stripeCustomerId, parseInt(limit));

    // Format charges for response
    const formattedCharges = charges.map(charge => ({
      id: charge.id,
      amount: charge.amount / 100,
      currency: charge.currency,
      status: charge.status,
      description: charge.description,
      created: new Date(charge.created * 1000),
      paymentMethod: {
        brand: charge.payment_method_details?.card?.brand,
        last4: charge.payment_method_details?.card?.last4
      }
    }));

    res.json({
      charges: formattedCharges
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ 
      message: 'Error retrieving payment history', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

/**
 * Create a setup intent for saving payment methods
 */
const createSetupIntent = async (req, res) => {
  try {
    // Check if Stripe is configured
    if (!stripeService.isConfigured()) {
      return res.status(503).json({ 
        message: 'Payment processing is not configured' 
      });
    }

    const { clientId } = req.body;

    // Find client
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Ensure client has a Stripe customer
    const stripeCustomerId = await ensureStripeCustomer(client);

    // Create setup intent
    const setupIntent = await stripeService.createSetupIntent(stripeCustomerId);

    res.json({
      message: 'Setup intent created successfully',
      setupIntent: {
        id: setupIntent.id,
        clientSecret: setupIntent.client_secret,
        status: setupIntent.status
      }
    });
  } catch (error) {
    console.error('Create setup intent error:', error);
    res.status(500).json({ 
      message: 'Error creating setup intent', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

/**
 * Handle Stripe webhook events
 */
const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('Stripe webhook secret not configured');
      return res.status(500).json({ message: 'Webhook not configured' });
    }

    // Validate webhook signature and construct event
    const event = stripeService.validateWebhookSignature(
      req.body,
      signature,
      webhookSecret
    );

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;
      
      case 'payment_method.attached':
        console.log('Payment method attached:', event.data.object.id);
        break;
      
      case 'payment_method.detached':
        console.log('Payment method detached:', event.data.object.id);
        break;
      
      case 'customer.deleted':
        await handleCustomerDeleted(event.data.object);
        break;
      
      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ 
      message: 'Webhook error', 
      error: error.message 
    });
  }
};

/**
 * Handle successful payment
 */
const handlePaymentSuccess = async (paymentIntent) => {
  try {
    const clientId = paymentIntent.metadata?.clientId;
    if (!clientId) return;

    const client = await Client.findById(clientId);
    if (!client) return;

    // Log payment success (you can extend this to update order status, send emails, etc.)
    console.log(`Payment successful for client ${client.name}: $${paymentIntent.amount / 100}`);
    
    // You could add payment to a payments collection here
    // Or update order status if this is related to an order
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
};

/**
 * Handle failed payment
 */
const handlePaymentFailure = async (paymentIntent) => {
  try {
    const clientId = paymentIntent.metadata?.clientId;
    if (!clientId) return;

    const client = await Client.findById(clientId);
    if (!client) return;

    // Log payment failure
    console.log(`Payment failed for client ${client.name}: ${paymentIntent.last_payment_error?.message}`);
    
    // You could send notification email here
    // Or update order status to payment failed
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
};

/**
 * Handle customer deletion in Stripe
 */
const handleCustomerDeleted = async (customer) => {
  try {
    // Find client by Stripe customer ID
    const client = await Client.findOne({ 'paymentMethod.stripeCustomerId': customer.id });
    if (!client) return;

    // Clear payment methods
    client.paymentMethod = undefined;
    await client.save();

    console.log(`Stripe customer deleted for client ${client.name}`);
  } catch (error) {
    console.error('Error handling customer deletion:', error);
  }
};

// Legacy methods for backward compatibility
const tokenizePaymentMethod = async (req, res) => {
  // Redirect to new addPaymentMethod
  return addPaymentMethod(req, res);
};

const updateClientPaymentMethod = async (req, res) => {
  // Redirect to new addPaymentMethod
  req.body.clientId = req.params.id;
  return addPaymentMethod(req, res);
};

const removeClientPaymentMethod = async (req, res) => {
  // Get first payment method and remove it (legacy behavior)
  const client = await Client.findById(req.params.id);
  if (client && client.paymentMethod?.paymentMethods?.length > 0) {
    req.params.clientId = req.params.id;
    req.params.paymentMethodId = client.paymentMethod.paymentMethods[0].id;
    return removePaymentMethod(req, res);
  }
  res.status(404).json({ message: 'No payment method found' });
};

module.exports = {
  // New methods
  addPaymentMethod,
  listPaymentMethods,
  setDefaultPaymentMethod,
  removePaymentMethod,
  createPaymentIntent,
  confirmPaymentIntent,
  getPaymentHistory,
  createSetupIntent,
  handleWebhook,
  
  // Legacy methods (for backward compatibility)
  tokenizePaymentMethod,
  updateClientPaymentMethod,
  removeClientPaymentMethod
};