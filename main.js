import initializeWamHost from "@webaudiomodules/sdk/src/initializeWamHost";

const audioContext = new AudioContext();
const wamHostGroupId = 'host-group-id';

let plugin;

async function start() {
    const initWamEnv = async (audioContext) => {
        const [, key] = await initializeWamHost(audioContext, wamHostGroupId);
        return key;
    };

    await initWamEnv(audioContext);

    const pluginUrl = '/wam/synth101/index.js';
    const { default: pluginFactory } = await eval(`import(pluginUrl)`)

    plugin = await pluginFactory.createInstance(wamHostGroupId, audioContext);

    currentPluginDomNode = await plugin.createGui();

    mount.appendChild(currentPluginDomNode);

    plugin.audioNode.connect(audioContext.destination);

    scheduler();
}

let nextNoteTime = audioContext.currentTime;
let timerID;

function scheduler() {
    while (nextNoteTime < audioContext.currentTime + 0.1) {

        nextNoteTime += 0.5;
        playMidiNote(100, nextNoteTime);
        playOsc(nextNoteTime);
    }

    timerID = window.setTimeout(scheduler, 50.0);
}


function playOsc(time) {
    console.log(`scheduling osc note in ${time - audioContext.currentTime}`);
    const osc = audioContext.createOscillator();
    osc.connect(audioContext.destination);
    osc.frequency.value = 200;
    osc.start(time);
    osc.stop(time + 0.1);
}


const playMidiNote = async (note, time, durationSec = 0.1, noteVelocity = 100) => {
    const auNode = plugin.audioNode;
    
    console.log(`scheduling note ${note} in ${time - auNode.context.currentTime}`)

    const MIDI_NODE_ON = 0x90;
    const MIDI_NOTE_OFF = 0x80;

    const WAM_EVENT = 'wam-midi';

    const midiOnMessage = { bytes: new Uint8Array([MIDI_NODE_ON, note, noteVelocity]) };
    const midiOnEvent = {
        type: WAM_EVENT,
        time,
        data: midiOnMessage
    };
    const midiOffMessage = { bytes: new Uint8Array([MIDI_NOTE_OFF, note, noteVelocity]) };
    const midiOffEvent = {
        type: WAM_EVENT,
        time: time + durationSec,
        data: midiOffMessage
    };
    auNode.scheduleEvents(midiOnEvent, midiOffEvent);
}

const startButton = document.getElementById('start');
startButton.addEventListener('click', start);