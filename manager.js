"use strict";

module.exports = class Manager
{
    constructor()
    {
        if (!Memory.logisticalStats)
        {
            Memory.logisticalStats = {};
        }
        
        if (!Memory.logisticalStats.allContainers)
        {
            Memory.logisticalStats.allContainers = {};
        }
        
        if (!Memory.logisticalStats.allSources)
        {
            Memory.logisticalStats.allSources = {};
        }

        this.memory = Memory.logisticalStats;
    }

    findConstructions()
    {
        for (let i in Game.rooms)
        {
            let room = Game.rooms[i];

            if (room.find(FIND_FLAGS, {filter : (f) => f.color == COLOR_GREEN && f.secondaryColor == COLOR_GREEN}).length == 0)
            {
                if (!room.controller || !room.controller.my)
                {
                    continue;
                }
            }

            let roomSources = room.find(FIND_SOURCES);

            for (let k in roomSources)
            {
                if (this.memory.allSources[roomSources[k].id] == undefined)
                {
                    this.memory.allSources[roomSources[k].id] = new Object();
                    this.memory.allSources[roomSources[k].id].creep = null;
                    this.memory.allSources[roomSources[k].id].marked = false;
                    this.memory.allSources[roomSources[k].id].closestRoom = null;
                }
            }

            let roomContainers = Game.rooms[i].find(FIND_STRUCTURES, {filter : (s) => s.structureType == STRUCTURE_CONTAINER});

            for (let k in roomContainers)
            {
                if (this.memory.allContainers[roomContainers[k].id] != undefined)
                    return;
                else
                    this.memory.allContainers[roomContainers[k].id] = new Object();

                this.memory.allContainers[roomContainers[k].id].numAssigned = 0;
            }
        }
    }

    assignSources()
    {
        let numGlobalSources = 0;

        for (let id in this.memory.allSources)
        {
            let source = Game.getObjectById(id);
            let spawn;

            if (!source)
            {
                delete this.memory.allSources[id];
                continue;
            }

            //Developing rooms will not have their sources assigned until that room is capable of claiming them for itself. 
            if (source.room.controller && source.room.controller.my && source.room.controller.level <= 4)
            {
                if (Memory.rooms[source.room.name] && Memory.rooms[source.room.name].spawn)
                    spawn = Game.getObjectById(Memory.rooms[source.room.name].spawn);
                else
                    spawn = null
            }
            else
                spawn = source.findClosestSpawn();

            if (spawn)
            {
                if (spawn.room.memory.mySources[id] == undefined)
                {
                    console.log('assigned source '  + id + ' to ' + spawn.room.name);
                    this.memory.allSources[id].closestRoom = spawn.room.name;
                    spawn.room.memory.mySources[id] = this.memory.allSources[id];
                }
            }
        } 
    }

    assignContainers()
    {
        for (let id in this.memory.allContainers)
        {
            let container = Game.getObjectById(id);
            let spawn;

            if (!container)
            {
                delete this.memory.allContainers[id];
                continue;
            }

            spawn = container.pos.findClosestSpawn(_.filter(Game.spawns, s => s.room.controller && s.room.controller.my));

            if (spawn && spawn.room.controller.my)
            {
                if (spawn.room.memory.myContainers[id] == undefined)
                {
                    this.memory.allContainers[id].closestRoom = spawn.room.name;
                    spawn.room.memory.myContainers[id] = this.memory.allContainers[id];
                }
            }
        }
    }

    assignFlags()
    {
        for (let id in Game.flags)
        {
            let flag =  Game.flags[id];

            if (!flag || flag.color != COLOR_GREEN || flag.secondaryColor == COLOR_RED) continue;

            let spawn = flag.findClosestSpawn();

            if (spawn)
            {
                if (spawn.room.memory.myFlags[id] == undefined)
                {
                    console.log('assigned '  + id + ' to ' + spawn.room.name);
                    flag.memory.closestRoom = spawn.room.name;
                    spawn.room.memory.myFlags[id] = flag;
                }
            }
        }
    }

    findInvaders()
    {
        if (!Memory.empire.invasionRooms)
            Memory.empire.invasionRooms = new Object();

        for (let i in Game.rooms)
        {
            let room = Game.rooms[i];

            //Skip if the room has no controller
            if (!room.controller) continue;

            //Skip if we don't own the controller and it either isn't reserved, or is reserved by someone who isnt me
            if (!room.controller.my)
            {
                if (room.controller.owner != "JohnTheFisherman")
                    continue;

                if (!room.controller.reservation || room.controller.reservation.username != "JohnTheFisherman")
                {
                    if (room.find(FIND_FLAGS, {filter : (f) => f.color = COLOR_GREEN}).length == 0)
                        continue;
                }
            }

            //Find any invaders
            let enemy = room.find(FIND_HOSTILE_CREEPS, {filter : (s) => s.owner.username != 'Source Keeper' && s.owner.username != "Baldey"});

            //If we have vision on this room and we know there are no longer enemies here, reset our alert status
            if (Memory.empire.invasionRooms[i] && enemy.length == 0)
            {
                delete Memory.empire.invasionRooms[i];
                return;
            }

            if (enemy.length > 0)
            {
                let parts = 1;
                for (let i in enemy)
                {
                    parts += enemy[i].getActiveBodyparts(ATTACK);
                    parts += enemy[i].getActiveBodyparts(RANGED_ATTACK);
                    parts += (enemy[i].getActiveBodyparts(HEAL) * 2);
                }
                Memory.empire.invasionRooms[room.name] = parts;

                if (enemy[i].owner.username != 'Invader')
                {
                    room.controller.activateSafeMode();
                }
            }
        }
    }

    manageMemory()
    {        
        //Clear unowned rooms from memory
        for (let i in Memory.rooms)
        {
            if (!Game.rooms[i] || (Game.rooms[i].controller && !Game.rooms[i].controller.my))
                delete Memory.rooms[i];
        }

        //Clear dead creeps from memory
        for (let i in Memory.creeps)
        {
            if (!Game.creeps[i])
            {
                if (Memory.creeps[i].withdrawTask)
                {
                    let object = Game.getObjectById(Memory.creeps[i].withdrawTask);

                    if (object && object.structureType == STRUCTURE_CONTAINER)
                        object.unassign();
                }
                delete Memory.creeps[i];
            }
        }
    }

    timer()
    {
        let time = Game.time;
        
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
        
        if (time % 2 == 0)
        {
            this.findConstructions();
        }

        //Container Assignment
        if (time % 25 == 0)
        {
            this.assignContainers();
        }

        //Source assignment
        if (time % 26 == 0)
        {
            this.assignSources();
        }

        //Flag assignment
        if (time % 27 == 0)
        {
            this.assignFlags();
        }

        //Create Roads
        if (time % 101 == 0)
        {
            for (let i in Memory.rooms)
            {
                Game.rooms[i].createRoadsToSources();
            }
        }

        //Create Buildings
        if (time % 51 == 0)
        {
            for (let i in Memory.rooms)
            {
                Game.rooms[i].createBuildings();
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
                    var construction = spawn.pos.findClosestConstructionSite(_.filter(Game.constructionSites, (s) => s.structureType != STRUCTURE_CONTAINER));

                if (construction != undefined)
                {
                    Game.rooms[i].memory.nearbyConstruction = true;

                    if (spawn.room.find(FIND_CONSTRUCTION_SITES, {filter : (s) => s.structureType == STRUCTURE_EXTENSION || s.structureType == STRUCTURE_STORAGE}).length > 0)
                    {
                        Game.rooms[i].memory.nearbyImportantConstruction = true;
                    }
                    else
                        Game.rooms[i].memory.nearbyImportantConstruction = false;
                        
                }
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
                    if (Game.rooms[i].controller.level < 4) continue;
                        
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
    }

    createRoadBetweenFlags()
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
}

