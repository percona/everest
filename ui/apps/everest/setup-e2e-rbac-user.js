import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory
const envFilePath = path.resolve(__dirname, './.e2e', '.env');

dotenv.config({ path: envFilePath });

const createE2EUser = async () => {
   
  const { RBAC_USER, RBAC_PASSWORD } = process.env;
  const command = `../../../bin/everestctl accounts create -u${RBAC_USER} -p${RBAC_PASSWORD} || true`;
  execSync(command);
};

createE2EUser();
