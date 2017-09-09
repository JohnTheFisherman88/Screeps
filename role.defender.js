let TROOP_INVASION_NUM = 4;


module.exports = {

    run : function(creep)
    {
        let room = Game.rooms[creep.memory.myRoom.name];
        let defendersNum = room.memory.creepCount.Defender;

        if (defendersNum >= room.memory.creepMinimum.Defender && room.memory.nearbyInvader && creep.memory.role == 'Defender')
            creep.memory.defenseFlag = true;
        else if ((defendersNum == 0 || !room.memory.nearbyInvader) && creep.memory.role == 'Defender')
            creep.memory.defenseFlag = false;

        if (!creep.memory.defenseFlag) 
        {
            creep.getOffRoad();
            return;
        }

        //Scan for most threatened room
        let max = -1;
        let threat = null;
        for (let i in room.memory.nearbyInvasionRooms)
        {
            if (!Memory.empire.invasionRooms[i])
            {
                delete room.memory.nearbyInvasionRooms[i];
                continue;
            }
            else if (room.memory.nearbyInvasionRooms[i] > max)
            {
                max = room.memory.nearbyInvasionRooms[i];
                threat = i;
            }
        }

        if (!threat) return;

        //Start travelling to largest threat
        if (creep.goTo(new RoomPosition(25, 25, threat))) return;

        //Scan for enemies
        let enemies = creep.room.find(FIND_HOSTILE_CREEPS, {filter : (s) => s.owner.username != "Baldey"}), target = null;

        //Select a target
        for (let i in enemies)
        {
            //Prioritize non-healers
            if (enemies[i].getActiveBodyparts(HEAL) == 0)
            {
                target = enemies[i];
            }
        }

        if (target == null)
            target = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {filter : (s) => s.owner.username != "Baldey"});

        //Attack
        if (creep.attack(target) == ERR_NOT_IN_RANGE)
            creep.moveTo(target);
        else if (creep.rangedAttack(target) == ERR_NOT_IN_RANGE)
            creep.moveTo(target);
    }
};