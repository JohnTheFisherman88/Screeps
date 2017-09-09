let TROOP_INVASION_NUM = 1;

module.exports = {

    run : function(creep)
    {
        let room = creep.getMyRoom();  

        if (creep.garrison()) return;     

        if (creep.hits < creep.hitsMax)
        {
            creep.heal(creep);
        }
        else
        {
            if (!creep.memory.invasionTask)
                creep.findTarget();

            creep.attackTarget();
        }
    }

};

Creep.prototype.findTarget = function()
{
    //Prioritise Towers -> Creeps-> Spawns -> Structures -> Controller
    let enemy = this.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {filter : (s) => s.structureType == STRUCTURE_TOWER});

    if (enemy == null)
    {
        let creeps = this.room.find(FIND_HOSTILE_CREEPS, {filter : (c) => c.owner != 'Baldey'});

        //Cycle all the creeps we have found
        for (let i in creeps)
        {
            //If any can hurt our attackers, kill them
            if (creeps[i].getActiveBodyparts(ATTACK) > 0 || creeps[i].getActiveBodyparts(RANGED_ATTACK) > 0)
                enemy = creeps[i];
        }
    }

    if (enemy == null)
        enemy =  this.pos.findClosestByPath(FIND_HOSTILE_SPAWNS);

    if (enemy == null)
        enemy = this.pos.findClosestByPath(FIND_STRUCTURES, {filter : (s) => s.structureType != STRUCTURE_CONTROLLER && 
            s.structureType != STRUCTURE_WALL && s.structureType != STRUCTURE_RAMPART});

    if (enemy == null)
        enemy = this.pos.findClosestByPath(FIND_STRUCTURES, {filter : (s) => s.structureType != STRUCTURE_CONTROLLER});

    this.memory.invasionTask = enemy.id;
}

Creep.prototype.attackTarget = function()
{
    let enemy = Game.getObjectById(this.memory.invasionTask);
    //this.say(enemy.pos.x);

    if (!enemy)
    {
        delete this.memory.invasionTask;
        return;
    }
    else if (enemy.owner == 'Baldey')
    {
        console.log('tried to attack friend, should not have happened');
        return;
    }

    this.attack(enemy);
    this.rangedAttack(enemy);
    this.moveTo(enemy);
}

//Returns true if creeps are situated at the garrison. False if moving to attack location
Creep.prototype.garrison = function()
{
    if (Game.flags.attackLocation && Game.flags.attackBase)
    {
        if (Game.flags.attackBase.room)
        {
            let Garrison = Game.flags.attackBase.pos.findInRange(FIND_MY_CREEPS, 5, {filter : (c) => c.memory.role == 'Attacker'});

            if (Garrison.length >= TROOP_INVASION_NUM)
            {
                Garrison = Game.flags.attackBase.pos.findInRange(FIND_MY_CREEPS, 5, {filter : (c) => c.memory.role == 'Attacker' || c.memory.role == 'Healer'});
                for (let i in Garrison)
                {
                    let creep = Garrison[i];

                    if (creep)
                        creep.memory.invasionFlag = true;
                }
            }
        }
    }
    else
    {
        this.memory.invasionFlag = false;
        this.getOffRoad();
        return true;
    }

    if (this.memory.invasionFlag)
    {
        //Move out
        if (!this.goTo(Game.flags.attackLocation)) return false;
    }
    else
    {
        //Group up
        if (this.pos.findInRange(Game.flags.attackBase, 5).length == 0)
            this.travelTo(Game.flags.attackBase, {ignoreCreeps : false}); //Don't ignore creeps or they might attack them if they try to move into them
    }

    return true;
}