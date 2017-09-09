module.exports = function(){

    RoomVisual.prototype.cornerDiagnostics = function()
    {
        let room = Game.rooms[this.roomName];
        let creepPopulation = room.memory.creepCount.Total;
        let creepPopulationCap = room.memory.creepMinimum.Total;

        if (Game.time % 20 == 0 && room.storage)
        {
            if (room.memory.storageHistory.length == 20)
                room.memory.storageHistory.shift();

            room.memory.storageHistory.push(room.storage.store[RESOURCE_ENERGY]);
        }  

        if (room.memory.storageHistory.length == 20)
        {
            let sum1 = 0;
            let sum2 = 0;

            for (let i in room.memory.storageHistory)
            {
                if (i < 10)
                    sum1 += room.memory.storageHistory[i];
                else
                    sum2 += room.memory.storageHistory[i];
            }

            room.memory.storageTrend = ((sum2/10) - (sum1/10));
        }

        if (room.storage)
        {
            if (room.memory.storageTrend > 2250)
            {
                this.drawUpTriangle(room.storage.pos.x-.55, room.storage.pos.y-2);
                this.drawUpTriangle(room.storage.pos.x+.55, room.storage.pos.y-2);
            }
            else if (room.memory.storageTrend > 500)
                this.drawUpTriangle(room.storage.pos.x, room.storage.pos.y-2);
            else if (room.memory.storageTrend < -2250)
            {
                this.drawDownTriangle(room.storage.pos.x+.55, room.storage.pos.y-2);
                this.drawDownTriangle(room.storage.pos.x-.55, room.storage.pos.y-2);
            }
            else if (room.memory.storageTrend < -500)
                this.drawDownTriangle(room.storage.pos.x, room.storage.pos.y-2);
            else
                this.drawDash(room.storage.pos.x, room.storage.pos.y-1.85);

        }

        let roomLabel = "Room: " + this.roomName;
        this.text(roomLabel, 1,1, {align : 'left', font : .7, stroke : 'black'});

        let creepLabel = "Population: " + creepPopulation + "/" + creepPopulationCap;
        this.text(creepLabel, 1,2, {align : 'left', font : .7, stroke : 'black'});

        let containersLabel = "Containers: " + Object.keys(room.memory.myContainers).length;
        this.text(containersLabel, 1,3, {align : 'left', font : .7, stroke : 'black'});

        let containerAverageLabel = "Container Average: " + room.memory.containerStats.containerLongAverage;
        this.text(containerAverageLabel, 1,4, {align : 'left', font : .7, stroke : 'black'});

        let containerTargetLabel = "Recent Container Target: " + room.memory.containerStats.containerTarget;
        this.text(containerTargetLabel, 1,8, {align : 'left', font : .7, stroke : 'black'});

        //let containerFullLabel = "Containers Capped: " + room.memory.containerFullNum;
        //this.text(containerFullLabel, 1,5, {align : 'left', font : .7, stroke : 'black'});

        let storageLabel = "Storage: " + (room.storage ? room.storage.store[RESOURCE_ENERGY] : "None");
        this.text(storageLabel, 1, 5, {align : 'left', font : .7, stroke : 'black'});

        let terminalLabel = "Terminal: " + (room.terminal ? room.terminal.store[RESOURCE_ENERGY] : "None");
        this.text(terminalLabel, 1,6, {align : 'left', font : .7, stroke : 'black'});

        return;
    }

    RoomVisual.prototype.drawUpTriangle = function(x, y)
    {
        let points = [[x-.5,y+.5], [x+.5,y+.5], [x,y-.5], [x-.5,y+.5]];
        this.poly(points, {fill : 'green', stroke : 'green', stroke : 'black'});
    }

    RoomVisual.prototype.drawDownTriangle = function(x, y)
    {
        let points = [[x-.5,y-.5], [x+.5,y-.5], [x,y+.5], [x-.5,y-.5]];
        this.poly(points, {fill : 'red', stroke : 'red', stroke : 'black'});
    }

    RoomVisual.prototype.drawDash = function(x, y)
    {
        let points = [[x-.5,y-.2], [x-.5,y+.2], [x+.5,y+.2], [x+.5,y-.2], [x-.5,y-.2]];
        this.poly(points, {fill : 'white', stroke : 'white', stroke : 'black'});
    }
};