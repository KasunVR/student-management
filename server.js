const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');  // Include CORS to avoid cross-origin issues
const multer = require('multer');
const session = require('express-session');
const { title } = require('process');
const { OpenAI } = require('openai');  // Correct import
require('dotenv').config(); // Load environment variables from .env
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const dotenv = require('dotenv');

dotenv.config();


// Create an OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Your OpenAI API Key from .env file
  });

const app = express();
let loggedInUserId = null;


// File Paths
const usersFile = './data/users.json';
const commentsFile = './data/comment.json';
const notificationFile = './data/notification.json';
const contactFile = './data/contact.json';
const helpFile = './data/help.json';
const adminFilePath = './data/admin.json';
const lecloginFile = path.join(__dirname, "data", "leclogin.json");
const eventFile = './data/event.json';


//lecturer
const lonesoneFile = path.join(__dirname, './lecturers/lonesone.json');
const lonestwoFile = path.join(__dirname, './lecturers/lonestwo.json');
const ltwosoneFile = path.join(__dirname, './lecturers/ltwosone.json');
const ltwostwoFile = path.join(__dirname, './lecturers/ltwostwo.json');

//student
const yearDir = path.join(__dirname, 'year');
const yonesoneFile = path.join(yearDir, 'yonesone.json');
const yonestwoFile = path.join(yearDir, 'yonestwo.json');
const ytwosoneFile = path.join(yearDir, 'ytwosone.json');
const ytwostwoFile = path.join(yearDir, 'ytwostwo.json');

//time
const tonesoneFile = './time/tonesone.json';
const tonestwoFile = './time/tonestwo.json';
const ttwosoneFile = './time/ttwosone.json';
const ttwostwoFile = './time/ttwostwo.json';

//notifcation
const filePath = './notification/nonesone.json'; // Define filePath
const nonestwoFile = './notification/nonestwo.json';
const ntwosoneFile = './notification/ntwosone.json';
const ntwostwoFile = './notification/ntwostwo.json';

// Twilio Credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
const client = twilio(accountSid, authToken);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true })); // To handle form data
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));



// Ensure a directory exists
const ensureDirectoryExists = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

// Ensure a file exists with default content
const ensureFileExists = (filePath) => {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([])); // Initialize file if missing
    }
};

// Define the assignment directory and JSON file
const assignmnetDir = path.join(__dirname, 'assignmnt');
ensureDirectoryExists(assignmnetDir);

const aonesoneFile = path.join(assignmnetDir, 'aonesone.json');
ensureFileExists(aonesoneFile);

const aonestwoFile = path.join(assignmnetDir, 'aonestwo.json');
ensureFileExists(aonestwoFile);

const atwosoneFile = path.join(assignmnetDir, 'atwosone.json');
ensureFileExists(atwosoneFile);

const atwostwoFile = path.join(assignmnetDir, 'atwostwo.json');
ensureFileExists(atwostwoFile);
// Helper Functions
const readJSON = (filePath) => {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([])); // Initialize file if missing
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

const writeJSON = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Helper Function: Append Data to File
const appendDataToFile = (filePath, newData) => {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([newData], null, 2));
    } else {
        const currentData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        currentData.push(newData);
        fs.writeFileSync(filePath, JSON.stringify(currentData, null, 2));
    }
};

// Ensure directory exists
const dir = path.dirname(filePath);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

// Ensure all year-related JSON files exist at server startup
[yonesoneFile, yonestwoFile, ytwosoneFile, ytwostwoFile].forEach(ensureFileExists);

const removeExpiredNotification = (id) => {
    const notifications = readJSON(notificationFile);
    const updatedNotifications = notifications.filter((notif) => notif.id !== id);
    writeJSON(notificationFile, updatedNotifications);
};

app.get('/api/notification', (req, res) => {
    const notifications = readJSON(notificationFile);
    res.json(notifications);
});

  
// POST: Add a new notification
app.post('/api/notification', (req, res) => {
    const { title, message, duration } = req.body;

    if (!title || !message || !duration) {
        return res.status(400).json({ message: 'Title, message, and duration are required.' });
    }

    const notifications = readJSON(notificationFile);
    const newNotification = {
        id: Date.now().toString(),
        title,
        message,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + duration).toISOString() // Expiry timestamp
    };
    notifications.push(newNotification);

    writeJSON(notificationFile, notifications);

    // Schedule removal of the notification
    setTimeout(() => {
        removeExpiredNotification(newNotification.id);
    }, duration);

    res.status(201).json(newNotification);
});

// Endpoint to get the logged-in user's name
app.get("/api/user", (req, res) => {
    res.json(loggedInUser);
});

// Serve the login page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Login Route (No changes to your code here)
app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const users = readJSON(usersFile);

    const user = users.find((u) => u.username === username && u.password === password);
    if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
    }

    loggedInUserId = user.id; // Set logged-in user ID

    if (user.role === "admin") {
        res.json({ message: "Login successful", redirectTo: "/admins.html" });
    } else if (user.role === "student") {
        res.json({ message: "Login successful", redirectTo: "/index.html" });
    } else {
        res.status(400).json({ error: "Invalid role" });
    }
});

// Fetch Profile Data
app.get("/api/profile", (req, res) => {
    if (!loggedInUserId) {
        return res.status(401).json({ error: "No user logged in." });
    }

    const users = readJSON(usersFile);
    const user = users.find((u) => u.id === loggedInUserId);

    if (!user) return res.status(404).json({ error: "User not found." });

    res.json(user);
});

// Save Profile Changes
app.post("/api/profile", (req, res) => {
    if (!loggedInUserId) {
        return res.status(401).json({ error: "No user logged in." });
    }

    const updatedData = req.body;

    const users = readJSON(usersFile);
    const userIndex = users.findIndex((u) => u.id === loggedInUserId);

    if (userIndex === -1) return res.status(404).json({ error: "User not found." });

    // Update user data
    users[userIndex] = { ...users[userIndex], ...updatedData };
    writeJSON(usersFile, users);

    res.json({ message: "Profile updated successfully." });
});
/**
 * Registration Route
 */
app.post('/api/register', (req, res) => {
    const { username, password, address, phone, email, role } = req.body;
    if (!username || !password || !address || !phone || !email || !role) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const users = readJSON(usersFile);
    if (users.some(u => u.username === username)) {
        return res.status(409).json({ error: 'Username already exists' });
    }

    const newUser = {
        id: users.length + 1,
        username,
        password,
        address,
        phone,
        email,
        role
    };
    users.push(newUser);
    writeJSON(usersFile, users);

    res.json({ message: 'User registered successfully' });
});

/**
 * Change Password Route
 */
app.post('/api/users/change-password', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    const users = readJSON(usersFile);
    const userIndex = users.findIndex(u => u.username === username);

    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }

    users[userIndex].password = password;
    writeJSON(usersFile, users);

    res.json({ message: 'Password changed successfully' });
});

// Global variable to store logged-in user
let loggedInUser = null;

// Login API
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    fs.readFile(lecloginFile, 'utf-8', (err, data) => {
        if (err || !data) {
            return res.status(500).json({ message: 'Unable to read user data.' });
        }

        const users = JSON.parse(data);
        const user = users.find((u) => u.username === username && u.password === password);

        if (user) {
            loggedInUser = user;
            res.status(200).json({ message: `Welcome, ${user.username}!`, user });
        } else {
            res.status(401).json({ message: 'Invalid username or password.' });
        }
    });
});

// Fetch profile data API
app.get('/api/profiles', (req, res) => {
    if (!loggedInUser) {
        return res.status(401).json({ message: 'No user logged in.' });
    }
    res.json(loggedInUser);
});


// Route to handle registration
app.post('/register', (req, res) => {
    const { username, password, confirmPassword, email, address, phone } = req.body;

    // Validate required fields
    if (!username || !password || !confirmPassword || !email || !address || !phone) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match.' });
    }

    // Read data from leclogin.json
    fs.readFile(lecloginFile, 'utf-8', (err, data) => {
        if (err && err.code !== 'ENOENT') {
            return res.status(500).json({ message: 'Unable to read user data.' });
        }

        let users = data ? JSON.parse(data) : [];

        // Check if username already exists
        const existingUser = users.find((u) => u.username === username);
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists.' });
        }

        // Create a new user object
        const newUser = {
            username,
            password,
            email,
            address,
            phone,
           
        };

        // Add the new user to the users array
        users.push(newUser);

        // Save updated users data to leclogin.json
        fs.writeFile(lecloginFile, JSON.stringify(users, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ message: 'Unable to save user data.' });
            }

            res.status(200).json({ message: 'Registration successful!' });
        });
    });
});

