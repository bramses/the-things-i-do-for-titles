require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ogs = require("open-graph-scraper");
const title = require("url-to-title");

const app = express();
app.use(bodyParser.json());

const API_KEY = process.env.API_KEY;

app.post('/get-title', (req, res) => {
  const { url, apiKey } = req.body;

  if (apiKey !== API_KEY) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  const options = { url };
  let ogsResult = null;
  let titleResult = null;

  const checkResults = () => {
    console.log(`ogsResult: ${JSON.stringify(ogsResult)}`);
    console.log(`titleResult: ${titleResult}`);
    if (ogsResult || titleResult) {
      if (ogsResult.error || 'ogTitle' in ogsResult.result === false) {
        console.log(`titleResult: ${titleResult}`);
        res.json({ result: titleResult });
      } else if (titleResult === 'Unsupported browser' || titleResult === undefined) {
        console.log(`ogsResult: ${JSON.stringify(ogsResult)}`);
        res.json({ result: ogsResult.result.ogTitle + " - " + ogsResult.result.ogDescription });
      } else {
        const ogsLength = ogsResult.result.ogTitle.length;
        const titleLength = titleResult.length;
        if (ogsLength > titleLength) {
            console.log(`ogResultLonger: ${JSON.stringify(ogsResult)}`);
          res.json({ result: ogsResult.result.ogTitle });
        } else {
            console.log(`titleResultLonger: ${titleResult}`);
          res.json({ result: titleResult });
        }
      }
    } else {
        console.log(`No results`);
      res.status(500).json({ error: 'Failed to retrieve title' });
    }
  };

  ogs(options)
    .then((data) => {
      const { error, result } = data;
      ogsResult = { error, result };
    })
    .catch((error) => {
      ogsResult = { error: true, result: error };
    })
    .then(() => {
      title(url)
        .then((title) => {
          titleResult = title;
          checkResults();
        })
        .catch((error) => {
          titleResult = error;
          checkResults();
        });
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});