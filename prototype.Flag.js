module.exports = function() {

	Flag.prototype.findClosestSpawn = function()
	{
		let goals = [];

		//Add all viable rooms to the list of goals
		for (let i in Memory.rooms)
		{
			let room = Game.rooms[i];
			let spawn = Game.getObjectById(room.memory.spawn);

			if (!room.memory.creepMaximum)
				continue;
			
			let maxClaimer = room.memory.creepMaximum.Claimer;
			let reservedFlags = Object.keys(room.memory.myFlags).length;

			if (maxClaimer == 0) continue;

			if (reservedFlags < maxClaimer)
			{
				goals.push(spawn);
			}
		}

		let room = Game.rooms[this.memory.closestRoom];

		//Try to re-add the flag's current closest room to the list of goals, to check if it is still the closest
		if (room)
		{
			let roomSpawns = room.find(FIND_MY_SPAWNS);

			if (room.controller.my)
			{
				//Check if our flag is in that room's memory
				if (_.find(room.memory.myFlags, function(f) { return f.id == this.id}))
				{
					for (let i in roomSpawns)
					{
						//Check if any spawns from that room aren't already in our goals array, push them if so
						if (!_.find(goals, function(spawn) { return spawn.id == roomSpawns[i].id }))
							goals.push(roomSpawns[i]);
					}
				}
				else
				{
					this.memory.closestRoom = null;
				}
			}
		}
	
		return this.pos.findClosestSpawn(goals);
	}

};