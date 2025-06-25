// pages/api/fetchAssignments.js
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

    const spreadsheetId = '1XNmkdN14fQ6cKsFO-8RuoMNjcKAYSIBmtsCJTyRaVJA';
    const range1 = 'Sheet1!A1:E500';
    const range2 = 'Sheet1!H1:H500';

    // Fetch A-E
    const response1 = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: range1,
    });
    // Fetch H
    const response2 = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: range2,
    });

    const rows1 = response1.data.values || [];
    const rows2 = response2.data.values || [];
    // Merge rows: [A, B, C, D, E] + [H]
    const mergedRows = rows1.map((row, i) => {
      const h = rows2[i] ? rows2[i][0] : undefined;
      return [...row, h];
    });
    if (mergedRows.length) {
      res.status(200).json({ data: mergedRows });
    } else {
      res.status(404).json({ error: 'No data found in sheet.' });
    }
  } catch (error) {
    console.error('Google Sheets API error:', error);
    res.status(500).json({ error: 'Failed to fetch data from Google Sheet.' });
  }
}
