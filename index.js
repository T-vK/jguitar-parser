#!/usr/bin/env node
const { createWorker, SetVariable } = require('tesseract.js') // npm i tesseract.js@next
const sharp = require('sharp') // TODO: remove sharp dependency and use tesseract's rectangle option instead
const rp = require('request-promise-native')
const cheerio = require('cheerio')
const fs = require('fs-extra')
const download = require('download')

const digitWorker = createWorker({
  //logger: m => console.log(m)
})
const numberWorker = createWorker({
  //logger: m => console.log(m)
})

const fingerWidth = 15
const fingerHeight = 15
const stringPositions = [18,43,68,93,118,143]
const fretPositions = [55,80,105,130,155]

const baseFretPositionX = 162
const baseFretPositionY = 51
const baseFretPositionWidth = 24
const baseFretPositionHeight = 24

const stringNames = 'EADGBe'

const jGuitarBaseUrl = 'https://jguitar.com'

const rootNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const bassNotes = rootNotes
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
]

const cacheDir = './cache'
const chordJsonFile = `./chords.json`


async function imageToNumber(image) {
    const { data: { text } } = await numberWorker.recognize(image)
    return parseInt(text)
}

async function imageToDigit(image) {
    const { data: { text } } = await digitWorker.recognize(image)
    return parseInt(text)
}

async function getChordDiagramBaseFret(inputImg) {
    const tmpOutput = await inputImg.clone().extract({ left: baseFretPositionX, top: baseFretPositionY, width: baseFretPositionWidth, height: baseFretPositionHeight }).toBuffer()
    const baseFret = await imageToNumber(tmpOutput)
    //await inputImg.clone().extract({ left: baseFretPositionX, top: baseFretPositionY, width: baseFretPositionWidth, height: baseFretPositionHeight }).toFile(`extracted - Base Fret: ${baseFret}.png`)
    return baseFret
}

async function getChordDiagramFingering(inputImg) {
    let tmpOutput
    const fingering = []

    for ([string,stringPos] of Object.entries(stringPositions)) {
        let fingerFound
        let fingerFoundFret
        for ([relFret,fretPos] of Object.entries(fretPositions)) {
            tmpOutput = await inputImg.clone().extract({ left: stringPos, top: fretPos, width: fingerWidth, height: fingerHeight }).toBuffer()
            const finger = await imageToDigit(tmpOutput)

            //await inputImg.clone().extract({ left: stringPos, top: fretPos, width: fingerWidth, height: fingerHeight }).toFile(`extracted - String: ${string} (${stringNames[string]}) - Relative Fret: ${relFret} - Finger: ${finger}.png`)
            if (!isNaN(finger)) {
                fingerFound = true
                fingering.push(finger)
                break
            }
        }
        if (!fingerFound) {
            fingering.push(0)
        }
    }
    return fingering.map(p=>p.toString())
}

function getChordImgsFromHtml(html) {
    const $ = cheerio.load(html)

    const chordShapeImgs = []

    $('img.img-responsive').each(function() {
        chordShapeImgs.push(this)
    })

    return chordShapeImgs
}

function getPageInfoFromHtml(html) {
    const $ = cheerio.load(html)
    const noResults = !$('.row.jguitar-chord-row').html().trim()
    if (noResults) {
        return {
            firstChordIndex: 0,
            lastChordIndex: 0,
            totalChordCount: 0,
            totalPageCount: 0
        }
    } else {
        let [fullMatch, firstChordIndex, lastChordIndex, totalChordCount] = $('body').html().match(/Showing results (\d+) to (\d+) of (\d+) chord/)
        firstChordIndex = parseInt(firstChordIndex)
        lastChordIndex = parseInt(lastChordIndex)
        totalChordCount = parseInt(totalChordCount)
        const totalPageCount = Math.ceil(totalChordCount/lastChordIndex)
        return {
            firstChordIndex,
            lastChordIndex,
            totalChordCount,
            totalPageCount
        }
    }
}

async function getChordImgs(rootNote, chordSuffix, bassNote, cacheDir) {
    const encRootNote = encodeURIComponent(rootNote)
    const encChordSuffix = encodeURIComponent(chordSuffix)
    const encBassNote = encodeURIComponent(bassNote)

    const url = `${jGuitarBaseUrl}/chord?root=${encRootNote}&chord=${encChordSuffix}&bass=${encBassNote}&labels=finger&gaps=2&fingers=4&notes=sharps`

    let html
    if (await fs.pathExists(`${cacheDir}/page1.html`))
        html = await fs.readFile(`${cacheDir}/page1.html`)
    else {
        html = await rp({ uri: url })
        await fs.writeFile(`${cacheDir}/page1.html`, html)
    }

    let chordShapeImgs = getChordImgsFromHtml(html)

    const { firstChordIndex, lastChordIndex, totalChordCount, totalPageCount } = getPageInfoFromHtml(html)
    for (let i=2; i<=totalPageCount; i++) {
        let nextPageUrl = `${url}&page=${i}`
        if (await fs.pathExists(`${cacheDir}/page${i}.html`))
            html = await fs.readFile(`${cacheDir}/page${i}.html`)
        else {
            html = await rp({ uri: nextPageUrl })
            await fs.writeFile(`${cacheDir}/page${i}.html`, html)
        }
        const newChordShapeImgs = getChordImgsFromHtml(html)
        chordShapeImgs = chordShapeImgs.concat(newChordShapeImgs)
    }

    return chordShapeImgs
}

