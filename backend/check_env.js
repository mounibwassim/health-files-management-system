require('dotenv').config();
console.log("Current Directory:", process.cwd());
console.log("DATABASE_URL length:", (process.env.DATABASE_URL || '').length);
console.log("DATABASE_URL starts with:", (process.env.DATABASE_URL || '').substring(0, 10));
