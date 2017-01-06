var http = require('http')
var express = require('express')
var cookieParser = require('cookie-parser')

var env = require('./.env')
var middlewares = require('./utils/middlewares')
var session = require('./utils/session')()

var app = express()
var server = http.createServer(app)

server.listen(process.env.PORT)
console.log('Listening on', process.env.PORT)

app.use( cookieParser() )
app.use( session )
app.use( express.static(__dirname + '/public') )
app.use( middlewares.filterRequests )
app.use( middlewares.convertSpoofedToOriginalUrl )
app.use( middlewares.setDomain )
app.use( middlewares.purifyHeaders )
app.use( '/', require('./routes')() )
app.use( middlewares.catchAll )