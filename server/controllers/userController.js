const User = require('../models/User');
const { validationResult } = require('express-validator');
const fs = require('fs').promises;
const path = require('path');
const { parseCSV, previewCSV } = require('../utils/csvParser');
const { generateUsersCSV, generateUsersTemplate } = require('../utils/csvGenerator');
const { validateCSVFile, batchValidateUsers } = require('../utils/csvValidator');
const Activity = require('../models/Activity');

// List all users with pagination and filtering
const listUsers = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      role,
      status,
      department,
      search
    } = req.query;

    // Build query
    const query = {};
    
    if (role) {
      query.role = role;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (department) {
      query.department = department;
    }
    
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { department: new RegExp(search, 'i') }
      ];
    }

    // Calculate pagination
    const limit = parseInt(pageSize);
    const skip = (parseInt(page) - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Execute query
    const [users, totalCount] = await Promise.all([
      User.find(query)
        .sort(sort)
        .limit(limit)
        .skip(skip),
      User.countDocuments(query)
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      users,
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
    console.error('List users error:', error);
    res.status(500).json({ 
      message: 'Error fetching users', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

// Get single user by ID
const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      message: 'Error fetching user', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

// Update user
const updateUser = async (req, res) => {
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
    const updates = req.body;

    // Prevent updating certain fields
    delete updates._id;
    delete updates.email; // Email is the primary key, shouldn't be changed
    delete updates.password; // Password should be updated through a separate endpoint
    delete updates.createdAt;
    delete updates.updatedAt;

    const user = await User.findByIdAndUpdate(
      id,
      updates,
      { 
        new: true, 
        runValidators: true 
      }
    );

    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    res.json({
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ 
      message: 'Error updating user', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

// Delete user (soft delete by setting status to inactive)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    // Prevent deleting yourself
    if (user._id === req.userId) {
      return res.status(400).json({ 
        message: 'You cannot delete your own account' 
      });
    }

    // Soft delete by setting status to inactive
    user.status = 'inactive';
    await user.save();

    res.json({
      message: 'User deactivated successfully',
      user
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      message: 'Error deleting user', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

// Import users from CSV with enhanced validation
const importUsers = async (req, res) => {
  let filePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'No CSV file uploaded'
      });
    }

    filePath = req.file.path;
    const fileBuffer = await fs.readFile(filePath);

    // Validate CSV file
    const fileValidation = validateCSVFile(fileBuffer);
    if (!fileValidation.isValid) {
      await fs.unlink(filePath);
      return res.status(400).json({
        message: 'Invalid CSV file',
        errors: fileValidation.errors,
        warnings: fileValidation.warnings
      });
    }

    // Parse CSV data
    const parsedData = await parseCSV(fileBuffer);
    
    // Validate all rows
    const validation = await batchValidateUsers(parsedData);
    
    // If skipInvalid option is not set and there are invalid rows, return error
    const skipInvalid = req.body?.skipInvalid === 'true' || req.query?.skipInvalid === 'true';
    if (!skipInvalid && validation.invalidCount > 0) {
      await fs.unlink(filePath);
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
          errors: row.errors,
          warnings: row.warnings
        }))
      });
    }

    // Process valid rows
    const results = [];
    const errors = [];
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = skipInvalid ? validation.invalidCount : 0;

    for (const validRow of validation.validRows) {
      try {
        // Create new user
        const user = new User(validRow.data);
        await user.save();

        // Log activity
        if (Activity) {
          try {
            await Activity.logUserAction(
              req.userId || 'system',
              'user_imported',
              user._id,
              `User ${user.name} imported via CSV`
            );
          } catch (activityError) {
            console.error('Activity logging error:', activityError);
          }
        }

        results.push({
          row: validRow.rowNumber,
          email: user.email,
          name: user.name,
          status: 'success'
        });
        successCount++;
      } catch (error) {
        errors.push({
          row: validRow.rowNumber,
          email: validRow.data.email,
          error: error.message
        });
        errorCount++;
      }
    }

    // Add skipped invalid rows to errors if skipInvalid is true
    if (skipInvalid && validation.invalidRows.length > 0) {
      validation.invalidRows.forEach(row => {
        errors.push({
          row: row.rowNumber,
          email: row.data?.email || 'N/A',
          error: row.errors.join('; '),
          skipped: true
        });
      });
    }

    // Clean up uploaded file
    await fs.unlink(filePath);

    res.json({
      message: 'CSV import completed',
      summary: {
        totalProcessed: validation.totalRows,
        successful: successCount,
        failed: errorCount,
        skipped: skippedCount
      },
      results,
      errors,
      warnings: validation.rowsWithWarnings.map(row => ({
        row: row.rowNumber,
        warnings: row.warnings
      }))
    });
  } catch (error) {
    console.error('Import users error:', error);
    
    // Clean up uploaded file if it exists
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    
    res.status(500).json({
      message: 'Error importing users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Preview CSV before import
const previewUsersCSV = async (req, res) => {
  let filePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'No CSV file uploaded'
      });
    }

    filePath = req.file.path;
    const fileBuffer = await fs.readFile(filePath);

    // Validate CSV file
    const fileValidation = validateCSVFile(fileBuffer);
    if (!fileValidation.isValid) {
      await fs.unlink(filePath);
      return res.status(400).json({
        message: 'Invalid CSV file',
        errors: fileValidation.errors,
        warnings: fileValidation.warnings
      });
    }

    // Preview CSV data
    const preview = await previewCSV(fileBuffer, 10);
    
    // Validate preview rows
    const validation = await batchValidateUsers(preview.rows);

    // Clean up uploaded file
    await fs.unlink(filePath);

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
      }
    });
  } catch (error) {
    console.error('Preview users CSV error:', error);
    
    // Clean up uploaded file if it exists
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    
    res.status(500).json({
      message: 'Error previewing CSV',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Export users to CSV with enhanced options
const exportUsers = async (req, res) => {
  try {
    const {
      role,
      status,
      department,
      search,
      dateFormat = 'ISO',
      includeMetadata = false,
      exportAll = 'false'
    } = req.query;

    // Build query
    const query = {};
    
    if (role) {
      query.role = role;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (department) {
      query.department = department;
    }
    
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { department: new RegExp(search, 'i') }
      ];
    }

    // Fetch users
    const users = await User.find(query).sort({ createdAt: -1 });

    // Generate CSV using the utility
    const csvContent = await generateUsersCSV(users, {
      includePassword: false,
      dateFormat,
      includeMetadata: includeMetadata === 'true'
    });

    // Set response headers for CSV download
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="users_export_${timestamp}.csv"`);

    res.send(csvContent);
  } catch (error) {
    console.error('Export users error:', error);
    res.status(500).json({
      message: 'Error exporting users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Download users CSV template
const downloadUsersTemplate = async (req, res) => {
  try {
    const csvContent = await generateUsersTemplate();
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="users_import_template.csv"');
    
    res.send(csvContent);
  } catch (error) {
    console.error('Download users template error:', error);
    res.status(500).json({
      message: 'Error generating template',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  importUsers,
  exportUsers,
  previewUsersCSV,
  downloadUsersTemplate
};