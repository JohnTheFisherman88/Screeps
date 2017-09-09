module.exports = {

    run: function(creep)
    {
        creep.setInventoryStatus();
        
        if (creep.memory.invFull == true)
        {
            creep.repairRoad();

            if (!creep.memory.depositTask)
            {
                if (!creep.getDepositTask()) return;
            }

            creep.doDepositTask();
        }
        else if (creep.memory.invFull == false)
        {
            if (!creep.memory.withdrawTask)
                creep.getWithdrawTask()
            
            creep.doWithdrawTask();
        } 
    }
};

//Find a container for creep to deposit energy in home room. Returns false if creep is travelling home.
Creep.prototype.getDepositTask = function()
{
    let carryType = this.getCarryType();
    let room = this.getMyRoom();

    if (this.goHome()) return false;

    let task = (carryType == RESOURCE_ENERGY) ? getEnergyStorage(room, this) : getMineralStorage(carryType, room);

    if (task)
    {
        this.memory.depositTask = task.id;
        return true;
    }
}

Creep.prototype.doDepositTask = function()
{
    let structure = Game.getObjectById(this.memory.depositTask);
    let room = this.getMyRoom();
    let carryType = this.getCarryType();

    if (structure == null)
    {
        this.getOffRoad();
        delete this.memory.depositTask;
        return;
    }

    if (structure.structureType == STRUCTURE_STORAGE && room.energyAvailable < room.energyCapacityAvailable && this.memory.role != 'Linker')
    {
        delete this.memory.depositTask;
        return;
    }

    if ((structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_TOWER) && structure.energy == structure.energyCapacity)
    {
        delete this.memory.depositTask;
        return;
    }

    if (this.transfer(structure, carryType) == ERR_NOT_IN_RANGE)
        this.moveTo(structure);
    else
        delete this.memory.depositTask;
}

Creep.prototype.getWithdrawTask = function()
{
    let room = this.getMyRoom();
    delete this.memory.moveMinerals;
    delete this.memory.moveEnergy;

    //Recovery form wipe with stored energy
    if (room.storage && room.memory.creepCount.Total < (room.memory.creepMinimum.Total*.67) && room.storage.store[RESOURCE_ENERGY] > 1500
        && room.energyAvailable < (room.energyCapacityAvailable*.5))
    {
        this.memory.withdrawTask = room.storage.id;
        return;
    }

    //If our extensions are full and there are minerals in the storage, try to move them to terminal
    if (room.storage && room.terminal && room.energyAvailable == room.energyCapacityAvailable)
    {
        if (room.storage.getCarryMineral() != null)
        {
            this.memory.withdrawTask = room.storage.id;
            this.memory.moveMinerals = true;
            return;
        }
    }

    //Pull energy from terminal for use in room
    //Only pull from terminal in level 8 rooms if the storage is low
    if (room.terminal && room.storage && room.terminal.store[RESOURCE_ENERGY] > 0 && 
        (room.controller.level != 8 || room.storage.store[RESOURCE_ENERGY] < 25000))
    {
        this.memory.withdrawTask = room.terminal.id;
        this.memory.moveEnergy = true;
        return;
    }

    //Retrieve energy from containers
    this.memory.withdrawTask = findMostFullStructure(room.memory.myContainers, room);
}

Creep.prototype.doWithdrawTask = function()
{
    let structure = Game.getObjectById(this.memory.withdrawTask), carryType = null;

    if (!structure)
    {
        delete this.memory.withdrawTask;
        this.getOffRoad();
        return;
    }

    //Try to withdraw minerals from storage if conditions are met
    if (this.memory.moveMinerals)
        carryType = structure.getCarryMineral();
    else if (this.memory.moveEnergy)
        carryType = RESOURCE_ENERGY;
    else
        carryType = structure.getCarryType();

    if (!carryType)
    {
        delete this.memory.withdrawTask;
        return;
    }

    //Pick up dropped enegry if passed by
    let energyInRoom = this.room.find(FIND_DROPPED_ENERGY);
    for (let i in energyInRoom)
    {
        if (energyInRoom[i] && energyInRoom[i].amount > 500)
        {
            if (this.pickup(energyInRoom[i]) == ERR_NOT_IN_RANGE)
                this.moveTo(energyInRoom[i]);
            else
            {
                if (_.sum(this.carry) + energyInRoom[i].amount >= Math.ceil(this.carryCapacity*.75))
                {
                    if (structure.structureType == STRUCTURE_CONTAINER)
                        structure.unassign()

                    delete this.memory.withdrawTask;
                }
            }

            return;
        }
    }


    if (structure.structureType == STRUCTURE_LINK && structure.transferEnergy(this) == ERR_NOT_IN_RANGE)
        this.travelTo(structure);
    else if (structure.structureType != STRUCTURE_LINK && structure.structureType && structure.transfer(this, carryType) == ERR_NOT_IN_RANGE)
        this.travelTo(structure);
    else
    {
        if (structure.structureType == STRUCTURE_CONTAINER)
            structure.unassign()

        delete this.memory.withdrawTask;
    }
}

