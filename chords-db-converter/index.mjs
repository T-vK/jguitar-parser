import {
  chordSuffixes, guitarDirPath, chordsDirPath,
  shortChordSuffixes, rootNotes
} from "./config.mjs";
import {
  createDirectoryStructure, createTunningsFile,
  writeItemsToFile, createIndexFiles,
  createMainFile
} from "./file-util.mjs";
import * as fs from "fs";

const main = () => {
  createDirectoryStructure();

  let chords = JSON.parse(fs.readFileSync("../chords.json"));

  for (let baseNote of rootNotes) {
    for (let bassNote of rootNotes) {
      for (let suffixIndex = 0; suffixIndex < chordSuffixes.length; suffixIndex++) {
        const chordName = getChordName(baseNote, bassNote, suffixIndex);
        const shortChordSuffix = getShortChordSuffix(baseNote, bassNote, suffixIndex);
        const chordVariants = chords[chordName];

        if (chordVariants) {
          const chord = convertToChord(baseNote, shortChordSuffix, chordVariants);
          createChordFile(baseNote, shortChordSuffix, chord);
        }
      }
    }
  }

  createSuffixesFile();
  createTunningsFile();
  createKeysFile(rootNotes);
  createIndexFiles();
  createMainFile();
};

const createSuffixesFile = () => {
  const bassNotes = ["", ...rootNotes];
  let shortChordSuffixes = [];

  for (let bassNote of bassNotes) {
    for (let suffixIndex = 0; suffixIndex < chordSuffixes.length; suffixIndex++) {
      const shortChordSuffix = getShortChordSuffix("", bassNote, suffixIndex);
      shortChordSuffixes.push(shortChordSuffix);
    }
  }

  writeItemsToFile(`${guitarDirPath}/suffixes.js`, shortChordSuffixes);
};

const createKeysFile = (keys) => {
  writeItemsToFile(`${guitarDirPath}/keys.js`, keys);
};

const getChordName = (baseNote, bassNote, suffixIndex) => {
  return (bassNote !== baseNote)
    ? `${baseNote}${chordSuffixes[suffixIndex]}/${bassNote}`
    : `${baseNote}${chordSuffixes[suffixIndex]}`;
};

const getShortChordSuffix = (baseNote, bassNote, suffixIndex) => {
  const shortSuffix = (bassNote !== baseNote && bassNote !== "")
    ? `${shortChordSuffixes[suffixIndex]}s${bassNote}`
    : `${shortChordSuffixes[suffixIndex]}`;
  return shortSuffix.toLowerCase();
};

/*
 * Positions which are greather than 9 are converted to letters.
 * e.g.: 10 => a, 11 => b
 */
const convertPosition = (position) => {
  return (position !== "x" && position > 9)
    ? String.fromCharCode(87 + Number(position))
    : position;
};

const getBarres = (fingering, positions) => {
  const barres = new Set();

  for (let i = 0; i < fingering.length; i++) {
    if (positions[i] !== "x" && positions[i] !== "0") {
      const fingerIndex = fingering[i];
      if (fingering.filter(index => index == fingerIndex).length > 1) {
        barres.add(positions[i]);
      }
    }
  }

  return (barres.size > 0) ? `,\n\r\t\t\tbarres: [${Array.from(barres)}]` : "";
};

const convertChord = (chord) => {
  const fingering = chord.fingerings[0];

  return `\n\r\t\t{
    \tfrets: "${chord.positions.map(convertPosition).join("")}",
    \tfingers: "${fingering.join("")}"${getBarres(fingering, chord.positions)}
  \t}`
};

const convertToChord = (baseNote, suffix, chordVariants) => {
  return `{
    key: "${baseNote}",
    suffix: "${convertToChordDbSuffix(suffix)}",
    positions: [${chordVariants.map(chord => convertChord(chord))}]
  }`;
};


const convertToChordDbSuffix = (suffix) => {
  switch (suffix) {
    case "":
      return "major";
    case "m":
      return "minor";
    default:
      return suffix;
  }
};

const createChordFile = (baseNote, suffix, chord) => {
  const chordFilePath = `${chordsDirPath}/${baseNote}`;
  if (!fs.existsSync(chordFilePath)) {
    fs.mkdirSync(chordFilePath);
  }

  fs.writeFileSync(`${chordFilePath}/${convertToChordDbSuffix(suffix)}.js`,
    `export default ${chord};`);
};

main();