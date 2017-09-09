module.exports = function() {

	StructureSpawn.prototype.makeCreep = function(type, room)
	{
		let bodyparts = this.selectParts(type);
		let opts = {role : type, myRoom : room};

		do
        {
            var name = opts.role + Math.floor(Math.random() * 200 + 1);
        } while (Game.creeps[name]);

		this.createCreep(bodyparts, name, opts);
	}

	StructureSpawn.prototype.selectParts = function(type)
	{
		let bodyParts = [];
	    let maxMove = 0;
	    let maxCarry = 0;
	    let maxWork = 0;

	    let maxAttack = 0;
	    let maxRange = 0;
	    let maxHeal = 0;
	    let maxClaim = 0;
	    let maxTough = 0;

	    switch (type)
	    {
	        case 'Attacker':
	            maxMove = 25;
	            maxAttack = 15;
	            maxRange = 5;
	            maxHeal = 5;
	            break;

	        case 'Defender':
	        	maxTough = 10;
	        	maxMove = 25;
	        	maxRange = 15;
	        	break;

	        case 'Healer':
	        	maxTough = 10;
	        	maxHeal = 15;
	            maxMove = 25;
	            break;

	        case 'Claimer':
	            maxClaim = 2;
	            maxMove = 5; //Reasonable movement on swamp tiles
	            break;

	        case 'AttackClaimer':
	        	maxClaim = 20;
	        	maxMove = 20;
	        	break;

	        case 'Miner':
	            maxMove = 2;
	            maxCarry = 1;
	            maxWork = 5;
	            break;

	       	case 'Extractor':
	       		maxMove = 2;
	       		maxCarry = 1;
	       		maxWork = 10;

	        case 'Upgrader':
	            maxMove = 10;
	            maxCarry = 5;
	            maxWork = 15;
	            break;
	            
	        case 'Builder':
	        case 'Fixer':
	            maxMove = 15;
	            maxCarry = 30;
	            maxWork = 5;
	            break;

	        case 'Waller':
	        	maxMove = 15;
	        	maxCarry = 28;
	        	maxWork = 2;
	        	break;

	        case 'Transport':
	            maxMove = 17;
	            maxCarry = 31;
	            maxWork = this.room.controller.level >= 4 ? 2 : 0
	            break;

	        case 'Linker':
	        	maxWork = 0;
                maxMove = 1;
                maxCarry = 2;
                break;
	    }

	    let cutOff = (maxMove*50 + maxCarry*50 + maxWork*100 + maxAttack*80 + maxRange*150 + maxClaim*600 + maxTough*10 + maxHeal*250);

	    if (this.room.energyAvailable == this.room.energyCapacityAvailable
	        || this.room.energyAvailable >= cutOff)
	    {
	        let numMove = 0;
	        let numCarry = 0;
	        let numWork = 0;

	        let numAttack = 0;
	        let numRange = 0;
	        let numHeal = 0;
	        let numClaim = 0;
	        let numTough = 0;

	        for (let energy = this.room.energyAvailable; energy > 0; energy -= 50)
	        {
	            if (numMove == 0)
	            {
	                bodyParts.push(MOVE);
	                numMove++;
	            }
	            else if (energy >= 100 && numWork < maxWork && (numWork < numCarry || numCarry == maxCarry) && (numMove > Math.ceil(numWork+numCarry)/2 || numMove == maxMove))
	            {
	                bodyParts.push(WORK);
	                energy -= 50;
	                numWork++;
	            }
	            else if (energy >= 50 && numCarry < maxCarry && (numMove > Math.ceil(numWork+numCarry)/2 || numMove == maxMove))
	            {
	                bodyParts.push(CARRY);
	                numCarry++;
	            }
	            else if (energy >= 80 && numAttack < maxAttack && numMove > (numAttack + numRange + numHeal + numTough + numClaim))
	            {
	                bodyParts.push(ATTACK);
	                energy -= 30;
	                numAttack++;
	            }
	            else if (energy >= 150 && numRange < maxRange && numMove > (numAttack + numRange + numHeal + numTough + numClaim))
	            {
	                bodyParts.push(RANGED_ATTACK);
	                energy -= 100;
	                numRange++;
	            }
	            else if (energy >= 250 && numHeal < maxHeal && numMove > (numAttack + numRange + numHeal + numTough + numClaim))
	            {   
	                bodyParts.push(HEAL);
	                energy -= 200;
	                numHeal++;
	            }
	            else if (energy >= 10 && numTough < maxTough && numMove > (numAttack + numRange + numHeal + numTough + numClaim))
	            {
	                bodyParts.push(TOUGH);
	                numTough++;
	                energy += 40;
	            }
	            else if (energy >= 600 && numClaim < maxClaim && numMove > (numAttack + numRange + numHeal + numTough + numClaim))
	            {
	                energy -= 550;
	                bodyParts.push(CLAIM);
	                numClaim++;
	            }
	            else if (energy >= 50 && numMove < maxMove)
	            {
	                bodyParts.push(MOVE);
	                numMove++;
	            }
	            else if (numWork == maxWork && numMove == maxMove && numCarry == maxCarry)
	            {
	                break;
	            }
	        }

	        bodyParts.sort(function(a,b){
	            if (a == TOUGH)
	                return -1;
	            else if (a == MOVE && b != TOUGH)
	                return -1;
	            else if (a == CARRY && b != TOUGH && b != MOVE)
	                return -1;
	            else
	                return 1;
	        });
	    }

	    return bodyParts;
	}
};