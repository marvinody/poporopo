const router = require('express').Router()
const {Json} = require('../db/models')
module.exports = router

router.use((req, res, next) => {
  res.setHeader('access-control-allow-origin', '*')
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

    console.log({
      model: json.apikey,
      apikey
    })

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

router.post('/', async (req, res, next) => {
  try {
    if (!req.body) {
      throw new Error('Need to pass a JSON body')
    }

    const json = await Json.create({
      data: req.body
    })

    res.json(json)
  } catch (err) {
    next(err)
  }
})
