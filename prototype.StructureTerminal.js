const TERMINAL_ENERGY_THRESHOLD = 50000;
const sellEnergy = false;
const transferEnergy = true;
const MIN_PRICES = 
{
    H : .07
};

module.exports = function() {

    StructureTerminal.prototype.work = function()
    {
        let sendResult = 100;
        let room = this.room;
        
        if (transferEnergy && this.room.controller.level == 8 && this.store[RESOURCE_ENERGY] > TERMINAL_ENERGY_THRESHOLD)
        {
            //Max rooms look to send energy to other rooms who have less than the ENERGY THRESHOLD.
            //Other level 8 rooms that are low on energy also get targeted
            let destTerminal = _.find(Game.structures, function (s) 
                { return s.structureType == STRUCTURE_TERMINAL && s.room.storage && s.room.controller.my &&
                    ((s.room.controller.level != 8 && (s.room.storage.store[RESOURCE_ENERGY] + s.store[RESOURCE_ENERGY]) < STORAGE_ENERGY_THRESHOLD) ||
                    (s.room.controller.level == 8 && (s.room.storage.store[RESOURCE_ENERGY] + s.store[RESOURCE_ENERGY]) < 25000))});

            if (!destTerminal) return;

            //Calculate quantity to fill storage to STORAGE THRESHOLD
            let sendAmount = STORAGE_ENERGY_THRESHOLD - (destTerminal.room.storage.store[RESOURCE_ENERGY] + destTerminal.store[RESOURCE_ENERGY]);

            //Reduce sendAmount if we don't have enough energy in storage
            if (this.store[RESOURCE_ENERGY] <= sendAmount + Game.market.calcTransactionCost(sendAmount, this.room.name, destTerminal.room.name))
                sendAmount = Math.floor(this.store[RESOURCE_ENERGY] - Game.market.calcTransactionCost(sendAmount, this.room.name, destTerminal.room.name));

            //Reduce sendAmount if destination terminal does not have enough room
            if (sendAmount > (destTerminal.storeCapacity - _.sum(destTerminal.store)))
                sendAmount = Math.floor(destTerminal.storeCapacity - _.sum(destTerminal.store));

            this.send(RESOURCE_ENERGY, sendAmount, destTerminal.room.name);
        }
        
        if (sellEnergy)
        {
            let orders = Game.market.getAllOrders({type : ORDER_BUY, resourceType : RESOURCE_ENERGY});

            for (let i in orders)
            {
                if (orders[i].price >= .05)
                {
                    let orderAmount = orders[i].remainingAmount;

                    if (orderAmount > room.terminal.store[RESOURCE_ENERGY] - TERMINAL_ENERGY_THRESHOLD)
                        orderAmount = room.terminal.store[RESOURCE_ENERGY] - TERMINAL_ENERGY_THRESHOLD;
                        

                    let transactionCost = Game.market.calcTransactionCost(orderAmount, room.name, orders[i].roomName);
                    
                    if ((orderAmount + transactionCost) > room.terminal.store[RESOURCE_ENERGY])
                        orderAmount -= transactionCost;
                        

                    Game.market.deal(orders[i].id, orderAmount, room.name);
                }
            }
        }

        for (let i in this.store)
        {
            if (this.store[i] > 25000 && i != RESOURCE_ENERGY)
            {
                for (let k in Game.market.orders)
                {
                    //An offer is out of materials to sell
                    if (Game.market.orders[k].remainingAmount == 0)
                        Game.market.cancelOrder(k);
                            
                    //An offer in this room already exists
                    else if (Game.market.orders[k].resourceType == i && Game.market.orders[k].roomName == this.room.name)
                        return;
                }
            
                
                let marketOrders = Game.market.getAllOrders({type : ORDER_SELL, resourceType : i});
                let lowest = 5;

                if (!marketOrders.length > 0) return;
                
                marketOrders.sort(function(a,b) {
                    return (a.price - b.price);
                })
                
                lowest = (marketOrders[0].price*.95).toFixed(2) < MIN_PRICES[i] ? MIN_PRICES[i] :(marketOrders[0].price*.95).toFixed(2);

                Game.market.createOrder(ORDER_SELL, i, lowest, this.store[i] > 100000 ? 100000 : this.store[i], this.room.name);
            }
        }
    }
};