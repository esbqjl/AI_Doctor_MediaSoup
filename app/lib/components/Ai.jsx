import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Appear } from './transitions';
import { withRoomContext } from '../RoomContext';
import * as stateActions from '../redux/stateActions';

class Ai extends React.Component
{
	constructor(props)
	{
		super(props);

		this.state =
		{
			cdsQaData                    : null,
            cdsDdxData                   : null,
            cdsHpiData                   : null,
		};

		this._delayTimer = null;
	}

	render()
	{
		const {
			peerId,
			peerDisplayName,
			isMe,
			onClose
		} = this.props;

		const {
            cdsQaData,
            cdsHpiData,
            cdsDdxData
		} = this.state;

		return (
			<div data-component='Ai'>
				<div className={classnames('content', { visible: peerId })}>
					<div className='header'>
						<div className='info'>
							<div
								className='close-icon'
								onClick={onClose}
							/>

							<Choose>
								<When condition={isMe}>
									<h1>Your Stats</h1>
								</When>

								<Otherwise>
									<h1>Ai Stats of {peerDisplayName}</h1>
								</Otherwise>
							</Choose>
						</div>

						<div className='list'>
							<If condition={cdsQaData}>
								<p>
									{'Transcript: '}
									<a href='#Transcript'>[transcript]</a>
									<span>{' '}</span>
									<a href='#Medpal'>[AI]</a>
								</p>
							</If>

						</div>
					</div>

					<div className='stats'>
						<If condition={cdsQaData}>
							{this._printQa('Suggested Question by Medpal', cdsQaData)}
						</If>

                        <If condition={cdsDdxData}>
							{this._printDdx('Possible Causes', cdsDdxData)}
						</If>

                        <If condition={cdsHpiData}>
							{this._printHpi('Medical Keywords', cdsHpiData)}
						</If>

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

		let cdsQaData                = null;
        let cdsDdxData                = null;
        let cdsHpiData                = null;

		if (isMe)
		{
			cdsQaData = await roomClient.getCdsQa()
                .catch(() => {});

            cdsDdxData = await roomClient.getCdsDdx()
            .catch(() => {});

            cdsHpiData = await roomClient.getCdsHpi()
            .catch(() => {});
		}
		else
		{
			
            cdsQaData = await roomClient.getCdsQa()
                .catch(() => {});

            console.log(cdsQaData);

            cdsDdxData = await roomClient.getCdsDdx()
                .catch(() => {});

            console.log(cdsDdxData);

            cdsHpiData = await roomClient.getCdsHpi()
                .catch(() => {});

            console.log(cdsHpiData);
		}

		this.setState(
			{
				cdsQaData,
                cdsDdxData,
                cdsHpiData,
                
			});

		this._delayTimer = setTimeout(() => this._start(), 2500);
	}

	_stop()
	{
		clearTimeout(this._delayTimer);

		this.setState(
			{
				cdsQaData                   : null,
                cdsDdxData                  : null,
                cdsHpiData                  : null,
			});
	}

	_printStats(title, stats)
	{
		const anchor = title
			.replace(/[ ]+/g, '-');

		if (typeof stats.values === 'function')
			stats = Array.from(stats.values());

		return (
			<Appear duration={150}>
				<div className='items'>
					<h2 id={anchor}>{title}</h2>

					{
						stats.map((item, idx) => (
							<div className='item' key={idx}>
								{
									Object.keys(item).map((key) => (
										<div className='line' key={key}>
											<p className='key'>{key}</p>
											<div className='value'>
												<Choose>
													<When condition={typeof item[key] === 'number'}>
														{JSON.stringify(Math.round(item[key] * 100) / 100, null, '  ')}
													</When>

													<Otherwise>
														<pre>{JSON.stringify(item[key], null, '  ')}</pre>
													</Otherwise>
												</Choose>
											</div>
										</div>
									))
								}
							</div>
						))
					}
				</div>
			</Appear>
		);
	}

    _printQa(title, content)
    {
        const anchor = title.replace(/[ ]+/g, '-');

        return (
            <Appear duration={150}>
                <div className='items'>
                    <h2 id={anchor}>{title}</h2>
                    <div>{content}</div>
                </div>
            </Appear>
        );
    }

	_printDdx(title, content)
	{
		const anchor = title.replace(/[ ]+/g, '-');

		return (
			<Appear duration={150}>
				<div className='items'>
					<h2 id={anchor}>{title}</h2>
					<div className="flex flex-col mx-4">
						{content && typeof content === 'object' && !Array.isArray(content) ? (
							Object.entries(content).map(([key, value], index) => (
								<div key={index} className="bg-pink-300 rounded-lg mt-2 p-2">
									<strong>{key}</strong>: {value}
								</div>
							))
						) : (
							<p className="bg-red-300 rounded-lg mt-2">No data available</p>
						)}
					</div>
				</div>
			</Appear>
		);
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

Ai.propTypes =
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



const StatsContainer = withRoomContext(connect(
	mapStateToProps,
	mapDispatchToProps
)(Ai));

export default StatsContainer;
