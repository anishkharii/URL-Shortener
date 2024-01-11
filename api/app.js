const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const dns = require('dns');
const path = require('path');
const ejs = require('ejs');
require('dotenv').config();

const app = express();
app.use('/public', express.static('public'));
app.use(cors({ optionsSuccessStatus: 200 }));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine','ejs');
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log("Connected to MongoDB");
});

const URLSchema = new mongoose.Schema({
  original_url: String,
  title: String,
  meta_info: String,
  short_url: String
});

function checkExists(hostname, callback) {
  dns.resolve(hostname, (err, addresses) => {
    if (err) callback(false);
    else callback(true);
  });
}

const URLModel = mongoose.model('URLModel', URLSchema);

app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, '../views/index.html');
  res.sendFile(indexPath);
});

app.post('/api/shorturl', async (req, res) => {
  const givenURL = req.body.url;
  const title = req.body.title || '';
  const metaInfo = req.body.meta_info || '';
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
        short_url: new mongoose.Types.ObjectId().toHexString().slice(-5)
      });

      await newURL.save().then((data) => {
        const shortURL = req.protocol + '://' + req.get('host') + '/api/shorturl/' + data.short_url;
        res.render(path.join('success'), {
          short_url: shortURL,
          original_url: data.original_url,
          title: data.title,
          meta_info: data.meta_info
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
            }, 100);
          </script>
        </body>
      </html>
    `;
    res.send(htmlPage);
  } else {
    res.json({ error: "Invalid ID" });
  }
});

app.get('/api/url/view', async (req, res) => {
  try {
    const adminKey = req.body.key || req.query.key;

    if (adminKey === process.env.ADMIN_KEY) {
      const allUrls = await URLModel.find({});
      res.render('view', { urls: allUrls });
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error fetching URLs. Try again.' });
  }
});


app.post('/api/shorturl/delete', async (req, res) => {
  const urlIdToDelete = req.body.urlId;
  try {
    await URLModel.findByIdAndDelete(urlIdToDelete);
    res.json({ success: true });
  } catch (error) {
    res.json({ error: "Error deleting URL" });
  }
});

app.listen(3000, () => {
  console.log("Connected to server.");
});
