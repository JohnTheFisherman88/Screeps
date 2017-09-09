
//Globals
let STORAGE_WITHDRAWL = false;
let STORAGE_ENERGY_THRESHOLD = 500000;

require('role.transport').initPrototypes();

module.exports = {

    run: function(creep)
    {
        let room = creep.getMyRoom();

        creep.setInventoryStatus();
        
        if (creep.memory.invFull == true)
        {
            if (!creep.memory.depositTask)
                creep.getLinkerDepositTask();

            creep.doDepositTask();
        }
        else if (creep.memory.invFull == false)
        {
            if (!creep.memory.withdrawTask)
                creep.getLinkerWithdrawTask();

            creep.doWithdrawTask();
        }
    }
};

Creep.prototype.getLinkerDepositTask = function()
{
    let room = this.getMyRoom();
    this.memory.depositTask = room.storage.id;
    return;
}

Creep.prototype.getLinkerWithdrawTask = function()
{
    let room = this.getMyRoom();
    let spawnLink = room.storage.pos.findInRange(FIND_STRUCTURES, 5, { filter : (s) => s.structureType == STRUCTURE_LINK});

    if (spawnLink.length)
        this.memory.withdrawTask = spawnLink[0].id;

    return;
}