(async() => {
    if(process.argv[2] == "setup") {
        setup()
    } else if(process.argv[2] == "destroy") {
        destroy()
    } else if(process.argv[2] == "info") {
        info()
    }
})()

async function info() {
    // Grab the service SID
    const fs = require('fs');
    const config = JSON.parse(fs.readFileSync('.twilio-functions'));

    // Grab the domain name
    let r = await execCmd("twilio api:serverless:v1:services:environments:list --service-sid "+
                        config.serviceSid+" -o json")
    const envInfo = JSON.parse(r.stdout)

    console.log("URL: https://"+envInfo[0].domainName+"/index.html")
    r = await execCmd("twilio api:serverless:v1:services:environments:variables:list"+
                      " --service-sid "+config.serviceSid+
                      " --environment-sid "+envInfo[0].sid+
                      " -o json")
    const secret = JSON.parse(r.stdout).find( (element) => { return element.key == "SECRET" }).value
    console.log("Secret: "+secret)
}

async function destroy() {

    const fs = require('fs');
    const destroy = JSON.parse(fs.readFileSync('.twilio-destroy'));
    for(let i=destroy.length-1;i>=0;i--) {
        console.log(destroy[i])
        let r = await execCmd(destroy[i])
        console.log(r.stdout)
    }
    await execCmd("rm .twilio-functions .twilio-destroy")
}

async function setup() {
    let destroy = []
    const fs = require('fs');
    const phoneNumber = requiredEnvVar("PHONE_NUMBER")
    const sipDomain = requiredEnvVar("SIP_DOMAIN")
    const sourceIP = requiredEnvVar("SOURCE_IP_ADDRESS")

    try {
        // Deploy functions and assets
        console.log("Deploying assets and functions..")

        let r = await execCmd("twilio serverless:deploy")
        console.log("Deployed")

        // Grab the service SID
        const config = JSON.parse(fs.readFileSync('.twilio-functions'));

        // Record what we need to do to destroy this resource
        destroy.push("twilio api:serverless:v1:services:remove --sid "+config.serviceSid)

        // Get environment info
        r = await execCmd("twilio api:serverless:v1:services:environments:list --service-sid "+
                            config.serviceSid+" -o json")
        const envInfo = JSON.parse(r.stdout)
        const hostName = envInfo[0].domainName.split('.')[0]

        // This is a little helper thing
        const serviceEnv = newServiceEnv(config.serviceSid,envInfo[0].sid)

        const secret = Math.floor(Math.random() * 1000000);
        const sipUser = Math.random().toString(36).slice(2)
        const sipPassword = Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2).toUpperCase()

        await serviceEnv.setVar("PHONE_NUMBER", phoneNumber)
        await serviceEnv.setVar("SIP_DOMAIN", sipDomain)
        await serviceEnv.setVar("SIP_USER", sipUser)
        await serviceEnv.setVar("SIP_PASSWORD", sipPassword)
        await serviceEnv.setVar("SECRET", secret)

        // Create a TwiML Application with Voice callback pointing to the client-call function
        r = await execCmd("twilio api:core:applications:create"+
                        " --friendly-name app-"+config.serviceSid+
                        " --voice-url https://"+envInfo[0].domainName+"/client-call -o json")
        
        const appSid = JSON.parse(r.stdout)[0].sid
        console.log("Created TwiML app named app-"+config.serviceSid)

        await serviceEnv.setVar("TWIML_APP_SID", appSid)

        destroy.push("twilio api:core:applications:remove --sid "+appSid)

        // Create an IP access control list
        r = await execCmd("twilio api:core:sip:ip-access-control-lists:create "+
                        " --friendly-name cl-"+config.serviceSid+
                        " -o json")

        const aclSid = JSON.parse(r.stdout)[0].sid
        destroy.push("twilio api:core:sip:ip-access-control-lists:remove --sid "+aclSid)
        
        // Add source IP address to access control list
        r = await execCmd("twilio api:core:sip:ip-access-control-lists:ip-addresses:create "+
                        " --ip-address "+sourceIP+
                        " --ip-access-control-list-sid "+aclSid+
                        " --friendly-name ip-"+config.serviceSid+
                        " -o json")
        const ipSid = JSON.parse(r.stdout)[0].sid

        destroy.push("twilio api:core:sip:ip-access-control-lists:ip-addresses:remove "+
                    " --sid "+ipSid+" --ip-access-control-list-sid "+aclSid)

        // Create a SIP Domain
        r = await execCmd("twilio api:core:sip:domains:create --domain-name "+hostName+".sip.twilio.com"+
                        " --friendly-name domain-"+config.serviceSid+
                        " --voice-url https://"+envInfo[0].domainName+"/sip-domain"+
                        " -o json")
        const domainSid = JSON.parse(r.stdout)[0].sid
        const sipDomainName = JSON.parse(r.stdout)[0].domainName

        destroy.push("twilio api:core:sip:domains:remove --sid "+domainSid)

        // Add access control list to SIP Domain
        r = await execCmd("twilio api:core:sip:domains:ip-access-control-list-mappings:create "+
                            " --ip-access-control-list-sid "+aclSid+
                            " --domain-sid "+domainSid+
                            " -o json")

        const aclmSid = JSON.parse(r.stdout)[0].sid

        destroy.push("twilio api:core:sip:domains:ip-access-control-list-mappings:remove "+
                " --sid "+aclmSid+
                " --domain-sid "+domainSid)

        
        console.log("Set up your carrier's outbound SIP configuration with the following username and password:")
        console.log("SIP username: "+sipUser)
        console.log("SIP password: "+sipPassword)
        console.log("")
        console.log("Set up your carrier to forward inbound calls to:")
        console.log("Twilio SIP Domain: "+sipDomainName+".sip.twilio.com")
        console.log("Only calls from "+sourceIP+" will be allowed")
        console.log("")
        console.log("Open the VoIP phone at https://"+envInfo[0].domainName+"/index.html")
        console.log("Type the following secret code into the password field on the page: "+secret)
    }
    catch(error) {
        console.log("Error: "+error)
    }
    finally {
        fs.writeFileSync('.twilio-destroy', JSON.stringify(destroy));
    }
}


async function execCmd(cmd) {
    const exec = require('child_process').exec;
    return new Promise((resolve, reject) => {
     exec(cmd, (code, stdout, stderr) => {
      if (code) {
       console.warn(code);
      }
      resolve({code: code, stdout: stdout, stderr: stderr});
     });
    });
}

function ifSet(value) {
    return { 
        else: function(alt) {
            if(value) {
                return value
            } else {
                return alt
            }
        }
    }
}

function requiredEnvVar(envVar) {    
    if(!process.env[envVar]) {
        console.log("Missing required environment variable "+envVar)
        process.exit(1)
    } else {
        return process.env[envVar]
    }
}

function newServiceEnv(serviceSid, envSid) {
    return {
        setVar: async function(name, value) {
            r = await execCmd("twilio api:serverless:v1:services:environments:variables:create"+
            " --service-sid "+serviceSid+
            " --environment-sid "+envSid+
            " --key "+name+" --value "+value)
        }
    }
}