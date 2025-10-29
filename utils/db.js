const mysql = require('mysql2/promise');
const fs = require("fs");
const path = require('path');
const sharp = require('sharp');
const dotenv = require('dotenv');
dotenv.config();

class DBClient {
  constructor() {
  const fs = require("fs");

this.db = mysql.createPool({
  host: 'mysql-35169aff-jamicojerahmeel-2877.c.aivencloud.com',
  user: 'avnadmin',
  password: process.env.DB_PASS,
  database: 'defaultdb',
  port: 21047,
  multipleStatements: true,
  connectTimeout: 30000,
  ssl: {
    ca: fs.readFileSync(path.resolve(__dirname, "../ca.pem")) 
  },
});


  }

  async createTable() {
    const sql = `
      DROP TABLE IF EXISTS Countries;
      CREATE TABLE Countries(
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        region VARCHAR(100),
	capital VARCHAR(100),
	population INT NOT NULL,
	currency_code CHAR(3),
	exchange_rate FLOAT,
	estimated_gdp FLOAT,
	flag_url VARCHAR(300),
	last_refreshed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	)
	`

    try {
      await this.db.query(sql)
      console.log('Countries table created successfully.');
    } catch(err) {
      console.error(`sql message: ${err.sqlMessage}`)
      console.error(`error code: ${err.code}`)
      throw err
    }


  }

  async insertCountry(data) {
    const sql = `
      INSERT INTO Countries(
        name, region, capital, population, currency_code,
	exchange_rate, estimated_gdp, flag_url
	)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      

      await this.db.query(sql, [
          data["name"], data["region"],
          data["capital"], data["population"],
          data["currencyCode"], data["exchangeRate"],
          data["estimatedGdp"], data["flag"]
          ]
          )
  }

  async getCountries(filters) {
    try {
      let sql = `SELECT * FROM Countries`
      let sqlFilter = []
      let sqlString = ``
      for (const key in filters) {
        if (key != 'sort') {
          if (key === 'currency') {
            sqlFilter.push('currency_code' + ` = ` + `'${filters[key]}'`)
	  } else {
            sqlFilter.push(key + ` = ` + `'${filters[key]}'`)
	  }
	}
      }
      sqlFilter = sqlFilter.join(' AND ')

      if (sqlFilter.length) {
        sqlFilter = ` WHERE ` + sqlFilter
      }
      if (filters.sort) {
        sqlFilter += ` ORDER BY`
        if (filters["sort"].split("_")[0] === "gdp") {
          sqlFilter += ` estimated_gdp`
	} else {
          sqlFilter += filters["sort"].split("_")[0]
	}
	sqlFilter += ' ' + filters["sort"].split("_")[1]
      }
      sql += sqlFilter
      console.log(sql)
      const [res] = await this.db.query(sql)
      return res;
    } catch (err) {
      console.log(err);
      throw new Error(err)
    }
  }


  async getStatus()  {
    const sql = `SELECT COUNT(*) AS total_countries, MAX(last_refreshed_at) AS last_refreshed_at FROM Countries`
    const [res] = await this.db.query(sql)
    return res
  }

  async deleteCountry(name) {
    const sql = `DELETE FROM Countries WHERE name = '${name}'`
    try {
      const [res] = await this.db.query(sql)
      return res.affectedRows
    } catch (err) {
      console.log(err);
      throw new Error(err)
    }
  }

  async generateImage() {
    const sql = `SELECT name, estimated_gdp FROM Countries ORDER BY estimated_gdp DESC LIMIT 5`
    const stat = await this.getStatus()
    const [top5] = await this.db.query(sql)

    if (!fs.existsSync("cache")) {
      fs.mkdirSync("cache", { recursive: true });
    }
    const top5Html = top5
      .map(c => `<li>${c.name} - ${c.estimated_gdp}</li>`)
      .join('');

    const html = `
      <div style="width:400px; height:300px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#222; color:#fff; font-family:sans-serif;">
        <h1>Countries API Summary</h1>
        <p>Total Countries: ${stat[0].total_countries}</p>
	<ol>
          ${top5Html}
	</ol>
        <p>last_refreshed_at: ${stat[0].last_refreshed_at}</p>
      </div>
      `;

    const svg = `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <foreignObject width="100%" height="100%">
          ${html}
        </foreignObject>
      </svg>
    `;


    await sharp(Buffer.from(svg))
      .png()
      .toFile('cache/summary.png');

    console.log("Image saved to:", path.resolve('cache/summary.png'));
    console.log("__dirname:", __dirname);
    console.log(`Summary Image created`);
  }
}


const dbClient = new DBClient()
module.exports = dbClient
