-- Create tables for Health Files Management System

CREATE TABLE IF NOT EXISTS states (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code INTEGER UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS file_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- 'Surgery', 'IVF', 'Eye', 'Labs'
    display_name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS records (
    id SERIAL PRIMARY KEY,
    state_id INTEGER REFERENCES states(id) ON DELETE CASCADE,
    file_type_id INTEGER REFERENCES file_types(id) ON DELETE CASCADE,
    employee_name VARCHAR(255) NOT NULL,
    postal_account VARCHAR(50),
    amount DECIMAL(15, 2) NOT NULL, -- Currency
    treatment_date TIMESTAMP WITH TIME ZONE NOT NULL, -- Stored in UTC
    status VARCHAR(50) DEFAULT 'completed',
    notes TEXT,
    user_id INTEGER REFERENCES users(id), -- The Employee who created it
    manager_id INTEGER REFERENCES users(id), -- The Manager of that Employee
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for searching and filtering
CREATE INDEX IF NOT EXISTS idx_records_state_file ON records(state_id, file_type_id);
CREATE INDEX IF NOT EXISTS idx_records_treatment_date ON records(treatment_date);
CREATE INDEX IF NOT EXISTS idx_records_employee_name ON records(employee_name);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(50) DEFAULT 'manager',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
