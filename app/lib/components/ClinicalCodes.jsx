import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Appear } from './transitions';
import { withRoomContext } from '../RoomContext';
import * as stateActions from '../redux/stateActions';
import * as requestActions from '../redux/requestActions';

class ClinicalCodes extends React.Component
{
	constructor(props)
	{
		super(props);

		this.state =
		{
			cdsHpiData                    : null,
            
		};

		this._delayTimer = null;
	}

	render()
	{
		const {
			peerId,
			peerDisplayName,
			onClose
		} = this.props;

		const {
            cdsHpiData,
		} = this.state;

		return (
			<div data-component="ClinicalCodes">
				<div className="container">
					<div className="header">
						<div>
							<div className="title">AI Suggestions</div>
							<div className="sub-title">We can ask following questions:</div>
						</div>
					</div>
                    <div>
                        <div>
                            
							{this._printHpi('HPI', cdsHpiData)}
                        </div>
                        
                    </div>
				</div>
			</div>	
		);
	}

	componentDidUpdate(prevProps)
	{
		const { peerId } = this.props;

		if (peerId && !prevProps.peerId)
		{
			this._delayTimer = setTimeout(() => this._start(), 250);
		}
		else if (!peerId && prevProps.peerId)
		{
			this._stop();
		}
		else if (peerId && prevProps.peerId && peerId !== prevProps.peerId)
		{
			this._stop();
			this._start();
		}
	}

	async _start()
	{
		const {
			roomClient,
			isMe,
			audioConsumerId,
			videoConsumerId,
			chatDataConsumerId,
			botDataConsumerId
		} = this.props;

		let cdsHpiData                = null;

		if (isMe == false)
		{
			cdsHpiData = await roomClient.getCdsHpi()
                .catch(() => {});
			
			console.log(cdsHpiData);
			
		}
		else
		{	
			requestActions.notify(
			{
				type : 'error',
				text : 'WebSocket connection failed'
			});
			throw new Error("isMe is true, operation aborted");
		}

		this.setState(
			{
				cdsHpiData,
                
			});

		this._delayTimer = setTimeout(() => this._start(), 2500);
	}

	_stop()
	{
		clearTimeout(this._delayTimer);

		this.setState(
			{
				cdsHpiData                   : null
			});
	}

    _printHpi(title, content)
	{
		const anchor = title.replace(/[ ]+/g, '-');

		const contentArray = Array.isArray(content) ? content : [content];

		return (
			<Appear duration={150}>
				<div className='items'>
					<h2 id={anchor}>{title}</h2>
					{
						contentArray.map((item, idx) => (
							<div className='item' key={idx}>
								{
									Array.isArray(item) ? 
									item.map((subItem, subIdx) => (
										typeof subItem === 'object' && subItem !== null
											? <pre key={subIdx}>{JSON.stringify(subItem, null, 2)}</pre>
											: <p key={subIdx}>{subItem}</p>
									)) :
									typeof item === 'object' && item !== null
										? <pre>{JSON.stringify(item, null, 2)}</pre>
										: <p>{item}</p>
								}
							</div>
						))
					}
				</div>
			</Appear>
		);
	}
}

ClinicalCodes.propTypes =
{
	roomClient         : PropTypes.any.isRequired,
	peerId             : PropTypes.string,
	peerDisplayName    : PropTypes.string,
	isMe               : PropTypes.bool,
	audioConsumerId    : PropTypes.string,
	videoConsumerId    : PropTypes.string,
	chatDataConsumerId : PropTypes.string,
	botDataConsumerId  : PropTypes.string,
	onClose            : PropTypes.func.isRequired
};

const mapStateToProps = (state) =>
{
	const { room, me, peers, consumers, dataConsumers } = state;
	const { statsPeerId } = room;

	if (!statsPeerId)
		return {};

	const isMe = statsPeerId === me.id;
	const peer = isMe ? me : peers[statsPeerId];
	let audioConsumerId;
	let videoConsumerId;
	let chatDataConsumerId;
	let botDataConsumerId;

	if (isMe)
	{
		for (const dataConsumerId of Object.keys(dataConsumers))
		{
			const dataConsumer = dataConsumers[dataConsumerId];

			if (dataConsumer.label === 'bot')
				botDataConsumerId = dataConsumer.id;
		}
	}
	else
	{
		for (const consumerId of peer.consumers)
		{
			const consumer = consumers[consumerId];

			switch (consumer.track.kind)
			{
				case 'audio':
					audioConsumerId = consumer.id;
					break;

				case 'video':
					videoConsumerId = consumer.id;
					break;
			}
		}

		for (const dataConsumerId of peer.dataConsumers)
		{
			const dataConsumer = dataConsumers[dataConsumerId];

			if (dataConsumer.label === 'chat')
				chatDataConsumerId = dataConsumer.id;
		}
	}

	return {
		peerId          : peer.id,
		peerDisplayName : peer.displayName,
		isMe,
		audioConsumerId,
		videoConsumerId,
		chatDataConsumerId,
		botDataConsumerId
	};
};

const mapDispatchToProps = (dispatch) =>
{
	return {
		onClose : () => dispatch(stateActions.setRoomStatsPeerId(null))
	};
};



const ClinicalCodesContainer = withRoomContext(connect(
	mapStateToProps,
	mapDispatchToProps
)(ClinicalCodes));

export default ClinicalCodesContainer;
