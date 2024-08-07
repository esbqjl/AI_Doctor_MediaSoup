const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const { EventEmitter } = require('events');
const { getCodecInfoFromRtpParameters } = require('./utils');
const { PassThrough } = require('stream'); // 使用 PassThrough 流
const RECORD_FILE_LOCATION_PATH = 'audio';

const Logger = require('./Logger');
const logger = new Logger('sdp');
const speech = require('@google-cloud/speech');
const client = new speech.SpeechClient({
  keyFilename: path.join(__dirname, 'Google.json')
});

module.exports = class FFmpeg {
  constructor(rtpParameters, roomId) {
    this._rtpParameters = rtpParameters;
    this._process = undefined;
    this._observer = new EventEmitter();
    this._audioStream = new PassThrough(); // 使用 PassThrough 代替 buffer
    this._roomId = roomId;
    this._sdpFilePath = null;
    this._createProcess();
  }

  _createProcess() {
    const sdpContent = this._createSdpText(this._rtpParameters);
    this._sdpFilePath = path.join(__dirname, '/audio/', `${this._roomId}.sdp`);
    fs.writeFileSync(this._sdpFilePath, sdpContent);
    this._process = child_process.spawn('ffmpeg', this._commandArgs);

    if (this._process.stderr) {
      this._process.stderr.setEncoding('utf-8');
      this._process.stderr.on('data', data => console.log('ffmpeg::process::data [data:%o]', data));
    }

    if (this._process.stdout) {
      // 将 ffmpeg 的输出连接到 audioStream
      this._process.stdout.pipe(this._audioStream);
    }

    this._process.on('error', error => console.error('ffmpeg::process::error [error:%o]', error));
    this._process.once('close', () => {
      console.log('ffmpeg::process::close');
      this._observer.emit('process-close');
    });

    this._startRecognitionStream();
  }

  _startRecognitionStream() {
    const recognizeStream = client
      .streamingRecognize({
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 16000,
          languageCode: 'en-US',
        },
        interimResults: false, // 设置为 false 以获取完整的结果
      })
      .on('error', error => console.error('Error in recognition stream:', error))
      .on('data', data => {
        if (data.results && data.results[0] && data.results[0].alternatives[0]) {
          const transcription = data.results[0].alternatives[0].transcript;
          console.log(`Room ${this._roomId} Transcription: ${transcription}`);
          fs.appendFileSync(path.join(__dirname, '/audio/', `${this._roomId}.txt`), transcription);
          this._observer.emit('transcription', transcription);
        } else {
          console.log(`Room ${this._roomId} No transcription results received.`);
        }
      });

    // 将 audioStream 的数据传输到 Google Speech-to-Text API
    this._audioStream.pipe(recognizeStream);
  }

  _createSdpText(rtpParameters) {
    const { audio } = rtpParameters;
    const audioCodecInfo = getCodecInfoFromRtpParameters('audio', audio.rtpParameters);

    return `v=0
    o=- 0 0 IN IP4 192.168.50.175
    s=FFmpeg
    c=IN IP4 192.168.50.175
    t=0 0
    m=audio ${audio.audioPort} RTP/AVP ${audioCodecInfo.payloadType}
    a=rtpmap:${audioCodecInfo.payloadType} ${audioCodecInfo.codecName}/${audioCodecInfo.clockRate}/${audioCodecInfo.channels}
    a=sendonly
    `;
  }

  kill() {
    console.log('kill() [pid:%d]', this._process.pid);
    this._process.kill('SIGINT');
  }

  get _commandArgs() {
    let commandArgs = [
      '-loglevel', 'debug',
      '-protocol_whitelist', 'file,crypto,data,udp,rtp',
      '-f', 'sdp',
      '-i', this._sdpFilePath,
      '-listen_timeout', '15'
    ];

    commandArgs = commandArgs.concat(this._audioArgs);
    return commandArgs;
  }

  get _audioArgs() {
    return [
      '-map', '0:a:0',
      '-c:a', 'pcm_s16le',
      '-ar', '16000',
      '-ac', '1',
      '-f', 'wav',
      'pipe:1'
    ];
  }
};