app.post('/change-password', (req, res) => {
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
        return res.status(400).json({ message: 'Username, current password, and new password are required.' });
    }

    // Read data from leclogin.json
    fs.readFile(lecloginFile, 'utf-8', (err, data) => {
        if (err || !data) {
            return res.status(500).json({ message: 'Unable to read user data.' });
        }

        let users = JSON.parse(data);

        // Find user by username
        const user = users.find((u) => u.username === username );

        if (user) {
            // If user is found and the current password is correct, update password
            user.password = newPassword;

            // Save the updated user data back to leclogin.json
            fs.writeFile(lecloginFile, JSON.stringify(users, null, 2), (err) => {
                if (err) {
                    return res.status(500).json({ message: 'Unable to update password.' });
                }
                res.status(200).json({ message: 'Password changed successfully!' });
            });
        } else {
            return res.status(401).json({ message: 'Invalid username or current password.' });
        }
    });
});

// Routes to Add Students
app.post('/api/yonesone', (req, res) => {
    appendDataToFile(yonesoneFile, req.body);
    res.json({ message: 'Student added to Year 1 Semester 1.' });
});

// Get All Students
app.get('/api/yonesone', (req, res) => {
    const students = readJSON(yonesoneFile);
    res.json(students);
});

 // Route to update a student entry (PUT)
app.put('/api/yonesone/:id', (req, res) => {
    const { id } = req.params;
    const { saNumber, name, grade, subject, email, city, guardian } = req.body;

    // Check for missing fields
    if (!saNumber || !name || !grade || !subject || !email || !city || !guardian) {
        return res.status(400).json({ message: 'Student saNumber, name, grade and subject are required.' });
    }

    const students = readJSON(yonesoneFile);
    const studentIndex = students.findIndex(student => student.saNumber === saNumber);

    // Check if student exists
    if (studentIndex === -1) {
        return res.status(404).json({ message: 'Student not found.' });
    }

    // Update student details
    students[studentIndex] = { saNumber, name, grade, subject, email, city, guardian };
    writeJSON(yonesoneFile, students);

    res.json(students[studentIndex]);
});

// Route to delete a student entry (DELETE)
app.delete('/api/yonesone/:id', (req, res) => {
    const { id } = req.params;
    const students = readJSON(yonesoneFile);
    const index = students.findIndex(student => student.saNumber === id);

    if (index === -1) return res.status(404).json({ message: 'Student not found.' });

    const [deletedStudent] = students.splice(index, 1);
    writeJSON(yonesoneFile, students);

    res.json({ message: 'Deleted successfully.', deletedStudent });
});

app.post('/api/yonestwo', (req, res) => {
    appendDataToFile(yonestwoFile, req.body);
    res.json({ message: 'Student added to Year 1 Semester 2.' });
});

// Get All Students
app.get('/api/yonestwo', (req, res) => {
    const students = readJSON(yonestwoFile);
    res.json(students);
});

 // Route to update a student entry (PUT)
app.put('/api/yonestwo/:id', (req, res) => {
    const { id } = req.params;
    const { saNumber, name, grade, subject, email, city, guardian } = req.body;

    // Check for missing fields
    if (!saNumber || !name || !grade || !subject || !email || !city || !guardian) {
        return res.status(400).json({ message: 'Student saNumber, name, grade and subject are required.' });
    }

    const students = readJSON(yonestwoFile);
    const studentIndex = students.findIndex(student => student.saNumber === saNumber);

    // Check if student exists
    if (studentIndex === -1) {
        return res.status(404).json({ message: 'Student not found.' });
    }

    // Update student details
    students[studentIndex] = { saNumber, name, grade, subject, email, city, guardian };
    writeJSON(yonestwoFile, students);

    res.json(students[studentIndex]);
});

// Route to delete a student entry (DELETE)
app.delete('/api/yonestwo/:id', (req, res) => {
    const { id } = req.params;
    const students = readJSON(yonestwoFile);
    const index = students.findIndex(student => student.saNumber === id);

    if (index === -1) return res.status(404).json({ message: 'Student not found.' });

    const [deletedStudent] = students.splice(index, 1);
    writeJSON(yonestwoFile, students);

    res.json({ message: 'Deleted successfully.', deletedStudent });
});

app.post('/api/ytwosone', (req, res) => {
    appendDataToFile(ytwosoneFile, req.body);
    res.json({ message: 'Student added to Year 2 Semester 1.' });
});
// Get All Students
app.get('/api/ytwosone', (req, res) => {
    const students = readJSON(ytwosoneFile);
    res.json(students);
});

 // Route to update a student entry (PUT)
app.put('/api/ytwosone/:id', (req, res) => {
    const { id } = req.params;
    const { saNumber, name, grade, subject, email, city, guardian } = req.body;

    // Check for missing fields
    if (!saNumber || !name || !grade || !subject || !email || !city || !guardian) {
        return res.status(400).json({ message: 'Student saNumber, name, grade and subject are required.' });
    }

    const students = readJSON(ytwosoneFile);
    const studentIndex = students.findIndex(student => student.saNumber === saNumber);

    // Check if student exists
    if (studentIndex === -1) {
        return res.status(404).json({ message: 'Student not found.' });
    }

    // Update student details
    students[studentIndex] = { saNumber, name, grade, subject, email, city, guardian };
    writeJSON(ytwosoneFile, students);

    res.json(students[studentIndex]);
});

// Route to delete a student entry (DELETE)
app.delete('/api/ytwosone/:id', (req, res) => {
    const { id } = req.params;
    const students = readJSON(ytwosoneFile);
    const index = students.findIndex(student => student.saNumber === id);

    if (index === -1) return res.status(404).json({ message: 'Student not found.' });

    const [deletedStudent] = students.splice(index, 1);
    writeJSON(ytwosoneFile, students);

    res.json({ message: 'Deleted successfully.', deletedStudent });
});

app.post('/api/ytwostwo', (req, res) => {
    appendDataToFile(ytwostwoFile, req.body);
    res.json({ message: 'Student added to Year 2 Semester 2.' });
});
// Get All Students
app.get('/api/ytwostwo', (req, res) => {
    const students = readJSON(ytwostwoFile);
    res.json(students);
});

 // Route to update a student entry (PUT)
app.put('/api/ytwostwo/:id', (req, res) => {
    const { id } = req.params;
    const { saNumber, name, grade, subject, email, city, guardian } = req.body;

    // Check for missing fields
    if (!saNumber || !name || !grade || !subject || !email || !city || !guardian) {
        return res.status(400).json({ message: 'Student saNumber, name, grade and subject are required.' });
    }

    const students = readJSON(ytwostwoFile);
    const studentIndex = students.findIndex(student => student.saNumber === saNumber);

    // Check if student exists
    if (studentIndex === -1) {
        return res.status(404).json({ message: 'Student not found.' });
    }

    // Update student details
    students[studentIndex] = { saNumber, name, grade, subject, email, city, guardian };
    writeJSON(ytwostwoFile, students);

    res.json(students[studentIndex]);
});

// Route to delete a student entry (DELETE)
app.delete('/api/ytwostwo/:id', (req, res) => {
    const { id } = req.params;
    const students = readJSON(ytwostwoFile);
    const index = students.findIndex(student => student.saNumber === id);

    if (index === -1) return res.status(404).json({ message: 'Student not found.' });

    const [deletedStudent] = students.splice(index, 1);
    writeJSON(ytwostwoFile, students);

    res.json({ message: 'Deleted successfully.', deletedStudent });
});

// Get all assignments
app.get('/api/aonesone', (req, res) => {
    const assignments = readJSON(aonesoneFile);
    res.json(assignments);
});

// Add a new assignment
app.post('/api/aonesone', (req, res) => {
    const { name, deadline } = req.body;

    if (!name || !deadline) {
        return res.status(400).json({ message: 'Assignment name and deadline are required' });
    }

    const assignments = readJSON(aonesoneFile);
    const newAssignment = {
        id: Date.now().toString(),  // Unique ID based on timestamp
        name,
        deadline,
       
    };

    assignments.push(newAssignment);
    writeJSON(aonesoneFile, assignments);

    res.status(201).json(newAssignment);  // Respond with the newly created assignment
});

// Update an assignment
app.put('/api/aonesone/:id', (req, res) => {
    const { id } = req.params;
    const { name, deadline } = req.body;

    if (!name || !deadline) {
        return res.status(400).json({ message: 'Assignment name and deadline are required' });
    }

    const assignments = readJSON(aonesoneFile);
    const assignmentIndex = assignments.findIndex(a => a.id === id);

    if (assignmentIndex === -1) {
        return res.status(404).json({ message: 'Assignment not found' });
    }

    assignments[assignmentIndex] = { id, name, deadline };
    writeJSON(aonesoneFile, assignments);

    res.json(assignments[assignmentIndex]);
});

// Delete an assignment
app.delete('/api/aonesone/:id', (req, res) => {
    const { id } = req.params;

    let assignments = readJSON(aonesoneFile);
    const initialLength = assignments.length;

    assignments = assignments.filter(a => a.id !== id);
    if (assignments.length === initialLength) {
        return res.status(404).json({ message: 'Assignment not found' });
    }

    writeJSON(aonesoneFile, assignments);
    res.json({ message: 'Assignment deleted' });
});

// Multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir);
        }
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Profile picture upload route
app.post("/api/profile-picture", upload.single("profilePicture"), (req, res) => {
    if (!loggedInUserId) {
        return res.status(401).json({ error: "No user logged in." });
    }

    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
    }

    const users = readJSON(usersFile);
    const userIndex = users.findIndex((u) => u.id === loggedInUserId);

    if (userIndex === -1) return res.status(404).json({ error: "User not found." });

    // Update the profile picture URL in the user data
    const profilePicturePath = `/uploads/${req.file.filename}`;
    users[userIndex].profilePicture = profilePicturePath;

    writeJSON(usersFile, users); // Save the updated user data

    res.json({ profilePictureUrl: profilePicturePath });
});

// Route to get the profile picture URL
app.get("/api/profile-picture", (req, res) => {
    if (!loggedInUserId) {
        return res.status(401).json({ error: "No user logged in." });
    }

    const users = readJSON(usersFile);
    const user = users.find((u) => u.id === loggedInUserId);

    if (!user) return res.status(404).json({ error: "User not found." });

    res.json({ profilePictureUrl: user.profilePicture || "/uploads/default-profile.png" });
});

app.post('/profile-picture', upload.single('profilePicture'), (req, res) => {
    if (!loggedInUser) {
        return res.status(401).json({ message: 'No user logged in.' });
    }

    const filePath = `/uploads/${req.file.filename}`;
    loggedInUser.profilePicture = filePath;

    fs.readFile(usersFile, 'utf-8', (err, data) => {
        if (err || !data) {
            return res.status(500).json({ message: 'Unable to read user data.' });
        }

        const users = JSON.parse(data);
        const updatedUsers = users.map((user) =>
            user.username === loggedInUser.username ? loggedInUser : user
        );

        fs.writeFile(usersFile, JSON.stringify(updatedUsers, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ message: 'Unable to save user data.' });
            }
            res.json({ profilePictureUrl: filePath, message: 'Profile picture updated successfully!' });
        });
    });
});

// Serve profile picture
app.get('/profile-picture', (req, res) => {
    if (!loggedInUser) {
        return res.status(401).json({ message: 'No user logged in.' });
    }
    const defaultProfilePicture = '/default-profile.png';
    const profilePicture = loggedInUser.profilePicture || defaultProfilePicture;
    res.json({ profilePictureUrl: profilePicture });
});

// Update profile details API
app.put('/api/profiles', upload.single('profileImage'), (req, res) => {
    if (!loggedInUser) {
        return res.status(401).json({ message: 'No user logged in.' });
    }

    // Initialize updatedData with request body data
    const updatedData = {
        ...req.body,
    };

    // Add profileImage path if a new image was uploaded
    if (req.file) {
        updatedData.profileImage = `/uploads/${req.file.filename}`;
    }

    // Update the logged-in user's details
    const updatedUser = { ...loggedInUser, ...updatedData };

    // Update the user data in the JSON file
    fs.readFile(lecloginFile, 'utf-8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Unable to read user data.' });
        }

        let users = [];
        if (data) {
            users = JSON.parse(data);
        }

        const userIndex = users.findIndex((user) => user.username === loggedInUser.username);
        if (userIndex === -1) {
            return res.status(404).json({ message: 'User not found in the database.' });
        }

        users[userIndex] = updatedUser;

        // Save the updated users array back to the file
        fs.writeFile(lecloginFile, JSON.stringify(users, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ message: 'Unable to save user data.' });
            }

            loggedInUser = updatedUser; // Update the global loggedInUser variable
            res.json({ message: 'Profile updated successfully!', user: updatedUser });
        });
    });
});

// Endpoint to get all assignments
app.get('/api/aonesone', (req, res) => {
    const assignments = readJSON(aonesoneFile);
    res.json(assignments);
});

// Endpoint to submit an assignment
app.post('/api/aonesone/:name/submit', upload.single('assignmentFile'), (req, res) => {
    const assignmentName = req.params.name;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const assignments = readJSON(aonesoneFile);
    const assignment = assignments.find(a => a.name === assignmentName);

    if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
    }

    // Update the assignment record
    assignment.submitted = true;
    assignment.submittedFile = file.filename;

    // Save updated data back to assignments.json
    fs.writeFileSync(aonesoneFile, JSON.stringify(assignments, null, 2));

    res.json({
        message: 'Assignment submitted successfully!',
        assignment
    });
});

// Endpoint to delete the submission
app.delete('/api/aonesone/:name/delete', (req, res) => {
const assignmentName = req.params.name;

const assignments = readJSON(aonesoneFile);
const assignment = assignments.find(a => a.name === assignmentName);

if (!assignment || !assignment.submittedFile) {
    return res.status(404).json({ message: 'Submission not found' });
}

// Delete the file from the uploads folder
const filePath = path.join(__dirname, 'uploads', assignment.submittedFile);
if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
}

// Update assignment record
assignment.submitted = false;
assignment.submittedFile = null;

writeJSON(aonesoneFile, assignments);

res.json({ message: 'Submission deleted successfully!' });
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Get all assignments
app.get('/api/aonestwo', (req, res) => {
    const assignments = readJSON(aonestwoFile);
    res.json(assignments);
});

// Add a new assignment
app.post('/api/aonestwo', (req, res) => {
    const { name, deadline } = req.body;

    if (!name || !deadline) {
        return res.status(400).json({ message: 'Assignment name and deadline are required' });
    }

    const assignments = readJSON(aonestwoFile);
    const newAssignment = {
        id: Date.now().toString(),  // Unique ID based on timestamp
        name,
        deadline,
       
    };

    assignments.push(newAssignment);
    writeJSON(aonestwoFile, assignments);

    res.status(201).json(newAssignment);  // Respond with the newly created assignment
});

// Update an assignment
app.put('/api/aonestwo/:id', (req, res) => {
    const { id } = req.params;
    const { name, deadline } = req.body;

    if (!name || !deadline) {
        return res.status(400).json({ message: 'Assignment name and deadline are required' });
    }

    const assignments = readJSON(aonestwoFile);
    const assignmentIndex = assignments.findIndex(a => a.id === id);

    if (assignmentIndex === -1) {
        return res.status(404).json({ message: 'Assignment not found' });
    }

    assignments[assignmentIndex] = { id, name, deadline };
    writeJSON(aonestwoFile, assignments);

    res.json(assignments[assignmentIndex]);
});

// Delete an assignment
app.delete('/api/aonestwo/:id', (req, res) => {
    const { id } = req.params;

    let assignments = readJSON(aonestwoFile);
    const initialLength = assignments.length;

    assignments = assignments.filter(a => a.id !== id);
    if (assignments.length === initialLength) {
        return res.status(404).json({ message: 'Assignment not found' });
    }

    writeJSON(aonestwoFile, assignments);
    res.json({ message: 'Assignment deleted' });
});

// Endpoint to get all assignments
app.get('/api/aonestwo', (req, res) => {
    const assignments = readJSON(aonestwoFile);
    res.json(assignments);
});

// Endpoint to submit an assignment
app.post('/api/aonestwo/:name/submit', upload.single('assignmentFile'), (req, res) => {
    const assignmentName = req.params.name;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const assignments = readJSON(aonestwoFile);
    const assignment = assignments.find(a => a.name === assignmentName);

    if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
    }

    // Update the assignment record
    assignment.submitted = true;
    assignment.submittedFile = file.filename;

    // Save updated data back to assignments.json
    fs.writeFileSync(aonestwoFile, JSON.stringify(assignments, null, 2));

    res.json({
        message: 'Assignment submitted successfully!',
        assignment
    });
});

// Endpoint to delete the submission
app.delete('/api/aonestwo/:name/delete', (req, res) => {
const assignmentName = req.params.name;

const assignments = readJSON(aonestwoFile);
const assignment = assignments.find(a => a.name === assignmentName);

if (!assignment || !assignment.submittedFile) {
    return res.status(404).json({ message: 'Submission not found' });
}

// Delete the file from the uploads folder
const filePath = path.join(__dirname, 'uploads', assignment.submittedFile);
if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
}

// Update assignment record
assignment.submitted = false;
assignment.submittedFile = null;

writeJSON(aonestwoFile, assignments);

res.json({ message: 'Submission deleted successfully!' });
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Get all assignments
app.get('/api/atwosone', (req, res) => {
    const assignments = readJSON(atwosoneFile);
    res.json(assignments);
});

// Add a new assignment
app.post('/api/atwosone', (req, res) => {
    const { name, deadline } = req.body;

    if (!name || !deadline) {
        return res.status(400).json({ message: 'Assignment name and deadline are required' });
    }

    const atwosone = readJSON(atwosoneFile);
    const newAssignment = {
        id: Date.now().toString(),  // Unique ID based on timestamp
        name,
        deadline,
       
    };

    atwosone.push(newAssignment);
    writeJSON(atwosoneFile, atwosone);

    res.status(201).json(newAssignment);  // Respond with the newly created assignment
});

// Update an assignment
app.put('/api/atwosone/:id', (req, res) => {
    const { id } = req.params;
    const { name, deadline } = req.body;

    if (!name || !deadline) {
        return res.status(400).json({ message: 'Assignment name and deadline are required' });
    }

    const atwosone = readJSON(atwosoneFile);
    const assignmentIndex = atwosone.findIndex(a => a.id === id);

    if (assignmentIndex === -1) {
        return res.status(404).json({ message: 'Assignment not found' });
    }

    atwosone[assignmentIndex] = { id, name, deadline };
    writeJSON(atwosoneFile, atwosone);

    res.json(atwosone[assignmentIndex]);
});

// Delete an assignment
app.delete('/api/atwosone/:id', (req, res) => {
    const { id } = req.params;

    let atwosone = readJSON(atwosoneFile);
    const initialLength = atwosone.length;

    atwosone = atwosone.filter(a => a.id !== id);
    if (atwosone.length === initialLength) {
        return res.status(404).json({ message: 'Assignment not found' });
    }

    writeJSON(atwosoneFile, atwosone);
    res.json({ message: 'Assignment deleted' });
});

// Endpoint to get all assignment
app.get('/api/atwosone', (req, res) => {
    const atwosone = readJSON(atwosoneFile);
    res.json(atwosone);
});

// Endpoint to submit an assignment
app.post('/api/atwosone/:name/submit', upload.single('assignmentFile'), (req, res) => {
    const assignmentName = req.params.name;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const atwosone = readJSON(atwosoneFile);
    const assignment = atwosone.find(a => a.name === assignmentName);

    if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
    }

    // Update the assignment record
    assignment.submitted = true;
    assignment.submittedFile = file.filename;

    // Save updated data back to atwosone.json
    fs.writeFileSync(atwosoneFile, JSON.stringify(atwosone, null, 2));

    res.json({
        message: 'Assignment submitted successfully!',
        assignment
    });
});

