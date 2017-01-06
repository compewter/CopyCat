var urlUtils = require('./urls')

//Filters out requests that don't include the spoofed domain
module.exports.filterRequests = function(req, res, next){
  if(!urlUtils.containsSpoofedDomain(req.get('host'))){
    console.log(req.get('host'), 'missing spoofed domain')
    res.status(404)
    res.send('Not Found')
    return
  }
  next()
}

//Determines spoofed url's corresponding real url and stores it on the request object
module.exports.convertSpoofedToOriginalUrl = function(req, res, next){
  req.url = urlUtils.convertSpoofedToUrl(req.get('host')) + req.originalUrl
  next()
}

//Determines the domain of the requested url and stores it on the request object
module.exports.setDomain = function(req, res, next){
  req._domain = urlUtils.convertSpoofedToUrl(req.get('host'))
  req._domain = req._domain.slice(req._domain.indexOf('//')+2)
  next()
}

//Spoofs referer and origin headers
module.exports.purifyHeaders = function(req, res, next){
  if(req._domain){
    if(req.headers.referer){
      req.headers.referer = urlUtils.containsSpoofedDomain(req.headers.referer) ? urlUtils.convertSpoofedToUrl(req.headers.referer) : req.headers.referer
    }
    if(req.headers.origin){
      req.headers.origin = urlUtils.containsSpoofedDomain(req.headers.origin) ? urlUtils.convertSpoofedToUrl(req.headers.origin) : req.headers.origin
    }
  }else{
    console.log('No domain set.', req.method, req.url)
    console.log('Deleting origin and referer')
    delete req.headers.origin
    delete req.headers.referer
  }
  next()
}

//catches anything that fails to generate a response
module.exports.catchAll = function(req, res){
  res.status(404)
  res.send('Not Found')
  console.log('not found', req.url)
}