module.exports = function() {

	//Takes an array of goals and returns the object Pathfinder selects as the cloests object
	RoomPosition.prototype.findClosestByPathFinder = function(goals, itr=_.identity, maxCost)
	{
		let map = _.map(goals, itr);

		let options = {
			maxOps : 16000,
			roomCallback : 
                function(roomName) {
                    let room = Game.rooms[roomName];
                    if (!room) return;
                    
                    if (Memory.empire.hostileRooms[roomName])
                    {
                    	console.log('assignment tried to path through hostile room');
                    	return Number.POSITIVE_INFINITY;
                    }
                }
		};

		if (maxCost)
			options.maxCost = maxCost;

		if (_.isEmpty(map))
			return {goal : null};

		let result = PathFinder.search(this, map, options);
		
		let last = _.last(result.path);

		if (last == undefined)
			last = this;

		let goal = _.min(goals, g => last.getRangeTo(g.pos));

		return {
		goal: (Math.abs(goal)!==Infinity)?goal:null,
		cost: result.cost,
		ops: result.ops,
		incomplete: result.incomplete
		}
	}

	RoomPosition.prototype.findClosestSpawn = function(goals)
	{
		if (Object.keys(goals).length > 0)
			return this.findClosestByPathFinder(goals, (spawn) => ({pos : spawn.pos, range : 1})).goal;
		else
			return null;
	}

	RoomPosition.prototype.findClosestConstructionSite = function(goals)
	{
		let ret = this.findClosestByPathFinder(goals, (site) => ({pos : site.pos, range : 1}), 100);

		if (!ret.incomplete)
			return ret.goal;
		else
			return null;
	}

};