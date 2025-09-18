const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripeService {
  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn('Stripe Secret Key not configured. Payment features will be disabled.');
      this.stripe = null;
    } else {
      this.stripe = stripe;
    }
  }

  /**
   * Check if Stripe is configured
   */
  isConfigured() {
    return !!this.stripe;
  }

  /**
   * Create a new customer in Stripe
   */
  async createCustomer(customerData) {
    if (!this.isConfigured()) {
      throw new Error('Stripe is not configured');
    }

    try {
      const customer = await this.stripe.customers.create({
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone,
        metadata: {
          clientId: customerData.clientId
        }
      });
      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  /**
   * Retrieve a customer from Stripe
   */
  async getCustomer(customerId) {
    if (!this.isConfigured()) {
      throw new Error('Stripe is not configured');
    }

    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      return customer;
    } catch (error) {
      console.error('Error retrieving Stripe customer:', error);
      throw error;
    }
  }

  /**
   * Create a payment method from token
   */
  async createPaymentMethod(token) {
    if (!this.isConfigured()) {
      throw new Error('Stripe is not configured');
    }

    try {
      // Token should be created on frontend using Stripe Elements
      // This is just for reference - actual implementation uses frontend tokens
      const paymentMethod = await this.stripe.paymentMethods.create({
        type: 'card',
        card: { token }
      });
      return paymentMethod;
    } catch (error) {
      console.error('Error creating payment method:', error);
      throw error;
    }
  }

  /**
   * Attach a payment method to a customer
   */
  async attachPaymentMethod(paymentMethodId, customerId) {
    if (!this.isConfigured()) {
      throw new Error('Stripe is not configured');
    }

    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(
        paymentMethodId,
        { customer: customerId }
      );
      return paymentMethod;
    } catch (error) {
      console.error('Error attaching payment method:', error);
      throw error;
    }
  }

  /**
   * Detach a payment method from a customer
   */
  async detachPaymentMethod(paymentMethodId) {
    if (!this.isConfigured()) {
      throw new Error('Stripe is not configured');
    }

    try {
      const paymentMethod = await this.stripe.paymentMethods.detach(paymentMethodId);
      return paymentMethod;
    } catch (error) {
      console.error('Error detaching payment method:', error);
      throw error;
    }
  }

  /**
   * List all payment methods for a customer
   */
  async listPaymentMethods(customerId, type = 'card') {
    if (!this.isConfigured()) {
      throw new Error('Stripe is not configured');
    }

    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type
      });
      return paymentMethods.data;
    } catch (error) {
      console.error('Error listing payment methods:', error);
      throw error;
    }
  }

  /**
   * Set default payment method for a customer
   */
  async setDefaultPaymentMethod(customerId, paymentMethodId) {
    if (!this.isConfigured()) {
      throw new Error('Stripe is not configured');
    }

    try {
      const customer = await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });
      return customer;
    } catch (error) {
      console.error('Error setting default payment method:', error);
      throw error;
    }
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(paymentData) {
    if (!this.isConfigured()) {
      throw new Error('Stripe is not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(paymentData.amount * 100), // Convert to cents
        currency: paymentData.currency || 'usd',
        customer: paymentData.customerId,
        payment_method: paymentData.paymentMethodId,
        description: paymentData.description,
        metadata: paymentData.metadata || {},
        confirm: paymentData.confirm || false,
        setup_future_usage: paymentData.savePaymentMethod ? 'off_session' : null,
        automatic_payment_methods: {
          enabled: false // We're using manual payment methods
        }
      });
      return paymentIntent;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  /**
   * Confirm a payment intent
   */
  async confirmPaymentIntent(paymentIntentId, paymentMethodId) {
    if (!this.isConfigured()) {
      throw new Error('Stripe is not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(
        paymentIntentId,
        { payment_method: paymentMethodId }
      );
      return paymentIntent;
    } catch (error) {
      console.error('Error confirming payment intent:', error);
      throw error;
    }
  }

  /**
   * Cancel a payment intent
   */
  async cancelPaymentIntent(paymentIntentId) {
    if (!this.isConfigured()) {
      throw new Error('Stripe is not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      console.error('Error canceling payment intent:', error);
      throw error;
    }
  }

  /**
   * Retrieve a payment intent
   */
  async getPaymentIntent(paymentIntentId) {
    if (!this.isConfigured()) {
      throw new Error('Stripe is not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      console.error('Error retrieving payment intent:', error);
      throw error;
    }
  }

  /**
   * Create a setup intent for saving payment methods
   */
  async createSetupIntent(customerId) {
    if (!this.isConfigured()) {
      throw new Error('Stripe is not configured');
    }

    try {
      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        automatic_payment_methods: {
          enabled: false
        }
      });
      return setupIntent;
    } catch (error) {
      console.error('Error creating setup intent:', error);
      throw error;
    }
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(payload, signature, secret) {
    if (!this.isConfigured()) {
      throw new Error('Stripe is not configured');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        secret
      );
      return event;
    } catch (error) {
      console.error('Webhook signature validation failed:', error);
      throw error;
    }
  }

  /**
   * Create a payment method from card details (for testing only)
   * In production, always use Stripe Elements on frontend
   */
  async createTestPaymentMethod(cardDetails) {
    if (!this.isConfigured()) {
      throw new Error('Stripe is not configured');
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot create payment methods from card details in production');
    }

    try {
      const paymentMethod = await this.stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: cardDetails.number,
          exp_month: cardDetails.expMonth,
          exp_year: cardDetails.expYear,
          cvc: cardDetails.cvc
        },
        billing_details: {
          name: cardDetails.nameOnCard,
          address: {
            postal_code: cardDetails.billingZip
          }
        }
      });
      return paymentMethod;
    } catch (error) {
      console.error('Error creating test payment method:', error);
      throw error;
    }
  }

  /**
   * List recent charges for a customer
   */
  async listCharges(customerId, limit = 10) {
    if (!this.isConfigured()) {
      throw new Error('Stripe is not configured');
    }

    try {
      const charges = await this.stripe.charges.list({
        customer: customerId,
        limit
      });
      return charges.data;
    } catch (error) {
      console.error('Error listing charges:', error);
      throw error;
    }
  }

  /**
   * Create a refund for a payment intent
   */
  async createRefund(paymentIntentId, amount = null) {
    if (!this.isConfigured()) {
      throw new Error('Stripe is not configured');
    }

    try {
      const refundData = {
        payment_intent: paymentIntentId
      };
      
      if (amount !== null) {
        refundData.amount = Math.round(amount * 100); // Convert to cents
      }

      const refund = await this.stripe.refunds.create(refundData);
      return refund;
    } catch (error) {
      console.error('Error creating refund:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new StripeService();