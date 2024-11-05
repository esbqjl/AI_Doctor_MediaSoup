import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import ReactTooltip from 'react-tooltip';
import * as requestActions from '../redux/requestActions';
import { withRoomContext } from '../RoomContext';
import Notifications from './Notifications';
import Stats from './Stats';
import Ai from './Ai';
import * as appPropTypes from './appPropTypes';
import ChatInput from './ChatInput';
import NetworkThrottle from './NetworkThrottle';
import VideoChatWindow from './VideoChatWindow'; // Import new component

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

					{/* Render the VideoChatWindow component */}
					<VideoChatWindow />

					<div className='chat-input-container'>
						<ChatInput />
					</div>

					<div className='sidebar'>
						<div
							className={classnames('button', 'hide-videos', {
								on       : me.audioOnly,
								disabled : me.audioOnlyInProgress
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
								on : me.audioMuted
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
								disabled : me.restartIceInProgress
							})}
							data-tip='Restart ICE'
							onClick={() => roomClient.restartIce()}
						/>
					</div>

					<Stats />

					<Ai />

					<If condition={window.NETWORK_THROTTLE_SECRET}>
						<NetworkThrottle
							secret={window.NETWORK_THROTTLE_SECRET}
						/>
					</If>

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

Room.propTypes = {
	roomClient      : PropTypes.any.isRequired,
	room            : appPropTypes.Room.isRequired,
	me              : appPropTypes.Me.isRequired,
	amActiveSpeaker : PropTypes.bool.isRequired,
	onRoomLinkCopy  : PropTypes.func.isRequired
};

const mapStateToProps = (state) =>
{
	return {
		room            : state.room,
		me              : state.me,
		amActiveSpeaker : state.me.id === state.room.activeSpeakerId
	};
};

const mapDispatchToProps = (dispatch) =>
{
	return {
		onRoomLinkCopy : () =>
		{
			dispatch(requestActions.notify(
				{
					text : 'Room link copied to the clipboard'
				}));
		}
	};
};

const RoomContainer = withRoomContext(connect(
	mapStateToProps,
	mapDispatchToProps
)(Room));

export default RoomContainer1;
