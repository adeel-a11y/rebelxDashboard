const { format } = require('fast-csv');
const { Writable } = require('stream');

/**
 * Generate CSV string from data array
 * @param {Array} data - Array of objects to convert to CSV
 * @param {Object} options - CSV generation options
 * @returns {Promise<String>} CSV string
 */
const generateCSV = (data, options = {}) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    
    const defaultOptions = {
      headers: true,
      includeEndRowDelimiter: true,
      writeBOM: true,
      quote: '"',
      escape: '"',
      delimiter: ',',
      ...options
    };

    // Create a writable stream to collect the CSV data
    const writableStream = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(chunk);
        callback();
      }
    });

    const csvStream = format(defaultOptions);

    csvStream
      .pipe(writableStream)
      .on('finish', () => {
        const csvString = Buffer.concat(chunks).toString('utf8');
        resolve(csvString);
      })
      .on('error', reject);

    // Write data to stream
    data.forEach(row => csvStream.write(row));
    csvStream.end();
  });
};

/**
 * Generate CSV with custom headers
 * @param {Array} data - Array of objects to convert to CSV
 * @param {Array} headers - Custom header configuration
 * @returns {Promise<String>} CSV string
 */
const generateCSVWithHeaders = async (data, headers) => {
  // Transform data based on header configuration
  const transformedData = data.map(row => {
    const newRow = {};
    headers.forEach(header => {
      if (typeof header === 'string') {
        newRow[header] = row[header] || '';
      } else if (typeof header === 'object') {
        const { field, label, transform } = header;
        const value = row[field] || '';
        newRow[label || field] = transform ? transform(value, row) : value;
      }
    });
    return newRow;
  });

  return generateCSV(transformedData);
};

/**
 * Generate CSV for users export
 * @param {Array} users - Array of user objects
 * @param {Object} options - Export options
 * @returns {Promise<String>} CSV string
 */
const generateUsersCSV = async (users, options = {}) => {
  const {
    includePassword = false,
    dateFormat = 'ISO',
    includeMetadata = false
  } = options;

  const headers = [
    { field: 'email', label: 'Email' },
    { field: 'name', label: 'Name' },
    { field: 'role', label: 'Role' },
    { field: 'department', label: 'Department' },
    { field: 'phone', label: 'Phone' },
    { field: 'hourlyRate', label: 'Hourly Rate' },
    { field: 'status', label: 'Status' },
    {
      field: 'createdAt',
      label: 'Created At',
      transform: (value) => formatDate(value, dateFormat)
    },
    {
      field: 'lastLogin',
      label: 'Last Login',
      transform: (value) => value ? formatDate(value, dateFormat) : ''
    }
  ];

  if (includePassword) {
    // Add a placeholder for password (for template purposes only)
    headers.splice(2, 0, { field: 'password', label: 'Password', transform: () => '' });
  }

  if (includeMetadata) {
    headers.push({
      field: 'metadata',
      label: 'Metadata',
      transform: (value) => value ? JSON.stringify(value) : ''
    });
  }

  return generateCSVWithHeaders(users, headers);
};

/**
 * Generate CSV for clients export
 * @param {Array} clients - Array of client objects
 * @param {Object} options - Export options
 * @returns {Promise<String>} CSV string
 */
