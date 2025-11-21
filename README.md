# DCISM Aim Trainer

A web-based aim and precision training game built with HTML5 Canvas, Vanilla JavaScript, and PHP.

## Features

- 🎯 **Classic Mode**: Click targets before they disappear (3 lives system)
- 🏆 **Global Leaderboard**: Compete with players worldwide
- 📊 **Player Statistics**: Track your progress and improvement
- 👤 **User Accounts**: Sign up to save scores and compete
- 👻 **Guest Mode**: Play without an account (scores saved to session)
- 🌈 **Dark/Neon Theme**: Modern gaming aesthetic
- 📱 **Responsive Design**: Optimized for desktop and tablets

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6 Modules), HTML5 Canvas, CSS3
- **Backend**: PHP 8.0+, RESTful API
- **Database**: MySQL/MariaDB
- **Server**: Apache (XAMPP local, university LAMP stack)

---

## Setup Instructions

### Prerequisites

- XAMPP (or any Apache + PHP + MySQL stack)
- PHP 8.0 or higher
- MySQL 5.7 or MariaDB 10.3+
- Modern web browser (Chrome, Firefox, Edge, Safari)

### 1. Local Development Setup (XAMPP)

#### Step 1: Clone/Copy the Project

Place the `DCISM_Aim` folder in your XAMPP htdocs directory:
```
C:\xampp\htdocs\DCISM_Aim\
```

#### Step 2: Configure Environment Variables

The project already includes a `.env` file configured for XAMPP. Verify it contains:

```env
DB_HOST=127.0.0.1
DB_USER=root
DB_PASS=
DB_NAME=s11700029_aim
```

If you need different credentials, edit the `.env` file accordingly.

#### Step 3: Create the Database

1. Start XAMPP (Apache and MySQL)
2. Open phpMyAdmin: `http://localhost/phpmyadmin`
3. Create a new database named `s11700029_aim`
4. Import the schema:
   - Click on the database
   - Go to the **Import** tab
   - Select file: `database/migrations/001_initial_schema.sql`
   - Click **Go**

This will create all tables and seed initial game mode data.

#### Step 4: Test the Application

1. Open your browser
2. Navigate to: `http://localhost/DCISM_Aim/`
3. You should see the home page with "DCISM AIM TRAINER"

#### Step 5: Create a Test Account

1. Click **Sign Up**
2. Create a test account (e.g., username: `testuser`, password: `test1234`)
3. Click **Play** to start the game

---

### 2. Production Deployment (University Server)

#### Step 1: Prepare Production Environment File

1. Copy `.env.example.prod` to `.env`:
   ```bash
   cp .env.example.prod .env
   ```

2. Edit `.env` with your production credentials:
   ```env
   DB_HOST=localhost
   DB_USER=s11700029_aim
   DB_PASS=Nigger69420
   DB_NAME=s11700029_aim
   ```

#### Step 2: Upload Files

Upload all project files to your university server's public directory (usually `public_html` or `www`).

**IMPORTANT**: Make sure **NOT** to upload:
- `.env` file (create it directly on the server)
- `initial-prompt.txt`
- `MySQL Connection guide.txt`

These files are in `.gitignore` and should not be deployed.

#### Step 3: Set Up Database on University Server

1. Access phpMyAdmin at `https://dbadmin.dcism.org/`
2. Login with your database credentials
3. Create database if not exists (it should already exist as `s11700029_aim`)
4. Import `database/migrations/001_initial_schema.sql`

#### Step 4: Test Production Deployment

Navigate to your deployed URL and verify:
- Home page loads correctly
- Sign up/login works
- Game starts and plays correctly
- Scores are saved
- Leaderboard displays properly

---

## Project Structure

