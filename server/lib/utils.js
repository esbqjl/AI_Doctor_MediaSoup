/**
 * Clones the given value.
 */
exports.clone = function(value)
{
	if (value === undefined)
	{
		return undefined;
	}
	else if (Number.isNaN(value))
	{
		return NaN;
	}
	else if (typeof structuredClone === 'function')
	{
		// Available in Node >= 18.
		// eslint-disable-next-line no-undef
		return structuredClone(value);
	}
	else
	{
		return JSON.parse(JSON.stringify(value));
	}
};

const { Readable } = require('stream');

// Converts a string (SDP) to a stream so it can be piped into the FFmpeg process
module.exports.convertStringToStream = (stringToConvert) => {
  const stream = new Readable();
  stream._read = () => {};
  stream.push(stringToConvert);
  stream.push(null);

  return stream;
};

// Gets codec information from rtpParameters
module.exports.getCodecInfoFromRtpParameters = (kind, rtpParameters) => {
  return {
    payloadType: rtpParameters.codecs[0].payloadType,
    codecName: rtpParameters.codecs[0].mimeType.replace(`${kind}/`, ''),
    clockRate: rtpParameters.codecs[0].clockRate,
    channels: kind === 'audio' ? rtpParameters.codecs[0].channels : undefined,
	ssrc: rtpParameters.encodings[0].ssrc
  };
};
