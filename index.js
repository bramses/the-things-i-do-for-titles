require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ogs = require("open-graph-scraper");
const title = require("url-to-title");
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

const app = express();
app.use(bodyParser.json());

const API_KEY = process.env.API_KEY;

app.post("/get-title", (req, res) => {
  let { url, apiKey } = req.body;

  if (apiKey !== API_KEY) {
    return res.status(403).json({ error: "Invalid API key" });
  }

  // Convert YouTube URL to oEmbed format
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const videoId = url.split("v=")[1] || url.split("/").pop();
    url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    // open yt url and get the title
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        res.json({ result: data.title });
        return;
      })
      .catch((error) => {
        res.status(500).json({ error: "Failed to retrieve YouTube title" });
        return;
      });
    return; // Add this return statement to stop further execution
  }

  // if reddit url
  if (url.includes("reddit.com")) {
    // doesn't work...
    // function getRedditTitle(url) {
    //   console.log("Fetching Reddit URL:", url);
    //   return axios.get(url)
    //     .then(({ data }) => {
    //       const $ = cheerio.load(data);
    //       // write data to file
    //       fs.writeFileSync("reddit.html", data);
    //       const title = $("title").text();
    //       console.log("Reddit title:", title);
    //       return title;
    //     })
    //     .catch((error) => {
    //       console.error("Error fetching the Reddit URL:", error);
    //       return null;
    //     });
    // }

    // getRedditTitle(url).then((title) => {
    //   res.json({ result: title });
    // }).catch((error) => {
    //   console.error("Error fetching the Reddit URL:", error);
    //   res.json({ result: "Error" });
    // });

    res.json({ result: "Reddit" });
    return;
  }

  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";

  const options = {
    url,
    fetchOptions: { headers: { "user-agent": userAgent } },
  };
  let ogsResult = null;
  let titleResult = null;

  const checkResults = () => {
    console.log(`start ogs: ${JSON.stringify(ogsResult)}`);
    console.log(`start title: ${titleResult}`);
    if (ogsResult || titleResult) {
      if (ogsResult.error || "ogTitle" in ogsResult.result === false) {
        if (titleResult === undefined) {
          if (url.includes("reddit")) {
            titleResult = "Reddit";
          } else {
            titleResult = "Error";
          }
        }
        console.log(`titleResult: ${titleResult}`);
        res.json({ result: titleResult });
      } else if (
        titleResult === "Unsupported browser" ||
        titleResult === undefined ||
        titleResult === "Error: Invalid content-type"
      ) {
        console.log(`ogsResult: ${JSON.stringify(ogsResult)}`);
        res.json({
          result:
            ogsResult.result.ogTitle + " - " + ogsResult.result.ogDescription,
        });
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
      res.status(500).json({ error: "Failed to retrieve title" });
    }
  };

  ogs(options)
    .then((data) => {
      const { error, result } = data;
      ogsResult = { error, result };
      console.log(`ogsResult: ${JSON.stringify(ogsResult)}`); // Add logging here
    })
    .catch((error) => {
      ogsResult = { error: true, result: error };
      console.log(`ogsError: ${error}`); // Add logging here
    })
    .then(() => {
      title(url)
        .then((title) => {
          titleResult = title;
          console.log(`titleResult: ${titleResult}`); // Add logging here
          checkResults();
        })
        .catch((error) => {
          titleResult = error;
          console.log(`titleError: ${error}`); // Add logging here
          checkResults();
        });
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
