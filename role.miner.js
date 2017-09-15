module.exports = {

    run: function(creep)
    {
        let room = Game.rooms[creep.memory.myRoom.name];
        let spawn = Game.getObjectById(room.memory.spawn);
        let total = _.sum(creep.carry);

        if (!Memory.rooms[room.name]) return;

        creep.setInventoryStatus();

        if (creep.memory.invFull == true)
        {
            let carryType = creep.getCarryType();
            let source = Game.getObjectById(creep.memory.mySource);

            if (!source)
            {
                creep.memory.mySource = null;
                creep.drop(carryType);
                return;
            } 

            //Find nearest container or storage within a range of 1
            let structures = source.pos.findInRange(FIND_STRUCTURES, 1,
                {filter : (s) => s.structureType == STRUCTURE_CONTAINER});

            let container = structures[0];

            //If we don't have any transports alive, transport the energy yourself, to spawn
            if ((_.sum(Game.creeps, (c) => c.memory.role == 'Transport' && c.memory.myRoom.name == room.name) <= 0
                || (structures.length == 0 && room.memory.creepCount.Miner < room.memory.creepMinimum.Miner))
                && room.energyAvailable < room.energyCapacityAvailable)
            {
                let structure = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {filter : (s) => s.energy < s.energyCapacity
                    && (s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION)});
                    
                if (creep.transfer(structure, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
                    creep.travelTo(structure);
                return;
            }

            if (carryType == RESOURCE_ENERGY)
            {
                if (creep.doWork(structures))
                    return;
            }

            if (container)
            {
                if (!creep.pos.inRangeTo(container, 0))
                    creep.moveTo(container);
                else
                {
                    creep.drop(carryType);
                    creep.setInventoryStatus();
                    creep.memory.invFull = false;
                }
            }
            else
            {
                if (creep.transfer(structures[0], carryType) == ERR_NOT_IN_RANGE)
                    creep.moveTo(structures[0]);
            }
        }
        
        if (creep.memory.invFull == false)
        {
            if (room.controller.level <= 2 && Object.keys(room.memory.myContainers).length < 2)
            {
                if (!creep.memory.mySource)
                {
                    let sources = room.find(FIND_SOURCES);
                    
                    for (let i in sources)
                    {
                        if (sources[i].pos.findInRange(FIND_MY_CREEPS, 1).length < 4)
                        {
                            creep.memory.mySource = sources[i].id;
                            break;
                        }
                    }
                }
                
                let source = Game.getObjectById(creep.memory.mySource);
                    
                if (creep.harvest(source) == ERR_NOT_IN_RANGE)
                {
                    if (creep.moveTo(source) == ERR_NO_PATH)
                        creep.memory.mySource = null;
                }
                
                return;
            }
            
            if (!creep.memory.mySource)
                creep.getHarvestTask();

            creep.doHarvestTask();
        }
    }
};

Creep.prototype.getHarvestTask = function()
{
    let room = Game.rooms[this.memory.myRoom.name];

    if (this.memory.role == 'Extractor')
    {
        let mineral = room.find(FIND_MINERALS);
        this.memory.mySource = mineral[0].id;
        return;
    }

    let roomSources = room.memory.mySources;

    for (let id in roomSources)
    {
        let source = Game.getObjectById(id);

        if (!source) 
        {
            delete roomSources[id];
            continue;
        }

        source.memory = Memory.logisticalStats.allSources[id];

        if (!source.memory) continue;

        if (source.memory.closestRoom != room.name) 
        {
            console.log('removing source' + id + ' from room ' + room.name + ' because it belongs to ' + source.memory.closestRoom);
            delete roomSources[id];
            continue;
        }

        if (!Game.creeps[source.memory.creep] || Game.creeps[source.memory.creep].memory.role != 'Miner')
        {
            source.memory.marked = false;
            source.memory.creep = null;
        }
        else if (Game.creeps[source.memory.creep].memory.mySource != id || Game.creeps[source.memory.creep].memory.myRoom.name != source.memory.closestRoom)
        {
            console.log(source.memory.creep + ' removed from source' + id + ' because they are assigned to ' + Game.creeps[source.memory.creep].memory.mySource);
            source.memory.marked = false;
            source.memory.creep = null;
        }

        if (!source.memory.marked)
        {
            source.memory.marked = true;
            source.memory.creep = this.name;
            this.memory.mySource = id;
            return;
        }
    }
}

Creep.prototype.doHarvestTask = function()
{
    let source = Game.getObjectById(this.memory.mySource);
    let memory = Memory.logisticalStats.allSources;

    if (this.memory.role != 'Extractor')
    {
        let room = Game.rooms[this.memory.myRoom.name];

        if (!source || (room.memory.mySources && !room.memory.mySources[source.id]))
        {
            this.memory.mySource = null;
            return;
        }

        if (memory[source.id] && memory[source.id].creep != this.name)
        {
            console.log('Creep ' + this.name + ' is mining source ' + source.id + ' which is assigned to ' + memory[source.id].creep);
            this.memory.mySource = _.find(memory, function(source) { return source.creep == this.name });
        }

        //Sometimes right after a spawn is built in a new room there are still high level miners in that room. 
        //We want to transfer those miners to the new room to kickstart it's growth.
        if (memory[source.id] && memory[source.id].closestRoom != this.memory.myRoom.name)
        {
            let room = Game.rooms[memory[source.id].closestRoom];

            if (room && room.controller.level <= 3)
                this.memory.myRoom = room;
        }
    }

    if (this.harvest(source) == ERR_NOT_IN_RANGE)
        this.moveTo(source);
}

Creep.prototype.doWork = function(structures)
{
    let creep = this;
    let construction = null;
    let room = Game.rooms[creep.memory.myRoom.name];
    
    if (room.controller.level <= 2 && Object.keys(room.memory.myContainers).length < 2)
    {
        structures = [];
        construction = this.pos.findClosestByPath(FIND_CONSTRUCTION_SITES, {filter : (s) => s.structureType == STRUCTURE_EXTENSION});
    }

    if (structures.length == 0)
    {
        if (construction == null)
        {
            //Find a container or storage construction site
            let constructions = creep.pos.findInRange(FIND_CONSTRUCTION_SITES, 5,
            { filter : (s) =>  s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_LINK});

            construction = constructions[0];
        }

        //If there is no container and also no container construction site, create one
        if (construction == null)
        {
            if (creep.pos.findInRange(FIND_SOURCES, 1, {filter : (s) => s == Game.getObjectById(creep.memory.mySource)}).length > 0)
                creep.room.createConstructionSite(creep.pos, STRUCTURE_CONTAINER);
            else
                creep.moveTo(Game.getObjectById(creep.memory.mySource));
        }

        //Start building
        if (construction && creep.build(construction) == ERR_NOT_IN_RANGE)
            creep.moveTo(construction);

        return true;
    }
    else
    {
        let container = structures[0];
        let sum = _.sum(container.store);

        if (container.structureType == STRUCTURE_LINK || container.structureType == STRUCTURE_SPAWN) return false;

        if (container.hits < 10000 || (container.hits < container.hitsMax && sum == container.storeCapacity))
        {
            if (creep.repair(container) == ERR_NOT_IN_RANGE)
                creep.moveTo(container);

            return true;
        }
        else if (false && sum == container.storeCapacity)
        {
            let site = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES, { filter: (s) => s.structureType == STRUCTURE_ROAD });

            if (site && creep.build(site) == ERR_NOT_IN_RANGE)
                creep.moveTo(site);

            return true;
        }
    }

    return false;
}