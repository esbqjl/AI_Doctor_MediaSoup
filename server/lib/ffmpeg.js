const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const { getCodecInfoFromRtpParameters } = require('./utils');
const RECORD_FILE_LOCATION_PATH = 'audio';
const axios = require('axios');
const Logger = require('./Logger');
const logger = new Logger('sdp');
const speech = require('@google-cloud/speech');
const EventEmitter = require('events').EventEmitter;
const client = new speech.SpeechClient({
  keyFilename: path.join(__dirname, 'Google.json')
});

module.exports = class FFmpeg extends EventEmitter{
  constructor(rtpParameters, roomId, listenIp) {
    super();
    this._rtpParameters = rtpParameters;
    this._process = undefined;
  
    this._audioBuffer = []; // to store audio buffer
    this._uploadInterval = null; // set certain time to upload audio
    this._roomId = roomId;
    this._listenIp = listenIp;
    this._sdpFilePath = null;
    this._createProcess();
   
  }

  _createProcess() {
    const sdpContent = this._createSdpText(this._rtpParameters);
    
    this._sdpFilePath = path.join(__dirname, `/${RECORD_FILE_LOCATION_PATH}/`, `${this._roomId}.sdp`);
    fs.writeFileSync(this._sdpFilePath, sdpContent);
    console.log('SDP content written to file:', this._sdpFilePath);
    this._process = child_process.spawn('ffmpeg', this._commandArgs);

    if (this._process.stderr) {
      this._process.stderr.setEncoding('utf-8');
      this._process.stderr.on('data', data => console.log('ffmpeg::process::data [data:%o]', data));
    }

    if (this._process.stdout) {
      this._process.stdout.on('data', data => this._onData(data));
    }

    this._process.on('error', error => console.error('ffmpeg::process::error [error:%o]', error));
    this._process.once('close', () => {
      console.log('ffmpeg::process::close');
      clearInterval(this._uploadInterval); // stop certain time upload task
    });

    this._startUploadInterval(); // click off certian time upload task
  }

  _onData(data) {
    // make sure data is contained in Buffer
    if (Buffer.isBuffer(data)) {
      this._audioBuffer.push(data);
    } else {
      this._audioBuffer.push(Buffer.from(data));
    }
  }

  _startUploadInterval() {
    this._uploadInterval = setInterval(() => this._uploadAudio(), 9000); // upload this in every certain seconds
  }

  async _uploadAudio() {
    if (this._audioBuffer.length === 0) return;

    // 使用 Buffer.concat 来组合所有音频数据块
    const audioData = Buffer.concat(this._audioBuffer);
    const { audio } = this._rtpParameters;
    
    try {
      fs.appendFileSync(path.join(__dirname, `/${RECORD_FILE_LOCATION_PATH}/`,`${this._roomId}.wav`), audioData);
      console.log('Audio data appended to audio_test.wav for verification.');
    } catch (err) {
      console.error('Error appending audio data to file:', err);
    }
    
    this._audioBuffer = []; // cleanup that buffer

    const request = {
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
      },
      audio: {
        content: audioData.toString('base64'),
      },
    };

    try {
      const [response] = await client.recognize(request);
      if (response.results.length > 0) {
        const transcription = response.results
          .map(result => result.alternatives[0].transcript)
          .join('\n');
        
        this.emit('transcript', { roomId: this._roomId, transcription });
          
        fs.appendFileSync(path.join(__dirname, `/${RECORD_FILE_LOCATION_PATH}/`,`${this._roomId}.txt`), `${transcription}\n `);
         // send this to event
      } else {
        console.log(`Room ${this._roomId} No transcription results received.`);
      }
    } catch (error) {
      console.error(`Room ${this._roomId} Error recognizing audio:`, error);
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
      '-ss', '3',
      '-map', '0:a:0',
      '-c:a', 'pcm_s16le',
      '-ar', '16000',
      '-ac', '1',
      '-f', 'wav',
      'pipe:1'
    ];
  }
};