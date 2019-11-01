import { chordsDirPath, guitarDirPath } from "./config.mjs";
import * as fs from "fs";

export const createDirectoryStructure = () => {
  if (!fs.existsSync(guitarDirPath)) {
    fs.mkdirSync(guitarDirPath);
  }

  if (!fs.existsSync(chordsDirPath)) {
    fs.mkdirSync(chordsDirPath);
  }
};

export const mapToString = (item) => {
  return `\n\r"${item}"`;
};

export const writeItemsToFile = (filePath, items) => {
  fs.writeFileSync(filePath, `export default [${items.map(mapToString)}
  ];`);
};

export const createTunningsFile = () => {
  fs.writeFileSync(`${guitarDirPath}/tunnings.js`,
    `export default [${["E2", "A2", "D3", "G3", "B3", "E4"].map(mapToString)}
  ];`);
};

export const createIndexFile = () => {
  fs.writeFileSync(`${guitarDirPath}/index.js`,
    `export default {
    main,
    tunnings,
    keys,
    suffixes,
    chords
  };`);
};

export const convertToVariableName = (path) => {
  return path.replace("#", "sharp");
}

export const createChordsIndex = () => {
  const directories = fs.readdirSync(chordsDirPath)
    .filter(directoryName => fs.lstatSync(`${chordsDirPath}/${directoryName}`).isDirectory());
  let data = "";

  directories.forEach(directoryName => {
    data += `import ${convertToVariableName(directoryName)} from "./${directoryName}/index"; \n\r`;
    createSuffixIndex(directoryName);
  });

  data += `export default [
    ${directories.map(convertToVariableName)}
  ];`;

  fs.writeFileSync(`${chordsDirPath}/index.js`, data);
};

export const createSuffixIndex = (directoryName) => {
  const chordDirPath = `${chordsDirPath}/${directoryName}`;
  const files = fs.readdirSync(chordDirPath).filter(fileName => fileName !== "index.js");
  let data = "";

  files.forEach(fileName => {
    data += `import ${fileName} from "./${fileName}.js";\n\r`;
  });

  data += `\n\rexport default [${files.map(fileName => `\n\r\t${fileName.replace(".js", "")}`)}
  ];`;

  fs.writeFileSync(`${chordDirPath}/index.js`, data);
};

export const createIndexFiles = () => {
  createIndexFile();
  createChordsIndex();
};

export const createMainFile = () => {
  fs.writeFileSync(`${guitarDirPath}/main.js`,
    `export default {
      strings: 6,
      fretsOnChord: 4,
      name: 'guitar'
    };`);
};