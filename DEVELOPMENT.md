# RebelX V3 Development Guide

This guide provides comprehensive information for developers working on the RebelX V3 application.

## 📁 Project Structure

```
rebelx-v3/
│
├── client/                      # Frontend React Application
│   ├── public/                  # Static assets
│   │   ├── favicon.ico         # Application icon
│   │   └── index.html          # HTML template
│   │
│   ├── src/                    # Source code
│   │   ├── components/         # React components
│   │   │   ├── ui/            # Reusable UI components
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Select.tsx
│   │   │   │   ├── DataTable.tsx
│   │   │   │   └── Toast.tsx
│   │   │   │
│   │   │   ├── clients/       # Client-specific components
│   │   │   │   ├── ClientCard.tsx
│   │   │   │   ├── ClientForm.tsx
│   │   │   │   ├── ClientList.tsx
│   │   │   │   └── ClientDetails.tsx
│   │   │   │
│   │   │   ├── users/         # User management components
│   │   │   │   ├── UserForm.tsx
│   │   │   │   ├── UserList.tsx
│   │   │   │   └── UserProfile.tsx
│   │   │   │
│   │   │   ├── kanban/        # Kanban board components
│   │   │   │   ├── KanbanBoard.tsx
│   │   │   │   ├── KanbanColumn.tsx
│   │   │   │   └── KanbanCard.tsx
│   │   │   │
│   │   │   ├── payments/      # Payment components
│   │   │   │   ├── PaymentForm.tsx
│   │   │   │   ├── PaymentHistory.tsx
│   │   │   │   └── PaymentMethodList.tsx
│   │   │   │
│   │   │   ├── import-export/ # Import/Export components
│   │   │   │   ├── CSVImporter.tsx
│   │   │   │   └── CSVExporter.tsx
│   │   │   │
│   │   │   ├── Layout.tsx     # Main layout wrapper
│   │   │   ├── Header.tsx     # Application header
│   │   │   ├── Sidebar.tsx    # Navigation sidebar
│   │   │   └── UserMenu.tsx   # User dropdown menu
│   │   │
│   │   ├── contexts/          # React contexts
│   │   │   ├── AuthContext.tsx
│   │   │   ├── ThemeContext.tsx
│   │   │   └── NotificationContext.tsx
│   │   │
│   │   ├── hooks/             # Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useApi.ts
│   │   │   ├── useDebounce.ts
│   │   │   ├── usePagination.ts
│   │   │   └── useLocalStorage.ts
│   │   │
│   │   ├── pages/             # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Clients.tsx
│   │   │   ├── Users.tsx
│   │   │   ├── Kanban.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── Settings.tsx
│   │   │   └── Login.tsx
│   │   │
│   │   ├── services/          # API service functions
│   │   │   ├── api.ts        # Base API configuration
│   │   │   ├── auth.service.ts
│   │   │   ├── client.service.ts
│   │   │   ├── user.service.ts
│   │   │   ├── activity.service.ts
│   │   │   └── payment.service.ts
│   │   │
│   │   ├── types/             # TypeScript type definitions
│   │   │   ├── index.ts
│   │   │   ├── user.types.ts
│   │   │   ├── client.types.ts
│   │   │   ├── activity.types.ts
│   │   │   └── payment.types.ts
│   │   │
│   │   ├── utils/             # Utility functions
│   │   │   ├── constants.ts
│   │   │   ├── helpers.ts
│   │   │   ├── validators.ts
│   │   │   ├── formatters.ts
│   │   │   └── cn.ts         # Class name utility
│   │   │
│   │   ├── App.tsx           # Main App component
│   │   ├── main.tsx          # Application entry point
│   │   └── index.css         # Global styles
│   │
│   ├── .env.example          # Environment variables template
│   ├── .gitignore
│   ├── package.json
│   ├── tsconfig.json         # TypeScript configuration
│   ├── vite.config.ts        # Vite configuration
│   ├── tailwind.config.js    # Tailwind CSS configuration
│   └── postcss.config.js     # PostCSS configuration
│
├── server/                    # Backend Node.js Application
│   ├── controllers/          # Route controllers
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── client.controller.js
│   │   ├── activity.controller.js
│   │   └── payment.controller.js
│   │
│   ├── middleware/           # Express middleware
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   ├── validation.middleware.js
│   │   └── rateLimiter.middleware.js
│   │
│   ├── models/              # Mongoose models
│   │   ├── User.js
│   │   ├── Client.js
│   │   └── Activity.js
│   │
│   ├── routes/              # API routes
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── client.routes.js
│   │   ├── activity.routes.js
│   │   └── payment.routes.js
│   │
│   ├── scripts/             # Utility scripts
│   │   └── seed.js         # Database seeding script
│   │
│   ├── services/            # Business logic services
│   │   ├── email.service.js
│   │   ├── stripe.service.js
│   │   ├── csv.service.js
│   │   └── analytics.service.js
│   │
│   ├── templates/           # Email templates
│   │   ├── welcome.html
│   │   ├── reset-password.html
│   │   └── invoice.html
│   │
│   ├── utils/               # Utility functions
│   │   ├── database.js     # Database connection
│   │   ├── logger.js       # Logging utility
│   │   ├── validators.js   # Input validators
│   │   └── helpers.js      # Helper functions
│   │
│   ├── .env.example        # Environment variables template
│   ├── .gitignore
│   ├── index.js            # Server entry point
│   └── package.json
│
├── README.md               # Project overview
├── API_DOCUMENTATION.md    # API documentation
├── DEPLOYMENT.md          # Deployment guide
├── DEVELOPMENT.md         # This file
└── FEATURES.md           # Feature documentation
```

