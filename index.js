const fs = require('fs');
const path = require('path');
const express = require('express');
const sys = require('util')
const exec = require('child_process').exec;
const app = express();
const localoctet = '213';
const https = require('https');
const jsdom = require("jsdom");
const cheerio = require('cheerio')
const node_ssh = require('node-ssh')
const ssh = new node_ssh()
const ping = require('ping');
const simpleParser = require('mailparser').simpleParser;
var request = require("request").defaults({
  rejectUnauthorized: false,
  jar: true
});

// Set details for fortigate and mailwatcher here
let rawdata = fs.readFileSync('settings.json');
let testdata = fs.readFileSync('testfirewalldata.json');
rawdata = JSON.parse(rawdata);
let port = rawdata.port
let fgip = rawdata.fgip
let fguser = rawdata.fguser
let fgpass = rawdata.fgpass
let mailurl = rawdata.mailurl // including https:// git ieg "https://mailscanner.emea.gl3/"
let mailuser = rawdata.mailuser
let mailpass = rawdata.mailpass
let localmailip = rawdata.localmailip
let localmailuser = rawdata.localmailuser
let localmailpass = rawdata.localmailpass

let staticPath = path.join(__dirname, '/public')
app.use(express.static(staticPath))
let baseurl = "https://mailscanner.emea.gl3/"
let retmails = []
let pagesparsed = 0
let expectedpages = 0
let routerpolicy
let firewallpolicy
let interfaces = []
/**
 * set bash commands
 * @type {Object}
 */

let networks = {
  "QNET": {
    "name": "QNET",
    "networks": [{
        "name": "VPN",
        "firewallpolicy": 25,
        "gatewaypolicy": 7
      },
      {
        "name": "WAN-VSAT-KU",
        "firewallpolicy": 26,
        "gatewaypolicy": 8
      },
      {
        "name": "WAN-VSAT-FX",
        "firewallpolicy": 41,
        "gatewaypolicy": 22
      },
      {
        "name": "WAN-3G",
        "firewallpolicy": 28,
        "gatewaypolicy": 10
      },
      {
        "name": "WAN-WIFI",
        "firewallpolicy": 29,
        "gatewaypolicy": 20
      },
      {
        "name": "WAN-4G",
        "firewallpolicy": 24,
        "gatewaypolicy": 6
      },
      {
        "name": "WAN-FBB",
        "firewallpolicy": 27,
        "gatewaypolicy": 9
      }
    ]
  },
  "MEDIANET": {
    "name": "MEDIANET",
    "networks": [{
        "name": "VPN",
        "firewallpolicy": 52,
        "gatewaypolicy": 25
      },
      {
        "name": "WAN-VSAT-KU",
        "firewallpolicy": 53,
        "gatewaypolicy": 29,
        "wan-gw": "192.168.10.10"
      },
      {
        "name": "WAN-VSAT-FX",
        "firewallpolicy": 57,
        "gatewaypolicy": 24,
        "wan-gw": "172.25.214.10"
      },
      {
        "name": "WAN-3G",
        "firewallpolicy": 55,
        "gatewaypolicy": 27,
        "wan-gw": "172.23.214.10"
      },
      {
        "name": "WAN-WIFI",
        "firewallpolicy": 56,
        "gatewaypolicy": 28,
        "wan-gw": "172.24.214.10"
      },
      {
        "name": "WAN-4G",
        "firewallpolicy": 51,
        "gatewaypolicy": 23,
        "wan-gw": "172.21.214.10"
      },
      {
        "name": "WAN-FBB",
        "firewallpolicy": 54,
        "gatewaypolicy": 26,
        "wan-gw": "172.22.214.10"
      }
    ]
  },
  "VPN": [
    "WAN-VSAT-KU",
    "WAN-VSAT-FX",
    "WAN-3G",
    "WAN-WIFI",
    "WAN-4G",
    "WAN-FBB"
  ],
  "pingtests": {
    "WAN-VSAT-KU": {
      "ip": "192.168.10.10",
      "ping": 0
    },
    "WAN-VSAT-FX": {
      "ip": "172.25.214.10",
      "ping": 0
    },
    "WAN-3G": {
      "ip": "172.23.214.10",
      "ping": 0
    },
    "WAN-WIFI": {
      "ip": "172.24.214.10",
      "ping": 0
    },
    "WAN-4G": {
      "ip": "172.21.214.10",
      "ping": 0
    },
    "WAN-FBB": {
      "ip": "172.22.214.10",
      "ping": 0
    }

  }
}

