# Health Files Management System

A comprehensive, full-stack cloud application designed to digitize and manage health records across 60 Wilayas (States) in Algeria. This system provides interactive data management, secure user authentication, and real-time analytics.

---

## 🚀 How It Works ("The Architecture")

This project allows Medical Managers and Administrators to track files (Surgery, IVF, Ophthalmology, Radiology) efficiently.

### 1. Frontend (The User Interface)
*   **Built with**: React.js (Vite), Tailwind CSS, Lucide Icons, Recharts.
*   **Key Logic**:
    *   **SPA Routing**: Uses React Router for seamless navigation between States, File Lists, and Analytics.
    *   **API Layer**: A centralized `api.js` manages all Backend communication, automatically handling Token Authentication and Production URLs (`/api` prefixing).
    *   **Visuals**: Fully responsive design with Dark Mode support and animated transitions.

### 2. Backend (The Brain)
*   **Built with**: Node.js, Express.js.
*   **Key Logic**:
    *   **REST API**: Structured endpoints (`GET`, `POST`, `DELETE`, `PUT`) handling data requests.
    *   **Security**: Implements **JWT (JSON Web Tokens)** for secure, stateless authentication.
    *   **Data Isolation**: Custom middleware ensures users only see *their* own data, while Admins see everything.

### 3. Database (The Memory)
*   **Built with**: PostgreSQL (Hosted on Neon.tech).
*   **Key Logic**:
    *   **Relational Schema**: Efficiently links `Records` to `States`, `FileTypes`, and `Users` using Foreign Keys.
    *   **Optimized Queries**: Uses SQL Joins and Aggregations to calculate dashboard stats instantly.

---

## 🧠 Skills & Technologies Learned

building this project involved mastering critical Full-Stack concepts:

### 🌐 Cloud Deployment & DevOps
*   **CORS Management**: Learned to configure Cross-Origin Resource Sharing to allow our Vercel frontend to talk to our Render backend securely.
*   **SPA Routing in Production**: Solved the "White Screen" 404 issue by configuring `vercel.json` to handle client-side routing.
*   **Environment Variables**: Managed Secrets (`DB_URL`, `JWT_SECRET`) safely across Local and Cloud environments.

### 🛡️ Backend Security
*   **Authentication Flow**: Implemented Login/Register systems with `bcrypt` password hashing.
*   **Middleware Patterns**: Created custom Express middleware to protecting routes (`authenticateToken`).
*   **Database Constraints**: Used SQL constraints to prevent duplicate data and ensure data integrity.

### 🎨 Frontend Engineering
*   **State Management**: Handled complex async data fetching with React Hooks (`useEffect`, `useState`).
*   **Data Visualization**: Integrated **Recharts** to build dynamic bar charts for health analytics.
*   **Optimistic UI**: Implemented "Optimistic Updates" to make the app feel instant even on slow networks.

---

## 🛠️ Project Setup

### Prerequisites
*   Node.js (v18+)
*   PostgreSQL (Local or Cloud)

### 1. Backend Setup
```bash
cd backend
npm install
# Create a .env file with DATABASE_URL and JWT_SECRET
node server.js
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Database Initialization
Run the provided SQL scripts in your SQL Editor (Neon/PgAdmin):
1.  `deployment/schema.sql` (Creates Tables)
2.  `deployment/seed.sql` (Inserts Initial Data)

---

## ✨ Key Features
*   **Role-Based Access**: Managers vs. Admins.
*   **Interactive Analytics**: Visual breakdown of records by Wilaya.
*   **Search & Filter**: Instantly find patient records by name or notes.
*   **Secure & Private**: Sandbox environment where data is strictly isolated per user.
