const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const multer = require('multer');
const session = require('express-session');
const flash = require('connect-flash');
const bcrypt = require('bcrypt');
const fs = require('fs');

// Connect to MongoDB
mongoose.connect('mongodb+srv://codexabhijit:AbhijiT%402003@cluster0.dsiyd.mongodb.net/arts', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Define the Admin and Image schemas
const adminSchema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true }
});



const Admin = mongoose.model('Admin', adminSchema);

const imageSchema = new mongoose.Schema({
    path: String
});

const Image = mongoose.model('Image', imageSchema);

// Ensure only one admin user is created
(async () => {
    try {
        const adminExists = await Admin.findOne({ username: 'abhijit570' });
        if (!adminExists) {
            // const hashedPassword = await bcrypt.hash('123123', 10);
            const admin = new Admin({
                username: 'abhijit570',
                password: '123123'
            });
            await admin.save();
        }
    } catch (err) {
        console.error('Error creating admin:', err);
    } finally {
        app.listen(3000, () => {
            console.log('Server started on http://localhost:3000');
        });
    }
})();

// Set up view engine and static files
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Set up session and flash messaging
app.use(session({
    secret: 'your-secret',
    resave: false,
    saveUninitialized: false
}));
app.use(flash());

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Middleware to check if the user is an admin
const isAuthenticated = (req, res, next) => {
    if (req.session.isAdmin) {
        return next();
    } else {
        res.redirect('/admin/login');
    }
};

// Routes

// Root Route - Home Page
app.get('/', (req, res) => {
    res.render('index', { image: null });
});

// Admin Login Page
app.get('/admin/login', (req, res) => {
    res.render('admin-login', { error: req.flash('error') });
});

// Admin Login Logic
app.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(password);
    try {
        const admin = await Admin.findOne({ username });
        if (admin) {
            console.log(admin.password);
            
            // const isMatch = await bcrypt.compare(password, admin.password);
            const isMatch = password===admin.password
            if (isMatch) {
                req.session.isAdmin = true;
                return res.redirect('/admin/dashboard');
            } else {
                req.flash('error', 'Invalid credentials');
                return res.redirect('/admin/login');
            }
        } else {
            req.flash('error', 'Invalid credentials');
            return res.redirect('/admin/login');
        }
    } catch (err) {
        console.error('Login error:', err);
        res.sendStatus(500);
    }
});

// Admin Dashboard Page
app.get('/admin/dashboard', isAuthenticated, async (req, res) => {
    try {
        const images = await Image.find({});
        res.render('admin-dashboard', { images });
    } catch (err) {
        console.error('Error loading dashboard:', err);
        res.sendStatus(500);
    }
});

// Image Upload Logic
app.post('/admin/upload', isAuthenticated, upload.single('image'), async (req, res) => {
    const image = new Image({ path: '/uploads/' + req.file.filename });
    try {
        await image.save();
        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error('Error uploading image:', err);
        res.sendStatus(500);
    }
});

// Show Random Photo Logic
app.post('/show-random-photo', async (req, res) => {
    try {
        const [image] = await Image.aggregate([{ $sample: { size: 1 } }]);
        res.render('index', { image });
    } catch (err) {
        console.error('Error showing random photo:', err);
        res.sendStatus(500);
    }
});

// Admin Logout Route
app.get('/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.sendStatus(500);
        }
        res.redirect('/admin/login');
    });
});

// Delete Image Logic
app.post('/admin/delete/:id', isAuthenticated, async (req, res) => {
    try {
        const image = await Image.findById(req.params.id);
        if (image) {
            fs.unlinkSync(path.join(__dirname, 'public', image.path));
            await Image.findByIdAndDelete(req.params.id);
        }
        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error('Error deleting image:', err);
        res.sendStatus(500);
    }
});
