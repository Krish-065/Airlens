<div align="center">
  <h1>AirLens</h1>
  <p><strong>Bridging the gap between air quality data and visual reality.</strong></p>
</div>

---

## 1. The Concept (Info)

In today's world, air quality data (AQI) is widely available. Weather apps and environmental monitors can easily tell you that the AQI in your city is 150. But what does an AQI of 150 *actually look like*? Is it a thick smog? Is it vehicular pollution? Are there localized garbage fires that the official sensors are missing? 

**AirLens** was built to solve this exact problem. While sensors provide the numbers, AirLens relies on a community-driven approach to capture the visual reality of pollution. Users can snap photos of local air quality conditions—whether it's smog, industrial emissions, or clear skies—and upload them to the platform. 

By combining real-time API data from the World Air Quality Index (WAQI) with geolocated, user-submitted visual evidence, AirLens creates a hyper-local, transparent, and undeniable view of the air we breathe.

## 2. About the UI

AirLens doesn't just present data; it offers an immersive, premium user experience. We believe that an app designed to raise awareness about the environment should feel modern, fluid, and highly engaging.

-  **Reacting Backgrounds & Smoke Effects**: The application features dynamic, reactive backgrounds that change based on context, including an interactive smoke particle effect that responds to the user's cursor.
-  **Custom Interactive Cursor**: A custom animated leaf cursor replaces the default pointer on desktop, adding a layer of playfulness and connection to the environmental theme.
-  **GSAP & Framer Motion Animations**: Every interaction, page transition, and scroll event is carefully choreographed with smooth, high-performance animations.
-  **Glassmorphism & Modern Aesthetics**: The interface utilizes frosted glass components, tailored HSL color palettes (deep emeralds and mints), and sleek typography to create a state-of-the-art feel.
-  **Fully Responsive**: Whether you are uploading a report from your mobile phone on the street or browsing the map on a 4K monitor, the UI adapts flawlessly.

## 3. How it Works (Technical Overview)

AirLens is a modern full-stack web application. It connects a highly interactive frontend with a robust, scalable backend architecture. 

### Tech Stack
- **Frontend**: Built with **React** and **Vite** for lightning-fast HMR and optimized builds. Styling is handled via **Tailwind CSS**, and animations are powered by **Framer Motion** and **GSAP**.
- **Backend**: A robust **Node.js / Express** server handles API requests, authentication (JWT), and moderation.
- **Database**: We use **PostgreSQL** alongside the **Prisma ORM** for safe, strongly-typed database queries.
- **APIs & Integrations**: 
  - **WAQI (World Air Quality Index)**: Fetches real-time AQI data and interpolates it for regions without physical sensors.
  - **Cloudinary**: Handles high-performance image uploads, storage, and optimization for user reports.
  - **Geoapify**: Used for reverse-geocoding and autocomplete to ensure accurate location tagging.

### Features
- **Dynamic AQI Map**: View real-time air quality stations alongside user-submitted reports on an interactive map.
- **Community Feed**: Sort and filter user reports by newest, most confirmed, or AQI severity.
- **Gamification**: Users earn "coins" for uploading verifiable reports, encouraging active participation.
- **Admin Dashboard**: A hidden workspace for admins to monitor users, manage reports, and review content moderation flags.

## 4. How to Use It (Local Setup)

Want to run AirLens locally? Follow these steps:

### Prerequisites
- Node.js (v18+)
- PostgreSQL installed and running locally
- API Keys for Cloudinary, WAQI, and Geoapify

### 1. Clone the Repository
```bash
git clone https://github.com/Divya-tech06/Airlens.git
cd Airlens
```

### 2. Setup the Backend (Server)
```bash
cd server
npm install
```
- Create a `.env` file in the `server` directory (use `.env.example` as a template).
- Add your `DATABASE_URL`, `JWT_SECRET`, `WAQI_API_TOKEN`, and `CLOUDINARY` credentials.
- Push the database schema:
```bash
npx prisma db push
```
- Start the server:
```bash
npm run dev
```

### 3. Setup the Frontend (Client)
Open a new terminal and navigate to the client folder:
```bash
cd client
npm install
```
- Create a `.env` file in the `client` directory.
- Add your `VITE_API_URL` (usually `http://localhost:5000/api`) and `VITE_LOCATION_KEY` (Geoapify).
- Start the frontend development server:
```bash
npm run dev
```

### 4. Explore
Open your browser and navigate to the localhost port provided by Vite (usually `http://localhost:5173`). Start exploring, uploading, and changing the way we see air quality!
