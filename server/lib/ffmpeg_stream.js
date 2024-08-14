const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const { getCodecInfoFromRtpParameters, convertStringToStream } = require('./utils');
const RECORD_FILE_LOCATION_PATH = 'audio';
const Logger = require('./Logger');
const logger = new Logger('sdp');
const speech = require('@google-cloud/speech');
const EventEmitter = require('events').EventEmitter;
const client = new speech.SpeechClient({
  keyFilename: path.join(__dirname, 'Google.json')
});

module.exports = class FFmpeg extends EventEmitter {
  constructor(rtpParameters, roomId, listenIp) {
    super();
    this._rtpParameters = rtpParameters;
    this._process = undefined;
    this._roomId = roomId;
    this._listenIp = listenIp;
    this._createProcess();
  }

  _createProcess() {
    const sdpContent = this._createSdpText(this._rtpParameters);
    const sdpStream = convertStringToStream(sdpContent);

    logger.debug('SDP content:', sdpContent);
    this._process = child_process.spawn('ffmpeg', this._commandArgs);

    if (this._process.stderr) {
      this._process.stderr.setEncoding('utf-8');
      this._process.stderr.on('data', data => logger.debug('ffmpeg::process::data [data:%o]', data));
    }

    if (this._process.stdout) {
      // Stream the stdout (audio data) to Google Cloud Speech
      this._startStreamingRecognition(this._process.stdout);
    }

    this._process.on('error', error => logger.error('ffmpeg::process::error [error:%o]', error));
    this._process.once('close', () => {
      logger.debug('ffmpeg::process::close');
      this._stopStreamingRecognition();
    });

    // Pipe the SDP stream directly to FFmpeg's stdin
    sdpStream.pipe(this._process.stdin);
  }

  _startStreamingRecognition(audioStream) {
    const request = {
      config: {
        encoding: 'OGG_OPUS',
        sampleRateHertz: 48000,
        languageCode: 'en-US',
        audioChannelCount: 2,
        interimResults: true, // If you want interim results, set this to true
      },
    };

    this._recognizeStream = client
      .streamingRecognize(request)
      .on('error', (error) => logger.error(`Room ${this._roomId} Error recognizing audio:`, error))
      .on('data', (response) => {
        logger.debug('Received response:', response);
        this._onTranscription(response);
      });

    // Manually handle audio stream data and push it to Google Cloud Speech-to-Text
    audioStream.on('data', (chunk) => {
      this._recognizeStream.write(chunk);
    });

    audioStream.on('end', () => {
      this._recognizeStream.end();
    });
  }

  _stopStreamingRecognition() {
    if (this._recognizeStream) {
      this._recognizeStream.end();
    }
  }

  _onTranscription(response) {
    if (response.results && response.results.length > 0) {
      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');

      logger.debug(`Room ${this._roomId} Transcription: ${transcription}`);
      this.emit('transcript', { roomId: this._roomId, transcription });
      try {
        fs.appendFileSync(path.join(__dirname, `/${RECORD_FILE_LOCATION_PATH}/`, `${this._roomId}.txt`), `${transcription}\n`);
      } catch (err) {
        logger.error('Error appending transcription data to file:', err);
      }
    } else {
      logger.debug(`Room ${this._roomId} No transcription results received.`);
    }
  }

  _createSdpText(rtpParameters) {
    const { audio } = rtpParameters;
    const audioCodecInfo = getCodecInfoFromRtpParameters('audio', audio.rtpParameters);

    return `v=0
    o=- 0 0 IN IP4 ${this._listenIp}
    s=FFmpeg
    c=IN IP4 ${this._listenIp}
    t=0 0
    m=audio ${audio.audioPort} RTP/AVP ${audioCodecInfo.payloadType}
    a=rtpmap:${audioCodecInfo.payloadType} ${audioCodecInfo.codecName}/${audioCodecInfo.clockRate}/${audioCodecInfo.channels}
    a=sendonly
    `;
  }

  kill() {
    logger.debug('kill() [pid:%d]', this._process.pid);
    this._process.kill('SIGINT');
    this._stopStreamingRecognition(); // Ensure streaming is stopped when FFmpeg process is killed
  }

  get _commandArgs() {
    let commandArgs = [
      '-loglevel', 'debug',
      '-protocol_whitelist', 'file,crypto,data,udp,rtp,pipe',
      '-f', 'sdp',
      '-i', 'pipe:0', // Read SDP from stdin
      '-listen_timeout', '15'
    ];

    commandArgs = commandArgs.concat(this._audioArgs);
    return commandArgs;
  }

  get _audioArgs() {
    return [
      '-map', '0:a:0',
      '-c:a', 'copy',           // No re-encoding, just copy the stream
      '-f', 'ogg',            // Output format
      'pipe:1'                  // Output to stdout
    ];  
  }
};