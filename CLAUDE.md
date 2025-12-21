# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a GitHub Pages site that aggregates drone flight restriction data from two sources:
- **BAZL** (Swiss Federal Office of Civil Aviation) - Official Swiss government restrictions
- **DJI** - Manufacturer no-fly zones for 45+ drone models

The data is processed through Node.js scripts and exported as JSON files for web map visualization.

**CRITICAL:** This is PRODUCTION data. Changes affect live flight planning tools. Be very careful with modifications.

## Repository Structure

```
Code/
├── BAZL Data retriever/          # Swiss government restriction processor
│   ├── index.js                  # Main script
│   └── data/                     # Historical timestamped outputs
└── DJI NoFlyZones/
    └── dji_data_retriever/       # DJI manufacturer restriction processor
        ├── index.js              # Main script
        └── data/                 # Historical timestamped outputs

FlightObstacleData/               # Final production data files
├── manufacturerFlightObstacles.json    # DJI data (~1.9 MB)
└── unifiedFlightObstacles.json         # BAZL data (~3.4 MB)
```

## Running the Data Retrievers

### BAZL Data Retriever
```bash
cd "Code/BAZL Data retriever"
npm install                       # First time only
npm start                         # Runs node index.js
```

**Output:** `data/BAZLdata_DD-MM-YYYY.json` (timestamped with current date)

**What it does:**
1. Fetches GeoJSON from BAZL API with retry logic (3 attempts)
2. Simplifies polygon geometry (point reduction: 1.0 default, 2.0 for nature zones)
3. Detects circular zones (airports) using variance threshold of 5.0
4. Calculates optimal label positions using polylabel algorithm
5. Converts coordinates from Swiss LV95 to WGS84 decimal degrees
6. Automatically adds `droneMapsVersion` with current date (DD-MM-YYYY format)

### DJI Data Retriever
```bash
cd "Code/DJI NoFlyZones/dji_data_retriever"
npm install                       # First time only
npm start                         # Runs node index.js
```

**Outputs:**
- `data/DJI-NoFlyZones_DD-MM-YYYY.json` - Main output
- `data/securityCopy_DD-MM-YYYY.json` - Backup
- `data/NamesOnly.json` - Simplified list

**What it does:**
1. Queries DJI API for each of 45+ drone models separately
2. Uses two overlapping 135km radius circles to cover all of Switzerland
3. Merges results by `area_id` to deduplicate zones
4. Associates which drone types each restriction applies to
5. Compares with previous version to detect new/removed/updated zones
6. Maintains multilingual names (German, English, Italian, French)

## Key Architecture Details

### BAZL Data Processing Pipeline

The BAZL retriever follows this sequence (orchestrated by `masterMind()`):
1. **getBAZLdata()** - Fetches from `https://data.geo.admin.ch/ch.bazl.einschraenkungen-drohnen/...`
2. **pointReductionAndDDD()** - Simplifies polygon points and detects circles
3. **addLabelCoord()** - Calculates label positions (shows labels for first LS zones and non-LS zones only)
4. **AddDateToData()** - Adds version timestamp
5. **exportData()** - Writes timestamped JSON file

**Circle Detection:** Uses variance analysis with threshold 5.0. Stores `circle: true/false` and `circleRadius` properties.

**Coordinate Conversion:** All input is in Swiss LV95 coordinate system, converted to WGS84 decimal degrees via `LV95ToDDD()`.

### DJI Data Processing Pipeline

The DJI retriever follows this sequence (orchestrated by `masterMind()`):
1. **getAreasByDroneTypes()** - Loops through 45+ drone models defined in `droneModels` object
2. **fetchDataByMultipleCircles()** - Queries two geographic circles:
   - Western Switzerland: 7.318°E, 46.628°N, 135km radius
   - Eastern Switzerland: 8.922°E, 46.718°N, 135km radius
3. **combineAreas()** - Uses lodash `unionBy` to merge by `area_id`
4. **compareWithOldData()** - Detects new/deleted/updated zones
5. **retainRelevantData()** - Filters to essential fields only
6. **Export** - Creates three output files

**Geographic Coverage:** Includes Swiss zones (country === 'CH') plus border zones in France, Germany, Liechtenstein, and Italy (ANNEMASSE, BALE MULHOUSE, FRIEDRICHSHAFEN, KONSTANZ, MONT-BLANC, etc.).

**Default Drone Type:** "DJI Mini 2" - used as reference model.

## Version Management

Both retrievers **automatically set version numbers** using the current system date:
- Format: `DD-MM-YYYY` (e.g., "09-03-2025")
- Field: `droneMapsVersion`
- No manual intervention required

## Important Configuration Constants

### BAZL Retriever (Code/BAZL Data retriever/index.js)
```javascript
const ptReductionDefault = 1;           // Point simplification factor
const ptReductionNature = 2;            // Nature zones (more aggressive)
const CIRCLE_VARIANCE_THRESHOLD = 5;    // Circle detection tolerance
```

### DJI Retriever (Code/DJI NoFlyZones/dji_data_retriever/index.js)
```javascript
const multiCoordinates = [              // Search circles
    {centerLng: 7.317681, centerLat: 46.627911, searchRadiusM: 135000},
    {centerLng: 8.921685, centerLat: 46.718371, searchRadiusM: 135000}
];

const level = "0%2C1%2C2%2C3%2C4%2C7";  // Zone severity levels
const defaultDroneType = "DJI Mini 2";
```

## Dependencies

### BAZL Retriever
- **node-fetch** (v2.7.0) - HTTP requests
- **lodash** (v4.17.21) - Utility functions
- **simplify** (v1.0.0) - Polygon simplification (Ramer-Douglas-Peucker algorithm)
- **polylabel** (v1.1.0) - Optimal label placement in polygons

### DJI Retriever
- **node-fetch** (v2.6.1) - HTTP requests
- **request** (v2.88.2) - HTTP requests (legacy, but still used)
- **lodash** (v4.17.20) - Array/object manipulation (unionBy, merge, find, etc.)
- **deepl-translator** (v1.2.1) - Translation API (loaded but appears unused)

## Data Flow

```
BAZL API (GeoJSON, LV95 coords)
    ↓
BAZL Retriever
    ↓
data/BAZLdata_DD-MM-YYYY.json
    ↓ (manual copy)
FlightObstacleData/unifiedFlightObstacles.json
    ↓
GitHub Pages Web Map

DJI Geo Areas API
    ↓
DJI Retriever (45+ queries)
    ↓
data/DJI-NoFlyZones_DD-MM-YYYY.json
    ↓ (manual copy)
FlightObstacleData/manufacturerFlightObstacles.json
    ↓
GitHub Pages Web Map
```

## Historical Data

Both retrievers maintain timestamped snapshots in their respective `data/` directories:
- **BAZL**: `BAZLdata_DD-MM-YYYY.json` files dating back to May 2024
- **DJI**: `DJI-NoFlyZones_DD-MM-YYYY.json` files dating back to December 2022

These provide version history and rollback capability.

## Git Configuration

The repository is configured to:
- Use Linux line endings (LF) in commits: `core.autocrlf = input`
- Ignore all `node_modules/` directories via `.gitignore`
