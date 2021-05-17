/* eslint-disable max-statements */
/* eslint-disable complexity */
const router = require('express').Router()
const {Json} = require('../db/models')
const _ = require('lodash')

const {addIDs, customTypeof, setWith} = require('./util')

module.exports = router

router.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-apikey')
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

    const {obj, maxId} = addIDs(req.body)

    const newJson = await json.update({
      data: obj,
      highestCreatedId: maxId
    })
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

    res.status(201).json(json)
  } catch (err) {
    next(err)
  }
})

const parentResourceFetcher = (root, path) => {
  if (path.length === 0) {
    return root
  }
  const rootType = customTypeof(root)
  if (rootType === 'array') {
    // find by id, throw on unfound
    // we want a coercive comparison here because path is string but id may be number or string
    // eslint-disable-next-line eqeqeq
    const child = root.find(el => el.id == path[0])
    if (!child) {
      throw Error(`Unfound array element by id: "${path[0]}"`)
    }
    return parentResourceFetcher(child, path.slice(1))
  } else if (rootType === 'object') {
    // find by key, throw on unfound
    const child = root[path[0]]
    if (!child) {
      throw Error(`Unfound object property by key: "${path[0]}"`)
    }
    return parentResourceFetcher(child, path.slice(1))
  } else {
    throw new Error('Path Access Error!')
  }
}

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
      .split('/')
      .filter(p => p.length > 0)

    const parent = parentResourceFetcher(json.data, path)

    if (customTypeof(parent) !== 'array') {
      throw new Error('Cannot POST to a non-array')
    }

    // add IDs if required...
    const {maxId, obj} = addIDs(req.body, json.highestCreatedId, parent)
    parent.push(obj)
    await json.update({data: json.data, highestCreatedId: maxId})

    res.status(201).json(obj)
  } catch (err) {
    next(err)
  }
})

// delete resource
router.delete('/:jsonUUID/', async (req, res, next) => {
  try {
    if (!req.headers['x-apikey']) {
      throw new Error('Need to pass an apikey in header as "x-apikey"')
    }

    const apikey = req.headers['x-apikey']

    const json = await Json.findByPk(req.params.jsonUUID, {
      attributes: ['apikey', 'id', 'data']
    })

    if (!json) {
      throw new Error(`Could not find Data with ID of ${req.params.jsonUUID}`)
    }

    if (json.apikey !== apikey) {
      throw new Error(
        'Mismatching apikey for given JSON ID, make sure this is your resource'
      )
    }

    await json.destroy()

    res.json({deleted: json.data})
  } catch (err) {
    next(err)
  }
})

// delete subresource
router.delete('/:jsonUUID/*', async (req, res, next) => {
  try {
    if (!req.headers['x-apikey']) {
      throw new Error('Need to pass an apikey in header as "x-apikey"')
    }

    const apikey = req.headers['x-apikey']

    const json = await Json.findByPk(req.params.jsonUUID, {
      attributes: ['apikey', 'id', 'data']
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
      .split('/')
      .filter(p => p.length > 0)

    const parentPath = path.slice(0, -1)
    const childPath = path[path.length - 1]
    // the last parameter specifies the id/key to delete, so we only want to get parent
    const parent = parentResourceFetcher(json.data, parentPath)

    const parentType = customTypeof(parent)

    if (parentType === 'array') {
      // eslint-disable-next-line eqeqeq
      const child = parent.find(el => el.id == childPath)
      if (!child) {
        throw new Error(`Unfound array element by id: "${childPath}"`)
      }

      const filtered = parent.filter(el => el.id != childPath)

      // overwrite existing array with this new filtered array to remove the element
      const updated = setWith(json.data, parentPath, filtered)

      await json.update({data: updated})

      res.json({deleted: child})
    } else if (parentType === 'object') {
      if (!(childPath in parent)) {
        throw new Error(`Unfound object property by key: "${childPath}"`)
      }

      const child = parent[childPath]

      delete parent[childPath]

      const updated = setWith(json.data, parentPath, parent)

      await json.update({data: updated})
      res.json({deleted: child})
    } else {
      throw new Error('Cannot delete requested path')
    }
  } catch (err) {
    next(err)
  }
})
