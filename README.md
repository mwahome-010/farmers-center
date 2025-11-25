# About this project

Farmer's Center is a web application designed to help farmers identify and manage plant diseases.
The application provides educational resources about various crops, common plant diseases, and a community forum for discussions.

## Prerequisites
1. MariaDB/MySQL
2. Node.js
3. npm
4. Git
5. Text Editor (preferrably VS Code)

## Installation
1. Clone the repo
    >##### git clone https://github.com/mwahome-010/farmers-center.git
    >##### Extract and open the project folder with your IDE
2. Install Dependencies
    >##### On VS CODE, open the terminal and type `cd backend`
    >##### then, `npm install`

## Configuration
1. While still on the directory `/farmers-center/backend`, create a `.env` file
2. Add the following to the .env file:
    ### #Server Configuration
    >PORT=3000
    
    ### #Database Configuration
    >DB_HOST=localhost
    >DB_USER=your_database_username
    >DB_PASSWORD=your_database_password
    >DB_NAME=your_database_name
    
    ### #Session Configuration
    >SESSION_SECRET=your_random_session_secret_here
    
    ### #Google Generative AI
    >API_KEY=your_google_generative_ai_api_key
    
    ### #Prompt for Gemini
    >PROMPT=`Analyze this plant image and identify the plant species and any diseases present. Provide the plant name, disease names (or     'Healthy' if no disease), confidence probabilities, and specific remedies for each detected condition. Return the analysis strictly in the requested JSON format.`

## Obtaining API Keys
1. Visit Google AI Studio (https://ai.google.dev/aistudio)
2. Sign in with your Google account.
3. Head to the dashboard and click 'Create API Key'
4. Copy the API Key and in your `.env` file, replace 'your_google_generative_ai_api_key'

## Generate Session Secret
1. On the terminal type the following command: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Copy the output to your `.env` file and replace 'your_random_session_secret'.

## DATABASE SETUP
1. Create Database
    > ##### CREATE DATABASE farmers_center;
    > ##### USE farmers_center;

2. Create Tables
    #### Users Table
    >CREATE TABLE users (
   id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    #### Categories
    >CREATE TABLE categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL
    );

    #### Insert default categories
    >INSERT INTO categories (name) VALUES 
    ('pests'), 
    ('diseases'), 
    ('fertilizers'), 
    ('markets');

    #### Posts table
    >CREATE TABLE posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        category_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        image_path VARCHAR(500),
        status ENUM('unanswered', 'answered') DEFAULT 'unanswered',
        views INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    #### Comments table
    >CREATE TABLE comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        user_id INT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
    );

    ##### Diseases table
   >CREATE TABLE diseases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        image_path VARCHAR(500),
        causes TEXT,
        affects TEXT,
        symptoms TEXT,
        treatment TEXT,
        prevention TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
    );

    #### Guides table
    >CREATE TABLE guides (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        image_path VARCHAR(500),
        planting_suggestions TEXT,
        care_instructions TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
    );

    #### AI Analysis Table (Yet to be used by the application)
    >CREATE TABLE disease_analyses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        image_path VARCHAR(500),
        plant_name VARCHAR(255),
        result_data JSON,
        status ENUM('processing', 'completed', 'error') DEFAULT 'processing',
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

    #### Contact messages table (From 'Contact Us' form)
    >CREATE TABLE contact_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_status BOOLEAN DEFAULT FALSE
    );

## Running the application
1. `npm run dev` (development mode)
2. `npm start` (production mode)

##
