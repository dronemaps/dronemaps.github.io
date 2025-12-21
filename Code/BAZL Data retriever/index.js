const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const { result } = require('lodash');
const simplify = require('simplify');
const polylabel = require('polylabel');

const URLbazl = "https://data.geo.admin.ch/ch.bazl.einschraenkungen-drohnen/einschraenkungen-drohnen/einschraenkungen-drohnen_2056.json";

// get date
let today = new Date();
let dd = String(today.getDate()).padStart(2, '0');
let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
let yyyy = today.getFullYear();
today = dd + '-' + mm + '-' + yyyy;

// define outputPath
const outputPath = path.join('.', 'data', 'BAZLdata_' + today + '.json');

//define point reduction: 0.1 = low reduction, 5 = enormous reduction
const ptReductionDefault = 1; // Standard-Punktreduktion
const ptReductionNature = 2; // Punktreduktion für "NATURE"
const CIRCLE_VARIANCE_THRESHOLD = 5; // Erhöhe diesen Wert, um Kreise toleranter zu erkennen


masterMind();

async function masterMind() {
    try {
        //testPolylabel()
        const BAZLdata = await getBAZLdata();
        const reducedBAZLdata = await pointReductionAndDDD(BAZLdata);
        const labeledBAZLdata = await addLabelCoord(reducedBAZLdata);
        const addedVersionBAZLdata = await AddDateToData(labeledBAZLdata);
        exportData(addedVersionBAZLdata, outputPath);
    } catch (err) {
        console.log(err);
    }
}

async function AddDateToData(labeledBAZLdata) {
    labeledBAZLdata.droneMapsVersion = today;
    return labeledBAZLdata;
}



async function getBAZLdata() {
    let response = [];
    let counter = 0;

    while(response == 0) {
        response = await getData(URLbazl);
        counter += 1;
        await sleep(200);
        if (counter > 3) {
            console.log("could not fetch " + URLbazl)
            break;
        };
    };
    return response;
}

async function pointReductionAndDDD(BAZLdata) {
    let test = [];
    for (const UASZone of BAZLdata.features) {
        const currentPtReduction = UASZone.reason && UASZone.reason.includes("NATURE") 
            ? ptReductionNature 
            : ptReductionDefault;

        if (!test.some(item => isEqual(item, UASZone.type))) {
            test.push(UASZone.type);
        }

        let isCircleZone = false; // Standardwert für die Erkennung von Kreisen
        let circleRadius = null; // Initialisiere den Radius

        for (const geodata of UASZone.geometry) {
            if (geodata.horizontalProjection.type === "Polygon") {
                for (const polygon of geodata.horizontalProjection.coordinates) {
                    const circleData = isCircle(polygon); // Hol die Kreis-Daten zurück
                    isCircleZone = circleData.isCircle; // Setze den isCircle-Wert
                    circleRadius = circleData.circleRadius; // Setze den Radius-Wert

                    const reducedPoints = await reducePointsAndConvert(polygon, currentPtReduction);
                    polygon.splice(0, polygon.length, ...reducedPoints);
                }
            } else if (geodata.horizontalProjection.type === "MultiPolygon") {
                for (const polygonArray of geodata.horizontalProjection.coordinates) {
                    for (const polygon of polygonArray) {
                        const circleData = isCircle(polygon); // Hol die Kreis-Daten zurück
                        isCircleZone = circleData.isCircle; // Setze den isCircle-Wert
                        circleRadius = circleData.circleRadius; // Setze den Radius-Wert

                        const reducedPoints = await reducePointsAndConvert(polygon, currentPtReduction);
                        polygon.splice(0, polygon.length, ...reducedPoints);
                    }
                }
            }
        }

        // Füge die Eigenschaft "circle" und "circleRadius" zum Feature hinzu
        UASZone.circle = isCircleZone;
        UASZone.circleRadius = circleRadius; // Speichere den Radius
    }
    return BAZLdata;
}

function calculateLV95Distance(lat1, lon1, lat2, lon2) {
    const dx = lat2 - lat1;  // Differenz der X-Koordinaten
    const dy = lon2 - lon1;  // Differenz der Y-Koordinaten
    return Math.sqrt(dx * dx + dy * dy); // euklidische Distanz in Metern
}