// Endpoint to delete the submission
app.delete('/api/atwosone/:name/delete', (req, res) => {
const assignmentName = req.params.name;

const atwosone = readJSON(atwosoneFile);
const assignment = atwosone.find(a => a.name === assignmentName);

if (!assignment || !assignment.submittedFile) {
    return res.status(404).json({ message: 'Submission not found' });
}

// Delete the file from the uploads folder
const filePath = path.join(__dirname, 'uploads', assignment.submittedFile);
if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
}

// Update assignment record
assignment.submitted = false;
assignment.submittedFile = null;

writeJSON(atwosoneFile, atwosone);

res.json({ message: 'Submission deleted successfully!' });
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Get all assignments
app.get('/api/atwostwo', (req, res) => {
    const assignments = readJSON(atwostwoFile);
    res.json(assignments);
});

// Add a new assignment
app.post('/api/atwostwo', (req, res) => {
    const { name, deadline } = req.body;

    if (!name || !deadline) {
        return res.status(400).json({ message: 'Assignment name and deadline are required' });
    }

    const atwostwo = readJSON(atwostwoFile);
    const newAssignment = {
        id: Date.now().toString(),  // Unique ID based on timestamp
        name,
        deadline,
       
    };

    atwostwo.push(newAssignment);
    writeJSON(atwostwoFile, atwostwo);

    res.status(201).json(newAssignment);  // Respond with the newly created assignment
});

// Update an assignment
app.put('/api/atwostwo/:id', (req, res) => {
    const { id } = req.params;
    const { name, deadline } = req.body;

    if (!name || !deadline) {
        return res.status(400).json({ message: 'Assignment name and deadline are required' });
    }

    const atwostwo = readJSON(atwostwoFile);
    const assignmentIndex = atwostwo.findIndex(a => a.id === id);

    if (assignmentIndex === -1) {
        return res.status(404).json({ message: 'Assignment not found' });
    }

    atwostwo[assignmentIndex] = { id, name, deadline };
    writeJSON(atwostwoFile, atwostwo);

    res.json(atwostwo[assignmentIndex]);
});

// Delete an assignment
app.delete('/api/atwostwo/:id', (req, res) => {
    const { id } = req.params;

    let atwostwo = readJSON(atwostwoFile);
    const initialLength = atwostwo.length;

    atwostwo = atwostwo.filter(a => a.id !== id);
    if (atwostwo.length === initialLength) {
        return res.status(404).json({ message: 'Assignment not found' });
    }

    writeJSON(atwostwoFile, atwostwo);
    res.json({ message: 'Assignment deleted' });
});

// Endpoint to get all atwostwo
app.get('/api/atwostwo', (req, res) => {
    const atwostwo = readJSON(atwostwoFile);
    res.json(atwostwo);
});

// Endpoint to submit an assignment
app.post('/api/atwostwo/:name/submit', upload.single('assignmentFile'), (req, res) => {
    const assignmentName = req.params.name;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const atwostwo = readJSON(atwostwoFile);
    const assignment = atwostwo.find(a => a.name === assignmentName);

    if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
    }

    // Update the assignment record
    assignment.submitted = true;
    assignment.submittedFile = file.filename;

    // Save updated data back to atwostwo.json
    fs.writeFileSync(atwostwoFile, JSON.stringify(atwostwo, null, 2));

    res.json({
        message: 'Assignment submitted successfully!',
        assignment
    });
});

