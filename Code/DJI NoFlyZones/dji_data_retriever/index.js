console.log("Starting to filter data from dji")

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const { result } = require('lodash');
const { waitForDebugger } = require('inspector');

// load data - Using new flysafe-api.dji.com API with rectangle coordinates
const level = "0,1,2,3,7,8,10"; // Note: No URL encoding needed for new API

// Define rectangle coordinates for Switzerland
// Format: ltlat (top-left lat), ltlng (top-left lng), rblat (bottom-right lat), rblng (bottom-right lng)
const multiCoordinates = [
    // Western Switzerland
    {
        ltlat: 47.8,  // North edge
        ltlng: 5.9,   // West edge
        rblat: 45.8,  // South edge
        rblng: 8.0    // East edge
    },
    // Eastern Switzerland
    {
        ltlat: 47.8,  // North edge
        ltlng: 8.0,   // West edge
        rblat: 45.8,  // South edge
        rblng: 10.5   // East edge
    }
]

const droneModels = {
    // Mavic Series
    "dji-mavic-3-classic" : "DJI Mavic 3 Classic",
    "dji-mavic-3-pro" : "DJI Mavic 3 Pro",
    "dji-mavic-4-pro" : "DJI Mavic 4 Pro",
    "industry-260" : "DJI Mavic 3E/3T/3M",
    "mavic-pro" : "Mavic Pro",
    "mavic-2" : "Mavic 2",
    "mavic-2-enterprise" : "Mavic 2 Enterprise",

    // Mini Series
    "dji-mini-2" : "DJI Mini 2",
    "dji-mini-3" : "DJI Mini 3",
    "dji-mini-3-pro" : "DJI Mini 3 Pro",
    "dji-mini-4-pro" : "DJI Mini 4 Pro",
    "dji-mini-4k" : "DJI Mini 4K",
    "dji-mini-5-pro" : "DJI Mini 5 Pro",
    "dji-mini-se" : "DJI Mini SE",
    "mavic-mini" : "Mavic Mini",

    // Air Series
    "dji-air-2s" : "DJI Air 2S",
    "dji-air-3" : "DJI Air 3",
    "dji-air-3s" : "DJI Air 3S",
    "mavic-air": "Mavic Air",
    "mavic-air-2" : "Mavic Air 2",

    // FPV/Avata Series
    "dji-avata" : "DJI Avata",
    "dji-avata-2" : "DJI Avata 2",
    "dji-fpv" : "DJI FPV",
    "dji-neo" :  "DJI NEO",
    "dji-neo-2" : "DJI NEO 2",
    "dji-flip" : "DJI FLIP",

    // Phantom Series
    "phantom-3-4K" : "Phantom 3 4K",
    "phantom-3-se" : "Phantom 3 SE",
    "phantom-3-standard" : "Phantom 3 Standard",
    "phantom-3-advanced" : "Phantom 3 Advanced",
    "phantom-3-pro" : "Phantom 3 Pro",
    "phantom-4" : "Phantom 4",
    "phantom-4-advanced" : "Phantom 4 Advanced",
    "phantom-4-pro" : "Phantom 4 Pro",
    "phantom-4-pro-v2" : "Phantom 4 Pro V2.0",
    "phantom-4-multispectral" : "Phantom 4 Multispectral",
    "phantom-4-rtk": "Phantom 4 RTK",
    "spark" : "Spark",

    // Matrice Series (Professional)
    "m100" : "M100",
    "m200-series" : "M200 Series",
    "m30-series" : "M30 Series",
    "m300-series" : "M300 Series",
    "m350-rtk" : "M350 RTK",
    "m-400" : "M400",
    "m600-series" : "M600 Series",
    "dji-matrice-3d-3td" : "DJI Matrice 3D/3TD",
    "dji-matrice-4d-4td" : "DJI Matrice 4D/4TD",
    "dji-matrice-4t-4e" : "DJI Matrice 4T/4E",

    // Inspire Series
    "inspire-1-series" : "Inspire 1 Series",
    "inspire-2" : "Inspire 2",
    "inspire-3" : "Inspire 3",

    // Agricultural Drones
    "mg1p" : "MG-1S/1A/1P-RTK",
    "mg-new" : "T10/T20P/T25/T30/T50",
    "mg-new-t10" : "T10",
    "mg-new-t25" : "T25",
    "mg-new-t25p" : "T25P",
    "mg-new-t30" : "T30",
    "mg-new-t40" : "T40",
    "mg-new-t50" : "T50",
    "mg-new-t55" : "T55",
    "mg-new-t60" : "T60",
    "mg-new-t70" : "T70",
    "mg-new-t70-s" : "T70-S",
    "mg-new-t100" : "T100",
    "mg-new-t100-s" : "T100-S",

    // Logistics Drones
    "dji-flycart-30" : "DJI FlyCart 30",
    "dji-flycart-100" : "DJI FlyCart 100"
};

