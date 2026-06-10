# AERORBIS — Aerospace Engineering, Design, & AI Analysis Platform

AERORBIS is a premium, high-fidelity aerospace engineering platform designed to help students, aerospace researchers, and engineers model, calculate, and analyze complex aerospace systems. 

The application runs entirely client-side, utilizing local storage, public APIs, and Cloud Firestore for the community forum, requiring zero server maintenance or paid backend services.

---

## Key Features & Tools

### 1. Aerospace Engineering Calculators

AERORBIS hosts a robust suite of interactive, production-ready aerospace calculators:

*   **Orbital Path & Delta-V Planner**: Interactive 3D orbital trajectory simulation, planetary flybys, and Hohmann transfer delta-V analysis. Includes real-time upcoming rocket launch tracking using the Space Devs API.
*   **Satellite Tracking Visualizer**: Propagates ISS and Starlink satellites in real-time over a 3D Earth using SGP4 orbital mechanics, fetching live TLE orbital data directly from CelesTrak.
*   **Aerodynamic Lift, Drag & Stability Analyzer**: High-fidelity stability analysis based on Raymer, Roskam, Anderson, and USAF DATCOM formulations. Simulates pitching moments, neutral point, static margin, and lift-drag polars.
*   **Fluid Mechanics & Performance**: Wing loading, thrust loading, climb performance, and Reynolds number calculators.
*   **Standard Atmosphere Calculator**: Calculates temperature, pressure, density, speed of sound, and viscosity across tropospheric, stratospheric, and mesospheric layers (up to 86 km) under the US Standard Atmosphere 1976 model.
*   **Materials Database**: Interactive structural materials library showcasing density, yield strength, thermal properties, and spaceflight compatibility.

### 2. Interactive AI Assistants (Aerobot & RF Solver)

*   **Aerobot AI Assistant**: A conversational aerospace advisor built on top of the Groq API (powered by Llama-3.3-70B). Aerobot has immediate access to your active calculator state (inputs, results, steps, warnings) to explain design calculations.
*   **Antenna & Avionics Solver**: A specialized natural-language solver to estimate link budgets, Doppler shifts, rain attenuation (Ku-band), and radar cross-sections.

### 3. Collaborative Community Hub

*   **Community Forum**: Share calculation results, discuss design choices, and post ideas. Built securely on top of Cloud Firestore.

---

## How it Works: Free Client-Side Architecture

AERORBIS is built to be completely free to run and host by shifting all computation and data fetching to the client browser:

1.  **Database Storage**: User profiles and community posts are stored in Cloud Firestore under the free Firebase Spark plan.
2.  **API Key Safety**: Your Groq API key is stored safely in your local environment file (`.env.local`). Direct browser-to-API requests are handled locally without exposing credentials to a third-party server.
3.  **TLE & Launch Data**: Live TLE coordinates are retrieved directly from CelesTrak using `allorigins.win` CORS proxy. Launch schedules are queried directly from the public Space Devs API, with offline mock fallbacks in place.
4.  **Local History**: Your calculations, assistant sessions, and custom orbits are persisted locally inside `localStorage` for privacy and speed.

---

## File Structure

```text
src/
├── components/            # Shared UI components, layout, and assistant
│   ├── tools/            # Calculators (Orbital, Lift/Drag, Antenna, etc.)
│   └── ui/               # Radix and tailwind UI blocks
├── contexts/              # React Context providers (Auth, AI assistant)
├── data/                  # Airfoil descriptions, presets, and materials
├── hooks/                 # Custom react hooks (Auth, LiveSatellites, ToolContext)
├── lib/                   # API clients and utilities (aerobot-api, pdfExport)
├── pages/                 # Routing pages (Community, Dashboard, Research)
└── services/              # Client-side API gateways (geminiClient)
```

---

## Local Development Setup

To run the application locally, follow these steps:

### Prerequisites

*   Node.js (v18 or higher)
*   npm or bun

### Step 1: Clone and Install Dependencies

```bash
git clone <repository-url>
cd AERORBIS
npm install
```

### Step 2: Configure Environment Variables

Create a `.env.local` file in the root directory and add your Groq API key:

```env
VITE_GROQ_API_KEY="your_groq_api_key_here"
```

### Step 3: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Production Deployment

You can host this static React web app for free on platforms like **GitHub Pages**, **Vercel**, **Netlify**, or **Firebase Hosting**. 

Since there are no backend cloud functions to deploy, hosting costs are **$0.00**!
