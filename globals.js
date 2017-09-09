module.exports = function (){

    global.timedEvents = function()
    {
        let time = Game.time;

        /*Population Report
        if (time % 500 == 0)
        {
            console.log('Population Report:');
            for (let i in Memory.rooms)
            {
                let room = Game.rooms[i];

                if (room.memory.creepCount.Total >= room.memory.creepMinimum.Total)
                    console.log(room.name + ' is fufilled with ' + room.memory.creepCount.Total + ' creeps.');
                else
                    console.log(room.name + ' is NOT fufilled, and needs ' + (room.memory.creepMinimum.Total - room.memory.creepCount.Total) + ' creeps.');
            }
            console.log();
        }*/

        //WallMax 
        if (time % 31 == 0)
        {
            for (let i in Memory.rooms)
            {
                let room = Game.rooms[i];

                if (!room)
                {
                    delete Memory.rooms[i];
                    return;
                }

                if (room.memory.wallMax == undefined || room.memory.wallMax < 5000)
                    room.memory.wallMax = 5000;

                if (room.controller.level < 4)
                {
                    room.memory.wallMax = 5000;
                    return;
                }

                let structs = room.find(FIND_STRUCTURES, {filter : (s) => s.structureType == STRUCTURE_WALL || s.structureType == STRUCTURE_RAMPART});
                let lowest = 300000000;
                let wallMax = room.memory.wallMax;

                for (let name in structs)
                {
                    if (structs[name].structureType == STRUCTURE_RAMPART)
                    {
                        if ((structs[name].hits * 1.2) < lowest)
                            lowest = structs[name].hits * 1.2;
                    }
                    else if (structs[name].hits < lowest)
                        lowest = structs[name].hits;
                }

                if (lowest >= wallMax && wallMax < 300000000)
                    wallMax = Math.floor(wallMax*2);
                else if (lowest <= (wallMax/2) && wallMax >= 40000)
                    wallMax = Math.floor(wallMax/2);

                if (wallMax > 300000000)
                    wallMax = 300000000;

                room.memory.wallMax = wallMax;
            }

        }

        //Container Assignment
        if (time % 25 == 0)
        {
            assignContainers();
        }

        //Source assignment
        if (time % 26 == 0)
        {
            assignSources();
        }

        //Flag assignment
        if (time % 27 == 0)
        {
            assignFlags();
        }

        //Create Roads
        if (time % 101 == 0)
        {
            for (let i in Memory.rooms)
            {
                Game.rooms[i].createRoadsToSources();
            }
        }

        //Set Builder Flag
        if (time % 15 == 0)
        {
            for (let i in Memory.rooms)
            {
                let spawn = Game.getObjectById(Game.rooms[i].memory.spawn);

                if (!spawn) spawn = Game.rooms[i].controller;

                if (spawn)
                    var construction = spawn.pos.findClosestConstructionSite(Game.constructionSites, (s) => s.structureType != STRUCTURE_CONTAINER);

                if (construction)
                    Game.rooms[i].memory.nearbyConstruction = true;
                else
                    Game.rooms[i].memory.nearbyConstruction = false;
            }
        }

        //Set Defender Flag
        if (time % 5 == 0)
        {
            for (let i in Memory.rooms)
            {
                Game.rooms[i].memory.nearbyInvader = false;

                for (let k in Memory.empire.invasionRooms)
                {
                    let ret = Game.map.findRoute(Game.rooms[i], Game.rooms[k]);

                    if (Object.keys(ret).length <= 2 && !ret.incomplete)
                    {
                        Game.rooms[i].memory.nearbyInvasionRooms[k] = Memory.empire.invasionRooms[k];
                        Game.rooms[i].memory.nearbyInvader = true;
                    }
                }
            }
        }

        //Set Attacker Flag
        if (time % 15 == 0)
        {
            for (let i in Memory.rooms)
            {
                Game.rooms[i].memory.nearbyAttackSite = false;
                
                if (Game.flags.attackLocation && Game.flags.attackBase)
                {
                    if (Game.rooms[i].controller.level < 7) continue;
                        
                    let ret = Game.map.findRoute(Game.rooms[i], Game.flags.attackLocation.room);

                    if (Object.keys(ret).length <= 12)
                    {
                        Game.rooms[i].memory.nearbyAttackSite = true;
                    }
                }
            }
        }

        //Set Repair Flag
        if (time % 50 == 0)
        {
            for (let i in Memory.rooms)
            {
                let spawn = Game.getObjectById(Game.rooms[i].memory.spawn);

                if (!spawn) spawn = Game.rooms[i].controller;

                if (spawn)
                {
                    const REPAIR_LIMIT = 200000;
                    var containerArray = [];

                    for (let k in Game.rooms)
                    {
                        containerArray = containerArray.concat(Game.rooms[k].find(FIND_STRUCTURES,
                            { filter : (s) => (s.hits < REPAIR_LIMIT && s.structureType == STRUCTURE_CONTAINER) }));
                    }
                }

                if (containerArray.length > 0)
                    Game.rooms[i].memory.nearbyRepair = true;
                else
                    Game.rooms[i].memory.nearbyRepair = false; 
            }
        }
    };

    global.createRoadBetweenFlags = function()
    {
        let start = Game.flags['start'];
        let end = Game.flags['end'];

        if (!start || !end || !start.room || !end.room) return;

        let ret = PathFinder.search(start.pos, end.pos, { swampCost : 3, plainCost : 2, maxOps : 16000, roomCallback : 
            function(roomName) {
                let room = Game.rooms[roomName];
                if (!room) return;
                let costs = new PathFinder.CostMatrix;

                room.find(FIND_STRUCTURES).forEach(
                    function (structure) 
                    { 
                        if (structure.structureType != STRUCTURE_CONTAINER && structure.structureType != STRUCTURE_RAMPART)
                            costs.set(structure.pos.x, structure.pos.y, 255);

                        if (structure.structureType == STRUCTURE_ROAD)
                            costs.set(structure.pos.x, structure.pos.y, 1);
                    }
                );

                room.find(FIND_CONSTRUCTION_SITES).forEach(
                    function (site) 
                    { 
                        if (site.structureType != STRUCTURE_CONTAINER && site.structureType != STRUCTURE_RAMPART)
                            costs.set(site.pos.x, site.pos.y, 255);

                        if (site.structureType == STRUCTURE_ROAD)
                            costs.set(site.pos.x, site.pos.y, 1);
                    }
                );

                return costs;
            }
        });

        if (!ret.incomplete)
        {
            for (let position in ret.path)
            {
                ret.path[position].createConstructionSite(STRUCTURE_ROAD);
            }
        }
    };

    //Place initial flag at aboslute top left of selection
    global.createExtensions = function()
    {
        let start, constructionArray;

        if (Game.flags['20'])
        {
            start = Game.flags['20'];

            constructionArray = [
            [0,0,0,0,2,2,2],
            [0,0,0,2,2,2,2],
            [0,0,2,2,2,2,1],
            [0,2,2,2,2,1,0],
            [2,2,2,2,1,0,0],
            [2,2,2,1,0,0,0],
            [2,2,1,0,0,0,0],
            ];
        }
        else if (Game.flags['40'])
        {
            start = Game.flags['40'];

            constructionArray = [
            [0,0,1,1,0,1,1,0,0,0,0,0],
            [0,1,2,2,1,2,2,1,1,0,0,0],
            [1,2,1,2,2,2,1,2,2,1,0,0],
            [1,2,2,1,2,1,2,2,2,2,1,0],
            [0,1,2,2,1,2,2,0,2,2,1,0],
            [1,2,2,1,2,1,2,2,2,1,2,1],
            [1,2,1,2,2,2,1,2,1,2,2,1],
            [0,1,2,2,0,2,2,1,2,2,1,0],
            [0,1,2,2,2,2,1,2,1,2,2,0],
            [0,0,1,2,2,1,2,2,2,1,2,0],
            [0,0,0,1,1,2,2,1,2,2,1,0],
            [0,0,0,0,0,1,1,0,1,1,0,0],
            ];
        }

        for (let x = 0; x < constructionArray[0].length; x++)
        {
            for (let y = 0; y < constructionArray[0].length; y++)
            {
                if (constructionArray[x,y] == 1)
                    new RoomPosition(start.pos.x + x, start.pos.y + y, start.room.name).createConstructionSite(STRUCTURE_ROAD);
                else if (constructionArray[x,y] == 2)
                    new RoomPosition(start.pos.x + x, start.pos.y + y, start.room.name).createConstructionSite(STRUCTURE_EXTENSION); 
            }
        }
    }

    /* LEGACY ASSIGN CONTAINER
    global.assignContainers = function()
    {
        let containers = [];  
        for (let i in Game.rooms)
        {
            if (Game.rooms[i].find(FIND_FLAGS, {filter : (f) => f.color == COLOR_GREEN && f.secondaryColor == COLOR_GREEN}).length == 0)
            {
                if (!Game.rooms[i].controller || !Game.rooms[i].controller.my)
                    continue;
            }

            let roomContainers = Game.rooms[i].find(FIND_STRUCTURES, {filter : (s) => s.structureType == STRUCTURE_CONTAINER});

            for (let i in roomContainers)
            {
                roomContainers[i].initializeMemory();
            }
        }

        containers = Memory.logisticalStats.containerData.allContainers;

        for (let i in Memory.rooms)
        {
            let room = Game.rooms[i];
            
            if (!Game.getObjectById(room.memory.spawn))
                continue;

            for (let i in containers)
            {
                let container = Game.getObjectById(i);

                if (!container)
                {
                    delete Memory.logisticalStats.containerData.allContainers[i];
                    continue;
                }   

                let ret;

                if (room.memory.myContainers[container.id] == undefined)
                {
                    ret = PathFinder.search(container.pos, Game.getObjectById(room.memory.spawn).pos, {plainCost : 1, swampCost : 1, maxCost: 100});

                    if (!ret.incomplete)
                    {
                        room.memory.myContainers[container.id] = Memory.logisticalStats.containerData.allContainers[i];
                    }
                }
            }
        }
    }*/
};