// Endpoint to delete the submission
app.delete('/api/atwostwo/:name/delete', (req, res) => {
const assignmentName = req.params.name;

const atwostwo = readJSON(atwostwoFile);
const assignment = atwostwo.find(a => a.name === assignmentName);

if (!assignment || !assignment.submittedFile) {
    return res.status(404).json({ message: 'Submission not found' });
}

// Delete the file from the uploads folder
const filePath = path.join(__dirname, 'uploads', assignment.submittedFile);
if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
}

// Update assignment record
assignment.submitted = false;
assignment.submittedFile = null;

writeJSON(atwostwoFile, atwostwo);

res.json({ message: 'Submission deleted successfully!' });
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Get all timetable entries
app.get('/api/tonesone', (req, res) => {
    const timetable = readJSON(tonesoneFile);
    res.json(timetable);
});

// Add a new timetable entry
app.post('/api/tonesone', (req, res) => {
    const { subject, date, time, venue } = req.body;

    if (!subject || !date || !time || !venue) {
        return res.status(400).json({ message: 'Timetable subject, date, time, and venue are required.' });
    }

    const timetable = readJSON(tonesoneFile);
    const newTimetable = {
        id: Date.now().toString(), // Unique ID based on timestamp
        subject,
        date,
        time,
        venue,
       
    };

    timetable.push(newTimetable);
    writeJSON(tonesoneFile, timetable);

    res.status(201).json(newTimetable);
});

// Update a timetable entry
app.put('/api/tonesone/:id', (req, res) => {
    const { id } = req.params;
    const { subject, date, time, venue } = req.body;

    if (!subject || !date || !time || !venue) {
        return res.status(400).json({ message: 'Timetable subject, date, time, venue, year & sem are required.' });
    }

    const timetable = readJSON(tonesoneFile);
    const timetableIndex = timetable.findIndex((entry) => entry.id === id);

    if (timetableIndex === -1) {
        return res.status(404).json({ message: 'Timetable not found.' });
    }

    timetable[timetableIndex] = { id, subject, date, time, venue };
    writeJSON(tonesoneFile, timetable);

    res.json(timetable[timetableIndex]);
});

// Delete a timetable entry
app.delete('/api/tonesone/:id', (req, res) => {
    const { id } = req.params;

    let timetable = readJSON(tonesoneFile);
    const initialLength = timetable.length;

    timetable = timetable.filter((entry) => entry.id !== id);
    if (timetable.length === initialLength) {
        return res.status(404).json({ message: 'Timetable not found.' });
    }

    writeJSON(tonesoneFile, timetable);
    res.json({ message: 'Timetable deleted.' });
});

// Get all timetable entries
app.get('/api/tonestwo', (req, res) => {
    const timetable = readJSON(tonestwoFile);
    res.json(timetable);
});

// Add a new timetable entry
app.post('/api/tonestwo', (req, res) => {
    const { subject, date, time, venue } = req.body;

    if (!subject || !date || !time || !venue) {
        return res.status(400).json({ message: 'Timetable subject, date, time, and venue are required.' });
    }

    const timetable = readJSON(tonestwoFile);
    const newTimetable = {
        id: Date.now().toString(), // Unique ID based on timestamp
        subject,
        date,
        time,
        venue,
       
    };

    timetable.push(newTimetable);
    writeJSON(tonestwoFile, timetable);

    res.status(201).json(newTimetable);
});

// Update a timetable entry
app.put('/api/tonestwo/:id', (req, res) => {
    const { id } = req.params;
    const { subject, date, time, venue } = req.body;

    if (!subject || !date || !time || !venue) {
        return res.status(400).json({ message: 'Timetable subject, date, time, venue, year & sem are required.' });
    }

    const timetable = readJSON(tonestwoFile);
    const timetableIndex = timetable.findIndex((entry) => entry.id === id);

    if (timetableIndex === -1) {
        return res.status(404).json({ message: 'Timetable not found.' });
    }

    timetable[timetableIndex] = { id, subject, date, time, venue };
    writeJSON(tonestwoFile, timetable);

    res.json(timetable[timetableIndex]);
});

// Delete a timetable entry
app.delete('/api/tonestwo/:id', (req, res) => {
    const { id } = req.params;

    let timetable = readJSON(tonestwoFile);
    const initialLength = timetable.length;

    timetable = timetable.filter((entry) => entry.id !== id);
    if (timetable.length === initialLength) {
        return res.status(404).json({ message: 'Timetable not found.' });
    }

    writeJSON(tonestwoFile, timetable);
    res.json({ message: 'Timetable deleted.' });
});

// Get all timetable entries
app.get('/api/ttwosone', (req, res) => {
    const timetable = readJSON(ttwosoneFile);
    res.json(timetable);
});

// Add a new timetable entry
app.post('/api/ttwosone', (req, res) => {
    const { subject, date, time, venue } = req.body;

    if (!subject || !date || !time || !venue) {
        return res.status(400).json({ message: 'Timetable subject, date, time, and venue are required.' });
    }

    const timetable = readJSON(ttwosoneFile);
    const newTimetable = {
        id: Date.now().toString(), // Unique ID based on timestamp
        subject,
        date,
        time,
        venue,
       
    };

    timetable.push(newTimetable);
    writeJSON(ttwosoneFile, timetable);

    res.status(201).json(newTimetable);
});

// Update a timetable entry
app.put('/api/ttwosone/:id', (req, res) => {
    const { id } = req.params;
    const { subject, date, time, venue } = req.body;

    if (!subject || !date || !time || !venue) {
        return res.status(400).json({ message: 'Timetable subject, date, time, venue, year & sem are required.' });
    }

    const timetable = readJSON(ttwosoneFile);
    const timetableIndex = timetable.findIndex((entry) => entry.id === id);

    if (timetableIndex === -1) {
        return res.status(404).json({ message: 'Timetable not found.' });
    }

    timetable[timetableIndex] = { id, subject, date, time, venue };
    writeJSON(ttwosoneFile, timetable);

    res.json(timetable[timetableIndex]);
});

// Delete a timetable entry
app.delete('/api/ttwostwo/:id', (req, res) => {
    const { id } = req.params;

    let timetable = readJSON(ttwosoneFile);
    const initialLength = timetable.length;

    timetable = timetable.filter((entry) => entry.id !== id);
    if (timetable.length === initialLength) {
        return res.status(404).json({ message: 'Timetable not found.' });
    }

    writeJSON(ttwosoneFile, timetable);
    res.json({ message: 'Timetable deleted.' });
});

// Get all timetable entries
app.get('/api/ttwostwo', (req, res) => {
    const timetable = readJSON(ttwostwoFile);
    res.json(timetable);
});

// Add a new timetable entry
app.post('/api/ttwostwo', (req, res) => {
    const { subject, date, time, venue } = req.body;

    if (!subject || !date || !time || !venue) {
        return res.status(400).json({ message: 'Timetable subject, date, time, and venue are required.' });
    }

    const timetable = readJSON(ttwostwoFile);
    const newTimetable = {
        id: Date.now().toString(), // Unique ID based on timestamp
        subject,
        date,
        time,
        venue,
       
    };

    timetable.push(newTimetable);
    writeJSON(ttwostwoFile, timetable);

    res.status(201).json(newTimetable);
});

// Update a timetable entry
app.put('/api/ttwostwo/:id', (req, res) => {
    const { id } = req.params;
    const { subject, date, time, venue } = req.body;

    if (!subject || !date || !time || !venue) {
        return res.status(400).json({ message: 'Timetable subject, date, time, venue, year & sem are required.' });
    }

    const timetable = readJSON(ttwostwoFile);
    const timetableIndex = timetable.findIndex((entry) => entry.id === id);

    if (timetableIndex === -1) {
        return res.status(404).json({ message: 'Timetable not found.' });
    }

    timetable[timetableIndex] = { id, subject, date, time, venue };
    writeJSON(ttwostwoFile, timetable);

    res.json(timetable[timetableIndex]);
});

// Delete a timetable entry
app.delete('/api/ttwostwo/:id', (req, res) => {
    const { id } = req.params;

    let timetable = readJSON(ttwostwoFile);
    const initialLength = timetable.length;

    timetable = timetable.filter((entry) => entry.id !== id);
    if (timetable.length === initialLength) {
        return res.status(404).json({ message: 'Timetable not found.' });
    }

    writeJSON(ttwostwoFile, timetable);
    res.json({ message: 'Timetable deleted.' });
});

// Get all comments
app.get('/api/comments', (req, res) => {
    const comments = readJSON(commentsFile);
    res.json(comments);
});

// Add a new comment
app.post('/api/comments', (req, res) => {
    const { saNumber, text, commentedBy, date } = req.body;
    if (!saNumber || !text) {
        return res.status(400).json({ message: 'SA Number and comment text are required.' });
    }

    const comments = readJSON(commentsFile);
    const newComment = { id: Date.now().toString(), saNumber, text, commentedBy, date };
    comments.push(newComment);
    writeJSON(commentsFile, comments);

    res.status(201).json({ message: 'Comment added successfully!', comment: newComment });
});

// Delete a comment by ID
app.delete('/api/comments/:id', (req, res) => {
    const { id } = req.params;

    const comments = readJSON(commentsFile);
    const commentIndex = comments.findIndex(comment => comment.id === id);

    if (commentIndex === -1) {
        return res.status(404).json({ message: 'Comment not found.' });
    }

    const deletedComment = comments.splice(commentIndex, 1);
    writeJSON(commentsFile, comments);

    res.json({
        message: 'Comment deleted successfully.',
        deletedComment: deletedComment[0]
    });
});

 // Route for submitting contact form
app.post('/api/contact', (req, res) => {
    console.log('Incoming request:', req.body);

    const { name, number, year, email, message } = req.body;
    if (!name || !number || !year || !email || !message) {
        console.error('Validation failed:', req.body);
        return res.status(400).send({ error: 'All fields are required.' });
    }

    const newMessage = { name, number, year, email, message, date: new Date().toISOString() };
    const contactFile = './data/contact.json';

    fs.readFile(contactFile, 'utf8', (err, data) => {
        let contactData = [];

        if (!err && data) {
            try {
                contactData = JSON.parse(data);
            } catch (parseErr) {
                console.error('Error parsing contact.json:', parseErr);
            }
        }

        contactData.push(newMessage);

        fs.writeFile(contactFile, JSON.stringify(contactData, null, 2), (writeErr) => {
            if (writeErr) {
                console.error('Error saving to contact.json:', writeErr);
                return res.status(500).send({ error: 'Failed to save the message.' });
            }

            console.log('Message saved to contact.json:', newMessage);

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'w.chamikaperera@gmail.com',
                    pass: 'mbcoopyhxuugjrvp',
                },
                debug: true,
                logger: true,
            });

            const mailOptions = {
                from: 'w.chamikaperera@gmail.com',
                to: 'studendaffairs@gmail.com',
                subject: `New Contact Form Submission from ${name}`,
                text: `You have received a new message:
Name: ${name}
SA Number: ${number}
Year: ${year}
Email: ${email}
Message: ${message}`,
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Error sending email:', error);
                    return res.status(500).send({ error: 'Failed to send email.' });
                }

                console.log('Email sent successfully:', info.response);
                res.send({ success: 'Message sent and saved successfully.' });
            });
        });
    });
});

// Endpoint to get all help submissions
app.get('/api/help', (req, res) => {
    const helpRequests = readJSON(helpFile);
    res.json(helpRequests);
});

// Endpoint to submit a help request
app.post('/api/help', (req, res) => {
    const { name, email, issueType, details } = req.body;

    if (!name || !email || !issueType || !details) {
        return res.status(400).json({ message: 'All fields (name, email, issueType, details) are required.' });
    }

    const helpRequests = readJSON(helpFile);
    const newHelpRequest = {
        id: Date.now().toString(),
        name,
        email,
        issueType,
        details,
        submittedAt: new Date().toISOString(),
    };

    helpRequests.push(newHelpRequest);
    writeJSON(helpFile, helpRequests);

    res.status(201).json({ message: 'Help request submitted successfully!', request: newHelpRequest });
});

// Endpoint to delete a help request by ID
app.delete('/api/help/:id', (req, res) => {
    const { id } = req.params;
    const helpRequests = readJSON(helpFile);
    const index = helpRequests.findIndex(request => request.id === id);

    if (index === -1) {
        return res.status(404).json({ message: 'Help request not found.' });
    }

    const deletedRequest = helpRequests.splice(index, 1);
    writeJSON(helpFile, helpRequests);

    res.json({
        message: 'Help request deleted successfully.',
        deletedRequest: deletedRequest[0],
    });
});



// Endpoint to fetch all login records
app.get('/api/login-records', (req, res) => {
    const loginRecords = readJSON('LoginRecords.json');
    res.json(loginRecords);
});