function isCircle(polygon) {
    if (polygon.length < 8) return { isCircle: false, circleRadius: null }; // Ein Kreis sollte viele Punkte haben

    let centerX = 0, centerY = 0;

    // Berechne den Mittelpunkt der LV95-Koordinaten
    polygon.forEach(point => {
        centerX += point[0];
        centerY += point[1];
    });
    centerX /= polygon.length;
    centerY /= polygon.length;

    // Berechne den Radius anhand der Entfernung zwischen Mittelpunkt und einem Punkt auf dem Rand
    const firstPoint = polygon[0];
    const radius = calculateLV95Distance(centerX, centerY, firstPoint[0], firstPoint[1]);

    // Berechne die Distanzen von allen Polygonpunkten und prüfe, ob sie ähnlich sind
    let distances = polygon.map(point => calculateLV95Distance(centerX, centerY, point[0], point[1]));

    // Berechne den Durchschnittsabstand und die Varianz
    let avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    let variance = distances.map(d => Math.pow(d - avgDistance, 2)).reduce((a, b) => a + b, 0) / distances.length;

    const isCircleZone = variance < CIRCLE_VARIANCE_THRESHOLD; // Nutzt jetzt die Variable

    if (isCircleZone) {
        return { isCircle: true, circleRadius: avgDistance }; // Durchschnittlicher Abstand als Radius
    } else {
        return { isCircle: false, circleRadius: 0 };
    }
}



function testPolylabel() {
    // Beispiel-Polygon (ein einfaches Quadrat)
    const examplePolygon = [ [
        [46.139857, 8.907565], [46.139595, 8.906751], [46.139588, 8.906758], [46.13942, 8.906468], 
        [46.139287, 8.906634], [46.139215, 8.906631], [46.139029, 8.906249], [46.138805, 8.90573], 
        [46.138807, 8.905702], [46.138864, 8.905614], [46.139033, 8.905771], [46.139125, 8.905839], 
        [46.139181, 8.905866], [46.139248, 8.905878], [46.139215, 8.905594], [46.139787, 8.905127], 
        [46.140178, 8.904775], [46.140524, 8.904334], [46.140542, 8.90429], [46.140709, 8.904031], 
        [46.142127, 8.903068], [46.142152, 8.903109], [46.14224, 8.903196], [46.142327, 8.903265], 
        [46.142398, 8.903356], [46.14242, 8.903368], [46.142499, 8.903453], [46.142484, 8.903573], 
        [46.14244, 8.903657], [46.142406, 8.90393], [46.142353, 8.904038], [46.142234, 8.904128], 
        [46.141911, 8.904304], [46.141728, 8.904369], [46.140593, 8.905186], [46.140286, 8.905466], 
        [46.14036, 8.905627], [46.14057, 8.905758], [46.140696, 8.906], [46.1409, 8.90634], 
        [46.140896, 8.907357], [46.140928, 8.908708], [46.142104, 8.908599], [46.142326, 8.910312], 
        [46.141516, 8.910562], [46.141417, 8.910452], [46.141303, 8.910428], [46.141067, 8.910442], 
        [46.140954, 8.910332], [46.140813, 8.909968], [46.1407, 8.90958], [46.140736, 8.909309], 
        [46.140812, 8.908951], [46.14084, 8.908603], [46.140824, 8.908248], [46.139951, 8.908343], 
        [46.139908, 8.907727], [46.139857, 8.907565]]
    ];
    
    // Präzision einstellen
    const precision = 1.0;
    
    // Polylabel-Funktion auf das Test-Polygon anwenden
    const label = polylabel(examplePolygon, precision, true);
    console.log('Label:', label);
}


