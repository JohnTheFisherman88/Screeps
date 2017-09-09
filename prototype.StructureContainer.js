module.exports = function(){

	const memory = Memory.logisticalStats.allContainers;

	StructureContainer.prototype.getWeightedEnergy = function()
	{
		let energy = this.store[this.getCarryType()];

		if (!memory[this.id]) return -2000;

		memory[this.id].energy = energy;
		energy -= (memory[this.id].numAssigned * 1000);

		return energy;
	}

	StructureContainer.prototype.assign = function()
	{
		if (memory[this.id])
			memory[this.id].numAssigned++;
	}

	StructureContainer.prototype.unassign = function()
	{
		if (memory[this.id])
			memory[this.id].numAssigned = 0;
	}
};