app.get('/api/login-records', (req, res) => {
    // Get the search query from the URL (query parameter)
    const search = req.query.search || '';  // Default to empty string if no search query

    // Read login records from the file
    const records = readJSON(loginRecordFile);

    // Aggregate user login data
    const userStats = records.reduce((acc, record) => {
        const { username, email, loginTime } = record;

        // Initialize user data if not already in the accumulator
        if (!acc[username]) {
            acc[username] = {
                email,
                loginCount: 0,
                lastLogin: loginTime,
            };
        }

        // Increment login count and update last login time
        acc[username].loginCount++;
        if (new Date(loginTime) > new Date(acc[username].lastLogin)) {
            acc[username].lastLogin = loginTime;
        }

        return acc;
    }, {});

    // If search query is provided, filter users by username (case-insensitive)
    if (search) {
        const filteredStats = Object.fromEntries(
            Object.entries(userStats).filter(([username]) => username.toLowerCase().includes(search.toLowerCase()))
        );
        return res.json(filteredStats);  // Send filtered results
    }

    // Return all user stats if no search query is provided
    res.json(userStats);
});

// Admin login route
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;

    // Read admin.json file
    fs.readFile(adminFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Server error' });
        }

        try {
            const adminData = JSON.parse(data);
            // Check if the provided credentials match any user in adminData
            const admin = adminData.find(user => user.username === username && user.password === password);

            if (admin) {
                return res.status(200).json({ success: true, message: 'Login successful' });
            } else {
                return res.status(401).json({ success: false, message: 'Invalid username or password' });
            }
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Error processing the data' });
        }
    });
});

// Endpoint to add a notification
app.post('/api/nonesone', (req, res) => {
    const { title, lecturerName, notificationText } = req.body;

    if (!title || !lecturerName || !notificationText) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const newNotification = {
        id: Date.now(),
        title,
        lecturerName,
        notificationText,
        date: new Date().toISOString()
    };

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err && err.code !== 'ENOENT') {
            return res.status(500).json({ success: false, message: 'Error reading file.' });
        }

        const notifications = data ? JSON.parse(data) : [];
        notifications.push(newNotification);

        fs.writeFile(filePath, JSON.stringify(notifications, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error saving notification.' });
            }

            res.json({ success: true, message: 'Notification added successfully.' });
        });
    });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get notifications from nonesone.json
app.get('/nonesone', (req, res) => {
    const filePath = path.join(__dirname, './notification/nonesone.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading notifications:', err);
            return res.status(500).json({ error: 'Failed to load notifications' });
        }
        try {
            const notifications = JSON.parse(data);
            res.json(notifications);
        } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
            res.status(500).json({ error: 'Invalid JSON format in nonesone.json' });
        }
    });
});

// PUT to update a notification
app.put('/nonesone/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const updatedData = req.body;

    fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) return res.status(500).send({ success: false, message: 'Failed to load notifications.' });

        const notifications = JSON.parse(data);

        if (id >= 0 && id < notifications.length) {
            // Merge the original notification with the updated data
            const originalNotification = notifications[id];
            notifications[id] = { ...originalNotification, ...updatedData };

            fs.writeFile(filePath, JSON.stringify(notifications, null, 2), (err) => {
                if (err) return res.status(500).send({ success: false, message: 'Failed to save notification.' });
                res.send({ success: true });
            });
        } else {
            res.status(404).send({ success: false, message: 'Notification not found.' });
        }
    });
});


// DELETE a notification
app.delete('/nonesone/:id', (req, res) => {
    const id = parseInt(req.params.id);

    fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) return res.status(500).send({ success: false, message: 'Failed to load notifications.' });

        const notifications = JSON.parse(data);
        if (id >= 0 && id < notifications.length) {
            notifications.splice(id, 1); // Remove the notification
            fs.writeFile(filePath, JSON.stringify(notifications, null, 2), (err) => {
                if (err) return res.status(500).send({ success: false, message: 'Failed to delete notification.' });
                res.send({ success: true });
            });
        } else {
            res.status(404).send({ success: false, message: 'Notification not found.' });
        }
    });
});

// Endpoint to add a notification
app.post('/api/nonestwo', (req, res) => {
    const { title, lecturerName, notificationText } = req.body;

    if (!title || !lecturerName || !notificationText) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const newNotification = {
        id: Date.now(),
        title,
        lecturerName,
        notificationText,
       
        date: new Date().toISOString()
    };

    fs.readFile(nonestwoFile, 'utf8', (err, data) => {
        if (err && err.code !== 'ENOENT') {
            return res.status(500).json({ success: false, message: 'Error reading file.' });
        }

        const notifications = data ? JSON.parse(data) : [];
        notifications.push(newNotification);

        fs.writeFile(nonestwoFile, JSON.stringify(notifications, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error saving notification.' });
            }

            res.json({ success: true, message: 'Notification added successfully.' });
        });
    });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get notifications from nonestwo.json
app.get('/nonestwo', (req, res) => {
    const nonestwoFile = path.join(__dirname, './notification/nonestwo.json');
    fs.readFile(nonestwoFile, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading notifications:', err);
            return res.status(500).json({ error: 'Failed to load notifications' });
        }
        try {
            const notifications = JSON.parse(data);
            res.json(notifications);
        } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
            res.status(500).json({ error: 'Invalid JSON format in nonesone.json' });
        }
    });
});
// PUT to update a notification
app.put('/nonestwo/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const updatedData = req.body;

    fs.readFile(nonestwoFile, 'utf-8', (err, data) => {
        if (err) return res.status(500).send({ success: false, message: 'Failed to load notifications.' });

        const notifications = JSON.parse(data);

        if (id >= 0 && id < notifications.length) {
            // Merge the original notification with the updated data
            const originalNotification = notifications[id];
            notifications[id] = { ...originalNotification, ...updatedData };

            fs.writeFile(nonestwoFile, JSON.stringify(notifications, null, 2), (err) => {
                if (err) return res.status(500).send({ success: false, message: 'Failed to save notification.' });
                res.send({ success: true });
            });
        } else {
            res.status(404).send({ success: false, message: 'Notification not found.' });
        }
    });
});


// DELETE a notification
app.delete('/nonestwo/:id', (req, res) => {
    const id = parseInt(req.params.id);

    fs.readFile(nonestwoFile, 'utf-8', (err, data) => {
        if (err) return res.status(500).send({ success: false, message: 'Failed to load notifications.' });

        const notifications = JSON.parse(data);
        if (id >= 0 && id < notifications.length) {
            notifications.splice(id, 1); // Remove the notification
            fs.writeFile(nonestwoFile, JSON.stringify(notifications, null, 2), (err) => {
                if (err) return res.status(500).send({ success: false, message: 'Failed to delete notification.' });
                res.send({ success: true });
            });
        } else {
            res.status(404).send({ success: false, message: 'Notification not found.' });
        }
    });
});

// Endpoint to add a notification
app.post('/api/ntwosone', (req, res) => {
    const { title, lecturerName, notificationText } = req.body;

    if (!title || !lecturerName || !notificationText) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const newNotification = {
        id: Date.now(),
        title,
        lecturerName,
        notificationText,
       
        date: new Date().toISOString()
    };

    fs.readFile(ntwosoneFile, 'utf8', (err, data) => {
        if (err && err.code !== 'ENOENT') {
            return res.status(500).json({ success: false, message: 'Error reading file.' });
        }

        const notifications = data ? JSON.parse(data) : [];
        notifications.push(newNotification);

        fs.writeFile(ntwosoneFile, JSON.stringify(notifications, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error saving notification.' });
            }

            res.json({ success: true, message: 'Notification added successfully.' });
        });
    });
});
// PUT to update a notification
app.put('/ntwosone/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const updatedData = req.body;

    fs.readFile(ntwosoneFile, 'utf-8', (err, data) => {
        if (err) return res.status(500).send({ success: false, message: 'Failed to load notifications.' });

        const notifications = JSON.parse(data);

        if (id >= 0 && id < notifications.length) {
            // Merge the original notification with the updated data
            const originalNotification = notifications[id];
            notifications[id] = { ...originalNotification, ...updatedData };

            fs.writeFile(ntwosoneFile, JSON.stringify(notifications, null, 2), (err) => {
                if (err) return res.status(500).send({ success: false, message: 'Failed to save notification.' });
                res.send({ success: true });
            });
        } else {
            res.status(404).send({ success: false, message: 'Notification not found.' });
        }
    });
});

// DELETE a notification
app.delete('/ntwosone/:id', (req, res) => {
    const id = parseInt(req.params.id);

    fs.readFile(ntwosoneFile, 'utf-8', (err, data) => {
        if (err) return res.status(500).send({ success: false, message: 'Failed to load notifications.' });

        const notifications = JSON.parse(data);
        if (id >= 0 && id < notifications.length) {
            notifications.splice(id, 1); // Remove the notification
            fs.writeFile(ntwosoneFile, JSON.stringify(notifications, null, 2), (err) => {
                if (err) return res.status(500).send({ success: false, message: 'Failed to delete notification.' });
                res.send({ success: true });
            });
        } else {
            res.status(404).send({ success: false, message: 'Notification not found.' });
        }
    });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get notifications from nonesone.json
app.get('/ntwosone', (req, res) => {
    const ntwosoneFile = path.join(__dirname, './notification/ntwosone.json');
    fs.readFile(ntwosoneFile, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading notifications:', err);
            return res.status(500).json({ error: 'Failed to load notifications' });
        }
        try {
            const notifications = JSON.parse(data);
            res.json(notifications);
        } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
            res.status(500).json({ error: 'Invalid JSON format in nonesone.json' });
        }
    });
});