async function addLabelCoord(reducedBAZLdata) {
    for (const UASZone of reducedBAZLdata.features) {
        const identifier = UASZone.identifier || "";

            // Setze showLabel basierend auf der Identifier-Logik
            if ((identifier.startsWith("LS") && (identifier.endsWith("001") || identifier.endsWith("-01"))) || 
                !identifier.startsWith("LS")) {
                UASZone.showLabel = true;
            } else if (!identifier.startsWith("LS")) {
                UASZone.showLabel = true;
            } else {
                UASZone.showLabel = false;
            }
            
        for (const geodata of UASZone.geometry) {
            // Wenn es nur ein Polygon hat:
            if (geodata.horizontalProjection.type === 'Polygon') {
                // Stelle sicher, dass das Polygon in der richtigen Struktur vorliegt
                const polygon = geodata.horizontalProjection.coordinates;
                const labelCoordinates = await polylabel(polygon, 1.0, true);
                // Schreibe die bearbeiteten Daten zurück in den Dictionary
                geodata.horizontalProjection.label = labelCoordinates;
            } else if (geodata.horizontalProjection.type === 'MultiPolygon') {
                // Wenn mehrere Polygons pro UAS-Zone in einem Array sind:
                const labelCoordinatesArr = [];
                let polygonCount = 0;

                for (const polygonArray of geodata.horizontalProjection.coordinates) {
                    polygonCount += polygonArray.length;
                    const labelCoordinates = await Promise.all(
                        polygonArray.map(async (polygon) => await polylabel([polygon], 1.0, true))
                    );
                    labelCoordinatesArr.push(labelCoordinates);
                }
                //console.log(`Anzahl der Polygone: ${polygonCount}`);
                //console.log(`Anzahl der Labels: ${labelCoordinatesArr.flat().length}`);
                // Schreibe die bearbeiteten Daten zurück in den Dictionary
                geodata.horizontalProjection.label = labelCoordinatesArr;
            }
        }
    }
    return reducedBAZLdata;
}


async function reducePointsAndConvert(polygon, reductionFactor) {
    let numberBefore = polygon.length;
    const reducedArray = simplify(polygon, reductionFactor, true);
    let toSwissData = await convertToSwissData(reducedArray);
    let numberAfter = toSwissData.length;
    return toSwissData;
}



async function convertToSwissData(array) {
    const convertedArray = await Promise.all(array.map(async (point) => {
        const convertedPoint = await LV95ToDDD(point);
        // Sicherstellen, dass die Punkte Zahlen sind
        return [parseFloat(convertedPoint[0]), parseFloat(convertedPoint[1])];
    }));
    return convertedArray;
}


async function LV95ToDDD(point) {
    let E = parseFloat(point[0]);
    let N = parseFloat(point[1]);

    let Y = (E - 2600000) / 1000000;
    let X = (N - 1200000) / 1000000;

    let lon = (2.6779094 + 4.728982 * Y + 0.791484 * Y * X + 0.1306 * Y * Math.pow(X, 2) - 0.0436 * Math.pow(Y, 3)) * 100 / 36;
    let lat = (16.9023892 + 3.238272 * X - 0.270978 * Math.pow(Y, 2) - 0.002528 * Math.pow(X, 2) - 0.0447 * Math.pow(Y, 2) * X - 0.014 * Math.pow(X, 3)) * 100 / 36;

    return [parseFloat(lat.toFixed(6)), parseFloat(lon.toFixed(6))];
}


async function getData(url){
    let response
    try {
      response = await fetch(url);
      const data = await response.json();
      return data;
    } catch (error) {
      console.log("response getData :", error);
      return 0;
    }
};

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}   

function exportData(data, outputPath){
    if(!_.isEmpty(data)){
        write(data, outputPath);
    } else {
        console.log('Error at exporting. No data.');
    }
}

function write(JSONtoOutput, outputPath) {
    fs.writeFile(outputPath, JSON.stringify(JSONtoOutput), 'UTF-8', () => {
        console.log("Result written to " + outputPath);
    })
}

function isEqual(obj1, obj2) {
    // Überprüfe, ob beide Objekte vom selben Typ sind
    if (typeof obj1 !== typeof obj2) return false;

    // Wenn es sich um primitive Typen handelt, vergleiche direkt
    if (typeof obj1 !== 'object' || obj1 === null || obj2 === null) {
        return obj1 === obj2;
    }

    // Überprüfe die Anzahl der Schlüssel in den Objekten
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) return false;

    // Überprüfe die Werte der Schlüssel in den Objekten
    for (const key of keys1) {
        if (!isEqual(obj1[key], obj2[key])) return false;
    }

    return true;
}
