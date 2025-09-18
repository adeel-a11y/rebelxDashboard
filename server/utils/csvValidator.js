const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * Validate email format
 * @param {String} email - Email to validate
 * @returns {Boolean} Is valid email
 */
const isValidEmail = (email) => {
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 * @param {String} phone - Phone number to validate
 * @returns {Boolean} Is valid phone
 */
const isValidPhone = (phone) => {
  if (!phone) return true; // Phone is optional
  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate URL format
 * @param {String} url - URL to validate
 * @returns {Boolean} Is valid URL
 */
const isValidURL = (url) => {
  if (!url) return true; // URL is optional
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate date format
 * @param {String} dateStr - Date string to validate
 * @returns {Boolean} Is valid date
 */
const isValidDate = (dateStr) => {
  if (!dateStr) return true; // Date is optional
  
  // Try parsing ISO format
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) return true;
  
  // Try parsing MM/DD/YYYY format
  const usFormat = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
  if (usFormat.test(dateStr)) {
    const [month, day, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return !isNaN(date.getTime());
  }
  
  // Try parsing DD/MM/YYYY format
  const euFormat = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
  if (euFormat.test(dateStr)) {
    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return !isNaN(date.getTime());
  }
  
  return false;
};

/**
 * Parse date from various formats
 * @param {String} dateStr - Date string to parse
 * @returns {Date|null} Parsed date or null
 */
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  
  // Try parsing ISO format
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) return isoDate;
  
  // Try parsing MM/DD/YYYY format
  const usFormat = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
  if (usFormat.test(dateStr)) {
    const [month, day, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  }
  
  // Try parsing DD/MM/YYYY format
  const euFormat = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
  if (euFormat.test(dateStr)) {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  }
  
  return null;
};

/**
 * Validate user data for CSV import
 * @param {Object} userData - User data to validate
 * @param {Number} rowNumber - Row number in CSV
 * @returns {Object} Validation result
 */
const validateUserData = async (userData, rowNumber = 0) => {
  const errors = [];
  const warnings = [];
  const validatedData = {};

  // Validate email (required)
  if (!userData.email) {
    errors.push('Email is required');
  } else if (!isValidEmail(userData.email)) {
    errors.push('Invalid email format');
  } else {
    validatedData.email = userData.email.toLowerCase();
    validatedData._id = userData.email.toLowerCase();
    
    // Check for duplicate
    try {
      const existingUser = await User.findById(validatedData.email);
      if (existingUser) {
        errors.push(`User with email ${userData.email} already exists`);
      }
    } catch (err) {
      warnings.push('Could not check for duplicate email');
    }
  }

  // Validate name (required)
  if (!userData.name) {
    errors.push('Name is required');
  } else if (userData.name.length < 2) {
    errors.push('Name must be at least 2 characters long');
  } else if (userData.name.length > 100) {
    errors.push('Name cannot exceed 100 characters');
  } else {
    validatedData.name = userData.name.trim();
  }

  // Validate password (required for new users)
  if (!userData.password) {
    errors.push('Password is required');
  } else if (userData.password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else {
    validatedData.password = userData.password;
  }

  // Validate role (required)
  const validRoles = ['admin', 'manager', 'employee'];
  if (!userData.role) {
    errors.push('Role is required');
  } else if (!validRoles.includes(userData.role.toLowerCase())) {
    errors.push(`Role must be one of: ${validRoles.join(', ')}`);
  } else {
    validatedData.role = userData.role.toLowerCase();
  }

  // Validate status (optional, default to active)
  const validStatuses = ['active', 'inactive'];
  if (userData.status) {
    if (!validStatuses.includes(userData.status.toLowerCase())) {
      errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
    } else {
      validatedData.status = userData.status.toLowerCase();
    }
  } else {
    validatedData.status = 'active';
  }

  // Validate department (optional)
  if (userData.department) {
    if (userData.department.length > 100) {
      errors.push('Department cannot exceed 100 characters');
    } else {
      validatedData.department = userData.department.trim();
    }
  }

  // Validate phone (optional)
  if (userData.phone) {
    if (!isValidPhone(userData.phone)) {
      warnings.push('Invalid phone number format');
    } else {
      validatedData.phone = userData.phone.trim();
    }
  }

  // Validate hourly rate (optional)
  if (userData.hourlyRate) {
    const rate = parseFloat(userData.hourlyRate);
    if (isNaN(rate)) {
      errors.push('Hourly rate must be a number');
    } else if (rate < 0) {
      errors.push('Hourly rate cannot be negative');
    } else if (rate > 10000) {
      warnings.push('Hourly rate seems unusually high');
      validatedData.hourlyRate = rate;
    } else {
      validatedData.hourlyRate = rate;
    }
  }

  return {
    rowNumber,
    isValid: errors.length === 0,
    data: validatedData,
    errors,
    warnings
  };
};

/**
 * Validate client data for CSV import
 * @param {Object} clientData - Client data to validate
 * @param {Number} rowNumber - Row number in CSV
 * @returns {Object} Validation result
 */
const validateClientData = async (clientData, rowNumber = 0) => {
  const errors = [];
  const warnings = [];
  const validatedData = {};

  // Validate name (permissive; synthesize if missing)
  if (!clientData.name || String(clientData.name).trim().length < 2) {
    const fallback =
      (clientData.fullName && String(clientData.fullName).trim()) ||
      (clientData.email && String(clientData.email).trim()) ||
      (clientData.externalId && String(clientData.externalId).trim()) ||
      `Unnamed Client ${rowNumber}`;
    validatedData.name = String(fallback).slice(0, 200);
    warnings.push('Name was missing or too short; a fallback name was assigned');
  } else if (clientData.name.length > 200) {
    validatedData.name = clientData.name.trim().slice(0, 200);
    warnings.push('Name exceeded 200 characters and was truncated');
  } else {
    validatedData.name = clientData.name.trim();
  }

  // Validate email (optional)
  if (clientData.email) {
    if (!isValidEmail(clientData.email)) {
      warnings.push('Invalid email format');
    } else {
      validatedData.email = clientData.email.toLowerCase();
    }
  }

  // Validate contact status (optional, default to Uncategorized)
  const validStatuses = ['Sampling', 'New Prospect', 'Uncategorized', 'Closed lost', 'Initial Contact', 'Closed won', 'Committed', 'Consideration'];
  if (clientData.contactStatus) {
    const status = validStatuses.find(s => s.toLowerCase() === String(clientData.contactStatus).toLowerCase());
    if (!status) {
      warnings.push(`Unknown contact status "${clientData.contactStatus}". Defaulted to 'Uncategorized'.`);
      validatedData.contactStatus = 'Uncategorized';
    } else {
      validatedData.contactStatus = status;
    }
  } else {
    validatedData.contactStatus = 'Uncategorized';
  }

  // Validate phone (optional)
  if (clientData.phone) {
    if (!isValidPhone(clientData.phone)) {
      warnings.push('Invalid phone number format');
    } else {
      validatedData.phone = clientData.phone.trim();
    }
  }

  // Validate URLs (optional)
  if (clientData.website) {
    if (!isValidURL(clientData.website)) {
      warnings.push('Invalid website URL format');
    } else {
      validatedData.website = clientData.website.trim();
    }
  }

  if (clientData.facebookPage) {
    if (!isValidURL(clientData.facebookPage)) {
      warnings.push('Invalid Facebook page URL format');
    } else {
      validatedData.facebookPage = clientData.facebookPage.trim();
    }
  }

  // Validate forecasted amount (optional, permissive)
  if (clientData.forecastedAmount !== undefined && clientData.forecastedAmount !== '') {
    const amount = parseFloat(clientData.forecastedAmount);
    if (isNaN(amount)) {
      warnings.push('Forecasted amount could not be parsed as a number');
    } else if (amount < 0) {
      warnings.push('Forecasted amount is negative; keeping as-is');
      validatedData.forecastedAmount = amount;
    } else {
      validatedData.forecastedAmount = amount;
    }
  }

  // Validate projected close date (optional, permissive)
  if (clientData.projectedCloseDate) {
    if (!isValidDate(clientData.projectedCloseDate)) {
      warnings.push('Invalid projected close date format; value ignored');
    } else {
      validatedData.projectedCloseDate = parseDate(clientData.projectedCloseDate);
    }
  }

  // Validate createdAt (optional, permissive)
  if (clientData.createdAt) {
    if (!isValidDate(clientData.createdAt)) {
      warnings.push('Invalid createdAt date format; value ignored');
    } else {
      validatedData.createdAt = parseDate(clientData.createdAt);
    }
  }

  // Validate interactionCount (optional, permissive)
  if (clientData.interactionCount !== undefined && clientData.interactionCount !== '') {
    const count = parseInt(clientData.interactionCount, 10);
    if (Number.isNaN(count) || count < 0) {
      warnings.push('Interaction count is not a non-negative integer; value ignored');
    } else {
      validatedData.interactionCount = count;
    }
  }

  // Validate provided _id (optional, now String-based)
  if (clientData._id != null) {
    const idVal = String(clientData._id).trim();
    if (idVal.length === 0) {
      warnings.push('Provided Client_id was empty after trimming; will let Mongo assign if missing');
    } else {
      validatedData._id = idVal;
    }
  }

  // Validate owner (optional, permissive: always assign value)
  if (clientData.owner || clientData.ownedBy) {
    const ownerEmail = (clientData.owner || clientData.ownedBy).toString().trim();
    if (!isValidEmail(ownerEmail)) {
      warnings.push('Invalid owner email format; assigning value as provided');
      validatedData.ownedBy = ownerEmail.toLowerCase();
    } else {
      // Check if owner exists (warning only)
      try {
        const owner = await User.findById(ownerEmail.toLowerCase());
        if (!owner) {
          warnings.push(`Owner with email ${ownerEmail} not found; assigning anyway`);
        }
      } catch (err) {
        warnings.push('Could not verify owner existence');
      }
      validatedData.ownedBy = ownerEmail.toLowerCase();
    }
  }

  // Copy over other optional fields
  const optionalFields = [
    'description', 'contactType', 'companyType', 'address', 
    'city', 'state', 'postalCode', 'industry', 'fullName', 
    'lastNote', 'defaultShippingTerms', 'defaultPaymentMethod',
    'externalId',
    // Additional passthrough fields to preserve CSV data as-is
    'owner', 'folderLink', 'profileImage', 'createdAtText',
    // Plain-text payment fields requested by import flow
    'nameCC', 'ccNumberText', 'expirationDateText', 'securityCodeText', 'zipCodeText'
  ];

  optionalFields.forEach(field => {
    if (clientData[field]) {
      validatedData[field] = clientData[field].trim();
    }
  });

  // Check for duplicate based on name and email combination
  if (validatedData.name && validatedData.email) {
    try {
      const Client = require('../models/Client');
      const existingClient = await Client.findOne({
        name: validatedData.name,
        email: validatedData.email
      });
      if (existingClient) {
        warnings.push(`Client with name "${validatedData.name}" and email "${validatedData.email}" may already exist`);
      }
    } catch (err) {
      // Ignore duplicate check errors
    }
  }

  return {
    rowNumber,
    isValid: errors.length === 0,
    data: validatedData,
    errors,
    warnings
  };
};

/**
 * Validate CSV file
 * @param {Buffer} fileBuffer - File buffer
 * @param {Number} maxSize - Maximum file size in bytes
 * @returns {Object} Validation result
 */
const validateCSVFile = (fileBuffer, maxSize = 5 * 1024 * 1024) => {
  const errors = [];
  const warnings = [];

  // Check file size
  if (fileBuffer.length > maxSize) {
    errors.push(`File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`);
  }

  // Check if file is empty
  if (fileBuffer.length === 0) {
    errors.push('File is empty');
  }

  // Check for BOM and other encoding issues
  const content = fileBuffer.toString('utf8');
  if (content.charCodeAt(0) === 0xFEFF) {
    warnings.push('File contains BOM (Byte Order Mark), which will be removed');
  }

  // Check if content looks like CSV
  if (!content.includes(',') && !content.includes(';') && !content.includes('\t')) {
    warnings.push('File does not appear to be a valid CSV file (no delimiters found)');
  }

  // Check for common CSV issues
  const lines = content.split('\n');
  if (lines.length < 2) {
    warnings.push('File contains only one line (no data rows)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    lineCount: lines.length
  };
};

/**
 * Batch validate user data
 * @param {Array} usersData - Array of user data objects
 * @returns {Promise<Object>} Batch validation result
 */
const batchValidateUsers = async (usersData) => {
  const results = await Promise.all(
    usersData.map((userData, index) => 
      validateUserData(userData.data || userData, userData.rowNumber || index + 1)
    )
  );

  const validRows = results.filter(r => r.isValid);
  const invalidRows = results.filter(r => !r.isValid);
  const rowsWithWarnings = results.filter(r => r.warnings.length > 0);

  return {
    totalRows: results.length,
    validCount: validRows.length,
    invalidCount: invalidRows.length,
    warningCount: rowsWithWarnings.length,
    validRows,
    invalidRows,
    rowsWithWarnings,
    allResults: results
  };
};

/**
 * Batch validate client data
 * @param {Array} clientsData - Array of client data objects
 * @returns {Promise<Object>} Batch validation result
 */
const batchValidateClients = async (clientsData) => {
  const results = await Promise.all(
    clientsData.map((clientData, index) => 
      validateClientData(clientData.data || clientData, clientData.rowNumber || index + 1)
    )
  );

  const validRows = results.filter(r => r.isValid);
  const invalidRows = results.filter(r => !r.isValid);
  const rowsWithWarnings = results.filter(r => r.warnings.length > 0);

  return {
    totalRows: results.length,
    validCount: validRows.length,
    invalidCount: invalidRows.length,
    warningCount: rowsWithWarnings.length,
    validRows,
    invalidRows,
    rowsWithWarnings,
    allResults: results
  };
};

module.exports = {
  isValidEmail,
  isValidPhone,
  isValidURL,
  isValidDate,
  parseDate,
  validateUserData,
  validateClientData,
  validateCSVFile,
  batchValidateUsers,
  batchValidateClients
};