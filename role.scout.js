module.exports = {

    run : function(creep)
    {
        if (creep.memory.myFlag != null)
        {
            let flag = Game.flags[creep.memory.myFlag.name];

            //If a miner has arrived, we have vision in the room, so we can leave
            if (_.sum(Game.creeps, (c) => c.memory.role == 'miner' && c.room == flag.room) > 0)
                creep.memory.myFlag = null;

            creep.moveTo(flag);
        }
        else
        {
            //Find some flag in a room where we have no vision
            for (let i in Game.flags)
            {
                if (Game.flags[i].color == COLOR_RED)
                {
                    if (Game.flags[i].room == undefined)
                    {
                        creep.memory.myFlag = Game.flags[i];
                    }
                }
            }
        }
    }
};