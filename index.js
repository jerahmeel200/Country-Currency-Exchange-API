const express = require('express');
const port = 3000;
const app = express();
const countriesUrl = "https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies" 
const exchangeUrl = "https://open.er-api.com/v6/latest/USD"
const db = require('./utils/db')
const path = require('path');



app.post('/countries/refresh', async (req, res) => {
  try {
    const [res1, res2] = await Promise.all(
	    [fetch(countriesUrl), fetch(exchangeUrl)]
    )
           
    if (!res1.ok || !res2.ok) {
      return res.status(503).json({
	"error": "External data source unavailable",
	"details": "Could not fetch data from open.er-api.com"
      });
    }
    const countries = await res1.json();
    const exchange = await res2.json();
    await db.createTable()
    for (const country of countries) {
      if (!country["currencies"]) {
        country.exchangeRate = null
        country.currencyCode = null
        country.estimatedGdp = null
      } else if (!country.currencies[0]["code"]){
        country.exchangeRate = null
        country.currencyCode = null
        country.estimatedGdp = 0
      } else {
        country.currencyCode = country.currencies[0]["code"];
        country.exchangeRate = exchange.rates[country.currencyCode]
        if(country.exchangeRate) {
          country.estimatedGdp = country.population * (Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000) / country.exchangeRate;
	} else {
          country.estimatedGdp = null
	}
      }
      
      await db.insertCountry(country)
    }

    console.log("country inserted successfully");
    await db.generateImage()
    return res.status(201).json({})
  } catch (err) {
    console.error(err)
    return res.status(500).json({
      "error": "Internal server error"
    });
  }
});

app.get('/countries', async (req, res) => {
  try {
    const filter = req.query
    const resp = await db.getCountries(filter)
    return res.status(200).json(resp)
  } catch (err) {
    console.error(err)
    return res.status(500).json({                                     "error": "Internal server error"
    });
  }
});

app.get('/status', async (req, res) => {
  try {
    const resp = await db.getStatus()
    return res.status(200).json(resp[0])
  } catch (err) {
    console.error(err)
    return res.status(500).json({
      "error": "Internal server error"
    });
  }
})

app.delete('/countries/:name', async (req, res) => {
  try {
    const resp = await db.deleteCountry(req.params.name)
    if (resp) {
      return res.status(204).json({})
    }
    return res.status(404).json({
      "error": "Country not found"
    });
  } catch (err) {
    console.error(err)
    return res.status(500).json({
      "error": "Internal server error"
    });
  }
});

app.get('/countries/image', async (req, res) => {
  try {
    const imagePath = path.resolve('cache/summary.png')
    res.sendFile(imagePath, (err) => {
      if (err) {
        return res.status(404).json({"error": "Summary image not found"})
      }
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({
      "error": "Internal server error"
    });
  }
});


app.get('/countries/:name', async (req, res) => {
  try {
    const resp = await db.getCountries({name: req.params.name})
    if (resp.length) {
      return res.status(200).json(resp[0])
    }
    return res.status(404).json({
      "error": "Country not found"
    });
  } catch (err) {
    console.error(err)
    return res.status(500).json({
      "error": "Internal server error"
    });
  }
});


app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});

module.exports = app;