/**
 * runs a command put directly into the url bar
 * for testing only comment out by default
 * @param  {object} req URL Request
 * @param  {object} res Result object
 * @return {string}     String
 */
// app.get('/runbash', function(req, res) {
//   console.log(req.query.command)
//   dir = exec(req.query.command, function(err, stdout, stderr) {
//     if (stderr) {
//       console.log(stderr)
//       res.send(stderr)
//     } else {
//       console.log(stdout)
//       res.send(stdout)
//     }
//   });
// })

/**
 * [get netork firewall and routing configuration]
 * @param  {object} req request object
 * @param  {object} res result object
 * @return {object}     object with network policy references
 */
 getInterfaces()
 function getInterfaces(){
   dir = exec("/usr/sbin/ip route", function(err, stdout, stderr) {
     if (err) {
       console.log(err)
       return err
     }
     if (stderr) {
       console.log(stderr)
       return stderr
     }
     var lines = stdout.split(/\r\n|\r|\n/)
     for(var j = 0 ; j < lines.length ; j++){
       if(!lines[j].includes("default")){
         let r = {}
         r.nw = lines[j].split(" ")[0]
         r.if = lines[j].split(" ")[2]
         r.sr = lines[j].split(" ")[8]
         r.tm = lines[j].split(" ")[0].replace(".0/24","")
         interfaces.push(r)
         for(key in networks.pingtests){
           if(networks.pingtests[key].ip.includes(r.tm) && r.sr != undefined){
             //console.log("found "+r.sr+" matches "+networks.pingtests[key].ip)
             networks.pingtests[key].src=r.sr
           }
         }
       }
     }
     //console.log("INTERFACES: "+JSON.stringify(interfaces))
   });
 }
//refreshpings()
//For testship : ping -S 172.20.214.4 8.8.8.8 pushes ping to use VSAT interface in testship which has a 700ms limiter on it u[p and down (1400ms total)
async function refreshpings() {
  fs.readFileSync('settings.json');
  let pingnets = networks.pingtests;
  for (key in pingnets) {
    await pings(key, pingnets[key], '8.8.8.8').then(function(response) {

    }, function(error) {
      console.error("Failed!", error);
    })
  }
  setTimeout(function() {
    refreshpings()
  }, 10000)
}
//pings("192.168.43.22")
async function pings(name, interface, target) {
  dir = await exec("ping -c 3 -S "+ interface +" "+target, function(err, stdout, stderr) {
    if (err) {
      console.log(err)
      return err
    }
    if (stderr) {
      console.log(stderr)
      return stderr
    }
    var lines = stdout.split(/\r\n|\r|\n/)
    var res = parseFloat(lines[7].split(" = ")[1].replace("ms", "").split("\/")[1])
    //console.log(lines[7] + " : " +res)
    return res
  });
}

function pingkypromise(name, gateway, toping) {
  return new Promise(function(resolve, reject) {
    ssh.connect({
      host: fgip,
      username: fguser,
      password: fgpass
    }).then(function() {
      console.log("logged into fortigate to check " + name + " ping")
      ssh.execCommand('exe ping-options source ' + gateway.ip).then(function(result) {
        ssh.execCommand('exe ping-options timeout 5').then(function(result) {
          ssh.execCommand('exe ping ' + toping).then(function(resulti) {
            var lines = resulti.stdout.split(/\r\n|\r|\n/)
            var res = parseFloat(lines[9].split(" = ")[1].replace("ms", "").split("\/")[1])
            console.log(name + " : " + res)
            networks.pingtests[name].ping = name + ":" + resulti.stdout.replace("router-myts # ", "").replace("router-myts # ", "").replace("WAN-", "").trim();
            resolve(res)
          }).catch((error) => {
            networks.pingtests[name].ping = -1
            reject(name + " : 1unreachable")
          })
        }).catch((error) => {
          networks.pingtests[name].ping = -1
          reject(name + " : 2unreachable")
        })
      }).catch((error) => {
        networks.pingtests[name].ping = -1
        reject(name + " : 3unreachable")
      })
    }).catch((error) => {
      networks.pingtests[name].ping = -1
      reject(name + " : 4unreachable")
    })
  })
}
app.get('/getping', function(req, res) {
  res.send(networks)
})
app.get('/networks', function(req, res) {
  getInterfaces()
  res.send(networks)
})

