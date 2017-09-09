module.exports = {

    run: function(creep)
    {
        creep.setInventoryStatus();

        if (creep.memory.invFull == true)
        {
            if (creep.upgradeController(Game.rooms[creep.memory.myRoom.name].controller) == ERR_NOT_IN_RANGE)
            {
                creep.travelTo(Game.rooms[creep.memory.myRoom.name].controller);
            }
        }
        else if (creep.memory.invFull == false)
        {
            creep.fillInventory();
        }
    }

};