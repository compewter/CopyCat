/*
  Hijacks any urls in the source according to the url prefix map:
    "http://" + process.env.HTTP + ".original_url"   -> http://original_url
    "http://" + process.env.HTTPS + ".original_url"  -> https://original_url
    "http://" + process.env.HTTPW + ".original_url"  -> http://www.original_url
    "http://" + process.env.HTTPSW + ".original_url" -> https://www.original_url
*/
module.exports.hijackUrls = function(source, secure){
  
  source = source.replace(/(url\(|\=)('|")?\/\/[^\s/$.?#].[^\s;,")]*/g, (replacement)=>{
    if(~replacement.indexOf('//www.')){
      return replacement.slice(0, replacement.indexOf('//')) + (secure ? 'http://'+process.env.HTTPSW+'.' : 'http://'+process.env.HTTPW+'.') + replacement.slice(replacement.indexOf('//www.') + 6)
    }else{
      return replacement.slice(0, replacement.indexOf('//')) + (secure ? 'http://'+process.env.HTTPS+'.' : 'http://'+process.env.HTTP+'.') + replacement.slice(replacement.indexOf('//') + 2)
    }
  })

  source = source.replace(/(https?|ftp):\/\/[^\s/$.?#].[^\s;,")]*/g, convertUrlToSpoofed)
  
  return source
}

//Converts url to corresponding spoofed subdomain
var convertUrlToSpoofed = module.exports.convertUrlToSpoofed = function(url){
  if(url.indexOf('https://') === 0 && isHTTPSofSpoofedDomain(url)){
    return url.replace('https://', 'http://')
  }else if(containsSpoofedDomain(url)){
    return url
  }else{
    return url.replace(/https?\:\/\/(www\.)?/, (prefix)=>{
      return 'http://' + prefixToSpoofedDomain[prefix] + '.'
    })
  }
}

//Converts spoofed url to corresponding real url
var convertSpoofedToUrl = module.exports.convertSpoofedToUrl = function(url){
  var convertedUrl = url.replace('http://', '')

  spoofedDomains.some((domain)=>{
    convertedUrl = convertedUrl.replace(domain+'.', spoofedDomainToPrefix[domain])
  })

  return convertedUrl
}

//returns true if argument contains spoofed domain
var containsSpoofedDomain = module.exports.containsSpoofedDomain = function(url){
  return spoofedDomains.some((subdomain)=>{
    return url.indexOf(subdomain) === 0 || url.indexOf('http://'+subdomain) === 0
  })
}

//returns true if argument is an https version of a spoofed domain
var isHTTPSofSpoofedDomain = module.exports.isHTTPSofSpoofedDomain = function(url){
  return spoofedDomains.some((subdomain)=>{
    return url.indexOf('https://'+subdomain) === 0
  })
}

/*
  The following map environment variables of subdomains to useful variations of objects with those values
*/
var spoofedDomains = module.exports.spoofedDomains = [process.env.HTTP, process.env.HTTPS, process.env.HTTPW, process.env.HTTPSW]

var spoofedDomainToPrefix = module.exports.spoofedDomainToPrefix = {
  [process.env.HTTP]: 'http://',
  [process.env.HTTPS]: 'https://',
  [process.env.HTTPW]: 'http://www.',
  [process.env.HTTPSW]: 'https://www.'
}

var prefixToSpoofedDomain = module.exports.prefixToSpoofedDomain = {
  'http://': process.env.HTTP,
  'https://': process.env.HTTPS,
  'http://www.': process.env.HTTPW,
  'https://www.': process.env.HTTPSW
}