const EventEmitter = require('events').EventEmitter;
const mediasoup = require('mediasoup');
const protoo = require('protoo-server');
// const rtp = require('rtp.js');
const throttle = require('@sitespeed.io/throttle');
const Logger = require('./Logger');
const utils = require('./utils');
const config = require('../config');
const Bot = require('./Bot');
const axios = require('axios');
const logger = new Logger('Room');
// const path = require('path');
const net = require('net');
const usedPorts = new Set();
// const FFmpeg= require('./ffmpeg');
const FFmpeg= require('./ffmpeg_stream');
const io = require('socket.io-client');

global.recordingStatus = {};
/**
 * Room class.
 *
 * This is not a "mediasoup Room" by itself, by a custom class that holds
 * a protoo Room (for signaling with WebSocket clients) and a mediasoup Router
 * (for sending and receiving media to/from those WebSocket peers).
 */
class Room extends EventEmitter
{
	/**
	 * Factory function that creates and returns Room instance.
	 *
	 * @async
	 *
	 * @param {mediasoup.Worker} mediasoupWorker - The mediasoup Worker in which a new
	 *   mediasoup Router must be created.
	 * @param {String} roomId - Id of the Room instance.
	 */
	static async create({ mediasoupWorker, roomId, consumerReplicas })
	{
		logger.info('create() [roomId:%s]', roomId);

		// Create a protoo Room instance.
		const protooRoom = new protoo.Room();

		// Router media codecs.
		const { mediaCodecs } = config.mediasoup.routerOptions;

		// Create a mediasoup Router.
		const mediasoupRouter = await mediasoupWorker.createRouter({ mediaCodecs });

		// Create a mediasoup AudioLevelObserver.
		const audioLevelObserver = await mediasoupRouter.createAudioLevelObserver(
			{
				maxEntries : 1,
				threshold  : -80,
				interval   : 800
			});

		// Create a mediasoup ActiveSpeakerObserver.
		const activeSpeakerObserver = await mediasoupRouter.createActiveSpeakerObserver();

		const bot = await Bot.create({ mediasoupRouter });

		return new Room(
			{
				roomId,
				protooRoom,
				webRtcServer : mediasoupWorker.appData.webRtcServer,
				mediasoupRouter,
				audioLevelObserver,
				activeSpeakerObserver,
				consumerReplicas,
				bot
			});
	}

	constructor(
		{
			roomId,
			protooRoom,
			webRtcServer,
			mediasoupRouter,
			audioLevelObserver,
			activeSpeakerObserver,
			consumerReplicas,
			bot
		})
	{
		super();

		this.setMaxListeners(Infinity);

		// Room id.
		// @type {String}
		this._roomId = roomId;

		// Closed flag.
		// @type {Boolean}
		this._closed = false;

		// protoo Room instance.
		// @type {protoo.Room}
		this._protooRoom = protooRoom;

		// Map of broadcasters indexed by id. Each Object has:
		// - {String} id
		// - {Object} data
		//   - {String} displayName
		//   - {Object} device
		//   - {RTCRtpCapabilities} rtpCapabilities
		//   - {Map<String, mediasoup.Transport>} transports
		//   - {Map<String, mediasoup.Producer>} producers
		//   - {Map<String, mediasoup.Consumers>} consumers
		//   - {Map<String, mediasoup.DataProducer>} dataProducers
		//   - {Map<String, mediasoup.DataConsumers>} dataConsumers
		// @type {Map<String, Object>}
		this._broadcasters = new Map();

		// mediasoup WebRtcServer instance.
		// @type {mediasoup.WebRtcServer}
		this._webRtcServer = webRtcServer;

		// mediasoup Router instance.
		// @type {mediasoup.Router}
		this._mediasoupRouter = mediasoupRouter;

		// mediasoup AudioLevelObserver.
		// @type {mediasoup.AudioLevelObserver}
		this._audioLevelObserver = audioLevelObserver;

		// mediasoup ActiveSpeakerObserver.
		// @type {mediasoup.ActiveSpeakerObserver}
		this._activeSpeakerObserver = activeSpeakerObserver;

		// DataChannel bot.
		// @type {Bot}
		this._bot = bot;

		// Consumer replicas.
		// @type {Number}
		this._consumerReplicas = consumerReplicas || 0;

		// Network throttled.
		// @type {Boolean}
		this._networkThrottled = false;

		this._recording = false; 

  		this._recordingProcess = null; 
		

		// Handle audioLevelObserver.
		this._handleAudioLevelObserver();

		// Handle activeSpeakerObserver.
		this._handleActiveSpeakerObserver();

		

		// For debugging.
		global.audioLevelObserver = this._audioLevelObserver;
		global.activeSpeakerObserver = this._activeSpeakerObserver;
		global.bot = this._bot;

		// socket connect
		this._socket = io('http://localhost:5000');
		this._socket.on('connect', () => {
			console.log('Connected to Flask-SocketIO server');
		  
			// For debugging
			this._socket.emit('transcript', {
			  roomId: this.roomId,
			  transcription: 'This is a test transcription.'
			});
		});

		// stored data
		this._cdsQaData = null;
		this._transcript = null;
		this._cdsHpiData = null;
		this._cdsDdxData = null;


		// Handle connection errors
		this._socket.on('connect_error', (error) => {
			console.error('Connection error:', error);
		});
		
		// Handle connection timeout
		this._socket.on('connect_timeout', () => {
			console.error('Connection timed out.');
		});

		// 实时接收数据并调用 handleSocketData 处理
		this._socket.on('cds_ddx', (data) => {
			this.handleSocketData('cds_ddx', data);
		});
	  
		this._socket.on('cds_qa', (data) => {
			this.handleSocketData('cds_qa', data);
		});
	  
		this._socket.on('cds_hpi', (data) => {
			this.handleSocketData('cds_hpi', data);
		});

		this._socket.on('send_transcript', (data) => {
			this.handleSocketData('transcript', data);
		});

		
	}

	/**
	 * Closes the Room instance by closing the protoo Room and the mediasoup Router.
	 */
	close()
	{
		logger.debug('close()');

		this._closed = true;

		// stop recording

		this.stopRecording();

		// socketid disconnect

		this._socket.disconnect();

		// Close the protoo Room.
		this._protooRoom.close();

		// Close the mediasoup Router.
		this._mediasoupRouter.close();

		// Close the Bot.
		this._bot.close();

		// Emit 'close' event.
		this.emit('close');

		// Stop network throttling.
		if (this._networkThrottled)
		{
			logger.debug('close() | stopping network throttle');

			throttle.stop({})
				.catch((error) =>
				{
					logger.error(`close() | failed to stop network throttle:${error}`);
				});
		}

		
	}

