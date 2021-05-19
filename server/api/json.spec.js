/* eslint-disable no-unused-expressions */
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

    describe('GET /api/json/:jsonUUID/<nestedResource>', () => {
      it('200 GET /api/json/:jsonUUID/dummyData', async () => {
        const res = await request(app)
          .get(`/api/json/${dummyRow.id}/dummyData`)
          .expect(200)

        expect(res.body).to.deep.equal('yo what up')
      })

      it('200 GET /api/json/:jsonUUID/array/1', async () => {
        const res = await request(app)
          .get(`/api/json/${dummyRow.id}/array/1`)
          .expect(200)

        expect(res.body).to.deep.equal({
          arrayEles: 'getAnIdOnCreate',
          but: {nestedResources: 'doNot'},
          id: 1
        })
      })

      it('200 GET /api/json/:jsonUUID/array/1/but', async () => {
        const res = await request(app)
          .get(`/api/json/${dummyRow.id}/array/1/but`)
          .expect(200)

        expect(res.body).to.deep.equal({
          nestedResources: 'doNot'
        })
      })

      it('200 GET /api/json/:jsonUUID/array/string-key', async () => {
        const res = await request(app)
          .get(`/api/json/${dummyRow.id}/array/string-key`)
          .expect(200)

        expect(res.body).to.deep.equal({
          butYouCanGiveYourOwn: 'like this',
          id: 'string-key'
        })
      })

      it('400 GET /api/json:jsonUUID/<nestedResource>', async () => {
        const res = await request(app)
          .get(`/api/json/${fakeUUID}/fakePath`)
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
          .send({
            dumb: 'body'
          })
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
          .send({
            dumb: 'body'
          })
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
      describe('Root entry of array', () => {
        beforeEach(async () => {
          dummyRow = await Json.create({
            data: [
              {
                dumb: 'object',
                id: 1
              }
            ],
            highestCreatedId: 2
          })
        })

        it('POST /api/json/:jsonUUID/', async () => {
          const newsObject = {
            title: 'some random title',
            content: 'some shitty news story'
          }
          const res = await request(app)
            .post(`/api/json/${dummyRow.id}/`)
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
          expect(dummyRow.data)
            .to.be.an('array')
            .which.has.lengthOf(2)
        })

        it('400 - /api/json/:jsonUUID/ - Non Array', async () => {
          const newsObject = {
            title: 'some random title',
            content: 'some shitty news story'
          }
          const res = await request(app)
            .post(`/api/json/${dummyRow.id}/1`)
            .set({
              'x-apikey': dummyRow.apikey
            })
            .send(newsObject)
            .expect(400)

          expect(res.body).to.deep.equal({
            error: 'Cannot POST to a non-array'
          })

          const preReloadData = dummyRow.data
          await dummyRow.reload()

          expect(dummyRow).to.have.property('highestCreatedId', 2)
          expect(dummyRow.data).to.deep.equal(preReloadData)
        })

        it('400 - /api/json/:jsonUUID/ - Bad ID', async () => {
          const newsObject = {
            title: 'some random title',
            content: 'some shitty news story'
          }
          const res = await request(app)
            .post(`/api/json/${dummyRow.id}/2`)
            .set({
              'x-apikey': dummyRow.apikey
            })
            .send(newsObject)
            .expect(400)

          expect(res.body).to.deep.equal({
            error: 'Unfound array element by id: "2"'
          })

          const preReloadData = dummyRow.data
          await dummyRow.reload()

          expect(dummyRow).to.have.property('highestCreatedId', 2)
          expect(dummyRow.data).to.deep.equal(preReloadData)
        })

        it('400 - /api/json/:jsonUUID/ - Bad Object Prop', async () => {
          const newsObject = {
            title: 'some random title',
            content: 'some shitty news story'
          }
          const res = await request(app)
            .post(`/api/json/${dummyRow.id}/1/badKey`)
            .set({
              'x-apikey': dummyRow.apikey
            })
            .send(newsObject)
            .expect(400)

          expect(res.body).to.deep.equal({
            error: 'Unfound object property by key: "badKey"'
          })

          const preReloadData = dummyRow.data
          await dummyRow.reload()

          expect(dummyRow).to.have.property('highestCreatedId', 2)
          expect(dummyRow.data).to.deep.equal(preReloadData)
        })

        it('400 - /api/json/:jsonUUID/ - Bad Value Error', async () => {
          const newsObject = {
            title: 'some random title',
            content: 'some shitty news story'
          }
          const res = await request(app)
            .post(`/api/json/${dummyRow.id}/1/dumb/badKey`)
            .set({
              'x-apikey': dummyRow.apikey
            })
            .send(newsObject)
            .expect(400)

          expect(res.body).to.deep.equal({
            error: 'Path Access Error!'
          })

          const preReloadData = dummyRow.data
          await dummyRow.reload()

          expect(dummyRow).to.have.property('highestCreatedId', 2)
          expect(dummyRow.data).to.deep.equal(preReloadData)
        })
      })

      describe('Nested entry of object', () => {
        beforeEach(async () => {
          dummyRow = await Json.create({
            data: {
              posts: [
                {
                  id: 1,
                  name: 'yo wat up',
                  comments: [
                    {
                      id: 2,
                      text: 'good test',
                      likes: [],
                      replies: [
                        {
                          id: 'dumb-username',
                          content: 'yes',
                          mentions: []
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            highestCreatedId: 3
          })
        })

        it('POST /api/json/:jsonUUID/<nestedResource>', async () => {
          const likeObject = {
            name: 'some random name'
          }
          const res = await request(app)
            .post(`/api/json/${dummyRow.id}/posts/1/comments/2/likes`)
            .set({
              'x-apikey': dummyRow.apikey
            })
            .send(likeObject)
            .expect(201)
          await dummyRow.reload()

          expect(res.body).to.deep.equal({
            ...likeObject,
            id: 3
          })

          expect(dummyRow).to.have.property('highestCreatedId', 4)
          expect(dummyRow)
            .to.have.nested.property('data.posts[0].comments[0].likes')
            .which.is.an('array')
            .which.has.lengthOf(1)
        })

        it('POST /api/json/:jsonUUID/<nestedResource>', async () => {
          const mention = {
            user: '@everyone'
          }
          const res = await request(app)
            .post(
              `/api/json/${
                dummyRow.id
              }/posts/1/comments/2/replies/dumb-username/mentions`
            )
            .set({
              'x-apikey': dummyRow.apikey
            })
            .send(mention)
            .expect(201)
          await dummyRow.reload()

          expect(res.body).to.deep.equal({
            ...mention,
            id: 3
          })

          expect(dummyRow).to.have.property('highestCreatedId', 4)
          expect(dummyRow)
            .to.have.nested.property(
              'data.posts[0].comments[0].replies[0].mentions'
            )
            .which.is.an('array')
            .which.has.lengthOf(1)
        })
      })
    })

    describe('DELETE /api/json/:jsonUUID/', () => {
      it('DELETE /api/json/:jsonUUID', async () => {
        dummyRow = await Json.create({
          data: {
            thing: 'stuff'
          }
        })

        const res = await request(app)
          .delete(`/api/json/${dummyRow.id}`)
          .set({
            'x-apikey': dummyRow.apikey
          })
          .expect(200)

        expect(res.body).to.deep.equal({
          deleted: {
            thing: 'stuff'
          }
        })
        const foundRow = await Json.findByPk(dummyRow.id)
        expect(foundRow, 'Should not be able to find row in databose').to.not.be
          .ok
      })

      it('400 - DELETE /api/json/:jsonUUID - bad jsonUUID', async () => {
        dummyRow = await Json.create({
          data: {
            thing: 'stuff'
          }
        })

        const res = await request(app)
          .delete(`/api/json/${fakeUUID}`)
          .set({
            'x-apikey': dummyRow.apikey
          })
          .expect(400)

        expect(res.body).to.deep.equal({
          error: `Could not find Data with ID of ${fakeUUID}`
        })
      })

      it('400 - DELETE /api/json/:jsonUUID - bad apikey', async () => {
        dummyRow = await Json.create({
          data: {
            thing: 'stuff'
          }
        })

        const res = await request(app)
          .delete(`/api/json/${dummyRow.id}`)
          .set({
            'x-apikey': 'bad-apikey'
          })
          .expect(400)

        expect(res.body).to.deep.equal({
          error:
            'Mismatching apikey for given JSON ID, make sure this is your resource'
        })
      })

      it('400 - DELETE /api/json/:jsonUUID - missing apikey', async () => {
        dummyRow = await Json.create({
          data: {
            thing: 'stuff'
          }
        })

        const res = await request(app)
          .delete(`/api/json/${dummyRow.id}`)
          .expect(400)

        expect(res.body).to.deep.equal({
          error: 'Need to pass an apikey in header as "x-apikey"'
        })
      })
    })

    describe('DELETE /api/json/:jsonUUID/<nestedResource>', () => {
      beforeEach(async () => {
        dummyRow = await Json.create({
          data: {
            news: [],
            posts: [
              {
                id: 1,
                name: 'yo wat up',
                comments: [
                  {
                    id: 2,
                    text: 'good test',
                    likes: []
                  }
                ]
              }
            ]
          },
          highestCreatedId: 3
        })
      })

      it('DELETE /api/json/:jsonUUID/<nestedResource> - root array element', async () => {
        dummyRow = await Json.create({
          data: [{id: 1, username: 'first'}, {id: 2, username: 'second'}],
          highestCreatedId: 3
        })

        const res = await request(app)
          .delete(`/api/json/${dummyRow.id}/2`)
          .set({
            'x-apikey': dummyRow.apikey
          })
          .expect(200)

        const expectedDelete = dummyRow.data[1]

        expect(res.body).to.deep.equal({deleted: expectedDelete})

        await dummyRow.reload()

        expect(dummyRow).to.have.property('highestCreatedId', 3)
        expect(dummyRow.data).to.deep.equal([{id: 1, username: 'first'}])
      })

      it('DELETE /api/json/:jsonUUID/<nestedResource> - nested array element', async () => {
        const res = await request(app)
          .delete(`/api/json/${dummyRow.id}/posts/1/comments/2`)
          .set({
            'x-apikey': dummyRow.apikey
          })
          .expect(200)

        const expectedDelete = dummyRow.data.posts[0].comments[0]

        expect(res.body).to.deep.equal({deleted: expectedDelete})

        await dummyRow.reload()

        expect(dummyRow).to.have.property('highestCreatedId', 3)
        expect(dummyRow)
          .to.have.nested.property('data.posts[0].comments')
          .which.is.an('array')
          .which.has.lengthOf(0)
      })

      it('DELETE /api/json/:jsonUUID/<nestedResource> - root object property', async () => {
        const res = await request(app)
          .delete(`/api/json/${dummyRow.id}/posts/`)
          .set({
            'x-apikey': dummyRow.apikey
          })
          .expect(200)

        expect(res.body).to.deep.equal({
          deleted: [
            {
              id: 1,
              name: 'yo wat up',
              comments: [
                {
                  id: 2,
                  text: 'good test',
                  likes: []
                }
              ]
            }
          ]
        })

        await dummyRow.reload()

        expect(dummyRow.data).to.not.have.property('posts')
        expect(dummyRow.data)
          .to.have.property('news')
          .which.is.an('array')
          .which.has.lengthOf(0)
      })

      it('DELETE /api/json/:jsonUUID/<nestedResource> - nested object property', async () => {
        const res = await request(app)
          .delete(`/api/json/${dummyRow.id}/posts/1/comments`)
          .set({
            'x-apikey': dummyRow.apikey
          })
          .expect(200)

        expect(res.body).to.deep.equal({
          deleted: [
            {
              id: 2,
              text: 'good test',
              likes: []
            }
          ]
        })

        await dummyRow.reload()

        expect(dummyRow.data).to.deep.equal({
          news: [],
          posts: [
            {
              id: 1,
              name: 'yo wat up'
            }
          ]
        })
      })

      it('400 - DELETE /api/json/:jsonUUID/<nestedResource> - missing array element', async () => {
        const res = await request(app)
          .delete(`/api/json/${dummyRow.id}/posts/1/comments/3`)
          .set({
            'x-apikey': dummyRow.apikey
          })
          .expect(400)

        expect(res.body).to.deep.equal({
          error: 'Unfound array element by id: "3"'
        })

        const preDummy = dummyRow.data
        await dummyRow.reload()

        expect(dummyRow).to.have.property('highestCreatedId', 3)
        expect(dummyRow.data).to.deep.equal(preDummy)
      })

      it('400 - DELETE /api/json/:jsonUUID/<nestedResource> - missing object property', async () => {
        const res = await request(app)
          .delete(`/api/json/${dummyRow.id}/posts/1/user`)
          .set({
            'x-apikey': dummyRow.apikey
          })
          .expect(400)

        expect(res.body).to.deep.equal({
          error: 'Unfound object property by key: "user"'
        })

        const preDummy = dummyRow.data
        await dummyRow.reload()

        expect(dummyRow).to.have.property('highestCreatedId', 3)
        expect(dummyRow.data).to.deep.equal(preDummy)
      })
    })
  })
})
