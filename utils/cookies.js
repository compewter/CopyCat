//updates cookies in the provided cookie jar and given domain
module.exports.setCookies = function(jar, domain, newCookies=[]) {
  if(newCookies.length === 0){
    return
  }

  //create a new object store if one doesn't exist
  jar[domain] = jar[domain] || {}
  //store the new cookies in this domain's object store
  newCookies.forEach((cookie)=>{
    var cookieName = cookie.split('=')[0]
    if(cookie.split('=')[1].indexOf('deleted;') === 0){
      delete jar[domain][cookieName]
    }else{
      jar[domain][cookieName] = cookie.substring(cookie.indexOf('=')+1, cookie.indexOf(';'))
    }
  })
}

//converts cookie jar to cookie header string
module.exports.cookiesToHeaderStr = function(cookies){
  return Object.keys(cookies).reduce((pv, cookieName)=>{
    //prevents sending session cookie to destination server
    if(cookieName === process.env.SESS_COOKIE){
      return pv
    }
    return pv + cookieName + '=' + cookies[cookieName] + '; '
  },'')
}

module.exports.addSessionCookie = function(setCookieHeader=[], sessionCookie, domain){
  let parsedDomain = ~domain.indexOf('www.') ? domain.slice(domain.indexOf('www.')+3) : '.'+domain
  //update session cookie
  setCookieHeader.push(process.env.SESS_COOKIE+'='+sessionCookie+'; expires=Fri, 01-Jan-2038 00:00:00 GMT; path=/; domain='+parsedDomain+';')
}