exports.handler = function(context, event, callback) {
    let twiml = new Twilio.twiml.VoiceResponse();
    // outbound dial from browser
    twiml.dial({callerId: context.PHONE_NUMBER}).sip(
      { username: context.SIP_USER, password: context.SIP_PASSWORD }, 
      "sip:"+event.To+"@"+context.SIP_DOMAIN)
    callback(null, twiml);
};
