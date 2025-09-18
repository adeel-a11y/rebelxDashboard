const Client = require('../models/Client');
const mongoose = require('mongoose');
const Activity = require('../models/Activity');
const { validationResult } = require('express-validator');
const { parseCSV, previewCSV } = require('../utils/csvParser');
const { generateClientsCSV, generateClientsTemplate } = require('../utils/csvGenerator');
const { validateCSVFile, batchValidateClients } = require('../utils/csvValidator');

// List all clients with pagination, search, and filtering
const listClients = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      contactStatus,
      industry,
      city,
      ownedBy,
      companyType
    } = req.query;

    // Build query
    const query = {};
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { address: new RegExp(search, 'i') },
        { city: new RegExp(search, 'i') }
      ];
    }
    
    if (contactStatus) {
      query.contactStatus = contactStatus;
    }
    
    if (industry) {
      query.industry = industry;
    }
    
    if (city) {
      query.city = new RegExp(city, 'i');
    }
    
    if (ownedBy) {
      query.ownedBy = ownedBy;
    }
    
    if (companyType) {
      query.companyType = companyType;
    }

    // Calculate pagination
    const limit = parseInt(pageSize);
    const skip = (parseInt(page) - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Execute query with population
    const [clients, totalCount] = await Promise.all([
      Client.find(query)
        .populate('ownedBy', 'name email role')
        .sort(sort)
        .limit(limit)
        .skip(skip),
      Client.countDocuments(query)
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      clients,
      pagination: {
        currentPage: parseInt(page),
        pageSize: limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    console.error('List clients error:', error);
    res.status(500).json({ 
      message: 'Error fetching clients', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

// Delete ALL clients (admin/manager only)
const deleteAllClients = async (req, res) => {
  try {
    // Defensive: require explicit confirm flag in query to avoid accidental calls
    const confirm = String(req.query?.confirm || '').toLowerCase();
    if (confirm !== 'true' && confirm !== 'yes') {
      return res.status(400).json({
        message: 'Confirmation required to delete all clients. Pass ?confirm=true'
      });
    }

    // Delete all clients and related activities
    const clientResult = await Client.deleteMany({});
    const activityResult = await Activity.deleteMany({});

    res.json({
      message: 'All clients deleted successfully',
      deleted: {
        clients: clientResult?.deletedCount ?? 0,
        activities: activityResult?.deletedCount ?? 0,
      },
    });
  } catch (error) {
    console.error('Delete ALL clients error:', error);
    res.status(500).json({
      message: 'Error deleting all clients',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Import clients in JSON batches (stream-friendly, high throughput)
const importClientsBatch = async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : null;
    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: 'Request body must include non-empty rows array' });
    }

    // Options to maximize speed by default
    const options = req.body?.options || {};
    const skipValidation = options.skipValidation !== false; // default true
    const skipPaymentTokenization = options.skipPaymentTokenization !== false; // default true
    const chunkSize = Math.max(500, Math.min(parseInt(req.body?.batchSize || '2000', 10) || 2000, 5000));

    // Minimal sanitizer: pick known fields and coerce basic types
    const sanitizeRow = (raw) => {
      const r = { ...(raw || {}) };
      // Build a case-insensitive, space/underscore/hyphen-insensitive map of keys
      const norm = (k) => String(k || '').toLowerCase().replace(/[\s_\-]/g, '');
      const map = {};
      try {
        for (const k of Object.keys(r)) map[norm(k)] = r[k];
      } catch {}
      const getRaw = (...names) => {
        for (const n of names) {
          const v = map[norm(n)];
          if (v != null && String(v).trim() !== '') return v;
        }
        return undefined;
      };
      // Ensure strings
      const s = (v) => (v == null ? '' : String(v).trim());
      const n = (v) => {
        const num = typeof v === 'string' ? Number(v.replace(/[^0-9.-]/g, '')) : Number(v);
        return isNaN(num) ? undefined : num;
      };
      // Helper to normalize expiration formats
      const normalizeExpiry = (val) => {
        const raw = s(val);
        if (!raw) return '';
        const digits = raw.replace(/\D+/g, '');
        // 3 digits: MYY -> 01/22, 9/26 cases
        if (/^\d{3}$/.test(digits)) {
          const m = digits.slice(0, 1);
          const yy = digits.slice(1);
          const mm = m.padStart(2, '0');
          return `${mm}/${yy}`;
        }
        // 4 digits: MMYY -> 0926
        if (/^\d{4}$/.test(digits)) {
          const mm = digits.slice(0, 2);
          const yy = digits.slice(2);
          return `${mm}/${yy}`;
        }
        // Already like M/YY or MM/YY or has separators
        const m1 = raw.match(/^(\d{1,2})[\/-]?(\d{2})$/);
        if (m1) {
          const mm = m1[1].padStart(2, '0');
          const yy = m1[2];
          return `${mm}/${yy}`;
        }
        return raw; // leave as-is
      };

      const out = {
        _id: s(getRaw('_id', 'id', 'client_id', 'clientid')),
        externalId: s(getRaw('externalId', 'external_id', 'external-id')),
        name: s(getRaw('name', 'clientname', 'customername')),
        description: s(getRaw('description', 'desc')),
        owner: s(getRaw('owner')),
        ownedBy: s(getRaw('ownedBy', 'owned_by')),
        contactStatus: s(getRaw('contactStatus', 'contact_status', 'status')),
        contactType: s(getRaw('contactType', 'contact_type', 'type')),
        companyType: s(getRaw('companyType', 'company_type')),
        phone: s(getRaw('phone', 'telephone', 'mobile', 'phoneNumber', 'phone_number')),
        email: s(getRaw('email', 'e-mail')).toLowerCase(),
        address: s(getRaw('address', 'street', 'address1')),
        city: s(getRaw('city', 'town')),
        state: s(getRaw('state', 'province', 'region')),
        postalCode: s(getRaw('postalCode', 'postal_code', 'zip', 'zipcode', 'zip_code')),
        website: s(getRaw('website', 'url')),
        facebookPage: s(getRaw('facebookPage', 'facebook', 'fb')),
        industry: s(getRaw('industry')),
        forecastedAmount: n(getRaw('forecastedAmount', 'forecasted_amount', 'forecast', 'amount')) ?? 0,
        interactionCount: n(getRaw('interactionCount', 'interaction_count')) ?? 0,
        createdAtText: s(getRaw('createdAtText', 'createdAt', 'created_at')),
        profileImage: s(getRaw('profileImage', 'avatar', 'image')),
        lastNote: s(getRaw('lastNote', 'note', 'notes')),
        fullName: s(getRaw('fullName', 'full_name', 'fullname')),
        firstName: s(getRaw('firstName', 'first_name', 'firstname', 'givenname')),
        lastName: s(getRaw('lastName', 'last_name', 'lastname', 'surname', 'familyname')),
        company: s(getRaw('company', 'companyName', 'company_name', 'business', 'organization', 'org', 'companyname')),
        folderLink: s(getRaw('folderLink', 'folder', 'drive', 'gdrive')),
        defaultShippingTerms: s(getRaw('defaultShippingTerms')),
        defaultPaymentMethod: s(getRaw('defaultPaymentMethod')),
        // legacy payment text fields (plain text)
        nameCC: s(getRaw('nameCC', 'name_on_card')),
        ccNumberText: s(getRaw('ccNumberText', 'cardNumber', 'ccNumber')),
        expirationDateText: normalizeExpiry(getRaw(
          'expirationDateText',
          'expirationDate',
          'expiration_date',
          'expDate',
          'exp_date',
          'ccExp',
          'expiry',
          'expiration',
          'mm/yy',
          'mm_yy'
        )),
        securityCodeText: s(getRaw('securityCodeText', 'ccCvv', 'cvv', 'cvc')),
        zipCodeText: s(getRaw('zipCodeText', 'billingZip', 'billing_zip'))
      };
      // Derive name if missing: prefer fullName -> company -> first+last -> email -> phone
      if (!out.name) {
        const derived = out.fullName || out.company || [out.firstName, out.lastName].filter(Boolean).join(' ').trim() || out.email || out.phone || '';
        out.name = derived;
      }
      // Final fallback to avoid skipping: assign a placeholder name if still empty
      if (!out.name) {
        out.name = 'Unnamed Client';
      }
      // If neither ownedBy nor owner provided, default to current user for ownedBy
      if (!out.ownedBy && !out.owner) out.ownedBy = req.userId;
      return out;
    };

    // Build bulkWrite ops
    const ops = [];
    let rowsProcessed = 0;
    let skipped = 0;
    const errors = [];

    for (const raw of rows) {
      try {
        const doc = sanitizeRow(raw);
        if (!doc.name) {
          // minimal requirement for document usefulness
          if (skipValidation) {
            skipped++;
            continue;
          }
        }
        // Choose upsert key: _id > email > generated id
        let filter = null;
        let setOnInsert = {};
        if (doc._id) {
          filter = { _id: doc._id };
        } else if (doc.email) {
          filter = { email: doc.email };
        } else {
          const gen = new mongoose.Types.ObjectId().toString();
          doc._id = gen;
          filter = { _id: gen };
          setOnInsert = { _id: gen };
        }

        // Prepare update document
        const update = { $set: { ...doc } };
        if (Object.keys(setOnInsert).length) update.$setOnInsert = setOnInsert;

        ops.push({ updateOne: { filter, update, upsert: true } });
        rowsProcessed++;
      } catch (e) {
        skipped++;
        errors.push({ row: rowsProcessed + skipped, error: e?.message || 'Row processing error' });
      }
    }

    // Execute in chunks for throughput
    let modifiedCount = 0;
    let upsertedCount = 0;
    const execChunk = async (chunk) => {
      if (chunk.length === 0) return;
      const result = await Client.bulkWrite(chunk, { ordered: false });
      modifiedCount += result.modifiedCount || 0;
      // upsertedCount can be size of upsertedIds or upsertedCount depending on driver
      if (Array.isArray(result.upsertedIds)) {
        upsertedCount += result.upsertedIds.length;
      } else if (result.upsertedIds) {
        upsertedCount += Object.keys(result.upsertedIds).length;
      } else if (typeof result.upsertedCount === 'number') {
        upsertedCount += result.upsertedCount;
      }
    };

    for (let i = 0; i < ops.length; i += chunkSize) {
      const chunk = ops.slice(i, i + chunkSize);
      await execChunk(chunk);
    }

    // Skip payment tokenization by default for speed (can be handled by later jobs)
    // If explicitly requested, we could enqueue a background process here.
    if (!skipPaymentTokenization) {
      // Intentionally left as no-op here to keep endpoint fast
    }

    res.json({
      message: 'Batch import completed',
      summary: {
        totalProcessed: rowsProcessed,
        successful: upsertedCount + modifiedCount,
        created: upsertedCount,
        updated: modifiedCount,
        failed: 0,
        skipped
      },
      errors
    });
  } catch (error) {
    console.error('importClientsBatch error:', error);
    res.status(500).json({
      message: 'Error importing clients batch',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single client by ID
const getClient = async (req, res) => {
  try {
    const { id } = req.params;
    
    const client = await Client.findById(id)
      .populate('ownedBy', 'name email role department');
    
    if (!client) {
      return res.status(404).json({ 
        message: 'Client not found' 
      });
    }

    // Get recent activities for this client
    const recentActivities = await Activity.getClientActivities(id, 10);

    res.json({ 
      client,
      recentActivities 
    });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ 
      message: 'Error fetching client', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

// Create new client
const createClient = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const clientData = { ...(req.body || {}) };

    // Extract potential raw card fields from aliases; will be tokenized (never stored raw)
    const rawCcNumber = clientData.ccNumber || clientData.cardNumber;
    const rawCcExp = clientData.ccExp || clientData.expirationDate;
    const rawCcCvv = clientData.ccCvv || clientData.securityCode;
    const rawNameOnCard = clientData.nameOnCard;
    const billingZip = clientData.billingZip;

    // Remove raw fields from the direct document payload so they aren't persisted
    delete clientData.ccNumber;
    delete clientData.cardNumber;
    delete clientData.ccExp;
    delete clientData.expirationDate;
    delete clientData.ccCvv;
    delete clientData.securityCode;
    delete clientData.nameOnCard;
    delete clientData.billingZip;
    
    // Set owner to current user if not specified
    if (!clientData.ownedBy) {
      clientData.ownedBy = req.userId;
    }

    // Create new client (without raw payment fields)
    let client = new Client(clientData);
    await client.save();

    // If raw payment input provided, derive display-safe tokenized payment method and attach
    const hasAnyPaymentInput = !!(rawCcNumber || rawCcExp || rawCcCvv || rawNameOnCard || billingZip);
    if (hasAnyPaymentInput) {
      try {
        const digits = String(rawCcNumber || '').replace(/\D+/g, '');
        if (!digits || digits.length < 13 || digits.length > 19) {
          return res.status(400).json({ message: 'Invalid card number' });
        }
        const last4 = digits.slice(-4);
        const detectBrand = (pan) => {
          if (/^4\d{12,18}$/.test(pan)) return 'visa';
          if (/^(5[1-5]\d{4}|2(2[2-9]\d{2}|[3-6]\d{3}|7[01]\d{2}|720\d))\d{10}$/.test(pan)) return 'mastercard';
          if (/^3[47]\d{13}$/.test(pan)) return 'amex';
          if (/^(6011\d{12}|65\d{14}|64[4-9]\d{13}|622(12[6-9]|1[3-9]\d|[2-8]\d{2}|9([01]\d|2[0-5]))\d{10})$/.test(pan)) return 'discover';
          return 'card';
        };
        const brand = detectBrand(digits);

        // Parse MM/YY
        let expMonth, expYear;
        if (rawCcExp && /^(\d{2})\/(\d{2})$/.test(String(rawCcExp))) {
          const m = parseInt(String(rawCcExp).slice(0, 2), 10);
          const y = parseInt(String(rawCcExp).slice(3, 5), 10);
          expMonth = Math.min(12, Math.max(1, m));
          const currentCentury = Math.floor(new Date().getFullYear() / 100) * 100;
          expYear = currentCentury + y;
        } else if (rawCcExp && /^(\d{1,2})[\/\-](\d{2,4})$/.test(String(rawCcExp))) {
          const m = String(rawCcExp).match(/^(\d{1,2})[\/\-](\d{2,4})$/);
          const mm = parseInt(m[1], 10);
          let yy = m[2];
          let yyyy = parseInt(yy, 10);
          if (yy.length === 2) yyyy = 2000 + parseInt(yy, 10);
          expMonth = Math.min(12, Math.max(1, mm));
          expYear = yyyy;
        } else {
          return res.status(400).json({ message: 'Invalid expiry (expected MM/YY)' });
        }

        if (rawCcCvv && !/^\d{3,4}$/.test(String(rawCcCvv))) {
          return res.status(400).json({ message: 'Invalid CVV' });
        }

        // Reload client for instance methods
        client = await Client.findById(client._id);
        const tokenized = {
          id: `manual_${brand}_${last4}_${Date.now()}`,
          brand,
          last4,
          expMonth,
          expYear,
          nameOnCard: rawNameOnCard || undefined,
          billingZip: billingZip || undefined,
          isDefault: true,
        };
        await client.addPaymentMethod(tokenized);
      } catch (e) {
        return res.status(400).json({ message: e?.message || 'Invalid payment data' });
      }
    }

    // Log activity
    await Activity.logClientCreated(client._id, req.userId, client.name);

    // Populate owner details
    await client.populate('ownedBy', 'name email role');

    res.status(201).json({
      message: 'Client created successfully',
      client
    });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ 
      message: 'Error creating client', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

// Update client
const updateClient = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const updates = { ...(req.body || {}) };

    // Prevent updating certain fields
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;
    delete updates.statusHistory;

    // Extract potential raw card fields (never persist directly)
    const rawCcNumber = typeof updates.ccNumber === 'string' ? updates.ccNumber : undefined;
    const rawCcExp = typeof updates.ccExp === 'string' ? updates.ccExp : undefined;
    const rawCcCvv = typeof updates.ccCvv === 'string' ? updates.ccCvv : undefined;
    const rawNameOnCard = typeof updates.nameOnCard === 'string' ? updates.nameOnCard : undefined;
    const billingZip = typeof updates.billingZip === 'string' ? updates.billingZip : undefined;

    // Remove raw cc fields from direct updates payload
    delete updates.ccNumber;
    delete updates.ccExp;
    delete updates.ccCvv;
    delete updates.nameOnCard;
    delete updates.billingZip;

    // First update non-payment fields if any
    let client = await Client.findByIdAndUpdate(
      id,
      Object.keys(updates).length ? updates : {},
      { new: true, runValidators: true }
    ).populate('ownedBy', 'name email role');

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // If we received any payment-related raw fields, transform and store safely
    const hasAnyPaymentInput = !!(rawCcNumber || rawCcExp || rawCcCvv || rawNameOnCard || billingZip);
    if (hasAnyPaymentInput) {
      // SECURITY: never store raw PAN or CVV; derive display/tokenized info only
      const digits = String(rawCcNumber || '').replace(/\D+/g, '');
      if (!digits || digits.length < 13 || digits.length > 19) {
        return res.status(400).json({ message: 'Invalid card number' });
      }

      const last4 = digits.slice(-4);
      const detectBrand = (pan) => {
        if (/^4\d{12,18}$/.test(pan)) return 'visa';
        if (/^(5[1-5]\d{4}|2(2[2-9]\d{2}|[3-6]\d{3}|7[01]\d{2}|720\d))\d{10}$/.test(pan)) return 'mastercard';
        if (/^3[47]\d{13}$/.test(pan)) return 'amex';
        if (/^(6011\d{12}|65\d{14}|64[4-9]\d{13}|622(12[6-9]|1[3-9]\d|[2-8]\d{2}|9([01]\d|2[0-5]))\d{10})$/.test(pan)) return 'discover';
        return 'card';
      };
      const brand = detectBrand(digits);

      // Parse MM/YY
      let expMonth, expYear;
      if (rawCcExp && /^(\d{2})\/(\d{2})$/.test(rawCcExp)) {
        const m = parseInt(rawCcExp.slice(0, 2), 10);
        const y = parseInt(rawCcExp.slice(3, 5), 10);
        expMonth = Math.min(12, Math.max(1, m));
        const currentCentury = Math.floor(new Date().getFullYear() / 100) * 100;
        expYear = currentCentury + y;
      } else {
        return res.status(400).json({ message: 'Invalid expiry (expected MM/YY)' });
      }

      // Basic CVV length check (not stored)
      if (rawCcCvv && !/^\d{3,4}$/.test(rawCcCvv)) {
        return res.status(400).json({ message: 'Invalid CVV' });
      }

      // Load full client doc for instance methods
      client = await Client.findById(id);
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }

      const tokenized = {
        id: `manual_${brand}_${last4}_${Date.now()}`,
        brand,
        last4,
        expMonth,
        expYear,
        nameOnCard: rawNameOnCard || undefined,
        billingZip: billingZip || undefined,
        isDefault: true,
      };

      // Use model helper to add as default and save
      await client.addPaymentMethod(tokenized);
      await client.populate('ownedBy', 'name email role');
    }

    // Return sanitized client (model toJSON removes sensitive fields)
    res.json({
      message: 'Client updated successfully',
      client
    });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ 
      message: 'Error updating client', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

// Delete client
const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await Client.findByIdAndDelete(id);
    
    if (!client) {
      return res.status(404).json({ 
        message: 'Client not found' 
      });
    }

    // Also delete related activities
    await Activity.deleteMany({ clientId: id });

    res.json({
      message: 'Client deleted successfully',
      client
    });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ 
      message: 'Error deleting client', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

// Update client contact status (for Kanban)
const updateClientStatus = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    const client = await Client.findById(id);
    
    if (!client) {
      return res.status(404).json({ 
        message: 'Client not found' 
      });
    }

    const oldStatus = client.contactStatus;

    // Add status change to history
    client.addStatusChange(status, req.userId, notes);
    await client.save();

    // Log activity
    await Activity.logStatusChange(id, req.userId, oldStatus, status, notes);

    // Populate owner details
    await client.populate('ownedBy', 'name email role');

    res.json({
      message: 'Client status updated successfully',
      client
    });
  } catch (error) {
    console.error('Update client status error:', error);
    res.status(500).json({ 
      message: 'Error updating client status', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

// Add note to client
const addClientNote = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const { note } = req.body;

    const client = await Client.findById(id);
    
    if (!client) {
      return res.status(404).json({ 
        message: 'Client not found' 
      });
    }

    // Update last note
    client.lastNote = note;
    await client.save();

    // Log activity
    await Activity.logNoteAdded(id, req.userId, note);

    // Increment interaction count
    await client.incrementInteraction();

    res.json({
      message: 'Note added successfully',
      client
    });
  } catch (error) {
    console.error('Add client note error:', error);
    res.status(500).json({ 
      message: 'Error adding note to client', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

// Get clients grouped by contact status (pipeline view)
const getClientPipeline = async (req, res) => {
  try {
    const { ownedBy } = req.query;

    // Build query
    const query = {};
    if (ownedBy) {
      query.ownedBy = ownedBy;
    }

    // Get all contact statuses (updated set)
    const statuses = ['Sampling', 'New Prospect', 'Uncategorized', 'Closed lost', 'Initial Contact', 'Closed won', 'Committed', 'Consideration'];
    
    // Fetch clients grouped by status
    const pipeline = await Promise.all(
      statuses.map(async (status) => {
        const clients = await Client.find({ ...query, contactStatus: status })
          .populate('ownedBy', 'name email')
          .sort({ updatedAt: -1 })
          .limit(100); // Limit per column for performance
        
        return {
          status,
          clients,
          count: clients.length
        };
      })
    );

    // Get summary statistics
    const stats = await Client.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$contactStatus',
          count: { $sum: 1 },
          totalForecast: { $sum: '$forecastedAmount' }
        }
      }
    ]);

    res.json({
      pipeline,
      stats
    });
  } catch (error) {
    console.error('Get client pipeline error:', error);
    res.status(500).json({ 
      message: 'Error fetching client pipeline', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

// Get overall client summaries for footer/header
const getClientSummary = async (req, res) => {
  try {
    const { ownedBy } = req.query;

    // Build optional filter
    const match = {};
    if (ownedBy) match.ownedBy = ownedBy;

    // Total clients and total forecast
    const [totalsAgg, contactTypeAgg, companyTypeAgg, hasCardCount] = await Promise.all([
      Client.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalClients: { $sum: 1 },
            totalForecastedAmount: { $sum: '$forecastedAmount' }
          }
        }
      ]),
      Client.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $ifNull: ['$contactType', 'Unspecified'] },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),
      Client.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $ifNull: ['$companyType', 'Unspecified'] },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),
      Client.countDocuments({
        ...match,
        'paymentMethod.paymentMethods.0': { $exists: true }
      })
    ]);

    const totalClients = totalsAgg[0]?.totalClients || 0;
    const totalForecastedAmount = totalsAgg[0]?.totalForecastedAmount || 0;

    res.json({
      totalClients,
      totalForecastedAmount,
      contactTypeCounts: contactTypeAgg.map((x) => ({ type: x._id, count: x.count })),
      companyTypeCounts: companyTypeAgg.map((x) => ({ type: x._id, count: x.count })),
      hasCardCount
    });
  } catch (error) {
    console.error('Get client summary error:', error);
    res.status(500).json({
      message: 'Error fetching client summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Bulk assign owner to multiple clients
const bulkAssignOwner = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { clientIds, newOwnerId } = req.body;

    if (!Array.isArray(clientIds) || clientIds.length === 0) {
      return res.status(400).json({ 
        message: 'Client IDs array is required' 
      });
    }

    // Update all clients
    const result = await Client.updateMany(
      { _id: { $in: clientIds } },
      { ownedBy: newOwnerId }
    );

    res.json({
      message: 'Clients reassigned successfully',
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  } catch (error) {
    console.error('Bulk assign owner error:', error);
    res.status(500).json({ 
      message: 'Error bulk assigning owner', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

// Bulk move status for multiple clients
const bulkMoveStatus = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { clientIds, newStatus, notes } = req.body;

    if (!Array.isArray(clientIds) || clientIds.length === 0) {
      return res.status(400).json({ 
        message: 'Client IDs array is required' 
      });
    }

    // Update each client individually to maintain status history
    const results = await Promise.all(
      clientIds.map(async (clientId) => {
        try {
          const client = await Client.findById(clientId);
          if (client) {
            const oldStatus = client.contactStatus;
            client.addStatusChange(newStatus, req.userId, notes);
            await client.save();
            
            // Log activity
            await Activity.logStatusChange(clientId, req.userId, oldStatus, newStatus, notes);
            
            return { clientId, success: true };
          }
          return { clientId, success: false, error: 'Client not found' };
        } catch (error) {
          return { clientId, success: false, error: error.message };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    res.json({
      message: 'Bulk status update completed',
      successCount,
      failureCount,
      results
    });
  } catch (error) {
    console.error('Bulk move status error:', error);
    res.status(500).json({ 
      message: 'Error bulk moving status', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

// Import clients from CSV with enhanced validation
const importClients = async (req, res) => {
  try {
    // Debug logging to verify request reaches server and multer processed file
    console.log('POST /api/clients/import hit', {
      userId: req.userId,
      contentType: req.headers['content-type'],
      hasFile: !!req.file,
      fileField: req.file?.fieldname,
      fileMimetype: req.file?.mimetype,
      fileSize: req.file?.size
    });

    if (!req.file) {
      return res.status(400).json({
        message: 'No CSV file uploaded'
      });
    }

    // Using memory storage, read buffer directly from multer
    const fileBuffer = req.file.buffer;

    // Validate CSV file
    const fileValidation = validateCSVFile(fileBuffer);
    if (!fileValidation.isValid) {
      return res.status(400).json({
        message: 'Invalid CSV file',
        errors: fileValidation.errors,
        warnings: fileValidation.warnings
      });
    }

    // Parse CSV data
    const parsedData = await parseCSV(fileBuffer);
    console.log('[importClients] Parsed CSV rows:', parsedData.length);

    // Map CSV columns to model fields
    const columnMap = {
      'Client_id': '_id',
      'ClientId': '_id',
      'Name': 'name',
      'Description': 'description',
      'Owned By': 'ownedBy',
      // Store Owner as plain text label
      'Owner': 'owner',
      'OwnedBy': 'ownedBy',
      'Contact Status': 'contactStatus',
      'ContactStatus': 'contactStatus',
      'Contact Type': 'contactType',
      'ContactType': 'contactType',
      'Company Type': 'companyType',
      'CompanyType': 'companyType',
      'Phone': 'phone',
      'Email': 'email',
      'Address': 'address',
      'City': 'city',
      'State': 'state',
      'Postal Code': 'postalCode',
      'PostalCode': 'postalCode',
      'Website': 'website',
      'Facebook Page': 'facebookPage',
      'FacebookPage': 'facebookPage',
      'Industry': 'industry',
      'Forecasted Amount': 'forecastedAmount',
      'Forecasted Amount ': 'forecastedAmount',
      'ForecastedAmount': 'forecastedAmount',
      'Interaction Count': 'interactionCount',
      'InteractionCount': 'interactionCount',
      'Created At': 'createdAt',
      'CreatedAt': 'createdAt',
      'Profile Image': 'profileImage',
      'ProfileImage': 'profileImage',
      'Last Note': 'lastNote',
      'LastNote': 'lastNote',
      'Projected Close Date': 'projectedCloseDate',
      'Full Name': 'fullName',
      'FullName': 'fullName',
      'FolderLink': 'folderLink',
      'Default Shipping Terms': 'defaultShippingTerms',
      'DefaultShippingTerms': 'defaultShippingTerms',
      'Default Payment Method': 'defaultPaymentMethod'
      ,
      'DefaultPaymentMethod': 'defaultPaymentMethod'
      ,
      // Compact legacy payment-as-text fields
      'NameCC': 'nameCC',
      'CCNumber': 'ccNumberText',
      'ExpirationDate': 'expirationDateText',
      'SecurityCode': 'securityCodeText',
      'ZipCode': 'zipCodeText'
    };

    // Header normalization to make mapping resilient to formatting variations
    const normalizeHeader = (h) => String(h || '')
      .replace(/\u00A0/g, ' ')      // NBSP -> normal space
      .replace(/_/g, ' ')            // underscores to spaces
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');        // collapse whitespace

    const normalizedMap = new Map();
    Object.entries(columnMap).forEach(([k, v]) => {
      normalizedMap.set(normalizeHeader(k), v);
    });
    const sensitiveFields = new Set([
      // Keep only legacy spaced headers sensitive for tokenization
      'Name on Card',
      'CC Number',
      'Expiration Date',
      'Security Code',
      'Zip Code'
    ]);

    const mappedRows = parsedData.map(({ rowNumber, data }) => {
      // Initialize defaults so fields exist even when empty
      const mapped = {
        _id: '',
        externalId: '',
        name: '',
        description: '',
        owner: '',
        ownedBy: '',
        contactStatus: '',
        contactType: '',
        companyType: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        postalCode: '',
        website: '',
        facebookPage: '',
        industry: '',
        forecastedAmount: 0,
        interactionCount: 0,
        createdAtText: '',
        profileImage: '',
        lastNote: '',
        fullName: '',
        projectedCloseDate: undefined,
        folderLink: '',
        defaultShippingTerms: '',
        defaultPaymentMethod: '',
        // plain-text payment fields
        nameCC: '',
        ccNumberText: '',
        expirationDateText: '',
        securityCodeText: '',
        zipCodeText: ''
      };
      const paymentRaw = { ccNumber: '', ccExp: '', ccCvv: '', nameOnCard: '', billingZip: '' };
      for (const [key, rawVal] of Object.entries(data)) {
        const header = (key || '').trim();
        const nHeader = normalizeHeader(header);
        const valueStr = rawVal == null ? '' : String(rawVal).trim();

        // Capture sensitive payment fields safely for later tokenization
        const headerKey = header.replace(/[^a-zA-Z]/g, '').toLowerCase();
        const isSensitive = sensitiveFields.has(header) || [
          'name on card',
          'cc number',
          'expiration date',
          'security code',
          'zip code'
        ].includes(nHeader) || [
          // No compact variants are treated as sensitive anymore
        ].includes(headerKey);
        if (isSensitive) {
          if (nHeader === 'name on card' || headerKey === 'namecc') paymentRaw.nameOnCard = valueStr;
          else if (nHeader === 'cc number' || headerKey === 'ccnumber') paymentRaw.ccNumber = valueStr;
          else if (nHeader === 'expiration date' || headerKey === 'expirationdate') paymentRaw.ccExp = valueStr;
          else if (nHeader === 'security code' || headerKey === 'securitycode') paymentRaw.ccCvv = valueStr;
          else if (nHeader === 'zip code' || headerKey === 'zipcode') paymentRaw.billingZip = valueStr;
          continue; // don't map sensitive columns directly to model
        }

        const target = normalizedMap.get(nHeader) || header;
        let value = rawVal;
        // Special handling: treat compact headers as plain text
        if (target === 'nameCC' || target === 'ccNumberText' || target === 'expirationDateText' || target === 'securityCodeText' || target === 'zipCodeText') {
          value = valueStr;
        }
        // Preserve raw CreatedAt input for display/traceability
        if (target === 'createdAt') {
          mapped.createdAtText = valueStr;
        }
        // Special-case: Client_id (normalized compare)
        if (nHeader === normalizeHeader('Client_id')) {
          if (value != null && String(value).trim() !== '') {
            const v = String(value).trim();
            mapped._id = v;            // force assign as requested
            mapped.externalId = v;     // also keep as external id
          }
          continue;
        }
        // Normalize currency for forecastedAmount
        if (normalizedMap.get(nHeader) === 'forecastedAmount') {
          const num = typeof value === 'string' ? Number(value.replace(/[^0-9.-]/g, '')) : Number(value);
          mapped.forecastedAmount = isNaN(num) ? 0 : num;
          continue;
        }
        mapped[target] = value;
      }
      // Attach payment raw if any value present
      if (Object.values(paymentRaw).some(v => (v || '').toString().trim() !== '')) {
        mapped.__paymentRaw = paymentRaw;
      }
      return { rowNumber, data: mapped };
    });
    if (mappedRows.length > 0) {
      const m0 = mappedRows[0].data || {};
      console.log('[importClients] First mapped row snapshot:', {
        rowNumber: mappedRows[0].rowNumber,
        keys: Object.keys(m0),
        paymentTextPreview: {
          nameCC: m0.nameCC,
          ccNumberText: m0.ccNumberText,
          expirationDateText: m0.expirationDateText,
          securityCodeText: m0.securityCodeText,
          zipCodeText: m0.zipCodeText,
          createdAtText: m0.createdAtText
        }
      });
    }
    
    // Set default owner if not specified
    mappedRows.forEach(row => {
      if (!row.data.ownedBy && !row.data.owner) {
        row.data.ownedBy = req.userId;
      }
    });
    
    // Validate all rows
    const validation = await batchValidateClients(mappedRows);
    console.log('[importClients] Validation summary:', {
      totalRows: validation.totalRows,
      valid: validation.validCount,
      invalid: validation.invalidCount,
      warnings: validation.warningCount
    });
    if (validation.validRows && validation.validRows.length > 0) {
      const v0 = validation.validRows[0].data || {};
      console.log('[importClients] First validated row paymentTextPreview:', {
        nameCC: v0.nameCC,
        ccNumberText: v0.ccNumberText,
        expirationDateText: v0.expirationDateText,
        securityCodeText: v0.securityCodeText,
        zipCodeText: v0.zipCodeText,
        createdAtText: v0.createdAtText
      });
    }
    if (validation.invalidCount > 0) {
      const sample = validation.invalidRows.slice(0, 5).map(r => ({
        rowNumber: r.rowNumber,
        errors: r.errors,
        keys: Object.keys(r.data || {})
      }));
      console.log('[importClients] Sample invalid rows (first 5):', sample);
    }
    
    // If skipInvalid option is not set and there are invalid rows, return error
    const skipInvalid = (req.body?.skipInvalid ?? req.query?.skipInvalid ?? 'true') === 'true';
    if (!skipInvalid && validation.invalidCount > 0) {
      return res.status(400).json({
        message: 'CSV contains invalid data',
        summary: {
          totalRows: validation.totalRows,
          validRows: validation.validCount,
          invalidRows: validation.invalidCount,
          rowsWithWarnings: validation.warningCount
        },
        invalidRows: validation.invalidRows.map(row => ({
          row: row.rowNumber,
          name: row.data?.name || 'N/A',
          errors: row.errors,
          warnings: row.warnings
        }))
      });
    }

    // Process valid rows with high-performance bulk operations
    const results = [];
    const errors = [];
    let successCount = 0;
    let errorCount = 0;
    let paymentAddedCount = 0;
    let paymentAttemptedCount = 0;
    let skippedCount = skipInvalid ? validation.invalidCount : 0;
    let createdCount = 0;
    let updatedCount = 0;

    // Prepare bulkWrite operations and metadata
    const ops = [];
    const opMeta = []; // { type, filter, rowNumber, name, paymentRaw }

    const EXCLUDE_KEYS = new Set(['_id', 'paymentMethod', 'statusHistory', 'createdAt', 'updatedAt', '__v', '__paymentRaw']);

    for (const validRow of validation.validRows) {
      const src = mappedRows.find(r => r.rowNumber === validRow.rowNumber);
      const paymentRaw = src?.data?.__paymentRaw;
      const data = { ...validRow.data };
      delete data.__paymentRaw;

      // Always bump updatedAt similar to Mongoose timestamps
      data.updatedAt = new Date();

      // Sanitize payload for $set
      const setPayload = {};
      for (const [k, v] of Object.entries(data)) {
        if (!EXCLUDE_KEYS.has(k)) setPayload[k] = v;
      }
      // Debug: show first row's $set preview including payment fields
      if (opMeta.length === 0) {
        console.log('[importClients] First $set payload preview (sanitized):', {
          keys: Object.keys(setPayload),
          paymentTextPreview: {
            nameCC: setPayload.nameCC,
            ccNumberText: setPayload.ccNumberText,
            expirationDateText: setPayload.expirationDateText,
            securityCodeText: setPayload.securityCodeText,
            zipCodeText: setPayload.zipCodeText,
            createdAtText: setPayload.createdAtText
          }
        });
      }

      const hasId = !!data._id;
      const hasEmail = !!data.email;

      if (hasId || hasEmail) {
        const filter = hasId ? { _id: data._id } : { email: data.email };
        // Honor CSV createdAt only on insert
        let createdOnInsert = new Date();
        if (data.createdAt) {
          const dt = new Date(data.createdAt);
          if (!isNaN(dt.getTime())) createdOnInsert = dt;
        }
        const update = {
          $set: setPayload,
          $setOnInsert: { createdAt: createdOnInsert }
        };
        ops.push({ updateOne: { filter, update, upsert: true } });
        opMeta.push({ type: 'update', filter, rowNumber: validRow.rowNumber, name: data.name, email: data.email, paymentRaw });
      } else {
        // No identifier, perform insertOne
        let createdAtInsert = new Date();
        if (data.createdAt) {
          const dt = new Date(data.createdAt);
          if (!isNaN(dt.getTime())) createdAtInsert = dt;
        }
        const insertDoc = {
          ...setPayload,
          createdAt: createdAtInsert,
          updatedAt: new Date()
        };
        ops.push({ insertOne: { document: insertDoc } });
        opMeta.push({ type: 'insert', filter: null, rowNumber: validRow.rowNumber, name: data.name, email: setPayload.email, paymentRaw });
      }
    }

    // Execute bulkWrite (unordered for max throughput)
    let bulkRes;
    try {
      bulkRes = await Client.bulkWrite(ops, { ordered: false });
    } catch (e) {
      console.error('[importClients] bulkWrite error:', e?.message || e);
      // Fallback summary: treat all as errors if catastrophic failure
      return res.status(500).json({
        message: 'Error importing clients (bulk write failed)',
        error: process.env.NODE_ENV === 'development' ? e.message : undefined
      });
    }

    // Compute created/updated from bulk results
    const upsertedIds = bulkRes.upsertedIds || {}; // indices -> _id
    const insertedIds = bulkRes.insertedIds || {}; // indices -> _id
    const matchedCount = bulkRes.matchedCount || 0;
    const upsertedCount = bulkRes.upsertedCount || 0;
    const insertedCount = bulkRes.insertedCount || 0;

    createdCount = (upsertedCount || 0) + (insertedCount || 0);
    updatedCount = matchedCount || 0;

    // Build list of created client ids for batched activity creation
    const createdEntries = [];
    opMeta.forEach((m, idx) => {
      if ((m.type === 'update' && upsertedIds[idx] != null) || (m.type === 'insert' && insertedIds[idx] != null)) {
        const newId = (m.type === 'update') ? upsertedIds[idx] : insertedIds[idx];
        createdEntries.push({ _id: newId, name: m.name, email: m.email });
      } else if (m.type === 'update' && m.filter && m.filter.email && upsertedCount > 0) {
        // Possible email-based upsert without id mapping
        createdEntries.push({ _id: null, name: m.name, email: m.filter.email });
      } else if (m.type === 'insert') {
        // Insert without insertedIds mapping, keep email for later resolve
        createdEntries.push({ _id: null, name: m.name, email: m.email });
      }
    });

    // Batch insert activities for created clients
    if (createdEntries.length > 0) {
      // Resolve any missing ids by email
      const unresolved = createdEntries.filter(e => !e._id && e.email);
      if (unresolved.length > 0) {
        const emails = Array.from(new Set(unresolved.map(e => e.email).filter(Boolean)));
        if (emails.length > 0) {
          try {
            const docs = await Client.find({ email: { $in: emails } }, { _id: 1, email: 1 }).lean();
            const map = docs.reduce((acc, d) => { acc[d.email] = d._id; return acc; }, {});
            createdEntries.forEach(e => { if (!e._id && e.email && map[e.email]) e._id = map[e.email]; });
          } catch (_) { /* ignore */ }
        }
      }

      const activityDocs = createdEntries
        .filter(e => e._id)
        .map(({ _id, name }) => ({
          clientId: _id,
          userId: req.userId,
          type: 'created',
          description: `Client "${name || ''}" was created`,
          metadata: { clientName: name || '', createdAt: new Date() }
        }));
      if (activityDocs.length > 0) {
        try {
          await Activity.insertMany(activityDocs, { ordered: false });
        } catch (e) {
          console.warn('[importClients] insertMany(Activity) warning:', e?.message || e);
        }
      }
    }

    // Prepare payment tasks (resolve client IDs first when needed)
    const paymentTasks = [];
    const emailToResolve = new Set();
    const pendingByIndex = [];

    opMeta.forEach((m, idx) => {
      const pr = m.paymentRaw;
      if (!pr || !(pr.ccNumber || pr.ccExp || pr.ccCvv || pr.nameOnCard || pr.billingZip)) return;
      paymentAttemptedCount++;

      let clientId = null;
      if (m.type === 'insert' && insertedIds[idx]) clientId = insertedIds[idx];
      if (m.type === 'update' && m.filter && m.filter._id) clientId = m.filter._id;
      if (!clientId && m.type === 'update' && m.filter && m.filter.email) {
        emailToResolve.add(m.filter.email);
      }
      pendingByIndex.push({ idx, pr, clientId, email: m.filter?.email || m.email });
    });

    let emailMap = {};
    if (emailToResolve.size > 0) {
      const docs = await Client.find({ email: { $in: Array.from(emailToResolve) } }, { _id: 1, email: 1 }).lean();
      emailMap = docs.reduce((acc, d) => { acc[d.email] = d._id; return acc; }, {});
    }

    // Concurrency limiter for payment method saves
    const workers = 16;
    const queue = pendingByIndex.filter(x => x.pr);
    let qi = 0;

    const runOne = async () => {
      // Round-robin consume queue
      while (true) {
        const current = qi++;
        if (current >= queue.length) break;
        const item = queue[current];
        try {
          const pr = item.pr;
          const digits = String(pr.ccNumber || '').replace(/\D+/g, '');
          if (!digits || digits.length < 13 || digits.length > 19) continue;
          const last4 = digits.slice(-4);
          const detectBrand = (pan) => {
            if (/^4\d{12,18}$/.test(pan)) return 'visa';
            if (/^(5[1-5]\d{4}|2(2[2-9]\d{2}|[3-6]\d{3}|7[01]\d{2}|720\d))\d{10}$/.test(pan)) return 'mastercard';
            if (/^3[47]\d{13}$/.test(pan)) return 'amex';
            if (/^(6011\d{12}|65\d{14}|64[4-9]\d{13}|622(12[6-9]|1[3-9]\d|[2-8]\d{2}|9([01]\d|2[0-5]))\d{10})$/.test(pan)) return 'discover';
            return 'card';
          };
          const brand = detectBrand(digits);

          // Parse expiry
          const exp = String(pr.ccExp || '').trim();
          const mmYY = exp.match(/^(\d{1,2})[\/\-](\d{2,4})$/);
          if (!mmYY) continue;
          const mm = parseInt(mmYY[1], 10);
          const yy = String(mmYY[2]);
          const yyyy = yy.length === 2 ? 2000 + parseInt(yy, 10) : parseInt(yy, 10);
          const expMonth = Math.min(12, Math.max(1, mm));
          const expYear = yyyy;

          // Resolve clientId
          const cid = item.clientId || (item.email ? emailMap[item.email] : null);
          if (!cid) continue;
          const clientDoc = await Client.findById(cid);
          if (!clientDoc) continue;
          const tokenized = {
            id: `csv_${brand}_${last4}_${Date.now()}`,
            brand,
            last4,
            expMonth,
            expYear,
            nameOnCard: pr.nameOnCard || undefined,
            billingZip: pr.billingZip || undefined,
            isDefault: true,
          };
          await clientDoc.addPaymentMethod(tokenized);
          paymentAddedCount++;
        } catch (e) {
          // ignore individual payment errors to keep import fast
        }
      }
    };

    // Launch workers
    await Promise.all(Array.from({ length: workers }).map(() => runOne()));

    // Success count equals number of bulk ops that did not error
    successCount = (bulkRes.insertedCount || 0) + (bulkRes.upsertedCount || 0) + (bulkRes.matchedCount || 0);

    // Add skipped invalid rows to errors if skipInvalid is true
    if (skipInvalid && validation.invalidRows.length > 0) {
      validation.invalidRows.forEach(row => {
        errors.push({
          row: row.rowNumber,
          name: row.data?.name || 'N/A',
          error: row.errors.join('; '),
          skipped: true
        });
      });
    }

    res.json({
      message: 'CSV import completed',
      summary: {
        totalProcessed: validation.totalRows,
        successful: successCount,
        failed: errorCount,
        skipped: skippedCount,
        created: createdCount,
        updated: updatedCount,
        paymentAttempted: paymentAttemptedCount,
        paymentAdded: paymentAddedCount
      },
      // For performance, omit large per-row results on big imports
      results: results,
      errors,
      warnings: validation.rowsWithWarnings.map(row => ({
        row: row.rowNumber,
        name: row.data?.name || 'N/A',
        warnings: row.warnings
      }))
    });
  } catch (error) {
    console.error('Import clients error:', error);
    res.status(500).json({
      message: 'Error importing clients',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Preview CSV before import
const previewClientsCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'No CSV file uploaded'
      });
    }

    // Using memory storage, read buffer directly from multer
    const fileBuffer = req.file.buffer;

    // Validate CSV file
    const fileValidation = validateCSVFile(fileBuffer);
    if (!fileValidation.isValid) {
      return res.status(400).json({
        message: 'Invalid CSV file',
        errors: fileValidation.errors,
        warnings: fileValidation.warnings
      });
    }

    // Preview CSV data
    const preview = await previewCSV(fileBuffer, 10);

    // Map CSV columns to model fields for preview validation
    const columnMap = {
      'Client_id': '_id',
      'Name': 'name',
      'Description': 'description',
      'Owned By': 'ownedBy',
      'Contact Status': 'contactStatus',
      'Contact Type': 'contactType',
      'Company Type': 'companyType',
      'Phone': 'phone',
      'Email': 'email',
      'Address': 'address',
      'City': 'city',
      'State': 'state',
      'Postal Code': 'postalCode',
      'Website': 'website',
      'Facebook Page': 'facebookPage',
      'Industry': 'industry',
      'Forecasted Amount': 'forecastedAmount',
      'Interaction Count': 'interactionCount',
      'Created At': 'createdAt',
      'Profile Image': 'profileImage',
      'Last Note': 'lastNote',
      'Projected Close Date': 'projectedCloseDate',
      'Full Name': 'fullName',
      'Default Shipping Terms': 'defaultShippingTerms',
      'Default Payment Method': 'defaultPaymentMethod'
    };
    const sensitiveFields = new Set([
      'Name on Card',
      'CC Number',
      'Expiration Date',
      'Security Code',
      'Zip Code'
    ]);

    const mappedPreviewRows = preview.rows.map(({ rowNumber, data }) => {
      const mapped = {};
      for (const [key, value] of Object.entries(data)) {
        if (sensitiveFields.has(key)) continue;
        const target = columnMap[key] || key;
        mapped[target] = value;
      }
      return { rowNumber, data: mapped };
    });

    // Set default owner if not specified in preview rows
    mappedPreviewRows.forEach(row => {
      if (!row.data.ownedBy && !row.data.owner) {
        row.data.ownedBy = req.userId;
      }
    });
    
    // Set default owner for validation
    preview.rows.forEach(row => {
      if (!row.data.ownedBy && !row.data.owner) {
        row.data.ownedBy = req.userId;
      }
    });
    
    // Validate preview rows
    const validation = await batchValidateClients(mappedPreviewRows);

    res.json({
      message: 'CSV preview generated',
      preview: {
        headers: preview.headers,
        totalRows: preview.totalRows,
        hasMore: preview.hasMore,
        rows: preview.rows.slice(0, 10).map((row, index) => {
          const validationResult = validation.allResults[index];
          return {
            rowNumber: row.rowNumber,
            data: row.data,
            isValid: validationResult?.isValid || false,
            errors: validationResult?.errors || [],
            warnings: validationResult?.warnings || []
          };
        })
      },
      summary: {
        totalRows: preview.totalRows,
        previewedRows: Math.min(10, preview.totalRows),
        validRows: validation.validCount,
        invalidRows: validation.invalidCount,
        rowsWithWarnings: validation.warningCount
      },
      columnMapping: {
        suggestedMappings: detectColumnMappings(preview.headers),
        availableFields: getAvailableClientFields()
      }
    });
  } catch (error) {
    console.error('Preview clients CSV error:', error);
    res.status(500).json({
      message: 'Error previewing CSV',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Export clients to CSV with enhanced options
const exportClients = async (req, res) => {
  try {
    const {
      contactStatus,
      industry,
      city,
      ownedBy,
      search,
      dateFormat = 'ISO',
      includeOwnerDetails = 'true',
      includeFinancials = 'true',
      includeStatusHistory = 'false'
    } = req.query;

    // Build query
    const query = {};
    
    if (contactStatus) {
      query.contactStatus = contactStatus;
    }
    
    if (industry) {
      query.industry = industry;
    }
    
    if (city) {
      query.city = new RegExp(city, 'i');
    }
    
    if (ownedBy) {
      query.ownedBy = ownedBy;
    }
    
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    // Fetch clients with owner details
    const clients = await Client.find(query)
      .populate('ownedBy', 'name email')
      .sort({ createdAt: -1 });

    // Generate CSV using the utility
    const csvContent = await generateClientsCSV(clients, {
      dateFormat,
      includeOwnerDetails: includeOwnerDetails === 'true',
      includeFinancials: includeFinancials === 'true',
      includeStatusHistory: includeStatusHistory === 'true'
    });

    // Set response headers for CSV download
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="clients_export_${timestamp}.csv"`);

    res.send(csvContent);
  } catch (error) {
    console.error('Export clients error:', error);
    res.status(500).json({
      message: 'Error exporting clients',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Download clients CSV template
const downloadClientsTemplate = async (req, res) => {
  try {
    const csvContent = await generateClientsTemplate();
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="clients_import_template.csv"');
    
    res.send(csvContent);
  } catch (error) {
    console.error('Download clients template error:', error);
    res.status(500).json({
      message: 'Error generating template',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper function to detect column mappings
const detectColumnMappings = (headers) => {
  const mappings = {};
  const commonMappings = {
    'name': ['name', 'company', 'company name', 'client name', 'business name'],
    'email': ['email', 'email address', 'e-mail', 'contact email'],
    'phone': ['phone', 'phone number', 'telephone', 'tel', 'mobile'],
    'contactStatus': ['status', 'contact status', 'lead status', 'stage'],
    'industry': ['industry', 'sector', 'business type'],
    'city': ['city', 'location', 'town'],
    'state': ['state', 'province', 'region'],
    'website': ['website', 'url', 'web', 'site'],
    'ownedBy': ['owner', 'owned by', 'assigned to', 'sales rep'],
    'forecastedAmount': ['amount', 'value', 'forecast', 'revenue', 'deal size']
  };

  headers.forEach(header => {
    const lowerHeader = header.toLowerCase().trim();
    for (const [field, variations] of Object.entries(commonMappings)) {
      if (variations.some(v => lowerHeader.includes(v))) {
        mappings[header] = field;
        break;
      }
    }
  });

  return mappings;
};

// Helper function to get available client fields
const getAvailableClientFields = () => {
  return [
    { field: 'name', label: 'Name', required: true },
    { field: 'email', label: 'Email', required: false },
    { field: 'phone', label: 'Phone', required: false },
    { field: 'contactStatus', label: 'Contact Status', required: false },
    { field: 'contactType', label: 'Contact Type', required: false },
    { field: 'companyType', label: 'Company Type', required: false },
    { field: 'industry', label: 'Industry', required: false },
    { field: 'address', label: 'Address', required: false },
    { field: 'city', label: 'City', required: false },
    { field: 'state', label: 'State', required: false },
    { field: 'postalCode', label: 'Postal Code', required: false },
    { field: 'website', label: 'Website', required: false },
    { field: 'facebookPage', label: 'Facebook Page', required: false },
    { field: 'ownedBy', label: 'Owner Email', required: false },
    { field: 'forecastedAmount', label: 'Forecasted Amount', required: false },
    { field: 'projectedCloseDate', label: 'Projected Close Date', required: false },
    { field: 'fullName', label: 'Full Name', required: false },
    { field: 'description', label: 'Description', required: false },
    { field: 'lastNote', label: 'Last Note', required: false }
  ];
};

module.exports = {
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  deleteAllClients,
  updateClientStatus,
  addClientNote,
  getClientPipeline,
  getClientSummary,
  bulkAssignOwner,
  bulkMoveStatus,
  importClients,
  importClientsBatch,
  exportClients,
  previewClientsCSV,
  downloadClientsTemplate
};