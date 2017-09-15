let TROOP_INVASION_NUM = 5;


module.exports = {

    run : function(creep)
    {
        if (creep.garrison()) return;  

        creep.healCreep();
    } 
};