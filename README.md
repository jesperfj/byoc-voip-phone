# A VoIP phone in your browser

This app allows you to make and receive phone calls in your browser. It has been tested with Chrome only. It is a variant of https://github.com/jesperfj/twilio-voip-phone which uses Twilio's builtin PSTN. In this version, you configure your own Telephony provider with a set of SIP parameters.

## Prerequisites

* Sign up for a [Twilio account](https://twilio.com/)
* Install [Twilio CLI](https://www.twilio.com/docs/twilio-cli/quickstart)
* Install Twilio Serverless CLI plugin: `twilio plugins:install @twilio-labs/plugin-serverless`
* Log in with `twilio profiles:add` and follow instructions

## Setup

### Setting up a telephony provider

You will need to do the following on your telephony provider:

* Buy a phone number
* Find out which SIP domain name to use, e.g. sip.yourprovider.com.
* Find out which source IP address your provider uses when making SIP requests

### Setting up your app

Provide the information above in a set of environment variables before you run the setup script:

    export PHONE_NUMBER=<phone-number>
    export SIP_DOMAIN=<your-providers-sip-domain>
    export SOURCE_IP_ADDRESS=<provider-source-ip>

Now run:

    npm run setup

### Finish setting up your telephony provider

Your telephony provider needs to know which SIP domain to use to pass incoming calls to your VoIP phone. This is the SIP domain printed by the setup script. Put that in your provider configuration for handling incoming calls.

When Twilio makes SIP requests to your provider, Twilio will authenticate with the username and password printed by the setup script. Copy the username and password into your provider configuration for handling outgoing calls.

### Trying it out

You can now open your browser on the URL printed by the script and "log in" with the numeric code printed.

## Clean up

You can get rid of everything by running:

    npm run destroy

You will also want to go to your telephony provider to remove any configuration and release the phone nunmber to avoid ongoing charges.

## Telephony Providers

This app has been verified to work with Telnyx. A FQDN connection was used for inbound and a "Credentials" connection was used for outbound (two separate connections). 
