 
import * as path from 'path';
import * as fs from 'fs';

function copyFolderSync(from, to) {
  fs.mkdirSync(to);
  fs.readdirSync(from).forEach((element) => {
    if (fs.lstatSync(path.join(from, element)).isFile()) {
      fs.copyFileSync(path.join(from, element), path.join(to, element));
    } else {
      copyFolderSync(path.join(from, element), path.join(to, element));
    }
  });
}

const checkDistEnvVarAndMove = async () => {
  const envDir = process.env.EVEREST_OUT_DIR;

  if (!!envDir) {
    const outDir = path.isAbsolute(envDir)
      ? envDir
      : path.join(process.cwd(), '../..', envDir);

    // eslint-disable-next-line no-console
    console.log(`Outputting Everest files to: ${outDir}`);

    fs.rmSync(outDir, { force: true, recursive: true });
    copyFolderSync('./dist', outDir);
    fs.rmSync('./dist', { force: true, recursive: true });
  }
};

checkDistEnvVarAndMove();
