module.exports = {

	run : function(creep)
	{
        if (!creep.memory.claimTask)
        	creep.getClaimTask();

        creep.doClaimTask();
	}
};

Creep.prototype.getClaimTask = function()
{
	let room = Game.rooms[this.memory.myRoom.name];
	let roomFlags = room.memory.myFlags;

	for (let id in roomFlags)
	{
		let flag = Game.flags[id];

		if (!flag)
		{
			delete roomFlags[id];
			continue;
		}

		if (flag.secondaryColor == COLOR_WHITE && this.ticksToLive < 450)
		{
			this.suicide();
			continue;
		}

		if (flag.memory.closestRoom != room.name)
		{
			console.log('removing ' + id + ' from room ' + room.name + ' because it belongs to ' + flag.memory.closestRoom);
            delete roomFlags[id];
            continue;
		}

		if (!Game.creeps[flag.memory.creep] || Game.creeps[flag.memory.creep].memory.role != 'Claimer')
        {
            flag.memory.marked = false;
            flag.memory.creep = null;
        }

        if (Game.creeps[flag.memory.creep] && Game.creeps[flag.memory.creep].memory.claimTask != id)
        {
            console.log(flag.memory.creep + ' removed from ' + id + ' because they are assigned to ' + Game.creeps[flag.memory.creep].memory.claimTask);
            flag.memory.marked = false;
            flag.memory.creep = null;
        }

        if (!flag.memory.marked)
        {
            flag.memory.marked = true;
            flag.memory.creep = this.name;
            this.memory.claimTask = id;
            return;
        }
	}
}

Creep.prototype.doClaimTask = function()
{
	let flag = Game.flags[this.memory.claimTask];
	let room = Game.rooms[this.memory.myRoom.name];
	let controller;

	if (!flag || !room.memory.myFlags[flag.name])
	{
		this.memory.claimTask = null;
		return;
	}

	if (!flag.room || !flag.room.controller)
	{
		this.travelTo(Game.flags[this.memory.claimTask]);
		return;
	}

	controller = flag.room.controller;

	if (flag.memory.creep != this.name)
	{
		console.log('Creep is claiming wrong flag');
		this.memory.claimTask = _.find(Memory.logisticalStats.flagData.claimFlags, function (f) { return f.creep == this.name });
	}

	if (flag.secondaryColor == COLOR_WHITE)
    {
        if (this.claimController(controller) == ERR_GCL_NOT_ENOUGH || this.claimController(controller) == ERR_NOT_IN_RANGE)
        {
            this.travelTo(controller);
        }
    }
    else
    {
        if (this.reserveController(controller) == ERR_NOT_IN_RANGE)
            this.travelTo(controller);
    }

	if (controller.my)
    {
    	delete flag.memory;
        flag.remove();
        this.memory.claimTask = null;
        return;
    }
}