async function parseChordImg(imgTag, i, cacheDir) {
    let [fullMatch, fingerPositions] = imgTag.attribs.alt.match(/\{([0-9x]+\s[0-9x]+\s[0-9x]+\s[0-9x]+\s[0-9x]+\s[0-9x]+)\}/)
    fingerPositions = fingerPositions.split(' ')
    const imgUrl = `${jGuitarBaseUrl}${imgTag.attribs.src.replace(/\/\//g,'/')}`

    const fileName = `Shape${i}.png`
    const fullFilePath = `${cacheDir}/${fileName}`
    if (!(await fs.pathExists(fullFilePath)))
        await download(imgUrl, cacheDir, {filename: fileName})

    const inputImg = await sharp(fullFilePath)
    const fingering = await getChordDiagramFingering(inputImg)

    return {
        fingerPositions,
        fingering
    }
}

async function main() {
    await fs.ensureDir(cacheDir)
    if (!(await fs.pathExists(chordJsonFile)))
        await fs.outputJson(chordJsonFile,{})
    const chordData = await fs.readJson(chordJsonFile)
    await digitWorker.load()
    await digitWorker.loadLanguage('eng')
    await digitWorker.initialize('eng', 2)
    await digitWorker.setParameters({
        'tessedit_char_whitelist': '0123456789'
    })
    await numberWorker.load()
    await numberWorker.loadLanguage('eng')
    await numberWorker.initialize('eng', 0)
    await numberWorker.setParameters({
        'tessedit_char_whitelist': '0123456789'
    })

    /*
    const testImgUrl = "https://jguitar.com/images/chordshape/Dsharp-Major-Dsharp-11%2C13%2C13%2C12%2C11%2C11-sharps-finger.png"
    await download(testImgUrl, './', {filename: 'test.png'})
    const inputImg = await sharp('test.png')

    const fingering = await getChordDiagramFingering(inputImg)
    const baseFret = await getChordDiagramBaseFret(inputImg)
    console.log('Base Fret:', baseFret)
    console.log('Fingering detected:', fingering)
    process.exit()
    */


    let percentDone = 0
    let chordsDone = 0
    const chordsTotalCount = rootNotes.length*chordSuffixes.length*bassNotes.length

    for (const rootNote of rootNotes) {
        for (const chordSuffix of chordSuffixes) {
            for (const bassNote of bassNotes) {
                const fullChordName = (rootNote === bassNote) ? `${rootNote}${chordSuffix}` : `${rootNote}${chordSuffix}/${bassNote}`
                const diagramsDir = `${cacheDir}/${encodeURIComponent(fullChordName)}/diagrams`
                const pagesDir = `${cacheDir}/${encodeURIComponent(fullChordName)}/pages`
                await fs.ensureDir(diagramsDir)
                await fs.ensureDir(pagesDir)

                const shortChordName = fullChordName // TODO: convert the fullChordName into the short variant (e.g. CMajor should become C)

                const chordShapeImgs = await getChordImgs(rootNote, chordSuffix, bassNote, pagesDir)

                if (!(chordData[shortChordName] && chordShapeImgs.length === chordData[shortChordName].length)) { // Skip this chord if we already parsed al its shapes
                    chordData[shortChordName] = [] // If we didn't extract all shpaes of this chord yet, remove all shapes we got before and try to extract them again

                    //TODO: extract the chord subsets (which unfortunately don't have fingering data) from the html and add them to chordData
                    for (let [i,img] of Object.entries(chordShapeImgs)) {
                        const { fingerPositions, fingering } = await parseChordImg(img, i, diagramsDir)

                        console.log('Chord:', `${fullChordName} (Shape ${i})`)
                        console.log('Finger Positions:', fingerPositions)
                        console.log('Fingering:', fingering)

                        chordData[shortChordName].push({
                            positions: fingerPositions,
                            fingerings: [fingering]
                        })

                        await fs.outputJson(chordJsonFile, chordData)
                    }
                }

                chordsDone++
                percentDone = (chordsDone/chordsTotalCount)*100
                percentDone = Math.round(percentDone*100)/100
                console.log('----------------------------------------------------------')
                console.log(`Parsed ${chordsDone}/${chordsTotalCount} (${percentDone}%)`)
                console.log('----------------------------------------------------------')
                //process.exit() // Cancel early to only parse the data for the first chord
            }

        }
    }
    console.log("Done!")
    process.exit() // Exit when we are done
}

main().catch(console.error)
