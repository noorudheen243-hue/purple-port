
import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import path from 'path';

async function testDataSync() {
    const API_URL = 'http://localhost:4001/api/backup';
    const EXPORT_URL = `${API_URL}/export-json`;
    const IMPORT_URL = `${API_URL}/import-json`;
    const EXPORT_FILE = 'test_backup.zip';

    console.log("--- 1. Testing Export ---");
    try {
        const response = await axios.get(EXPORT_URL, { responseType: 'arraybuffer' });
        console.log(`✅ Export Status: ${response.status}`);
        console.log(`✅ Content Type: ${response.headers['content-type']}`);
        console.log(`✅ Content Length: ${response.data.length} bytes`);

        fs.writeFileSync(EXPORT_FILE, response.data);
        console.log(`✅ Saved backup to ${EXPORT_FILE}`);
    } catch (error: any) {
        console.error("❌ Export Failed:", error.message);
        if (error.response) console.error("Response:", error.response.data.toString());
        return;
    }

    console.log("\n--- 2. Testing Import ---");
    try {
        const form = new FormData();
        form.append('file', fs.createReadStream(EXPORT_FILE));

        const response = await axios.post(IMPORT_URL, form, {
            headers: {
                ...form.getHeaders()
            }
        });

        console.log(`✅ Import Status: ${response.status}`);
        console.log("✅ Import Response:", response.data);
    } catch (error: any) {
        console.error("❌ Import Failed:", error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Response:", error.response.data);
        }
    }
}

testDataSync();