app.get('/syncdrive', function(req, res) {
  res.send()
})
app.get('/syncdhcp', function(req, res) {
  let dhcpsynccommand = `\#\!/bin/\#\!/usr/bin/env bash
NR=1
while IFS='' read -r line || [[ -n "$line" ]]; do
    stringarray=($line)
    echo $stringarray
    echo edit $NR
    echo set ip \${stringarray[1]}
    echo set mac \${stringarray[0]}
    stringarray=("\${stringarray[@]:2}")
    echo set description "\${stringarray[*]}"
    echo next
    ((NR++))
done < "$1"
`
  res.send()
})
app.get('/syncwifipasswords', function(req, res) {
  let wifisynccommand = `\#\!/bin/bash
echo fortigate user and group add list
while IFS='' read -r line || [[ -n "$line" ]]; do
    stringarray=($line)
    echo config user local
    echo edit \${stringarray[0]}
    echo set type password
    echo set passwd \${stringarray[1]}
    echo end
    echo config user group
    echo edit MYTS_QNET
    echo append member \${stringarray[0]}
    echo next
    echo end
    echo ""
done < "$1"
`
  res.send()
})
app.get('/changevpn', function(req, res) {

})
app.get('/getcams', function(req, res) {
  console.log("rawdata.cam[0]: " + rawdata.cam)
  res.send(rawdata.cam[0])
})
app.get('/syncwebcam', function(req, res) {
  let scpcommand = `scp ` + source + ` ` + dst
  // get()
  res.send()
})
/**
 * [return firewall policy]
 * @param  {object} req URL Request
 * @param  {object} res Result object
 * @return {string}     String
 */
app.get('/fw', function(req,res){
  execdir = exec("ssh admin@192.168.214.254 'show route policy'", function(err, stdout, stderr) {
    if(err){
      res.send(err)
    }
    if(stderr){
      res.send(stderr)
    }
    if(stdout){
      res.send(stdout)
    }
  })
})
app.get('/getfirewallpolicy', function(req, res) {
  console.log("connecting to " + fgip + " as " + fguser)
  ssh.connect({
    host: fgip,
    username: fguser,
    password: fgpass
  }).then(function() {
    console.log("successfully connected to fg. getting current configuration.")
    ssh.execCommand('show firewall policy').then(function(result) {
      console.log("show firewall policy : "+JSON.stringify(result))
      let toret = extractPolicy(result.stdout)
      firewallpolicy = toret
      if (result.stderr)
        console.log('STDERR: ' + result.stderr)
      res.send(toret)
    }).catch((error) => {
      console.log("Error running show firewall policy: " + error)
      res.send("Error running show firewall policy: " + error)
    })
  }).catch((error) => {
    console.log("Error connecting to fortigate")
    res.send("Error running show router policy")
  })
})

app.get('/getinterfaces', function(req, res) {
  console.log("connecting to " + fgip + " as " + fguser)
  ssh.connect({
    host: fgip,
    username: fguser,
    password: fgpass
  }).then(function() {
    console.log("successfully connected to fg. getting current configuration.")
    ssh.execCommand('show system interface').then(function(result) {
      let toret = extractPolicy(result.stdout)
      console.log(toret)
      if (result.stderr)
        console.log('STDERR: ' + result.stderr)
      res.send(toret)
    }).catch((error) => {
      console.log("Error running show firewall policy: " + error)
      res.send("Error running show firewall policy: " + error)
    })
  }).catch((error) => {
    console.log("Error connecting to fortigate")
    res.send("Error running show router policy")
  })
})

/**
 * [return router policy]
 * @param  {object} req request object
 * @param  {object} res result object
 * @return {string}     String
 */
