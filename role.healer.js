let TROOP_INVASION_NUM = 4;


module.exports = {

    run : function(creep)
    {
        let room = Game.rooms[creep.memory.myRoom.name];
        let defendersNum = room.memory.creepCount.Defender;

        if (Game.flags.attackLocation && Game.flags.attackBase)
        {
            let Garrison = Game.flags.attackBase.pos.findInRange(FIND_MY_CREEPS, 5, {filter : (c) => c.memory.role == 'attacker' && !c.memory.canHeal});

            if (Garrison.length >= TROOP_INVASION_NUM)
            {
                Garrison = Game.flags.attackBase.pos.findInRange(FIND_MY_CREEPS, 5, {filter : (c) => c.memory.role == 'attacker'});
                for (let i in Garrison)
                {
                    let creep = Garrison[i];

                    if (creep)
                        creep.memory.invasionFlag = true;
                }
            }
        }
        else
            creep.memory.invasionFlag = false;


        if (!Game.flags.attackLocation || !Game.flags.attackBase) return;

        if (creep.memory.invasionFlag)
        {
            //Move out
            if (creep.goTo(Game.flags.attackLocation)) return;
        }
        else
        {
            //Group up
            if (creep.pos.findInRange(Game.flags.attackBase, 5).length == 0)
                creep.moveTo(Game.flags.attackBase);

            return;
        }

        creep.healCreep();
    } 
};