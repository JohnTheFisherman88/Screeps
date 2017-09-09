module.exports = function(){

	Structure.prototype.getCarryType = function()
	{
		for (let i in this.store)
        {
            if (this.store[i] > 0)
            {
                return i;
            }
        }

        return null;
	}

    //Will not return resource energy
    Structure.prototype.getCarryMineral = function()
    {
        for (let i in this.store)
        {
            if (i != RESOURCE_ENERGY && this.store[i] > 0)
            {
                return i;
            }
        }

        return null;
    }

};