// Endpoint to add a notification
app.post('/api/ntwostwo', (req, res) => {
    const { title, lecturerName, notificationText } = req.body;

    if (!title || !lecturerName || !notificationText) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const newNotification = {
        id: Date.now(),
        title,
        lecturerName,
        notificationText,
       
        date: new Date().toISOString()
    };

    fs.readFile(ntwostwoFile, 'utf8', (err, data) => {
        if (err && err.code !== 'ENOENT') {
            return res.status(500).json({ success: false, message: 'Error reading file.' });
        }

        const notifications = data ? JSON.parse(data) : [];
        notifications.push(newNotification);

        fs.writeFile(ntwostwoFile, JSON.stringify(notifications, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error saving notification.' });
            }

            res.json({ success: true, message: 'Notification added successfully.' });
        });
    });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get notifications from nonesone.json
app.get('/ntwostwo', (req, res) => {
    const ntwostwoFile = path.join(__dirname, './notification/ntwostwo.json');
    fs.readFile(ntwostwoFile, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading notifications:', err);
            return res.status(500).json({ error: 'Failed to load notifications' });
        }
        try {
            const notifications = JSON.parse(data);
            res.json(notifications);
        } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
            res.status(500).json({ error: 'Invalid JSON format in nonesone.json' });
        }
    });
});

// PUT to update a notification
app.put('/ntwostwo/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const updatedData = req.body;

    fs.readFile(ntwostwoFile, 'utf-8', (err, data) => {
        if (err) return res.status(500).send({ success: false, message: 'Failed to load notifications.' });

        const notifications = JSON.parse(data);

        if (id >= 0 && id < notifications.length) {
            // Merge the original notification with the updated data
            const originalNotification = notifications[id];
            notifications[id] = { ...originalNotification, ...updatedData };

            fs.writeFile(ntwostwoFile, JSON.stringify(notifications, null, 2), (err) => {
                if (err) return res.status(500).send({ success: false, message: 'Failed to save notification.' });
                res.send({ success: true });
            });
        } else {
            res.status(404).send({ success: false, message: 'Notification not found.' });
        }
    });
});

// DELETE a notification
app.delete('/ntwostwo/:id', (req, res) => {
    const id = parseInt(req.params.id);

    fs.readFile(ntwostwoFile, 'utf-8', (err, data) => {
        if (err) return res.status(500).send({ success: false, message: 'Failed to load notifications.' });

        const notifications = JSON.parse(data);
        if (id >= 0 && id < notifications.length) {
            notifications.splice(id, 1); // Remove the notification
            fs.writeFile(ntwostwoFile, JSON.stringify(notifications, null, 2), (err) => {
                if (err) return res.status(500).send({ success: false, message: 'Failed to delete notification.' });
                res.send({ success: true });
            });
        } else {
            res.status(404).send({ success: false, message: 'Notification not found.' });
        }
    });
});

// Get all lecturers
app.get('/api/lonesone', (req, res) => {
    const lecturers = readJSON(lonesoneFile);
    res.json(lecturers);
});

// Add a new lecturer
app.post('/api/lonesone', (req, res) => {
    const { name, subject, email, } = req.body;

    if (!name || !subject || !email) {
        return res.status(400).json({ message: 'Lecturer name and subject are required' });
    }

    const lecturers = readJSON(lonesoneFile);
    const newLecturer = {
        id: Date.now().toString(),
        name,
        subject,
        email,
      
    };

    lecturers.push(newLecturer);
    writeJSON(lonesoneFile, lecturers);

    res.status(201).json(newLecturer);
});

// Update lecturer details
app.put('/api/lonesone/:id', (req, res) => {
    const lecturerId = req.params.id;
    const updatedDetails = req.body;

    const lecturers = readJSON(lonesoneFile);
    const index = lecturers.findIndex(lect => lect.id === lecturerId);

    if (index === -1) {
        return res.status(404).json({ message: 'Lecturer not found' });
    }

    lecturers[index] = { ...lecturers[index], ...updatedDetails };
    writeJSON(lonesoneFile, lecturers);

    res.json({ message: 'Lecturer updated successfully' });
});

// Delete a lecturer by ID
app.delete('/api/lonesone/:id', (req, res) => {
    const lecturerId = req.params.id;

    const lecturers = readJSON(lonesoneFile);
    const filteredLecturers = lecturers.filter(lecturer => lecturer.id !== lecturerId);

    if (lecturers.length === filteredLecturers.length) {
        return res.status(404).json({ message: 'Lecturer not found' });
    }

    writeJSON(lonesoneFile, filteredLecturers);
    res.json({ message: 'Lecturer deleted successfully' });
});

// Get all lecturers
app.get('/api/lonestwo', (req, res) => {
    const lecturers = readJSON(lonestwoFile);
    res.json(lecturers);
});

// Add a new lecturer
app.post('/api/lonestwo', (req, res) => {
    const { name, subject, email, } = req.body;

    if (!name || !subject || !email) {
        return res.status(400).json({ message: 'Lecturer name and subject are required' });
    }

    const lecturers = readJSON(lonestwoFile);
    const newLecturer = {
        id: Date.now().toString(),
        name,
        subject,
        email,
      
    };

    lecturers.push(newLecturer);
    writeJSON(lonestwoFile, lecturers);

    res.status(201).json(newLecturer);
});

// Update lecturer details
app.put('/api/lonestwo/:id', (req, res) => {
    const lecturerId = req.params.id;
    const updatedDetails = req.body;

    const lecturers = readJSON(lonestwoFile);
    const index = lecturers.findIndex(lect => lect.id === lecturerId);

    if (index === -1) {
        return res.status(404).json({ message: 'Lecturer not found' });
    }

    lecturers[index] = { ...lecturers[index], ...updatedDetails };
    writeJSON(lonestwoFile, lecturers);

    res.json({ message: 'Lecturer updated successfully' });
});

// Delete a lecturer by ID
app.delete('/api/lonestwo/:id', (req, res) => {
    const lecturerId = req.params.id;

    const lecturers = readJSON(lonestwoFile);
    const filteredLecturers = lecturers.filter(lecturer => lecturer.id !== lecturerId);

    if (lecturers.length === filteredLecturers.length) {
        return res.status(404).json({ message: 'Lecturer not found' });
    }

    writeJSON(lonestwoFile, filteredLecturers);
    res.json({ message: 'Lecturer deleted successfully' });
});

// Get all lecturers
app.get('/api/ltwosone', (req, res) => {
    const lecturers = readJSON(ltwosoneFile);
    res.json(lecturers);
});

// Add a new lecturer
app.post('/api/ltwosone', (req, res) => {
    const { name, subject, email, } = req.body;

    if (!name || !subject || !email) {
        return res.status(400).json({ message: 'Lecturer name and subject are required' });
    }

    const lecturers = readJSON(ltwosoneFile);
    const newLecturer = {
        id: Date.now().toString(),
        name,
        subject,
        email,
      
    };

    lecturers.push(newLecturer);
    writeJSON(ltwosoneFile, lecturers);

    res.status(201).json(newLecturer);
});

// Update lecturer details
app.put('/api/ltwosone/:id', (req, res) => {
    const lecturerId = req.params.id;
    const updatedDetails = req.body;

    const lecturers = readJSON(ltwosoneFile);
    const index = lecturers.findIndex(lect => lect.id === lecturerId);

    if (index === -1) {
        return res.status(404).json({ message: 'Lecturer not found' });
    }

    lecturers[index] = { ...lecturers[index], ...updatedDetails };
    writeJSON(ltwosoneFile, lecturers);

    res.json({ message: 'Lecturer updated successfully' });
});

// Delete a lecturer by ID
app.delete('/api/ltwosone/:id', (req, res) => {
    const lecturerId = req.params.id;

    const lecturers = readJSON(ltwosoneFile);
    const filteredLecturers = lecturers.filter(lecturer => lecturer.id !== lecturerId);

    if (lecturers.length === filteredLecturers.length) {
        return res.status(404).json({ message: 'Lecturer not found' });
    }

    writeJSON(ltwosoneFile, filteredLecturers);
    res.json({ message: 'Lecturer deleted successfully' });
});

// Get all lecturers
app.get('/api/ltwostwo', (req, res) => {
    const lecturers = readJSON(ltwostwoFile);
    res.json(lecturers);
});

// Add a new lecturer
app.post('/api/ltwostwo', (req, res) => {
    const { name, subject, email, } = req.body;

    if (!name || !subject || !email) {
        return res.status(400).json({ message: 'Lecturer name and subject are required' });
    }

    const lecturers = readJSON(ltwostwoFile);
    const newLecturer = {
        id: Date.now().toString(),
        name,
        subject,
        email,
      
    };

    lecturers.push(newLecturer);
    writeJSON(ltwostwoFile, lecturers);

    res.status(201).json(newLecturer);
});

