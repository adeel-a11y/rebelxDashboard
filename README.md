# RebelX V3 - Modern CRM & Sales Management Platform

A comprehensive Customer Relationship Management (CRM) system built with modern web technologies, featuring real-time updates, advanced analytics, and seamless payment processing.

## 🚀 Features

### Core CRM Functionality
- **Client Management**: Complete client lifecycle management from lead to customer
- **Contact Status Tracking**: New, Attempted, Contacted, Qualified, Unqualified, Customer
- **Activity Logging**: Track all client interactions including calls, emails, meetings, and notes
- **User Management**: Role-based access control (Admin, Manager, Employee)
- **Department Organization**: Organize users by departments

### Advanced Features
- **Kanban Board**: Visual pipeline management with drag-and-drop functionality
- **Payment Processing**: Secure payment vault with Stripe integration
- **CSV Import/Export**: Bulk data operations for client management
- **Real-time Search**: Instant search across all client data
- **Advanced Filtering**: Multi-criteria filtering for precise data access
- **Activity Timeline**: Complete history of all client interactions

### Analytics & Reporting
- **Dashboard Analytics**: Real-time metrics and KPIs
- **Sales Forecasting**: Revenue projections based on pipeline data
- **Activity Reports**: Team performance and interaction metrics
- **Status Distribution**: Visual representation of pipeline health

## 🛠️ Technology Stack

### Frontend
- **React 18**: Modern React with hooks and functional components
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **Axios**: HTTP client for API communication
- **React Beautiful DnD**: Drag-and-drop for Kanban boards
- **Chart.js**: Data visualization

### Backend
- **Node.js**: JavaScript runtime
- **Express.js**: Web application framework
- **MongoDB**: NoSQL database for flexible data storage
- **Mongoose**: MongoDB object modeling
- **JWT**: Secure authentication
- **Bcrypt**: Password hashing
- **Stripe API**: Payment processing
- **Multer**: File upload handling
- **CSV Parser**: CSV file processing

### Development Tools
- **Vite**: Fast build tool and development server
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Nodemon**: Auto-restart for development

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v16.0.0 or higher)
- **npm** (v7.0.0 or higher) or **yarn**
- **MongoDB** (v5.0 or higher) - Local or MongoDB Atlas
- **Git** for version control

## 🔧 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/rebelx-v3.git
cd rebelx-v3
```

### 2. Install Backend Dependencies
```bash
cd server
npm install
```

### 3. Install Frontend Dependencies
```bash
cd ../client
npm install
```

### 4. Environment Configuration

#### Backend Environment Variables
Create a `.env` file in the `server` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/rebelx-v3
# For MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rebelx-v3

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# CORS Configuration
CLIENT_URL=http://localhost:5173
```

#### Frontend Environment Variables
Create a `.env` file in the `client` directory:

```env
# API Configuration
VITE_API_URL=http://localhost:5000/api

# Stripe Public Key
VITE_STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key

# Application Settings
VITE_APP_NAME=RebelX V3
VITE_APP_VERSION=1.0.0
```

## 🚀 Running the Application

### Development Mode

#### 1. Seed the Database (Optional but Recommended)
```bash
cd server
npm run seed
```
This will create sample users, clients, and activities for testing.

#### 2. Start the Backend Server
```bash
cd server
npm run dev
```
The server will start on `http://localhost:5000`

#### 3. Start the Frontend Development Server
In a new terminal:
```bash
cd client
npm run dev
```
The application will open at `http://localhost:5173`

### Production Mode

#### Backend
```bash
cd server
npm start
```

#### Frontend
```bash
cd client
npm run build
npm run preview
```

## 🔐 Default Login Credentials

After running the seed script, you can use these credentials:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rebelx.com | admin123 |
| Manager | manager1@rebelx.com | manager123 |
| Employee | employee1@rebelx.com | employee123 |

## 📁 Project Structure

```
rebelx-v3/
├── client/                 # Frontend React application
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── ui/       # Reusable UI components
│   │   │   ├── clients/  # Client-related components
│   │   │   ├── users/    # User management components
│   │   │   ├── kanban/   # Kanban board components
│   │   │   └── payments/ # Payment components
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service functions
│   │   ├── types/         # TypeScript type definitions
│   │   └── utils/         # Utility functions
│   └── package.json
│
├── server/                 # Backend Node.js application
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Express middleware
│   ├── models/           # Mongoose models
│   ├── routes/           # API routes
│   ├── scripts/          # Utility scripts (seed, etc.)
│   ├── services/         # Business logic services
│   ├── templates/        # Email templates
│   ├── utils/            # Utility functions
│   ├── index.js          # Server entry point
│   └── package.json
│
└── README.md              # This file
```

## 🧪 Testing

### Test Payment Cards
Use these Stripe test card numbers:

| Card Type | Number | CVC | Date |
|-----------|--------|-----|------|
| Visa | 4242 4242 4242 4242 | Any 3 digits | Any future date |
| Mastercard | 5555 5555 5555 4444 | Any 3 digits | Any future date |
| American Express | 3782 822463 10005 | Any 4 digits | Any future date |

### API Testing
Use Postman or Insomnia to test API endpoints. Import the API documentation for complete endpoint details.

### Sample CSV Format
For bulk client import:
```csv
name,email,phone,city,state,industry,contactStatus
"Acme Corp","contact@acme.com","555-0100","New York","NY","Technology","New"
"Global Inc","info@global.com","555-0200","Los Angeles","CA","Finance","Qualified"
```

## 🔒 Security Considerations

1. **Environment Variables**: Never commit `.env` files to version control
2. **JWT Secrets**: Use strong, unique secrets in production
3. **Password Policy**: Implement strong password requirements
4. **HTTPS**: Always use HTTPS in production
5. **Rate Limiting**: Implement rate limiting for API endpoints
6. **Input Validation**: All inputs are validated and sanitized
7. **Payment Security**: Only tokenized payment data is stored (PCI compliant)

## 🚢 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions including:
- MongoDB Atlas setup
- Heroku deployment
- Vercel deployment
- Docker containerization
- CI/CD pipeline setup

## 📊 Performance Optimization

- **Database Indexing**: Optimized queries with proper indexes
- **Caching**: Implement Redis for session and data caching
- **Code Splitting**: Lazy loading for optimal bundle sizes
- **Image Optimization**: Compressed and properly sized images
- **API Pagination**: Efficient data loading with pagination

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style
- Follow ESLint configuration
- Use Prettier for formatting
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Email: support@rebelx.com
- Documentation: [docs.rebelx.com](https://docs.rebelx.com)

## 🙏 Acknowledgments

- React team for the amazing framework
- MongoDB team for the flexible database
- Stripe for secure payment processing
- All contributors and open-source projects that made this possible

---

**Built with ❤️ by the RebelX Team**