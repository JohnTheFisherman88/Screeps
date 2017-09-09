module.exports = {

	run : function(creep)
	{
        if (!creep.memory.attackClaimTask)
        	creep.getAttackClaimTask();

        creep.doAttackClaimTask();
	}
};

Creep.prototype.getAttackClaimTask = function()
{
	let flags = _.filter(Game.flags, (s) => s.color == COLOR_GREEN && s.secondaryColor == COLOR_RED);

	if (flags.length > 0)
	{
		this.memory.attackClaimTask = flags[0].name;
	}
}

Creep.prototype.doAttackClaimTask = function()
{
	let flag = Game.flags[this.memory.attackClaimTask];
	let room = Game.rooms[this.memory.myRoom.name];
	let controller;

	if (!flag)
	{
		delete this.memory.attackClaimTask;
		return;
	}

	if (!flag.room || !flag.room.controller)
	{
		this.travelTo(Game.flags[this.memory.attackClaimTask]);
		return;
	}

	controller = flag.room.controller;

   	if (this.claimController(controller) == ERR_GCL_NOT_ENOUGH || this.claimController(controller) == ERR_NOT_IN_RANGE)
	{
		this.travelTo(controller);
	}

	if (controller.my)
    {
    	delete flag.memory;
        flag.remove();
        delete this.memory.attackClaimTask;
        return;
    }
}