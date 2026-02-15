-- Cars table schema
CREATE TABLE cars (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    color VARCHAR(50),
    model VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(100) NOT NULL,
    price DECIMAL(12, 2),
    year_creation INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
