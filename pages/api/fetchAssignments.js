import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

export default async function handler(req, res) {
  try {
    // Load credentials.json
    const credentialsPath = path.join(process.cwd(), 'credentials.json');
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const spreadsheetId = '1oC010e49WUEUbu1x0k77_VjCpEPWETRpevoTSIIwcvU';

    // Define ranges
    const range1 = 'Sheet1!A1:E500';         // assignment data (A–E)
    const range2 = 'Sheet1!H1:H500';         // Marks (H column)
    const rangeAuth = 'Sheet2!A1:B400';      // Auth data (Sheet2)

    // Fetch all three in parallel
    const [res1, res2, resAuth] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range: range1 }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: range2 }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: rangeAuth }) 
    ]);

    const rows1 = res1.data.values || [];
    const rows2 = res2.data.values || [];
    const authRows = resAuth.data.values || []; // ✅

    // Merge A–E and H
    const mergedRows = rows1.map((row, i) => {
      const h = rows2[i] ? rows2[i][0] : undefined;
      return [...row, h];
    });

    if (mergedRows.length) {
      res.status(200).json({
        assignments: mergedRows, // includes headers + merged data
        auth: authRows           // includes secret codes from Sheet2
      });
    } else {
      res.status(404).json({ error: 'No assignment data found in sheet.' });
    }

  } catch (error) {
    console.error('Google Sheets API error:', error);
    res.status(500).json({ error: 'Failed to fetch data from Google Sheets.' });
  }
}
