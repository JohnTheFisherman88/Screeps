module.exports = {

    run: function(creep)
    {
        creep.setInventoryStatus();

        if (creep.memory.invFull == true)
        {
            if (!creep.memory.repairTask)
                creep.getRepairTask();

            creep.doRepairTask();
        }
        else if (creep.memory.invFull == false)
        {
            creep.memory.repairTask = null;
            creep.fillInventory();
        }
    }
};

Creep.prototype.getRepairTask = function()
{
    const REPAIR_LIMIT = 200000;

    let containerArray = [];
    for (let k in Game.rooms)
    {
        containerArray = containerArray.concat(Game.rooms[k].find(FIND_STRUCTURES,
            { filter : (s) => (s.hits < REPAIR_LIMIT && s.structureType == STRUCTURE_CONTAINER) }));
    }

    let container = this.pos.findClosestConstructionSite(containerArray);

    if (container) 
        this.memory.repairTask = container.id;
    else
        this.getMyRoom().memory.nearbyRepair = false;
}

/*
Creep.prototype.getRepairTaskOld = function()
{
    //Find the weakest structure first

    let containerArray = [];
    let lowestStruct;
    let lowest = 3000000;
    for (let k in Game.rooms)
    {
        let structures = Game.rooms[k].find(FIND_STRUCTURES,
            { filter : (s) => (s.hits < s.hitsMax && s.structureType == STRUCTURE_CONTAINER) });

        for (let i in structures)
        {
            if (structures[i].hits < lowest)
            {
                lowest = structures[i].hits;
                lowestStruct = structures[i];
            }
        }
    }

    if (lowestStruct)
        this.memory.repairTask = lowestStruct.id;
}
*/

Creep.prototype.doRepairTask = function()
{
    let structure = Game.getObjectById(this.memory.repairTask);

    if (!structure)
    {
        this.memory.repairTask = null;
        return;
    }

    if (structure.hits < structure.hitsMax)
    {
        if (this.repair(structure) == ERR_NOT_IN_RANGE)
            this.moveTo(structure);
    }
    else
        this.memory.repairTask = null;
}