const defaultDroneType = "DJI Mini 2";

const zonesOverlappingBorders = [
    "ANNEMASSE", "Annemasse",
    "BALE MULHOUSE", "BALE-MULHOUSE", "BALE SUISSE", "BASLE FRANCE CTR", "Mulhouse", "BASLE SWISS CTR", "BASLE GERMANY CTR 2", 
    "HERTEN-RHEINFELDEN", "Herten-Rheinfelden",
    "WALDSHUT",
    "BINNINGEN",
    "HILZINGEN",
    "KONSTANZ", "Konstanz",
    "FRIEDRICHSHAFEN", "FRIEDRICHSHAFEN CTR",
    "National Prison Vaduz",
    "BALZERS/FL",
    "GLACIER DU TOUR",
    "ARBOIS",
    "Blumberg",
    "Binningen",
    "MTA MENOUVE",
    "MONT-BLANC",
    "THEODULGLETSCHER",
    "GENEVA CTR",
    "ARCHAMPS TECHNOPOLE",
    "Place de tir des Raclerets",
    "BOHLHOF", "Bohlhof"
];

// get date
let today = new Date();
let dd = String(today.getDate()).padStart(2, '0');
let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
let yyyy = today.getFullYear();
today = dd + '-' + mm + '-' + yyyy;

// define outputPath
const outputPath = path.join('.', 'data', 'DJI-NoFlyZones_' + today + '.json');
const outputPathNamesOnly = path.join('.', 'data', 'NamesOnly.json');
const outputPathSecurityCopy = path.join('.', 'data', 'securityCopy_' + today + '.json');

//get predefined names from NamesOnly file
let oldNames = [];

//load existing data
// let oldData = [];

let checkFetchedData = [];


//create array to store all fetched droneTypes
let successfullyFetchedDroneTypes = [];

masterMind();

async function masterMind() {
    try {
        const oldData = await getJSONfromFile(outputPath)
        const areasByDrones = await getAreasByDroneTypes();
        // write(areasByDrones, outputPathSecurityCopy);
        const combindedAreas = combineAreas(areasByDrones);
        // write(combindedAreas, outputPathSecurityCopy);
        write(checkFetchedData, outputPathSecurityCopy);
        const relevantData = await retainRelevantData(combindedAreas);
        compareWithOldData(relevantData, oldData);
        const dataToOutput = addAdditionalDataToOutput(relevantData);
        // have a look at all existing numbers of area types:
        // checkForTypes(dataToOutput);
        console.log(getAreaTypes(dataToOutput))
        exportData(oldData, dataToOutput);
    } catch (err) {
        console.log(err);
    }
}

function checkForTypes(dataToOutput) {
    let types = new Set();
    dataToOutput.areas.forEach(area => {
        types.add(area.type)
    })
    let result = Array.from(types);
    console.log(result);
}

async function getAreaTypes (data) {
    let areaTypes ={};
    data.areas.forEach((area) => {
        //if (areaTypes[area.type])
        areaTypes[area.type] = [area.name, area.droneType]
    });
    return areaTypes;
}

async function fetchOldData() {
    oldData = await getJSONfromFile(outputPath)
}

function addAdditionalDataToOutput(areasByDrones) {
    let dataToOutput = {};
    dataToOutput.droneMapsVersion = today; // Add version timestamp (same format as BAZL data)
    dataToOutput.defaultDroneType = defaultDroneType;
    dataToOutput.droneTypes = successfullyFetchedDroneTypes;
    dataToOutput.areas = areasByDrones;
    return dataToOutput;
}

function exportData(oldData, relevantData){
    if(!_.isEmpty(relevantData)){
        write(oldData, outputPathSecurityCopy);
        write(relevantData, outputPath);
        const simpleFile = createSimpleFile(relevantData);
        //Timeout to prevent problems with reading and writing to the file at the same time
        setTimeout(() => {  
            write(simpleFile, outputPathNamesOnly);
        }, 100);
    } else {
        console.log('Error at updating.');
    }
}

