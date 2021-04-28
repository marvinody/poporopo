import React from 'react'
import ReactDOM from 'react-dom'
import _ from 'lodash'
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter'
import {dark} from 'react-syntax-highlighter/dist/esm/styles/prism'

const curls = {
  req: {
    create: `curl
  --location --request POST 'localhost:8080/api/json/' \\
  --header 'Content-Type: application/json' \\
  --data-raw '{
        "dummyData": "yo what up"
  }'`,
    fetch: `curl --location --request GET 'localhost:8080/api/json/18cc56f4-70db-40cc-851c-22eb421c8f69'`
  },
  res: {
    create: `{
    "id": "18cc56f4-70db-40cc-851c-22eb421c8f69",
    "data": {
        "dummyData": "yo what up"
    },
    "updatedAt": "2021-04-28T03:56:32.493Z",
    "createdAt": "2021-04-28T03:56:32.493Z",
    "apikey": "226f8b52d42d8e641a47f177ba78f0ba06154dc1abfefbdbbe356fdf57598ee4"
}`,
    fetch: `{
  "dummyData": "yo wat up"
}`
  }
}

const url = 'https://poporopo.deploy.sadpanda.moe/'

curls.req = _.mapValues(curls.req, s => _.replace(s, 'localhost:8080/', url))

const Curl = props => (
  <SyntaxHighlighter language="bash" style={dark}>
    {props.children}
  </SyntaxHighlighter>
)

const Main = () => {
  return (
    <div>
      <p>Welcome to super-simple JSON API</p>
      <p>Hit this endpoint with your data</p>
      <Curl>{curls.req.create}</Curl>
      <p>You'll get a response similar to</p>
      <Curl>{curls.res.create}</Curl>
      <p>Now, you can use that ID in your frontend or whatever like this</p>
      <Curl>{curls.req.fetch}</Curl>
      Which will give you a response like <Curl>{curls.res.fetch}</Curl>
    </div>
  )
}

ReactDOM.render(<Main />, document.getElementById('app'))