app.get('/getrouterpolicy', function(req, res) {
  console.log("connecting to " + fgip + " as " + fguser)
  ssh.connect({
    host: fgip,
    username: fguser,
    password: fgpass
  }).then(function() {
    ssh.execCommand('show router policy').then(function(result) {
      let toret = extractPolicy(result.stdout)
      routerpolicy = toret
      if (result.stderr)
        console.log('STDERR: ' + result.stderr)
      res.send(toret)
    }).catch((error) => {
      console.log("Error running show router policy: " + error)
      res.send("Error running show router policy: " + error)
    })
  }).catch((error) => {
    console.log("Error connecting to fortigate " + error)
    res.send("Error connecting to fortigate " + error)
  })
})

app.get('/set', function(req, res) {
  let nw = networks[req.query.network]
  console.log(nw)
  let gw = req.query.gateway
  changeNetworkToGateway(nw, gw)
  res.send("config pushed")
})
/**
 * [list quarantined mails]
 * @param  {object} req [request object]
 * @param  {object} res [result object]
 * @return {object}     [object]
 */
app.get('/refreshmail', function(req, res) {
  var username = mailuser;
  var password = mailpass;
  var auth = 'Basic ' + Buffer.from(username + ':' + password).toString('base64');

  request({
    url: mailurl + '/checklogin.php',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': auth
    }
  }, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log("successfully connected to mailwatcher : " + response.statusCode)
      //console.log(body);
      request({
        url: mailurl + '/quarantine.php'
      }, function(error, response, body) {
        expectedpages = 0
        const $ = cheerio.load(body)
        let dateslist = []
        let nummails = 0
        $("table.mail").children().last().children().each(function(i, e) {
          if (i != 0 && $(this).children().length > 0) {
            let row = {}
            row.url = [$($($(this).children()[0]).children()[0]).attr('href')]
            row.date = $($(this).children()[0]).text().trim()
            row.items = $($(this).children()[1]).text().trim()
            nummails += parseInt(row.items.replace("items").trim())
            pagestoload = parseInt(row.items.replace("items").trim())
            toadd = Math.floor(pagestoload / 50)
            if (pagestoload % 50 > 0) {
              toadd++
            }
            expectedpages += toadd
            if (toadd > 0) {
              for (var toaddpages = 0; toaddpages < toadd; toaddpages++) {
                row.url.push(row.url[0] + "&pageID=" + (toaddpages + 2))
              }
            }
            //console.log("found another " + toadd + " pages to load. total : " + pagestoload)
            //console.log($(this).html())
            dateslist.push(row);
          }
        })
        console.log("we need to load " + expectedpages + " pages containing " + nummails + " mails")
        //replace from here with calls to every url in the dateslist
        retmails = []
        for (var j = 0; j < dateslist.length; j++) {
          for (var q = 0; q < dateslist[j].url.length; q++) {
            //console.log(dateslist[j].url)
            request({
              url: baseurl + "/" + dateslist[j].url
            }, function(error, response, body) {
              if (error) {
                console.log("err : " + error)
              } else {
                parseQuarantinePage(body)
              }

            })
          }
        }
        returnobject = {
          "status": "refreshed",
          "nummails": nummails
        }
        res.send(returnobject)
      })
    }
  });
})

app.get('/getmails', function(req, res) {
  res.send(retmails)
})

//legacy CnC
// Mail sync Manual
app.get('/manualMailSync', async function(req, res) {
  await doMailCommand("sh /gp/scripts/admin/do_sync.sh").then(function(qwe) {
    res.send(qwe)
  })
})
// All in one-er. Why is this here?!
app.get('/genAutosyncCron', async function(req, res) {
  await doMailCommand("touch /etc/cron.d/autosync && echo '*/5 * * * * root /gp/scripts/aft/aft-client.sh ship2shore-email > /dev/null' >> /etc/cron.d/autosync && echo '*/1 * * * * root /gp/scripts/aft/aft-client.sh webcam-uploader > /dev/null' >> /etc/cron.d/autosync && echo '30 2 * * * root  python /gp/scripts/admin/sync-noonreports.py >> /var/log/noonsync.log' >> /etc/cron.d/autosync").then(function(qwe) {
    res.send(qwe)
  })
})
app.get('/remAutosyncCron', async function(req, res) {
  await doMailCommand("rm -f /etc/cron.d/autosync").then(function(qwe) {
    res.send(qwe)
  })
})
app.get('/isAutosyncCronSet', async function(req, res) {
  await doMailCommand('if [ -f /etc/cron.d/autosync ]; then echo "true"; else echo "false"; fi').then(function(qwe) {
    res.send(qwe)
  })
})

