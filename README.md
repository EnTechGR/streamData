# Vessel Tracking Map Application

This application provides real-time vessel tracking using Leaflet for map visualization and Socket.IO for real-time data streaming.

## Features

- **Real-Time Vessel Updates:** Displays real-time vessel positions on a map.
- **Custom Vessel Markers:** Uses custom icons to represent vessels.
- **Control Panel:** Allows users to pause/play updates, adjust speed, and view active vessel count.
- **Streaming Status:** Displays the current streaming status and file processing progress.
- **Interactive Map:** Shows detailed information about each vessel in a popup.

---

## Table of Contents

- [Getting Started](#getting-started)
- [File Structure](#file-structure)
- [Map Features](#map-features)
- [Socket.IO Events](#socketio-events)
- [Development Notes](#development-notes)

---

## Getting Started

### Prerequisites

- Node.js and npm installed on your system.
- Required assets:
  - `marker-icon.png` and `marker-shadow.png` in `/stylesheets/images/`.

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