function mergeObjectsInArray(roles) {

    // Custom merge function ORs together non-object values, recursively
    // calls itself on Objects.
    var merger = function (a, b) {
      if (_.isObject(a)) {
        return _.merge({}, a, b, merger);
      } else {
        return a || b;
      }
    };
  
    // Allow roles to be passed to _.merge as an array of arbitrary length
    var args = _.flatten([{}, roles, merger]);
    return _.merge.apply(_, args);
}

function compareWithOldData(newData, oldData) {
    const zonesToChange = getChanges(oldData, newData);
    if(!_.isEmpty(zonesToChange.toAdd)  || !_.isEmpty(zonesToChange.toDelete)) {
        console.log("new areas: ", zonesToChange.toAdd.length, " deleted areas: ", zonesToChange.toDelete.length);
    } else if (_.isEmpty(oldData)) {
        console.log("New file created")
    } else {
        console.log("No new areas. Existing areas updated");
    }
}

async function retainRelevantData(areasByDrones) {
    let relevantData = [];
    let counter = 0;
    //add important entries to new JSON
    await Promise.all(Object.values(areasByDrones).map(async(area) => {
        counter += 1;
        let newArea = {};
        newArea.area_id = area.area_id;
        newArea.droneType = area.droneType;
        newArea.name = await createNameDict(areasByDrones, area.area_id);
        newArea.type = area.type;
        newArea.lat = area.lat;
        newArea.lng = area.lng;
        newArea.level = area.level;
        newArea.sub_areas = retainRelevantDataSubareas(area.sub_areas);
        relevantData.push(newArea);
      }));
    console.log("Total no. areas : " + counter);
    return relevantData;
}

async function urlBuilder(url_A, url_B, droneModels) {
    let URLs = {};
    droneModels.forEach(model => {
        let newURL = url_A + model + url_B;
        URLs[model] = newURL; 
        // console.log(newURL);
    }) 
    return URLs;
}

async function getAreasByDroneTypes() {
    let allAreasByAllDrones = {};
    let droneTypes = Object.keys(droneModels);
    counter = 0;
    let processedCount = 0;
    const totalDrones = droneTypes.length;

    console.log(`\n📡 Fetching data for ${totalDrones} drone types...\n`);

    await Promise.all(droneTypes.map(async(droneType) => {
        try {
            let areasByDroneType = await fetchDataByMultipleCircles(droneType);

            if (areasByDroneType && areasByDroneType.code !== 101) {
                allAreasByAllDrones[droneModels[droneType]] = areasByDroneType;
                successfullyFetchedDroneTypes.push(droneModels[droneType]);
                counter += _.size(allAreasByAllDrones[droneModels[droneType]]);

                processedCount++;
                const areasCount = _.size(areasByDroneType);
                if (areasCount > 0) {
                    console.log(`✓ ${processedCount}/${totalDrones}: ${droneType} - ${areasCount} areas`);
                } else {
                    console.log(`○ ${processedCount}/${totalDrones}: ${droneType} - 0 areas (no restrictions)`);
                }
            } else {
                processedCount++;
                console.log(`✗ ${processedCount}/${totalDrones}: ${droneType} - fetch failed`);
            }
        } catch (err) {
            processedCount++;
            console.log(`✗ ${processedCount}/${totalDrones}: ${droneType} - error: ${err.message}`);
        };
        await sleep(100);
    }));

    console.log(`\n📊 Summary: ${counter} total areas from ${successfullyFetchedDroneTypes.length}/${totalDrones} drone types\n`);
    return allAreasByAllDrones;
}

