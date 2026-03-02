const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const { google } = require("googleapis");

const app = express();
app.use(bodyParser.json());

const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const TOKEN_PATH = "token.json";

const credentials = JSON.parse(fs.readFileSync("credentials.json"));
const { client_secret, client_id, redirect_uris } =
  credentials.installed;

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

// Load token if exists
if (fs.existsSync(TOKEN_PATH)) {
  const token = fs.readFileSync(TOKEN_PATH);
  oAuth2Client.setCredentials(JSON.parse(token));
} else {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  console.log("Authorize this app by visiting this url:", authUrl);

  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  readline.question("Enter the code from that page here: ", (code) => {
    readline.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error("Error retrieving token", err);
      oAuth2Client.setCredentials(token);
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
      console.log("Token stored to", TOKEN_PATH);
    });
  });
}

const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

app.post("/book-property", async (req, res) => {
  const { name, email, date, time } = req.body;

  const startDateTime = new Date(`${date}T${time}:00`);
  const endDateTime = new Date(startDateTime.getTime() + 30 * 60000);

  const event = {
    summary: `Property Visit - ${name}`,
    description: `Client Email: ${email}`,
    start: {
      dateTime: startDateTime,
      timeZone: "Asia/Kolkata",
    },
    end: {
      dateTime: endDateTime,
      timeZone: "Asia/Kolkata",
    },
  };

  try {
    await calendar.events.insert({
      calendarId: "primary",
      resource: event,
    });

    res.json({ success: true, message: "Booking confirmed!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Booking failed" });
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});