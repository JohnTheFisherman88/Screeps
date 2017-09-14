module.exports = {

    run: function(creep)
    {
        creep.setInventoryStatus();

        if (creep.memory.invFull == true)
        {
            if (!creep.memory.constructionTask)
                creep.getConstructionTask();
            
            creep.doConstructionTask();
        }
        else if (creep.memory.invFull == false)
        {
            creep.fillInventory();
        }
    }
};

Creep.prototype.getConstructionTask = function()
{
    let creep = this;
    let room = Game.rooms[creep.memory.myRoom.name];

    let construction = null;
    let constructions = room.find(FIND_CONSTRUCTION_SITES, {filter : (s) => s.structureType == STRUCTURE_SPAWN})

    if (constructions.length == 0)
    {
        construction = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES, {filter : (s) => s.structureType == STRUCTURE_EXTENSION});
    }
    else
        construction = constructions[0];
    
    if (!construction)
    {
        construction = creep.pos.findClosestConstructionSite(_.filter(Game.constructionSites, (s) =>  s.structureType == STRUCTURE_RAMPART || s.structureType == STRUCTURE_STORAGE));
    }

    if (!construction) 
        construction = creep.pos.findClosestConstructionSite(Game.constructionSites);

    if (construction)
    {
        creep.memory.constructionTask = construction.id;
        return true;
    }
    else
        return false;
}

Creep.prototype.doConstructionTask = function()
{
    let creep = this;
    let task = Game.getObjectById(creep.memory.constructionTask);

    if (!task) 
    {
        this.memory.constructionTask = null;
        return;
    }

    if (task.room && Memory.empire.invasionRooms[task.room.name])
        return;

    if (creep.build(task) == ERR_NOT_IN_RANGE)
        creep.travelTo(task);
}