async function fetchDataByMultipleCircles(droneType) {
    let multiResponse = [];
    let failedFetches = 0;
    const MAX_RETRIES = 4; // Will try 1 initial + 3 retries = 4 total attempts

    for (let i = 0; i < _.size(multiCoordinates); i++) {
        const rect = multiCoordinates[i];

        // NEW API: flysafe-api.dji.com with rectangle coordinates
        const URL = `https://flysafe-api.dji.com/api/qep/geo/feedback/areas/in_rectangle?ltlat=${rect.ltlat}&ltlng=${rect.ltlng}&rblat=${rect.rblat}&rblng=${rect.rblng}&zones_mode=flysafe_website&drone=${droneType}&level=${level}`;

        let response = null;
        let attemptCount = 0;

        // Retry logic with exponential backoff
        while(response === null && attemptCount < MAX_RETRIES) {
            // Exponential backoff: 500ms, 1000ms, 2000ms, 4000ms
            if (attemptCount > 0) {
                const backoffTime = 500 * Math.pow(2, attemptCount - 1);
                await sleep(backoffTime);
            } else {
                await sleep(100); // Small delay before first attempt
            }

            response = await getData(URL, attemptCount);
            attemptCount += 1;
        };

        // If still null after all retries, it failed
        if (response === null) {
            failedFetches++;
            response = []; // Set to empty array to prevent errors downstream
        }

        multiResponse.push(response);
    }
    await Promise.all(multiResponse);

    // Only log if ALL fetches for this drone failed
    if (failedFetches === multiCoordinates.length) {
        console.log(`❌ FAILED: ${droneType} - could not fetch data after ${MAX_RETRIES * multiCoordinates.length} total attempts`);
    } else if (failedFetches > 0) {
        console.log(`⚠ PARTIAL: ${droneType} - ${failedFetches}/${multiCoordinates.length} regions failed`);
    }

    let combinedResponses = _.unionBy(multiResponse[0], multiResponse[1], "area_id");

    return combinedResponses;
}


function combineAreas(areasByDrones) {
    let allAreasByAllDrones = {};
    const droneTypes = Object.keys(areasByDrones);

    console.log("# of drones types: " + droneTypes.length);
    
    for(let i = 0; i < _.size(droneTypes); i++) {
        let droneType = droneTypes[i];
        let areasBydroneType = areasByDrones[droneType];
        // console.log(droneType, _.size(areasBydroneType))
        let responseToCheck = addAreaByDroneType(allAreasByAllDrones, areasBydroneType, droneType);
        if(!_.isEmpty(responseToCheck)) {
            allAreasByAllDrones = responseToCheck;
        }
        sleep(100);
        // console.log(droneType, _.size(allAreasByAllDrones));
    }
    return allAreasByAllDrones;
}

function addAreaByDroneType(existingAreas, newAreas, droneType) {
    // let test = mergeObjectsInArray(_.merge(existingAreas,newAreas))
    // return test
    let areasWithDroneTypes = existingAreas;
    // console.log(droneType);
    newAreas.forEach(newArea => {
        // check if undefined in order to prevent serious troubles
        if (typeof(newArea) == "undefined") {
            return areasWithDroneTypes = {};
        } else {
            const area_id = newArea.area_id;
            if(typeof existingAreas[String(area_id)] == "undefined") {
                newArea.droneType = [droneType];
                areasWithDroneTypes[area_id] = newArea;
            } else {
                // console.log("passed " + droneType);
                // console.log(typeof existingAreas[String(area_id)].droneType, area_id);
                existingAreas[String(area_id)].droneType.push(droneType);
                areasWithDroneTypes = existingAreas;
            }
        }
    })
    // console.log(newAreas.length, Object.keys(areasWithDroneTypes).length, droneType)
    return areasWithDroneTypes;
};

async function getData(url, retryCount = 0){
    const MAX_TIMEOUT = 10000; // 10 seconds timeout
    let response;

    try {
      // Fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), MAX_TIMEOUT);

      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      clearTimeout(timeoutId);

      // Check HTTP status
      if (!response.ok) {
        if (retryCount === 0) {
          console.log(`⚠ HTTP ${response.status} for URL (will retry)`);
        }
        return null;
      }

      // Parse JSON
      const jsonResponse = await response.json();

      // Validate response structure
      if (!jsonResponse) {
        if (retryCount === 0) {
          console.log(`⚠ Empty response body (will retry)`);
        }
        return null;
      }

      // NEW API structure: {code: 0, message: {...}, data: {areas: [...]}}
      // Check for API error code
      if (jsonResponse.code !== 0) {
        if (retryCount === 0) {
          console.log(`⚠ API returned error code ${jsonResponse.code} (will retry)`);
        }
        return null;
      }

      // Extract areas from data object
      const allAreas = jsonResponse.data;
      if (!allAreas || !allAreas.areas) {
        if (retryCount === 0) {
          console.log(`⚠ Missing 'data.areas' in response (will retry)`);
        }
        return null;
      }

      if (!Array.isArray(allAreas.areas)) {
        if (retryCount === 0) {
          console.log(`⚠ 'data.areas' is not an array (will retry)`);
        }
        return null;
      }

      // Filter relevant zones
      const relevantForeignAreas = allAreas.areas.filter(area => _.includes(zonesOverlappingBorders, area.name));
      const swissAreas = allAreas.areas.filter(area => area.country === 'CH');
      const relevantZones = _.union(relevantForeignAreas, swissAreas);

      // Success! Return array (even if empty)
      return relevantZones;

    } catch (error) {
      // Only log on first attempt to reduce noise
      if (retryCount === 0) {
        if (error.name === 'AbortError') {
          console.log(`⚠ Request timeout after ${MAX_TIMEOUT}ms (will retry)`);
        } else {
          console.log(`⚠ Fetch error: ${error.message} (will retry)`);
        }
      }
      return null;
    }
};