	// 开始录制的方法
	async startRecording(producer) {
		let recordInfo = {};
		logger.debug("producer.id",producer.id);
		if (this._recording) {
		  throw new Error('Recording is already in progress');
		}
		if (global.recordingStatus[this._roomId]) {
			throw new Error('Recording is already in progress for this room');
		}
	
		global.recordingStatus[this._roomId] = true;
	  
		await new Promise(resolve => setTimeout(resolve, 1000));
		
		try {
			// 创建 plain transport 用于音频
			const audioTransport = await this._mediasoupRouter.createPlainTransport({
				listenIp: { ip: process.env.MEDIASOUP_LISTEN_IP },
				rtcpMux: false,
			});
		
			const remoteAudioIp = process.env.MEDIASOUP_LISTEN_IP;
		
			// allocate port for ffmpeg
			let audioPort, rtcpPort;
			try {
				({ audioPort, rtcpPort } = await this.getRandomAvailableEvenPortPair(8000, 9000));
				console.log(`Found available ports: Audio port ${audioPort}, RTCP port ${rtcpPort}`);
			} catch (err) {
				console.error('Error finding available ports:', err);
				throw new Error('Failed to allocate ports');
			}
		
			// 连接到远程地址和端口
			await audioTransport.connect({ ip: remoteAudioIp, port: audioPort, rtcpPort: rtcpPort });
	  
			console.log(
				"mediasoup AUDIO RTP SEND transport connected: %s:%d <--> %s:%d (%s)",
				audioTransport.tuple.localIp,
				audioTransport.tuple.localPort,
				audioTransport.tuple.remoteIp,
				audioTransport.tuple.remotePort,
				audioTransport.tuple.protocol
			);
	  
			console.log(
				"mediasoup AUDIO RTCP SEND transport connected: %s:%d <--> %s:%d (%s)",
				audioTransport.rtcpTuple.localIp,
				audioTransport.rtcpTuple.localPort,
				audioTransport.rtcpTuple.remoteIp,
				audioTransport.rtcpTuple.remotePort,
				audioTransport.rtcpTuple.protocol
			);
	  
		  	// const audioProducer = Array.from(this._protooRoom.peers.values())
			// 	.flatMap(peer => Array.from(peer.data.producers.values()))
			// 	.find(producer => producer.kind === 'audio');
		
			const audioProducer = producer;
	  
			if (!audioProducer) {
				throw new Error('Audio producer not found');
			}
	  
			const rtpCapabilities = this._mediasoupRouter.rtpCapabilities;
			const rtpConsumer = await audioTransport.consume({
				producerId: audioProducer.id,
				rtpCapabilities,
				paused: false
			});
	  
			const rtpParameters = rtpConsumer.rtpParameters;
		  	recordInfo['audio'] = { audioPort, rtcpPort, rtpCapabilities, rtpParameters};
			logger.debug("audioTransport.rtcpTuple.localIp", audioTransport.rtcpTuple.localIp);
			const roomId = this._roomId;
		  	this._recordingProcess = new FFmpeg(recordInfo, roomId, audioTransport.rtcpTuple.localIp);
			  	this._recordingProcess.on('transcript', async ({ roomId, transcription }) => {
				this._socket.emit('transcript', {
					roomId: roomId,
					transcription: transcription 
				});
			});
		  	this._recording = true;
		  	console.log(`Recording started for room ${this._roomId}`);
		} catch (error) {
		  	console.error('Failed to start recording:', error);
		}
	}
	// stop recording function
	stopRecording() {
		if (!this._recording) {
			console.error('No recording is in progress');
			return;
		}
		if (!global.recordingStatus[this._roomId]) {
			console.error('No recording is in progress for this room');
			return;
		}
	
		try {
			if (this._recordingProcess) {
				this._recordingProcess.kill('SIGINT');
				this._recordingProcess = null;
				console.log(`Recording stopped for room ${this._roomId}`);
			} else {
				console.error('Recording process not found');
			}
		} catch (error) {
			console.error(`Error stopping recording for room ${this._roomId}:`, error);
		}
		global.recordingStatus[this._roomId] = false;
		this._recording = false;
	}

	logStatus()
	{
		logger.info(
			'logStatus() [roomId:%s, protoo Peers:%s]',
			this._roomId,
			this._protooRoom.peers.length);
	}

	/**
	 * Called from server.js upon a protoo WebSocket connection request from a
	 * browser.
	 *
	 * @param {String} peerId - The id of the protoo peer to be created.
	 * @param {Boolean} consume - Whether this peer wants to consume from others.
	 * @param {protoo.WebSocketTransport} protooWebSocketTransport - The associated
	 *   protoo WebSocket transport.
	 */
	handleProtooConnection({ peerId, consume, protooWebSocketTransport })
	{
		const existingPeer = this._protooRoom.getPeer(peerId);

		if (existingPeer)
		{
			logger.warn(
				'handleProtooConnection() | there is already a protoo Peer with same peerId, closing it [peerId:%s]',
				peerId);

			existingPeer.close();
		}

		let peer;

		// Create a new protoo Peer with the given peerId.
		try
		{
			peer = this._protooRoom.createPeer(peerId, protooWebSocketTransport);
		}
		catch (error)
		{
			logger.error('protooRoom.createPeer() failed:%o', error);
		}

		// Notify mediasoup version to the peer.
		peer.notify('mediasoup-version', { version: mediasoup.version })
			.catch(() => {});

		// Use the peer.data object to store mediasoup related objects.

		// Not joined after a custom protoo 'join' request is later received.
		peer.data.consume = consume;
		peer.data.joined = false;
		peer.data.displayName = undefined;
		peer.data.device = undefined;
		peer.data.rtpCapabilities = undefined;
		peer.data.sctpCapabilities = undefined;

		// Have mediasoup related maps ready even before the Peer joins since we
		// allow creating Transports before joining.
		peer.data.transports = new Map();
		peer.data.producers = new Map();
		peer.data.consumers = new Map();
		peer.data.dataProducers = new Map();
		peer.data.dataConsumers = new Map();

		peer.on('request', (request, accept, reject) =>
		{
			logger.debug(
				'protoo Peer "request" event [method:%s, peerId:%s]',
				request.method, peer.id);

			this._handleProtooRequest(peer, request, accept, reject)
				.catch((error) =>
				{
					logger.error('request failed:%o', error);

					reject(error);
				});
		});

		peer.on('close', () =>
		{
			if (this._closed)
				return;

			logger.debug('protoo Peer "close" event [peerId:%s]', peer.id);

			// If the Peer was joined, notify all Peers.
			if (peer.data.joined)
			{
				for (const otherPeer of this._getJoinedPeers({ excludePeer: peer }))
				{
					otherPeer.notify('peerClosed', { peerId: peer.id })
						.catch(() => {});
				}
			}

			// Iterate and close all mediasoup Transport associated to this Peer, so all
			// its Producers and Consumers will also be closed.
			for (const transport of peer.data.transports.values())
			{
				transport.close();
			}

			// If this is the latest Peer in the room, close the room.
			if (this._protooRoom.peers.length === 0)
			{
				logger.info(
					'last Peer in the room left, closing the room [roomId:%s]',
					this._roomId);

				this.close();
			}
		});
		
	}

	getRouterRtpCapabilities()
	{
		return this._mediasoupRouter.rtpCapabilities;
	}