// Mail sync management
app.get('/manualSync', async function(req, res) {
  await doMailCommand("sh /gp/scripts/admin/do_sync.sh").then(function(qwe) {
    res.send(qwe)
  })
})
app.get('/genMailCron', async function(req, res) {
  await doMailCommand("touch /etc/cron.d/mailsync && echo '*/5 * * * * root /gp/scripts/aft/aft-client.sh ship2shore-email > /dev/null' >> /etc/cron.d/mailsync").then(function(qwe) {
    res.send(qwe)
  })
})
app.get('/remMailCron', async function(req, res) {
  await doMailCommand("rm -f /etc/cron.d/mailsync").then(function(qwe) {
    res.send(qwe)
  })
})
app.get('/isMailCronSet', async function(req, res) {
  await doMailCommand('if [ -f /etc/cron.d/mailsync ]; then echo "true"; else echo "false"; fi').then(function(qwe) {
    res.send(qwe)
  })
})

// Webcam sync management
app.get('/genWebcamCron', async function(req, res) {
  await doMailCommand("touch /etc/cron.d/webcamsync && echo '*/1 * * * * root /gp/scripts/aft/aft-client.sh webcam-uploader > /dev/null' >> /etc/cron.d/webcamsync").then(function(qwe) {
    res.send(qwe)
  })
})
app.get('/remWebcamCron', async function(req, res) {
  await doMailCommand("rm -f /etc/cron.d/webcamsync").then(function(qwe) {
    res.send(qwe)
  })
})
app.get('/isWebcamCronSet', async function(req, res) {
  await doMailCommand('if [ -f /etc/cron.d/webcamsync ]; then echo "true"; else echo "false"; fi').then(function(qwe) {
    res.send(qwe)
  })
})

// Noon report sync management
app.get('/genNoonsyncCron', async function(req, res) {
  await doMailCommand("touch /etc/cron.d/noonsync && echo '30 2 * * * root  python /gp/scripts/admin/sync-noonreports.py >> /var/log/noonsync.log' >> /etc/cron.d/noonsync").then(function(qwe) {
    res.send(qwe)
  })
})
app.get('/remNoonsyncCron', async function(req, res) {
  await doMailCommand("rm -f /etc/cron.d/noonsync").then(function(qwe) {
    res.send(qwe)
  })
})
app.get('/isNoonsyncCronSet', async function(req, res) {
  await doMailCommand('if [ -f /etc/cron.d/noonsync ]; then echo "true"; else echo "false"; fi').then(function(qwe) {
    res.send(qwe)
  })
})

// Get all syncs
app.get('/getSyncs', async function(req, res) {
  await doMailCommand('ls /etc/cron.d/').then(function(qwe) {
    res.send(qwe)
  })
})

// get Mail queues
app.get('/getQueued', async function(req, res) {
  await doMailCommand(`ls -Alh /mail/xsmtp/messages/| awk '{if(NR==1){print "FileName, ctime, Size, Access";}else{print  $9 "," $6 " " $7 " " $8 "," $5 "," $1;}}'`).then(function(qwe) {
    res.send(qwe)
  })
})
app.get('/getFailed', async function(req, res) {
  await doMailCommand(`ls -halt /mail/aft/messages/.failed/| awk '{if(NR==1){print "FileName, ctime, Size, Access";}else{print  $9 "," $6 " " $7 " " $8 "," $5 "," $1;}}'`).then(async function(qwe) {
    res.send(qwe)
  })
})
app.get('/update', function(rew,res){
  dir = exec("cd /root/global-ops-cnc && git pull && forever restartall", function(err, stdout, stderr) {
    if (err) {
      console.log(err)
      return err
    }
    if (stderr) {
      console.log(stderr)
      return stderr
    }
  });
})
app.get('/getFailedMail', async function(req, res) {
  let mailname = req.query.mailname
  await doMailCommand(`cat /mail/aft/messages/.failed/` + mailname).then(async function(qwe) {
    let parsed = await simpleParser(qwe);
    res.send(parsed)

  })
})
app.get('/getQueuedMail', async function(req, res) {
  let mailname = req.query.mailname
  await doMailCommand(`cat /mail/xsmtp/messages/` + mailname).then(async function(qwe) {
    let parsed = await simpleParser(qwe);
    res.send(parsed)

  })
})
// ------ Helper functions