async function getJSONfromFile(filePath) {
    // console.log(filePath)
    return new Promise(resolve => {
        fs.readFile(filePath, 'utf8', function(err, result) {
            if (err) {
                resolve([]);
            } else {
                resolve(JSON.parse(result));
            }
        })
    })
}

function createSimpleFile(JSONtoOutput){
    let newJSONtoOutput = [];
    _.forEach(JSONtoOutput, function(area){
        let simpleArea = {};
        simpleArea.area_id = area.area_id;
        simpleArea.name = area.name;
        // simpleArea.type = area.type;
        // simpleArea.lat = area.lat;
        // simpleArea.lng = area.lng;
        // simpleArea.level = area.level;
        newJSONtoOutput.push(simpleArea);
    })
    return newJSONtoOutput;
}

async function createNameDict(swissAreas, area_id) {
    let name = findNameById(oldNames, swissAreas, area_id);
    if (typeof name === 'object' && name !== null) {
        return name;
    } else {
        let newNameObject = {};
        newNameObject.de = name;
        newNameObject.en = name;
        newNameObject.it = name;
        newNameObject.fr = name;
        return newNameObject;
    }
}


function retainRelevantDataSubareas(sub_areas) {
    let newSub_areas = [];
    _.forEach(sub_areas, function(subArea) {
        let newSubArea = {};
        newSubArea.color = subArea.color;
        newSubArea.height = subArea.height;
        newSubArea.lat = subArea.lat;
        newSubArea.lng = subArea.lng;
        newSubArea.radius = subArea.radius;
        newSubArea.polygon_points = subArea.polygon_points;
        newSub_areas.push(newSubArea);
    })
    return newSub_areas;
}

function findNameById(oldData, newData, area_id) {
    let area = _.find(oldData, {"area_id" : area_id});
    if (area === undefined || _.isEmpty(area.name)) {
        area = _.find(newData, {"area_id" : area_id})
    } 
    return area.name;
}

function getChanges(oldData, newData) {

    const oldAreaIds = getAreaIds(oldData.areas);
    const newAreaIds = getAreaIds(newData);

    const areasToDelete = _.compact(_.difference(oldAreaIds, newAreaIds)); 
    const areasToAdd = _.compact(_.difference(newAreaIds, oldAreaIds));

    return {"toDelete" : areasToDelete, "toAdd" : areasToAdd};
}

function getAreaIds(obj) {
    let collAreaIds = [];
    _.forEach(obj, area => {
        collAreaIds.push(area.area_id)
    })
    return collAreaIds;
}

function write(JSONtoOutput, outputPath) {
    fs.writeFile(outputPath, JSON.stringify(JSONtoOutput), 'UTF-8', () => {
        console.log("Result written to " + outputPath);
    })
}

//deprecated functions

async function multiRequests(URL, droneType){
    const repetitions = 3;
    let responses = [];
    for (let i = 0; i < repetitions; i++) {
        try {
            let areasByRepetition = await getData(URL);
            if (areasByRepetition.code !== 101) {
                responses.push(areasByRepetition);
            } else {
                console.log(droneType + " could no be fetched");
            }
        } catch (err) {
            console.log(err);
        };
        // await sleep(1000)
    }
    await Promise.all(responses)
    let areaCount = [];
    responses.forEach(response => {
        areaCount.push(_.size(response));
    })

    console.log(droneType, areaCount);

    responses = mergeObjectsInArray(responses);
    return responses;
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}   