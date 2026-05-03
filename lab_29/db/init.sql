CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL,
    department VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO users (name, email, role, department) VALUES
    ('Alice Johnson',  'alice@example.com',  'Admin',       'Engineering'),
    ('Bob Smith',      'bob@example.com',    'Developer',   'Engineering'),
    ('Carol White',    'carol@example.com',  'Designer',    'Product'),
    ('David Brown',    'david@example.com',  'Developer',   'Engineering'),
    ('Eve Davis',      'eve@example.com',    'Manager',     'Operations'),
    ('Frank Miller',   'frank@example.com',  'Developer',   'Engineering'),
    ('Grace Wilson',   'grace@example.com',  'QA Engineer', 'Quality'),
    ('Henry Moore',    'henry@example.com',  'DevOps',      'Infrastructure'),
    ('Iris Taylor',    'iris@example.com',   'Analyst',     'Finance'),
    ('Jack Anderson',  'jack@example.com',   'Developer',   'Engineering');