/**
 * doManualSync - Manual Sync for mailserver at 192.168.x.1
 *
 * @return {type}  description
 */
async function doMailCommand(command) {
  return new Promise(resolve => {
    ssh.connect({
      host: localmailip,
      username: localmailuser,
      password: localmailpass
    }).then(function() {
      console.log("Running " + command + " on " + localmailip)
      ssh.execCommand(command).then(function(result) {
        if (result.stderr != '') {
          resolve('Error STDERR: ' + result.stderr)
        }
        resolve(result.stdout)
      }).catch((error) => {
        resolve("Error running: " + command + " || " + error)
      })
    }).catch((error) => {
      resolve("Error connecting to " + localmailip)
    })
  })
}
/**
 * [parseQuarantinePage]
 * @param  {string} body [html string]
 * @return {array}       [array of quarantined mails]
 */
function parseQuarantinePage(body) {
  const $ = cheerio.load(body)
  let nummails = $($($($($($($($($("body").children()[0]).children()[0]).children()[3]).children()[0]).children()[2]).children()[0])).children())
  //nummails = $(".highspam").length
  for (var k = 2; k < nummails.length; k++) {
    let builtmail = {}
    let elements = $(nummails[k]).text().split("\n")
    builtmail.date = elements[2]
    builtmail.from = elements[3]
    builtmail.to = elements[4]
    builtmail.title = elements[5]
    builtmail.size = elements[6]
    builtmail.threat = elements[7]
    builtmail.type = elements[8]

    retmails.push(builtmail)

  }
  //console.log("==============\n" + retmails.length + " : " + $(nummails[2]).text())
}
/**
 * [isWholeNumber]
 * @param  {float}  value [takes in number to check]
 * @return {Boolean}       [return true/false]
 */
function isWholeNumber(value) {
  if (value % 1 === 0) {
    return true
  } else {
    return false
  }
}

/**
 * [extractPolicy : extract policy for either the firewall or router rules and return JSON]
 * @param  {string} rp [string returned from cli call]
 * @return {object}    [policy holding object]
 */
function extractPolicy(rp) {
  var b = rp.match(/[^\r\n]+/g);
  b.shift()
  b.pop()
  let currconfigfound
  let listofconfigs = {}
  for (var i = 0; i < b.length; i++) {
    if (b[i].indexOf("edit") > -1) {
      confignr = b[i].replace("edit", "").replace("\"", "").replace("\"", "").trim()
      listofconfigs[confignr] = {}
      listofconfigs[confignr].nr = confignr.replace("\"", "").replace("\"", "")
      for (j = 1; j < 100; j++) {
        if (b[i + j].indexOf("set comments") > -1) {
          listofconfigs[confignr].comments = b[i + j].replace("set comments", "").replace("\"", "").replace("\"", "").trim()
        } else if (b[i + j].indexOf("set ip") > -1) {
          listofconfigs[confignr].ip = b[i + j].replace("set ip", "").replace("\"", "").replace("\"", "").trim()
        } else if (b[i + j].indexOf("set alias") > -1) {
          listofconfigs[confignr].alias = b[i + j].replace("set alias", "").replace("\"", "").replace("\"", "").trim()
        } else if (b[i + j].indexOf("set status") > -1) {
          listofconfigs[confignr].status = b[i + j].replace("set status", "").replace("\"", "").replace("\"", "").trim()
        } else if (b[i + j].indexOf("set name") > -1) {
          listofconfigs[confignr].name = b[i + j].replace("set name", "").replace("\"", "").replace("\"", "").trim()
        } else if (b[i + j].indexOf("set output-device") > -1) {
          listofconfigs[confignr].outputdevice = b[i + j].replace("set output-device", "").replace("\"", "").replace("\"", "").trim()
        } else if (b[i + j].indexOf("next") > -1) {
          j = 100
        }
      }
      // console.log(((listofconfigs[confignr].status) ? listofconfigs[confignr].status : "enabled") + " - policy " + listofconfigs[confignr].nr + " : " + listofconfigs[confignr].comments)
    }
  }
  //console.log("current policies for QNET: " + JSON.stringify(getRelevantPolicies(listofconfigs, "QNET")))
  return listofconfigs
}

