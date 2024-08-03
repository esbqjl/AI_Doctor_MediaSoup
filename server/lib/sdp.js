const { getCodecInfoFromRtpParameters } = require('./utils');
const Logger = require('./Logger');
const logger = new Logger('sdp');
// File to create SDP text from mediasoup RTP Parameters
module.exports.createSdpText = (rtpParameters) => {
  const { video, audio } = rtpParameters;
  
  // Audio codec info
  const audioCodecInfo = getCodecInfoFromRtpParameters('audio', audio.rtpParameters);
  
  return `v=0
  o=- 0 0 IN IP4 10.0.0.124
  s=FFmpeg
  c=IN IP4 10.0.0.124
  t=0 0
  m=audio ${audio.remoteRtpPort} RTP/AVP ${audioCodecInfo.payloadType}
  a=rtpmap:${audioCodecInfo.payloadType} ${audioCodecInfo.codecName}/${audioCodecInfo.clockRate}/${audioCodecInfo.channels}
  `;
};