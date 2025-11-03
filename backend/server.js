const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const cors = require('cors');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT;

const uploadsDir = path.join(__dirname, '..', 'images', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'post-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'));
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) 
            return callback(null, true);
        
        if (origin.startsWith('http://localhost:') || 
            origin.startsWith('http://127.0.0.1:')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    exposedHeaders: ['set-cookie']
}));

app.use(express.json());

app.use('/images', express.static(path.join(__dirname, '..', 'images')));

app.use('/css', express.static(path.join(__dirname, '..', 'css')));
app.use('/js', express.static(path.join(__dirname, '..', 'js')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/forum.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'forum.html'));
});

app.get('/guides.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'guides.html'));
});

app.get('/diseases.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'diseases.html'));
});

app.get('/about.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'about.html'));
});

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax'        
    }
}));

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection()
    .then(conn => {
        console.log('Connected to MariaDB database');
        conn.release();
    })
    .catch(err => {
        console.error('Database connection failed!!!:', err);
    });

const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
};

app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (username.length < 3) {
        return res.status(400).json({ error: 'Username must have least 3 characters' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must have least 6 characters' });
    }

    try {
        const [existing] = await pool.query(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existing.length > 0) {
            return res.status(409).json({ error: 'Username or email already exists' });
        }

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const [result] = await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, passwordHash]
        );

        req.session.userId = result.insertId;
        req.session.username = username;

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: { id: result.insertId, username }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const [users] = await pool.query(
            'SELECT id, username, password_hash FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const user = users[0];
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        req.session.userId = user.id;
        req.session.username = user.username;

        res.json({
            success: true,
            message: 'Login successful',
            user: { id: user.id, username: user.username }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'Logout successful' });
    });
});

app.get('/api/auth/status', (req, res) => {
    if (req.session.userId) {
        res.json({
            authenticated: true,
            user: {
                id: req.session.userId,
                username: req.session.username
            }
        });
    } else {
        res.json({ authenticated: false });
    }
});

app.get('/api/profile', isAuthenticated, async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, username, email, created_at FROM users WHERE id = ?',
            [req.session.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: users[0] });

    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/forum/posts', async (req, res) => {
    const { category, sort, search } = req.query;
    
    try {
        let query = `
            SELECT 
                p.id,
                p.title,
                p.body,
                p.image_path,
                p.status,
                p.views,
                p.created_at,
                u.username,
                c.name as category_name,
                COUNT(DISTINCT cm.id) as comment_count
            FROM posts p
            JOIN users u ON p.user_id = u.id
            JOIN categories c ON p.category_id = c.id
            LEFT JOIN comments cm ON p.id = cm.post_id
        `;
        
        const conditions = [];
        const params = [];
        
        if (category && category !== 'all') {
            conditions.push('c.name = ?');
            params.push(category);
        }
        
        if (search) {
            conditions.push('(p.title LIKE ? OR p.body LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' GROUP BY p.id';
        
        switch (sort) {
            case 'newest':
                query += ' ORDER BY p.created_at DESC';
                break;
            case 'unanswered':
                query += ' ORDER BY p.status = "unanswered" DESC, p.created_at DESC';
                break;
            case 'answered':
                query += ' ORDER BY p.status = "answered" DESC, p.created_at DESC';
                break;
            default:
                query += ' ORDER BY p.created_at DESC';
        }
        
        const [posts] = await pool.query(query, params);
        res.json({ success: true, posts });
        
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

app.get('/api/forum/posts/:id', async (req, res) => {
    const postId = req.params.id;
    
    try {
        const [posts] = await pool.query(`
            SELECT 
                p.*,
                u.username,
                c.name as category_name
            FROM posts p
            JOIN users u ON p.user_id = u.id
            JOIN categories c ON p.category_id = c.id
            WHERE p.id = ?
        `, [postId]);
        
        if (posts.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        const [comments] = await pool.query(`
            SELECT 
                c.*,
                u.username
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC
        `, [postId]);
        
        await pool.query('UPDATE posts SET views = views + 1 WHERE id = ?', [postId]);
        
        res.json({ 
            success: true, 
            post: posts[0], 
            comments 
        });
        
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ error: 'Failed to fetch post' });
    }
});

// Updated post creation endpoint with file upload
app.post('/api/forum/posts', isAuthenticated, (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File size must be less than 5MB' });
            }
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        } else if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, async (req, res) => {
    console.log('Post creation request received');
    console.log('Body:', req.body);
    console.log('File:', req.file);
    
    const { title, category, body } = req.body;
    const userId = req.session.userId;
    
    if (!title || !category || !body) {
        // Clean up uploaded file if validation fails
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ error: 'Title, category, and body are required' });
    }
    
    try {
        const [categories] = await pool.query(
            'SELECT id FROM categories WHERE name = ?',
            [category]
        );
        
        if (categories.length === 0) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ error: 'Invalid category' });
        }
        
        const categoryId = categories[0].id;
        
        // Store relative path to image if uploaded
        const imagePath = req.file ? `/images/uploads/${req.file.filename}` : null;
        
        console.log('Image path to store:', imagePath);
        
        const [result] = await pool.query(
            `INSERT INTO posts (user_id, category_id, title, body, image_path, status) 
             VALUES (?, ?, ?, ?, ?, 'unanswered')`,
            [userId, categoryId, title, body, imagePath]
        );
        
        console.log('Post created with ID:', result.insertId);
        
        const [posts] = await pool.query(`
            SELECT 
                p.*,
                u.username,
                c.name as category_name
            FROM posts p
            JOIN users u ON p.user_id = u.id
            JOIN categories c ON p.category_id = c.id
            WHERE p.id = ?
        `, [result.insertId]);
        
        res.status(201).json({ 
            success: true, 
            message: 'Post created successfully',
            post: posts[0]
        });
        
    } catch (error) {
        console.error('Error creating post:', error);
        // Clean up uploaded file on error
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Failed to create post' });
    }
});

app.post('/api/forum/comments', isAuthenticated, async (req, res) => {
    const { post_id, content, parent_comment_id } = req.body;
    const userId = req.session.userId;
    
    if (!post_id || !content) {
        return res.status(400).json({ error: 'Post ID and content are required' });
    }
    
    try {
        const [result] = await pool.query(
            `INSERT INTO comments (post_id, user_id, parent_comment_id, content) 
             VALUES (?, ?, ?, ?)`,
            [post_id, userId, parent_comment_id || null, content]
        );
        
        await pool.query(
            `UPDATE posts 
             SET status = 'answered' 
             WHERE id = ? AND status = 'unanswered'`,
            [post_id]
        );
        
        const [comments] = await pool.query(`
            SELECT 
                c.*,
                u.username
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        `, [result.insertId]);
        
        res.status(201).json({ 
            success: true, 
            message: 'Comment added successfully',
            comment: comments[0]
        });
        
    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({ error: 'Failed to create comment' });
    }
});

app.get('/api/forum/categories', async (req, res) => {
    try {
        const [categories] = await pool.query('SELECT * FROM categories ORDER BY name');
        res.json({ success: true, categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

app.listen(PORT, () => {
    console.log(`✓ Server running on http://localhost:${PORT}`);
    console.log(`✓ API available at http://localhost:${PORT}/api`);
});

process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await pool.end();
    process.exit(0);
});