Creep.prototype.repairRoad = function()
{
    //Repair roads a little bit while you transport
    let roads = this.pos.findInRange(FIND_STRUCTURES, 1,
                    { filter : (s) => s.hits < s.hitsMax && s.structureType == STRUCTURE_ROAD });
                    
    if (roads.length > 0)
        this.repair(roads[0]);
}

//Returns the id of the most full structure in structArray
function findMostFullStructure(structArray, room)
{
    let highest = -2000;
    let candidate = null;
    let sum = 0;
    let ignoreMinerals = false;
    let carryType;

    if (!room.storage)
        ignoreMinerals = true;

    for (let struct in structArray)
    {
        let container = Game.getObjectById(struct);
        let energy;

        if (!container)
        {
            delete room.memory.myContainers[struct];
            continue;
        }

        if (Memory.logisticalStats.containerData.allContainers[struct].closestRoom != room.name)
        {
            delete room.memory.myContainers[struct];
            continue;
        }

        if (Memory.empire.invasionRooms[container.room.name])
        {
            continue;
        }

        carryType = container.getCarryType();
        container.memory = Memory.logisticalStats.containerData.allContainers[container.id];

        //Dont take minerals from other rooms
        if (carryType != RESOURCE_ENERGY && (ignoreMinerals || container.room.name != room.name))
            continue;

        energy = container.getWeightedEnergy();
        sum += container.store[RESOURCE_ENERGY];

        //Look for container with the most energy, subtract an amount based on how many transports
        //are already commited to the current container
        if (energy > highest)
        {
            highest = energy;
            candidate = container;
        }
    }

    if (room.memory.myContainers)
        containerAnalysis(room, sum, Object.keys(room.memory.myContainers).length, candidate);

    //If all of our containers are low and a certain spawn has plenty of excess energy, take from it
    if (highest < 500 && room.energyAvailable != room.energyCapacityAvailable)
    { 
        if (room.storage)
            return room.storage.id;
    }

    if (candidate)
    {
        candidate.assign();
        return candidate.id;
    }
    else
        return null;
};

function containerAnalysis(room, sum, numContainers, candidate)
{
    if (!room.memory.containerStats)
        room.memory.containerStats = new Object();

    if (!room.memory.containerStats.containerAverages)
        room.memory.containerStats.containerAverages = [];

    let stats = room.memory.containerStats;

    if (stats.containerAverages.length == 20)
        stats.containerAverages.shift();

    stats.containerAverages.push(Math.floor(sum/numContainers));

    stats.containerLongAverage = Math.floor(_.sum(stats.containerAverages)/stats.containerAverages.length);

    if (candidate)
        stats.containerTarget = candidate.store[candidate.getCarryType()];
}

//returns the object of the ideal storage location for a mineral
function getMineralStorage(carryType, room)
{
    let containers = room.find(FIND_STRUCTURES, {filter : (s) => s.structureType == STRUCTURE_LAB && s.mineralAmount < s.mineralCapacity});

    //Look for a lab to put it in
    for (let i in containers)
    {
        //Access the lab's memory object
        let lab = containers[i].room.memory.labs[containers[i].id];

        if (!lab)
            continue;

        //Check if it is the lab we are looking for
        if (lab.mineralRequired == carryType)
            return containers[i];
    }

    //If we didn't find a lab, try to sell the mineral, or if our terminal is full, put it into storage
    if (!room.terminal || _.sum(room.terminal.store) == room.terminal.storeCapacity)
        return room.storage;
    else
        return room.terminal;


    return null;
};

function getEnergyStorage(room, creep)
{
    //If our spawn and extensions are full
    if (room.energyAvailable == room.energyCapacityAvailable)
    {
        //If we have a tower on the map, we should fill it
        let tower = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {filter : (s) => s.structureType == STRUCTURE_TOWER && s.energy < 500});

        if (tower != null)
            return tower;

        //Storage is full enough
        if (room.storage && room.controller.level == 8 && (room.storage.store[RESOURCE_ENERGY] >= STORAGE_ENERGY_THRESHOLD))
        {
            //No terminal or terminal is full
            if (!room.terminal || _.sum(room.terminal.store) == room.terminal.storeCapacity)
            {
                //Check for labs
                containers = room.find(FIND_STRUCTURES, {filter : (s) => s.structureType == STRUCTURE_LAB && s.energy < s.energyCapacity});

                if (containers.length > 0)
                    return containers[0];
                else
                    return room.storage;
            }
            else //Terminal needs resource
                return room.terminal;
        }
        else if (room.storage)
            return room.storage;
    }
    else
    {
        let structure = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {filter : (s) => s.energy < s.energyCapacity
            && s.structureType != STRUCTURE_TOWER && s.structureType != STRUCTURE_LINK && s.structureType != STRUCTURE_NUKER});

        if (structure)
            return structure;
    }
}