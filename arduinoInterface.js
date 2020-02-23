const SerialPort = require('serialport')
const Readline = SerialPort.parsers.Readline
const uniqid = require('uniqid')
const events = require('events')

const upstreamAckBegin = '<?ack:'
const upstreamAckEnd = '?>'
const downstreamAckBegin = '<?ackId:'
const downstreamAckEnd = upstreamAckEnd

module.exports = class ArduinoInterface {
	constructor(cb) {
		process.stdout.write('Scanning devices...')
		findArduino()
			.then(port => {
				this.port = port;
				this.connected = false;
				process.stdout.write('device found\n')

				process.stdout.write('Connecting...')
				this.conn = new SerialPort(this.port, { baudRate: 9600 })
				process.stdout.write('connected\n')

				this.logEmitter = new events.EventEmitter();
				this.parser = this.conn.pipe(new Readline())
				this.parser.on('error', console.log)
				this.parser.on('data', (data) => {
					if (this.connected && !data.includes(`${upstreamAckBegin}`)) {
						console.log('>arduino: ' + data)
					}
					this.logEmitter.emit('data', data)
				})

				process.stdout.write('Waiting for open...')
				return this.waitForOpen()
			})
			.then(() => {
				process.stdout.write('opened\n')
				process.stdout.write('Waiting for response...')
				return this.waitForResponse()
			})
			.then(() => {
				process.stdout.write('done\n')
				this.connected = true;
				cb()
			})
	}

	async waitForResponse() {
		return new Promise((resolve, reject) => {
			const timerId = setInterval(async () => {
				await this.write(`${downstreamAckBegin}abc${downstreamAckEnd}`)
			}, 1000)
			const listener = (data) => {
				if (data.includes(`${upstreamAckBegin}abc${upstreamAckEnd}`)) {
					clearInterval(timerId)
					cleanup()
				}
			}
			this.logEmitter.on('data', listener)
			const cleanup = () => {
				this.logEmitter.removeListener('data', listener)
				return resolve()
			}
		})
	}

	async setValue(setting, value) {
		await this.writeWithAck(`${setting}=${value}`)
	}

	async write(msg) {
		return new Promise((resolve, reject) => {
			this.conn.write(`${msg}\n`, (err) => {
				if (err) {
					reject(err)
				}
				resolve()
			})
		})
	}

	async writeWithAck(msg) {
		const ackId = uniqid();
		const ack = `${downstreamAckBegin}${ackId}${downstreamAckEnd}`
		return new Promise((resolve, reject) => {
			this.waitForAck(ackId)
				.then(() => {
					resolve();
				})
			this.conn.write(`${msg}${ack}\n`, (err) => {
				if (err) {
					reject(err)
				}
			})
		})
	}

	async waitForAck(ackId) {
		return new Promise((resolve, reject) => {
			const listener = (data) => {
				if (data.includes(`${upstreamAckBegin}${ackId}${upstreamAckEnd}`)) {
					cleanup()
				}
			}
			this.logEmitter.on('data', listener)
			const cleanup = () => {
				this.logEmitter.removeListener('data', listener)
				return resolve()
			}
		})
	}

	async waitForOpen() {
		return new Promise((resolve, reject) => {
			this.conn.on('open', () => {
				resolve()
			})
		})
	}
}

findArduino = async () => {
	const ports = await SerialPort.list()
	let port = null;
	ports.forEach((scannedPort) => {
		if (scannedPort['manufacturer'] && scannedPort['manufacturer'].includes('arduino')) {
			port = scannedPort.path;
			return
		}
	})

	return port;
}