/**
 * [getRelevantPolicies : parse json object of policies and look for a network name in the comments]
 * @param  {object} config      [policy object]
 * @param  {string} networkname [name of network to search for]
 * @return {array}             [returns relevant policies]
 */
function getRelevantPolicies(config, networkname) {
  foundpolicys = []
  Object.keys(config).forEach(function(item) {
    if (config[item].comments.indexOf(networkname) > -1 && config[item].outputdevice != '"lan"') {
      foundpolicys.push(config[item])
    }
  });
  return foundpolicys
}

/**
 * genSsh - Generic SSH Send function
 *
 * @param  {string} ser     server address
 * @param  {string} user    ssh username
 * @param  {string} pass    ssh password
 * @param  {string} command command
 * @return {object}         return value
 */
async function genSsh(ser, user, pass, command) {
  ssh.connect({
    host: ser,
    username: user,
    password: pass
  }).then(function() {
    console.log("Connected to " + ser)
    ssh.execCommand(command).then(function(result) {
      if (result.stderr) {
        console.log('STDERR: ' + result.stderr)
        return result.stderr
      }
      return result
    }).catch((error) => {
      console.log("Error syncing mail: " + error)
      return "Error syncing mail: " + error
    })
  }).catch((error) => {
    console.log("Error connecting to " + ser)
    return "Error connecting to " + ser
  })
}
/**
 * [changeQnetTo : irty static switching function for QNET gateway]
 * @param  {object} network [network object to switch to]
 * @param  {string} gateway [gateway name to switch to]
 * @return {string}         [return complete]
 */
//changeNetworkToGateway(networks.QNET,"WAN-VSAT-FX")
function changeNetworkToGateway(network, gateway) {
  console.log("switching " + network.name + " to gateway " + gateway)
  let availablenetworks = network.networks
  let fwstring = `
config firewall policy`
  let routestring = `
config router policy`
  for (var n = 0; n < availablenetworks.length; n++) {
    if (availablenetworks[n].name == gateway) {
      fwstring += `
    edit ` + availablenetworks[n].firewallpolicy + `
        set status enable
    next`
      routestring += `
    edit ` + availablenetworks[n].gatewaypolicy + `
        set status enable
    next`
    } else {
      fwstring += `
    edit ` + availablenetworks[n].firewallpolicy + `
        set status disable
    next`
      routestring += `
    edit ` + availablenetworks[n].gatewaypolicy + `
        set status disable
    next`
    }
  }
  fwstring += `
end`
  routestring += `
end`
  console.log(fwstring)
  console.log(routestring)
  ssh.connect({
    host: fgip,
    username: fguser,
    password: fgpass
  }).then(function() {
    ssh.execCommand(fwstring).then(function(result) {
      let toret = extractPolicy(result.stdout)
      firewallpolicy = toret
      if (result.stderr)
        console.log('STDERR: ' + result.stderr)
    }).catch((error) => {
      console.log("Error setting firewall policies: " + error)
    })

    ssh.execCommand(routestring).then(function(result) {
      let toret = extractPolicy(result.stdout)
      routerpolicy = toret
      if (result.stderr)
        console.log('STDERR: ' + result.stderr)
    }).catch((error) => {
      console.log("Error running show router policy: " + error)
    })

  }).catch((error) => {
    console.log("Error connecting to fortigate")
    res.send("Error running show router policy")
  })
}
/**
 * [changeVpnTo : dirty static switching function for VPN gateway]
 * @param  {string} gateway [gateway name to switch to]
 * @return {string}      [return complete]
 */
//changeVpnTo(gateway)
function changeVpnTo(gateway) {
  var tosend = `config vpn ipsec phase1-interface
    edit "` + gateway + `"
        set interface "VSAT-FX"
    next
end`
  console.log(tosend)
}



/**
 * pinger - function to ping from sourceip
 *
 * @param  {string} sourceip choose local ip corresponding to required gateway
 * @param  {string} target  choose target to ping
 * @return {string}          description
 */
async function pinger(sourceip, target) {
  let pinger = ping.promise.probe(target, {
    timeout: 5,
    extra: ["-c", "3", "-S", sourceip]
  })

  let result = await pinger
  console.log(result)
  return result
}

/**
 * [start web service]
 * @return {type} [description]
 */
app.listen(port, function() {
  console.log('listening on port ' + port);
});
