module.exports = function (context, myTimer) {

 var timeStamp = new Date().toISOString();

    // Puts the "new message" in the Bookings Queue
    context.bindings.bookingItem = "new message"+ timeStamp;
   
    //adds an array of things to the Queue
    //context.bindings.bookingItem = ["message 1","message 2"];
    
    context.done();


};