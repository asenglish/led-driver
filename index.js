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

    while (true) {
        await arduino.setValue('12', 'HIGH')
        sleep.sleep(1)
        await arduino.setValue('13', 'HIGH')
        sleep.sleep(1)
        await arduino.setValue('12', 'LOW')
        sleep.sleep(1)
        await arduino.setValue('13', 'LOW')
        sleep.sleep(1)
    }
})()