---

## 🏗️ Architecture Overview

### Frontend Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Application                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │    Pages     │  │  Components  │  │   Services   │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                  │                  │         │
│  ┌──────▼──────────────────▼──────────────────▼──────┐ │
│  │                  State Management                  │ │
│  │              (Context API + Hooks)                 │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │                   API Layer (Axios)                │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Backend Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Express Application                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Routes     │──│ Controllers  │──│   Services   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │                    Middleware                      │ │
│  │  (Auth, Validation, Error Handling, Rate Limit)   │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │                 Database Layer                     │ │
│  │              (Mongoose + MongoDB)                  │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Development Setup

### Prerequisites
- Node.js v16+ and npm v7+
- MongoDB v5+ (local or Atlas)
- Git
- VS Code (recommended)

### Initial Setup

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/rebelx-v3.git
cd rebelx-v3
```

2. **Install dependencies:**
```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

3. **Environment configuration:**

Backend (.env):
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/rebelx-v3-dev
JWT_SECRET=your-development-jwt-secret
STRIPE_SECRET_KEY=sk_test_your_test_key
CLIENT_URL=http://localhost:5173
```

Frontend (.env):
```env
VITE_API_URL=http://localhost:5000/api
VITE_STRIPE_PUBLIC_KEY=pk_test_your_test_key
```

4. **Seed the database:**
```bash
cd server
npm run seed
```

5. **Start development servers:**
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

---

## 💻 Coding Standards

### TypeScript/JavaScript Style Guide

#### Naming Conventions
```typescript
// Components - PascalCase
const UserProfile = () => { };

// Functions - camelCase
const calculateTotal = () => { };

// Constants - UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;

// Interfaces/Types - PascalCase with 'I' or 'T' prefix
interface IUser {
  id: string;
  name: string;
}

type TStatus = 'active' | 'inactive';

// Files
// Components: UserProfile.tsx
// Services: user.service.ts
// Types: user.types.ts
// Utils: formatters.ts
```

#### Code Organization
```typescript
// 1. Imports (grouped and ordered)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Input } from '@/components/ui';
import { UserCard } from '@/components/users';

import { userService } from '@/services';
import { IUser } from '@/types';
import { formatDate } from '@/utils';

