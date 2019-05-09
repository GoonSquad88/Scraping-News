var express = require('express');
var logger = require('morgan');
var mongoose = require('mongoose');
var path = require('path');

var axios = require('axios');
var cheerio = require('cheerio');

var db = require('./models');
var MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost/mongoHeadlines';

mongoose.connect(MONGODB_URI);

var PORT = process.env.PORT || 3000;

var app = express();

app.use(logger('dev'));
app.use(express.urlencoded({ extended: true }));

var exphbs = require('express-handlebars');

app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');

app.use(express.json());

app.use(express.static('public'));

mongoose.connect('mongodb://localhost/unit18Populater', { useNewUrlParser: true });

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, 'public/home.html'));
})

// This piece of code would scrape the webpage by using the 
// classes, id's and attributes from that page.
app.get('/scrape', function(req, res) {

    axios.get('http://www.nytimes.com').then(function(response){

        var $ = cheerio.load(response.data);

        // This codes finds the class 'balancedHeadline' and
        // puts them in the articles array
        $('.balancedHeadline').each(function(i, element) {
            var articles = {};

            articles.link = $(this).children('a').attr('href');
            // articles.headline = $(this).children('li').text().trim();
            articles.summary = $(this).children('li').text().trim();
        
        db.Article.create(articles)
          .then(function(dbArticle) {
            console.log(dbArticle);
        })
          .catch(function(err) {
            console.log(err);
        });
    });
    res.send("Scrape complete");
});
});

// Paths for creating, finding and deleting articles and their notes.
app.get('/articles', function(req, res) {
    db.Article.find({}).then(function(dbArticle) {
        res.json(dbArticle);
    }).catch(function(err) {
        res.json(err);
    });
});

app.get('/article/:id', function(req, res) {
    db.Article.findOne({ _id: req.params.id })
      .populate('note')
      .then(function(dbArticle) {
          res.json(dbArticle);
      })
      .catch(function(err) {
          res.json(err) 
      });
});

app.post('/articles/:id', function(req, res) {
    db.Note.create(req.body)
      .then(function(dbNote) {
          return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
      })
      .then(function(dbArticle) {
          res.json(dbArticle);
      })
      .catch(function(err) {
          res.json(err);
      });
});

app.delete('/deleted-notes/:id', function(req, res) {
    db.Note.remove(req.body)
      .then(function(dbNote) {
        return db.Article.remove({ _id: req.params.id });
      })
      .then(function(dbArticle) {
          res.json(dbArticle);
      })
      .catch(function(err) {
          res.json(err);
      });
});

app.listen(PORT, function() {
    console.log('Listening on port:' + PORT);
});