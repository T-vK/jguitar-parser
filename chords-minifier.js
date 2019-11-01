#!/usr/bin/env node
const fs = require('fs-extra')
const chordJsonFile = `./chords.json` // raw file generated by index.js

const completeChordJsonFile = `./chords.complete.json`
const minChordJsonFile = `./chords.min.json`

const notesSharp = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const notesFlat = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const noteAltName = {}
for (const [i, note] of notesSharp.entries()) {
    noteAltName[note] = notesFlat[parseInt(i)]
}

const chordSuffixes = [
  "Major",
  "Minor",
  "Diminished",
  "Augmented",
  "Suspended 2nd",
  "Suspended 4th",
  "Major Flat 5th",
  "Minor Sharp 5th",
  "Minor Double Flat 5th",
  "Suspended 4th Sharp 5th",
  "Suspended 2nd Flat 5th",
  "Suspended 2nd Sharp 5th",
  "7th",
  "Minor 7th",
  "Major 7th",
  "Minor Major 7th",
  "Diminished 7th",
  "Augmented 7th",
  "Augmented Major 7th",
  "7th Flat 5th",
  "Major 7th Flat 5th",
  "Minor 7th Flat 5th",
  "Minor Major 7th Flat 5th",
  "Minor Major 7th Double Flat 5th",
  "Minor 7th Sharp 5th",
  "Minor Major 7th Sharp 5th",
  "7th Flat 9th",
  "6th",
  "Minor 6th",
  "6th Flat 5th",
  "6th Add 9th",
  "Minor 6th Add 9th",
  "9th",
  "Minor 9th",
  "Major 9th",
  "Minor Major 9th",
  "9th Flat 5th",
  "Augmented 9th",
  "9th Suspended 4th",
  "7th Sharp 9th",
  "7th Sharp 9th Flat 5th",
  "Augmented Major 9th",
  "11th",
  "Minor 11th",
  "Major 11th",
  "Minor Major 11th",
  "Major Sharp 11th",
  "13th",
  "Minor 13th",
  "Major 13th",
  "Minor Major 13th",
  "7th Suspended 2nd",
  "Major 7th Suspended 2nd",
  "7th Suspended 4th",
  "Major 7th Suspended 4th",
  "7th Suspended 2nd Sharp 5th",
  "7th Suspended 4th Sharp 5th",
  "Major 7th Suspended 4th Sharp 5th",
  "Suspended 2nd Suspended 4th",
  "7th Suspended 2nd Suspended 4th",
  "Major 7th Suspended 2nd Suspended 4th",
  "5th",
  "Major Add 9th"
];
const shortChordSuffixes = [
  "",
  "m",
  "dim",
  "aug",
  "sus2",
  "sus4",
  "majb5",
  "m#5",
  "mbb5",
  "sus4#5",
  "sus2b5",
  "sus2#5",
  "7",
  "m7",
  "maj7",
  "mmaj7",
  "dim7",
  "aug7",
  "augmaj7",
  "7b5",
  "maj7b5",
  "m7b5",
  "mmaj7b5",
  "mmaj7bb5",
  "m7#5",
  "mmaj7#5",
  "7b9",
  "6",
  "m6",
  "6b5",
  "6add9",
  "m6add9",
  "9",
  "m9",
  "maj9",
  "mmaj9",
  "9b5",
  "aug9",
  "9sus4",
  "7#9",
  "7#9b5",
  "augmaj9",
  "11",
  "m11",
  "maj11",
  "mmaj11",
  "maj#11",
  "13",
  "m13",
  "maj13",
  "mmaj13",
  "7sus2",
  "maj7sus2",
  "7sus4",
  "maj7sus4",
  "7sus2#5",
  "7sus4#5",
  "maj7sus4#5",
  "sus2sus4",
  "7sus2sus4",
  "maj7sus2sus4",
  "5",
  "add9"
];


async function main() {
    const rawChordData = await fs.readJson(chordJsonFile)
    const minChordData = {}
    const completeChordData = {}
    
    for (const [chordName, chordData] of Object.entries(rawChordData)) {
        if (chordName.includes('/')) {
            let [fullMatch, rootNote, chordSuffix, bassNote] = chordName.match(/^([ABCDEFG][b#]?)(.+)\/([ABCDEFG][b#]?)$/)
            const shortChordSuffix = shortChordSuffixes[chordSuffixes.indexOf(chordSuffix)]
            const chordName1 = `${rootNote}${shortChordSuffix}/${bassNote}`
            const chrodName2 = `${noteAltName[rootNote]}${shortChordSuffix}/${bassNote}`
            minChordData[chordName1] = [chordData[0]]
            minChordData[chrodName2] = [chordData[0]]
            completeChordData[chordName1] = chordData
            completeChordData[chrodName2] = chordData
        } else {
            let [fullMatch, rootNote, chordSuffix] = chordName.match(/^([ABCDEFG][b#]?)(.+)$/)
            const shortChordSuffix = shortChordSuffixes[chordSuffixes.indexOf(chordSuffix)]
            const chordName1 = `${rootNote}${shortChordSuffix}`
            const chrodName2 = `${noteAltName[rootNote]}${shortChordSuffix}`
            minChordData[chordName1] = [chordData[0]]
            minChordData[chrodName2] = [chordData[0]]
            completeChordData[chordName1] = chordData
            completeChordData[chrodName2] = chordData
        }
    }
    
    await fs.outputJson(minChordJsonFile, minChordData)
    await fs.outputJson(completeChordJsonFile, completeChordData)
    
    console.log("Done!")
    process.exit() // Exit when we are done
}

main().catch(console.error)