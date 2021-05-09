const router = require('express').Router()
const {Json} = require('../db/models')
const _ = require('lodash')

const {addIDs, customTypeof} = require('./util')

module.exports = router

router.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, OPTIONS, DELETE, PUT'
  )
  next()
})

router.get('/:jsonUUID', async (req, res, next) => {
  try {
    const json = await Json.findByPk(req.params.jsonUUID, {
      attributes: ['data']
    })

    if (!json) {
      throw new Error(`Could not find Data with ID of ${req.params.jsonUUID}`)
    }

    res.json(json.data)
  } catch (err) {
    next(err)
  }
})

router.put('/:jsonUUID', async (req, res, next) => {
  try {
    if (!req.body) {
      throw new Error('Need to pass a JSON body')
    }

    if (!req.headers['x-apikey']) {
      throw new Error('Need to pass an apikey in header as "x-apikey"')
    }

    const apikey = req.headers['x-apikey']

    const json = await Json.findByPk(req.params.jsonUUID, {
      attributes: ['apikey', 'id']
    })

    if (!json) {
      throw new Error(`Could not find Data with ID of ${req.params.jsonUUID}`)
    }

    if (json.apikey !== apikey) {
      throw new Error(
        'Mismatching apikey for given JSON ID, make sure this is your resource'
      )
    }

    const newJson = await json.update({data: req.body})
    res.json(newJson.data)
  } catch (err) {
    next(err)
  }
})

// create new full resource
router.post('/', async (req, res, next) => {
  try {
    if (!req.body) {
      throw new Error('Need to pass a JSON body')
    }

    const {obj, maxId} = addIDs(req.body)

    const json = await Json.create({
      data: obj,
      highestCreatedId: maxId
    })

    res.json(json)
  } catch (err) {
    next(err)
  }
})

// create new sub resource
router.post('/:jsonUUID/*', async (req, res, next) => {
  try {
    if (!req.body) {
      throw new Error('Need to pass a JSON body')
    }

    if (!req.headers['x-apikey']) {
      throw new Error('Need to pass an apikey in header as "x-apikey"')
    }

    const apikey = req.headers['x-apikey']

    const json = await Json.findByPk(req.params.jsonUUID, {
      attributes: ['apikey', 'id', 'data', 'highestCreatedId']
    })

    if (!json) {
      throw new Error(`Could not find Data with ID of ${req.params.jsonUUID}`)
    }

    if (json.apikey !== apikey) {
      throw new Error(
        'Mismatching apikey for given JSON ID, make sure this is your resource'
      )
    }
    // cut off the json id from url
    const path = req.url
      .slice(`/${req.params.jsonUUID}/`.length)
      .replace('/', '.')

    const parent = _.get(json.data, path)

    // add IDs if required...
    const {maxId, obj} = addIDs(req.body, json.highestCreatedId, parent)
    if (customTypeof(parent) === 'array') {
      parent.push(obj)
      await json.update({data: json.data, highestCreatedId: maxId})
      console.log(json.data)
    } else {
      const newFullData = _.set(json.data, path, obj)
      await json.update({data: newFullData, highestCreatedId: maxId})
      console.log(newFullData)
    }

    res.json(obj)
  } catch (err) {
    next(err)
  }
})
