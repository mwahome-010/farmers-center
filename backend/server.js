const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const cors = require('cors');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { SchemaType } = require('@google/generative-ai');

const ai = new GoogleGenerativeAI(process.env.API_KEY);
const model = 'gemini-2.5-flash';

const app = express();
const PORT = process.env.PORT;

//const apiSourceUrl = process.env.API_URL
//const apiKey = process.env.PLANT_ID_API_KEY;
//const LATITUDE = parseFloat(process.env.LATITUDE);
//const LONGITUDE = parseFloat(process.env.LONGITUDE);

const baseUploadsDir = path.join(__dirname, '..', 'images', 'uploads');
const forumDir = path.join(baseUploadsDir, 'forum');
const diseasesDir = path.join(baseUploadsDir, 'diseases');
const guidesDir = path.join(baseUploadsDir, 'guides');

[baseUploadsDir, forumDir, diseasesDir, guidesDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

const createStorage = (uploadType) => {
    return multer.diskStorage({
        destination: function (req, file, cb) {
            let destDir;
            switch (uploadType) {
                case 'forum':
                    destDir = forumDir;
                    break;
                case 'disease':
                    destDir = diseasesDir;
                    break;
                case 'guide':
                    destDir = guidesDir;
                    break;
                default:
                    destDir = baseUploadsDir;
            }
            cb(null, destDir);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            cb(null, `${uploadType}-${uniqueSuffix}${ext}`);
        }
    });
};

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'));
    }
};

const forumUpload = multer({
    storage: createStorage('forum'),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: fileFilter
});

const diseaseUpload = multer({
    storage: createStorage('disease'),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: fileFilter
});

const guideUpload = multer({
    storage: createStorage('guide'),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: fileFilter
});

function deleteImageFile(imagePath) {
    if (!imagePath) return;

    // Handle both old and new path formats
    const fullPath = imagePath.startsWith('/images/')
        ? path.join(__dirname, '..', imagePath)
        : path.join(__dirname, '..', 'images', imagePath);

    if (fs.existsSync(fullPath)) {
        try {
            fs.unlinkSync(fullPath);
            //console.log('Deleted image:', fullPath);
        } catch (err) {
            console.error('Error deleting image:', err);
        }
    }
}

function getRelativePath(file, uploadType) {
    return `/images/uploads/${uploadType}/${file.filename}`;
}

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    exposedHeaders: ['set-cookie']
}));

app.use(express.json({ limit: '20mb' }));

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
        console.log('✓ Connected to MariaDB database');
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

const isAdmin = async (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const [users] = await pool.query(
            'SELECT role FROM users WHERE id = ?',
            [req.session.userId]
        );

        if (users.length === 0 || users[0].role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        next();
    } catch (error) {
        console.error('Admin check error:', error);
        res.status(500).json({ error: 'Authorization check failed' });
    }
};

function fileToGenerativePart(buffer, mimeType) {
    return {
        inlineData: {
            data: buffer.toString("base64"),
            mimeType
        },
    };
}

const diseaseResponseSchema = {
    type: SchemaType.OBJECT,
    properties: {
        plant_name: {
            type: SchemaType.STRING,
            description: "The most likely species or type of plant detected in the image.",
        },
        diseases: {
            type: SchemaType.ARRAY,
            description: "A list of diseases detected and their information.",
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    name: {
                        type: SchemaType.STRING,
                        description: "The name of the disease, or 'Healthy' if no major disease is detected."
                    },
                    probability: {
                        type: SchemaType.NUMBER,
                        description: "The model's confidence probability (from 0.0 to 1.0) for this specific disease."
                    },
                    remedy: {
                        type: SchemaType.STRING,
                        description: "A specific, concise step-by-step remedy or care instruction for the detected condition."
                    }
                },
                required: ["name", "probability", "remedy"]
            }
        }
    },
    required: ["plant_name", "diseases"]
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

app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required'
            });
        }

        await pool.query(`
            CREATE TABLE IF NOT EXISTS contact_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                subject VARCHAR(500) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                read_status BOOLEAN DEFAULT FALSE
            )
        `);

        await pool.query(
            `INSERT INTO contact_messages (name, email, subject, message) 
             VALUES (?, ?, ?, ?)`,
            [name, email, subject, message]
        );

        res.json({
            success: true,
            message: 'Your message has been received. We\'ll get back to you soon!'
        });
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send message. Please try again later.'
        });
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