	/**
	 * Create a Broadcaster. This is for HTTP API requests (see server.js).
	 *
	 * @async
	 *
	 * @type {String} id - Broadcaster id.
	 * @type {String} displayName - Descriptive name.
	 * @type {Object} [device] - Additional info with name, version and flags fields.
	 * @type {RTCRtpCapabilities} [rtpCapabilities] - Device RTP capabilities.
	 */
	async createBroadcaster({ id, displayName, device = {}, rtpCapabilities })
	{
		if (typeof id !== 'string' || !id)
			throw new TypeError('missing body.id');
		else if (typeof displayName !== 'string' || !displayName)
			throw new TypeError('missing body.displayName');
		else if (typeof device.name !== 'string' || !device.name)
			throw new TypeError('missing body.device.name');
		else if (rtpCapabilities && typeof rtpCapabilities !== 'object')
			throw new TypeError('wrong body.rtpCapabilities');

		if (this._broadcasters.has(id))
			throw new Error(`broadcaster with id "${id}" already exists`);

		const broadcaster =
		{
			id,
			data :
			{
				displayName,
				device :
				{
					flag    : 'broadcaster',
					name    : device.name || 'Unknown device',
					version : device.version
				},
				rtpCapabilities,
				transports    : new Map(),
				producers     : new Map(),
				consumers     : new Map(),
				dataProducers : new Map(),
				dataConsumers : new Map()
			}
		};

		// Store the Broadcaster into the map.
		this._broadcasters.set(broadcaster.id, broadcaster);

		// Notify the new Broadcaster to all Peers.
		for (const otherPeer of this._getJoinedPeers())
		{
			otherPeer.notify(
				'newPeer',
				{
					id          : broadcaster.id,
					displayName : broadcaster.data.displayName,
					device      : broadcaster.data.device
				})
				.catch(() => {});
		}

		// Reply with the list of Peers and their Producers.
		const peerInfos = [];
		const joinedPeers = this._getJoinedPeers();

		// Just fill the list of Peers if the Broadcaster provided its rtpCapabilities.
		if (rtpCapabilities)
		{
			for (const joinedPeer of joinedPeers)
			{
				const peerInfo =
				{
					id          : joinedPeer.id,
					displayName : joinedPeer.data.displayName,
					device      : joinedPeer.data.device,
					producers   : []
				};

				for (const producer of joinedPeer.data.producers.values())
				{
					// Ignore Producers that the Broadcaster cannot consume.
					if (
						!this._mediasoupRouter.canConsume(
							{
								producerId : producer.id,
								rtpCapabilities
							})
					)
					{
						continue;
					}

					peerInfo.producers.push(
						{
							id   : producer.id,
							kind : producer.kind
						});
				}

				peerInfos.push(peerInfo);
			}
		}

		return { peers: peerInfos };
	}

	/**
	 * Delete a Broadcaster.
	 *
	 * @type {String} broadcasterId
	 */
	deleteBroadcaster({ broadcasterId })
	{
		const broadcaster = this._broadcasters.get(broadcasterId);

		if (!broadcaster)
			throw new Error(`broadcaster with id "${broadcasterId}" does not exist`);

		for (const transport of broadcaster.data.transports.values())
		{
			transport.close();
		}

		this._broadcasters.delete(broadcasterId);

		for (const peer of this._getJoinedPeers())
		{
			peer.notify('peerClosed', { peerId: broadcasterId })
				.catch(() => {});
		}
	}

	/**
	 * Create a mediasoup Transport associated to a Broadcaster. It can be a
	 * PlainTransport or a WebRtcTransport.
	 *
	 * @async
	 *
	 * @type {String} broadcasterId
	 * @type {String} type - Can be 'plain' (PlainTransport) or 'webrtc'
	 *   (WebRtcTransport).
	 * @type {Boolean} [rtcpMux=false] - Just for PlainTransport, use RTCP mux.
	 * @type {Boolean} [comedia=true] - Just for PlainTransport, enable remote IP:port
	 *   autodetection.
	 * @type {Object} [sctpCapabilities] - SCTP capabilities
	 */
	async createBroadcasterTransport(
		{
			broadcasterId,
			type,
			rtcpMux = false,
			comedia = true,
			sctpCapabilities
		})
	{
		const broadcaster = this._broadcasters.get(broadcasterId);

		if (!broadcaster)
			throw new Error(`broadcaster with id "${broadcasterId}" does not exist`);

		switch (type)
		{
			case 'webrtc':
			{
				const webRtcTransportOptions =
				{
					...utils.clone(config.mediasoup.webRtcTransportOptions),
					webRtcServer      : this._webRtcServer,
					iceConsentTimeout : 20,
					enableSctp        : Boolean(sctpCapabilities),
					numSctpStreams    : (sctpCapabilities || {}).numStreams
				};

				const transport =
					await this._mediasoupRouter.createWebRtcTransport(webRtcTransportOptions);

				// Store it.
				broadcaster.data.transports.set(transport.id, transport);

				return {
					id             : transport.id,
					iceParameters  : transport.iceParameters,
					iceCandidates  : transport.iceCandidates,
					dtlsParameters : transport.dtlsParameters,
					sctpParameters : transport.sctpParameters
				};
			}

			case 'plain':
			{
				const plainTransportOptions =
				{
					...utils.clone(config.mediasoup.plainTransportOptions),
					rtcpMux : rtcpMux,
					comedia : comedia
				};

				const transport = await this._mediasoupRouter.createPlainTransport(
					plainTransportOptions);

				// Store it.
				broadcaster.data.transports.set(transport.id, transport);

				return {
					id       : transport.id,
					ip       : transport.tuple.localIp,
					port     : transport.tuple.localPort,
					rtcpPort : transport.rtcpTuple ? transport.rtcpTuple.localPort : undefined
				};
			}

			default:
			{
				throw new TypeError('invalid type');
			}
		}
	}

	/**
	 * Connect a Broadcaster mediasoup WebRtcTransport.
	 *
	 * @async
	 *
	 * @type {String} broadcasterId
	 * @type {String} transportId
	 * @type {RTCDtlsParameters} dtlsParameters - Remote DTLS parameters.
	 */
	async connectBroadcasterTransport(
		{
			broadcasterId,
			transportId,
			dtlsParameters
		}
	)
	{
		const broadcaster = this._broadcasters.get(broadcasterId);

		if (!broadcaster)
			throw new Error(`broadcaster with id "${broadcasterId}" does not exist`);

		const transport = broadcaster.data.transports.get(transportId);

		if (!transport)
			throw new Error(`transport with id "${transportId}" does not exist`);

		if (transport.constructor.name !== 'WebRtcTransport')
		{
			throw new Error(
				`transport with id "${transportId}" is not a WebRtcTransport`);
		}

		await transport.connect({ dtlsParameters });
	}

	/**
	 * Create a mediasoup Producer associated to a Broadcaster.
	 *
	 * @async
	 *
	 * @type {String} broadcasterId
	 * @type {String} transportId
	 * @type {String} kind - 'audio' or 'video' kind for the Producer.
	 * @type {RTCRtpParameters} rtpParameters - RTP parameters for the Producer.
	 */
	async createBroadcasterProducer(
		{
			broadcasterId,
			transportId,
			kind,
			rtpParameters
		}
	)
	{
		const broadcaster = this._broadcasters.get(broadcasterId);

		if (!broadcaster)
			throw new Error(`broadcaster with id "${broadcasterId}" does not exist`);

		const transport = broadcaster.data.transports.get(transportId);

		if (!transport)
			throw new Error(`transport with id "${transportId}" does not exist`);

		const producer =
			await transport.produce({ kind, rtpParameters });

		// Store it.
		broadcaster.data.producers.set(producer.id, producer);

		// Set Producer events.
		// producer.on('score', (score) =>
		// {
		// 	logger.debug(
		// 		'broadcaster producer "score" event [producerId:%s, score:%o]',
		// 		producer.id, score);
		// });

		producer.on('videoorientationchange', (videoOrientation) =>
		{
			logger.debug(
				'broadcaster producer "videoorientationchange" event [producerId:%s, videoOrientation:%o]',
				producer.id, videoOrientation);
		});

		// Optimization: Create a server-side Consumer for each Peer.
		for (const peer of this._getJoinedPeers())
		{
			this._createConsumer(
				{
					consumerPeer : peer,
					producerPeer : broadcaster,
					producer
				});
		}

		// Add into the AudioLevelObserver and ActiveSpeakerObserver.
		if (producer.kind === 'audio')
		{
			this._audioLevelObserver.addProducer({ producerId: producer.id })
				.catch(() => {});

			this._activeSpeakerObserver.addProducer({ producerId: producer.id })
				.catch(() => {});
		}
		
		
		return { id: producer.id };
	}

