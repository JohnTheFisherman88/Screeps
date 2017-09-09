/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('utility');
 * mod.thing == 'a thing'; // true
 */

module.exports = {

    findAdjacentRooms: function (room)
    {
        let name = room.name;

        let x;
        let y;
        let xCord = [];
        let yCord = [];
        let rooms = [];
        let index = 0;

        for (let i = 0; i < name.length; i++)
        {
            if (i == 0)
            {
                x = name[i];
                continue;
            }

            let dummy = name[i];

            if (isNaN(dummy))
            {
                y = name[i];
                xCord = name.slice(1, i);
                yCord = name.slice(i + 1, name.length);
                break;
            }
        }

        xCord = parseInt(xCord);
        yCord = parseInt(yCord);

        for (let i = 0; i < 9; i++)
        {
            rooms[i] = new String();
        }

        for (let i = xCord - 1; i <= xCord + 1; i++)
        {
            for (let j = yCord - 1; j <= yCord + 1; j++)
            {
                rooms[index] = rooms[index].concat(x);
                rooms[index] = rooms[index].concat(i);
                rooms[index] = rooms[index].concat(y);
                rooms[index] = rooms[index].concat(j);

                index++;
            }
        }

        return rooms;
    },

    findClosestMiner : function(room, extract)
    {
        if (extract)
        {
            miner = room.find(FIND_MY_CREEPS,
                    {filter: {memory: {role: 'miner', canExtract : true, myMineral : null}}});

            if (miner.length > 0)
            {
                return miner[0];
            }
        }

        else
        {
            for (let name in Game.rooms)
            {
                let roomName = Game.rooms[name];
                let miner;

                miner = roomName.find(FIND_MY_CREEPS,
                    {filter: {memory: {role: 'miner', canExtract : false, mySource : null}}});

                if (miner.length > 0)
                {
                    return miner[0];
                }
            }
        }
    },

    findNearbySource : function(room)
    {
        for (let i in room.memory.nearbySources)
        {
            let source = Game.getObjectById(room.memory.nearbySources[i]);
            if (source && source.creepAssigned == null)
            {
                return source;
            }
        }

        return null;
    },

    getCarryType : function(Object, type)
    {
        if (type == 'creep')
        {
            for (let i in Object.carry)
            {
                if (Object.carry[i] > 0)
                {
                    return i;
                }
            }
        }
        else if (type == 'structure')
        {
            for (let i in Object.store)
            {
                if (Object.store[i] > 0)
                {
                    return i;
                }
            }
        }
    }

};