// Update lecturer details
app.put('/api/ltwostwo/:id', (req, res) => {
    const lecturerId = req.params.id;
    const updatedDetails = req.body;

    const lecturers = readJSON(ltwostwoFile);
    const index = lecturers.findIndex(lect => lect.id === lecturerId);

    if (index === -1) {
        return res.status(404).json({ message: 'Lecturer not found' });
    }

    lecturers[index] = { ...lecturers[index], ...updatedDetails };
    writeJSON(ltwostwoFile, lecturers);

    res.json({ message: 'Lecturer updated successfully' });
});

// Delete a lecturer by ID
app.delete('/api/ltwostwo/:id', (req, res) => {
    const lecturerId = req.params.id;

    const lecturers = readJSON(ltwostwoFile);
    const filteredLecturers = lecturers.filter(lecturer => lecturer.id !== lecturerId);

    if (lecturers.length === filteredLecturers.length) {
        return res.status(404).json({ message: 'Lecturer not found' });
    }

    writeJSON(ltwostwoFile, filteredLecturers);
    res.json({ message: 'Lecturer deleted successfully' });
});

app.post('/api/event', (req, res) => {
    const newEvents = req.body; // Expecting a flat array of events

    if (!Array.isArray(newEvents)) {
        return res.status(400).json({ error: 'Invalid data format. Expected an array of events.' });
    }

    fs.readFile(eventFile, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return res.status(500).json({ error: 'Error reading file' });
        }

        let events = [];
        if (data) {
            try {
                events = JSON.parse(data);
            } catch (parseError) {
                console.error('Error parsing file:', parseError);
                return res.status(500).json({ error: 'Error parsing file' });
            }
        }

        // Combine existing events with new ones
        events = [...events, ...newEvents];

        fs.writeFile(eventFile, JSON.stringify(events, null, 2), 'utf8', (err) => {
            if (err) {
                console.error('Error writing file:', err);
                return res.status(500).json({ error: 'Error writing file' });
            }
            res.status(200).json({ message: 'Events saved successfully!' });
        });
    });
});


// GET endpoint to fetch events
app.get('/api/event', (req, res) => {
    fs.readFile(eventFile, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading events:', err);
            return res.status(500).send('Error reading events');
        }
        const events = JSON.parse(data || '[]'); // Parse as an array if file is empty
        res.json(events);
    });
});

// POST endpoint to save events
app.post('/api/event', (req, res) => {
    const events = req.body.events; // Extract events from request body
    if (!Array.isArray(events)) {
        return res.status(400).send('Invalid events format');
    }

    fs.writeFile(eventFile, JSON.stringify(events, null, 2), err => {
        if (err) {
            console.error('Error saving events:', err);
            return res.status(500).send('Error saving events');
        }
        res.send('Events saved successfully');
    });
});

// Delete a specific event
app.delete('/api/event/:id', (req, res) => {
    const eventId = req.params.id;

    fs.readFile(eventFile, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return res.status(500).json({ error: 'Error reading events file' });
        }

        let events = data ? JSON.parse(data) : [];
        events = events.filter(event => event.id !== eventId); // Remove event by ID

        fs.writeFile(eventFile, JSON.stringify(events, null, 2), err => {
            if (err) {
                console.error('Error saving file:', err);
                return res.status(500).json({ error: 'Error saving updated events' });
            }
            res.sendStatus(200);
        });
    });
});

// Route to handle payment submissions
app.post('/submit-payment', upload.single('paymentSlip'), (req, res) => {
    const { semesterPlan, studentType, saNumber, fullName, subject, email, phonenumber, paymentMethod, cardNumber, expiryDate, cvv, fee } = req.body;

    // Validate required fields
    if (!semesterPlan || !studentType || !saNumber || !fullName || !subject || !email || !phonenumber || !paymentMethod) {
        return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    // Payment data
    const paymentData = {
        semesterPlan,
        studentType,
        saNumber,
        fullName,
        subject,
        email,
        phonenumber,
        paymentMethod,
        timestamp: new Date().toISOString(),
    };
    const isValidCardNumber = (number) => /^[0-9]{16}$/.test(number);
    const isValidExpiryDate = (date) => /^(0[1-9]|1[0-2])\/[0-9]{2}$/.test(date);
    const isValidCVV = (cvv) => /^[0-9]{3,4}$/.test(cvv);
    const isValidfee = (fee) => /^/.test(fee);
    
    if (paymentMethod === 'Card Payment') {
        if (!isValidCardNumber(cardNumber) || !isValidExpiryDate(expiryDate) || !isValidCVV(cvv) || !isValidfee(fee)) {
            return res.status(400).json({ message: 'Invalid card details.' });
        }
    
    
        paymentData.cardDetails = { cardNumber, expiryDate, cvv, fee };
    } else if (paymentMethod === 'On Bank') {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a payment slip.' });
        }
        paymentData.paymentSlip = req.file.filename;
    }

   // Save to JSON file
   const filePath = path.join(__dirname, 'data', 'plan.json');
   fs.readFile(filePath, (err, data) => {
       if (err && err.code !== 'ENOENT') {
           return res.status(500).send('Error reading payment data.');
       }

       let payments = [];
       if (!err) {
           payments = JSON.parse(data);
       }

       payments.push(paymentData);

       fs.writeFile(filePath, JSON.stringify(payments, null, 2), (err) => {
           if (err) {
               return res.status(500).send('Error saving payment data.');
           }
           res.send('<h2 style="text-align:center;color:green;">Your payment was successfully added!</h2>');
       });
   });
});

// Serve static files
app.use('/data', express.static(path.join(__dirname, 'data')));

// Route for viewing payments
app.get('/view-student-payments', (req, res) => {
    res.sendFile(path.join(__dirname, 'view-student-payments.html'));
});

// Ensure the "data" folder exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Route to save enrollment keys
app.post('/save-enrollment-keys', (req, res) => {
  const enrollmentKeys = req.body;
  const filePath = path.join(dataDir, 'enroll.json');

  fs.writeFile(filePath, JSON.stringify(enrollmentKeys, null, 2), (err) => {
    if (err) {
      console.error('Error writing to file:', err);
      return res.status(500).json({ message: 'Failed to save enrollment keys.' });
    }

    res.status(200).json({ message: 'Enrollment keys saved successfully!' });
  });
});

// Route to fetch enrollment keys
app.get('/get-enrollment-keys', (req, res) => {
    const filePath = path.join(dataDir, 'enroll.json');
  
    fs.readFile(filePath, 'utf-8', (err, data) => {
      if (err) {
        console.error('Error reading file:', err);
        return res.status(500).json({ message: 'Failed to fetch enrollment keys.' });
      }
  
      res.status(200).json(JSON.parse(data));
    });
  });

  
  // Serve enrollment keys
app.get('/enrollment-keys', (req, res) => {
    fs.readFile('./data/enroll.json', 'utf-8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return res.status(500).json({ message: 'Failed to retrieve enrollment keys.' });
        }
        try {
            const keys = JSON.parse(data);
            res.status(200).json(keys);
        } catch (parseErr) {
            console.error('Error parsing JSON:', parseErr);
            res.status(500).json({ message: 'Invalid JSON format in enroll.json file.' });
        }
    });
});

// Define carrier email domains
const carrierDomains = {
    
    dialog: '@mydialog.lk',
    mobitel: '@slt.lk',
    // Add more carriers as needed
};

// Email transporter configuration (replace with your SMTP details)
const transporter = nodemailer.createTransport({
    service: 'Gmail', // Use Gmail or your email provider
    auth: {
        user: 'w.chamikaperera@gmail.com', // Replace with your email
        pass: 'mbcoopyhxuugjrvp', // Replace with your email password or app-specific password
    },
});

// Route to send Email-to-SMS
app.post('/send-message', (req, res) => {
    console.log('Received data:', req.body);

    const { phoneNumber, message, carrier } = req.body;

    // Validate input
    if (!phoneNumber || !message || !carrier) {
        return res.status(400).send({ success: false, error: 'Missing required fields: phoneNumber, message, or carrier.' });
    }

    // Validate carrier
    if (!carrier || typeof carrier !== 'string') {
        return res.status(400).send({ success: false, error: 'Invalid or missing carrier.' });
    }

    const carrierDomain = carrierDomains[carrier.toLowerCase()];
    if (!carrierDomain) {
        return res.status(400).send({ success: false, error: `Carrier '${carrier}' is not supported.` });
    }

    // Construct email address
    const emailAddress = `${phoneNumber}${carrierDomain}`;

    // Send email (assuming nodemailer is configured) 
    const mailOptions = {
        from: 'w.chamikaperera@gmail.com',
        to: emailAddress,
        subject: 'Payment Confirmation',
        text: message,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending message:', error);
            return res.status(500).send({ success: false, error: error.message });
        }
        res.status(200).send({ success: true, info });
    });
});


// Start Server
const PORT = 3005;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));