	/**
	 * Create a mediasoup Consumer associated to a Broadcaster.
	 *
	 * @async
	 *
	 * @type {String} broadcasterId
	 * @type {String} transportId
	 * @type {String} producerId
	 */
	async createBroadcasterConsumer(
		{
			broadcasterId,
			transportId,
			producerId
		}
	)
	{
		const broadcaster = this._broadcasters.get(broadcasterId);

		if (!broadcaster)
			throw new Error(`broadcaster with id "${broadcasterId}" does not exist`);

		if (!broadcaster.data.rtpCapabilities)
			throw new Error('broadcaster does not have rtpCapabilities');

		const transport = broadcaster.data.transports.get(transportId);

		if (!transport)
			throw new Error(`transport with id "${transportId}" does not exist`);

		const consumer = await transport.consume(
			{
				producerId,
				rtpCapabilities : broadcaster.data.rtpCapabilities
			});

		// Store it.
		broadcaster.data.consumers.set(consumer.id, consumer);

		// Set Consumer events.
		consumer.on('transportclose', () =>
		{
			// Remove from its map.
			broadcaster.data.consumers.delete(consumer.id);
		});

		consumer.on('producerclose', () =>
		{
			// Remove from its map.
			broadcaster.data.consumers.delete(consumer.id);
		});

		return {
			id            : consumer.id,
			producerId,
			kind          : consumer.kind,
			rtpParameters : consumer.rtpParameters,
			type          : consumer.type
		};
	}

	/**
	 * Create a mediasoup DataConsumer associated to a Broadcaster.
	 *
	 * @async
	 *
	 * @type {String} broadcasterId
	 * @type {String} transportId
	 * @type {String} dataProducerId
	 */
	async createBroadcasterDataConsumer(
		{
			broadcasterId,
			transportId,
			dataProducerId
		}
	)
	{
		const broadcaster = this._broadcasters.get(broadcasterId);

		if (!broadcaster)
			throw new Error(`broadcaster with id "${broadcasterId}" does not exist`);

		if (!broadcaster.data.rtpCapabilities)
			throw new Error('broadcaster does not have rtpCapabilities');

		const transport = broadcaster.data.transports.get(transportId);

		if (!transport)
			throw new Error(`transport with id "${transportId}" does not exist`);

		const dataConsumer = await transport.consumeData(
			{
				dataProducerId
			});

		// Store it.
		broadcaster.data.dataConsumers.set(dataConsumer.id, dataConsumer);

		// Set Consumer events.
		dataConsumer.on('transportclose', () =>
		{
			// Remove from its map.
			broadcaster.data.dataConsumers.delete(dataConsumer.id);
		});

		dataConsumer.on('dataproducerclose', () =>
		{
			// Remove from its map.
			broadcaster.data.dataConsumers.delete(dataConsumer.id);
		});

		return {
			id       : dataConsumer.id,
			streamId : dataConsumer.sctpStreamParameters.streamId
		};
	}

	/**
	 * Create a mediasoup DataProducer associated to a Broadcaster.
	 *
	 * @async
	 *
	 * @type {String} broadcasterId
	 * @type {String} transportId
	 */
	async createBroadcasterDataProducer(
		{
			broadcasterId,
			transportId,
			label,
			protocol,
			sctpStreamParameters,
			appData
		}
	)
	{
		const broadcaster = this._broadcasters.get(broadcasterId);

		if (!broadcaster)
			throw new Error(`broadcaster with id "${broadcasterId}" does not exist`);

		// if (!broadcaster.data.sctpCapabilities)
		// 	throw new Error('broadcaster does not have sctpCapabilities');

		const transport = broadcaster.data.transports.get(transportId);

		if (!transport)
			throw new Error(`transport with id "${transportId}" does not exist`);

		const dataProducer = await transport.produceData(
			{
				sctpStreamParameters,
				label,
				protocol,
				appData
			});

		// Store it.
		broadcaster.data.dataProducers.set(dataProducer.id, dataProducer);

		// Set Consumer events.
		dataProducer.on('transportclose', () =>
		{
			// Remove from its map.
			broadcaster.data.dataProducers.delete(dataProducer.id);
		});

		// // Optimization: Create a server-side Consumer for each Peer.
		// for (const peer of this._getJoinedPeers())
		// {
		// 	this._createDataConsumer(
		// 		{
		// 			dataConsumerPeer : peer,
		// 			dataProducerPeer : broadcaster,
		// 			dataProducer: dataProducer
		// 		});
		// }

		return {
			id : dataProducer.id
		};
	}

	_handleAudioLevelObserver()
	{
		this._audioLevelObserver.on('volumes', (volumes) =>
		{
			const { producer, volume } = volumes[0];

			logger.debug(
				'audioLevelObserver "volumes" event [producerId:%s, volume:%s]',
				producer.id, volume);

			// Notify all Peers.
			for (const peer of this._getJoinedPeers())
			{
				peer.notify(
					'activeSpeaker',
					{
						peerId : producer.appData.peerId,
						volume : volume
					})
					.catch(() => {});
			}
		});

		this._audioLevelObserver.on('silence', () =>
		{
			logger.debug('audioLevelObserver "silence" event');

			// Notify all Peers.
			for (const peer of this._getJoinedPeers())
			{
				peer.notify('activeSpeaker', { peerId: null })
					.catch(() => {});
			}
		});
	}

	_handleActiveSpeakerObserver()
	{
		this._activeSpeakerObserver.on('dominantspeaker', (dominantSpeaker) =>
		{
			logger.debug(
				'activeSpeakerObserver "dominantspeaker" event [producerId:%s]',
				dominantSpeaker.producer.id);
		});
	}