// 2. Type definitions
interface Props {
  userId: string;
}

// 3. Component
const UserProfile: React.FC<Props> = ({ userId }) => {
  // 4. State
  const [user, setUser] = useState<IUser | null>(null);
  
  // 5. Hooks
  const navigate = useNavigate();
  
  // 6. Effects
  useEffect(() => {
    fetchUser();
  }, [userId]);
  
  // 7. Functions
  const fetchUser = async () => {
    const data = await userService.getById(userId);
    setUser(data);
  };
  
  // 8. Render
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};

export default UserProfile;
```

### React Best Practices

#### Component Structure
```typescript
// Functional component with TypeScript
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  onClick,
  children
}) => {
  return (
    <button
      className={cn(
        'base-styles',
        variants[variant],
        sizes[size]
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
```

#### Custom Hooks
```typescript
// hooks/useApi.ts
export const useApi = <T>(url: string) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(url);
      setData(response.data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [url]);

  return { data, loading, error, fetch };
};
```

### Backend Best Practices

#### Controller Pattern
```javascript
// controllers/user.controller.js
const userController = {
  // GET /users
  async getAll(req, res, next) {
    try {
      const { page = 1, limit = 20, ...filters } = req.query;
      const users = await userService.findAll(filters, { page, limit });
      
      res.json({
        success: true,
        data: users,
        pagination: {
          page,
          limit,
          total: users.total
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /users
  async create(req, res, next) {
    try {
      const user = await userService.create(req.body);
      res.status(201).json({
        success: true,
        data: user,
        message: 'User created successfully'
      });
    } catch (error) {
      next(error);
    }
  }
};
```

#### Service Pattern
```javascript
// services/user.service.js
class UserService {
  async findAll(filters, pagination) {
    const query = this.buildQuery(filters);
    const users = await User.find(query)
      .limit(pagination.limit)
      .skip((pagination.page - 1) * pagination.limit)
      .sort('-createdAt');
    
    const total = await User.countDocuments(query);
    
    return {
      users,
      total,
      pages: Math.ceil(total / pagination.limit)
    };
  }

  buildQuery(filters) {
    const query = {};
    
    if (filters.role) query.role = filters.role;
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      query.$or = [
        { name: new RegExp(filters.search, 'i') },
        { email: new RegExp(filters.search, 'i') }
      ];
    }
    
    return query;
  }
}

module.exports = new UserService();
```

---

## 🧪 Testing Guidelines

### Frontend Testing

#### Component Testing
```typescript
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant styles', () => {
    render(<Button variant="secondary">Button</Button>);
    const button = screen.getByText('Button');
    expect(button).toHaveClass('secondary-styles');
  });
});
```

#### Service Testing
```typescript
// user.service.test.ts
import { userService } from './user.service';
import { api } from './api';

jest.mock('./api');

describe('UserService', () => {
  it('fetches users successfully', async () => {
    const mockUsers = [{ id: '1', name: 'John' }];
    (api.get as jest.Mock).mockResolvedValue({ data: mockUsers });

    const users = await userService.getAll();
    
    expect(api.get).toHaveBeenCalledWith('/users');
    expect(users).toEqual(mockUsers);
  });

  it('handles errors', async () => {
    (api.get as jest.Mock).mockRejectedValue(new Error('Network error'));

    await expect(userService.getAll()).rejects.toThrow('Network error');
  });
});
```

### Backend Testing

#### Unit Testing
```javascript
// user.controller.test.js
const request = require('supertest');
const app = require('../index');
const User = require('../models/User');

describe('User Controller', () => {
  describe('GET /api/users', () => {
    it('returns all users', async () => {
      const mockUsers = [
        { email: 'test@example.com', name: 'Test User' }
      ];
      
      jest.spyOn(User, 'find').mockResolvedValue(mockUsers);

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUsers);
    });

    it('requires authentication', async () => {
      const response = await request(app).get('/api/users');
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });
});
```

#### Integration Testing
```javascript
// integration.test.js
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../index');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('User Registration Flow', () => {
  it('completes full registration process', async () => {
    // 1. Register user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        name: 'New User'
      });

    expect(registerResponse.status).toBe(201);
    const { token } = registerResponse.body.data;

    // 2. Access protected route
    const profileResponse = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.data.email).toBe('newuser@example.com');
  });
});
```

---

## 🔄 Git Workflow

### Branch Strategy
```
main
├── develop
│   ├── feature/user-authentication
│   ├── feature/payment-integration
│   └── feature/csv-import
├── hotfix/critical-bug
└── release/v1.0.0
```

### Commit Convention
```bash
# Format: <type>(<scope>): <subject>

