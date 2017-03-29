'use strict'

const moment = require('moment')
const checkEligibility = require('./check-eligibility')
const enqueue = require('./enqueue')
const db = require('./db')

module.exports = function (context) {
  const tMinus6 = moment().subtract(4, 'hours').unix()
  const tMinus3 = moment().subtract(3, 'hours').unix()
  const query = { flights: { $elemMatch: { departure: { $gte: tMinus6, $lte: tMinus3 } } } }
  return db.connect(context).then(db => {
    const enqueues = []
    context.bindings.flight = []
    const cursor = db.collection('bookings').find(query)
    cursor.on('data', function (booking) {
      context.log(`check booking ${booking.booking_id}`)
      const flights = booking.flights.filter(flight => flight.departure >= tMinus6 && flight.departure <= tMinus3)
      flights.forEach(flight => {
        context.log(`check flight ${flight.flight_number}`)
        enqueues.push(checkEligibility(flight).then(isEligible => {
          if (isEligible) {
            return enqueue(context, flight, booking.booking_id)
          }
        }))
      })
    })
    cursor.on('end', function () {
      db.close()
      Promise.all(enqueues).then(() => context.done()).catch(err => {
        context.log(err.stack)
        context.done(err)
      })
    })
  })
}
