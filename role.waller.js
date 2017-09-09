module.exports = {

    run: function(creep)
    {
        initProtoypes();
        creep.setInventoryStatus();

        if (creep.memory.invFull == true)
        {
            if (!creep.memory.repairTask)
                creep.getWallRepairTask();

            creep.doWallRepairTask();
        }
        else if (creep.memory.invFull == false)
        {
            creep.memory.repairTask = null;
            creep.fillInventory();
        }
    }
};

function initProtoypes()
{
    Creep.prototype.getWallRepairTask = function()
    {
        let room = Game.rooms[this.memory.myRoom.name];
        
        let walls = room.find(FIND_STRUCTURES,
                        { filter : (s) => s.hits < room.memory.wallMax && s.structureType == STRUCTURE_RAMPART});

        if (walls.length > 0)
        {
            this.memory.repairTask = walls[0].id;
            return;
        }
        else
            walls = room.find(FIND_STRUCTURES,
                        { filter : (s) => s.hits < room.memory.wallMax && s.structureType == STRUCTURE_WALL});

        if (walls.length > 0)
            this.memory.repairTask = walls[0].id;
    }

    Creep.prototype.doWallRepairTask = function()
    {
        let room = Game.rooms[this.memory.myRoom.name];
        let wall = Game.getObjectById(this.memory.repairTask);

        if (!wall || wall.room.name != this.memory.myRoom.name) 
        {
            this.memory.repairTask = null;
            return;
        }

        if (this.goTo(wall)) return;

        if ((wall.structureType == STRUCTURE_RAMPART && wall.hits/2 < room.memory.wallMax) || wall.hits < room.memory.wallMax)
        {
            if (this.repair(wall) == ERR_NOT_IN_RANGE)
                this.moveTo(wall);
        }
        else
            this.memory.repairTask = null;
    }
}