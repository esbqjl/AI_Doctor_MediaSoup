const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const { EventEmitter } = require('events');
const { getCodecInfoFromRtpParameters } = require('./utils');
const RECORD_FILE_LOCATION_PATH = 'audio';
const SDP_FILE_PATH = path.join(__dirname, 'current.sdp');

const Logger = require('./Logger');
const logger = new Logger('sdp');
module.exports = class FFmpeg {
  constructor(rtpParameters) {
    this._rtpParameters = rtpParameters;
    this._process = undefined;
    this._observer = new EventEmitter();
    this._createProcess();
  }

  _createProcess() {
    // 创建SDP内容并写入文件
    const sdpContent = this._createSdpText(this._rtpParameters);
    fs.writeFileSync(SDP_FILE_PATH, sdpContent);

    console.log('SDP content written to file:', SDP_FILE_PATH);

    // 启动ffmpeg进程
    this._process = child_process.spawn('ffmpeg', this._commandArgs);

    if (this._process.stderr) {
      this._process.stderr.setEncoding('utf-8');
      this._process.stderr.on('data', data =>
        console.log('ffmpeg::process::data [data:%o]', data)
      );
    }

    if (this._process.stdout) {
      this._process.stdout.setEncoding('utf-8');
      this._process.stdout.on('data', data =>
        console.log('ffmpeg::process::data [data:%o]', data)
      );
    }

    this._process.on('message', message =>
      console.log('ffmpeg::process::message [message:%o]', message)
    );

    this._process.on('error', error =>
      console.error('ffmpeg::process::error [error:%o]', error)
    );

    this._process.once('close', () => {
      console.log('ffmpeg::process::close');
      this._observer.emit('process-close');
    });
  }

  _createSdpText(rtpParameters) {
    const { audio } = rtpParameters;
    logger.debug("audio.port",audio.rtpParameters.encodings);
    const audioCodecInfo = getCodecInfoFromRtpParameters('audio', audio.rtpParameters);

    // 创建SDP内容字符串
    return `v=0
    o=- 0 0 IN IP4 10.0.0.124
    s=FFmpeg
    c=IN IP4 10.0.0.124
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

    // 仅包含音频参数
    commandArgs = commandArgs.concat(this._audioArgs);

    commandArgs = commandArgs.concat([
      `${__dirname}/${RECORD_FILE_LOCATION_PATH}/121.mp4`
    ]);

    console.log('commandArgs:%o', commandArgs);

    return commandArgs;
  }

  get _audioArgs() {
    return [
      '-map', '0:a:0',
      '-c:a', 'copy'   // 复制音频流，不重新编码
    ];
  }
};