	/**
	 * Handle protoo requests from browsers.
	 *
	 * @async
	 */
	async _handleProtooRequest(peer, request, accept, reject)
	{
		switch (request.method)
		{
			case 'getRouterRtpCapabilities':
			{
				accept(this._mediasoupRouter.rtpCapabilities);

				break;
			}


			case 'join':
			{
				// Ensure the Peer is not already joined.
				if (peer.data.joined)
					throw new Error('Peer already joined');

				const {
					displayName,
					device,
					rtpCapabilities,
					sctpCapabilities
				} = request.data;

				// Store client data into the protoo Peer data object.
				peer.data.joined = true;
				peer.data.displayName = displayName;
				peer.data.device = device;
				peer.data.rtpCapabilities = rtpCapabilities;
				peer.data.sctpCapabilities = sctpCapabilities;

				// Tell the new Peer about already joined Peers.
				// And also create Consumers for existing Producers.

				const joinedPeers =
				[
					...this._getJoinedPeers(),
					...this._broadcasters.values()
				];

				// Reply now the request with the list of joined peers (all but the new one).
				const peerInfos = joinedPeers
					.filter((joinedPeer) => joinedPeer.id !== peer.id)
					.map((joinedPeer) => ({
						id          : joinedPeer.id,
						displayName : joinedPeer.data.displayName,
						device      : joinedPeer.data.device
					}));

				accept({ peers: peerInfos });

				// Mark the new Peer as joined.
				peer.data.joined = true;

				for (const joinedPeer of joinedPeers)
				{
					// Create Consumers for existing Producers.
					for (const producer of joinedPeer.data.producers.values())
					{
						this._createConsumer(
							{
								consumerPeer : peer,
								producerPeer : joinedPeer,
								producer
							});
					}

					// Create DataConsumers for existing DataProducers.
					for (const dataProducer of joinedPeer.data.dataProducers.values())
					{
						if (dataProducer.label === 'bot')
							continue;

						this._createDataConsumer(
							{
								dataConsumerPeer : peer,
								dataProducerPeer : joinedPeer,
								dataProducer
							});
					}
				}

				// Create DataConsumers for bot DataProducer.
				this._createDataConsumer(
					{
						dataConsumerPeer : peer,
						dataProducerPeer : null,
						dataProducer     : this._bot.dataProducer
					});

				// Notify the new Peer to all other Peers.
				for (const otherPeer of this._getJoinedPeers({ excludePeer: peer }))
				{
					otherPeer.notify(
						'newPeer',
						{
							id          : peer.id,
							displayName : peer.data.displayName,
							device      : peer.data.device
						})
						.catch(() => {});
				}

				break;
			}

			case 'createWebRtcTransport':
			{
				// NOTE: Don't require that the Peer is joined here, so the client can
				// initiate mediasoup Transports and be ready when he later joins.

				const {
					forceTcp,
					producing,
					consuming,
					sctpCapabilities
				} = request.data;

				const webRtcTransportOptions =
				{
					...utils.clone(config.mediasoup.webRtcTransportOptions),
					webRtcServer      : this._webRtcServer,
					iceConsentTimeout : 20,
					enableSctp        : Boolean(sctpCapabilities),
					numSctpStreams    : (sctpCapabilities || {}).numStreams,
					appData           : { producing, consuming }
				};

				if (forceTcp)
				{
					webRtcTransportOptions.listenInfos = webRtcTransportOptions.listenInfos
						.filter((listenInfo) => listenInfo.protocol === 'tcp');

					webRtcTransportOptions.enableUdp = false;
					webRtcTransportOptions.enableTcp = true;
				}

				const transport =
					await this._mediasoupRouter.createWebRtcTransport(webRtcTransportOptions);

				transport.on('icestatechange', (iceState) =>
				{
					if (iceState === 'disconnected' || iceState === 'closed')
					{
						logger.warn('WebRtcTransport "icestatechange" event [iceState:%s], closing peer', iceState);

						peer.close();
					}
				});

				transport.on('sctpstatechange', (sctpState) =>
				{
					logger.debug('WebRtcTransport "sctpstatechange" event [sctpState:%s]', sctpState);
				});

				transport.on('dtlsstatechange', (dtlsState) =>
				{
					if (dtlsState === 'failed' || dtlsState === 'closed')
					{
						logger.warn('WebRtcTransport "dtlsstatechange" event [dtlsState:%s], closing peer', dtlsState);

						peer.close();
					}
				});

				// NOTE: For testing.
				// await transport.enableTraceEvent([ 'probation', 'bwe' ]);
				await transport.enableTraceEvent([ 'bwe' ]);

				transport.on('trace', (trace) =>
				{
					logger.debug(
						'transport "trace" event [transportId:%s, trace.type:%s, trace:%o]',
						transport.id, trace.type, trace);

					if (trace.type === 'bwe' && trace.direction === 'out')
					{
						peer.notify(
							'downlinkBwe',
							{
								desiredBitrate          : trace.info.desiredBitrate,
								effectiveDesiredBitrate : trace.info.effectiveDesiredBitrate,
								availableBitrate        : trace.info.availableBitrate
							})
							.catch(() => {});
					}
				});

				// Store the WebRtcTransport into the protoo Peer data Object.
				peer.data.transports.set(transport.id, transport);

				accept(
					{
						id             : transport.id,
						iceParameters  : transport.iceParameters,
						iceCandidates  : transport.iceCandidates,
						dtlsParameters : transport.dtlsParameters,
						sctpParameters : transport.sctpParameters
					});

				const { maxIncomingBitrate } = config.mediasoup.webRtcTransportOptions;

				// If set, apply max incoming bitrate limit.
				if (maxIncomingBitrate)
				{
					try { await transport.setMaxIncomingBitrate(maxIncomingBitrate); }
					catch (error) {}
				}

				break;
			}

			case 'connectWebRtcTransport':
			{
				const { transportId, dtlsParameters } = request.data;
				const transport = peer.data.transports.get(transportId);

				if (!transport)
					throw new Error(`transport with id "${transportId}" not found`);

				await transport.connect({ dtlsParameters });

				accept();

				break;
			}

			case 'restartIce':
			{
				const { transportId } = request.data;
				const transport = peer.data.transports.get(transportId);

				if (!transport)
					throw new Error(`transport with id "${transportId}" not found`);

				const iceParameters = await transport.restartIce();

				accept(iceParameters);

				break;
			}

			case 'produce':
			{
				// Ensure the Peer is joined.
				if (!peer.data.joined)
					throw new Error('Peer not yet joined');

				const { transportId, kind, rtpParameters } = request.data;
				let { appData } = request.data;
				const transport = peer.data.transports.get(transportId);

				if (!transport)
					throw new Error(`transport with id "${transportId}" not found`);

				// Add peerId into appData to later get the associated Peer during
				// the 'loudest' event of the audioLevelObserver.
				appData = { ...appData, peerId: peer.id };

				const producer = await transport.produce(
					{
						kind,
						rtpParameters,
						appData
						// keyFrameRequestDelay: 5000
					});

				// Store the Producer into the protoo Peer data Object.
				peer.data.producers.set(producer.id, producer);


				

				// Set Producer events.
				producer.on('score', (score) =>
				{
					// logger.debug(
					// 	'producer "score" event [producerId:%s, score:%o]',
					// 	producer.id, score);

					peer.notify('producerScore', { producerId: producer.id, score })
						.catch(() => {});
				});

				producer.on('videoorientationchange', (videoOrientation) =>
				{
					logger.debug(
						'producer "videoorientationchange" event [producerId:%s, videoOrientation:%o]',
						producer.id, videoOrientation);
				});

				// NOTE: For testing.
				// await producer.enableTraceEvent([ 'rtp', 'keyframe', 'nack', 'pli', 'fir' ]);
				// await producer.enableTraceEvent([ 'pli', 'fir' ]);
				// await producer.enableTraceEvent([ 'keyframe' ]);

				await producer.enableTraceEvent(['rtp', 'keyframe', 'pli', 'fir', 'nack']);

				producer.on('trace', (trace) => {
					if (trace.type === 'rtp') {
						const rtpPacket = trace.info.rtpPacket;

						if (!rtpPacket) {
							logger.error('rtpPacket is undefined');
							return;
						}

						// try {
						// 	// Convert payload to Uint8Array if it's a buffer
						// 	const payloadArray = rtpPacket.payload ? Array.from(new Uint8Array(rtpPacket.payload)) : [];
			
						// 	logger.debug('RTP Packet Payload:', payloadArray);
			
						// 	const audioData = {
						// 		timestamp: rtpPacket.timestamp,
						// 		sequenceNumber: rtpPacket.sequenceNumber,
						// 		payloadType: rtpPacket.payloadType,
						// 		marker: rtpPacket.marker,
						// 		ssrc: rtpPacket.ssrc,
						// 		payload: payloadArray
						// 	};
			
						// 	axios.post('http://10.0.0.124:5002/audio', audioData)
						// 		.then(() => {
						// 			logger.info('Audio data sent to Flask server');
						// 		})
						// 		.catch((error) => {
						// 			logger.error('Error sending audio data to Flask server:', error);
						// 		});
						// } catch (error) {
						// 	logger.error('Error processing trace payload:', error);
						// }
						
						
					}
				});
				accept({ id: producer.id });

				// Optimization: Create a server-side Consumer for each Peer.
				for (const otherPeer of this._getJoinedPeers({ excludePeer: peer }))
				{
					this._createConsumer(
						{
							consumerPeer : otherPeer,
							producerPeer : peer,
							producer
						});
				}

				/* Test rtpjs lib. */

				// const directTransport = await this._mediasoupRouter.createDirectTransport();

				// directTransport.on('rtcp', (buffer) =>
				// {
				// 	const rtcpPacket =
				// 		new rtp.packets.CompoundPacket(rtp.utils.nodeBufferToDataView(buffer));

				// 	logger.info('RTCP packet');
				// 	logger.info(rtcpPacket.dump());
				// });

				// const directConsumer = await directTransport.consume(
				// 	{
				// 		producerId      : producer.id,
				// 		rtpCapabilities : this._mediasoupRouter.rtpCapabilities
				// 	}
				// );

				// const directProducer = await directTransport.produce(
				// 	{
				// 		kind          : directConsumer.kind,
				// 		rtpParameters : directConsumer.rtpParameters
				// 	});

				// directConsumer.on('rtp', (buffer) =>
				// {
				// 	const rtpPacket =
				// 		new rtp.packets.RtpPacket(rtp.utils.nodeBufferToDataView(buffer));

				// 	logger.info('RTP packet');
				// 	logger.info(rtpPacket.dump());

				// 	directProducer.send(buffer);
				// });


				// Add into the AudioLevelObserver and ActiveSpeakerObserver.
				if (producer.kind === 'audio')
				{
					this._audioLevelObserver.addProducer({ producerId: producer.id })
						.catch(() => {});

					this._activeSpeakerObserver.addProducer({ producerId: producer.id })
						.catch(() => {});
				
					
					this.startRecording(producer).catch((error) => {
						console.error('Failed to start recording:', error);
					});
					
				}

				break;
			}

			case 'closeProducer':
			{
				// Ensure the Peer is joined.
				if (!peer.data.joined)
					throw new Error('Peer not yet joined');

				const { producerId } = request.data;
				const producer = peer.data.producers.get(producerId);

				if (!producer)
					throw new Error(`producer with id "${producerId}" not found`);

				producer.close();

				// Remove from its map.
				peer.data.producers.delete(producer.id);

				accept();

				break;
			}

			case 'pauseProducer':
			{
				// Ensure the Peer is joined.
				if (!peer.data.joined)
					throw new Error('Peer not yet joined');

				const { producerId } = request.data;
				const producer = peer.data.producers.get(producerId);

				if (!producer)
					throw new Error(`producer with id "${producerId}" not found`);

				// await producer.pause();

				accept();

				break;
			}

			case 'resumeProducer':
			{
				// Ensure the Peer is joined.
				if (!peer.data.joined)
					throw new Error('Peer not yet joined');

				const { producerId } = request.data;
				const producer = peer.data.producers.get(producerId);

				if (!producer)
					throw new Error(`producer with id "${producerId}" not found`);

				await producer.resume();

				accept();

				break;
			}

			case 'pauseConsumer':
			{
				// Ensure the Peer is joined.
				if (!peer.data.joined)
					throw new Error('Peer not yet joined');

				const { consumerId } = request.data;
				const consumer = peer.data.consumers.get(consumerId);

				if (!consumer)
					throw new Error(`consumer with id "${consumerId}" not found`);

				await consumer.pause();

				accept();

				break;
			}

			case 'resumeConsumer':
			{
				// Ensure the Peer is joined.
				if (!peer.data.joined)
					throw new Error('Peer not yet joined');

				const { consumerId } = request.data;
				const consumer = peer.data.consumers.get(consumerId);

				if (!consumer)
					throw new Error(`consumer with id "${consumerId}" not found`);

				await consumer.resume();

				accept();

				break;
			}

			case 'setConsumerPreferredLayers':
			{
				// Ensure the Peer is joined.
				if (!peer.data.joined)
					throw new Error('Peer not yet joined');

				const { consumerId, spatialLayer, temporalLayer } = request.data;
				const consumer = peer.data.consumers.get(consumerId);

				if (!consumer)
					throw new Error(`consumer with id "${consumerId}" not found`);

				await consumer.setPreferredLayers({ spatialLayer, temporalLayer });

				accept();

				break;
			}

			case 'setConsumerPriority':
			{
				// Ensure the Peer is joined.
				if (!peer.data.joined)
					throw new Error('Peer not yet joined');

				const { consumerId, priority } = request.data;
				const consumer = peer.data.consumers.get(consumerId);

				if (!consumer)
					throw new Error(`consumer with id "${consumerId}" not found`);

				await consumer.setPriority(priority);

				accept();

				break;
			}

			case 'requestConsumerKeyFrame':
			{
				// Ensure the Peer is joined.
				if (!peer.data.joined)
					throw new Error('Peer not yet joined');

				const { consumerId } = request.data;
				const consumer = peer.data.consumers.get(consumerId);

				if (!consumer)
					throw new Error(`consumer with id "${consumerId}" not found`);

				await consumer.requestKeyFrame();

				accept();

				break;
			}

			case 'produceData':
			{
				// Ensure the Peer is joined.
				if (!peer.data.joined)
					throw new Error('Peer not yet joined');

				const {
					transportId,
					sctpStreamParameters,
					label,
					protocol,
					appData
				} = request.data;

				const transport = peer.data.transports.get(transportId);

				if (!transport)
					throw new Error(`transport with id "${transportId}" not found`);

				const dataProducer = await transport.produceData(
					{
						sctpStreamParameters,
						label,
						protocol,
						appData
					});

				// Store the Producer into the protoo Peer data Object.
				peer.data.dataProducers.set(dataProducer.id, dataProducer);

				accept({ id: dataProducer.id });

				switch (dataProducer.label)
				{
					case 'chat':
					{
						// Create a server-side DataConsumer for each Peer.
						for (const otherPeer of this._getJoinedPeers({ excludePeer: peer }))
						{
							this._createDataConsumer(
								{
									dataConsumerPeer : otherPeer,
									dataProducerPeer : peer,
									dataProducer
								});
						}

						break;
					}

					case 'bot':
					{
						// Pass it to the bot.
						this._bot.handlePeerDataProducer(
							{
								dataProducerId : dataProducer.id,
								peer
							});

						break;
					}
				}

				break;
			}

			case 'changeDisplayName':
			{
				// Ensure the Peer is joined.
				if (!peer.data.joined)
					throw new Error('Peer not yet joined');

				const { displayName } = request.data;
				const oldDisplayName = peer.data.displayName;

				// Store the display name into the custom data Object of the protoo
				// Peer.
				peer.data.displayName = displayName;

				// Notify other joined Peers.
				for (const otherPeer of this._getJoinedPeers({ excludePeer: peer }))
				{
					otherPeer.notify(
						'peerDisplayNameChanged',
						{
							peerId : peer.id,
							displayName,
							oldDisplayName
						})
						.catch(() => {});
				}

				accept();

				break;
			}

			case 'getTransportStats':
			{
				const { transportId } = request.data;
				const transport = peer.data.transports.get(transportId);

				if (!transport)
					throw new Error(`transport with id "${transportId}" not found`);

				const stats = await transport.getStats();

				accept(stats);

				break;
			}

			case 'getProducerStats':
			{
				const { producerId } = request.data;
				const producer = peer.data.producers.get(producerId);

				if (!producer)
					throw new Error(`producer with id "${producerId}" not found`);

				const stats = await producer.getStats();

				accept(stats);

				break;
			}

			case 'getCdsQa':
			{
				// check if cdsQaData is null or not
				if (!this._cdsQaData) {
					throw new Error(`No cds_qa data available`);
				}

				// we send the data back to the client
				accept(this._cdsQaData);

				break;
			}

			case 'getCdsDdx':
			{
				// check if cdsQaData is null or not
				if (!this._cdsDdxData) {
					throw new Error(`No cds_qa data available`);
				}

				// we send the data back to the client
				accept(this._cdsDdxData);

				break;
			}

			case 'getCdsHpi':
			{
				// check if cdsQaData is null or not
				if (!this._cdsHpiData) {
					throw new Error(`No cds_qa data available`);
				}

				// we send the data back to the client
				accept(this._cdsHpiData);

				break;
			}

			case 'getTranscript':
			{
				// check if transcript is null or not
				if (!this._cdsHpiData) {
					throw new Error(`No transcript available`);
				}

				// we send the data back to the client
				accept(this._transcript);

				break;
			}

			case 'getConsumerStats':
			{
				const { consumerId } = request.data;
				const consumer = peer.data.consumers.get(consumerId);

				if (!consumer)
					throw new Error(`consumer with id "${consumerId}" not found`);

				const stats = await consumer.getStats();

				accept(stats);

				break;
			}

			case 'getDataProducerStats':
			{
				const { dataProducerId } = request.data;
				const dataProducer = peer.data.dataProducers.get(dataProducerId);

				if (!dataProducer)
					throw new Error(`dataProducer with id "${dataProducerId}" not found`);

				const stats = await dataProducer.getStats();

				accept(stats);

				break;
			}

			case 'getDataConsumerStats':
			{
				const { dataConsumerId } = request.data;
				const dataConsumer = peer.data.dataConsumers.get(dataConsumerId);

				if (!dataConsumer)
					throw new Error(`dataConsumer with id "${dataConsumerId}" not found`);

				const stats = await dataConsumer.getStats();

				accept(stats);

				break;
			}

			case 'applyNetworkThrottle':
			{
				const DefaultUplink = 1000000;
				const DefaultDownlink = 1000000;
				const DefaultRtt = 0;
				const DefaultPacketLoss = 0;

				const { secret, uplink, downlink, rtt, packetLoss } = request.data;

				if (!secret || secret !== process.env.NETWORK_THROTTLE_SECRET)
				{
					reject(403, 'operation NOT allowed, modda fuckaa');

					return;
				}

				try
				{
					this._networkThrottled = true;

					await throttle.start(
						{
							up         : uplink || DefaultUplink,
							down       : downlink || DefaultDownlink,
							rtt        : rtt || DefaultRtt,
							packetLoss : packetLoss || DefaultPacketLoss
						});

					logger.warn(
						'network throttle set [uplink:%s, downlink:%s, rtt:%s, packetLoss:%s]',
						uplink || DefaultUplink,
						downlink || DefaultDownlink,
						rtt || DefaultRtt,
						packetLoss || DefaultPacketLoss);

					accept();
				}
				catch (error)
				{
					logger.error('network throttle apply failed: %o', error);

					reject(500, error.toString());
				}

				break;
			}

			case 'resetNetworkThrottle':
			{
				const { secret } = request.data;

				if (!secret || secret !== process.env.NETWORK_THROTTLE_SECRET)
				{
					reject(403, 'operation NOT allowed, modda fuckaa');

					return;
				}

				try
				{
					await throttle.stop({});

					logger.warn('network throttle stopped');

					accept();
				}
				catch (error)
				{
					logger.error('network throttle stop failed: %o', error);

					reject(500, error.toString());
				}

				break;
			}

			default:
			{
				logger.error('unknown request.method "%s"', request.method);

				reject(500, `unknown request.method "${request.method}"`);
			}
		}
	}

