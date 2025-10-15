# 🧩 Django + React Real-Time Chat Application

A full-stack application built with **Django REST Framework (DRF)** for the backend and **React.js** for the frontend.  
The project implements **user registration**, **JWT authentication**, **real-time communication using WebSockets (Django Channels)**, and **room creation & management** features.

---

## 🚀 Project Overview

### 🖥 Backend (Django)
**Path:** `D:\BROTOTYPE\Weeks\WEEK-30\Task\Backend`

Features:
- **User Registration** with validation for fields like `email`, `username`, and `password`.
- **JWT Authentication** using Django REST Framework SimpleJWT.
- **WebSockets Integration** with Django Channels for real-time communication.
- **Room Management API** for creating and managing chat rooms.
- **Swagger API Documentation** using `drf-yasg` or `drf-spectacular`.

---

### 💻 Frontend (React)
**Path:** `D:\BROTOTYPE\Weeks\WEEK-30\Task\Frontend`

Features:
- **User Registration Form** with client-side validation and error handling.
- **Login Form** integrated with JWT-based authentication.
- **Room Creation Form** to create chat rooms.
- **Chat Interface** powered by WebSockets for real-time messaging updates.

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-------------|
| Backend | Django, Django REST Framework, Django Channels |
| Authentication | JWT (SimpleJWT) |
| Frontend | React.js, Axios, Tailwind CSS |
| Real-Time Communication | WebSockets |
| Database | SQLite (dev) / PostgreSQL (prod) |
| API Docs | Swagger / ReDoc |

---

## ⚙️ Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd D:\BROTOTYPE\Weeks\WEEK-30\Task\Backend

## Create and activate a virtual environment:
python -m venv venv
venv\Scripts\activate

## Install dependencies:
pip install -r requirements.txt

## Apply migrations:
python manage.py migrate

## Run the development server:
python manage.py runserver

## Access:

API: http://127.0.0.1:8000

# ⚙️ Frontend Setup
### Navigate to the frontend directory:

cd D:\BROTOTYPE\Weeks\WEEK-30\Task\Frontend
### Install dependencies:

npm install
### Create a .env file and add:
VITE_API_BASE_URL

### Start the React development server:
npm run dev

### Access Frontend:
http://127.0.0.1:5173/

## 🔐 Authentication Flow
### Registration

User submits registration form → API validates input → Account created.

Login

User enters credentials → Backend returns JWT tokens.

Frontend stores token in local storage(redux) → Axios sends token in headers.

Logout

Token cleared from client → session ends.

💬 WebSocket Flow (Real-Time Chat)
Django Channels handles WebSocket connections.

Each chat room has a unique room ID.

When a user sends a message:

It’s sent via WebSocket to the backend.

The backend broadcasts it to all users in that room.

The frontend receives the message instantly and updates the chat UI.

# 🧪 Testing
Backend Testing
Framework: Django’s built-in TestCase.

Run tests:

python manage.py test
Includes:

User registration & authentication tests.

Room creation API tests.

WebSocket connection tests.

# Frontend Testing
Framework: Jest + React Testing Library

Test files are under:

src/pages/__tests__/
Run tests:

npm test
Includes:

Form validation tests.

API call mocking with Axios.

Component rendering tests.

Coverage Goals
Component	Coverage Target
Backend APIs	≥ 85%
Frontend Components	≥ 80%
Integration Tests	100% of main flows

## 🧩 Project Structure
Backend
bash
Copy code
Backend/
│
├── api/
│   ├── views.py
│   ├── models.py
│   ├── serializers.py
│   └── urls.py
│
├── signaling/
│   ├── consumers.py  # WebSocket consumers
│   └── routing.py
│
├── Backend/
│   ├── asgi.py
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
│
└── manage.py
Frontend
bash
Copy code
Frontend/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/      # Axios & API helpers
│   ├── context/       # Auth context
│   └── App.jsx
│
└── vite.config.js
## 🧰 Tools & Libraries Used
### Backend
django

djangorestframework

channels

djangorestframework-simplejwt


### Frontend
react

axios

react-router-dom

tailwindcss

jest, @testing-library/react


## 📜 License
This project is developed for educational purposes as part of the Brototype Week-30 Task.

## 👤 Author
Mebin Mathew
Full Stack Developer | Django & React Enthusiast
📧 Email: mebinmathew006@gmail.com
🌐 GitHub: github.com/mebinmathew006