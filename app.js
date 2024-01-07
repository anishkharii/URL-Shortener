const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

const app = express();
app.use('/public', express.static('public'));
app.use(cors({ optionsSuccessStatus: 200 }));
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log("Connected to MongoDB");
});

const URLSchema = new mongoose.Schema({
  original_url: String,
  title: String,
  meta_info: String,
  short_url: Number
});

function checkExists(hostname, callback) {
  dns.resolve(hostname, (err, addresses) => {
    if (err) callback(false);
    else callback(true);
  });
}

const URLModel = mongoose.model('URLModel', URLSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/shorturl', async (req, res) => {
  const givenURL = req.body.url;
  const title = req.body.title || '';
  const metaInfo = req.body.meta_info || '';

  console.log(givenURL);

  let hostname;
  try {
    hostname = new URL(givenURL).hostname;
  } catch (err) {
    res.json({ error: 'Invalid URL' });
    return;
  }

  checkExists(hostname, async (exists) => {
    if (exists) {
      const newURL = new URLModel({
        original_url: givenURL,
        title: title,
        meta_info: metaInfo,
        short_url: Math.floor(Math.random() * 1000)
      });

      await newURL.save().then((data) => {
        res.json({
          original_url: data.original_url,
          title: data.title,
          meta_info: data.meta_info,
          short_url: data.short_url
        });
      });
    } else {
      res.json({ error: "Invalid URL" });
    }
  });
});

app.get('/api/shorturl/:id', async (req, res) => {
  const data = await URLModel.findOne({ short_url: req.params.id });
  if (data) {
    // Render dynamic HTML page with title and meta info
    const htmlPage = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${data.title}</title>
          <meta name="description" content="${data.meta_info}">
        </head>
        <body>
          <script>
            setTimeout(function() {
              window.location.href = "${data.original_url}";
            }, 2000);
          </script>
        </body>
      </html>
    `;
    res.send(htmlPage);
  } else {
    res.json({ error: "Invalid ID" });
  }
});

app.listen(3000, () => {
  console.log("Connected to server.");
});