	/**
	 * Helper to get the list of joined protoo peers.
	 */
	_getJoinedPeers({ excludePeer = undefined } = {})
	{
		return this._protooRoom.peers
			.filter((peer) => peer.data.joined && peer !== excludePeer);
	}

	/**
	 * Creates a mediasoup Consumer for the given mediasoup Producer.
	 *
	 * @async
	 */
	async _createConsumer({ consumerPeer, producerPeer, producer })
	{
		// Optimization:
		// - Create the server-side Consumer in paused mode.
		// - Tell its Peer about it and wait for its response.
		// - Upon receipt of the response, resume the server-side Consumer.
		// - If video, this will mean a single key frame requested by the
		//   server-side Consumer (when resuming it).
		// - If audio (or video), it will avoid that RTP packets are received by the
		//   remote endpoint *before* the Consumer is locally created in the endpoint
		//   (and before the local SDP O/A procedure ends). If that happens (RTP
		//   packets are received before the SDP O/A is done) the PeerConnection may
		//   fail to associate the RTP stream.

		// NOTE: Don't create the Consumer if the remote Peer cannot consume it.
		if (
			!consumerPeer.data.rtpCapabilities ||
			!this._mediasoupRouter.canConsume(
				{
					producerId      : producer.id,
					rtpCapabilities : consumerPeer.data.rtpCapabilities
				})
		)
		{
			return;
		}

		// Must take the Transport the remote Peer is using for consuming.
		const transport = Array.from(consumerPeer.data.transports.values())
			.find((t) => t.appData.consuming);

		// This should not happen.
		if (!transport)
		{
			logger.warn('_createConsumer() | Transport for consuming not found');

			return;
		}

		const promises = [];

		const consumerCount = 1 + this._consumerReplicas;

		for (let i=0; i<consumerCount; i++)
		{
			promises.push(
				(async () =>
				{
					// Create the Consumer in paused mode.
					let consumer;

					try
					{
						consumer = await transport.consume(
							{
								producerId      : producer.id,
								rtpCapabilities : consumerPeer.data.rtpCapabilities,
								// Enable NACK for OPUS.
								enableRtx       : true,
								paused          : true
							});
					}
					catch (error)
					{
						logger.warn('_createConsumer() | transport.consume():%o', error);

						return;
					}

					// Store the Consumer into the protoo consumerPeer data Object.
					consumerPeer.data.consumers.set(consumer.id, consumer);

					// Set Consumer events.
					consumer.on('transportclose', () =>
					{
						// Remove from its map.
						consumerPeer.data.consumers.delete(consumer.id);
					});

					consumer.on('producerclose', () =>
					{
						// Remove from its map.
						consumerPeer.data.consumers.delete(consumer.id);

						consumerPeer.notify('consumerClosed', { consumerId: consumer.id })
							.catch(() => {});
					});

					consumer.on('producerpause', () =>
					{
						consumerPeer.notify('consumerPaused', { consumerId: consumer.id })
							.catch(() => {});
					});

					consumer.on('producerresume', () =>
					{
						consumerPeer.notify('consumerResumed', { consumerId: consumer.id })
							.catch(() => {});
					});

					consumer.on('score', (score) =>
					{
						// logger.debug(
						//	 'consumer "score" event [consumerId:%s, score:%o]',
						//	 consumer.id, score);

						consumerPeer.notify('consumerScore', { consumerId: consumer.id, score })
							.catch(() => {});
					});

					consumer.on('layerschange', (layers) =>
					{
						consumerPeer.notify(
							'consumerLayersChanged',
							{
								consumerId    : consumer.id,
								spatialLayer  : layers ? layers.spatialLayer : null,
								temporalLayer : layers ? layers.temporalLayer : null
							})
							.catch(() => {});
					});

					// NOTE: For testing.
					// await consumer.enableTraceEvent([ 'rtp', 'keyframe', 'nack', 'pli', 'fir' ]);
					// await consumer.enableTraceEvent([ 'pli', 'fir' ]);
					// await consumer.enableTraceEvent([ 'keyframe' ]);

					consumer.on('trace', (trace) =>
					{
						logger.debug(
							'consumer "trace" event [producerId:%s, trace.type:%s, trace:%o]',
							consumer.id, trace.type, trace);
					});

					// Send a protoo request to the remote Peer with Consumer parameters.
					try
					{
						await consumerPeer.request(
							'newConsumer',
							{
								peerId         : producerPeer.id,
								producerId     : producer.id,
								id             : consumer.id,
								kind           : consumer.kind,
								rtpParameters  : consumer.rtpParameters,
								type           : consumer.type,
								appData        : producer.appData,
								producerPaused : consumer.producerPaused
							});

						// Now that we got the positive response from the remote endpoint, resume
						// the Consumer so the remote endpoint will receive the a first RTP packet
						// of this new stream once its PeerConnection is already ready to process
						// and associate it.
						await consumer.resume();

						consumerPeer.notify(
							'consumerScore',
							{
								consumerId : consumer.id,
								score      : consumer.score
							})
							.catch(() => {});
					}
					catch (error)
					{
						logger.warn('_createConsumer() | failed:%o', error);
					}
				})()
			);
		}

		try
		{
			await Promise.all(promises);
		}
		catch (error)
		{
			logger.warn('_createConsumer() | failed:%o', error);
		}
	}

