module.exports = function(){

	StructureContainer.prototype.getWeightedEnergy = function()
	{
		var memory = Memory.logisticalStats.allContainers;
		let energy = this.store[this.getCarryType()];

		if (!memory[this.id]) return -2000;

		memory[this.id].energy = energy;
		energy -= (memory[this.id].numAssigned * 1000);

		return energy;
	}

	StructureContainer.prototype.assign = function()
	{
		var memory = Memory.logisticalStats.allContainers;

		if (memory[this.id])
			memory[this.id].numAssigned++;
	}

	StructureContainer.prototype.unassign = function()
	{
		var memory = Memory.logisticalStats.allContainers;
		
		if (memory[this.id])
			memory[this.id].numAssigned = 0;
	}
};