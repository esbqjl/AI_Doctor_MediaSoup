const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const { EventEmitter } = require('events');
const { getCodecInfoFromRtpParameters } = require('./utils');
const RECORD_FILE_LOCATION_PATH = 'audio';
const SDP_FILE_PATH = path.join(__dirname, 'current.sdp');
const Logger = require('./Logger');
const logger = new Logger('sdp');
const speech = require('@google-cloud/speech');
const client = new speech.SpeechClient({
  keyFilename: path.join(__dirname, 'Google.json')
});

module.exports = class FFmpeg {
  constructor(rtpParameters) {
    this._rtpParameters = rtpParameters;
    this._process = undefined;
    this._observer = new EventEmitter();
    this._audioBuffer = []; // 用于存储音频数据块
    this._uploadInterval = null; // 定时上传任务
    this._createProcess();
  }

  _createProcess() {
    const sdpContent = this._createSdpText(this._rtpParameters);
    fs.writeFileSync(SDP_FILE_PATH, sdpContent);
    console.log('SDP content written to file:', SDP_FILE_PATH);
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
      this._observer.emit('process-close');
      clearInterval(this._uploadInterval); // 停止定时上传任务
    });

    this._startUploadInterval(); // 启动定时上传任务
  }

  _onData(data) {
    // 确保 data 是 Buffer 实例
    if (Buffer.isBuffer(data)) {
      this._audioBuffer.push(data);
    } else {
      this._audioBuffer.push(Buffer.from(data));
    }
  }

  _startUploadInterval() {
    this._uploadInterval = setInterval(() => this._uploadAudio(), 5000); // 每5秒上传一次
  }

  async _uploadAudio() {
    if (this._audioBuffer.length === 0) return;

    // 使用 Buffer.concat 来组合所有音频数据块
    const audioData = Buffer.concat(this._audioBuffer);
    
    try {
      fs.appendFileSync(path.join(__dirname, '/audio/audio_test.wav'), audioData);
      console.log('Audio data appended to audio_test.wav for verification.');
    } catch (err) {
      console.error('Error appending audio data to file:', err);
    }
    
    this._audioBuffer = []; // 清空缓存

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
        console.log(`Transcription: ${transcription}`);
        this._observer.emit('transcription', transcription); // 发出事件
      } else {
        console.log('No transcription results received.');
      }
    } catch (error) {
      console.error('Error recognizing audio:', error);
    }
  }

  _createSdpText(rtpParameters) {
    const { audio } = rtpParameters;
    const audioCodecInfo = getCodecInfoFromRtpParameters('audio', audio.rtpParameters);

    return `v=0
    o=- 0 0 IN IP4 192.168.50.175
    s=FFmpeg
    c=IN IP4 192.168.50.175
    t=0 0
    m=audio ${audio.remoteAudioPort} RTP/AVP ${audioCodecInfo.payloadType}
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
      '-i', SDP_FILE_PATH,
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