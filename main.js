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
const Manager = require('manager');

global.STORAGE_ENERGY_THRESHOLD = 100000;

profiler.enable();
module.exports.loop = function () 
{
    profiler.wrap(function() 
    {
        let manager = new Manager();
        manager.manageMemory();
        manager.timer();
        manager.findInvaders();

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