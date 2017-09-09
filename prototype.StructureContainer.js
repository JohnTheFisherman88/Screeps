module.exports = function(){

	StructureContainer.prototype.initializeMemory = function()
	{
		if (Memory.logisticalStats.containerData.allContainers[this.id] != undefined)
			return;
		else
			Memory.logisticalStats.containerData.allContainers[this.id] = new Object();

		Memory.logisticalStats.containerData.allContainers[this.id].numAssigned = 0;
	}

	StructureContainer.prototype.getWeightedEnergy = function()
	{
		let energy = this.store[this.getCarryType()];

		if (!Memory.logisticalStats.containerData.allContainers[this.id]) return -2000;

		Memory.logisticalStats.containerData.allContainers[this.id].energy = energy;
		energy -= (Memory.logisticalStats.containerData.allContainers[this.id].numAssigned * 1000);

		return energy;
	}

	StructureContainer.prototype.assign = function()
	{
		if (Memory.logisticalStats.containerData.allContainers[this.id])
			Memory.logisticalStats.containerData.allContainers[this.id].numAssigned++;
	}

	StructureContainer.prototype.unassign = function()
	{
		if (Memory.logisticalStats.containerData.allContainers[this.id])
			Memory.logisticalStats.containerData.allContainers[this.id].numAssigned = 0;
	}
};