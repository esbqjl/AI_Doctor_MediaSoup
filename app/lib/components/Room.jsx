import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import ReactTooltip from 'react-tooltip';
import classnames from 'classnames';
import clipboardCopy from 'clipboard-copy';
import * as appPropTypes from './appPropTypes';
import { withRoomContext } from '../RoomContext';
import * as requestActions from '../redux/requestActions';
import { Appear } from './transitions';
import Me from './Me';
import Peers from './Peers';
import Stats from './Stats';
import Ai from './Ai';
import Notifications from './Notifications';
import NetworkThrottle from './NetworkThrottle';


import { IoIosMic, IoIosMicOff } from 'react-icons/io';
import { FaVideo, FaVideoSlash } from 'react-icons/fa6';

import Draggable from 'react-draggable';

class Room extends React.Component
{
	render()
	{
		const {
			roomClient,
			room,
			me,
			amActiveSpeaker,
			onRoomLinkCopy
		} = this.props;

		const mediasoupClientVersion = room.mediasoupClientVersion === '__MEDIASOUP_CLIENT_VERSION__'
			? 'dev'
			: room.mediasoupClientVersion;

		
		const isAudioMuted = me.audioMuted;
		const isVideoOff = !me.videoVisible;

		return (
			<Appear duration={300}>
				<div data-component='Room'>
					<Notifications />

					<div className='state'>
						<div className={classnames('icon', room.state)} />
						<p className={classnames('text', room.state)}>{room.state}</p>
					</div>

					<div className='info'>
						<p className='text'><span className='label'>server:&nbsp;&nbsp;</span>{room.mediasoupVersion}</p>
						<p className='text'><span className='label'>client:&nbsp;&nbsp;</span>{mediasoupClientVersion}</p>
						<p className='text'><span className='label'>handler:&nbsp;&nbsp;</span>{room.mediasoupClientHandler}</p>
					</div>

					<div className='room-link-wrapper'>
						<div className='room-link'>
							<a
								className='link'
								href={room.url}
								target='_blank'
								rel='noopener noreferrer'
								onClick={(event) =>
								{
									
									if (
										event.ctrlKey || event.shiftKey || event.metaKey ||
										(event.button && event.button === 1)
									)
									{
										return;
									}

									event.preventDefault();

									clipboardCopy(room.url)
										.then(onRoomLinkCopy);
								}}
							>
								invitation link
							</a>
						</div>
					</div>

					<Peers />

					
					<Draggable>
						<div
							className={classnames('me-container', {
								'active-speaker': amActiveSpeaker
							})}
						>
							
							<div className='controls'>
								<button
									className='control-button'
									onClick={() =>
									{
										isAudioMuted
											? roomClient.unmuteMic()
											: roomClient.muteMic();
									}}
								>
									{isAudioMuted ? <IoIosMicOff /> : <IoIosMic />}
								</button>
								<button
									className='control-button'
									onClick={() =>
									{
										isVideoOff
											? roomClient.enableWebcam()
											: roomClient.disableWebcam();
									}}
								>
									{isVideoOff ? <FaVideoSlash /> : <FaVideo />}
								</button>
							</div>

							
							<Me />
						</div>
					</Draggable>

					
					{/* <div className='chat-input-container'>
						<ChatInput />
					</div> */}

					<div className='sidebar'>
						<div
							className={classnames('button', 'hide-videos', {
								on: me.audioOnly,
								disabled: me.audioOnlyInProgress
							})}
							data-tip={'Show/hide participants\' video'}
							onClick={() =>
							{
								me.audioOnly
									? roomClient.disableAudioOnly()
									: roomClient.enableAudioOnly();
							}}
						/>
						<div
							className={classnames('button', 'mute-audio', {
								on: me.audioMuted
							})}
							data-tip={'Mute/unmute participants\' audio'}
							onClick={() =>
							{
								me.audioMuted
									? roomClient.unmuteAudio()
									: roomClient.muteAudio();
							}}
						/>
						<div
							className={classnames('button', 'restart-ice', {
								disabled: me.restartIceInProgress
							})}
							data-tip='Restart ICE'
							onClick={() => roomClient.restartIce()}
						/>
					</div>

					<Stats />
					<Ai />

					{window.NETWORK_THROTTLE_SECRET &&
						<NetworkThrottle
							secret={window.NETWORK_THROTTLE_SECRET}
						/>
					}

					<ReactTooltip
						type='light'
						effect='solid'
						delayShow={100}
						delayHide={100}
						delayUpdate={50}
					/>
				</div>
			</Appear>
		);
	}

	componentDidMount()
	{
		const { roomClient } = this.props;

		roomClient.join();
	}
}

Room.propTypes =
{
	roomClient: PropTypes.any.isRequired,
	room: appPropTypes.Room.isRequired,
	me: appPropTypes.Me.isRequired,
	amActiveSpeaker: PropTypes.bool.isRequired,
	onRoomLinkCopy: PropTypes.func.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		room: state.room,
		me: state.me,
		amActiveSpeaker: state.me.id === state.room.activeSpeakerId
	};
};

const mapDispatchToProps = (dispatch) =>
{
	return {
		onRoomLinkCopy: () =>
		{
			dispatch(requestActions.notify(
				{
					text: 'Room link copied to the clipboard'
				}));
		}
	};
};

const RoomContainer = withRoomContext(connect(
	mapStateToProps,
	mapDispatchToProps
)(Room));

export default RoomContainer;
