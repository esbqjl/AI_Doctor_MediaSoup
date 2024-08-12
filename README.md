# mediasoup-demo v3

This demo is an on going developing project based on the demo application of https://github.com/versatica/mediasoup-demo **v3**.
Using real time transcribe and Artifical Intelligent to make a doctor assistance.

## Resources

* mediasoup website and documentation: [mediasoup.org](https://mediasoup.org)
* mediasoup support forum: [mediasoup.discourse.group](https://mediasoup.discourse.group)
* More information about this demo, please take a look to HealthiAi online website: [HealthiAi](https://mediasoup.discourse.group)

## Configuration via query parameters

(We are just going to use the original variable description, since the majority of them are still based on MediaSoup.)

By adding query parameters into the URL you can set certain settings of the application:

| Parameter          | Type    | Description          | Default Value |
| ------------------ | ------- | -------------------- | ------------- |
| `roomId`           | String  | Id of the room      | Autogenerated  |
| `displayName`      | String  | Display name of your participant | Autogenerated |
| `handlerName`      | String  | Handler name of the mediasoup-client `Device` instance | Autodetected |
| `forceTcp`         | Boolean | Force RTC (audio/video/datachannel) over TCP instead of UDP | `false` |
| `produce`          | Boolean | Enable sending of audio/video | `true`  |
| `consume`          | Boolean | Enable reception of audio/video | `true` |
| `datachannel`      | Boolean | Enable DataChannels | `true` |
| `forceVP8`        | Boolean | Force VP8 codec for webcam and screen sharing | `false` |
| `forceH264`        | Boolean | Force H264 codec for webcam and screen sharing | `false` |
| `forceVP9`        | Boolean | Force VP9 codec for webcam and screen sharing | `false` |
| `enableWebcamLayers` | Boolean | Enable simulcast or SVC for webcam | `true` |
| `enableSharingLayers` | Boolean | Enable simulcast or SVC for screen sharing | `true` |
| `webcamScalabilityMode` | String | `scalabilityMode` for webcam | 'L1T3' for VP8/H264 (in each simulcast encoding), 'L3T3_KEY' for VP9 |
| `sharingScalabilityMode` | String | `scalabilityMode` for screen sharing | 'L1T3' for VP8/H264 (in each simulcast encoding), 'L3T3' for VP9 |
| `numSimulcastStreams` | Number | Number of streams for simulcast in webcam and screen sharing | 3 |
| `info`             | Boolean | Display detailed information about media transmission | `false` |
| `faceDetection`    | Boolean | Run face detection | `false` |
| `externalVideo`    | Boolean | Send an external video instead of local webcam | `false` |
| `e2eKey`           | String | Key for media E2E encryption/decryption (just works with some OPUS and VP8 codecs) | |
| `consumerReplicas` | Number | Create artificial replicas of yourself and receive their audio and video (not displayed in the UI) | 0 |


## Installation

* Clone the project:

```bash
$ git clone https://github.com/esbqjl/AI_Doctor_MediaSoup.git
$ cd mediasoup-demo
$ git checkout v3
```

* Ensure you have installed the [dependencies](https://mediasoup.org/documentation/v3/mediasoup/installation/#requirements) required by mediasoup to build.

* Set up the mediasoup-demo server:

```bash
$ cd server
$ npm install
```

* Copy `config.example.js` as `config.js` and customize it for your scenario:

```bash
$ cp config.example.js config.js
```
* Download ffmpeg on your machine, if you are using Linux

```bash
$ sudo apt install ffmpeg
```

* Make sure you have downloaded the Google speech to text credential json file, and place it under /server/lib
* Copy `.env_example` as `.env` and customize it for your scenario, you don't need that OPENAI_KEY, but I put here just in case guys have api or something.

```bash
$ cd server/lib
$ cp <WHATEVER_YOUR_GOOGLE_JSON_FILE>.json Google.json
$ cp .env_example .env
```

**NOTE:** We are using FFmpeg to record things and pack it as Buffer and then push it to Google, in addition, Buffer will be wrote into a audio file locate under /server/lib/audio.

**NOTE:** To be perfectly clear, "customize it for your scenario" is not something "optional". If you don't set proper values in `config.js` the application **won't work**. You must configure a tls certificate.

* Set up the mediasoup-demo flask backend:


* Copy `.env_example` as `.env` and customize it for your scenario, Make sure you you have Google Gemini API or OPENAI_API_KEY. You can just input one, make sure which one you are going to use in llm.py, the default is Gemini.

Whether you like to build a virtual env or not, up to you.

```bash
$ cd flask
# Python version need to be > 3.10
$ pip install -r requirements.txt
$ mv .env_example .env
```
  
* Set up the mediasoup-demo browser app:

```bash
$ cd app
# For node 16
$ npm install
# For node 18, use legacy peer dependencies
$ npm install --legacy-peer-deps  
```


## Run it locally

* Run the Node.js server application in a terminal:

```bash
$ cd server
$ npm start
```

For Virtual Machine, I strongly recommend you run this using Adapter Bridged Mode
Obtain your IP address of your local machine, Ex: 192.168.50.175

```bash
$ cd server
$ MEDIASOUP_LISTEN_IP=192.168.50.175 npm start
```


* Run the Flask server application in a terminal:

```bash
$ cd flask
$ python main.py
```

* In a different terminal build and run the browser application:

```bash
$ cd app
$ npm start
```

If you configured a self-signed tls certificate, and receive wss: connection errors, open the wss: url with https: protocol to accept the cert and allow wss: connections in your browser.

* Enjoy.


## Deploy it in a server

Right now, we don't have a proper way to make tutorial of this to server yet, we will do it ASAP.


## Authors
* Wenjun Zhang  [[website](https://www.happychamber.xyz/)|[github](https://github.com/esbqjl)]
## Credits 
This project is based on https://github.com/versatica/mediasoup-demo.git
* Iñaki Baz Castillo [[website](https://inakibaz.me)|[github](https://github.com/ibc/)]
* José Luis Millán Villegas [[github](https://github.com/jmillan/)]


## License

MIT
