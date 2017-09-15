module.exports = function(room){

    Creep.prototype.fillInventory = function()
    {
        let room = Game.rooms[this.memory.myRoom.name];
        let spawn = Game.getObjectById(room.memory.spawn), structure;

        if (this.memory.fillInventory)
            structure = Game.getObjectById(this.memory.fillInventory);
        else
        {
            //If our room doesn't have a spawn yet, look for a room that does
            if (spawn == null)
            {
                spawn = this.pos.findClosestSpawn(Game.spawns);
                
                if (spawn)
                    room = spawn.room;
            }
            
            if (room.storage)
            {
                structure = room.storage;
            }
            else if (room.energyAvailable == room.energyCapacityAvailable)
            {
                structure = spawn;
            }

            if (structure)
                this.memory.fillInventory = structure.id;
        }

        if (!structure)
        {    
            this.getOffRoad();
            return;
        }
        
        if (structure.structureType == STRUCTURE_STORAGE || room.energyAvailable == room.energyCapacityAvailable)
        {
            if (this.withdraw(structure, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE || this.room != structure.room)
                this.travelTo(structure, {ignoreCreeps : false});
            else if (this.room == structure.room)
                delete this.memory.fillInventory;
        }
        else
            delete this.memory.fillInventory;
    }

    //Send a creep to their home room, works around the exit back-and-forth bug
    //Returns true if the creep is on the way home, false if otherwise
    Creep.prototype.goHome = function()
    {
        if (!this.isHome())
        {
            this.moveTo(new RoomPosition(28,28,this.memory.myRoom.name));
            return true;
        }
        //Once the creep arrives at it's room, we have to force it out of the exit zone, or it may end up being teleported back through
        else if (this.pos.x == 0 || this.pos.y == 0 || this.pos.x == 49 || this.pos.y == 49)
            this.moveTo(this.pos.x == 0 ? 1 : 48, this.pos.y == 0 ? 1 : 48);

        return false;
    }

    Creep.prototype.isHome = function()
    {
        return this.memory.myRoom.name == this.room.name;
    }

    //Sends a creep to an object in another room
    //Returns true if creep is currently on the way to that room
    Creep.prototype.goTo = function(object)
    {
        if (!object) return true;

        //If we aren't in the room, try to go there. 
        //An XOR handles either case where object does or doesnt have a .room property
        if (!(this.room.name == object.roomName || this.room == object.room))
        {
            this.moveTo(object);
            return true;
        }

        //Once the creep arrives at it's room, we have to force it out of the exit zone, or it may end up being teleported back through
        else if (this.pos.x == 0 || this.pos.y == 0 || this.pos.x == 49 || this.pos.y == 49)
            this.moveTo(this.pos.x == 0 ? 1 : 48, this.pos.y == 0 ? 1 : 48);

        return false;
    }

    Creep.prototype.getOffRoad = function()
    {
        let creep = this;
        let goals = [];

        if (creep.pos.lookFor(LOOK_STRUCTURES, {filter : (s) => s.structureType == STRUCTURE_ROAD}).length == 0) return;

        let fleeFromArray = creep.room.find(FIND_STRUCTURES);
        fleeFromArray = fleeFromArray.concat(creep.room.find(FIND_CREEPS));

        for (let i in fleeFromArray)
        {
            let object = new Object();

            object.pos = fleeFromArray[i].pos;
            object.range = 1;
            goals.push(object);
        }
        
        let ret = PathFinder.search(creep.pos, goals, {flee : true});

        if (ret.path.length > 0)
        {
            creep.moveTo(ret.path[0]);
        }
    }

    Creep.prototype.renewIfDying = function()
    {
        let room = this.getMyRoom();

        if (room.memory.helperRoom)
        {
            if (this.ticksToLive < 200)
                this.memory.renew = true;
            else if (this.ticksToLive > 500)
                delete this.memory.renew;
        }

        if (this.memory.renew)
        {
            let spawn = Game.getObjectById(room.memory.spawn)

            if (spawn)
            {
                if (spawn.renewCreep(this) == ERR_NOT_IN_RANGE)
                    this.moveTo(spawn);
            }

            return true;
        }

        return false;
    }

    Creep.prototype.isHealer = function()
    {
        let creep = this;
        return creep.memory.canHeal == true;
    }

    Creep.prototype.healCreep = function()
    {
        let creep = this;
        let target = null;

        let wounded = creep.pos.findInRange(FIND_MY_CREEPS, 50, {filter : (c) => c.hits < c.hitsMax});

        if (wounded.length > 0)
        {
            for (let i in wounded)
            {
                if (wounded[i].memory.role == 'Healer')
                {
                    target = wounded[i];
                    break;
                }
            }

            if (target == null)
                target = wounded[0];
        }
        else if (wounded.length == 0)
        {
            target = creep.pos.findClosestByPath(FIND_MY_CREEPS, {filter : (c) => c.hits < c.hitsMax});
        }

        if (target)
        {
            if (creep.heal(target) == ERR_NOT_IN_RANGE)
            {
                creep.rangedHeal(target);
            }
            creep.moveTo(target);
        }
    }

    Creep.prototype.setInventoryStatus = function()
    {
        let inventory = _.sum(this.carry);

        if (this.memory.role == 'Transport')
        {
            if (inventory >= Math.ceil((this.carryCapacity*.4))) this.memory.invFull = true;
            else if (inventory == 0) this.memory.invFull = false;
        }
        else
        {
            if (inventory == this.carryCapacity) this.memory.invFull = true;
            else if (inventory == 0) this.memory.invFull = false;
        }
    }

    Creep.prototype.getCarryType = function()
    {
        for (let i in this.carry)
        {
            if (this.carry[i] > 0)
            {
                return i;
            }
        }
    }

    Creep.prototype.getMyRoom = function()
    {
        return Game.rooms[this.memory.myRoom.name];
    }

    Creep.prototype.getMySpawn = function()
    {
        return Game.getObjectById(Game.rooms[this.memory.myRoom.name].memory.spawn);
    }

    Creep.prototype.drawCpu = function()
    {
        if (!this.memory.cpu) return;

        let pos = new RoomPosition(this.pos.x, this.pos.y-1, this.room.name);
        let cpu = this.memory.cpu;

        if (cpu > 1)
        {
            this.room.visual.text(this.memory.cpu, this.pos.x, this.pos.y-1, {color: 'pink', font : .5, stroke : 'black', strokeWidth : .2});
        }
        else
            this.room.visual.text(this.memory.cpu, this.pos.x, this.pos.y-1, {font : .5, stroke : 'black', strokeWidth : .2});
    }

    Creep.prototype.isOverPopulated = function()
    {
        let room = this.getMyRoom(), spawn = this.getMySpawn();
        let min = room.memory.creepMinimum, count = room.memory.creepCount;

        if (!room.memory.spawn || (this.memory.role == 'Upgrader' && room.controller.level > 4)|| this.memory.role == 'Attacker' || this.memory.role == 'Transport') return false;

        if (min[this.memory.role] < count[this.memory.role]) return true;
        else return false;
    }

    Creep.prototype.recycleSelf = function()
    {
        spawn = this.getMySpawn();

        if (spawn && spawn.recycleCreep(this) == ERR_NOT_IN_RANGE)
            this.moveTo(spawn);
    }

    Creep.prototype.work = function()
    {
        let startCpu = Game.cpu.getUsed();

        if (this.isOverPopulated())
        {
            this.recycleSelf();
            return;
        }

        if (this.memory.role == 'Miner' || this.memory.role == 'Extractor')
            require('role.miner').run(this);
        else if (this.memory.role == 'Upgrader')
            require('role.upgrader').run(this);
        else if (this.memory.role == 'Builder')
            require('role.builder').run(this);
        else if (this.memory.role == 'Fixer')
            require('role.fixer').run(this);
        else if (this.memory.role == 'Waller')
            require('role.waller').run(this);
        else if (this.memory.role == 'Transport')
            require('role.transport').run(this);
        else if (this.memory.role == 'Linker')
            require('role.linker').run(this);
        else if (this.memory.role == 'Attacker')
            require('role.attacker').run(this);
        else if (this.memory.role == 'Healer')
            require('role.healer').run(this);
        else if (this.memory.role == 'Defender')
            require('role.defender').run(this);
        else if (this.memory.role == 'Claimer')
            require('role.claimer').run(this);
        else if (this.memory.role == 'AttackClaimer')
            require('role.attackclaimer').run(this);

        this.memory.cpu = (Number(Game.cpu.getUsed() - startCpu).toFixed(1));
        this.drawCpu();
    }
};