require('prototype.creep')();
require('prototype.RoomPosition')();
require('prototype.Room')();
require('prototype.Source')();
require('prototype.Structure')();
require('prototype.StructureContainer')();
require('prototype.Flag')();
require('prototype.StructureSpawn')();
require('prototype.StructureTower')();
require('prototype.StructureLab')();
require('prototype.StructureTerminal')();
require('prototype.RoomVisual')();
require('globals')();
const profiler = require('screeps-profiler');
const traveler = require('Traveler');

global.STORAGE_ENERGY_THRESHOLD = 100000;

/* Automatic roads to controller */
/* Miners can build/repair and harvest at the same time */

profiler.enable();
module.exports.loop = function () 
{
    profiler.wrap(function() 
    {
        manageMemory();
        timedEvents();
        findInvaders();

        //Run room methods
        for (let i in Game.rooms)
        {
            if (Game.rooms[i].controller && Game.rooms[i].controller.my)
                Game.rooms[i].work();
        }

        //Run creep methods
        for (let name in Game.creeps)
        {
            if (!Game.creeps[name].memory.myRoom || !Game.rooms[Game.creeps[name].memory.myRoom.name])
            {
                Game.creeps[name].suicide();
                continue;
            }
            Game.creeps[name].work();
        }
    });
};