const uploadDiseaseImage = multer({ storage: createStorage('disease') }).single('image');

async function initializeDiseaseAnalysesTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS disease_analyses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                image_path VARCHAR(500),
                plant_name VARCHAR(255),
                result_data JSON,
                status ENUM('processing', 'completed', 'error') DEFAULT 'processing',
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

    } catch (error) {
        console.error('Error initializing disease_analyses table:', error);
    }
}

initializeDiseaseAnalysesTable();

app.post('/api/analyze-disease', uploadDiseaseImage, async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image file uploaded.' });
    }

    let analysisId = null;
    const imagePath = getRelativePath(req.file, 'disease');

    try {
        //analysis record in db
        const [result] = await pool.query(
            `INSERT INTO disease_analyses (image_path, status) VALUES (?, 'processing')`,
            [imagePath]
        );
        analysisId = result.insertId;

        res.json({
            success: true,
            analysisId: analysisId,
            message: 'Analysis started. Use the analysisId to fetch results.'
        });

        // Process analysis asynchronously
        (async () => {
            try {
                const imageBuffer = fs.readFileSync(req.file.path);
                const imagePart = fileToGenerativePart(imageBuffer, req.file.mimetype);
                const prompt = process.env.PROMPT;

                //console.log(`[Analysis ${analysisId}] Prompt:`, prompt);
                const genModel = ai.getGenerativeModel({
                    model: model,
                    generationConfig: {
                        responseMimeType: "application/json",
                        responseSchema: diseaseResponseSchema,
                        temperature: 0.1,
                    }
                });

                const result = await genModel.generateContent([
                    prompt,
                    imagePart
                ]);

                const response = await result.response;
                const responseText = response.text();

                const diseaseData = JSON.parse(responseText);
                //console.log(`[Analysis ${analysisId}] Parsed disease data:`, JSON.stringify(diseaseData, null, 2));
                //console.log(`[Analysis ${analysisId}] Results stored in database`);

                /* Store results in database*/
                await pool.query(
                    `UPDATE disease_analyses 
                     SET plant_name = ?, result_data = ?, status = 'completed' 
                     WHERE id = ?`,
                    [diseaseData.plant_name, JSON.stringify(diseaseData), analysisId]
                );

                // Delete the temporary file after processing
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error(`[Analysis ${analysisId}] Error deleting temp file:`, err);
                });

            } catch (error) {
                console.error(`[Analysis ${analysisId}] Error with Gemini API or JSON parsing:`, error);
                console.error(`[Analysis ${analysisId}] Error stack:`, error.stack);

                await pool.query(
                    `UPDATE disease_analyses 
                     SET status = 'error', error_message = ? 
                     WHERE id = ?`,
                    [error.message, analysisId]
                );

                if (req.file && req.file.path) {
                    fs.unlink(req.file.path, (err) => {
                        if (err) console.error(`[Analysis ${analysisId}] Error deleting temp file on error:`, err);
                    });
                }
            }
        })();

    } catch (error) {
        console.error('Error creating analysis record:', error);

        if (req.file && req.file.path) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error("Error deleting temp file:", err);
            });
        }

        res.status(500).json({
            error: 'Failed to start analysis.',
            details: error.message
        });
    }
});

/* Endpoint to fetch analysis results */
app.get('/api/analyze-disease/:id', async (req, res) => {
    const analysisId = req.params.id;

    try {
        const [analyses] = await pool.query(
            'SELECT * FROM disease_analyses WHERE id = ?',
            [analysisId]
        );

        if (analyses.length === 0) {
            return res.status(404).json({ error: 'Analysis not found' });
        }

        const analysis = analyses[0];

        if (analysis.status === 'processing') {
            return res.json({
                status: 'processing',
                message: 'Analysis is still in progress'
            });
        }

        if (analysis.status === 'error') {
            return res.json({
                status: 'error',
                error: analysis.error_message || 'Analysis failed'
            });
        }

        // Status is 'completed'
        const resultData = JSON.parse(analysis.result_data);
        // Return the result data with status, ensuring plant_name is included
        res.json({
            status: 'completed',
            plant_name: resultData.plant_name || analysis.plant_name,
            diseases: resultData.diseases || []
        });

    } catch (error) {
        console.error('Error fetching analysis:', error);
        res.status(500).json({ error: 'Failed to fetch analysis results' });
    }
});

