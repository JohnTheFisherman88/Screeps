const RAMPART_MAX = 5000;

module.exports = function() {

	StructureTower.prototype.work = function()
	{
        if (this.energy > 0)
        {
            if (this.attackHostile()) return;

            if (this.healCreep()) return;

            this.repairStructure();
        }
	}

    StructureTower.prototype.healCreep = function()
    {
        let target = null;
        let wounded = this.room.find(FIND_MY_CREEPS, {filter : (c) => c.hits < c.hitsMax});

        if (wounded.length > 0)
            target = wounded[0];

        if (target)
        {
            this.heal(target);
            return true;
        }
    }

    StructureTower.prototype.attackHostile = function()
    {
        let enemy = null;
        let creeps = this.room.find(FIND_HOSTILE_CREEPS, {filter : (s) => s.owner.username != "Baldey"});

        for (let i in creeps)
        {
            if (creeps[i].getActiveBodyparts(HEAL) == 0)
            {
                enemy = creeps[i];
            }
        }

        if (creeps.length > 0)
        {
            if (enemy)
                this.attack(enemy);
            else
                this.attack(creeps[0]);
            return true;
        }
    }

    StructureTower.prototype.repairStructure = function()
    {
        // Repair code
        let lowestStruct;
        if (!this.room.memory.needsRepair)
        {
            let lowest = 3000000;

            let structures = this.room.find(FIND_STRUCTURES,
                { filter : (s) => s.hits < s.hitsMax && (s.structureType != STRUCTURE_WALL)});

            for (let i in structures)
            {
                if (structures[i].hits < lowest)
                {
                    lowest = structures[i].hits;
                    lowestStruct = structures[i];
                }
            }

            if (lowestStruct != null)
                this.room.memory.needsRepair = lowestStruct.id;
        }
        else
        {
            lowestStruct = Game.getObjectById(this.room.memory.needsRepair);
        }

        if (lowestStruct && lowestStruct.hits < lowestStruct.hitsMax)
        {
            if (lowestStruct.structureType == STRUCTURE_RAMPART && lowestStruct.hits > RAMPART_MAX)
            {
                delete this.room.memory.needsRepair;
                return;
            }

            this.repair(lowestStruct);
        }
        else
            delete this.room.memory.needsRepair;
    }

};