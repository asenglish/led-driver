const ArduinoInterface = require('./arduinoInterface')
const sleep = require('sleep')

init = async () => {
    return new Promise((resolve, reject) => {
        const arduino = new ArduinoInterface(() => {resolve(arduino)})
    })
}

(async () => {
    console.log('Initializing:')
    const arduino = await init()
})()