```
DCISM_Aim/
├── api/                      # Backend API endpoints
│   ├── auth/                 # Authentication endpoints
│   │   ├── login.php
│   │   ├── signup.php
│   │   └── logout.php
│   ├── scores/
│   │   └── save.php          # Save game scores
│   ├── user/
│   │   └── stats.php         # User statistics
│   ├── game-modes.php        # Get available game modes
│   └── leaderboard.php       # Leaderboard data
│
├── assets/                   # Frontend assets
│   ├── css/
│   │   └── style.css         # Main stylesheet
│   └── js/
│       ├── app.js            # Main application entry
│       ├── router.js         # SPA routing
│       ├── auth.js           # Authentication logic
│       ├── api.js            # API communication
│       └── game.js           # Game engine
│
├── config/                   # Configuration files
│   ├── env-loader.php        # Environment variable loader
│   ├── database.php          # Database connection
│   └── utils.php             # Utility functions
│
├── database/
│   └── migrations/
│       └── 001_initial_schema.sql  # Database schema
│
├── .env                      # Environment variables (local)
├── .env.example.dev          # Development template
├── .env.example.prod         # Production template
├── .gitignore                # Git ignore rules
├── index.html                # Main HTML file
└── README.md                 # This file
```

---

## API Endpoints

### Authentication
- `POST /api/auth/login.php` - User login
- `POST /api/auth/signup.php` - User registration
- `POST /api/auth/logout.php` - User logout

### Game Data
- `GET /api/game-modes.php` - List all game modes
- `POST /api/scores/save.php` - Save game score (requires auth)
- `GET /api/leaderboard.php?mode={id}&limit={n}&offset={n}` - Get leaderboard
- `GET /api/user/stats.php?user_id={id}&mode={id}` - Get user statistics

---

## Game Mechanics (Classic Mode)

- **Lives**: 3 lives per game
- **Target Behavior**:
  - Appears at random position on canvas
  - Grows for 1.2 seconds (15px → 75px diameter)
  - Shrinks for 0.8 seconds (75px → 15px diameter)
  - Total lifespan: 2.0 seconds
- **Scoring**:
  - +1 point for each successful hit
  - -1 life if target expires without being clicked
  - Clicks outside targets don't count as misses
- **Anti-Spam**: 50ms cooldown between clicks
- **Game Over**: When all 3 lives are lost

---

## Security Features

- Password hashing with `PASSWORD_BCRYPT`
- SQL injection prevention (prepared statements)
- XSS protection (input sanitization)
- Session management with configurable lifetime
- Environment variable configuration (no hardcoded credentials)
- CORS headers for same-origin requests

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Microsoft Edge 90+
- Safari 14+

**Note**: Mobile portrait mode is not supported. The game requires landscape orientation on a larger screen for optimal precision gameplay.

---

## Troubleshooting

### Database Connection Error

**Error**: "Database connection failed"

**Solution**:
1. Check `.env` file exists and has correct credentials
2. Verify MySQL/MariaDB is running
3. Ensure database `s11700029_aim` exists
4. Check PHP has `mysqli` extension enabled

### Login/Signup Not Working

**Error**: Session or authentication issues

**Solution**:
1. Ensure cookies are enabled in browser
2. Clear browser cache and cookies
3. Check session configuration in PHP (session.save_path)
4. Verify API endpoints return proper JSON

### Game Canvas Not Showing

**Error**: Blank or missing canvas

**Solution**:
1. Check browser console for JavaScript errors
2. Ensure all JS modules are loaded (`app.js`, `game.js`, etc.)
3. Verify browser supports ES6 modules
4. Clear browser cache

### Leaderboard Empty

**Error**: "No scores yet"

**Solution**:
1. Play at least one game while logged in
2. Check if score was saved (check browser console)
3. Verify `scores` table has data in database
4. Ensure user is authenticated

---

## Future Enhancements (Coming Soon)

- ⏱️ **Time Attack Mode**: Score max points in 60 seconds
- 🏃 **Speed Run Mode**: Hit 50 targets as fast as possible
- 🎯 **Precision Mode**: Smaller targets, no life penalty
- 💪 **Endurance Mode**: Increasing difficulty over time
- 🔊 **Audio Feedback**: Sound effects for hits/misses
- ✨ **Visual Effects**: Particle effects on target hit
- 🏅 **Achievements System**: Unlock badges and rewards

---

## Contributing

This is a student project for DCISM. For issues or suggestions, please contact the developer.

---

## License

This project is created for educational purposes as part of a university assignment.

---

## Credits

**Developer**: [Your Name]
**Course**: DCISM
**Year**: 2024

Built with ❤️ using Vanilla JavaScript and PHP
#   d c i s m _ a i m  
 