app.get('/api/auth/status', async (req, res) => {
    if (req.session.userId) {
        try {
            const [users] = await pool.query(
                'SELECT id, username, role FROM users WHERE id = ?',
                [req.session.userId]
            );

            if (users.length > 0) {
                res.json({
                    authenticated: true,
                    user: {
                        id: users[0].id,
                        username: users[0].username,
                        isAdmin: users[0].role === 'admin',
                        role: users[0].role
                    }
                });
            } else {
                res.json({ authenticated: false });
            }
        } catch (error) {
            console.error('Auth status error:', error);
            res.json({ authenticated: false });
        }
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
                p.user_id,
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

app.post('/api/forum/posts', isAuthenticated, (req, res, next) => {
    forumUpload.single('image')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File size must be less than 5MB' });
            }
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, async (req, res) => {
    const { title, category, body } = req.body;
    const userId = req.session.userId;

    if (!title || !category || !body) {
        if (req.file) deleteImageFile(req.file.path);
        return res.status(400).json({ error: 'Title, category, and body are required' });
    }

    try {
        const [categories] = await pool.query('SELECT id FROM categories WHERE name = ?', [category]);

        if (categories.length === 0) {
            if (req.file) deleteImageFile(req.file.path);
            return res.status(400).json({ error: 'Invalid category' });
        }

        const categoryId = categories[0].id;
        const imagePath = req.file ? getRelativePath(req.file, 'forum') : null;

        const [result] = await pool.query(
            `INSERT INTO posts (user_id, category_id, title, body, image_path, status) 
             VALUES (?, ?, ?, ?, ?, 'unanswered')`,
            [userId, categoryId, title, body, imagePath]
        );

        const [posts] = await pool.query(`
            SELECT p.*, u.username, c.name as category_name
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
        if (req.file) deleteImageFile(req.file.path);
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


// Delete a post (only by the post owner)
app.delete('/api/forum/posts/:id', isAuthenticated, async (req, res) => {
    const postId = req.params.id;
    const userId = req.session.userId;

    try {
        const [posts] = await pool.query('SELECT id, user_id, image_path FROM posts WHERE id = ?', [postId]);

        if (posts.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const [users] = await pool.query(
            'SELECT role FROM users WHERE id = ?',
            [userId]
        );
        const isAdmin = users.length > 0 && users[0].role === 'admin';

        if (posts[0].user_id !== userId && !isAdmin) {
            return res.status(403).json({ error: 'You can only delete your own posts (or be an admin)' });
        }

        deleteImageFile(posts[0].image_path);

        await pool.query('DELETE FROM comments WHERE post_id = ?', [postId]);
        await pool.query('DELETE FROM posts WHERE id = ?', [postId]);

        res.json({ success: true, message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

/* Delete a comment (only by the comment owner) */
app.delete('/api/forum/comments/:id', isAuthenticated, async (req, res) => {
    const commentId = req.params.id;
    const userId = req.session.userId;

    try {
        const [comments] = await pool.query(
            'SELECT id, user_id, post_id FROM comments WHERE id = ?',
            [commentId]
        );

        if (comments.length === 0) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        const [users] = await pool.query(
            'SELECT role FROM users WHERE id = ?',
            [userId]
        );
        const isAdmin = users.length > 0 && users[0].role === 'admin';

        if (comments[0].user_id !== userId && !isAdmin) {
            return res.status(403).json({ error: 'You can only delete your own comments (or be an admin)' });
        }

        const postId = comments[0].post_id;

        await pool.query('DELETE FROM comments WHERE id = ?', [commentId]);

        res.json({
            success: true,
            message: 'Comment deleted successfully',
            postId: postId
        });

    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});

/* User account deletion */
app.delete('/api/user/account', isAuthenticated, async (req, res) => {
    const userId = req.session.userId;
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: 'Password confirmation is required' });
    }

    try {
        const [users] = await pool.query(
            'SELECT id, password_hash FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        const [posts] = await pool.query(
            'SELECT image_path FROM posts WHERE user_id = ? AND image_path IS NOT NULL',
            [userId]
        );

        //Delete associated images from filesystem
        posts.forEach(post => {
            if (post.image_path) {
                const fullPath = path.join(__dirname, '..', post.image_path);
                if (fs.existsSync(fullPath)) {
                    try {
                        fs.unlinkSync(fullPath);
                    } catch (err) {
                        console.error('Error deleting image:', err);
                    }
                }
            }
        });

        /* Delete comments & posts first, before account */
        await pool.query('DELETE FROM comments WHERE user_id = ?', [userId]);

        await pool.query('DELETE FROM posts WHERE user_id = ?', [userId]);

        await pool.query('DELETE FROM users WHERE id = ?', [userId]);

        req.session.destroy((err) => {
            if (err) {
                console.error('Session destruction error:', err);
            }
        });

        res.clearCookie('connect.sid');
        res.json({
            success: true,
            message: 'Account deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ error: 'Failed to delete account' });
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

app.get('/api/admin/users', isAdmin, async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT 
                u.id,
                u.username,
                u.email,
                u.role,
                u.created_at,
                COUNT(DISTINCT p.id) as post_count,
                COUNT(DISTINCT c.id) as comment_count
            FROM users u
            LEFT JOIN posts p ON u.id = p.user_id
            LEFT JOIN comments c ON u.id = c.user_id
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `);

        res.json({ success: true, users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.delete('/api/admin/comments/:id', isAdmin, async (req, res) => {
    const commentId = req.params.id;

    try {
        const [comments] = await pool.query(
            'SELECT id, post_id FROM comments WHERE id = ?',
            [commentId]
        );

        if (comments.length === 0) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        const postId = comments[0].post_id;

        await pool.query('DELETE FROM comments WHERE id = ?', [commentId]);

        res.json({
            success: true,
            message: 'Comment deleted successfully by admin',
            postId: postId
        });

    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});

app.delete('/api/admin/users/:id', isAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);

    if (userId === req.session.userId) {
        return res.status(400).json({ error: 'You cannot delete your own account via admin panel' });
    }

    try {
        const [users] = await pool.query(
            'SELECT id FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const [posts] = await pool.query(
            'SELECT image_path FROM posts WHERE user_id = ? AND image_path IS NOT NULL',
            [userId]
        );

        // Delete associated images storage
        posts.forEach(post => {
            if (post.image_path) {
                const fullPath = path.join(__dirname, '..', post.image_path);
                if (fs.existsSync(fullPath)) {
                    try {
                        fs.unlinkSync(fullPath);
                    } catch (err) {
                        console.error('Error deleting image:', err);
                    }
                }
            }
        });

        await pool.query('DELETE FROM comments WHERE user_id = ?', [userId]);

        await pool.query('DELETE FROM posts WHERE user_id = ?', [userId]);

        await pool.query('DELETE FROM users WHERE id = ?', [userId]);

        res.json({
            success: true,
            message: 'User deleted successfully by admin'
        });

    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

app.get('/api/admin/stats', isAdmin, async (req, res) => {
    try {
        const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users');
        const [postCount] = await pool.query('SELECT COUNT(*) as count FROM posts');
        const [commentCount] = await pool.query('SELECT COUNT(*) as count FROM comments');
        const [diseaseCount] = await pool.query('SELECT COUNT(*) as count FROM diseases');
        const [guideCount] = await pool.query('SELECT COUNT(*) as count FROM guides');

        const [unansweredPosts] = await pool.query(
            "SELECT COUNT(*) as count FROM posts WHERE status = 'unanswered'"
        );

        const [activeUsers7d] = await pool.query(`
            SELECT COUNT(DISTINCT user_id) as count
            FROM (
                SELECT user_id FROM posts WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                UNION
                SELECT user_id FROM comments WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ) as active
        `);

        const [activeUsers30d] = await pool.query(`
            SELECT COUNT(DISTINCT user_id) as count
            FROM (
                SELECT user_id FROM posts WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                UNION
                SELECT user_id FROM comments WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ) as active
        `);

        const [retention7d] = await pool.query(`
            SELECT 
                COUNT(DISTINCT u.id) as total_eligible,
                COUNT(DISTINCT active.user_id) as active_users
            FROM users u
            LEFT JOIN (
                SELECT DISTINCT user_id 
                FROM posts 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                UNION
                SELECT DISTINCT user_id 
                FROM comments 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ) active ON u.id = active.user_id AND active.user_id IS NOT NULL
            WHERE u.created_at <= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `);

        const [retention30d] = await pool.query(`
            SELECT 
                COUNT(DISTINCT u.id) as total_eligible,
                COUNT(DISTINCT active.user_id) as active_users
            FROM users u
            LEFT JOIN (
                SELECT DISTINCT user_id 
                FROM posts 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                UNION
                SELECT DISTINCT user_id 
                FROM comments 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ) active ON u.id = active.user_id AND active.user_id IS NOT NULL
            WHERE u.created_at <= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);

        const retentionRate7d = retention7d[0].total_eligible > 0
            ? ((retention7d[0].active_users / retention7d[0].total_eligible) * 100).toFixed(1)
            : 'N/A';

        const retentionRate30d = retention30d[0].total_eligible > 0
            ? ((retention30d[0].active_users / retention30d[0].total_eligible) * 100).toFixed(1)
            : 'N/A';

        res.json({
            success: true,
            stats: {
                totalUsers: Number(userCount[0].count),
                totalPosts: Number(postCount[0].count),
                totalComments: Number(commentCount[0].count),
                totalDiseases: Number(diseaseCount[0].count),
                totalGuides: Number(guideCount[0].count),
                unansweredPosts: Number(unansweredPosts[0].count),
                activeUsers7d: Number(activeUsers7d[0].count),
                activeUsers30d: Number(activeUsers30d[0].count),
                retentionRate7d: retentionRate7d,
                retentionRate30d: retentionRate30d,
                /* Additional context for debugging */
                eligibleUsers7d: retention7d[0].total_eligible,
                eligibleUsers30d: retention30d[0].total_eligible
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
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

app.get('/api/diseases', async (req, res) => {
    try {
        const [diseases] = await pool.query(`
            SELECT d.*, u.username as created_by_username
            FROM diseases d
            LEFT JOIN users u ON d.created_by = u.id
            ORDER BY d.created_at DESC
        `);

        res.json({ success: true, diseases });
    } catch (error) {
        console.error('Error fetching diseases:', error);
        res.status(500).json({ error: 'Failed to fetch diseases' });
    }
});

// Get single disease
app.get('/api/diseases/:id', async (req, res) => {
    try {
        const [diseases] = await pool.query(
            'SELECT * FROM diseases WHERE id = ?',
            [req.params.id]
        );

        if (diseases.length === 0) {
            return res.status(404).json({ error: 'Disease not found' });
        }

        res.json({ success: true, disease: diseases[0] });
    } catch (error) {
        console.error('Error fetching disease:', error);
        res.status(500).json({ error: 'Failed to fetch disease' });
    }
});

app.post('/api/diseases', isAdmin, (req, res, next) => {
    diseaseUpload.single('image')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File size must be less than 5MB' });
            }
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, async (req, res) => {
    const { name, causes, affects, symptoms, treatment, prevention } = req.body;
    const userId = req.session.userId;

    if (!name) {
        if (req.file) deleteImageFile(req.file.path);
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const imagePath = req.file ? getRelativePath(req.file, 'diseases') : null;

        const [result] = await pool.query(
            `INSERT INTO diseases (name, image_path, causes, affects, symptoms, treatment, prevention, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, imagePath, causes, affects, symptoms, treatment, prevention, userId]
        );

        const [diseases] = await pool.query('SELECT * FROM diseases WHERE id = ?', [result.insertId]);

        res.status(201).json({
            success: true,
            message: 'Disease created successfully',
            disease: diseases[0]
        });
    } catch (error) {
        console.error('Error creating disease:', error);
        if (req.file) deleteImageFile(req.file.path);
        res.status(500).json({ error: 'Failed to create disease' });
    }
});

app.put('/api/diseases/:id', isAdmin, (req, res, next) => {
    diseaseUpload.single('image')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File size must be less than 5MB' });
            }
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, async (req, res) => {
    const diseaseId = req.params.id;
    const { name, causes, affects, symptoms, treatment, prevention } = req.body;

    try {
        const [existing] = await pool.query('SELECT * FROM diseases WHERE id = ?', [diseaseId]);

        if (existing.length === 0) {
            if (req.file) deleteImageFile(req.file.path);
            return res.status(404).json({ error: 'Disease not found' });
        }

        let imagePath = existing[0].image_path;

        if (req.file) {
            deleteImageFile(imagePath);
            imagePath = getRelativePath(req.file, 'diseases');
        }

        await pool.query(
            `UPDATE diseases 
             SET name = ?, image_path = ?, causes = ?, affects = ?, symptoms = ?, treatment = ?, prevention = ?
             WHERE id = ?`,
            [name, imagePath, causes, affects, symptoms, treatment, prevention, diseaseId]
        );

        const [updated] = await pool.query('SELECT * FROM diseases WHERE id = ?', [diseaseId]);

        res.json({
            success: true,
            message: 'Disease updated successfully',
            disease: updated[0]
        });
    } catch (error) {
        console.error('Error updating disease:', error);
        if (req.file) deleteImageFile(req.file.path);
        res.status(500).json({ error: 'Failed to update disease' });
    }
});

app.delete('/api/diseases/:id', isAdmin, async (req, res) => {
    const diseaseId = req.params.id;

    try {
        const [diseases] = await pool.query('SELECT * FROM diseases WHERE id = ?', [diseaseId]);

        if (diseases.length === 0) {
            return res.status(404).json({ error: 'Disease not found' });
        }

        deleteImageFile(diseases[0].image_path);
        await pool.query('DELETE FROM diseases WHERE id = ?', [diseaseId]);

        res.json({ success: true, message: 'Disease deleted successfully' });
    } catch (error) {
        console.error('Error deleting disease:', error);
        res.status(500).json({ error: 'Failed to delete disease' });
    }
});

app.get('/api/guides', async (req, res) => {
    try {
        const [guides] = await pool.query(`
            SELECT g.*, u.username as created_by_username
            FROM guides g
            LEFT JOIN users u ON g.created_by = u.id
            ORDER BY g.created_at DESC
        `);

        res.json({ success: true, guides });
    } catch (error) {
        console.error('Error fetching guides:', error);
        res.status(500).json({ error: 'Failed to fetch guides' });
    }
});

app.get('/api/guides/:id', async (req, res) => {
    try {
        const [guides] = await pool.query(
            'SELECT * FROM guides WHERE id = ?',
            [req.params.id]
        );

        if (guides.length === 0) {
            return res.status(404).json({ error: 'Guide not found' });
        }

        res.json({ success: true, guide: guides[0] });
    } catch (error) {
        console.error('Error fetching guide:', error);
        res.status(500).json({ error: 'Failed to fetch guide' });
    }
});

// Create, update and delete guide
app.post('/api/guides', isAdmin, (req, res, next) => {
    guideUpload.single('image')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File size must be less than 5MB' });
            }
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, async (req, res) => {
    const { name, planting_suggestions, care_instructions } = req.body;
    const userId = req.session.userId;

    if (!name) {
        if (req.file) deleteImageFile(req.file.path);
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const imagePath = req.file ? getRelativePath(req.file, 'guides') : null;

        const [result] = await pool.query(
            `INSERT INTO guides (name, image_path, planting_suggestions, care_instructions, created_by)
             VALUES (?, ?, ?, ?, ?)`,
            [name, imagePath, planting_suggestions, care_instructions, userId]
        );

        const [guides] = await pool.query('SELECT * FROM guides WHERE id = ?', [result.insertId]);

        res.status(201).json({
            success: true,
            message: 'Guide created successfully',
            guide: guides[0]
        });
    } catch (error) {
        console.error('Error creating guide:', error);
        if (req.file) deleteImageFile(req.file.path);
        res.status(500).json({ error: 'Failed to create guide' });
    }
});

app.put('/api/guides/:id', isAdmin, (req, res, next) => {
    guideUpload.single('image')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File size must be less than 5MB' });
            }
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, async (req, res) => {
    const guideId = req.params.id;
    const { name, planting_suggestions, care_instructions } = req.body;

    try {
        const [existing] = await pool.query('SELECT * FROM guides WHERE id = ?', [guideId]);

        if (existing.length === 0) {
            if (req.file) deleteImageFile(req.file.path);
            return res.status(404).json({ error: 'Guide not found' });
        }

        let imagePath = existing[0].image_path;

        if (req.file) {
            // Delete old image if exists
            if (imagePath && imagePath.startsWith('/images/uploads/')) {
                const oldPath = path.join(__dirname, '..', imagePath);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
            imagePath = getRelativePath(req.file, 'guides');
        }

        await pool.query(
            `UPDATE guides 
             SET name = ?, image_path = ?, planting_suggestions = ?, care_instructions = ?
             WHERE id = ?`,
            [name, imagePath, planting_suggestions, care_instructions, guideId]
        );

        const [updated] = await pool.query('SELECT * FROM guides WHERE id = ?', [guideId]);

        res.json({
            success: true,
            message: 'Guide updated successfully',
            guide: updated[0]
        });
    } catch (error) {
        console.error('Error updating guide:', error);
        if (req.file) deleteImageFile(req.file.path);
        res.status(500).json({ error: 'Failed to update guide' });
    }
});

app.delete('/api/guides/:id', isAdmin, async (req, res) => {
    const guideId = req.params.id;

    try {
        const [guides] = await pool.query('SELECT * FROM guides WHERE id = ?', [guideId]);

        if (guides.length === 0) {
            return res.status(404).json({ error: 'Guide not found' });
        }

        // Delete image if exists
        const imagePath = guides[0].image_path;
        deleteImageFile(imagePath);

        await pool.query('DELETE FROM guides WHERE id = ?', [guideId]);

        res.json({
            success: true,
            message: 'Guide deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting guide:', error);
        res.status(500).json({ error: 'Failed to delete guide' });
    }
});

/* stats for stats div in landing page */
app.post('/api/stats', async (req, res) => {
    const numOfUsers = req.query.users === 'true';
    const numOfGuides = req.query.guidesCount === 'true';
    const numOfDiseases = req.query.diseaseCount === 'true';

    try {
        const stats = {};

        if (numOfUsers) {
            const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = "user"');
            stats.totalUsers = Number(userCount[0].count);
        }
        if (numOfGuides) {
            const [guideCount] = await pool.query('SELECT COUNT(*) as count FROM guides');
            stats.totalGuides = Number(guideCount[0].count);
        }
        if (numOfDiseases) {
            const [diseaseCount] = await pool.query('SELECT COUNT(*) as count FROM diseases');
            stats.totalDiseases = Number(diseaseCount[0].count);
        }

        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

app.get('/api/user/report', isAuthenticated, async (req, res) => {
    const userId = req.session.userId;

    try {
        const [users] = await pool.query(
            'SELECT id, username, email, created_at FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];

        const [posts] = await pool.query(`
            SELECT 
                p.id,
                p.title,
                p.body,
                p.image_path,
                p.views,
                p.created_at,
                c.name as category_name,
                COUNT(DISTINCT cm.id) as comment_count
            FROM posts p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN comments cm ON p.id = cm.post_id
            WHERE p.user_id = ?
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `, [userId]);

        const [comments] = await pool.query(`
            SELECT 
                c.id,
                c.content,
                c.created_at,
                p.title as post_title,
                p.id as post_id
            FROM comments c
            LEFT JOIN posts p ON c.post_id = p.id
            WHERE c.user_id = ?
            ORDER BY c.created_at DESC
        `, [userId]);

        const totalPosts = posts.length;
        const totalComments = comments.length;
        const totalViews = posts.reduce((sum, post) => sum + (post.views || 0), 0);

        const report = {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                created_at: user.created_at
            },
            stats: {
                totalPosts,
                totalComments,
                totalViews
            },
            posts: posts.map(post => ({
                id: post.id,
                title: post.title,
                body: post.body,
                image_path: post.image_path,
                category_name: post.category_name,
                views: post.views,
                comment_count: parseInt(post.comment_count),
                created_at: post.created_at
            })),
            comments: comments.map(comment => ({
                id: comment.id,
                content: comment.content,
                post_title: comment.post_title,
                post_id: comment.post_id,
                created_at: comment.created_at
            }))
        };

        res.json({
            success: true,
            report
        });

    } catch (error) {
        console.error('Error generating user report:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});