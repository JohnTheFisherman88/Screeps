module.exports = function() {

	Source.prototype.findClosestSpawn = function()
	{
		let goals = [];
		let source = this;

		for (let i in Memory.rooms)
		{
			let room = Game.rooms[i];
			let spawn = Game.getObjectById(room.memory.spawn);

			if (!room.memory.creepMaximum)
				continue;

			let maxMiner = room.memory.creepMaximum.Miner;
			let reservedSources = Object.keys(room.memory.mySources).length;

			if (maxMiner == 0 || !spawn) continue;

			if (reservedSources < maxMiner)
			{
				goals.push(spawn);
			}
		}
		
		source.memory = Memory.logisticalStats.allSources[this.id];

		if (source.memory && source.memory.closestRoom)
		{
			let room = Game.rooms[source.memory.closestRoom];
			let roomSpawns = room.find(FIND_MY_SPAWNS);

			if (room.controller.my)
			{
				if (_.find(room.memory.mySources, function(source) { return source.id == this.id}))
				{
					for (let i in roomSpawns)
					{
						if (!_.find(goals, function(spawn) { return spawn.id == roomSpawns[i].id }))
							goals.push(roomSpawns[i]);
					}
				}
				else
				{
					source.memory.closestRoom = null;
				}
			}
		}

		return this.pos.findClosestSpawn(goals);
	}

};