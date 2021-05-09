const crypto = require('crypto')
const Sequelize = require('sequelize')
const db = require('../db')

const JSON = db.define('json', {
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  data: {
    type: Sequelize.JSON
  },
  apikey: {
    type: Sequelize.STRING(64)
  },
  highestCreatedId: {
    type: Sequelize.INTEGER
  }
})

const setAPIKey = json => {
  json.apikey = crypto.randomBytes(32).toString('hex')
}

JSON.beforeCreate(setAPIKey)
JSON.beforeBulkCreate(JSONs => {
  JSONs.forEach(setAPIKey)
})

module.exports = JSON
