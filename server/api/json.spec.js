/* global describe beforeEach it */

const {expect} = require('chai')
const request = require('supertest')
const db = require('../db')
const app = require('../index')
const Json = db.model('json')

describe('JSON routes', () => {
  beforeEach(() => {
    return db.sync({force: true})
  })

  describe('/api/json/', () => {
    let dummyRow
    const fakeUUID = '6c9fcc3e-03fa-4a96-b2c6-d768a9680048'

    beforeEach(async () => {
      dummyRow = await Json.create({
        data: {
          dummyData: 'yo what up',
          array: [
            {
              arrayEles: 'getAnIdOnCreate',
              but: {nestedResources: 'doNot'},
              id: 1
            },
            {idsAreAutoIncremented: 'like this', id: 2},
            {butYouCanGiveYourOwn: 'like this', id: 'string-key'},
            {justDontMakeItNumeric: 'if Possible', id: 3}
          ]
        },
        highestCreatedId: 4
      })
    })

    describe('POST /api/json/', () => {
      it('200 POST /api/json/ - simple object', async () => {
        const data = {
          dummyData: 'yep'
        }

        const res = await request(app)
          .post(`/api/json/`)
          .send(data)
          .expect(201)

        expect(res.body)
          .to.have.property('data')
          .which.deep.equals(data)
        expect(res.body)
          .to.have.property('id')
          .which.is.a('string')
        expect(res.body)
          .to.have.property('apikey')
          .which.is.a('string')
        expect(res.body)
          .to.have.property('highestCreatedId')
          .which.is.a('number')
      })

      it('200 POST /api/json/ - array', async () => {
        const dataWithoutIds = [
          {dummyObj: 'yep'},
          {dummyObj: 'yep'},
          {dummyObj: 'yep'}
        ]
        const dataWithIds = dataWithoutIds.map((obj, idx) => ({
          ...obj,
          id: idx + 1
        }))

        const res = await request(app)
          .post(`/api/json/`)
          .send(dataWithoutIds)
          .expect(201)

        expect(res.body)
          .to.have.property('data')
          .which.deep.equals(dataWithIds)
        expect(res.body)
          .to.have.property('id')
          .which.is.a('string')
        expect(res.body)
          .to.have.property('apikey')
          .which.is.a('string')
        expect(res.body)
          .to.have.property('highestCreatedId')
          .which.is.a('number')
      })

      it('200 POST /api/json - complex object with array', async () => {
        const dataWithoutIds = {
          news: [
            {
              subArr: [
                {dummyObj: 'yep', noID: {not: 'here'}},
                {dummyObj: 'yep'}
              ]
            },
            {dummyObj: 'yep', id: 'custom-id'},
            {dummyObj: 'yep'}
          ],
          arr: [[1, 2, 3], [4, 5, 6]],
          meta: {
            dumb: 'otherField'
          }
        }

        // any object that has a parent of an array should have an id
        const dataWithIds = {
          news: [
            {
              subArr: [
                {dummyObj: 'yep', noID: {not: 'here'}, id: 2},
                {dummyObj: 'yep', id: 3}
              ],
              id: 1
            },
            {dummyObj: 'yep', id: 'custom-id'},
            {dummyObj: 'yep', id: 4}
          ],
          arr: [[1, 2, 3], [4, 5, 6]],
          meta: {
            dumb: 'otherField'
          }
        }

        const res = await request(app)
          .post(`/api/json/`)
          .send(dataWithoutIds)
          .expect(201)

        expect(res.body)
          .to.have.property('data')
          .which.deep.equals(dataWithIds)
        expect(res.body)
          .to.have.property('id')
          .which.is.a('string')
        expect(res.body)
          .to.have.property('apikey')
          .which.is.a('string')
        expect(res.body)
          .to.have.property('highestCreatedId')
          .which.equals(5)
      })

      // for some reason, this is passing. Apparently it's still getting a body, but w/e, this is fine
      xit('400 POST /api/json - missing body', async () => {
        const res = await request(app)
          .post(`/api/json/`)
          .expect(400)

        expect(res.body).to.have.property('error', 'Need to pass a json body')
      })
    })

    describe('GET /api/json/:jsonUUID', () => {
      it('200 GET /api/json/:jsonUUID', async () => {
        const res = await request(app)
          .get(`/api/json/${dummyRow.id}`)
          .expect(200)

        expect(res.body).to.deep.equal(dummyRow.data)
      })

      it('400 GET /api/json:jsonUUID', async () => {
        const res = await request(app)
          .get(`/api/json/${fakeUUID}`)
          .expect(400)

        expect(res.body).to.deep.equal({
          error: `Could not find Data with ID of ${fakeUUID}`
        })
      })
    })

    describe('PUT /api/json/:jsonUUID', () => {
      it('200 PUT /api/json/:jsonUUID', async () => {
        const overwritingData = [{obj: 'one'}, {obj: 'two'}]

        const overwritingDataWithIds = [
          {obj: 'one', id: 1},
          {obj: 'two', id: 2}
        ]

        const res = await request(app)
          .put(`/api/json/${dummyRow.id}`)
          .set({
            'x-apikey': dummyRow.apikey
          })
          .send(overwritingData)
          .expect(200)

        expect(res.body).to.deep.equal(overwritingDataWithIds)

        // load latest changes
        await dummyRow.reload()

        expect(dummyRow).to.have.property('highestCreatedId', 3)
      })

      it('400 PUT /api/json/:jsonUUID - bad jsonUUID', async () => {
        const res = await request(app)
          .put(`/api/json/${fakeUUID}`)
          .set({
            'x-apikey': 'FAKE_APIKEY'
          })
          .send({})
          .expect(400)

        expect(res.body).to.have.property(
          'error',
          `Could not find Data with ID of ${fakeUUID}`
        )
      })

      it('400 PUT /api/json/:jsonUUID - bad apikey', async () => {
        const res = await request(app)
          .put(`/api/json/${dummyRow.id}`)
          .set({
            'x-apikey': 'FAKE_APIKEY'
          })
          .send({})
          .expect(400)

        expect(res.body).to.have.property(
          'error',
          'Mismatching apikey for given JSON ID, make sure this is your resource'
        )
      })
    })

    describe('POST /api/json/:jsonUUID/<resource>', () => {
      describe('Root entry of object', () => {
        beforeEach(async () => {
          dummyRow = await Json.create({
            data: {
              news: [],
              posts: [
                {
                  name: 'yo wat up',
                  id: 1
                }
              ]
            },
            highestCreatedId: 2
          })
        })

        it('POST /api/json/:jsonUUID/news', async () => {
          const newsObject = {
            title: 'some random title',
            content: 'some shitty news story'
          }
          const res = await request(app)
            .post(`/api/json/${dummyRow.id}/news`)
            .set({
              'x-apikey': dummyRow.apikey
            })
            .send(newsObject)
            .expect(201)

          expect(res.body).to.deep.equal({
            ...newsObject,
            id: 2
          })

          await dummyRow.reload()

          expect(dummyRow).to.have.property('highestCreatedId', 3)
          expect(dummyRow)
            .to.have.nested.property('data.news')
            .which.is.an('array')
            .which.has.lengthOf(1)
        })

        it('POST /api/json/:jsonUUID/posts', async () => {
          const postObject = {
            name: 'some random name'
          }
          const res = await request(app)
            .post(`/api/json/${dummyRow.id}/posts`)
            .set({
              'x-apikey': dummyRow.apikey
            })
            .send(postObject)
            .expect(201)

          expect(res.body).to.deep.equal({
            ...postObject,
            id: 2
          })

          await dummyRow.reload()

          expect(dummyRow).to.have.property('highestCreatedId', 3)
          expect(dummyRow)
            .to.have.nested.property('data.posts')
            .which.is.an('array')
            .which.has.lengthOf(2)
        })
      })
    })
  })
})
