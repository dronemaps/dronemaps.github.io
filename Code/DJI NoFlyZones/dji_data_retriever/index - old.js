console.log("Starting to filter data from dji")

const request = require('request');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const { result } = require('lodash');
const { waitForDebugger } = require('inspector');

// load data
const centerLng = 8.082397868288922;
const centerLat = 46.63249422305324;
const searchRadiusM = 300000;
const droneModel = encodeURI('spark');

const url = `https://www-api.dji.com/ch/api/geo/areas?lng=${centerLng}&lat=${centerLat}&country=CH&search_radius=${searchRadiusM}&drone=${droneModel}&zones_mode=total`;

request(url, { json: true }, async(err, res, body) => {
    if (err) {
        return console.log('Request failed', err);
    }

    else if (body.code >= 400) {
        return console.log('Request returned with error', body.code, body.msg);
    } 

    else {

        // filter data
        const allAreas = body.areas;
        const swissAreas = allAreas.filter(area => area.country === 'CH');

        // define outputPath
        let today = new Date();
        let dd = String(today.getDate()).padStart(2, '0');
        let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        let yyyy = today.getFullYear();
        today = dd + '-' + mm + '-' + yyyy;

        const outputPath = path.join('.', 'data', 'DJI-NoFlyZones.json');
        const outputPathNamesOnly = path.join('.', 'data', 'NamesOnly.json');
        const outputPathSecurityCopy = path.join('.', 'data', 'securityCopy_' + today + '.json');

        const oldNames = await getJSONfromFile(outputPathNamesOnly);

        //start comparison between new and existing data
        exec()

        async function exec() {
            const JSONtoOutput = await createJSONtoOutput();
            if(!_.isEmpty(JSONtoOutput)){
                write(JSONtoOutput, outputPath);
                //Timeout to precent problems with reading and writing to the file at the same time
                setTimeout(() => {  
                    write(createSimpleFile(JSONtoOutput), outputPathNamesOnly);
                }, 100);
            } else {
                console.log('Error at updating.')
            }
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

        //create JSON based on old and new entries
        async function createJSONtoOutput() {
            let newJSONtoOutput = [];
            const oldDataJson = await getJSONfromFile(outputPath);
            const zonesToChange = getChanges(oldDataJson, swissAreas);
            let counter = 0;
            //add important entries to new JSON
            await Promise.all(swissAreas.map(async(area) => {
                counter += 1;
                let newArea = {};
                newArea.area_id = area.area_id;
                newArea.name = await createNameDict(swissAreas, area.area_id);
                newArea.type = area.type;
                newArea.lat = area.lat;
                newArea.lng = area.lng;
                newArea.level = area.level;
                newArea.sub_areas = getRelevantData(area.sub_areas);
                newJSONtoOutput.push(newArea);
              }));
            console.log("Total no. areas : " + counter);
            if(!_.isEmpty(zonesToChange.toAdd)  && !_.isEmpty(zonesToChange.toDelete)) {
                console.log("new areas: ", zonesToChange.toAdd, " deleted areas: ", zonesToChange.toDelete);
            } else if (_.isEmpty(oldDataJson)) {
                console.log("New file created")
            } else {
                console.log("No new areas. Existing areas updated");
            }
            write(oldDataJson, outputPathSecurityCopy);
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
        

        function getRelevantData(sub_areas) {
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

        async function getJSONfromFile(filePath) {
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

        function findElementById(collection, area_id) {
            return _.find(collection, {"area_id" : area_id});
        }

        function findNameById(oldData, newData, area_id) {
            let area = _.find(oldData, {"area_id" : area_id});
            if (area === undefined || _.isEmpty(area.name)) {
                area = _.find(newData, {"area_id" : area_id})
            } 
            return area.name;
        }

        function getChanges(oldData, newData) {
            const oldAreaIds = getAreaIds(oldData);
            const newAreaIds = getAreaIds(newData);

            const areasToDelete = _.difference(oldAreaIds, newAreaIds);
            const areasToAdd = _.difference(newAreaIds, oldAreaIds);

            return {"toDelete" : areasToDelete, "toAdd" : areasToAdd};
        }

        function getAreaIds(obj) {
            let collAreaIds = [];
            _.map(obj, function(value, key){
                collAreaIds.push(value.area_id);
            })
            return collAreaIds;
        }

        function write(JSONtoOutput, outputPath) {
            fs.writeFile(outputPath, JSON.stringify(JSONtoOutput), 'UTF-8', () => {
                console.log("Result written to " + outputPath);
            })
        }
    }
});