const generateClientsCSV = async (clients, options = {}) => {
  const {
    dateFormat = 'ISO',
    includeOwnerDetails = true,
    includeFinancials = true,
    includeStatusHistory = false
  } = options;

  const headers = [
    { field: 'name', label: 'Name' },
    { field: 'email', label: 'Email' },
    { field: 'phone', label: 'Phone' },
    { field: 'contactStatus', label: 'Contact Status' },
    { field: 'contactType', label: 'Contact Type' },
    { field: 'companyType', label: 'Company Type' },
    { field: 'industry', label: 'Industry' },
    { field: 'address', label: 'Address' },
    { field: 'city', label: 'City' },
    { field: 'state', label: 'State' },
    { field: 'postalCode', label: 'Postal Code' },
    { field: 'website', label: 'Website' },
    { field: 'facebookPage', label: 'Facebook Page' }
  ];

  if (includeOwnerDetails) {
    headers.push(
      {
        field: 'ownedBy',
        label: 'Owner Email',
        transform: (value) => {
          if (typeof value === 'object' && value !== null) {
            return value.email || value._id || '';
          }
          return value || '';
        }
      },
      {
        field: 'ownedBy',
        label: 'Owner Name',
        transform: (value) => {
          if (typeof value === 'object' && value !== null) {
            return value.name || '';
          }
          return '';
        }
      }
    );
  }

  if (includeFinancials) {
    headers.push(
      { field: 'forecastedAmount', label: 'Forecasted Amount' },
      {
        field: 'projectedCloseDate',
        label: 'Projected Close Date',
        transform: (value) => value ? formatDate(value, dateFormat) : ''
      }
    );
  }

  headers.push(
    { field: 'fullName', label: 'Full Name' },
    { field: 'lastNote', label: 'Last Note' },
    { field: 'interactionCount', label: 'Interaction Count' },
    {
      field: 'createdAt',
      label: 'Created At',
      transform: (value) => formatDate(value, dateFormat)
    },
    {
      field: 'updatedAt',
      label: 'Updated At',
      transform: (value) => formatDate(value, dateFormat)
    }
  );

  if (includeStatusHistory) {
    headers.push({
      field: 'statusHistory',
      label: 'Status History',
      transform: (value) => {
        if (Array.isArray(value) && value.length > 0) {
          return value.map(h => 
            `${h.status} (${formatDate(h.changedAt, dateFormat)})`
          ).join('; ');
        }
        return '';
      }
    });
  }

  return generateCSVWithHeaders(clients, headers);
};

/**
 * Generate CSV template for users import
 * @returns {Promise<String>} CSV template string
 */
const generateUsersTemplate = async () => {
  const sampleData = [
    {
      email: 'john.doe@example.com',
      name: 'John Doe',
      password: 'SecurePassword123!',
      role: 'employee',
      department: 'Sales',
      phone: '+1234567890',
      hourlyRate: '50',
      status: 'active'
    },
    {
      email: 'jane.smith@example.com',
      name: 'Jane Smith',
      password: 'AnotherSecure456!',
      role: 'manager',
      department: 'Marketing',
      phone: '+0987654321',
      hourlyRate: '75',
      status: 'active'
    }
  ];

  return generateCSV(sampleData);
};

/**
 * Generate CSV template for clients import
 * @returns {Promise<String>} CSV template string
 */
const generateClientsTemplate = async () => {
  const sampleData = [
    {
      name: 'Acme Corporation',
      email: 'contact@acme.com',
      phone: '+1234567890',
      contactStatus: 'New',
      contactType: 'Email',
      companyType: 'Corporation',
      industry: 'Technology',
      address: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94105',
      website: 'https://acme.com',
      facebookPage: 'https://facebook.com/acme',
      ownedBy: 'sales@yourcompany.com',
      forecastedAmount: '50000',
      projectedCloseDate: '2024-12-31',
      fullName: 'John Smith',
      description: 'Large technology company interested in our services'
    },
    {
      name: 'Beta Industries',
      email: 'info@beta.com',
      phone: '+0987654321',
      contactStatus: 'Qualified',
      contactType: 'Phone',
      companyType: 'LLC',
      industry: 'Manufacturing',
      address: '456 Industrial Ave',
      city: 'Detroit',
      state: 'MI',
      postalCode: '48201',
      website: 'https://beta-industries.com',
      facebookPage: '',
      ownedBy: 'manager@yourcompany.com',
      forecastedAmount: '75000',
      projectedCloseDate: '2024-11-15',
      fullName: 'Sarah Johnson',
      description: 'Manufacturing company looking for automation solutions'
    }
  ];

  return generateCSV(sampleData);
};

/**
 * Format date based on format type
 * @param {Date|String} date - Date to format
 * @param {String} format - Format type (ISO, US, EU)
 * @returns {String} Formatted date string
 */
const formatDate = (date, format = 'ISO') => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  switch (format) {
    case 'US':
      return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
    case 'EU':
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    case 'ISO':
    default:
      return d.toISOString();
  }
};

/**
 * Escape CSV field value
 * @param {String} value - Value to escape
 * @returns {String} Escaped value
 */
const escapeCSVField = (value) => {
  if (value === null || value === undefined) return '';
  
  const stringValue = String(value);
  
  // Check if value needs to be quoted
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    // Escape quotes by doubling them
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
};

module.exports = {
  generateCSV,
  generateCSVWithHeaders,
  generateUsersCSV,
  generateClientsCSV,
  generateUsersTemplate,
  generateClientsTemplate,
  formatDate,
  escapeCSVField
};