	/**
	 * Creates a mediasoup DataConsumer for the given mediasoup DataProducer.
	 *
	 * @async
	 */
	async _createDataConsumer(
		{
			dataConsumerPeer,
			dataProducerPeer = null, // This is null for the bot DataProducer.
			dataProducer
		})
	{
		// NOTE: Don't create the DataConsumer if the remote Peer cannot consume it.
		if (!dataConsumerPeer.data.sctpCapabilities)
			return;

		// Must take the Transport the remote Peer is using for consuming.
		const transport = Array.from(dataConsumerPeer.data.transports.values())
			.find((t) => t.appData.consuming);

		// This should not happen.
		if (!transport)
		{
			logger.warn('_createDataConsumer() | Transport for consuming not found');

			return;
		}

		// Create the DataConsumer.
		let dataConsumer;

		try
		{
			dataConsumer = await transport.consumeData(
				{
					dataProducerId : dataProducer.id
				});
		}
		catch (error)
		{
			logger.warn('_createDataConsumer() | transport.consumeData():%o', error);

			return;
		}

		// Store the DataConsumer into the protoo dataConsumerPeer data Object.
		dataConsumerPeer.data.dataConsumers.set(dataConsumer.id, dataConsumer);

		// Set DataConsumer events.
		dataConsumer.on('transportclose', () =>
		{
			// Remove from its map.
			dataConsumerPeer.data.dataConsumers.delete(dataConsumer.id);
		});

		dataConsumer.on('dataproducerclose', () =>
		{
			// Remove from its map.
			dataConsumerPeer.data.dataConsumers.delete(dataConsumer.id);

			dataConsumerPeer.notify(
				'dataConsumerClosed', { dataConsumerId: dataConsumer.id })
				.catch(() => {});
		});

		// Send a protoo request to the remote Peer with Consumer parameters.
		try
		{
			await dataConsumerPeer.request(
				'newDataConsumer',
				{
					// This is null for bot DataProducer.
					peerId               : dataProducerPeer ? dataProducerPeer.id : null,
					dataProducerId       : dataProducer.id,
					id                   : dataConsumer.id,
					sctpStreamParameters : dataConsumer.sctpStreamParameters,
					label                : dataConsumer.label,
					protocol             : dataConsumer.protocol,
					appData              : dataProducer.appData
				});
		}
		catch (error)
		{
			logger.warn('_createDataConsumer() | failed:%o', error);
		}
	}
	/**
	* Check if a port is available.
	* @param {number} port - The port number to check.
	* @returns {Promise<boolean>} - A promise that resolves to true if the port is available, false otherwise.
	*/
	async isPortAvailable(port) {
		return new Promise((resolve) => {
		const server = net.createServer();
	
		server.once('error', () => {
			resolve(false); // Port is not available
		});
	
		server.once('listening', () => {
			server.close(() => {
			resolve(true); // Port is available
			});
		});
	
		server.listen(port);
		});
	}
  
