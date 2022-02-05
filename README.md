# common-calendar-tweets

Tweets today's details for Common Calendar (calendar.org). Reads contract data from Ethereum using Alchemy API. Repo is setup to run as a Google Cloud Function.

Create a .env file with the following keys (docs https://www.npmjs.com/package/dotenv)
```
ALCHEMY_API_KEY=<key>
TWITTER_APP_KEY=<key>
TWITTER_APP_SECRET=<secret>
TWITTER_ACCESS_TOKEN=<access-token>
TWITTER_ACCESS_SECRET<access-secret>
```

Run locally
```
npm start
```

Navigate to `http://localhost:8080` to trigger the function. Check for the http response to be "Tweeted successfully"

Deploy to Google Cloud
```
npm run deploy
```