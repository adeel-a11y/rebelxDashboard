const csv = require('csv-parser');
const { Readable } = require('stream');

/**
 * Parse CSV data from buffer or string
 * @param {Buffer|String} data - CSV data to parse
 * @param {Object} options - Parser options
 * @returns {Promise<Array>} Parsed CSV rows
 */
const parseCSV = (data, options = {}) => {
  return new Promise(async (resolve, reject) => {
    const results = [];
    const errors = [];
    let rowNumber = 0;

    try {
      const csvString = data.toString();
      const separator = detectDelimiter(csvString);
      const headers = await extractHeaders(data);

      const defaultOptions = {
        headers, // explicit headers array
        separator, // detected delimiter
        skipLines: 1, // skip header row since we provide headers
        skipEmptyLines: true,
        skipComments: true,
        trim: true,
        ...options
      };

      // Convert buffer or string to readable stream
      const stream = Readable.from(csvString);

      stream
        .pipe(csv(defaultOptions))
        .on('data', (row) => {
          rowNumber++;
          // Clean up the row data
          const cleanedRow = {};
          for (const [key, value] of Object.entries(row)) {
            // Remove BOM characters and trim
            const cleanKey = String(key).replace(/^\uFEFF/, '').trim();
            cleanedRow[cleanKey] = typeof value === 'string' ? value.trim() : value;
          }
          results.push({ rowNumber, data: cleanedRow });
        })
        .on('error', (error) => {
          errors.push({ rowNumber, error: error.message });
        })
        .on('end', () => {
          if (errors.length > 0) {
            reject({ message: 'CSV parsing completed with errors', errors, results });
          } else {
            resolve(results);
          }
        });
    } catch (e) {
      reject(e);
    }
  });
};

/**
 * Parse CSV with column mapping
 * @param {Buffer|String} data - CSV data to parse
 * @param {Object} columnMap - Map of CSV columns to database fields
 * @param {Object} options - Parser options
 * @returns {Promise<Array>} Parsed and mapped CSV rows
 */
const parseCSVWithMapping = async (data, columnMap = {}, options = {}) => {
  try {
    const parsedRows = await parseCSV(data, options);
    
    return parsedRows.map(({ rowNumber, data }) => {
      const mappedData = {};
      
      for (const [csvColumn, dbField] of Object.entries(columnMap)) {
        if (data.hasOwnProperty(csvColumn)) {
          mappedData[dbField] = data[csvColumn];
        }
      }
      
      // Include unmapped fields as well
      for (const [key, value] of Object.entries(data)) {
        if (!columnMap[key] && !mappedData[key]) {
          mappedData[key] = value;
        }
      }
      
      return {
        rowNumber,
        data: mappedData
      };
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Detect CSV delimiter
 * @param {String} csvString - CSV string to analyze
 * @returns {String} Detected delimiter
 */
const detectDelimiter = (csvString) => {
  const delimiters = [',', ';', '\t', '|'];
  // Normalize line endings and strip BOM
  const normalized = csvString.replace(/^\uFEFF/, '');
  const lines = normalized.split(/\r?\n/).slice(0, 5);
  const counts = delimiters.map((d) => ({ d, c: 0 }));
  for (const line of lines) {
    for (const item of counts) {
      const regex = new RegExp(`\\${item.d}`, 'g');
      const m = line.match(regex);
      item.c += m ? m.length : 0;
    }
  }
  counts.sort((a, b) => b.c - a.c);
  const best = counts[0];
  return best && best.c > 0 ? best.d : ','; // default to comma
};

/**
 * Extract headers from CSV
 * @param {Buffer|String} data - CSV data
 * @returns {Promise<Array>} Array of header names
 */
const extractHeaders = async (data) => {
  try {
    // Normalize and strip BOM
    const csvString = data.toString().replace(/^\uFEFF/, '');
    const delimiter = detectDelimiter(csvString);
    const firstLine = csvString.split(/\r?\n/)[0] || '';
    
    // Parse headers considering quotes
    const headers = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < firstLine.length; i++) {
      const char = firstLine[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        headers.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    // Add last header (also trim trailing CR)
    if (current.length > 0) {
      headers.push(current.replace(/\r$/, '').trim().replace(/^"|"$/g, ''));
    }
    return headers;
  } catch (error) {
    throw new Error(`Failed to extract headers: ${error.message}`);
  }
};

/**
 * Preview CSV data (first N rows)
 * @param {Buffer|String} data - CSV data
 * @param {Number} limit - Number of rows to preview
 * @returns {Promise<Object>} Preview data with headers and rows
 */
const previewCSV = async (data, limit = 10) => {
  try {
    const headers = await extractHeaders(data);
    const rows = await parseCSV(data);
    
    return {
      headers,
      rows: rows.slice(0, limit),
      totalRows: rows.length,
      hasMore: rows.length > limit
    };
  } catch (error) {
    throw new Error(`Failed to preview CSV: ${error.message}`);
  }
};

module.exports = {
  parseCSV,
  parseCSVWithMapping,
  detectDelimiter,
  extractHeaders,
  previewCSV
};