   /**
   * Get an even random available port in a specified range and its next port (for RTCP).
   * @param {number} min - The minimum port number in the range.
   * @param {number} max - The maximum port number in the range.
   * @returns {Promise<{ audioPort: number, rtcpPort: number }>} - A promise that resolves to an object containing the available audio and RTCP ports.
   */
  	async getRandomAvailableEvenPortPair(min, max) {
		while (true) {
			// Ensure the selected port is even
			const audioPort = Math.floor(Math.random() * ((max - min) / 2)) * 2 + min;
			const rtcpPort = audioPort + 1;
		
			// Check if both ports are available
			if (await this.isPortAvailable(audioPort)) {
				return { audioPort, rtcpPort };
			}
		}
  	}
	// we can process data here
	async handleSocketData(eventType, data) {
		switch (eventType) {
		  case 'cds_ddx':
			this.processDdxData(data);
			break;
		  case 'cds_qa':
			this.processQaData(data);
			break;
		  case 'cds_hpi':
			this.processHpiData(data);
			break;
		  case 'transcript':
			this.processTranscript(data);
			break;
		  default:
			console.warn(`Unknown event type: ${eventType}`);
			break;
		}
	}
	
	// Process Data and send this to Frontend
	processDdxData(data) {
		console.log('Processing DDX data:', data);
		this._cdsDdxData = data;
		
	}

	
	processQaData(data) {
		console.log('Processing QA data:', data);
		this._cdsQaData = data;
	
	}

	
	processHpiData(data) {
		console.log('Processing HPI data:', data);
		this._cdsHpiData = data;
	}

	processTranscript(data) {
		console.log('Processing Transcript', data);
		this._transcript = data;
	}
	
}




module.exports = Room;
