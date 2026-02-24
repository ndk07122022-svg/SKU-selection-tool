# SKU Selection Tool

A full-stack web application built to intelligently assist with SKU (Stock Keeping Unit) scoring, strategy analysis, and deployment selection. It replaces a legacy spreadsheet model with a persistent PostgreSQL database, rapid formula caching engine, and interactive React dashboard.

## Overview
The application allows product strategists to:
1. Upload massive `.xlsx` SKU lists and visually map the columns to database fields.
2. Edit target Cost-To-Serve (CTS) configurations and global multipliers, and immediately see the ripple effects on SKU scores.
3. Review SKUs in a portfolio view that recommends an action (e.g. "Launch Now", "Phase Later").
4. Gain analytical insights across markets and categories via the Dashboard.

## Technical Architecture
- **Backend Frame**: Python 3.12, FastAPI, SQLAlchemy (Async), Uvicorn
- **Database Engine**: PostgreSQL via `asyncpg`
- **Frontend Frame**: React 18, Vite, React Router DOM, Vanilla CSS, Lucide Icons

## Core Features
### Import Hub
Upload an `.xlsx` list of SKUs. The tool parses the file to automatically extract column headers and prompts a visual mapping interface. Unmapped columns are safely discarded. Users can also select a fallback "Default Target Market" ensuring all SKUs have baseline settings applied exactly as required for engine calculations.

### SKU Portfolio
Provides a real-time table of your database SKUs complete with visual score-bars and sortable/filterable properties (Market, Channel, Brand). A single click opens an "Edit" interface allowing manual property overrides that securely POST to the backend and trigger cache recalculations.

### Configuration Library
Edit overarching business variables, such as:
- **Global Settings**: Weightings for 15+ sub-scores (Retail Listing, Strategy, Usage Occasion), Financial Multipliers, and minimum score thresholds to pass the "Launch Now" bar.
- **Channel Defaults**: Baseline units and adoption rates tied to distribution channels (e.g. E-Com vs GT vs MT).
- **CTS Matrix**: Complex percentages combining `Target Market` and `Channel` attributes to establish the overarching penalty to gross margin percentage.

## Local Setup

### 1. Database
Ensure you have a PostgreSQL server running locally or accessible via URL.
Create a database (default target: `sku_selector`).

### 2. Backend Initialization
1. Navigate to the `backend` folder and activate your virtual environment:
   ```cmd
   .\venv\Scripts\activate
   ```
2. Install Python dependencies:
   ```cmd
   pip install -r requirements.txt
   ```
3. Set your PostgreSQL URL inside a `.env` file (e.g. `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sku_selector`).
4. Boot the FastAPI local server:
   ```cmd
   uvicorn app.main:app --reload --port 8000
   ```
   *(On initial boot, SQLAlchemy will automatically mount your tables and seed default baseline configuration data if the tables are empty.)*

### 3. Frontend Initialization
1. Open a new terminal and navigate to the `frontend` folder.
2. Install NodeJS dependencies:
   ```cmd
   npm install
   ```
3. Start the Vite hot-reloading development server:
   ```cmd
   npm run dev
   ```
4. Access the web app in your browser at the localized Vite port (usually `http://localhost:5173`).