feat(auth): add JWT refresh token support
fix(client): resolve status update bug
docs(api): update endpoint documentation
style(ui): improve button hover states
refactor(services): optimize database queries
test(user): add unit tests for controller
chore(deps): update dependencies
```

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added where necessary
- [ ] Documentation updated
- [ ] No console.logs left
```

---

## 🐛 Debugging

### Frontend Debugging

#### React DevTools
```javascript
// Enable React DevTools Profiler
if (process.env.NODE_ENV === 'development') {
  if (typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined') {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__.supportsFiber = true;
  }
}
```

#### Debug Logging
```typescript
// utils/logger.ts
export const logger = {
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEBUG]', ...args);
    }
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
    // Send to error tracking service in production
  }
};
```

### Backend Debugging

#### Debug Configuration (VS Code)
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/server/index.js",
      "envFile": "${workspaceFolder}/server/.env",
      "console": "integratedTerminal"
    }
  ]
}
```

#### Logging Strategy
```javascript
// utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Usage
logger.info('Server started', { port: 5000 });
logger.error('Database connection failed', { error: err.message });
```

---

## 📊 State Management

### Context Pattern
```typescript
// contexts/AuthContext.tsx
interface AuthContextType {
  user: IUser | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials);
    setUser(response.user);
    localStorage.setItem('token', response.token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

---

## 🔧 Configuration Files

### TypeScript Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### ESLint Configuration
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['react', '@typescript-eslint', 'react-hooks'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }]
  }
};
```

### Prettier Configuration
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

---

## 🚀 Performance Optimization

### Frontend Optimization

#### Code Splitting
```typescript
// Lazy load routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Clients = lazy(() => import('./pages/Clients'));

// Use Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/clients" element={<Clients />} />
  </Routes>
</Suspense>
```

#### Memoization
```typescript
// Memoize expensive computations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Memoize callbacks
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// Memoize components
const MemoizedComponent = memo(({ data }) => {
  return <div>{data}</div>;
});
```

### Backend Optimization

#### Database Queries
```javascript
// Use lean() for read-only queries
const users = await User.find().lean();

// Use select() to limit fields
const clients = await Client.find()
  .select('name email contactStatus')
  .lean();

// Use indexes effectively
clientSchema.index({ contactStatus: 1, createdAt: -1 });

// Use aggregation for complex queries
const stats = await Client.aggregate([
  { $match: { contactStatus: 'Customer' } },
  { $group: {
    _id: '$industry',
    count: { $sum: 1 },
    totalRevenue: { $sum: '$forecastedAmount' }
  }}
]);
```

---

## 📚 Resources

### Documentation
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [MongoDB Manual](https://docs.mongodb.com/manual/)
- [Stripe Documentation](https://stripe.com/docs)

### Tools
- [VS Code](https://code.visualstudio.com/)
- [Postman](https://www.postman.com/)
- [MongoDB Compass](https://www.mongodb.com/products/compass)
- [React DevTools](https://react.dev/learn/react-developer-tools)

### Learning Resources
- [React Patterns](https://reactpatterns.com/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)

---

## 🤝 Contributing

Please read our contributing guidelines before submitting PRs:

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

**Last Updated:** January 2024
**Version:** 1.0.0