const crypto = require('crypto')

module.exports = session
let sessionCookie = process.env.SESS_COOKIE

function session(options={}){
  const store = options.store || {}
  return function(req, res, next){
    req.session = req.session || {}
    //if the client is sending a cookie and we have them in the store, then send them the stored version
    if(req.cookies[sessionCookie] && store[req.cookies[sessionCookie]]){
      req.session.cookies = store[req.cookies[sessionCookie]]
      if(!req.session.cookies[req._domain]){
        req.session.update = true
      }
    }else{
      //create a new session for them in the store
      
      //Currently uses a hash of the victim's IP address and user-agent.
      //This is a simplistic solution for this proof of concept
      //If multiple victims are behind the same NAT gateway with the same user-agent their sessions will collide
      //One fix is to run a client side script to get their local IP and update their hash with that
      const hash = crypto.createHash('sha256')
      hash.update(req.ip+'||'+req.headers['user-agent'].replace(/\ /g,'').replace(/\;/g,''))
      const tmpSess = hash.digest('hex')

      store[tmpSess] = store[tmpSess] || {}
      req.session.cookies = store[tmpSess]
      req.cookies[sessionCookie] = tmpSess
      //tells response handler to update this cookie
      req.session.update = true
    }
    next()
  }
}