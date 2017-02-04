#CopyCat

CopyCat is a Node.js based universal MITM web server. Used with DNS spoofing or another redirect attack, this server will act as a MITM for web traffic between the victim and a real server.

Most often we see DNS spoofing used to redirect victims to an attackers server hosting a static clone of the spoofed domain's login page. But this server will forward all traffic between the victim and the spoofed domain allowing an attacker to sit in as the MITM while the victim interacts with the real domain. This also allows the attacker to inject scripts and manipulate the victim's interactions with the intended web server.

All urls are hijacked inside the HTML response from the server causing all traffic to be rerouted back through the server (provided you have a redirect attack for those domains as well).

This is currently only configured to work with fake subdomains of real domains. If the server you are trying to spoof uses HSTS with the includeSubdomains argument the victim's browser will attempt to upgrade to HTTPS. The option to allow spoofing domains without using a subdomain will be released at a later time.

### Configuration

After cloning or downloading this repo, look at the .env file in the root directory. This is where you set the subdomains to their corresponding real prefixes. The default prefix map is:

```
{
  'http://': 'us-west-1',
  'https://': 'us-west-2',
  'http://www.': 'us-west-3',
  'https://www.': 'us-west-4'
}
```
Example url translations:  
https://facebook.com -> http://us-west-2.facebook.com  
https://www.google.com -> http://us-west-4.google.com  


### Installation

Requires [Node.js](https://nodejs.org/) v6+ to run.

```sh
$ cd /path/to/repo
$ npm install
$ sudo node server.js
```

### What's Happening?
The attacker directs the victim to the spoofed domain for example http://us-west-4.facebook.com. Using DNS spoofing this request is sent to this server. It recognizes the pattern "us-west-4" means this should be a request to https://www.facebook.com. A session is either generated or looked up and associated with the request. The server makes a request to that domain. When a response is received, it hijacks any urls in the HTML to be their spoofed counterpart to ensure those requests are sent back through this server. Any cookies from the real domain are attached to the victims session to be used with future requests. Security headers are modified or deleted to allow content to render properly. A script is injected into the HTML before responding. This client side script (public/hijacks.js) overwrites the native [XMLHttpRequest.open](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/open) method to hijack the requested url. It also traverses the DOM looking for elements which request content and hijacks their urls in case they were added client side or slipped past the server side url hijaking function. The end result being a functioning version of the spoofed domain.

### What can I do with it?
This is nothing more than a functioning platform for being a MITM with web requests. The potential to use this with other attacks is there. You completely own this domain and can run whatever arbitrary scripts you'd like, or even inject a [BeEF](http://beefproject.com/). If they're going through this server you have complete control of the victim's experience.

### What's Next?
Stay tuned for updates to [VeAL](https://github.com/compewter/veal). Once that platform is there to manage victim sessions, you will be able to view and manipulate victim's sessions with ease.
I'm working on a prototype of a remote viewing attack. This will mirror all mouse movements, keystrokes, and DOM elements from the victims allowing you to remotely watch the session as its happening as a sort of terrifying surveillance tool. This of course wouldn't be limited to this MITM server so it wont be found here.  
In addition to viewing live, I don't see why you couldn't record a session to be viewed later.
