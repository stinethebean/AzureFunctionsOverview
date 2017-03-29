
var request = require('superagent')
var xml2js = require('xml2js')
var moment = require('moment')

module.exports = function (context, myQueueItem) {
  // consome object from queue
  var input = myQueueItem
  var result = input

  // populate query parameters from queue data
  var url = 'http://xml.flightview.com/fvDemoConsOOOI/fvxml.exe?'
  var a = 'fvxmldemoTerr1'
  var b = 'Ty$rhRUSS99'
  var acid = result.flight_number
  var depap = result.origin
  var depdate = result.departure

  context.log('acid:', result.flight_number)
  context.log('depap:', result.origin)
  context.log('depdate:', result.departure)

  // call the flightview API
  request
    .get(url)
    .query({ a: a })
    .query({ b: b })
    .query({ acid: acid })
    .query({ depap: depap })
    .query({ depdate: depdate })
    .end(function (err, res) {
      if (err) {
        context.log(err)
        context.done(err)
      }
      var parser = new xml2js.Parser()
      parser.parseString(res.text, function (err, result) {
        if (err) {
          context.log(err)
          context.done(err)
        }

        console.log('result', result)

        try {
          if (result === undefined) {
            // api does not have information on specific flight
            context.log('result is undefined')
            context.done()
          } else if (result.FlightViewResults.Flight === undefined) {
            context.log('result search is empty')
            context.done()
          }

          if (result.FlightViewResults.Flight[0].FlightStatus[0].Cancelled === undefined) {
            context.log('Not Cancelled')
            context.done()
          } else {
            context.log('Cancelled')
            context.done()
          }

          // find scheduledDateTime
          var scheduledDate = result.FlightViewResults.Flight[0].Departure[0].DateTime[0].Date[0].$.utc
          var scheduledTime = result.FlightViewResults.Flight[0].Departure[0].DateTime[0].Time[0].$.utc
          var scheduledDateTime = scheduledDate + ' ' + scheduledTime
          context.log('scheduledDateTime:', scheduledDateTime)

          // find actualDateTime if available
          var actualDateTime = ''
          if (result.FlightViewResults.Flight[0].Departure[0].DateTime.length > 1) {
            var actualDate = result.FlightViewResults.Flight[0].Departure[0].DateTime[1].Date[0].$.utc
            var actualTime = result.FlightViewResults.Flight[0].Departure[0].DateTime[1].Time[0].$.utc
            actualDateTime = actualDate + ' ' + actualTime
            context.log('actualDateTime:', actualDateTime)
          } else {
            actualDateTime = undefined
          }

          // check if (actualTime - scheduledTime) < 3 hrs
          var isRefund = true
          if (actualDateTime === undefined) {
            // flag and move to DB
            context.bindings.outputDocument = JSON.stringify({
              flight_number: acid,
              departure: depdate,
              booking_id: result.booking_id,
              xml: result
            })

            context.log('actualDateTime:', actualDateTime)
            context.log('isRefund:', isRefund)
            context.done()
          } else {
            var ms = moment(actualDateTime, 'YYYY-MM-DD HH:mm:ss').diff(moment(scheduledDateTime, 'YYYY-MM-DD HH:mm:ss'))
            var diff = moment.duration(ms).asHours()
            if (diff > 3) {
              // actual and scheduled is greater than (3) hour difference
              // flag and move to DB
              context.bindings.outputDocument = JSON.stringify({
                flight_number: acid,
                departure: depdate,
                booking_id: result.booking_id,
                xml: result
              })

              context.log('diff:', diff)
              context.log('isRefund:', isRefund)
              context.done()
            } else {
              // we have both scheduled and actual departure and difference is within (3) hours
              isRefund = false
              context.log('diff:', diff)
              context.log('isRefund:', isRefund)
              context.done()
            }
          }
        } catch (err) {
          context.log(err)
          context.done(err)
        }
      })
    })
}
