const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '..', '.env.local');

console.log('Checking .env.local at:', envPath);

if (fs.existsSync(envPath)) {
    console.log('File exists.');
    const envConfig = dotenv.parse(fs.readFileSync(envPath));

    console.log('--- Keys Found ---');
    for (const k in envConfig) {
        if (k.includes('KEY') || k.includes('SECRET')) {
            console.log(`${k}: ${envConfig[k] ? 'PRESENT (Length: ' + envConfig[k].length + ')' : 'EMPTY'}`);
        } else {
            console.log(`${k}: PRESENT`);
        }
    }
} else {
    console.log('File .env.local NOT found.');
}
