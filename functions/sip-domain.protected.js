exports.handler = function(context, event, callback) {
    let twiml = new Twilio.twiml.VoiceResponse();
    // Incoming call on SIP domain
    twiml.dial({callerId: event.From, action: "client-voice-dial-action" }).client({}, "the_user_id")
    callback(null, twiml);
};
