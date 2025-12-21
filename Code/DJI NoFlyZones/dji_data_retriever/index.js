console.log("Starting to filter data from dji")

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const { result } = require('lodash');
const { waitForDebugger } = require('inspector');

// load data
const centerLng = 8.082397868288922;
const centerLat = 46.63249422305324;
const searchRadiusM = 300000;
const level = "0%2C1%2C2%2C3%2C4%2C7";
// const level = "1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9";

const multiCoordinates = [
    {centerLng : 7.317681,
    centerLat : 46.627911,
    searchRadiusM : 135000},
    {centerLng : 8.921685,
    centerLat : 46.718371,
    searchRadiusM : 135000}
]

const droneModels = {
    "dji-mavic-3-classic" : "DJI Mavic 3 Classic",
    "industry-260" : "DJI Mavic 3E/3T/3M",
    "dji-avata" : "DJI Avata",
    "dji-avata-2" : "DJI Avata 2",
    "dji-mini-3" : "DJI Mini 3",
    "dji-mini-3-pro" : "DJI Mini 3 Pro",
    "dji-mini-4-pro" : "DJI Mini 4 Pro",
    "dji-mini-se" : "DJI Mini SE",
    "dji-air-2s" : "DJI Air 2S",
    "dji-air-3" : "DJI Air 3",
    "dji-fpv" : "DJI FPV",
    "dji-mini-2" : "DJI Mini 2",
    "dji-flycart-30" : "DJI FlyCart 30",
    "mg1p" : "MG-1S/1A/1P-RTK/T10/T16/T20/T30", 
    "mg-new" : "T10/T20P/T25/T30/T50",
    "mg-new-t60" : "T60/T25p",
    "m100" : "M100",
    "m600-series" : "M600 Series", 
    "m300-series" : "M300 Series",
    "m200-series" : "M200 Series",
    "m350-rtk" : "M350 RTK",
    "inspire-1-series" : "Inspire 1 Series", 
    "inspire-2" : "Inspire 2", 
    "inspire-3" : "Inspire 3",
    "phantom-3-4K" : "Phantom 3 4K",
    "phantom-3-se" : "Phantom 3 SE", 
    "phantom-3-standard" : "Phantom 3 Standard", 
    "phantom-3-advanced" : "Phantom 3 Advanced", 
    "phantom-3-pro" : "Phantom 3 Pro", 
    "phantom-4-multispectral" : "Phantom 4 Multispectral",
    "phantom-4-rtk": "Phantom 4 RTK", 
    "phantom-4" : "Phantom 4", 
    "phantom-4-advanced" : "Phantom 4 Advanced", 
    "phantom-4-pro" : "Phantom 4 Pro",
    "spark" : "Spark", 
    "mavic-pro" : "Mavic Pro", 
    "mavic-2" : "Mavic 2", 
    "mavic-2-enterprise" : "Mavic 2 Enterprise",
    "dji-mavic-3" : "DJI Mavic 3",
    "dji-mavic-3-classic" : "DJI Mavic 3 Classic",
    "dji-mavic-3-pro" : "DJI Mavic 3 Pro",
    "mavic-mini" : "Mavic Mini",
    "mavic-air": "Mavic Air", 
    "mavic-air-2" : "Mavic Air 2", 



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

// original: `https://www-api.dji.com/ch/api/geo/areas?lng=${centerLng}&lat=${centerLat}&country=CH&search_radius=${searchRadiusM}&drone=${droneModel}&level=1%2C2%2C4%2C7&zones_mode=total`
const url_A = `https://www-api.dji.com/ch/api/geo/areas?lng=${centerLng}&lat=${centerLat}&country=CH&search_radius=${searchRadiusM}&drone=`;
const url_B =  `&level=${level}&zones_mode=total`;

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
    await Promise.all(droneTypes.map(async(droneType) => {
        try {
            let areasByDroneType = await fetchDataByMultipleCircles(droneType);
            if (areasByDroneType.code !== 101) {
                allAreasByAllDrones[droneModels[droneType]] = areasByDroneType;
                successfullyFetchedDroneTypes.push(droneModels[droneType]);
                counter += _.size(allAreasByAllDrones[droneModels[droneType]]);
            } else {
                console.log(droneType + " could no be fetched");
            }
        } catch (err) {
            console.log(err);
        };
        await sleep(100);
    }));
    console.log("total number of fetched areas: " + counter);
    return allAreasByAllDrones;
}

async function fetchDataByMultipleCircles(droneType) {
    let multiResponse = [];
    for (let i = 0; i < _.size(multiCoordinates); i++) {
        await sleep(100);
        const coordinate = multiCoordinates[i];
        const lat = coordinate.centerLat;
        const lng = coordinate.centerLng;
        const rad = coordinate.searchRadiusM;
        const URL = `https://www-api.dji.com/ch/api/geo/areas?lng=${lng}&lat=${lat}&country=CH&search_radius=${rad}&drone=${droneType}&level=${level}&zones_mode=total`;

        // multiple requests for testing:
        // const response = await multiRequests(URL, droneType);
        let response = 0;
        let counter = 0;

        while(response == 0) {
            response = await getData(URL);
            counter += 1;
            await sleep(200);
            if (counter > 3) {
                console.log("could not fetch " + URL)
                break;
            };
        };

        multiResponse.push(response);
    }
    await Promise.all(multiResponse);

    let combinedResponses = _.unionBy(multiResponse[0], multiResponse[1], "area_id");

    // console.log("response a, b, combined: ", _.size(multiResponse[0]), _.size(multiResponse[1]), _.size(combinedResponses));

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

async function getData(url){
    let response
    try {
      response = await fetch(url);
      const allAreas = await response.json();
      const relevantForeignAreas = allAreas.areas.filter(area => _.includes(zonesOverlappingBorders, area.name));
      const swissAreas = allAreas.areas.filter(area => area.country === 'CH');
      const relevantZones = _.union(relevantForeignAreas, swissAreas);
      return relevantZones;
    } catch (error) {
      //console.log("response getData :", error);
      return 0;
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