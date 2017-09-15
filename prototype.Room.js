var TRANSPORT_FACTOR = [2, 2, 2, 1.8, 1.5, 1.2, .7, .7];

module.exports = function(){

    Room.prototype.work = function()
    {
        let spawnArray = this.find(FIND_MY_SPAWNS);

        if (!this.controller || !this.controller.my)
            return;

        if (!this.memory.creepMinimum && this.controller.my)
        {
            this.initializeMemory(spawnArray);
        }

        if ((!this.memory.spawn || !Game.getObjectById(this.memory.spawn)))
        {   
            if (spawnArray.length > 0)
            {
                this.memory.spawn = spawnArray[0].id;
            }
        }

        //New rooms get high level creeps from nearby rooms
        if ((!this.memory.spawn || !Game.getObjectById(this.memory.spawn)))
        {
            if (!this.memory.helperRoom)
            {
                let helperArray = new Object();
                for (let i in Game.spawns)
                {
                    if (Game.spawns[i].room.controller.level >= 5)
                        helperArray[i] = Game.spawns[i];
                }

                let ret = new RoomPosition(25,25,this.name).findClosestSpawn(helperArray);

                if (ret)
                    this.memory.helperRoom = ret.room.name;
            }
        }
        else
            delete this.memory.helperRoom;

        let min = this.memory.creepMinimum;
        let max = this.memory.creepMaximum;
        let count = this.memory.creepCount;

        if (!min || !max || !count) return;

        if (this.memory.helperRoom)
            this.askForHelp(min, count);

        this.setCreepMinimums(min, max, Object.keys(spawnArray).length);
        this.setCreepCount(count);
        this.spawnCreeps(spawnArray, min, count);
        this.runStructures();
        this.visual.cornerDiagnostics();
    }

    Room.prototype.setCreepMinimums = function(min, max, spawnNum)
    {
        //Weak rooms have special properties
        if (this.controller.level <= 4)
        {
            this.setCreepMinimumsWeak(min, max);
        }
        else
        {
            this.setCreepMinimumsStrong(min, max, spawnNum);
        }

        //Set minBuilder
        if (this.memory.nearbyConstruction && this.controller.level > 2)
            min.Builder = 2;
        else
            min.Builder = 0;

        //Set minDefender
        if (this.memory.nearbyInvader)
            min.Defender = Math.ceil(_.max(this.memory.nearbyInvasionRooms)/30);
        else
            min.Defender = 0;

        //Set minWaller
        if (this.find(FIND_STRUCTURES, {filter : (s) => s.structureType == STRUCTURE_WALL}).length > 0 && this.controller.level > 3)
            min.Waller = 1;

        min.Miner = (Object.keys(this.memory.myContainers).length >= 2) ? Object.keys(this.memory.mySources).length : Object.keys(this.memory.mySources).length*4;
        min.Claimer = (Object.keys(this.memory.myFlags)).length;
        min.Transport = Object.keys(this.memory.myContainers).length * TRANSPORT_FACTOR[this.controller.level-1];
        
        if (Object.keys(this.memory.myContainers).length < 2)
            min.Transport = 0;
        
        //Tweak transport number based on container fullness situation
        if (this.memory.containerStats.containerLongAverage < 500)
        {
            min.Transport =  Math.ceil(min.Transport * .8);
        }
        else if (this.memory.containerStats.containerLongAverage >= 1500)
        {
            min.Transport =  Math.ceil(min.Transport * 1.2);
        }
        else
            min.Transport = Math.floor(min.Transport);

        min.Total = (min.Defender + min.Miner + min.Transport + min.Extractor + min.Linker + min.Fixer 
            + min.Waller + min.Upgrader + min.Builder + min.Claimer + min.Attacker);
    }

    Room.prototype.setCreepMinimumsWeak = function(min, max)
    {
        // Levels 1,2,3
        if (this.controller.level <= 3)
        {
            max.Miner = 2;
            max.Claimer = 0;
            
            if (this.controller.level == 1) //Get to level 2 quickly, dial back upgraders if extensions need to be built
                min.Upgrader = 1;
            else if (min.Transport > 0 && min.Upgrader == 0) //Once containers are up, start upgrading fast
                min.Upgrader = 5;
            else //Stall upgrades if we don't have our containers up yet
                min.Upgrader = 0;
            
        }
        else // Level 4
        {
            max.Miner = 4;
            max.Claimer = 1;
            
            if (min.Builder > 0)
                min.Upgrader = 1;
            else
                min.Upgrader = 3;
        }
    }

    Room.prototype.setCreepMinimumsStrong = function(min, max, spawnNum)
    {
        //Offensive attacker setting
        if (this.memory.nearbyAttackSite)
        {
            min.Attacker = 3;
        }
        else
        {
            min.Attacker = 0;
        }

        //Set minExtractors
        min.Extractor = 0;
        let extractors = this.find(FIND_STRUCTURES, {filter : (s) => s.structureType == STRUCTURE_EXTRACTOR});
        if (extractors.length > 0)
        {
            let lookArray = extractors[0].pos.lookFor(LOOK_MINERALS);
            let mineral = lookArray[0];

            if (mineral.mineralAmount > 0)
                min.Extractor = 1;
        }

        //Set minLinker
        if (this.storage)
            min.Linker = (this.storage.pos.findInRange(FIND_STRUCTURES, 5,
                { filter : (s) => s.structureType == STRUCTURE_LINK}).length > 0) ? 1 : 0;

        //Set minUpgrader
        if (this.storage && this.storage.store[RESOURCE_ENERGY] >= STORAGE_ENERGY_THRESHOLD && this.controller.level != 8)
            min.Upgrader = 3; //Abundance of energy
        else                                 
            min.Upgrader = 1; //Default Case

        //Sloppy AttackClaimer
        min.AttackClaimer = 0;
        if (this.controller.level == 8)
        {
            let flags = _.filter(Game.flags, (s) => s.color == COLOR_GREEN && s.secondaryColor == COLOR_RED);

            if (flags.length > 0)
            {
                let ret = Game.map.findRoute(this, flags[0].room);

                if (Object.keys(ret).length <= 12)
                {
                    min.AttackClaimer = 1;
                }
            }
        }

        if (this.memory.nearbyRepair)
            min.Fixer = 1;
        else
            min.Fixer = 0;

        max.Miner = 6 + ((spawnNum - 1) * 4);
        max.Claimer = 2 + ((spawnNum - 1) * 2);
    }

    Room.prototype.setCreepCount = function(count)
    {
        count.Miner = _.sum(Game.creeps, (c) => c.memory.role == 'Miner' && c.memory.myRoom.name == this.name);
        count.Extractor = _.sum(Game.creeps, (c) => c.memory.role == 'Extractor' && c.memory.myRoom.name == this.name);
        count.Upgrader = _.sum(Game.creeps, (c) => c.memory.role == 'Upgrader' && c.memory.myRoom.name == this.name);
        count.Builder = _.sum(Game.creeps, (c) => c.memory.role == 'Builder' && c.memory.myRoom.name == this.name);
        count.Fixer = _.sum(Game.creeps, (c) => c.memory.role == 'Fixer' && c.memory.myRoom.name == this.name);
        count.Waller = _.sum(Game.creeps, (c) => c.memory.role == 'Waller' && c.memory.myRoom.name == this.name);
        count.Transport = _.sum(Game.creeps, (c) => c.memory.role == 'Transport' && c.memory.linker != true && c.memory.myRoom.name == this.name);
        count.Linker = _.sum(Game.creeps, (c) => c.memory.role == 'Linker' && c.memory.myRoom.name == this.name);
        count.Attacker = _.sum(Game.creeps, (c) => c.memory.role == 'Attacker' && c.memory.myRoom.name == this.name);
        count.Defender = _.sum(Game.creeps, (c) => c.memory.role == 'Defender' && c.memory.myRoom.name == this.name);
        count.Claimer = _.sum(Game.creeps, (c) => c.memory.role == 'Claimer' && c.memory.myRoom.name == this.name);
        count.AttackClaimer = _.sum(Game.creeps, (c) => c.memory.role == 'AttackClaimer' && c.memory.myRoom.name == this.name);
        count.Total = _.sum(Game.creeps, (c) => c.memory.myRoom && c.memory.myRoom.name == this.name);

        this.memory.bodyPartsCount = 0;

        for (let i in Game.creeps)
        {
            if (Game.creeps[i].memory.myRoom && Game.creeps[i].memory.myRoom.name == this.name)
                this.memory.bodyPartsCount += Object.keys(Game.creeps[i].body).length;
        }
    }

    Room.prototype.spawnCreeps = function(spawnArray, min, count)
    {
        //Stall spawning on a new room if source calculations havent been made
        if (min.Miner == 0)
            return

        let spawn = undefined;

        for (let i in spawnArray)
        {
            if (!spawnArray[i].spawning)
            {
                spawn = spawnArray[i];
                break;
            }
        }

        if (!spawn) return;

        let bodyParts = [];
        let name = undefined;
        let opts = undefined;

        for (let type in min)
        {
            if (count['Miner'] < 2 && min['Miner'] > 0 && count['Transport'] < 1)
                spawn.createCreep(spawn.createCreep([WORK, MOVE, MOVE, CARRY], undefined, {role: 'Miner', myRoom: this}));
            else if (count['Transport'] < 1 && min['Transport'] > 0 && this.energyAvailable != this.energyCapacityAvailable)
                spawn.createCreep([MOVE, MOVE, MOVE, CARRY, CARRY, CARRY], undefined, {role: 'Transport', myRoom: this});
            else if (count[type] < min[type])
            {
                spawn.makeCreep(type, this);
                return;
            }
        }
    }

    Room.prototype.runStructures = function()
    {
        //Links
        let links = this.find(FIND_STRUCTURES, { filter : (s) => s.structureType == STRUCTURE_LINK});
        for (let name in links)
        {
            let link = links[name];
            let spawnLinks = this.storage.pos.findInRange(FIND_STRUCTURES, 5, { filter : (s) => s.structureType == STRUCTURE_LINK});
            let spawnLink = spawnLinks[0];

            if (link.energy == link.energyCapacity)
                link.transferEnergy(spawnLink);
        }

        //Labs
        this.runLabs();

        //Terminals
        if (this.terminal) this.terminal.work();

        //Towers
        let towers = _.filter(Game.structures, (s) => s.structureType == STRUCTURE_TOWER && s.room.name == this.name);
        for (let name in towers)
        {
            towers[name].work();
        }
    }

    Room.prototype.runLabs = function()
    {   
        //Find all labs and add them to room memory, so we can save the inputter and outputters
        this.find(FIND_STRUCTURES, {filter : (s) => s.structureType == STRUCTURE_LAB}).forEach(
            function(lab)
            {
                if (this.memory && this.memory.myLabs[lab.id] == undefined)
                {
                    this.memory.myLabs[lab.id] = new Object();
                }
            }
        )

        let index = 0;
        for (let i in this.memory.myLabs)
        {
            if (index % 3 == 0)
                this.memory.myLabs[i].output = true;
            else
                this.memory.myLabss[i].output = false;

            index++;
        }

        let previousOutputter;
        for (let i in this.memory.myLabs)
        {
            if (this.memory.myLabs[i].output)
            {
                previousOutputter = i;
            }
            else
            {
                let outputLab = this.memory.myLabs[previousOutputter];
                
                if (outputLab.inputLab1 == undefined)
                    outputLab.inputLab1 = i;
                else if (outputLab.inputLab2 == undefined)
                    outputLab.inputLab2 = i;
            }
        }
    }

    Room.prototype.createRoadsToSources = function()
    {
        if (Game.constructionSites >= 80) return;

        if (this.controller.level <= 3) return;

        let start = Game.getObjectById(this.memory.spawn);
        if (!start) return;

        for (let i in this.memory.myContainers)
        {
            let end = Game.getObjectById(i);
            if (!end) continue;

            let ret = PathFinder.search(start.pos, { pos : end.pos, range : 1 }, { swampCost : 3, plainCost : 2, maxOps : 16000, roomCallback : 
                function(roomName) {
                    let room = Game.rooms[roomName];
                    if (!room) return;
                    let costs = new PathFinder.CostMatrix;

                    room.find(FIND_STRUCTURES).forEach(
                        function (structure) 
                        { 
                            if (structure.structureType != STRUCTURE_RAMPART && structure.structureType != STRUCTURE_SPAWN)
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
                    if (Game.rooms[ret.path[position].roomName])
                    {
                        ret.path[position].createConstructionSite(STRUCTURE_ROAD);
                    }
                }
            }
        }
    }

    Room.prototype.askForHelp = function(min, count)
    {
        let helperRoom = Game.rooms[this.memory.helperRoom], spawn = null;

        if (!helperRoom) return;

        let spawnArray = helperRoom.find(FIND_MY_SPAWNS);

        for (let i in spawnArray)
        {
            if (!spawnArray[i].spawning)
            {
                spawn = spawnArray[i];
                break;
            }
        }

        if (!spawn) return;

        if (count['Upgrader'] < min['Upgrader'])
            spawn.makeCreep('Upgrader', this);
        else if (count['Builder'] < min['Builder'])
            spawn.makeCreep('Builder', this);
    }

    //Place initial flag at aboslute top left of selection
    Room.prototype.createBuildings = function()
    {
        let flags = this.find(FIND_FLAGS);
        
        for (let i in flags)
        {
            let flag = flags[i];
            let constructionArray = null;

            if (flag.color == COLOR_YELLOW)
            {
                if (flag.secondaryColor == COLOR_YELLOW)
                {
                    constructionArray = [
                    [0,0,0,0,2,0,0],
                    [0,0,0,2,2,1,0],
                    [0,0,2,2,1,2,2],
                    [0,2,2,1,2,2,0],
                    [2,2,1,2,2,0,0],
                    [2,1,2,2,0,0,0],
                    [1,2,2,0,0,0,0],
                    ]
                }
                else if (flag.secondaryColor == COLOR_WHITE)
                {
                    if (flag.pos.createConstructionSite(STRUCTURE_TOWER) == OK)
                        flag.remove()
                }
                else if (flag.secondaryColor == COLOR_GREY)
                {
                    if (flag.pos.createConstructionSite(STRUCTURE_STORAGE) == OK)
                        flag.remove()
                }
                else if (flag.secondaryColor == COLOR_BROWN)
                {
                    if (flag.pos.createConstructionSite(STRUCTURE_TERMINAL) == OK)
                        flag.remove();
                }
                
                if (constructionArray != null)
                {
                    //Since (y,x) starts in the top right corner of the matrix, we adjust the y variable to start at the bottom left corner
                    for (let x = 0; x < constructionArray.length; x++)
                    {
                        for (let y = 0; y < constructionArray[0].length; y++)
                        {
                            if (constructionArray[y][x] == 1 && this.controller.level > 3)
                                new RoomPosition(flag.pos.x + x, (flag.pos.y + y) - constructionArray[0].length + 1, flag.room.name).createConstructionSite(STRUCTURE_ROAD);
                            else if (constructionArray[y][x] == 2)
                                new RoomPosition(flag.pos.x + x, (flag.pos.y + y) - constructionArray[0].length + 1, flag.room.name).createConstructionSite(STRUCTURE_EXTENSION); 
                        }
                    }
                }
            }
        }
    }

    Room.prototype.initializeMemory = function(spawnArray)
    {
        let room = this;

        if (!this.memory.creepMinimum)
        {
            this.memory.creepMinimum = {};

            room.memory.creepMinimum.Defender = 0;
            room.memory.creepMinimum.Miner = 0;
            room.memory.creepMinimum.Transport = 0;
            room.memory.creepMinimum.Claimer = 0;
            room.memory.creepMinimum.AttackClaimer = 0;
            room.memory.creepMinimum.Attacker = 0;
            room.memory.creepMinimum.Extractor = 0;
            room.memory.creepMinimum.Linker = 0;
            room.memory.creepMinimum.Fixer = 0;
            room.memory.creepMinimum.Waller = 0;
            room.memory.creepMinimum.Upgrader = 0;
            room.memory.creepMinimum.Builder = 0;
            room.memory.creepMinimum.Total = 0;
        }

        if (!this.memory.creepCount)
        {
            this.memory.creepCount = {};

            room.memory.creepCount.Defender = 0;
            room.memory.creepCount.Miner = 0;
            room.memory.creepCount.Transport = 0;
            room.memory.creepCount.Claimer = 0;
            room.memory.creepCount.AttackClaimer = 0;
            room.memory.creepCount.Attacker = 0;
            room.memory.creepCount.Extractor = 0;
            room.memory.creepCount.Linker = 0;
            room.memory.creepCount.Fixer = 0;
            room.memory.creepCount.Waller = 0;
            room.memory.creepCount.Upgrader = 0;
            room.memory.creepCount.Builder = 0;
            room.memory.creepCount.Total = 0;
        }

        if (!this.memory.creepMaximum)
        {
            this.memory.creepMaximum = {};
        }

        room.memory.mySources = new Object();
        room.memory.myContainers = new Object();
        room.memory.myFlags = new Object();
        room.memory.myLabs = new Object();
        room.memory.nearbyInvasionRooms = new Object();
        room.memory.containerStats = new Object();
        room.memory.storageHistory = [];
        room.memory.storageTrend = 0;

        room.memory.containerStats.containerAverages = [];
        room.memory.containerStats.containerLongAverage = 0;

        room.memory.spawn = null;

        room.memory.nearbyConstruction = false;
        room.memory.nearbyInvader = false;
        room.memory.nearbyAttackSite = false;
    }

};